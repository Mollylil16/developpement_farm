import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { GestationUtilsService } from '../common/services/gestation-utils.service';
import { CreateGestationDto } from './dto/create-gestation.dto';
import { UpdateGestationDto } from './dto/update-gestation.dto';
import { CreateSevrageDto } from './dto/create-sevrage.dto';
import { UpdateSevrageDto } from './dto/update-sevrage.dto';

@Injectable()
export class ReproductionService {
  private readonly logger = new Logger(ReproductionService.name);
  
  constructor(private databaseService: DatabaseService) {}

  /**
   * Génère un ID de gestation unifié (utilise le service partagé)
   */
  private generateGestationId(): string {
    return GestationUtilsService.generateGestationId();
  }

  /**
   * Génère un ID de sevrage
   */
  private generateSevrageId(): string {
    return `sevrage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calcule la date de mise bas prévue (utilise le service partagé)
   */
  private calculerDateMiseBasPrevue(dateSautage: string): string {
    return GestationUtilsService.calculateExpectedDeliveryDate(dateSautage);
  }

  /**
   * Vérifie que le projet appartient à l'utilisateur OU qu'il est collaborateur actif
   * avec les permissions appropriées (reproduction ou gestion_complete)
   */
  private async checkProjetOwnership(projetId: string, userId: string): Promise<void> {
    const result = await this.databaseService.query(
      'SELECT proprietaire_id FROM projets WHERE id = $1',
      [projetId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Projet introuvable');
    }
    const rawProprietaireId = result.rows[0].proprietaire_id;
    const proprietaireId = String(rawProprietaireId || '').trim();
    const normalizedUserId = String(userId || '').trim();
    
    // ✅ Si l'utilisateur est le propriétaire, OK
    if (proprietaireId === normalizedUserId) {
      return;
    }
    
    // ✅ Sinon, vérifier s'il est collaborateur actif avec permission 'reproduction'
    // ✅ Ne pas inclure 'permissions' car cette colonne peut ne pas exister
    const collabResult = await this.databaseService.query(
      `SELECT id, permission_reproduction, permission_gestion_complete FROM collaborations 
       WHERE projet_id = $1 
       AND (user_id = $2 OR profile_id LIKE $3)
       AND statut = 'actif'`,
      [projetId, normalizedUserId, `%${normalizedUserId}%`]
    );
    
    if (collabResult.rows.length > 0) {
      const collab = collabResult.rows[0];
      this.logger.debug(`[checkProjetOwnership] Collaborateur trouvé pour projet ${projetId}, userId=${normalizedUserId}. Permissions:`, {
        permission_reproduction: collab.permission_reproduction,
        permission_gestion_complete: collab.permission_gestion_complete,
      });
      
      // ✅ Vérifier les nouvelles colonnes de permissions booléennes
      if (collab.permission_reproduction === true || collab.permission_gestion_complete === true) {
        return;
      }
    }
    
    throw new ForbiddenException('Vous n\'avez pas accès à ce projet ou les permissions nécessaires');
  }

  /**
   * Vérifie que la gestation appartient au projet de l'utilisateur
   */
  private async checkGestationOwnership(gestationId: string, userId: string): Promise<void> {
    const result = await this.databaseService.query(
      `SELECT g.projet_id, p.proprietaire_id 
       FROM gestations g
       JOIN projets p ON g.projet_id = p.id
       WHERE g.id = $1`,
      [gestationId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Gestation introuvable');
    }
    if (result.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Cette gestation ne vous appartient pas');
    }
  }

  /**
   * Mapper une ligne de la base de données vers un objet Gestation
   */
  private mapRowToGestation(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      truie_id: row.truie_id,
      truie_nom: row.truie_nom || undefined,
      verrat_id: row.verrat_id || undefined,
      verrat_nom: row.verrat_nom || undefined,
      date_sautage: row.date_sautage,
      date_mise_bas_prevue: row.date_mise_bas_prevue,
      date_mise_bas_reelle: row.date_mise_bas_reelle || undefined,
      nombre_porcelets_prevu: row.nombre_porcelets_prevu,
      nombre_porcelets_reel: row.nombre_porcelets_reel || undefined,
      statut: row.statut,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
    };
  }

  /**
   * Mapper une ligne de la base de données vers un objet Sevrage
   */
  private mapRowToSevrage(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      gestation_id: row.gestation_id,
      date_sevrage: row.date_sevrage,
      nombre_porcelets_sevres: row.nombre_porcelets_sevres,
      poids_moyen_sevrage: row.poids_moyen_sevrage
        ? parseFloat(row.poids_moyen_sevrage)
        : undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
    };
  }

  // ==================== GESTATIONS ====================

  async createGestation(createGestationDto: CreateGestationDto, userId: string) {
    await this.checkProjetOwnership(createGestationDto.projet_id, userId);

    // Vérifier que la truie existe dans production_animaux
    const truieResult = await this.databaseService.query(
      `SELECT id, nom, sexe, statut, reproducteur, projet_id 
       FROM production_animaux 
       WHERE id = $1 AND projet_id = $2`,
      [createGestationDto.truie_id, createGestationDto.projet_id]
    );

    if (truieResult.rows.length === 0) {
      throw new NotFoundException(
        `Truie introuvable avec l'ID "${createGestationDto.truie_id}" dans ce projet. ` +
        `Veuillez vérifier que la truie existe et appartient au projet.`
      );
    }

    const truie = truieResult.rows[0];

    // Vérifier que c'est bien une femelle
    if (truie.sexe !== 'femelle') {
      throw new BadRequestException(
        `L'animal sélectionné (${truie.nom || truie.id}) n'est pas une femelle. ` +
        `Seules les truies (femelles) peuvent être utilisées pour une gestation.`
      );
    }

    // Vérifier que la truie est active
    if (truie.statut !== 'actif') {
      throw new BadRequestException(
        `La truie sélectionnée (${truie.nom || truie.id}) n'est pas active. ` +
        `Statut actuel: ${truie.statut}. Seules les truies actives peuvent être utilisées.`
      );
    }

    // Vérifier que c'est bien un reproducteur
    if (!truie.reproducteur) {
      throw new BadRequestException(
        `La truie sélectionnée (${truie.nom || truie.id}) n'est pas marquée comme reproductrice. ` +
        `Veuillez marquer la truie comme reproductrice dans le module Production.`
      );
    }

    // Vérifier le verrat si fourni
    let verratNom = createGestationDto.verrat_nom || null;
    if (createGestationDto.verrat_id) {
      const verratResult = await this.databaseService.query(
        `SELECT id, nom, sexe, statut, reproducteur, projet_id 
         FROM production_animaux 
         WHERE id = $1 AND projet_id = $2`,
        [createGestationDto.verrat_id, createGestationDto.projet_id]
      );

      if (verratResult.rows.length === 0) {
        throw new NotFoundException(
          `Verrat introuvable avec l'ID "${createGestationDto.verrat_id}" dans ce projet. ` +
          `Veuillez vérifier que le verrat existe et appartient au projet.`
        );
      }

      const verrat = verratResult.rows[0];

      // Vérifier que c'est bien un mâle
      if (verrat.sexe !== 'male') {
        throw new BadRequestException(
          `L'animal sélectionné comme verrat (${verrat.nom || verrat.id}) n'est pas un mâle. ` +
          `Seuls les verrats (mâles) peuvent être utilisés pour une gestation.`
        );
      }

      // Vérifier que le verrat est actif
      if (verrat.statut !== 'actif') {
        throw new BadRequestException(
          `Le verrat sélectionné (${verrat.nom || verrat.id}) n'est pas actif. ` +
          `Statut actuel: ${verrat.statut}. Seuls les verrats actifs peuvent être utilisés.`
        );
      }

      // Vérifier que c'est bien un reproducteur
      if (!verrat.reproducteur) {
        throw new BadRequestException(
          `Le verrat sélectionné (${verrat.nom || verrat.id}) n'est pas marqué comme reproducteur. ` +
          `Veuillez marquer le verrat comme reproducteur dans le module Production.`
        );
      }

      // Utiliser le nom du verrat depuis la DB si non fourni
      if (!verratNom && verrat.nom) {
        verratNom = verrat.nom;
      }
    }

    // Utiliser le nom de la truie depuis la DB si non fourni
    const truieNom = createGestationDto.truie_nom || truie.nom || null;

    const id = this.generateGestationId();
    const now = new Date().toISOString();
    const dateMiseBasPrevue = this.calculerDateMiseBasPrevue(createGestationDto.date_sautage);
    const statut = 'en_cours';

    const result = await this.databaseService.query(
      `INSERT INTO gestations (
        id, projet_id, truie_id, truie_nom, verrat_id, verrat_nom,
        date_sautage, date_mise_bas_prevue, nombre_porcelets_prevu,
        statut, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        id,
        createGestationDto.projet_id,
        createGestationDto.truie_id,
        truieNom,
        createGestationDto.verrat_id || null,
        verratNom,
        createGestationDto.date_sautage,
        dateMiseBasPrevue,
        createGestationDto.nombre_porcelets_prevu,
        statut,
        createGestationDto.notes || null,
        now,
        now,
      ]
    );

    return this.mapRowToGestation(result.rows[0]);
  }

  async findAllGestations(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM gestations 
       WHERE projet_id = $1 
       ORDER BY date_sautage DESC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToGestation(row));
  }

  async findGestationsEnCours(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM gestations 
       WHERE projet_id = $1 AND statut = 'en_cours'
       ORDER BY date_mise_bas_prevue ASC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToGestation(row));
  }

  async findOneGestation(id: string, userId: string) {
    await this.checkGestationOwnership(id, userId);

    const result = await this.databaseService.query('SELECT * FROM gestations WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRowToGestation(result.rows[0]) : null;
  }

  async updateGestation(id: string, updateGestationDto: UpdateGestationDto, userId: string) {
    await this.checkGestationOwnership(id, userId);

    // Récupérer la gestation existante pour obtenir le projet_id
    const existingGestation = await this.findOneGestation(id, userId);
    if (!existingGestation) {
      throw new NotFoundException('Gestation introuvable');
    }

    const projetId = existingGestation.projet_id;

    // Valider la truie si elle est modifiée
    let truieNom = updateGestationDto.truie_nom;
    if (updateGestationDto.truie_id !== undefined) {
      const truieResult = await this.databaseService.query(
        `SELECT id, nom, sexe, statut, reproducteur, projet_id 
         FROM production_animaux 
         WHERE id = $1 AND projet_id = $2`,
        [updateGestationDto.truie_id, projetId]
      );

      if (truieResult.rows.length === 0) {
        throw new NotFoundException(
          `Truie introuvable avec l'ID "${updateGestationDto.truie_id}" dans ce projet. ` +
          `Veuillez vérifier que la truie existe et appartient au projet.`
        );
      }

      const truie = truieResult.rows[0];

      // Vérifier que c'est bien une femelle
      if (truie.sexe !== 'femelle') {
        throw new BadRequestException(
          `L'animal sélectionné (${truie.nom || truie.id}) n'est pas une femelle. ` +
          `Seules les truies (femelles) peuvent être utilisées pour une gestation.`
        );
      }

      // Vérifier que la truie est active
      if (truie.statut !== 'actif') {
        throw new BadRequestException(
          `La truie sélectionnée (${truie.nom || truie.id}) n'est pas active. ` +
          `Statut actuel: ${truie.statut}. Seules les truies actives peuvent être utilisées.`
        );
      }

      // Vérifier que c'est bien un reproducteur
      if (!truie.reproducteur) {
        throw new BadRequestException(
          `La truie sélectionnée (${truie.nom || truie.id}) n'est pas marquée comme reproductrice. ` +
          `Veuillez marquer la truie comme reproductrice dans le module Production.`
        );
      }

      // Utiliser le nom de la truie depuis la DB si non fourni
      if (!truieNom && truie.nom) {
        truieNom = truie.nom;
      }
    }

    // Valider le verrat s'il est modifié
    let verratNom = updateGestationDto.verrat_nom;
    if (updateGestationDto.verrat_id !== undefined && updateGestationDto.verrat_id !== null) {
      const verratResult = await this.databaseService.query(
        `SELECT id, nom, sexe, statut, reproducteur, projet_id 
         FROM production_animaux 
         WHERE id = $1 AND projet_id = $2`,
        [updateGestationDto.verrat_id, projetId]
      );

      if (verratResult.rows.length === 0) {
        throw new NotFoundException(
          `Verrat introuvable avec l'ID "${updateGestationDto.verrat_id}" dans ce projet. ` +
          `Veuillez vérifier que le verrat existe et appartient au projet.`
        );
      }

      const verrat = verratResult.rows[0];

      // Vérifier que c'est bien un mâle
      if (verrat.sexe !== 'male') {
        throw new BadRequestException(
          `L'animal sélectionné comme verrat (${verrat.nom || verrat.id}) n'est pas un mâle. ` +
          `Seuls les verrats (mâles) peuvent être utilisés pour une gestation.`
        );
      }

      // Vérifier que le verrat est actif
      if (verrat.statut !== 'actif') {
        throw new BadRequestException(
          `Le verrat sélectionné (${verrat.nom || verrat.id}) n'est pas actif. ` +
          `Statut actuel: ${verrat.statut}. Seuls les verrats actifs peuvent être utilisés.`
        );
      }

      // Vérifier que c'est bien un reproducteur
      if (!verrat.reproducteur) {
        throw new BadRequestException(
          `Le verrat sélectionné (${verrat.nom || verrat.id}) n'est pas marqué comme reproducteur. ` +
          `Veuillez marquer le verrat comme reproducteur dans le module Production.`
        );
      }

      // Utiliser le nom du verrat depuis la DB si non fourni
      if (!verratNom && verrat.nom) {
        verratNom = verrat.nom;
      }
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateGestationDto.truie_id !== undefined) {
      fields.push(`truie_id = $${paramIndex}`);
      values.push(updateGestationDto.truie_id);
      paramIndex++;
    }
    if (truieNom !== undefined) {
      fields.push(`truie_nom = $${paramIndex}`);
      values.push(truieNom || null);
      paramIndex++;
    }
    if (updateGestationDto.verrat_id !== undefined) {
      fields.push(`verrat_id = $${paramIndex}`);
      values.push(updateGestationDto.verrat_id || null);
      paramIndex++;
    }
    // Note: verratNom est soit validé depuis la DB (si verrat_id fourni), soit depuis le DTO
    if (verratNom !== undefined) {
      fields.push(`verrat_nom = $${paramIndex}`);
      values.push(verratNom || null);
      paramIndex++;
    } else if (updateGestationDto.verrat_nom !== undefined && updateGestationDto.verrat_id === undefined) {
      // Mise à jour du nom seul (sans changer le verrat_id)
      fields.push(`verrat_nom = $${paramIndex}`);
      values.push(updateGestationDto.verrat_nom || null);
      paramIndex++;
    }
    if (updateGestationDto.date_sautage !== undefined) {
      fields.push(`date_sautage = $${paramIndex}`);
      values.push(updateGestationDto.date_sautage);
      paramIndex++;
      // Recalculer la date de mise bas prévue si la date de sautage change
      if (updateGestationDto.date_mise_bas_prevue === undefined) {
        const dateMiseBasPrevue = this.calculerDateMiseBasPrevue(updateGestationDto.date_sautage);
        fields.push(`date_mise_bas_prevue = $${paramIndex}`);
        values.push(dateMiseBasPrevue);
        paramIndex++;
      }
    }
    if (updateGestationDto.date_mise_bas_prevue !== undefined) {
      fields.push(`date_mise_bas_prevue = $${paramIndex}`);
      values.push(updateGestationDto.date_mise_bas_prevue);
      paramIndex++;
    }
    if (updateGestationDto.date_mise_bas_reelle !== undefined) {
      fields.push(`date_mise_bas_reelle = $${paramIndex}`);
      values.push(updateGestationDto.date_mise_bas_reelle || null);
      paramIndex++;
    }
    if (updateGestationDto.nombre_porcelets_prevu !== undefined) {
      fields.push(`nombre_porcelets_prevu = $${paramIndex}`);
      values.push(updateGestationDto.nombre_porcelets_prevu);
      paramIndex++;
    }
    if (updateGestationDto.nombre_porcelets_reel !== undefined) {
      fields.push(`nombre_porcelets_reel = $${paramIndex}`);
      values.push(updateGestationDto.nombre_porcelets_reel || null);
      paramIndex++;
    }
    if (updateGestationDto.statut !== undefined) {
      fields.push(`statut = $${paramIndex}`);
      values.push(updateGestationDto.statut);
      paramIndex++;
    }
    if (updateGestationDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateGestationDto.notes || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return this.findOneGestation(id, userId);
    }

    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE gestations SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToGestation(result.rows[0]);
  }

  async deleteGestation(id: string, userId: string) {
    await this.checkGestationOwnership(id, userId);
    await this.databaseService.query('DELETE FROM gestations WHERE id = $1', [id]);
    return { id };
  }

  // ==================== SEVRAGES ====================

  async createSevrage(createSevrageDto: CreateSevrageDto, userId: string) {
    // Vérifier que la gestation existe et appartient à l'utilisateur
    const gestation = await this.findOneGestation(createSevrageDto.gestation_id, userId);
    if (!gestation) {
      throw new NotFoundException('Gestation introuvable');
    }

    const id = this.generateSevrageId();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO sevrages (
        id, projet_id, gestation_id, date_sevrage, nombre_porcelets_sevres,
        poids_moyen_sevrage, notes, date_creation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id,
        gestation.projet_id,
        createSevrageDto.gestation_id,
        createSevrageDto.date_sevrage,
        createSevrageDto.nombre_porcelets_sevres,
        createSevrageDto.poids_moyen_sevrage || null,
        createSevrageDto.notes || null,
        now,
      ]
    );

    return this.mapRowToSevrage(result.rows[0]);
  }

  async findAllSevrages(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM sevrages 
       WHERE projet_id = $1 
       ORDER BY date_sevrage DESC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToSevrage(row));
  }

  async findSevrageByGestation(gestationId: string, userId: string) {
    await this.checkGestationOwnership(gestationId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM sevrages 
       WHERE gestation_id = $1 
       ORDER BY date_sevrage DESC 
       LIMIT 1`,
      [gestationId]
    );
    return result.rows[0] ? this.mapRowToSevrage(result.rows[0]) : null;
  }

  async findOneSevrage(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT s.* FROM sevrages s
       JOIN gestations g ON s.gestation_id = g.id
       JOIN projets p ON g.projet_id = p.id
       WHERE s.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToSevrage(result.rows[0]) : null;
  }

  async updateSevrage(id: string, updateSevrageDto: UpdateSevrageDto, userId: string) {
    const sevrage = await this.findOneSevrage(id, userId);
    if (!sevrage) {
      throw new NotFoundException('Sevrage introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateSevrageDto.date_sevrage !== undefined) {
      fields.push(`date_sevrage = $${paramIndex}`);
      values.push(updateSevrageDto.date_sevrage);
      paramIndex++;
    }
    if (updateSevrageDto.nombre_porcelets_sevres !== undefined) {
      fields.push(`nombre_porcelets_sevres = $${paramIndex}`);
      values.push(updateSevrageDto.nombre_porcelets_sevres);
      paramIndex++;
    }
    if (updateSevrageDto.poids_moyen_sevrage !== undefined) {
      fields.push(`poids_moyen_sevrage = $${paramIndex}`);
      values.push(updateSevrageDto.poids_moyen_sevrage || null);
      paramIndex++;
    }
    if (updateSevrageDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateSevrageDto.notes || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return sevrage;
    }

    values.push(id);
    const query = `UPDATE sevrages SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToSevrage(result.rows[0]);
  }

  async deleteSevrage(id: string, userId: string) {
    const sevrage = await this.findOneSevrage(id, userId);
    if (!sevrage) {
      throw new NotFoundException('Sevrage introuvable');
    }

    await this.databaseService.query('DELETE FROM sevrages WHERE id = $1', [id]);
    return { id, gestationId: sevrage.gestation_id };
  }

  // ==================== STATISTIQUES ====================

  async getStatistiquesGestations(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM gestations WHERE projet_id = $1`,
      [projetId]
    );

    const gestations = result.rows.map((row) => this.mapRowToGestation(row));

    const total = gestations.length;
    const enCours = gestations.filter((g) => g.statut === 'en_cours').length;
    const terminees = gestations.filter((g) => g.statut === 'terminee').length;
    const annulees = gestations.filter((g) => g.statut === 'annulee').length;

    const porceletsPrevuTotal = gestations.reduce(
      (sum, g) => sum + (g.nombre_porcelets_prevu || 0),
      0
    );
    const porceletsReelTotal = gestations
      .filter((g) => g.nombre_porcelets_reel)
      .reduce((sum, g) => sum + (g.nombre_porcelets_reel || 0), 0);

    return {
      total,
      en_cours: enCours,
      terminees,
      annulees,
      porcelets_prevu_total: porceletsPrevuTotal,
      porcelets_reel_total: porceletsReelTotal,
      taux_reussite: terminees > 0 ? (terminees / total) * 100 : 0,
    };
  }

  async getStatistiquesSevrages(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(`SELECT * FROM sevrages WHERE projet_id = $1`, [
      projetId,
    ]);

    const sevrages = result.rows.map((row) => this.mapRowToSevrage(row));

    const total = sevrages.length;
    const porceletsSevresTotal = sevrages.reduce(
      (sum, s) => sum + (s.nombre_porcelets_sevres || 0),
      0
    );
    const poidsMoyenSevrage =
      sevrages.filter((s) => s.poids_moyen_sevrage).length > 0
        ? sevrages
            .filter((s) => s.poids_moyen_sevrage)
            .reduce((sum, s) => sum + (s.poids_moyen_sevrage || 0), 0) /
          sevrages.filter((s) => s.poids_moyen_sevrage).length
        : 0;

    return {
      total,
      porcelets_sevres_total: porceletsSevresTotal,
      poids_moyen_sevrage: poidsMoyenSevrage,
    };
  }

  async getTauxSurvie(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    // Récupérer toutes les gestations terminées avec leurs sevrages
    const gestationsResult = await this.databaseService.query(
      `SELECT g.id, g.nombre_porcelets_prevu, g.nombre_porcelets_reel
       FROM gestations g
       WHERE g.projet_id = $1 AND g.statut = 'terminee' AND g.nombre_porcelets_reel IS NOT NULL`,
      [projetId]
    );

    const sevragesResult = await this.databaseService.query(
      `SELECT s.gestation_id, s.nombre_porcelets_sevres
       FROM sevrages s
       JOIN gestations g ON s.gestation_id = g.id
       WHERE g.projet_id = $1`,
      [projetId]
    );

    const sevragesParGestation: { [key: string]: number } = {};
    sevragesResult.rows.forEach((row) => {
      sevragesParGestation[row.gestation_id] =
        (sevragesParGestation[row.gestation_id] || 0) + row.nombre_porcelets_sevres;
    });

    let totalPorceletsNes = 0;
    let totalPorceletsSevres = 0;

    gestationsResult.rows.forEach((gestation) => {
      const porceletsNes = gestation.nombre_porcelets_reel || 0;
      const porceletsSevres = sevragesParGestation[gestation.id] || 0;

      totalPorceletsNes += porceletsNes;
      totalPorceletsSevres += porceletsSevres;
    });

    const tauxSurvie = totalPorceletsNes > 0 ? (totalPorceletsSevres / totalPorceletsNes) * 100 : 0;

    return {
      porcelets_nes_total: totalPorceletsNes,
      porcelets_sevres_total: totalPorceletsSevres,
      taux_survie: tauxSurvie,
    };
  }
}
