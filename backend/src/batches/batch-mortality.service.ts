import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateMortalityDto } from './dto/create-mortality.dto';

@Injectable()
export class BatchMortalityService {
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
   * Génère un ID pour un mouvement
   */
  private generateMovementId(): string {
    return `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sélectionne automatiquement les porcs à retirer (priorité aux malades)
   */
  private async selectPigsForMortality(
    batchId: string,
    count: number,
  ): Promise<string[]> {
    // Priorité aux porcs malades
    const sickResult = await this.db.query(
      `SELECT id 
       FROM batch_pigs 
       WHERE batch_id = $1 
         AND health_status IN ('sick', 'treatment')
       ORDER BY entry_date ASC
       LIMIT $2`,
      [batchId, count],
    );

    const selectedPigs = sickResult.rows.map((row) => row.id);

    // Si pas assez de malades, prendre les autres
    if (selectedPigs.length < count) {
      const remaining = count - selectedPigs.length;
      const additionalResult = await this.db.query(
        `SELECT id 
         FROM batch_pigs 
         WHERE batch_id = $1 
           AND id NOT IN (${selectedPigs.map((_, i) => `$${i + 2}`).join(',')})
         ORDER BY entry_date ASC
         LIMIT $${selectedPigs.length + 2}`,
        [batchId, ...selectedPigs, remaining],
      );
      selectedPigs.push(...additionalResult.rows.map((row) => row.id));
    }

    return selectedPigs.slice(0, count);
  }

  /**
   * Enregistre une mortalité dans une bande
   */
  async createMortality(dto: CreateMortalityDto, userId: string): Promise<any> {
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
        `La bande ne contient que ${totalCount} porc(s), impossible d'enregistrer ${dto.count} mortalité(s)`,
      );
    }

    // Sélectionner les porcs à retirer
    const pigIds = await this.selectPigsForMortality(dto.batch_id, dto.count);

    if (pigIds.length === 0) {
      throw new BadRequestException('Aucun porc disponible');
    }

    // Créer les mouvements de retrait pour chaque porc
    const movements = [];
    for (const pigId of pigIds) {
      const movementId = this.generateMovementId();
      await this.db.query(
        `INSERT INTO batch_pig_movements (
          id, pig_id, movement_type, from_batch_id, removal_reason,
          death_cause, veterinary_report, movement_date, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          movementId,
          pigId,
          'removal',
          dto.batch_id,
          'death',
          dto.death_cause || null,
          dto.veterinary_report || null,
          dto.death_date,
          dto.notes || null,
        ],
      );
      movements.push(movementId);
    }

    // Supprimer les porcs de batch_pigs
    await this.db.query(
      `DELETE FROM batch_pigs 
       WHERE id = ANY($1::varchar[])`,
      [pigIds],
    );

    // Mettre à jour le compteur de la bande (les triggers le feront automatiquement, mais on peut aussi le faire manuellement)
    await this.db.query(
      `UPDATE batches 
       SET total_count = total_count - $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [pigIds.length, dto.batch_id],
    );

    return {
      message: `${pigIds.length} porc(s) retiré(s) du cheptel`,
      removed_pigs: pigIds.length,
      movements,
    };
  }
}

