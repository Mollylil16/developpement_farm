import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateDiseaseDto, UpdateDiseaseDto } from './dto/create-disease.dto';

@Injectable()
export class BatchDiseaseService {
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
   * Sélectionne automatiquement un porc healthy pour marquer comme malade
   */
  private async selectHealthyPig(batchId: string): Promise<string | null> {
    const result = await this.db.query(
      `SELECT id 
       FROM batch_pigs 
       WHERE batch_id = $1 
         AND health_status = 'healthy'
       ORDER BY entry_date ASC
       LIMIT 1`,
      [batchId],
    );

    return result.rows.length > 0 ? result.rows[0].id : null;
  }

  /**
   * Crée un enregistrement de maladie pour un porc dans une bande
   */
  async createDisease(dto: CreateDiseaseDto, userId: string): Promise<any> {
    await this.checkBatchOwnership(dto.batch_id, userId);

    // Sélectionner un porc healthy
    const pigId = await this.selectHealthyPig(dto.batch_id);
    if (!pigId) {
      throw new BadRequestException(
        'Aucun porc en bonne santé disponible dans cette bande',
      );
    }

    const diseaseId = `disease_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Créer l'enregistrement de maladie
    await this.db.query(
      `INSERT INTO batch_diseases (
        id, batch_id, pig_id, disease_name, symptoms, diagnosis_date,
        status, treatment_description, treatment_start_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        diseaseId,
        dto.batch_id,
        pigId,
        dto.disease_name,
        dto.symptoms || null,
        dto.diagnosis_date,
        'sick',
        dto.treatment_description || null,
        dto.treatment_start_date || null,
        dto.notes || null,
      ],
    );

    // Mettre à jour le statut de santé du porc
    await this.db.query(
      `UPDATE batch_pigs 
       SET health_status = 'sick',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [pigId],
    );

    // Récupérer l'enregistrement créé
    const diseaseResult = await this.db.query(
      'SELECT * FROM batch_diseases WHERE id = $1',
      [diseaseId],
    );

    return diseaseResult.rows[0];
  }

  /**
   * Met à jour une maladie (guérison, décès, etc.)
   */
  async updateDisease(
    diseaseId: string,
    dto: UpdateDiseaseDto,
    userId: string,
  ): Promise<any> {
    // Vérifier la propriété
    const diseaseResult = await this.db.query(
      `SELECT bd.*, b.projet_id, p.proprietaire_id
       FROM batch_diseases bd
       JOIN batches b ON bd.batch_id = b.id
       JOIN projets p ON b.projet_id = p.id
       WHERE bd.id = $1`,
      [diseaseId],
    );
    if (diseaseResult.rows.length === 0) {
      throw new NotFoundException('Maladie non trouvée');
    }
    if (diseaseResult.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Cette maladie ne vous appartient pas');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.recovery_date !== undefined) {
      updates.push(`recovery_date = $${paramIndex}`);
      values.push(dto.recovery_date || null);
      paramIndex++;
    }
    if (dto.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(dto.status);
      paramIndex++;
    }
    if (dto.treatment_end_date !== undefined) {
      updates.push(`treatment_end_date = $${paramIndex}`);
      values.push(dto.treatment_end_date || null);
      paramIndex++;
    }
    if (dto.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(dto.notes || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return diseaseResult.rows[0];
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(diseaseId);

    await this.db.query(
      `UPDATE batch_diseases 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values,
    );

    // Mettre à jour le statut du porc selon le statut de la maladie
    const pigId = diseaseResult.rows[0].pig_id;
    if (dto.status === 'recovered') {
      await this.db.query(
        `UPDATE batch_pigs 
         SET health_status = 'healthy',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [pigId],
      );
    } else if (dto.status === 'dead') {
      await this.db.query(
        `UPDATE batch_pigs 
         SET health_status = 'sick',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [pigId],
      );
    }

    // Récupérer l'enregistrement mis à jour
    const updatedResult = await this.db.query(
      'SELECT * FROM batch_diseases WHERE id = $1',
      [diseaseId],
    );

    return updatedResult.rows[0];
  }

  /**
   * Récupère les maladies d'une bande
   */
  async getDiseasesByBatch(batchId: string, userId: string): Promise<any[]> {
    await this.checkBatchOwnership(batchId, userId);

    const result = await this.db.query(
      `SELECT bd.*, bp.name as pig_name
       FROM batch_diseases bd
       JOIN batch_pigs bp ON bd.pig_id = bp.id
       WHERE bd.batch_id = $1
       ORDER BY bd.diagnosis_date DESC`,
      [batchId],
    );

    return result.rows;
  }
}

