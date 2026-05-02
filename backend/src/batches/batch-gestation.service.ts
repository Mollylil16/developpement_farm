import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { GestationUtilsService } from '../common/services/gestation-utils.service';
import { CreateBatchGestationDto, UpdateBatchGestationDto } from './dto/create-gestation.dto';

@Injectable()
export class BatchGestationService {
  private readonly logger = new Logger(BatchGestationService.name);

  constructor(
    private db: DatabaseService,
    private gestationUtils: GestationUtilsService,
  ) {}

  /**
   * Vérifie que la bande appartient au projet de l'utilisateur
   * @returns Le projet_id de la bande
   */
  private async checkBatchOwnership(
    batchId: string,
    userId: string,
  ): Promise<string> {
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
    return result.rows[0].projet_id;
  }

  /**
   * Vérifie que le projet appartient à l'utilisateur
   */
  private async checkProjetOwnership(
    projetId: string,
    userId: string,
  ): Promise<void> {
    const result = await this.db.query(
      'SELECT proprietaire_id FROM projets WHERE id = $1',
      [projetId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Projet introuvable');
    }
    if (result.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Ce projet ne vous appartient pas');
    }
  }

  /**
   * Vérifie que la gestation appartient à l'utilisateur
   * @returns Les données de la gestation avec projet_id
   */
  private async checkGestationOwnership(
    gestationId: string,
    userId: string,
  ): Promise<any> {
    const result = await this.db.query(
      `SELECT bg.*, b.projet_id, p.proprietaire_id
       FROM batch_gestations bg
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

  /**
   * Sélectionne automatiquement une truie non gestante ou par ID spécifique
   */
  private async selectSow(batchId: string, pigId?: string): Promise<string | null> {
    if (pigId) {
      // Vérifier que la truie existe et n'est pas déjà gestante
      const result = await this.db.query(
        `SELECT id, gestation_status 
         FROM batch_pigs 
         WHERE id = $1 AND batch_id = $2
           AND (sex = 'female' OR sex = 'femelle')`,
        [pigId, batchId],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException(
          `Truie introuvable avec l'ID "${pigId}" dans cette bande`
        );
      }

      if (result.rows[0].gestation_status === 'pregnant') {
        throw new BadRequestException(
          'Cette truie est déjà en gestation'
        );
      }

      return result.rows[0].id;
    }

    // Sélection automatique d'une truie non gestante
    const result = await this.db.query(
      `SELECT id 
       FROM batch_pigs 
       WHERE batch_id = $1 
         AND (sex = 'female' OR sex = 'femelle')
         AND (gestation_status IS NULL OR gestation_status = 'not_pregnant' OR gestation_status = 'delivered')
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
  async createGestation(dto: CreateBatchGestationDto, userId: string): Promise<any> {
    const projetId = await this.checkBatchOwnership(dto.batch_id, userId);

    // Vérifier que la bande contient des truies
    const batchResult = await this.db.query(
      'SELECT category, female_count, pen_name FROM batches WHERE id = $1',
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

    // Sélectionner une truie (automatiquement ou par ID si fourni dans le DTO)
    const pigId = await this.selectSow(dto.batch_id, (dto as any).pig_id);
    if (!pigId) {
      throw new BadRequestException(
        'Aucune truie disponible dans cette bande (toutes sont déjà gestantes ou absentes)',
      );
    }

    // Valider le verrat si fourni
    let verratNom = dto.verrat_nom || null;
    if (dto.verrat_id) {
      try {
        const verrat = await this.gestationUtils.validateVerratBatch(dto.verrat_id, projetId);
        if (!verratNom && verrat.nom) {
          verratNom = verrat.nom;
        }
        this.logger.debug(`Verrat validé: ${verrat.id} (${verrat.nom || 'sans nom'})`);
      } catch (error) {
        this.logger.warn(`Validation verrat échouée: ${error.message}`);
        // En mode batch, on peut continuer sans verrat valide (warning seulement)
      }
    }

    // Utiliser le service partagé pour calculer la date et générer l'ID
    const expectedDeliveryDate = GestationUtilsService.calculateExpectedDeliveryDate(dto.mating_date);
    const gestationId = GestationUtilsService.generateGestationId();

    // Créer l'enregistrement de gestation (avec verrat_id et verrat_nom si fournis)
    await this.db.query(
      `INSERT INTO batch_gestations (
        id, batch_id, pig_id, mating_date, expected_delivery_date,
        piglets_born_count, piglets_alive_count, piglets_dead_count, 
        status, verrat_id, verrat_nom, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        gestationId,
        dto.batch_id,
        pigId,
        dto.mating_date,
        expectedDeliveryDate,
        0,
        0,
        0,
        'pregnant',
        dto.verrat_id || null,
        verratNom,
        dto.notes || null,
      ],
    );

