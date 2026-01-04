import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ImageService } from '../common/services/image.service';
import { compressImage } from '../common/helpers/image-compression.helper';
import { CacheService } from '../common/services/cache.service';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { CreatePeseeDto } from './dto/create-pesee.dto';
import { UpdatePeseeDto } from './dto/update-pesee.dto';

@Injectable()
export class ProductionService {
  constructor(
    private databaseService: DatabaseService,
    private cacheService: CacheService,
    private imageService: ImageService
  ) {}

  /**
   * Génère un ID comme le frontend : animal_${Date.now()}_${random}
   */
  private generateAnimalId(): string {
    return `animal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID comme le frontend : pesee_${Date.now()}_${random}
   */
  private generatePeseeId(): string {
    return `pesee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Vérifie que le projet appartient à l'utilisateur
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
if (proprietaireId !== normalizedUserId) {
throw new ForbiddenException('Ce projet ne vous appartient pas');
    }
  }

  /**
   * Vérifie que l'animal appartient au projet de l'utilisateur
   */
  private async checkAnimalOwnership(animalId: string, userId: string): Promise<void> {
    const result = await this.databaseService.query(
      `SELECT a.projet_id, p.proprietaire_id 
       FROM production_animaux a
       JOIN projets p ON a.projet_id = p.id
       WHERE a.id = $1`,
      [animalId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Animal introuvable');
    }
    if (result.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Cet animal ne vous appartient pas');
    }
  }

  /**
   * Invalide le cache pour les statistiques d'un projet
   */
  private invalidateProjetCache(projetId: string): void {
    this.cacheService.delete(`projet_stats:${projetId}`);
  }

  /**
   * Mapper une ligne de la base de données vers un objet ProductionAnimal
   */
  private mapRowToAnimal(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      code: row.code,
      nom: row.nom || undefined,
      origine: row.origine || undefined,
      sexe: row.sexe || 'indetermine',
      date_naissance: row.date_naissance || undefined,
      poids_initial: row.poids_initial ? parseFloat(row.poids_initial) : undefined,
      date_entree: row.date_entree || undefined,
      actif: row.actif === true || row.actif === 1,
      statut: row.statut || 'actif',
      race: row.race || undefined,
      reproducteur: row.reproducteur === true || row.reproducteur === 1,
      categorie_poids: row.categorie_poids || undefined,
      pere_id: row.pere_id || undefined,
      mere_id: row.mere_id || undefined,
      notes: row.notes || undefined,
      photo_uri: row.photo_uri || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
    };
  }

