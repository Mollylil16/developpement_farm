import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateWeighingDto } from './dto/create-weighing.dto';

@Injectable()
export class BatchWeighingService {
  constructor(private db: DatabaseService) {}

  /**
   * Vérifie que la bande appartient au projet de l'utilisateur
   */
  private async checkBatchOwnership(
    batchId: string,
    userId: string,
  ): Promise<void> {
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
   * Priorité aux porcs non pesés récemment (plus de 7 jours)
   */
  private async selectPigsToWeigh(
    batchId: string,
    count: number,
  ): Promise<string[]> {
    // Récupérer les porcs non pesés récemment
    const result = await this.db.query(
      `SELECT id, current_weight_kg
       FROM batch_pigs 
       WHERE batch_id = $1 
         AND (last_weighing_date IS NULL 
              OR last_weighing_date < CURRENT_DATE - INTERVAL '7 days')
       ORDER BY 
         CASE WHEN last_weighing_date IS NULL THEN 0 ELSE 1 END,
         last_weighing_date ASC NULLS FIRST
       LIMIT $2`,
      [batchId, count],
    );

    const selectedPigs = result.rows.map((row) => row.id);

    // Si pas assez, prendre les autres
    if (selectedPigs.length < count) {
      const remaining = count - selectedPigs.length;
      const additionalResult = await this.db.query(
        `SELECT id, current_weight_kg
         FROM batch_pigs 
         WHERE batch_id = $1 
           AND id NOT IN (${selectedPigs.map((_, i) => `$${i + 2}`).join(',')})
         ORDER BY last_weighing_date ASC NULLS FIRST
         LIMIT $${selectedPigs.length + 2}`,
        [batchId, ...selectedPigs, remaining],
      );
      selectedPigs.push(...additionalResult.rows.map((row) => row.id));
    }

    return selectedPigs.slice(0, count);
  }

  /**
   * Crée une pesée collective pour une bande
   */
  async createWeighing(dto: CreateWeighingDto, userId: string): Promise<any> {
    await this.checkBatchOwnership(dto.batch_id, userId);

    // Vérifier que la bande a assez de porcs
    const batchResult = await this.db.query(
      'SELECT total_count FROM batches WHERE id = $1',
      [dto.batch_id],
    );
    if (batchResult.rows.length === 0) {
      throw new NotFoundException('Bande non trouvée');
    }
    const totalCount = batchResult.rows[0].total_count;
    if (dto.count > totalCount) {
      throw new BadRequestException(
        `La bande ne contient que ${totalCount} porc(s), impossible de peser ${dto.count}`,
      );
    }

    // Sélectionner les porcs à peser
    const pigIds = await this.selectPigsToWeigh(dto.batch_id, dto.count);

    if (pigIds.length === 0) {
      throw new BadRequestException('Aucun porc disponible pour la pesée');
    }

    // Calculer min/max si non fournis
    let minWeight = dto.min_weight_kg;
    let maxWeight = dto.max_weight_kg;
    if (!minWeight || !maxWeight) {
      const weightsResult = await this.db.query(
        `SELECT current_weight_kg 
         FROM batch_pigs 
         WHERE id = ANY($1::varchar[])`,
        [pigIds],
      );
      const weights = weightsResult.rows.map((r) => parseFloat(r.current_weight_kg));
      if (!minWeight) minWeight = Math.min(...weights);
      if (!maxWeight) maxWeight = Math.max(...weights);
    }

    const weighingId = `weigh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Créer l'enregistrement de pesée
    await this.db.query(
      `INSERT INTO batch_weighings (
        id, batch_id, weighing_date, average_weight_kg,
        min_weight_kg, max_weight_kg, weighed_pigs, count, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        weighingId,
        dto.batch_id,
        dto.weighing_date,
        dto.average_weight_kg,
        minWeight,
        maxWeight,
        JSON.stringify(pigIds),
        pigIds.length,
        dto.notes || null,
      ],
    );

    // Mettre à jour les porcs pesés
    await this.db.query(
      `UPDATE batch_pigs 
       SET last_weighing_date = $1,
           current_weight_kg = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($3::varchar[])`,
      [dto.weighing_date, dto.average_weight_kg, pigIds],
    );

    // Mettre à jour le poids moyen de la bande
    const avgWeightResult = await this.db.query(
      `SELECT AVG(current_weight_kg) as avg_weight
       FROM batch_pigs
       WHERE batch_id = $1`,
      [dto.batch_id],
    );
    const newAvgWeight = parseFloat(avgWeightResult.rows[0].avg_weight) || 0;
    await this.db.query(
      `UPDATE batches 
       SET average_weight_kg = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newAvgWeight, dto.batch_id],
    );

    // Récupérer l'enregistrement créé
    const weighingResult = await this.db.query(
      'SELECT * FROM batch_weighings WHERE id = $1',
      [weighingId],
    );

    return weighingResult.rows[0];
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
}