    // Mettre à jour le statut de gestation de la truie
    await this.db.query(
      `UPDATE batch_pigs 
       SET gestation_status = 'pregnant',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [pigId],
    );

    // Récupérer l'enregistrement créé avec les infos de la truie
    const gestationResult = await this.db.query(
      `SELECT bg.*, bp.name as pig_name, b.pen_name as batch_name
       FROM batch_gestations bg
       JOIN batch_pigs bp ON bg.pig_id = bp.id
       JOIN batches b ON bg.batch_id = b.id
       WHERE bg.id = $1`,
      [gestationId],
    );

    this.logger.log(`Gestation créée: ${gestationId} pour truie ${pigId} dans bande ${dto.batch_id}`);

    return gestationResult.rows[0];
  }

  /**
   * Met à jour une gestation (mise bas, avortement, etc.)
   */
  async updateGestation(
    gestationId: string,
    dto: UpdateBatchGestationDto,
    userId: string,
  ): Promise<any> {
    const existingGestation = await this.checkGestationOwnership(gestationId, userId);

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
    if (dto.verrat_id !== undefined) {
      updates.push(`verrat_id = $${paramIndex}`);
      values.push(dto.verrat_id || null);
      paramIndex++;
    }
    if (dto.verrat_nom !== undefined) {
      updates.push(`verrat_nom = $${paramIndex}`);
      values.push(dto.verrat_nom || null);
      paramIndex++;
    }
    if (dto.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(dto.notes || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return existingGestation;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(gestationId);

    await this.db.query(
      `UPDATE batch_gestations 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values,
    );

    // Mettre à jour le statut de la truie selon le statut de gestation
    const pigId = existingGestation.pig_id;
    if (dto.status) {
      let newPigStatus = dto.status;
      // Si avortement ou perte, remettre la truie disponible
      if (dto.status === 'aborted' || dto.status === 'lost') {
        newPigStatus = 'not_pregnant';
      }
      
      await this.db.query(
        `UPDATE batch_pigs 
         SET gestation_status = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newPigStatus, pigId],
      );
    }

    // Récupérer l'enregistrement mis à jour
    const updatedResult = await this.db.query(
      `SELECT bg.*, bp.name as pig_name, b.pen_name as batch_name
       FROM batch_gestations bg
       JOIN batch_pigs bp ON bg.pig_id = bp.id
       JOIN batches b ON bg.batch_id = b.id
       WHERE bg.id = $1`,
      [gestationId],
    );

    return updatedResult.rows[0];
  }

  /**
   * Supprime une gestation
   */
  async deleteGestation(gestationId: string, userId: string): Promise<{ id: string }> {
    const existingGestation = await this.checkGestationOwnership(gestationId, userId);

    // Remettre la truie comme disponible
    await this.db.query(
      `UPDATE batch_pigs 
       SET gestation_status = 'not_pregnant',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [existingGestation.pig_id],
    );

    // Supprimer la gestation
    await this.db.query(
      'DELETE FROM batch_gestations WHERE id = $1',
      [gestationId],
    );

    this.logger.log(`Gestation supprimée: ${gestationId}`);

    return { id: gestationId };
  }

  /**
   * Récupère les gestations d'une bande
   */
  async getGestationsByBatch(batchId: string, userId: string): Promise<any[]> {
    await this.checkBatchOwnership(batchId, userId);

    const result = await this.db.query(
      `SELECT bg.*, bp.name as pig_name, b.pen_name as batch_name
       FROM batch_gestations bg
       JOIN batch_pigs bp ON bg.pig_id = bp.id
       JOIN batches b ON bg.batch_id = b.id
       WHERE bg.batch_id = $1
       ORDER BY bg.mating_date DESC`,
      [batchId],
    );

    return result.rows;
  }