  /**
   * Mapper une ligne de la base de données vers un objet ProductionPesee
   */
  private mapRowToPesee(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      animal_id: row.animal_id,
      date: row.date,
      poids_kg: parseFloat(row.poids_kg),
      gmq: row.gmq ? parseFloat(row.gmq) : undefined,
      difference_standard: row.difference_standard
        ? parseFloat(row.difference_standard)
        : undefined,
      commentaire: row.commentaire || undefined,
      cree_par: row.cree_par || undefined,
      date_creation: row.date_creation,
    };
  }

  /**
   * Calcule le GMQ (Gain Moyen Quotidien) entre deux pesées
   */
  private calculateGMQFromWeights(
    poidsActuel: number,
    poidsPrecedent: number,
    jours: number
  ): number | null {
    if (jours <= 0 || poidsActuel <= poidsPrecedent) return null;
    return (poidsActuel - poidsPrecedent) / jours;
  }

  // ==================== ANIMAUX ====================

  async createAnimal(createAnimalDto: CreateAnimalDto, userId: string) {
    await this.checkProjetOwnership(createAnimalDto.projet_id, userId);

    const id = this.generateAnimalId();
    const now = new Date().toISOString();
    const sexe = createAnimalDto.sexe || 'indetermine';
    const statut = createAnimalDto.statut || 'actif';
    const actif = statut === 'actif';
    const reproducteur = createAnimalDto.reproducteur || false;

    // Compresser l'image avant stockage (Phase 3)
    const compressedPhotoUri = await compressImage(
      createAnimalDto.photo_uri,
      this.imageService,
      { maxWidth: 1920, maxHeight: 1920, quality: 80 }
    );

    const result = await this.databaseService.query(
      `INSERT INTO production_animaux (
        id, projet_id, code, nom, origine, sexe, date_naissance, poids_initial,
        date_entree, actif, statut, race, reproducteur, categorie_poids,
        pere_id, mere_id, notes, photo_uri, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        id,
        createAnimalDto.projet_id,
        createAnimalDto.code,
        createAnimalDto.nom || null,
        createAnimalDto.origine || null,
        sexe,
        createAnimalDto.date_naissance || null,
        createAnimalDto.poids_initial || null,
        createAnimalDto.date_entree || null,
        actif,
        statut,
        createAnimalDto.race || null,
        reproducteur,
        createAnimalDto.categorie_poids || null,
        createAnimalDto.pere_id || null,
        createAnimalDto.mere_id || null,
        createAnimalDto.notes || null,
        compressedPhotoUri,
        now,
        now,
      ]
    );

    const animal = this.mapRowToAnimal(result.rows[0]);
    // Invalider le cache des stats du projet
    this.invalidateProjetCache(animal.projet_id);
    return animal;
  }

  async findAllAnimals(
    projetId: string,
    userId: string,
    inclureInactifs: boolean = true,
    limit?: number,
    offset?: number
  ) {
    await this.checkProjetOwnership(projetId, userId);

    // Limite par défaut de 500 pour éviter de charger trop de données
    // La pagination est optionnelle pour compatibilité avec le frontend existant
    const defaultLimit = 500;
    const effectiveLimit = limit ? Math.min(limit, 500) : defaultLimit;
    const effectiveOffset = offset || 0;

    // Colonnes nécessaires pour mapRowToAnimal (optimisation: éviter SELECT *)
    const animalColumns = `id, projet_id, code, nom, origine, sexe, date_naissance, poids_initial, 
      date_entree, actif, statut, race, reproducteur, categorie_poids, 
      pere_id, mere_id, notes, photo_uri, date_creation, derniere_modification`;
    
    let query = `SELECT ${animalColumns} FROM production_animaux WHERE projet_id = $1`;
    const params: any[] = [projetId];

    if (!inclureInactifs) {
      query += ` AND statut = 'actif'`;
    }

    query += ` ORDER BY date_creation DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(effectiveLimit, effectiveOffset);

    const result = await this.databaseService.query(query, params);
    return result.rows.map((row) => this.mapRowToAnimal(row));
  }

  async findOneAnimal(id: string, userId: string) {
    await this.checkAnimalOwnership(id, userId);

    // Colonnes nécessaires pour mapRowToAnimal
    const animalColumns = `id, projet_id, code, nom, origine, sexe, date_naissance, poids_initial, 
      date_entree, actif, statut, race, reproducteur, categorie_poids, 
      pere_id, mere_id, notes, photo_uri, date_creation, derniere_modification`;
    
    const result = await this.databaseService.query(
      `SELECT ${animalColumns} FROM production_animaux WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? this.mapRowToAnimal(result.rows[0]) : null;
  }

  async updateAnimal(id: string, updateAnimalDto: UpdateAnimalDto, userId: string) {
    await this.checkAnimalOwnership(id, userId);

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateAnimalDto.code !== undefined) {
      fields.push(`code = $${paramIndex}`);
      values.push(updateAnimalDto.code);
      paramIndex++;
    }
    if (updateAnimalDto.nom !== undefined) {
      fields.push(`nom = $${paramIndex}`);
      values.push(updateAnimalDto.nom || null);
      paramIndex++;
    }
    if (updateAnimalDto.origine !== undefined) {
      fields.push(`origine = $${paramIndex}`);
      values.push(updateAnimalDto.origine || null);
      paramIndex++;
    }
    if (updateAnimalDto.sexe !== undefined) {
      fields.push(`sexe = $${paramIndex}`);
      values.push(updateAnimalDto.sexe);
      paramIndex++;
    }
    if (updateAnimalDto.date_naissance !== undefined) {
      fields.push(`date_naissance = $${paramIndex}`);
      values.push(updateAnimalDto.date_naissance || null);
      paramIndex++;
    }
    if (updateAnimalDto.poids_initial !== undefined) {
      fields.push(`poids_initial = $${paramIndex}`);
      values.push(updateAnimalDto.poids_initial || null);
      paramIndex++;
    }
    if (updateAnimalDto.date_entree !== undefined) {
      fields.push(`date_entree = $${paramIndex}`);
      values.push(updateAnimalDto.date_entree || null);
      paramIndex++;
    }
    if (updateAnimalDto.statut !== undefined) {
      fields.push(`statut = $${paramIndex}`);
      fields.push(`actif = $${paramIndex + 1}`);
      values.push(updateAnimalDto.statut);
      values.push(updateAnimalDto.statut === 'actif');
      paramIndex += 2;
    } else if (updateAnimalDto.actif !== undefined) {
      fields.push(`actif = $${paramIndex}`);
      values.push(updateAnimalDto.actif);
      paramIndex++;
    }
    if (updateAnimalDto.race !== undefined) {
      fields.push(`race = $${paramIndex}`);
      values.push(updateAnimalDto.race || null);
      paramIndex++;
    }
    if (updateAnimalDto.reproducteur !== undefined) {
      fields.push(`reproducteur = $${paramIndex}`);
      values.push(updateAnimalDto.reproducteur);
      paramIndex++;
    }
    if (updateAnimalDto.categorie_poids !== undefined) {
      fields.push(`categorie_poids = $${paramIndex}`);
      values.push(updateAnimalDto.categorie_poids || null);
      paramIndex++;
    }
    if (updateAnimalDto.pere_id !== undefined) {
      fields.push(`pere_id = $${paramIndex}`);
      values.push(updateAnimalDto.pere_id || null);
      paramIndex++;
    }
    if (updateAnimalDto.mere_id !== undefined) {
      fields.push(`mere_id = $${paramIndex}`);
      values.push(updateAnimalDto.mere_id || null);
      paramIndex++;
    }
    if (updateAnimalDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateAnimalDto.notes || null);
      paramIndex++;
    }
    if (updateAnimalDto.photo_uri !== undefined) {
      // Compresser l'image avant stockage (Phase 3)
      const compressedPhotoUri = await compressImage(
        updateAnimalDto.photo_uri,
        this.imageService,
        { maxWidth: 1920, maxHeight: 1920, quality: 80 }
      );
      fields.push(`photo_uri = $${paramIndex}`);
      values.push(compressedPhotoUri);
      paramIndex++;
    }

    if (fields.length === 0) {
      return this.findOneAnimal(id, userId);
    }

    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE production_animaux SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    const animal = this.mapRowToAnimal(result.rows[0]);
    // Invalider le cache des stats du projet
    this.invalidateProjetCache(animal.projet_id);
    return animal;
  }

  async deleteAnimal(id: string, userId: string) {
    // Récupérer le projet_id avant suppression pour invalider le cache
    const animal = await this.findOneAnimal(id, userId);
    const projetId = animal.projet_id;
    await this.databaseService.query('DELETE FROM production_animaux WHERE id = $1', [id]);
    // Invalider le cache des stats du projet
    this.invalidateProjetCache(projetId);
    return { id };
  }

  // ==================== PESÉES ====================

  async createPesee(createPeseeDto: CreatePeseeDto, userId: string) {
    await this.checkProjetOwnership(createPeseeDto.projet_id, userId);
    await this.checkAnimalOwnership(createPeseeDto.animal_id, userId);

    const id = this.generatePeseeId();
    const now = new Date().toISOString();

    // Colonnes nécessaires pour mapRowToPesee
    const peseeColumns = `id, projet_id, animal_id, date, poids_kg, gmq, difference_standard, 
      commentaire, cree_par, date_creation`;
    
    // Récupérer la pesée précédente pour calculer le GMQ
    const previousPeseeResult = await this.databaseService.query(
      `SELECT ${peseeColumns} FROM production_pesees 
       WHERE animal_id = $1 
       ORDER BY date DESC 
       LIMIT 1`,
      [createPeseeDto.animal_id]
    );

    let gmq: number | null = null;
    let difference_standard: number | null = null;

    if (previousPeseeResult.rows.length > 0) {
      const previousPesee = previousPeseeResult.rows[0];
      const previousDate = new Date(previousPesee.date);
      const currentDate = new Date(createPeseeDto.date);
      const jours = Math.max(
        1,
        Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      const previousPoids = parseFloat(previousPesee.poids_kg);
      const currentPoids = createPeseeDto.poids_kg;

      gmq = this.calculateGMQFromWeights(currentPoids, previousPoids, jours);
    }

    const result = await this.databaseService.query(
      `INSERT INTO production_pesees (
        id, projet_id, animal_id, date, poids_kg, gmq, difference_standard,
        commentaire, cree_par, date_creation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        createPeseeDto.projet_id,
        createPeseeDto.animal_id,
        createPeseeDto.date,
        createPeseeDto.poids_kg,
        gmq,
        difference_standard,
        createPeseeDto.commentaire || null,
        createPeseeDto.cree_par || null,
        now,
      ]
    );

    const pesee = this.mapRowToPesee(result.rows[0]);
    // Invalider le cache des stats du projet (les pesées affectent les stats)
    this.invalidateProjetCache(pesee.projet_id);
    return pesee;
  }

  async findPeseesByAnimal(animalId: string, userId: string) {
    await this.checkAnimalOwnership(animalId, userId);

    // Colonnes nécessaires pour mapRowToPesee
    const peseeColumns = `id, projet_id, animal_id, date, poids_kg, gmq, difference_standard, 
      commentaire, cree_par, date_creation`;
    
    const result = await this.databaseService.query(
      `SELECT ${peseeColumns} FROM production_pesees 
       WHERE animal_id = $1 
       ORDER BY date DESC`,
      [animalId]
    );
    return result.rows.map((row) => this.mapRowToPesee(row));
  }

  async findPeseesByProjet(projetId: string, userId: string, limit?: number) {
    await this.checkProjetOwnership(projetId, userId);

    // Colonnes nécessaires pour mapRowToPesee
    const peseeColumns = `id, projet_id, animal_id, date, poids_kg, gmq, difference_standard, 
      commentaire, cree_par, date_creation`;
    
    let query = `SELECT ${peseeColumns} FROM production_pesees WHERE projet_id = $1 ORDER BY date DESC`;
    const params: any[] = [projetId];

    if (limit) {
      query += ` LIMIT $2`;
      params.push(limit);
    }

    const result = await this.databaseService.query(query, params);
    return result.rows.map((row) => this.mapRowToPesee(row));
  }

  async findOnePesee(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT p.* FROM production_pesees p
       JOIN production_animaux a ON p.animal_id = a.id
       JOIN projets pr ON a.projet_id = pr.id
       WHERE p.id = $1 AND pr.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToPesee(result.rows[0]) : null;
  }

  async updatePesee(id: string, updatePeseeDto: UpdatePeseeDto, userId: string) {
    const pesee = await this.findOnePesee(id, userId);
    if (!pesee) {
      throw new NotFoundException('Pesée introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updatePeseeDto.date !== undefined) {
      fields.push(`date = $${paramIndex}`);
      values.push(updatePeseeDto.date);
      paramIndex++;
    }
    if (updatePeseeDto.poids_kg !== undefined) {
      fields.push(`poids_kg = $${paramIndex}`);
      values.push(updatePeseeDto.poids_kg);
      paramIndex++;
    }
    if (updatePeseeDto.commentaire !== undefined) {
      fields.push(`commentaire = $${paramIndex}`);
      values.push(updatePeseeDto.commentaire || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return pesee;
    }

    // Recalculer le GMQ si le poids ou la date change
    if (updatePeseeDto.poids_kg !== undefined || updatePeseeDto.date !== undefined) {
      const finalPoids = updatePeseeDto.poids_kg || pesee.poids_kg;
      const finalDate = updatePeseeDto.date || pesee.date;

      // Colonnes nécessaires pour mapRowToPesee
      const peseeColumns = `id, projet_id, animal_id, date, poids_kg, gmq, difference_standard, 
        commentaire, cree_par, date_creation`;
      
      const previousPeseeResult = await this.databaseService.query(
        `SELECT ${peseeColumns} FROM production_pesees 
         WHERE animal_id = $1 AND id != $2
         ORDER BY date DESC 
         LIMIT 1`,
        [pesee.animal_id, id]
      );

      if (previousPeseeResult.rows.length > 0) {
        const previousPesee = previousPeseeResult.rows[0];
        const previousDate = new Date(previousPesee.date);
        const currentDate = new Date(finalDate);
        const jours = Math.max(
          1,
          Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24))
        );
        const previousPoids = parseFloat(previousPesee.poids_kg);

        const gmq = this.calculateGMQFromWeights(finalPoids, previousPoids, jours);
        fields.push(`gmq = $${paramIndex}`);
        values.push(gmq);
        paramIndex++;
      }
    }

    values.push(id);
    const query = `UPDATE production_pesees SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    const updatedPesee = this.mapRowToPesee(result.rows[0]);
    // Invalider le cache des stats du projet (les pesées affectent les stats)
    this.invalidateProjetCache(updatedPesee.projet_id);
    return updatedPesee;
  }

  async deletePesee(id: string, userId: string) {
    const pesee = await this.findOnePesee(id, userId);
    if (!pesee) {
      throw new NotFoundException('Pesée introuvable');
    }

    await this.databaseService.query('DELETE FROM production_pesees WHERE id = $1', [id]);
    return { id, animalId: pesee.animal_id };
  }

  async calculateGMQ(animalId: string, userId: string) {
    await this.checkAnimalOwnership(animalId, userId);

    const result = await this.databaseService.query(
      `SELECT poids_kg, date 
       FROM production_pesees 
       WHERE animal_id = $1 
       ORDER BY date DESC 
       LIMIT 2`,
      [animalId]
    );

    if (result.rows.length < 2) {
      return { gmq: null };
    }

    const [latest, previous] = result.rows;
    const latestDate = new Date(latest.date);
    const previousDate = new Date(previous.date);
    const jours = Math.max(
      1,
      Math.floor((latestDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const latestPoids = parseFloat(latest.poids_kg);
    const previousPoids = parseFloat(previous.poids_kg);

    const gmq = this.calculateGMQFromWeights(latestPoids, previousPoids, jours);
    return { gmq: gmq || null };
  }

  async getAnimalEvolutionPoids(animalId: string, userId: string) {
    await this.checkAnimalOwnership(animalId, userId);

    const result = await this.databaseService.query(
      `SELECT date, poids_kg, gmq
       FROM production_pesees
       WHERE animal_id = $1
       ORDER BY date ASC`,
      [animalId]
    );

    return result.rows.map((row) => ({
      date: row.date,
      poids_kg: parseFloat(row.poids_kg),
      gmq: row.gmq ? parseFloat(row.gmq) : null,
    }));
  }

  async getAnimalPoidsActuelEstime(animalId: string, userId: string) {
    await this.checkAnimalOwnership(animalId, userId);

    // Récupérer les deux dernières pesées
    const result = await this.databaseService.query(
      `SELECT poids_kg, date, gmq
       FROM production_pesees
       WHERE animal_id = $1
       ORDER BY date DESC
       LIMIT 2`,
      [animalId]
    );

    if (result.rows.length === 0) {
      // Si aucune pesée, retourner le poids initial
      const animalResult = await this.databaseService.query(
        `SELECT poids_initial FROM production_animaux WHERE id = $1`,
        [animalId]
      );
      const poidsInitial = animalResult.rows[0]?.poids_initial || 0;
      return { poids: poidsInitial };
    }

    const latest = result.rows[0];
    const latestPoids = parseFloat(latest.poids_kg);
    const latestDate = new Date(latest.date);
    const now = new Date();
    const joursDepuisDernierePesee = Math.max(
      0,
      Math.floor((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    if (result.rows.length === 1 || !latest.gmq) {
      // Si une seule pesée ou pas de GMQ, retourner le poids de la dernière pesée
      return { poids: latestPoids };
    }

    // Estimer le poids actuel en utilisant le GMQ
    const gmq = parseFloat(latest.gmq);
    const poidsEstime = latestPoids + gmq * joursDepuisDernierePesee;

    return { poids: Math.max(latestPoids, poidsEstime) };
  }

  /**
   * Récupère les animaux actifs par nom(s) de loge(s)
   * Fonctionne pour les deux modes : individuel et batch
   */
  async getAnimauxByLoges(projetId: string, logesNames: string[], userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    // Récupérer le mode de gestion du projet
    const projetResult = await this.databaseService.query(
      'SELECT management_method FROM projets WHERE id = $1',
      [projetId]
    );
    if (projetResult.rows.length === 0) {
      throw new NotFoundException('Projet introuvable');
    }
    const managementMethod = projetResult.rows[0].management_method;

    const animaux: Array<{
      id: string;
      code?: string;
      nom?: string;
      race?: string;
      poids_kg?: number;
      date_derniere_pesee?: string;
      loge?: string;
      batch_id?: string;
      batch_name?: string;
    }> = [];

    if (managementMethod === 'batch') {
      // Mode batch : chercher les batches par pen_name, puis récupérer leurs batch_pigs
      const batchesResult = await this.databaseService.query(
        `SELECT id, pen_name, category FROM batches 
         WHERE projet_id = $1 AND pen_name = ANY($2::text[])`,
        [projetId, logesNames]
      );

      for (const batch of batchesResult.rows) {
        // Récupérer les batch_pigs de cette batch
        const pigsResult = await this.databaseService.query(
          `SELECT 
            bp.id,
            bp.current_weight_kg,
            bp.last_weighing_date,
            bp.sex,
            bp.race,
            bp.entry_date,
            b.pen_name,
            b.category
           FROM batch_pigs bp
           JOIN batches b ON bp.batch_id = b.id
           WHERE bp.batch_id = $1
             AND bp.removed = false
           ORDER BY bp.entry_date DESC`,
          [batch.id]
        );

        for (const pig of pigsResult.rows) {
          // Récupérer la dernière pesée si disponible
          const peseeResult = await this.databaseService.query(
            `SELECT poids_kg, date 
             FROM batch_weighing_details 
             WHERE pig_id = $1 
             ORDER BY date DESC 
             LIMIT 1`,
            [pig.id]
          );

          animaux.push({
            id: pig.id,
            code: pig.id, // En mode batch, l'ID sert de code
            nom: undefined,
            race: pig.race || undefined,
            poids_kg: peseeResult.rows.length > 0 
              ? parseFloat(peseeResult.rows[0].poids_kg) 
              : (pig.current_weight_kg ? parseFloat(pig.current_weight_kg) : undefined),
            date_derniere_pesee: peseeResult.rows.length > 0 
              ? peseeResult.rows[0].date 
              : (pig.last_weighing_date || undefined),
            loge: pig.pen_name,
            batch_id: batch.id,
            batch_name: pig.pen_name,
          });
        }
      }
    } else {
      // Mode individuel : chercher dans production_animaux
      // D'abord, chercher si les animaux sont liés à des batches via batch_pigs
      const batchesResult = await this.databaseService.query(
        `SELECT id, pen_name FROM batches 
         WHERE projet_id = $1 AND pen_name = ANY($2::text[])`,
        [projetId, logesNames]
      );

      const batchIds = batchesResult.rows.map((b) => b.id);
      const batchNamesMap = new Map(batchesResult.rows.map((b) => [b.id, b.pen_name]));

      if (batchIds.length > 0) {
        // Récupérer les animaux liés à ces batches via batch_pigs
        const animauxBatchResult = await this.databaseService.query(
          `SELECT DISTINCT
            a.id,
            a.code,
            a.nom,
            a.race,
            bp.batch_id,
            b.pen_name
           FROM production_animaux a
           JOIN batch_pigs bp ON a.id = bp.pig_id OR a.code = bp.id::text
           JOIN batches b ON bp.batch_id = b.id
           WHERE a.projet_id = $1
             AND a.statut = 'actif'
             AND bp.batch_id = ANY($2::text[])
             AND bp.removed = false`,
          [projetId, batchIds]
        );

        for (const animal of animauxBatchResult.rows) {
          // Récupérer la dernière pesée
          const peseeResult = await this.databaseService.query(
            `SELECT poids_kg, date 
             FROM production_pesees 
             WHERE animal_id = $1 
             ORDER BY date DESC 
             LIMIT 1`,
            [animal.id]
          );

          animaux.push({
            id: animal.id,
            code: animal.code,
            nom: animal.nom || undefined,
            race: animal.race || undefined,
            poids_kg: peseeResult.rows.length > 0 
              ? parseFloat(peseeResult.rows[0].poids_kg) 
              : undefined,
            date_derniere_pesee: peseeResult.rows.length > 0 
              ? peseeResult.rows[0].date 
              : undefined,
            loge: animal.pen_name,
            batch_id: animal.batch_id,
            batch_name: animal.pen_name,
          });
        }
      }

      // Aussi chercher directement dans production_animaux si un champ "loge" existe
      // (pour compatibilité avec les anciennes données)
      try {
        const animauxDirectResult = await this.databaseService.query(
          `SELECT 
            id,
            code,
            nom,
            race
           FROM production_animaux
           WHERE projet_id = $1
             AND statut = 'actif'
             AND (loge = ANY($2::text[]) OR pen_name = ANY($2::text[]))`,
          [projetId, logesNames]
        );

        for (const animal of animauxDirectResult.rows) {
          // Éviter les doublons
          if (animaux.find((a) => a.id === animal.id)) continue;

          // Récupérer la dernière pesée
          const peseeResult = await this.databaseService.query(
            `SELECT poids_kg, date 
             FROM production_pesees 
             WHERE animal_id = $1 
             ORDER BY date DESC 
             LIMIT 1`,
            [animal.id]
          );

          animaux.push({
            id: animal.id,
            code: animal.code,
            nom: animal.nom || undefined,
            race: animal.race || undefined,
            poids_kg: peseeResult.rows.length > 0 
              ? parseFloat(peseeResult.rows[0].poids_kg) 
              : undefined,
            date_derniere_pesee: peseeResult.rows.length > 0 
              ? peseeResult.rows[0].date 
              : undefined,
            loge: logesNames.find((l) => 
              animal.loge === l || animal.pen_name === l
            ),
          });
        }
      } catch (error) {
        // Si les colonnes loge/pen_name n'existent pas, ignorer cette partie
        // (compatibilité avec les schémas qui n'ont pas ces colonnes)
      }
    }

    return animaux;
  }

  async getProjetStats(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const cacheKey = `projet_stats:${projetId}`;
    
    // Utiliser le cache avec TTL de 2 minutes (120 secondes)
    // Les stats changent peu fréquemment, mais doivent être relativement à jour
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Statistiques des animaux
        const animauxResult = await this.databaseService.query(
          `SELECT COUNT(*) as total,
                  COUNT(*) FILTER (WHERE actif = true) as actifs,
                  COUNT(*) FILTER (WHERE actif = false) as inactifs,
                  COUNT(*) FILTER (WHERE statut = 'mort') as morts,
                  COUNT(*) FILTER (WHERE statut = 'vendu') as vendus
           FROM production_animaux
           WHERE projet_id = $1`,
          [projetId]
        );

        // Statistiques des pesées
        const peseesResult = await this.databaseService.query(
          `SELECT COUNT(*) as total_pesees,
                  AVG(poids_kg) as poids_moyen,
                  MAX(poids_kg) as poids_max,
                  MIN(poids_kg) as poids_min,
                  AVG(gmq) as gmq_moyen
           FROM production_pesees
           WHERE projet_id = $1`,
          [projetId]
        );

        const animaux = animauxResult.rows[0];
        const pesees = peseesResult.rows[0];

        return {
          animaux: {
            total: parseInt(animaux.total || '0'),
            actifs: parseInt(animaux.actifs || '0'),
            inactifs: parseInt(animaux.inactifs || '0'),
            morts: parseInt(animaux.morts || '0'),
            vendus: parseInt(animaux.vendus || '0'),
          },
          pesees: {
            total: parseInt(pesees.total_pesees || '0'),
            poids_moyen: pesees.poids_moyen ? parseFloat(pesees.poids_moyen) : 0,
            poids_max: pesees.poids_max ? parseFloat(pesees.poids_max) : 0,
            poids_min: pesees.poids_min ? parseFloat(pesees.poids_min) : 0,
            gmq_moyen: pesees.gmq_moyen ? parseFloat(pesees.gmq_moyen) : 0,
          },
        };
      },
      120 // TTL: 2 minutes
    );
  }

  /**
   * Recalcule le GMQ pour toutes les pesées suivantes après une modification
   * Cette méthode est appelée automatiquement quand une pesée est modifiée
   */
  async recalculerGMQ(animalId: string, dateModifiee: string, userId: string) {
    await this.checkAnimalOwnership(animalId, userId);

    // Colonnes nécessaires pour mapRowToPesee
    const peseeColumns = `id, projet_id, animal_id, date, poids_kg, gmq, difference_standard, 
      commentaire, cree_par, date_creation`;
    
    // Récupérer toutes les pesées après la date modifiée
    const peseesResult = await this.databaseService.query(
      `SELECT ${peseeColumns} FROM production_pesees 
       WHERE animal_id = $1 AND date > $2 
       ORDER BY date ASC`,
      [animalId, dateModifiee]
    );

    // Récupérer l'animal
    const animalResult = await this.databaseService.query(
      `SELECT poids_initial, date_entree FROM production_animaux WHERE id = $1`,
      [animalId]
    );

    if (animalResult.rows.length === 0) {
      throw new NotFoundException('Animal introuvable');
    }

    const animal = animalResult.rows[0];
    const poidsInitial = animal.poids_initial ? parseFloat(animal.poids_initial) : null;
    const dateEntree = animal.date_entree;

    // Recalculer le GMQ pour chaque pesée suivante
    for (const peseeRow of peseesResult.rows) {
      // Colonnes nécessaires pour mapRowToPesee
      const peseeColumns = `id, projet_id, animal_id, date, poids_kg, gmq, difference_standard, 
        commentaire, cree_par, date_creation`;
      
      // Trouver la pesée précédente
      const previousResult = await this.databaseService.query(
        `SELECT ${peseeColumns} FROM production_pesees 
         WHERE animal_id = $1 AND date < $2 
         ORDER BY date DESC 
         LIMIT 1`,
        [animalId, peseeRow.date]
      );

      let poidsReference = poidsInitial;
      let dateReference = dateEntree;

      if (previousResult.rows.length > 0) {
        const previous = previousResult.rows[0];
        poidsReference = parseFloat(previous.poids_kg);
        dateReference = previous.date;
      }

      let gmq: number | null = null;
      let difference_standard: number | null = null;

      if (poidsReference !== null && dateReference) {
        const datePesee = new Date(peseeRow.date);
        const dateRef = new Date(dateReference);
        const diffMs = datePesee.getTime() - dateRef.getTime();
        const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffJours > 0) {
          const poidsActuel = parseFloat(peseeRow.poids_kg);
          gmq = (poidsActuel - poidsReference) / diffJours;

          // Calculer la différence avec le standard (simplifié, à adapter selon getStandardGMQ)
          // Pour l'instant, on utilise une approximation basique
          if (gmq && poidsActuel > 0) {
            // Standard GMQ approximatif selon le poids
            let standardGMQ = 0.5; // Par défaut
            if (poidsActuel < 25) {
              standardGMQ = 0.4; // Porcelet
            } else if (poidsActuel < 60) {
              standardGMQ = 0.6; // Croissance
            } else {
              standardGMQ = 0.7; // Finition
            }
            difference_standard = gmq - standardGMQ;
          }
        }
      }

      // Mettre à jour le GMQ de cette pesée
      await this.databaseService.query(
        `UPDATE production_pesees 
         SET gmq = $1, difference_standard = $2, derniere_modification = $3
         WHERE id = $4`,
        [gmq, difference_standard, new Date().toISOString(), peseeRow.id]
      );
    }

    return { success: true, pesees_recalculees: peseesResult.rows.length };
  }
}
