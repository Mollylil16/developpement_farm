import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateBatchPigDto,
  TransferPigDto,
  RemovePigDto,
  CreateBatchWithPigsDto,
  UpdateBatchSettingsDto,
  UpdateBatchDto,
} from './dto';

@Injectable()
export class BatchPigsService {
  private readonly logger = new Logger(BatchPigsService.name);

  constructor(private db: DatabaseService) {}

  /**
   * Génère un ID comme le frontend : pig_${Date.now()}_${random}
   */
  private generatePigId(): string {
    return `pig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID pour un mouvement : mov_${Date.now()}_${random}
   */
  private generateMovementId(): string {
    return `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID pour une bande : batch_${Date.now()}_${random}
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Vérifie que la bande appartient au projet de l'utilisateur OU qu'il est collaborateur actif
   */
  private async checkBatchOwnership(
    batchId: string,
    userId: string,
  ): Promise<void> {
    try {
      const normalizedUserId = String(userId || '').trim();
      
      // 1. Vérifier si l'utilisateur est propriétaire
      const ownerResult = await this.db.query(
        `SELECT b.id, b.projet_id
         FROM batches b
         JOIN projets p ON b.projet_id = p.id
         WHERE b.id = $1 AND p.proprietaire_id = $2`,
        [batchId, normalizedUserId],
      );
      
      if (ownerResult.rows.length > 0) {
        return; // ✅ L'utilisateur est propriétaire
      }
      
      // 2. Vérifier si la bande existe
      const batchCheck = await this.db.query(
        `SELECT b.id, b.projet_id FROM batches b WHERE b.id = $1`,
        [batchId],
      );
      
      if (batchCheck.rows.length === 0) {
        throw new NotFoundException('Bande non trouvée');
      }
      
      const projetId = batchCheck.rows[0].projet_id;
      
      // 3. Vérifier si l'utilisateur est collaborateur actif avec permission 'cheptel'
      // ✅ Ne pas inclure 'permissions' car cette colonne peut ne pas exister
      const collabResult = await this.db.query(
        `SELECT id, permission_cheptel, permission_gestion_complete FROM collaborations 
         WHERE projet_id = $1 
         AND (user_id = $2 OR profile_id LIKE $3)
         AND statut = 'actif'`,
        [projetId, normalizedUserId, `%${normalizedUserId}%`],
      );
      
      if (collabResult.rows.length > 0) {
        const collab = collabResult.rows[0];
        
        // Log pour debug
        this.logger.debug(
          `[checkBatchOwnership] Collab trouvé: id=${collab.id}, ` +
          `permission_cheptel=${collab.permission_cheptel}, ` +
          `permission_gestion_complete=${collab.permission_gestion_complete}`
        );
        
        // Vérifier les nouvelles colonnes de permission booléennes
        if (collab.permission_cheptel === true || collab.permission_gestion_complete === true) {
          return; // ✅ L'utilisateur est collaborateur avec permission
        }
      }
      
      // Si aucune condition n'est remplie, vérifier pour le débogage
      const projetCheck = await this.db.query(
        `SELECT id, proprietaire_id FROM projets WHERE id = $1`,
        [projetId],
      );
      if (projetCheck.rows.length > 0) {
        const proprietaireId = projetCheck.rows[0].proprietaire_id;
        const proprietaireIdStr = proprietaireId ? String(proprietaireId).trim() : 'NULL';
        const match = proprietaireId ? String(proprietaireId).trim() === normalizedUserId : false;
        
        this.logger.warn(
          `[checkBatchOwnership] Bande ${batchId} appartient au projet ${projetId}, ` +
          `proprietaire_id=${proprietaireIdStr}, userId=${normalizedUserId}, match=${match}`
        );
          
        // Si proprietaire_id est NULL, c'est un problème de configuration
        if (!proprietaireId) {
          this.logger.error(
            `[checkBatchOwnership] Le projet ${projetId} n'a pas de proprietaire_id défini. ` +
            `C'est un problème de configuration de la base de données.`
          );
        }
      }
        
      // La bande existe mais n'appartient pas à l'utilisateur
      throw new ForbiddenException('Cette bande ne vous appartient pas');
    } catch (error) {
      // Si c'est déjà une exception NestJS, la relancer telle quelle
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      // Sinon, logger l'erreur et relancer
      this.logger.error(`[checkBatchOwnership] Erreur inattendue:`, error);
      throw error;
    }
  }

  /**
   * Mapper une ligne de la base de données vers un objet BatchPig
   */
  private mapRowToPig(row: any): any {
    // Validation de base
    if (!row || !row.id) {
      throw new Error('Ligne invalide: id manquant');
    }
    
try {
      // Parser le poids avec gestion des NaN
      let weight = 0;
      if (row.current_weight_kg != null) {
        const parsed = parseFloat(String(row.current_weight_kg));
        weight = isNaN(parsed) ? 0 : parsed;
      }
      
      // Parser l'âge avec gestion des NaN
      let ageMonths: number | undefined = undefined;
      if (row.age_months != null) {
        const parsed = parseFloat(String(row.age_months));
        ageMonths = isNaN(parsed) ? undefined : parsed;
      }
      
      // Parser le prix d'achat avec gestion des NaN
      let purchasePrice: number | undefined = undefined;
      if (row.purchase_price != null) {
        const parsed = parseFloat(String(row.purchase_price));
        purchasePrice = isNaN(parsed) ? undefined : parsed;
      }
      
return {
        id: row.id,
        batch_id: row.batch_id,
        name: row.name || undefined,
        sex: row.sex,
        birth_date: row.birth_date || undefined,
        age_months: ageMonths,
        current_weight_kg: weight,
        origin: row.origin,
        origin_details: row.origin_details || undefined,
        supplier_name: row.supplier_name || undefined,
        purchase_price: purchasePrice,
        health_status: row.health_status || 'healthy',
        last_vaccination_date: row.last_vaccination_date || undefined,
        notes: row.notes || undefined,
        photo_url: row.photo_url || undefined,
        entry_date: row.entry_date,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error) {
throw error;
    }
  }

  /**
   * Mapper une ligne de mouvement vers un objet BatchPigMovement
   */
  private mapRowToMovement(row: any): any {
    return {
      id: row.id,
      pig_id: row.pig_id,
      movement_type: row.movement_type,
      from_batch_id: row.from_batch_id || undefined,
      to_batch_id: row.to_batch_id || undefined,
      removal_reason: row.removal_reason || undefined,
      removal_details: row.removal_details || undefined,
      sale_price: row.sale_price ? parseFloat(row.sale_price) : undefined,
      sale_weight_kg: row.sale_weight_kg
        ? parseFloat(row.sale_weight_kg)
        : undefined,
      buyer_name: row.buyer_name || undefined,
      death_cause: row.death_cause || undefined,
      veterinary_report: row.veterinary_report || undefined,
      movement_date: row.movement_date,
      notes: row.notes || undefined,
      created_at: row.created_at,
    };
  }

  /**
   * Ajouter un porc à une bande
   */
  async addPigToBatch(
    dto: CreateBatchPigDto,
    userId: string,
  ): Promise<any> {
    // Vérifier que la bande existe et appartient à l'utilisateur
    await this.checkBatchOwnership(dto.batch_id, userId);

    const pigId = this.generatePigId();
    const entryDate = dto.entry_date ? new Date(dto.entry_date) : new Date();

    // Insérer le porc
    await this.db.query(
      `INSERT INTO batch_pigs (
        id, batch_id, name, sex, birth_date, age_months, current_weight_kg,
        origin, origin_details, supplier_name, purchase_price, health_status,
        notes, photo_url, entry_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
      [
        pigId,
        dto.batch_id,
        dto.name || null,
        dto.sex,
        dto.birth_date ? new Date(dto.birth_date).toISOString() : null,
        dto.age_months || null,
        dto.current_weight_kg,
        dto.origin,
        dto.origin_details || null,
        dto.supplier_name || null,
        dto.purchase_price || null,
        'healthy',
        dto.notes || null,
        dto.photo_url || null,
        entryDate.toISOString().split('T')[0],
      ],
    );

    // Enregistrer mouvement d'entrée
    const movementId = this.generateMovementId();
    await this.db.query(
      `INSERT INTO batch_pig_movements (
        id, pig_id, movement_type, to_batch_id, movement_date, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        movementId,
        pigId,
        'entry',
        dto.batch_id,
        entryDate.toISOString().split('T')[0],
        `Ajout: ${dto.origin}`,
      ],
    );

    // Les triggers mettront à jour automatiquement les compteurs de la bande

    // Retourner le porc créé
    const result = await this.db.query(
      'SELECT * FROM batch_pigs WHERE id = $1',
      [pigId],
    );
    return this.mapRowToPig(result.rows[0]);
  }

  /**
   * Transférer un porc vers une autre bande
   */
  async transferPig(dto: TransferPigDto, userId: string): Promise<any> {
    // Vérifier que le porc existe
    const pigResult = await this.db.query(
      'SELECT * FROM batch_pigs WHERE id = $1',
      [dto.pig_id],
    );
    if (pigResult.rows.length === 0) {
      throw new NotFoundException('Porc non trouvé');
    }

    const pig = this.mapRowToPig(pigResult.rows[0]);

    // Vérifier que from_batch correspond
    if (pig.batch_id !== dto.from_batch_id) {
      throw new BadRequestException(
        "Le porc n'appartient pas à la bande source",
      );
    }

    // Vérifier que les deux bandes appartiennent à l'utilisateur
    await this.checkBatchOwnership(dto.from_batch_id, userId);
    await this.checkBatchOwnership(dto.to_batch_id, userId);

    // Vérifier que la bande destination existe
    const toBatchResult = await this.db.query(
      'SELECT * FROM batches WHERE id = $1',
      [dto.to_batch_id],
    );
    if (toBatchResult.rows.length === 0) {
      throw new NotFoundException('Bande de destination non trouvée');
    }

    // Mettre à jour le batch_id du porc
    await this.db.query(
      'UPDATE batch_pigs SET batch_id = $1, updated_at = NOW() WHERE id = $2',
      [dto.to_batch_id, dto.pig_id],
    );

    // Enregistrer mouvement de transfert
    const movementId = this.generateMovementId();
    await this.db.query(
      `INSERT INTO batch_pig_movements (
        id, pig_id, movement_type, from_batch_id, to_batch_id, movement_date, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        movementId,
        dto.pig_id,
        'transfer',
        dto.from_batch_id,
        dto.to_batch_id,
        new Date().toISOString().split('T')[0],
        dto.notes || null,
      ],
    );

    // Les triggers mettront à jour les compteurs des deux bandes

    // Retourner le porc mis à jour
    const updatedResult = await this.db.query(
      'SELECT * FROM batch_pigs WHERE id = $1',
      [dto.pig_id],
    );
    return this.mapRowToPig(updatedResult.rows[0]);
  }

  /**
   * Retirer un porc (vente, mort, don, etc.)
   */
  async removePig(dto: RemovePigDto, userId: string): Promise<void> {
    // Vérifier que le porc existe et appartient à l'utilisateur
    const pigResult = await this.db.query(
      `SELECT p.*, b.projet_id, pr.proprietaire_id 
       FROM batch_pigs p
       JOIN batches b ON p.batch_id = b.id
       JOIN projets pr ON b.projet_id = pr.id
       WHERE p.id = $1`,
      [dto.pig_id],
    );
    if (pigResult.rows.length === 0) {
      throw new NotFoundException('Porc non trouvé');
    }
    if (pigResult.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Ce porc ne vous appartient pas');
    }

    const pig = this.mapRowToPig(pigResult.rows[0]);
    const removalDate = dto.removal_date
      ? new Date(dto.removal_date)
      : new Date();

    // Enregistrer mouvement de retrait
    const movementId = this.generateMovementId();
    await this.db.query(
      `INSERT INTO batch_pig_movements (
        id, pig_id, movement_type, from_batch_id, removal_reason, removal_details,
        sale_price, sale_weight_kg, buyer_name, death_cause, veterinary_report,
        movement_date, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
      [
        movementId,
        dto.pig_id,
        'removal',
        pig.batch_id,
        dto.removal_reason,
        dto.removal_details || null,
        dto.sale_price || null,
        dto.sale_weight_kg || null,
        dto.buyer_name || null,
        dto.death_cause || null,
        dto.veterinary_report || null,
        removalDate.toISOString().split('T')[0],
        dto.notes || null,
      ],
    );

    // Supprimer le porc
    await this.db.query('DELETE FROM batch_pigs WHERE id = $1', [
      dto.pig_id,
    ]);

    // Le trigger mettra à jour les compteurs de la bande
  }

  /**
   * Obtenir tous les porcs d'une bande
   */
  async getPigsByBatch(batchId: string, userId: string): Promise<any[]> {
try {
      // Vérifier la propriété
      await this.checkBatchOwnership(batchId, userId);
const result = await this.db.query(
        'SELECT * FROM batch_pigs WHERE batch_id = $1 ORDER BY entry_date DESC',
        [batchId],
      );
const mapped = result.rows.map((row, index) => {
        try {
          return this.mapRowToPig(row);
        } catch (error) {
throw error;
        }
      });
return mapped;
    } catch (error) {
throw error;
    }
  }

  /**
   * Obtenir l'historique des mouvements d'un porc
   */
  async getPigMovements(pigId: string, userId: string): Promise<any[]> {
    // Vérifier que le porc existe et appartient à l'utilisateur
    const pigResult = await this.db.query(
      `SELECT p.*, b.projet_id, pr.proprietaire_id 
       FROM batch_pigs p
       JOIN batches b ON p.batch_id = b.id
       JOIN projets pr ON b.projet_id = pr.id
       WHERE p.id = $1`,
      [pigId],
    );
    if (pigResult.rows.length === 0) {
      throw new NotFoundException('Porc non trouvé');
    }
    if (pigResult.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Ce porc ne vous appartient pas');
    }

    const result = await this.db.query(
      'SELECT * FROM batch_pig_movements WHERE pig_id = $1 ORDER BY movement_date DESC, created_at DESC',
      [pigId],
    );

    return result.rows.map((row) => this.mapRowToMovement(row));
  }

  /**
   * Génère le prochain nom de loge disponible pour un projet
   * Format selon position:
   * - droite: A1, A2, A3, ..., A8, A9, etc.
   * - gauche: B1, B2, B3, ..., B8, B9, etc.
   */
  async getNextPenName(
    projetId: string,
    userId: string,
    position: 'gauche' | 'droite' = 'droite',
  ): Promise<string> {
    // Vérifier que le projet appartient à l'utilisateur
    await this.checkProjetOwnership(projetId, userId);

    // Récupérer tous les noms de loges existants pour ce projet et cette position
    const result = await this.db.query(
      'SELECT pen_name FROM batches WHERE projet_id = $1 AND position = $2',
      [projetId, position],
    );

    const existingPenNames = new Set(
      result.rows.map((row) => row.pen_name.trim().toUpperCase()),
    );

    // Déterminer la lettre selon la position
    const letter = position === 'droite' ? 'A' : 'B';
    const maxNumbersPerLetter = 999; // Pas de limite pratique

    // Chercher le prochain numéro disponible pour cette lettre
    for (let number = 1; number <= maxNumbersPerLetter; number++) {
      const penName = `${letter}${number}`;
      if (!existingPenNames.has(penName)) {
        return penName;
      }
    }

    // Si on arrive ici (très improbable), retourner un nom avec timestamp
    return `${letter}${Date.now()}`;
  }

  /**
   * Obtenir toutes les bandes d'un projet
   */
  async getAllBatchesByProjet(projetId: string, userId: string): Promise<any[]> {
    // Vérifier que le projet appartient à l'utilisateur
    await this.checkProjetOwnership(projetId, userId);

    // IMPORTANT: on calcule les effectifs depuis batch_pigs pour éviter toute incohérence
    // (ex: anciens projets affectés par un double comptage).
    // Gérer le cas où la colonne position n'existe pas encore (migration non exécutée)
    try {
      const result = await this.db.query(
        `SELECT
           b.*,
           COALESCE(p.total_count, 0) AS total_count_calc,
           COALESCE(p.male_count, 0) AS male_count_calc,
           COALESCE(p.female_count, 0) AS female_count_calc,
           COALESCE(p.castrated_count, 0) AS castrated_count_calc,
           COALESCE(p.avg_weight_kg, b.average_weight_kg) AS average_weight_kg_calc,
           COALESCE(p.avg_age_months, b.average_age_months) AS average_age_months_calc
         FROM batches b
         LEFT JOIN (
           SELECT
             batch_id,
             COUNT(*)::int AS total_count,
             COUNT(*) FILTER (WHERE sex = 'male')::int AS male_count,
             COUNT(*) FILTER (WHERE sex = 'female')::int AS female_count,
             COUNT(*) FILTER (WHERE sex = 'castrated')::int AS castrated_count,
             COALESCE(AVG(current_weight_kg), 0) AS avg_weight_kg,
             COALESCE(AVG(age_months), 0) AS avg_age_months
           FROM batch_pigs
           GROUP BY batch_id
         ) p ON p.batch_id = b.id
         WHERE b.projet_id = $1
         ORDER BY COALESCE(b.position, 'droite'), b.pen_name`,
        [projetId],
      );
      return this.mapBatchesResult(result.rows);
    } catch (error: any) {
      // Si la colonne position n'existe pas, utiliser une requête de fallback
      if (error.message && error.message.includes('position')) {
        const result = await this.db.query(
          `SELECT
             b.*,
             COALESCE(p.total_count, 0) AS total_count_calc,
             COALESCE(p.male_count, 0) AS male_count_calc,
             COALESCE(p.female_count, 0) AS female_count_calc,
             COALESCE(p.castrated_count, 0) AS castrated_count_calc,
             COALESCE(p.avg_weight_kg, b.average_weight_kg) AS average_weight_kg_calc,
             COALESCE(p.avg_age_months, b.average_age_months) AS average_age_months_calc
           FROM batches b
           LEFT JOIN (
             SELECT
               batch_id,
               COUNT(*)::int AS total_count,
               COUNT(*) FILTER (WHERE sex = 'male')::int AS male_count,
               COUNT(*) FILTER (WHERE sex = 'female')::int AS female_count,
               COUNT(*) FILTER (WHERE sex = 'castrated')::int AS castrated_count,
               COALESCE(AVG(current_weight_kg), 0) AS avg_weight_kg,
               COALESCE(AVG(age_months), 0) AS avg_age_months
             FROM batch_pigs
             GROUP BY batch_id
           ) p ON p.batch_id = b.id
           WHERE b.projet_id = $1
           ORDER BY b.pen_name`,
          [projetId],
        );
        return this.mapBatchesResult(result.rows);
      }
      throw error;
    }
  }

  /**
   * Mappe les résultats de la requête vers le format attendu
   */
  private mapBatchesResult(rows: any[]): any[] {
    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      pen_name: row.pen_name,
      position: row.position || 'droite',
      category: row.category,
      total_count: parseInt(row.total_count_calc),
      male_count: parseInt(row.male_count_calc),
      female_count: parseInt(row.female_count_calc),
      castrated_count: parseInt(row.castrated_count_calc),
      average_age_months: parseFloat(row.average_age_months_calc),
      average_weight_kg: parseFloat(row.average_weight_kg_calc),
      avg_daily_gain:
        row.avg_daily_gain !== null && row.avg_daily_gain !== undefined
          ? parseFloat(row.avg_daily_gain)
          : 0.4,
      batch_creation_date: row.batch_creation_date,
      expected_sale_date: row.expected_sale_date || undefined,
      notes: row.notes || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }


  /**
   * Obtenir statistiques d'une bande
   */
  async getBatchStats(batchId: string, userId: string): Promise<any> {
    // Vérifier la propriété
    await this.checkBatchOwnership(batchId, userId);

    const pigs = await this.getPigsByBatch(batchId, userId);

    const bySex = {
      male: pigs.filter((p) => p.sex === 'male').length,
      female: pigs.filter((p) => p.sex === 'female').length,
      castrated: pigs.filter((p) => p.sex === 'castrated').length,
    };

    const byHealth = {
      healthy: pigs.filter((p) => p.health_status === 'healthy').length,
      sick: pigs.filter((p) => p.health_status === 'sick').length,
      treatment: pigs.filter((p) => p.health_status === 'treatment').length,
      quarantine: pigs.filter((p) => p.health_status === 'quarantine').length,
    };

    const totalWeight = pigs.reduce(
      (sum, p) => sum + p.current_weight_kg,
      0,
    );
    const averageWeight = pigs.length > 0 ? totalWeight / pigs.length : 0;

    const totalAge = pigs.reduce(
      (sum, p) => sum + (p.age_months || 0),
      0,
    );
    const averageAge = pigs.length > 0 ? totalAge / pigs.length : 0;

    return {
      total: pigs.length,
      by_sex: bySex,
      by_health: byHealth,
      average_weight: averageWeight,
      average_age: averageAge,
    };
  }

  /**
   * Met à jour les paramètres d'une bande (ex: GMQ)
   */
  async updateBatchSettings(
    batchId: string,
    dto: UpdateBatchSettingsDto,
    userId: string,
  ): Promise<any> {
    await this.checkBatchOwnership(batchId, userId);

    if (!dto || typeof dto.avg_daily_gain === 'undefined') {
      throw new BadRequestException('Aucun paramètre à mettre à jour');
    }

    const normalizedGmq =
      dto.avg_daily_gain !== undefined
        ? Math.round(dto.avg_daily_gain * 1000) / 1000
        : undefined;

    if (normalizedGmq !== undefined && normalizedGmq < 0.01) {
      throw new BadRequestException(
        'Le GMQ doit être supérieur ou égal à 0.01 kg/jour',
      );
    }

    const result = await this.db.query(
      `UPDATE batches
       SET avg_daily_gain = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, projet_id, pen_name, avg_daily_gain, updated_at`,
      [normalizedGmq, batchId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Bande non trouvée');
    }

    const row = result.rows[0];

    return {
      id: row.id,
      projet_id: row.projet_id,
      pen_name: row.pen_name,
      avg_daily_gain:
        row.avg_daily_gain !== null && row.avg_daily_gain !== undefined
          ? parseFloat(row.avg_daily_gain)
          : null,
      updated_at: row.updated_at,
    };
  }

  /**
   * Met à jour les informations d'une bande (nom, catégorie, position, notes)
   */
  async updateBatch(
    batchId: string,
    dto: UpdateBatchDto,
    userId: string,
  ): Promise<any> {
    await this.checkBatchOwnership(batchId, userId);

    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException('Aucun paramètre à mettre à jour');
    }

    // Vérifier que le nouveau nom de loge n'est pas déjà utilisé dans le même projet
    if (dto.pen_name) {
      const batchResult = await this.db.query(
        'SELECT projet_id FROM batches WHERE id = $1',
        [batchId],
      );
      if (batchResult.rows.length === 0) {
        throw new NotFoundException('Bande non trouvée');
      }
      const projetId = batchResult.rows[0].projet_id;

      const existingBatch = await this.db.query(
        'SELECT id FROM batches WHERE projet_id = $1 AND pen_name = $2 AND id != $3',
        [projetId, dto.pen_name, batchId],
      );
      if (existingBatch.rows.length > 0) {
        throw new BadRequestException(
          `Une loge avec le nom "${dto.pen_name}" existe déjà dans ce projet`,
        );
      }
    }

    // Construire la requête UPDATE dynamiquement
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.pen_name !== undefined) {
      updates.push(`pen_name = $${paramIndex}`);
      values.push(dto.pen_name);
      paramIndex++;
    }

    if (dto.category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      values.push(dto.category);
      paramIndex++;
    }

    if (dto.position !== undefined) {
      updates.push(`position = $${paramIndex}`);
      values.push(dto.position);
      paramIndex++;
    }

    if (dto.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(dto.notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new BadRequestException('Aucun paramètre valide à mettre à jour');
    }

    updates.push(`updated_at = NOW()`);
    values.push(batchId);

    const result = await this.db.query(
      `UPDATE batches
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Bande non trouvée');
    }

    return this.mapBatchesResult(result.rows)[0];
  }

  /**
   * Supprime une bande (seulement si elle est vide)
   */
  async deleteBatch(batchId: string, userId: string): Promise<void> {
    await this.checkBatchOwnership(batchId, userId);

    // Vérifier que la bande est vide
    const pigsResult = await this.db.query(
      'SELECT COUNT(*) as count FROM batch_pigs WHERE batch_id = $1',
      [batchId],
    );
    const pigCount = parseInt(pigsResult.rows[0]?.count || '0');

    if (pigCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer la loge : elle contient encore ${pigCount} sujet(s). Veuillez d'abord déplacer ou retirer tous les sujets.`,
      );
    }

    // Supprimer la bande
    const deleteResult = await this.db.query(
      'DELETE FROM batches WHERE id = $1 RETURNING id',
      [batchId],
    );

    if (deleteResult.rows.length === 0) {
      throw new NotFoundException('Bande non trouvée');
    }
  }

  /**
   * Vérifie que le projet appartient à l'utilisateur OU qu'il est collaborateur actif
   * avec les permissions appropriées (cheptel ou gestion_complete)
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
      throw new NotFoundException('Projet non trouvé');
    }
    const rawProprietaireId = result.rows[0].proprietaire_id;
    const proprietaireId = String(rawProprietaireId || '').trim();
    const normalizedUserId = String(userId || '').trim();
    
    // ✅ Si l'utilisateur est le propriétaire, OK
    if (proprietaireId === normalizedUserId) {
      return;
    }
    
    // ✅ Sinon, vérifier s'il est collaborateur actif avec permission 'cheptel'
    const collabResult = await this.db.query(
      `SELECT id, permission_cheptel, permission_gestion_complete FROM collaborations 
       WHERE projet_id = $1 
       AND (user_id = $2 OR profile_id LIKE $3)
       AND statut = 'actif'`,
      [projetId, normalizedUserId, `%${normalizedUserId}%`],
    );
    
    if (collabResult.rows.length > 0) {
      const collab = collabResult.rows[0];
      // Vérifier si la permission cheptel ou gestion_complete est accordée
      if (collab.permission_cheptel === true || collab.permission_gestion_complete === true) {
        return;
      }
    }
    
    throw new ForbiddenException('Vous n\'avez pas accès à ce projet ou les permissions nécessaires');
  }

  /**
   * Créer une loge avec ou sans population initiale
   */
  async createBatchWithPigs(
    dto: CreateBatchWithPigsDto,
    userId: string,
    skipOwnershipCheck: boolean = false,
  ): Promise<any> {
// Vérifier que le projet appartient à l'utilisateur (sauf si skipOwnershipCheck est true, pour éviter les problèmes de timing lors de la création initiale)
    if (!skipOwnershipCheck) {
      await this.checkProjetOwnership(dto.projet_id, userId);
    }

    // Calculer le total de population
    const totalCount = dto.population
      ? dto.population.male_count +
        dto.population.female_count +
        dto.population.castrated_count
      : 0;
// Validation : Si population fournie, âge et poids OBLIGATOIRES
    if (totalCount > 0) {
      if (!dto.average_age_months || dto.average_age_months <= 0) {
        throw new BadRequestException(
          "L'âge moyen est requis pour une loge avec population",
        );
      }
      if (!dto.average_weight_kg || dto.average_weight_kg <= 0) {
        throw new BadRequestException(
          'Le poids moyen est requis pour une loge avec population',
        );
      }
    }

    const batchId = this.generateBatchId();
    const now = new Date().toISOString();

    // Déterminer la position si non fournie (par défaut: droite)
    const position = dto.position || 'droite';

    // Créer la bande
    // IMPORTANT:
    // - Les tables batch_pigs ont des triggers qui maintiennent automatiquement
    //   total_count/male_count/female_count/castrated_count et average_weight_kg.
    // - Donc on initialise les compteurs à 0 pour éviter le double comptage
    //   (sinon: insertion des porcs => triggers incrémentent une seconde fois).
    await this.db.query(
      `INSERT INTO batches (
        id, projet_id, pen_name, position, category, total_count, male_count, female_count,
        castrated_count, average_age_months, average_weight_kg, batch_creation_date,
        notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        batchId,
        dto.projet_id,
        dto.pen_name,
        position,
        dto.category,
        0,
        0,
        0,
        0,
        dto.average_age_months || 0,
        dto.average_weight_kg || 0,
        now.split('T')[0],
        dto.notes || null,
        now,
        now,
      ],
    );
// Si population fournie, créer les sujets individuels
    if (totalCount > 0 && dto.population && dto.average_age_months && dto.average_weight_kg) {
await this.createIndividualPigs(
        batchId,
        dto.population,
        dto.average_age_months,
        dto.average_weight_kg,
      );
} else {
}

    // Retourner la bande créée
    const result = await this.db.query('SELECT * FROM batches WHERE id = $1', [
      batchId,
    ]);

    return {
      id: result.rows[0].id,
      projet_id: result.rows[0].projet_id,
      pen_name: result.rows[0].pen_name,
      position: result.rows[0].position || 'droite',
      category: result.rows[0].category,
      total_count: parseInt(result.rows[0].total_count),
      male_count: parseInt(result.rows[0].male_count),
      female_count: parseInt(result.rows[0].female_count),
      castrated_count: parseInt(result.rows[0].castrated_count),
      average_age_months: parseFloat(result.rows[0].average_age_months),
      average_weight_kg: parseFloat(result.rows[0].average_weight_kg),
      batch_creation_date: result.rows[0].batch_creation_date,
      expected_sale_date: result.rows[0].expected_sale_date || undefined,
      notes: result.rows[0].notes || undefined,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at,
    };
  }

  /**
   * Créer les sujets individuels pour une bande
   */
  private async createIndividualPigs(
    batchId: string,
    population: {
      male_count: number;
      female_count: number;
      castrated_count: number;
    },
    averageAge: number,
    averageWeight: number,
  ): Promise<void> {
    const pigs: any[] = [];
    let pigIndex = 0;

    // Créer les mâles
    for (let i = 0; i < population.male_count; i++) {
      pigs.push(
        this.generatePig(batchId, 'male', averageAge, averageWeight, pigIndex++),
      );
    }

    // Créer les femelles
    for (let i = 0; i < population.female_count; i++) {
      pigs.push(
        this.generatePig(
          batchId,
          'female',
          averageAge,
          averageWeight,
          pigIndex++,
        ),
      );
    }

    // Créer les castrés
    for (let i = 0; i < population.castrated_count; i++) {
      pigs.push(
        this.generatePig(
          batchId,
          'castrated',
          averageAge,
          averageWeight,
          pigIndex++,
        ),
      );
    }

    // Insérer les porcs un par un (les triggers mettront à jour les compteurs)
    if (pigs.length > 0) {
let insertedCount = 0;
      for (const pig of pigs) {
        try {
          await this.db.query(
            `INSERT INTO batch_pigs (
              id, batch_id, name, sex, birth_date, age_months, current_weight_kg,
              origin, origin_details, supplier_name, purchase_price, health_status,
              notes, photo_url, entry_date, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
            [
              pig.id,
              pig.batch_id,
              pig.name,
              pig.sex,
              pig.birth_date,
              pig.age_months,
              pig.current_weight_kg,
              pig.origin,
              pig.origin_details,
              pig.supplier_name,
              pig.purchase_price,
              pig.health_status,
              pig.notes,
              pig.photo_url,
              pig.entry_date,
            ],
          );

          // Enregistrer mouvement d'entrée
          const movementId = this.generateMovementId();
          await this.db.query(
            `INSERT INTO batch_pig_movements (
              id, pig_id, movement_type, to_batch_id, movement_date, notes, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [
              movementId,
              pig.id,
              'entry',
              batchId,
              pig.entry_date,
              "Créé lors de l'initialisation de la bande",
            ],
          );
          insertedCount++;
        } catch (error) {
throw error;
        }
      }
}
  }

  /**
   * Générer un sujet individuel avec variation autour de la moyenne
   */
  private generatePig(
    batchId: string,
    sex: 'male' | 'female' | 'castrated',
    averageAge: number,
    averageWeight: number,
    index: number,
  ): any {
    // Variation aléatoire ±10% pour simuler la diversité naturelle
    const ageVariation = averageAge * (0.9 + Math.random() * 0.2); // ±10%
    const weightVariation = averageWeight * (0.9 + Math.random() * 0.2); // ±10%

    return {
      id: `pig_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      batch_id: batchId,
      name: null,
      sex,
      birth_date: null,
      age_months: Math.round(ageVariation * 10) / 10, // Arrondir à 1 décimale
      current_weight_kg: Math.round(weightVariation * 10) / 10,
      origin: 'birth',
      origin_details: "Créé lors de l'initialisation de la bande",
      supplier_name: null,
      purchase_price: null,
      health_status: 'healthy',
      notes: null,
      photo_url: null,
      entry_date: new Date().toISOString().split('T')[0],
    };
  }
}

