import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { VaccinateBatchDto } from './dto/vaccinate-batch.dto';

@Injectable()
export class BatchVaccinationService {
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
   * Sélectionne automatiquement les porcs à vacciner
   * Priorité aux porcs non vaccinés pour ce type de vaccin
   */
  private async selectPigsToVaccinate(
    batchId: string,
    vaccineType: string,
    count: number,
  ): Promise<string[]> {
    // Récupérer les porcs non vaccinés pour ce type de vaccin
    const result = await this.db.query(
      `SELECT id 
       FROM batch_pigs 
       WHERE batch_id = $1 
         AND (last_vaccination_type IS NULL 
              OR last_vaccination_type != $2 
              OR last_vaccination_date IS NULL
              OR last_vaccination_date < CURRENT_DATE - INTERVAL '30 days')
       ORDER BY 
         CASE WHEN last_vaccination_date IS NULL THEN 0 ELSE 1 END,
         last_vaccination_date ASC NULLS FIRST
       LIMIT $3`,
      [batchId, vaccineType, count],
    );

    const selectedPigs = result.rows.map((row) => row.id);

    // Si pas assez de porcs non vaccinés, prendre les autres
    if (selectedPigs.length < count) {
      const remaining = count - selectedPigs.length;
      const additionalResult = await this.db.query(
        `SELECT id 
         FROM batch_pigs 
         WHERE batch_id = $1 
           AND id NOT IN (${selectedPigs.map((_, i) => `$${i + 2}`).join(',')})
         LIMIT $${selectedPigs.length + 2}`,
        [batchId, ...selectedPigs, remaining],
      );
      selectedPigs.push(...additionalResult.rows.map((row) => row.id));
    }

    return selectedPigs.slice(0, count);
  }

  /**
   * Vaccine un nombre de porcs dans une bande
   */
  async vaccinateBatch(dto: VaccinateBatchDto, userId: string): Promise<any> {
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
        `La bande ne contient que ${totalCount} porc(s), impossible de vacciner ${dto.count}`,
      );
    }

    // Sélectionner les porcs à vacciner
    const pigIds = await this.selectPigsToVaccinate(
      dto.batch_id,
      dto.vaccine_type,
      dto.count,
    );

    if (pigIds.length === 0) {
      throw new BadRequestException('Aucun porc disponible pour la vaccination');
    }

    const vaccinationId = `vacc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Créer l'enregistrement de vaccination
    await this.db.query(
      `INSERT INTO batch_vaccinations (
        id, batch_id, vaccine_type, product_name, dosage, 
        vaccination_date, reason, vaccinated_pigs, count, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        vaccinationId,
        dto.batch_id,
        dto.vaccine_type,
        dto.product_name,
        dto.dosage || null,
        dto.vaccination_date,
        dto.reason,
        JSON.stringify(pigIds),
        pigIds.length,
        dto.notes || null,
      ],
    );

    // Mettre à jour les porcs vaccinés
    await this.db.query(
      `UPDATE batch_pigs 
       SET last_vaccination_date = $1,
           last_vaccination_type = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($3::varchar[])`,
      [dto.vaccination_date, dto.vaccine_type, pigIds],
    );

    // Récupérer l'enregistrement créé
    const vaccinationResult = await this.db.query(
      'SELECT * FROM batch_vaccinations WHERE id = $1',
      [vaccinationId],
    );

    return vaccinationResult.rows[0];
  }

  /**
   * Récupère le statut des vaccinations pour une bande
   */
  async getVaccinationStatus(batchId: string, userId: string): Promise<any> {
    await this.checkBatchOwnership(batchId, userId);

    // Récupérer les statistiques par type de vaccin
    const result = await this.db.query(
      `SELECT 
        vaccine_type,
        COUNT(*) as total_vaccinations,
        SUM(count) as total_pigs_vaccinated,
        MAX(vaccination_date) as last_vaccination_date
       FROM batch_vaccinations
       WHERE batch_id = $1
       GROUP BY vaccine_type`,
      [batchId],
    );

    // Récupérer les porcs de la bande pour calculer les non vaccinés
    const pigsResult = await this.db.query(
      `SELECT 
        id,
        last_vaccination_type,
        last_vaccination_date
       FROM batch_pigs
       WHERE batch_id = $1`,
      [batchId],
    );

    const totalPigs = pigsResult.rows.length;
    const by_vaccine: Record<string, any> = {};

    // Initialiser les types de vaccins
    const vaccineTypes = ['vitamines', 'deparasitant', 'fer', 'antibiotiques', 'autre'];
    vaccineTypes.forEach((type) => {
      const vaccinated = pigsResult.rows.filter(
        (pig) =>
          pig.last_vaccination_type === type &&
          pig.last_vaccination_date &&
          new Date(pig.last_vaccination_date) >
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Derniers 30 jours
      ).length;

      by_vaccine[type] = {
        vaccinated,
        not_vaccinated: totalPigs - vaccinated,
        total: totalPigs,
      };
    });

    return {
      batch_id: batchId,
      total_pigs: totalPigs,
      by_vaccine,
      recent_vaccinations: result.rows,
    };
  }

  /**
   * Récupère l'historique des vaccinations pour une bande
   */
  async getVaccinationHistory(batchId: string, userId: string): Promise<any[]> {
    await this.checkBatchOwnership(batchId, userId);

    const result = await this.db.query(
      `SELECT * 
       FROM batch_vaccinations
       WHERE batch_id = $1
       ORDER BY vaccination_date DESC
       LIMIT 50`,
      [batchId],
    );

    return result.rows;
  }
}


