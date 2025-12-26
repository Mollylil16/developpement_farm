import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateGestationDto, UpdateGestationDto } from './dto/create-gestation.dto';

@Injectable()
export class BatchGestationService {
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
   * Calcule la date de mise bas prévue (114 jours après sautage)
   */
  private calculateExpectedDeliveryDate(matingDate: string): string {
    const date = new Date(matingDate);
    date.setDate(date.getDate() + 114); // 114 jours de gestation
    return date.toISOString();
  }

  /**
   * Sélectionne automatiquement une truie non gestante
   */
  private async selectNonPregnantSow(batchId: string): Promise<string | null> {
    const result = await this.db.query(
      `SELECT id 
       FROM batch_pigs 
       WHERE batch_id = $1 
         AND sex = 'female'
         AND (gestation_status IS NULL OR gestation_status = 'not_pregnant')
       ORDER BY 
         CASE WHEN gestation_status IS NULL THEN 0 ELSE 1 END,
         entry_date ASC
       LIMIT 1`,
      [batchId],
    );

    return result.rows.length > 0 ? result.rows[0].id : null;
  }

  /**
   * Crée une gestation pour une truie dans une bande
   */
  async createGestation(dto: CreateGestationDto, userId: string): Promise<any> {
    await this.checkBatchOwnership(dto.batch_id, userId);

    // Vérifier que la bande contient des truies
    const batchResult = await this.db.query(
      'SELECT category, female_count FROM batches WHERE id = $1',
      [dto.batch_id],
    );
    if (batchResult.rows.length === 0) {
      throw new NotFoundException('Bande non trouvée');
    }
    const batch = batchResult.rows[0];
    if (batch.category !== 'truie_reproductrice' && batch.female_count === 0) {
      throw new BadRequestException(
        'Cette bande ne contient pas de truies reproductrices',
      );
    }

    // Sélectionner une truie non gestante
    const pigId = await this.selectNonPregnantSow(dto.batch_id);
    if (!pigId) {
      throw new BadRequestException(
        'Aucune truie non gestante disponible dans cette bande',
      );
    }

    const expectedDeliveryDate = this.calculateExpectedDeliveryDate(dto.mating_date);
    const gestationId = `gest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Créer l'enregistrement de gestation
    await this.db.query(
      `INSERT INTO batch_gestations (
        id, batch_id, pig_id, mating_date, expected_delivery_date,
        piglets_born_count, piglets_alive_count, piglets_dead_count, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        gestationId,
        dto.batch_id,
        pigId,
        dto.mating_date,
        expectedDeliveryDate,
        0, // piglets_born_count
        0, // piglets_alive_count
        0, // piglets_dead_count
        'pregnant',
        dto.notes || null,
      ],
    );

    // Mettre à jour le statut de gestation du porc
    await this.db.query(
      `UPDATE batch_pigs 
       SET gestation_status = 'pregnant',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [pigId],
    );

    // Récupérer l'enregistrement créé
    const gestationResult = await this.db.query(
      'SELECT * FROM batch_gestations WHERE id = $1',
      [gestationId],
    );

    return gestationResult.rows[0];
  }

  /**
   * Met à jour une gestation (mise bas, avortement, etc.)
   */
  async updateGestation(
    gestationId: string,
    dto: UpdateGestationDto,
    userId: string,
  ): Promise<any> {
    // Vérifier la propriété
    const gestationResult = await this.db.query(
      `SELECT bg.*, b.projet_id, p.proprietaire_id
       FROM batch_gestations bg
       JOIN batches b ON bg.batch_id = b.id
       JOIN projets p ON b.projet_id = p.id
       WHERE bg.id = $1`,
      [gestationId],
    );
    if (gestationResult.rows.length === 0) {
      throw new NotFoundException('Gestation non trouvée');
    }
    if (gestationResult.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Cette gestation ne vous appartient pas');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.actual_delivery_date !== undefined) {
      updates.push(`actual_delivery_date = $${paramIndex}`);
      values.push(dto.actual_delivery_date || null);
      paramIndex++;
    }
    if (dto.piglets_born_count !== undefined) {
      updates.push(`piglets_born_count = $${paramIndex}`);
      values.push(dto.piglets_born_count);
      paramIndex++;
    }
    if (dto.piglets_alive_count !== undefined) {
      updates.push(`piglets_alive_count = $${paramIndex}`);
      values.push(dto.piglets_alive_count);
      paramIndex++;
    }
    if (dto.piglets_dead_count !== undefined) {
      updates.push(`piglets_dead_count = $${paramIndex}`);
      values.push(dto.piglets_dead_count);
      paramIndex++;
    }
    if (dto.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(dto.status);
      paramIndex++;
    }
    if (dto.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(dto.notes || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return gestationResult.rows[0];
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(gestationId);

    await this.db.query(
      `UPDATE batch_gestations 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values,
    );

    // Si mise bas, mettre à jour le statut du porc
    if (dto.status === 'delivered' && dto.actual_delivery_date) {
      const pigId = gestationResult.rows[0].pig_id;
      await this.db.query(
        `UPDATE batch_pigs 
         SET gestation_status = 'delivered',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [pigId],
      );
    }

    // Récupérer l'enregistrement mis à jour
    const updatedResult = await this.db.query(
      'SELECT * FROM batch_gestations WHERE id = $1',
      [gestationId],
    );

    return updatedResult.rows[0];
  }

  /**
   * Récupère les gestations d'une bande
   */
  async getGestationsByBatch(batchId: string, userId: string): Promise<any[]> {
    await this.checkBatchOwnership(batchId, userId);

    const result = await this.db.query(
      `SELECT bg.*, bp.name as pig_name
       FROM batch_gestations bg
       JOIN batch_pigs bp ON bg.pig_id = bp.id
       WHERE bg.batch_id = $1
       ORDER BY bg.mating_date DESC`,
      [batchId],
    );

    return result.rows;
  }

  /**
   * Récupère une gestation par ID
   */
  async getGestationById(gestationId: string, userId: string): Promise<any> {
    const result = await this.db.query(
      `SELECT bg.*, bp.name as pig_name, b.projet_id, p.proprietaire_id
       FROM batch_gestations bg
       JOIN batch_pigs bp ON bg.pig_id = bp.id
       JOIN batches b ON bg.batch_id = b.id
       JOIN projets p ON b.projet_id = p.id
       WHERE bg.id = $1`,
      [gestationId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Gestation non trouvée');
    }
    if (result.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Cette gestation ne vous appartient pas');
    }

    return result.rows[0];
  }
}

