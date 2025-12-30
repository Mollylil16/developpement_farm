import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateWeighingDto } from './dto/create-weighing.dto';
import { PoolClient } from 'pg';

interface PigContext {
  pigId: string;
  expectedWeight: number | null;
}

interface Assignment {
  pigId: string;
  weightKg: number;
}

interface BatchPigMovementRow {
  pig_id: string;
  from_batch_id: string | null;
  movement_date: string | Date | null;
}

const DEFAULT_GMQ = 0.4; // kg / jour
const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Injectable()
export class BatchWeighingService {
  constructor(private db: DatabaseService) {}

  /**
   * Vérifie que la bande appartient au producteur
   */
  private async checkBatchOwnership(batchId: string, userId: string): Promise<void> {
    const result = await this.db.query(
      `SELECT b.projet_id, p.proprietaire_id
       FROM batches b
       JOIN projets p ON b.projet_id = p.id
       WHERE b.id = $1`,
      [batchId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Bande non trouvée');
    }
    if (result.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Cette bande ne vous appartient pas');
    }
  }

  /**
   * Sélectionne automatiquement les porcs à peser
   * Priorité aux porcs sans pesée récente
   */
  private async selectPigsToWeigh(
    client: PoolClient,
    batchId: string,
    count: number,
  ): Promise<string[]> {
    const result = await client.query(
      `SELECT id
       FROM batch_pigs
       WHERE batch_id = $1
       ORDER BY
         (CASE WHEN last_weighing_date IS NULL THEN 0 ELSE 1 END) ASC,
         last_weighing_date ASC NULLS FIRST,
         entry_date DESC
       LIMIT $2`,
      [batchId, count],
    );

    return result.rows.map((row) => row.id);
  }

  private normalizeWeights(weights: number[]): number[] {
    return (weights || [])
      .map((value) => (typeof value === 'string' ? parseFloat(value) : value))
      .filter((value) => typeof value === 'number' && !Number.isNaN(value) && value > 0)
      .map((value) => Math.round(value * 100) / 100);
  }

  private assignWeights(pigs: PigContext[], weights: number[]): Assignment[] {
    if (!pigs.length || !weights.length) {
      return [];
    }

    const orderedWeights = [...weights].sort((a, b) => b - a);
    const pigsHaveHistory = pigs.every((pig) => pig.expectedWeight !== null);

    if (!pigsHaveHistory) {
      const shuffled = [...weights];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return pigs.map((pig, index) => ({
        pigId: pig.pigId,
        weightKg: shuffled[index % shuffled.length],
      }));
    }

    const sortedPigs = [...pigs].sort(
      (a, b) => (b.expectedWeight! - a.expectedWeight!),
    );

    return sortedPigs.map((pig, index) => ({
      pigId: pig.pigId,
      weightKg: orderedWeights[index % orderedWeights.length],
    }));
  }

  /**
   * Crée une pesée collective pour une bande
   */
  async createWeighing(dto: CreateWeighingDto, userId: string): Promise<any> {
    await this.checkBatchOwnership(dto.batch_id, userId);

    const normalizedWeights = this.normalizeWeights(dto.weights_kg || []);

    if (!normalizedWeights.length) {
      throw new BadRequestException('Aucun poids valide fourni');
    }

    return await this.db.transaction(async (client) => {
      const batchRow = await client.query(
        'SELECT total_count, avg_daily_gain FROM batches WHERE id = $1',
        [dto.batch_id],
      );

      if (batchRow.rows.length === 0) {
        throw new NotFoundException('Bande non trouvée');
      }

      const { total_count: totalCount, avg_daily_gain } = batchRow.rows[0];
      const batchGmq = parseFloat(avg_daily_gain) || DEFAULT_GMQ;

      if (normalizedWeights.length > totalCount) {
        throw new BadRequestException(
          `La bande ne contient que ${totalCount} porc(s), impossible d'attribuer ${normalizedWeights.length} poids`,
        );
      }

      const count = normalizedWeights.length;
      const pigIds = await this.selectPigsToWeigh(client, dto.batch_id, count);

      if (!pigIds.length) {
        throw new BadRequestException('Aucun porc disponible pour la pesée');
      }

      const pigsResult = await client.query(
        `SELECT id, current_weight_kg, last_weighing_date, entry_date
         FROM batch_pigs
         WHERE id = ANY($1::varchar[])`,
        [pigIds],
      );

      const movementsResult = await (client as PoolClient).query<BatchPigMovementRow>(
        `SELECT DISTINCT ON (pig_id)
            pig_id,
            from_batch_id,
            movement_date
         FROM batch_pig_movements
         WHERE pig_id = ANY($1::varchar[])
           AND to_batch_id = $2
         ORDER BY pig_id, movement_date DESC`,
        [pigIds, dto.batch_id],
      );

      const movementMap = new Map<string, BatchPigMovementRow>(
        movementsResult.rows.map((row) => [row.pig_id, row]),
      );

      const previousBatchIds = Array.from(
        new Set(
          movementsResult.rows
            .map((row) => row.from_batch_id)
            .filter((value) => !!value),
        ),
      );

      let previousBatchGains = new Map<string, number>();
      if (previousBatchIds.length > 0) {
        const prevResult = await client.query(
          `SELECT id, avg_daily_gain FROM batches WHERE id = ANY($1::varchar[])`,
          [previousBatchIds],
        );
        previousBatchGains = new Map(
          prevResult.rows.map((row) => [
            row.id,
            parseFloat(row.avg_daily_gain) || DEFAULT_GMQ,
          ]),
        );
      }

      const weighingDate = dto.weighing_date
        ? new Date(dto.weighing_date)
        : new Date();

      const pigsContexts: PigContext[] = pigsResult.rows.map((row) => {
        const lastWeight = row.current_weight_kg
          ? parseFloat(row.current_weight_kg)
          : null;
        const lastWeighingDate = row.last_weighing_date
          ? new Date(row.last_weighing_date)
          : row.entry_date
          ? new Date(row.entry_date)
          : null;
        const movement = movementMap.get(row.id);
        const movementDate = movement?.movement_date
          ? new Date(movement.movement_date)
          : null;

        let gmqUsed = batchGmq;
        let hasAlreadyBeenWeighedInBatch = !!lastWeighingDate;

        if (movementDate && lastWeighingDate) {
          hasAlreadyBeenWeighedInBatch = lastWeighingDate >= movementDate;
        } else if (movementDate && !lastWeighingDate) {
          hasAlreadyBeenWeighedInBatch = false;
        }

        if (!hasAlreadyBeenWeighedInBatch && movement?.from_batch_id) {
          gmqUsed =
            previousBatchGains.get(movement.from_batch_id) ?? batchGmq ?? DEFAULT_GMQ;
        }

        if (!lastWeight || !lastWeighingDate) {
          return { pigId: row.id, expectedWeight: null };
        }

        const diffDays = Math.max(
          0,
          (weighingDate.getTime() - lastWeighingDate.getTime()) / MS_PER_DAY,
        );
        const expectedWeight = lastWeight + gmqUsed * diffDays;

        return {
          pigId: row.id,
          expectedWeight: Number.isFinite(expectedWeight) ? expectedWeight : null,
        };
      });

      const assignments = this.assignWeights(pigsContexts, normalizedWeights);

      if (!assignments.length) {
        throw new BadRequestException(
          'Impossible de calculer la distribution des poids',
        );
      }

      const weighingId = `weigh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const averageWeight =
        normalizedWeights.reduce((sum, value) => sum + value, 0) /
        normalizedWeights.length;
      const minWeight = Math.min(...normalizedWeights);
      const maxWeight = Math.max(...normalizedWeights);

      await client.query(
        `INSERT INTO batch_weighings (
          id, batch_id, weighing_date, average_weight_kg,
          min_weight_kg, max_weight_kg, weighed_pigs, count, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          weighingId,
          dto.batch_id,
          weighingDate.toISOString(),
          averageWeight,
          dto.min_weight_kg ?? minWeight,
          dto.max_weight_kg ?? maxWeight,
          JSON.stringify(
            assignments.map((value) => ({
              pig_id: value.pigId,
              weight_kg: value.weightKg,
            })),
          ),
          assignments.length,
          dto.notes || null,
        ],
      );

      for (const assignment of assignments) {
        await client.query(
          `INSERT INTO batch_weighing_details (
             id, weighing_id, pig_id, weight_kg, created_at
           ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [
            `wdet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            weighingId,
            assignment.pigId,
            assignment.weightKg,
          ],
        );

        await client.query(
          `UPDATE batch_pigs
           SET last_weighing_date = $1,
               current_weight_kg = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [weighingDate.toISOString(), assignment.weightKg, assignment.pigId],
        );
      }

      const avgWeightResult = await client.query(
        `SELECT AVG(current_weight_kg) as avg_weight
         FROM batch_pigs
         WHERE batch_id = $1`,
        [dto.batch_id],
      );

      const newAvgWeight = parseFloat(avgWeightResult.rows[0].avg_weight) || 0;
      await client.query(
        `UPDATE batches
         SET average_weight_kg = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newAvgWeight, dto.batch_id],
      );

      return {
        id: weighingId,
        batch_id: dto.batch_id,
        weighing_date: weighingDate.toISOString(),
        average_weight_kg: averageWeight,
        min_weight_kg: dto.min_weight_kg ?? minWeight,
        max_weight_kg: dto.max_weight_kg ?? maxWeight,
        count: assignments.length,
        assignments,
      };
    });
  }

  /**
   * Récupère l'historique des pesées pour une bande
   */
  async getWeighingHistory(batchId: string, userId: string): Promise<any[]> {
    await this.checkBatchOwnership(batchId, userId);

    const result = await this.db.query(
      `SELECT *
       FROM batch_weighings
       WHERE batch_id = $1
       ORDER BY weighing_date DESC
       LIMIT 50`,
      [batchId],
    );

    return result.rows;
  }

  /**
   * Détail d'une pesée et répartition par porc
   */
  async getWeighingDetails(weighingId: string, userId: string): Promise<any> {
    const weighingResult = await this.db.query(
      `SELECT w.*, b.projet_id, p.proprietaire_id, b.pen_name
       FROM batch_weighings w
       JOIN batches b ON w.batch_id = b.id
       JOIN projets p ON b.projet_id = p.id
       WHERE w.id = $1`,
      [weighingId],
    );

    if (weighingResult.rows.length === 0) {
      throw new NotFoundException('Pesée introuvable');
    }

    const weighingRow = weighingResult.rows[0];
    const proprietaireId = String(weighingRow.proprietaire_id || '').trim();
    const normalizedUserId = String(userId || '').trim();
    if (proprietaireId !== normalizedUserId) {
      throw new ForbiddenException('Vous ne pouvez pas consulter cette pesée');
    }

    const detailsResult = await this.db.query(
      `SELECT
         d.id,
         d.pig_id,
         d.weight_kg,
         d.created_at,
         p.name,
         p.sex,
         p.current_weight_kg,
         p.entry_date,
         p.batch_id
       FROM batch_weighing_details d
       LEFT JOIN batch_pigs p ON p.id = d.pig_id
       WHERE d.weighing_id = $1
       ORDER BY d.weight_kg DESC`,
      [weighingId],
    );

    return {
      weighing: {
        id: weighingRow.id,
        batch_id: weighingRow.batch_id,
        pen_name: weighingRow.pen_name,
        weighing_date: weighingRow.weighing_date,
        average_weight_kg: weighingRow.average_weight_kg,
        min_weight_kg: weighingRow.min_weight_kg,
        max_weight_kg: weighingRow.max_weight_kg,
        count: weighingRow.count,
        notes: weighingRow.notes,
      },
      details: detailsResult.rows.map((row) => ({
        id: row.id,
        pig_id: row.pig_id,
        weight_kg: row.weight_kg,
        created_at: row.created_at,
        pig_name: row.name || null,
        sex: row.sex || null,
        current_weight_kg: row.current_weight_kg,
        entry_date: row.entry_date,
        batch_id: row.batch_id,
      })),
    };
  }
}