  /**
   * Récupère toutes les gestations d'un projet
   */
  async getGestationsByProjet(projetId: string, userId: string): Promise<any[]> {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.db.query(
      `SELECT bg.*, bp.name as pig_name, b.pen_name as batch_name
       FROM batch_gestations bg
       JOIN batch_pigs bp ON bg.pig_id = bp.id
       JOIN batches b ON bg.batch_id = b.id
       WHERE b.projet_id = $1
       ORDER BY bg.mating_date DESC`,
      [projetId],
    );

    return result.rows;
  }

  /**
   * Récupère les gestations en cours d'un projet
   */
  async getGestationsEnCoursByProjet(projetId: string, userId: string): Promise<any[]> {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.db.query(
      `SELECT bg.*, bp.name as pig_name, b.pen_name as batch_name
       FROM batch_gestations bg
       JOIN batch_pigs bp ON bg.pig_id = bp.id
       JOIN batches b ON bg.batch_id = b.id
       WHERE b.projet_id = $1 AND bg.status = 'pregnant'
       ORDER BY bg.expected_delivery_date ASC`,
      [projetId],
    );

    return result.rows;
  }

  /**
   * Récupère une gestation par ID
   */
  async getGestationById(gestationId: string, userId: string): Promise<any> {
    const result = await this.db.query(
      `SELECT bg.*, bp.name as pig_name, b.pen_name as batch_name, b.projet_id, p.proprietaire_id
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

  // ==================== STATISTIQUES ====================

  /**
   * Récupère les statistiques de gestations d'un projet (mode batch)
   */
  async getStatistiquesGestations(projetId: string, userId: string): Promise<any> {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.db.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'pregnant') as en_cours,
         COUNT(*) FILTER (WHERE status = 'delivered') as terminees,
         COUNT(*) FILTER (WHERE status IN ('aborted', 'lost')) as annulees,
         COALESCE(SUM(piglets_born_count), 0) as porcelets_nes_total,
         COALESCE(SUM(piglets_alive_count), 0) as porcelets_vivants_total,
         COALESCE(SUM(piglets_dead_count), 0) as porcelets_morts_total
       FROM batch_gestations bg
       JOIN batches b ON bg.batch_id = b.id
       WHERE b.projet_id = $1`,
      [projetId],
    );

    const stats = result.rows[0];
    const total = parseInt(stats.total) || 0;
    const terminees = parseInt(stats.terminees) || 0;

    return {
      total,
      en_cours: parseInt(stats.en_cours) || 0,
      terminees,
      annulees: parseInt(stats.annulees) || 0,
      porcelets_nes_total: parseInt(stats.porcelets_nes_total) || 0,
      porcelets_vivants_total: parseInt(stats.porcelets_vivants_total) || 0,
      porcelets_morts_total: parseInt(stats.porcelets_morts_total) || 0,
      taux_reussite: total > 0 ? (terminees / total) * 100 : 0,
    };
  }

  /**
   * Récupère le taux de survie des porcelets (mode batch)
   */
  async getTauxSurvie(projetId: string, userId: string): Promise<any> {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.db.query(
      `SELECT 
         COALESCE(SUM(piglets_born_count), 0) as porcelets_nes,
         COALESCE(SUM(piglets_alive_count), 0) as porcelets_vivants
       FROM batch_gestations bg
       JOIN batches b ON bg.batch_id = b.id
       WHERE b.projet_id = $1 AND bg.status = 'delivered'`,
      [projetId],
    );

    const data = result.rows[0];
    const porceletsNes = parseInt(data.porcelets_nes) || 0;
    const porceletsVivants = parseInt(data.porcelets_vivants) || 0;

    return {
      porcelets_nes_total: porceletsNes,
      porcelets_vivants_total: porceletsVivants,
      porcelets_morts_total: porceletsNes - porceletsVivants,
      taux_survie: porceletsNes > 0 ? (porceletsVivants / porceletsNes) * 100 : 0,
    };
  }
}
