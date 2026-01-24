import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ImageService } from '../common/services/image.service';
import { compressImage } from '../common/helpers/image-compression.helper';
import { CacheService } from '../common/services/cache.service';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { CreatePeseeDto } from './dto/create-pesee.dto';
import { UpdatePeseeDto } from './dto/update-pesee.dto';
import { PeseesStatsDto } from './dto/pesees-stats.dto';
import { PeseesEvolutionDto } from './dto/pesees-evolution.dto';

@Injectable()
export class ProductionService {
  private readonly logger = new Logger(ProductionService.name);
  
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
   * Vérifie que le projet appartient à l'utilisateur OU qu'il est collaborateur actif
   * avec les permissions appropriées (cheptel ou gestion_complete)
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
    
    // ✅ Sinon, vérifier s'il est collaborateur actif avec permission 'cheptel'
    // ✅ Ne pas inclure 'permissions' car cette colonne peut ne pas exister
    const collabResult = await this.databaseService.query(
      `SELECT id, permission_cheptel, permission_gestion_complete FROM collaborations 
       WHERE projet_id = $1 
       AND (user_id = $2 OR profile_id LIKE $3)
       AND statut = 'actif'`,
      [projetId, normalizedUserId, `%${normalizedUserId}%`]
    );
    
    if (collabResult.rows.length > 0) {
      const collab = collabResult.rows[0];
      this.logger.debug(`[checkProjetOwnership] Collaborateur trouvé pour projet ${projetId}, userId=${normalizedUserId}. Permissions:`, {
        permission_cheptel: collab.permission_cheptel,
        permission_gestion_complete: collab.permission_gestion_complete,
      });
      
      // ✅ Vérifier les nouvelles colonnes de permissions booléennes
      if (collab.permission_cheptel === true || collab.permission_gestion_complete === true) {
        return;
      }
    }
    
    throw new ForbiddenException('Vous n\'avez pas accès à ce projet ou les permissions nécessaires');
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
    offset?: number,
    code?: string,
    poidsMin?: number,
    poidsMax?: number
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

    // Filtrage par code (recherche exacte ou partielle, insensible à la casse)
    if (code) {
      params.push(`%${code}%`);
      query += ` AND code ILIKE $${params.length}`;
    }

    // Filtrage par plage de poids (basé sur poids_initial)
    if (poidsMin !== undefined) {
      params.push(poidsMin);
      query += ` AND poids_initial >= $${params.length}`;
    }
    if (poidsMax !== undefined) {
      params.push(poidsMax);
      query += ` AND poids_initial <= $${params.length}`;
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

  async getAnimalEvolutionPoids(animalId: string, userId: string, periodeJours: number = 7) {
    await this.checkAnimalOwnership(animalId, userId);

    // Récupérer toutes les pesées de l'animal
    const result = await this.databaseService.query(
      `SELECT date, poids_kg, gmq
       FROM production_pesees
       WHERE animal_id = $1
       ORDER BY date ASC`,
      [animalId]
    );

    if (result.rows.length === 0) {
      return {
        poidsGagne: 0,
        pourcentageEvolution: 0,
        evolutions: [],
      };
    }

    // Filtrer les pesées dans la période
    const maintenant = new Date();
    const dateLimite = new Date(maintenant.getTime() - periodeJours * 24 * 60 * 60 * 1000);
    
    const peseesPeriode = result.rows.filter(
      (row) => new Date(row.date).getTime() >= dateLimite.getTime()
    );

    if (peseesPeriode.length < 2) {
      // Pas assez de pesées pour calculer une évolution
      return {
        poidsGagne: 0,
        pourcentageEvolution: 0,
        evolutions: result.rows.map((row) => ({
          date: row.date,
          poids_kg: parseFloat(row.poids_kg),
        })),
      };
    }

    const poidsInitial = parseFloat(peseesPeriode[0].poids_kg);
    const poidsFinal = parseFloat(peseesPeriode[peseesPeriode.length - 1].poids_kg);
    const poidsGagne = poidsFinal - poidsInitial;
    const pourcentageEvolution = poidsInitial > 0 ? (poidsGagne / poidsInitial) * 100 : 0;

    return {
      poidsGagne,
      pourcentageEvolution,
      evolutions: result.rows.map((row) => ({
        date: row.date,
        poids_kg: parseFloat(row.poids_kg),
      })),
    };
  }

  async getAnimalPoidsActuelEstime(animalId: string, userId: string) {
    await this.checkAnimalOwnership(animalId, userId);

    // Récupérer l'animal pour obtenir le poids initial et la catégorie
    const animalResult = await this.databaseService.query(
      `SELECT poids_initial, categorie_poids FROM production_animaux WHERE id = $1`,
      [animalId]
    );
    const animal = animalResult.rows[0];

    // Récupérer toutes les pesées triées par date décroissante
    const result = await this.databaseService.query(
      `SELECT poids_kg, date, gmq
       FROM production_pesees
       WHERE animal_id = $1
       ORDER BY date DESC`,
      [animalId]
    );

    if (result.rows.length === 0) {
      // Si aucune pesée, retourner le poids initial
      const poidsInitial = animal?.poids_initial || 0;
      return {
        poidsEstime: poidsInitial,
        dateDernierePesee: null,
        source: 'initial',
      };
    }

    const latest = result.rows[0];
    const latestPoids = parseFloat(latest.poids_kg);
    const latestDate = new Date(latest.date);
    const now = new Date();
    const joursDepuisDernierePesee = Math.max(
      0,
      Math.floor((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Si la dernière pesée date de moins de 3 jours, utiliser directement le poids
    if (joursDepuisDernierePesee < 3) {
      return {
        poidsEstime: latestPoids,
        dateDernierePesee: latest.date,
        source: 'pesee',
      };
    }

    // Calculer le GMQ si non disponible
    let gmq = latest.gmq ? parseFloat(latest.gmq) : null;
    
    if (!gmq && result.rows.length >= 2) {
      // Calculer le GMQ à partir des deux dernières pesées
      const premierePesee = result.rows[result.rows.length - 1];
      const differencePoids = latestPoids - parseFloat(premierePesee.poids_kg);
      const differenceJours =
        (latestDate.getTime() - new Date(premierePesee.date).getTime()) /
        (1000 * 60 * 60 * 24);

      if (differenceJours > 0) {
        gmq = differencePoids / differenceJours;
      }
    }

    // Utiliser des valeurs moyennes par catégorie si pas de GMQ
    if (!gmq || gmq <= 0) {
      const categorie = animal?.categorie_poids;
      // Valeurs moyennes de GMQ par catégorie (kg/jour)
      if (categorie === 'porcelet') {
        gmq = 0.3;
      } else if (categorie === 'croissance') {
        gmq = 0.6;
      } else {
        gmq = 0.4; // Finition ou défaut
      }
    }

    // Estimer le poids en ajoutant le GMQ multiplié par le nombre de jours
    const poidsEstime = latestPoids + gmq * joursDepuisDernierePesee;

    return {
      poidsEstime: Math.max(poidsEstime, latestPoids), // Ne pas estimer moins que la dernière pesée
      dateDernierePesee: latest.date,
      source: 'estimation',
    };
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

  // ==================== STATISTIQUES ET ÉVOLUTION UNIFIÉES ====================

  /**
   * Calcule les statistiques globales des pesées pour un projet (mode individuel ou bande)
   */
  async getPeseesStats(
    projetId: string,
    mode: 'individuel' | 'bande',
    periode: '7j' | '30j' | '90j' | 'tout',
    userId: string
  ) {
    await this.checkProjetOwnership(projetId, userId);

    const now = new Date();
    let dateDebut: Date;

    switch (periode) {
      case '7j':
        dateDebut = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30j':
        dateDebut = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90j':
        dateDebut = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'tout':
        dateDebut = new Date(0); // Date très ancienne
        break;
    }

    if (mode === 'individuel') {
      // Mode individuel : Statistiques depuis production_pesees
      const result = await this.databaseService.query(
        `SELECT 
          COUNT(DISTINCT pp.id) as total_pesees,
          COUNT(DISTINCT pp.animal_id) as total_animaux,
          AVG(pp.poids_kg)::numeric(10,2) as poids_moyen,
          MAX(pp.date) as derniere_pesee_date
        FROM production_pesees pp
        JOIN production_animaux pa ON pp.animal_id = pa.id
        WHERE pa.projet_id = $1 
          AND pp.date >= $2
          AND pa.actif = true`,
        [projetId, dateDebut.toISOString()]
      );

      const stats = result.rows[0];
      const poidsMoyen = parseFloat(stats.poids_moyen || '0');

      // Calculer GMQ moyen
      const gmqResult = await this.databaseService.query(
        `SELECT AVG(pp.gmq)::numeric(10,2) as gmq_moyen
        FROM production_pesees pp
        JOIN production_animaux pa ON pp.animal_id = pa.id
        WHERE pa.projet_id = $1 
          AND pp.date >= $2
          AND pa.actif = true
          AND pp.gmq IS NOT NULL`,
        [projetId, dateDebut.toISOString()]
      );
      const gmqMoyen = parseFloat(gmqResult.rows[0]?.gmq_moyen || '0') * 1000; // Convertir en g/j

      // Compter les animaux en retard (dernière pesée > 7 jours)
      const retardResult = await this.databaseService.query(
        `SELECT COUNT(DISTINCT pa.id) as nb_en_retard
        FROM production_animaux pa
        LEFT JOIN LATERAL (
          SELECT date 
          FROM production_pesees 
          WHERE animal_id = pa.id 
          ORDER BY date DESC 
          LIMIT 1
        ) derniere_pesee ON true
        WHERE pa.projet_id = $1 
          AND pa.actif = true
          AND (derniere_pesee.date IS NULL OR derniere_pesee.date < $2)`,
        [projetId, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()]
      );
      const nbEnRetard = parseInt(retardResult.rows[0]?.nb_en_retard || '0');

      // Objectifs atteints (pour l'instant, retourner 0 car pas implémenté)
      const objectifsAtteints = 0;

      return {
        poids_moyen: poidsMoyen,
        gmq_moyen: Math.round(gmqMoyen),
        derniere_pesee_date: stats.derniere_pesee_date || null,
        nb_en_retard: nbEnRetard,
        objectifs_atteints: objectifsAtteints,
        total_animaux: parseInt(stats.total_animaux || '0'),
      };
    } else {
      // Mode bande : Statistiques depuis batch_weighings
      const result = await this.databaseService.query(
        `SELECT 
          COUNT(DISTINCT bw.id) as total_pesees,
          COUNT(DISTINCT b.id) as total_loges,
          SUM(b.total_count) as total_animaux,
          AVG(bw.average_weight_kg)::numeric(10,2) as poids_moyen,
          MAX(bw.weighing_date) as derniere_pesee_date
        FROM batch_weighings bw
        JOIN batches b ON bw.batch_id = b.id
        WHERE b.projet_id = $1 
          AND bw.weighing_date >= $2`,
        [projetId, dateDebut.toISOString()]
      );

      const stats = result.rows[0];
      const poidsMoyen = parseFloat(stats.poids_moyen || '0');

      // Calculer GMQ moyen (moyenne des GMQ calculés par batch)
      const gmqResult = await this.databaseService.query(
        `SELECT AVG(gmq)::numeric(10,2) as gmq_moyen
        FROM (
          SELECT 
            b.id as batch_id,
            (MAX(bw.average_weight_kg) - MIN(bw.average_weight_kg)) / 
            NULLIF(EXTRACT(EPOCH FROM (MAX(bw.weighing_date) - MIN(bw.weighing_date))) / 86400, 0) * 1000 as gmq
          FROM batch_weighings bw
          JOIN batches b ON bw.batch_id = b.id
          WHERE b.projet_id = $1 
            AND bw.weighing_date >= $2
          GROUP BY b.id
          HAVING COUNT(bw.id) >= 2
        ) batch_gmq`,
        [projetId, dateDebut.toISOString()]
      );
      const gmqMoyen = parseFloat(gmqResult.rows[0]?.gmq_moyen || '0');

      // Compter les batches en retard (dernière pesée > 7 jours ou pas de pesée)
      const dateLimiteRetard = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const retardResult = await this.databaseService.query(
        `SELECT COUNT(DISTINCT b.id) as nb_en_retard
        FROM batches b
        LEFT JOIN LATERAL (
          SELECT weighing_date 
          FROM batch_weighings 
          WHERE batch_id = b.id 
          ORDER BY weighing_date DESC 
          LIMIT 1
        ) derniere_pesee ON true
        WHERE b.projet_id = $1 
          AND (derniere_pesee.weighing_date IS NULL OR derniere_pesee.weighing_date < $2)`,
        [projetId, dateLimiteRetard.toISOString()]
      );
      const nbEnRetard = parseInt(retardResult.rows[0]?.nb_en_retard || '0');

      // Objectifs atteints (pour l'instant, retourner 0)
      const objectifsAtteints = 0;

      return {
        poids_moyen: poidsMoyen,
        gmq_moyen: Math.round(gmqMoyen),
        derniere_pesee_date: stats.derniere_pesee_date || null,
        nb_en_retard: nbEnRetard,
        objectifs_atteints: objectifsAtteints,
        total_animaux: parseInt(stats.total_animaux || '0'),
      };
    }
  }

  /**
   * Récupère l'évolution du poids pour un projet (mode individuel ou bande)
   */
  async getPeseesEvolution(
    projetId: string,
    mode: 'individuel' | 'bande',
    periode: '7j' | '30j' | '90j' | 'tout',
    sujetIds: string[] | undefined,
    userId: string
  ) {
    await this.checkProjetOwnership(projetId, userId);

    const now = new Date();
    let dateDebut: Date;

    switch (periode) {
      case '7j':
        dateDebut = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30j':
        dateDebut = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90j':
        dateDebut = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'tout':
        dateDebut = new Date(0);
        break;
    }

    if (mode === 'individuel') {
      // Mode individuel
      let query = `
        SELECT 
          pp.date,
          pp.poids_kg,
          pp.animal_id,
          pa.code as animal_code
        FROM production_pesees pp
        JOIN production_animaux pa ON pp.animal_id = pa.id
        WHERE pa.projet_id = $1 
          AND pp.date >= $2
          AND pa.actif = true
      `;
      const params: any[] = [projetId, dateDebut.toISOString()];

      if (sujetIds && sujetIds.length > 0) {
        query += ` AND pp.animal_id = ANY($${params.length + 1})`;
        params.push(sujetIds);
      }

      query += ` ORDER BY pp.date ASC`;

      const result = await this.databaseService.query(query, params);

      // Grouper par date et calculer poids moyen
      const byDate = new Map<string, { poids: number[]; count: number }>();
      const byAnimal = new Map<string, { nom: string; poids: number[]; dates: string[] }>();

      result.rows.forEach((row: any) => {
        const dateKey = new Date(row.date).toISOString().split('T')[0];
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, { poids: [], count: 0 });
        }
        const dateData = byDate.get(dateKey)!;
        dateData.poids.push(parseFloat(row.poids_kg));
        dateData.count++;

        // Par animal
        if (!byAnimal.has(row.animal_id)) {
          byAnimal.set(row.animal_id, {
            nom: row.animal_code || row.animal_id.slice(-4),
            poids: [],
            dates: [],
          });
        }
        const animalData = byAnimal.get(row.animal_id)!;
        animalData.dates.push(dateKey);
        animalData.poids.push(parseFloat(row.poids_kg));
      });

      const dates = Array.from(byDate.keys()).sort();
      const poidsMoyens = dates.map((date) => {
        const data = byDate.get(date)!;
        return data.poids.reduce((a, b) => a + b, 0) / data.poids.length;
      });

      // Calculer métriques globales
      const firstPoids = poidsMoyens[0] || 0;
      const lastPoids = poidsMoyens[poidsMoyens.length - 1] || 0;
      const gainTotal = lastPoids - firstPoids;
      const joursTotal = dates.length > 1
        ? Math.floor((new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const gmq = joursTotal > 0 ? (gainTotal / joursTotal) * 1000 : 0;

      // Par sujet (si sujetIds fourni)
      const parSujet: Record<string, { nom: string; poids: number[] }> = {};
      if (sujetIds && sujetIds.length > 0) {
        sujetIds.forEach((animalId) => {
          const animalData = byAnimal.get(animalId);
          if (animalData) {
            parSujet[animalId] = {
              nom: animalData.nom,
              poids: animalData.poids,
            };
          }
        });
      }

      return {
        dates,
        poids_moyens: poidsMoyens,
        poids_initial: firstPoids,
        poids_actuel: lastPoids,
        gain_total: gainTotal,
        gmq: Math.round(gmq),
        par_sujet: Object.keys(parSujet).length > 0 ? parSujet : undefined,
      };
    } else {
      // Mode bande
      let query = `
        SELECT 
          bw.weighing_date as date,
          bw.average_weight_kg,
          bw.count,
          bw.batch_id,
          b.pen_name
        FROM batch_weighings bw
        JOIN batches b ON bw.batch_id = b.id
        WHERE b.projet_id = $1 
          AND bw.weighing_date >= $2
      `;
      const params: any[] = [projetId, dateDebut.toISOString()];

      if (sujetIds && sujetIds.length > 0) {
        query += ` AND bw.batch_id = ANY($${params.length + 1})`;
        params.push(sujetIds);
      }

      query += ` ORDER BY bw.weighing_date ASC`;

      const result = await this.databaseService.query(query, params);

      // Grouper par date et calculer poids total (somme des poids moyens * count)
      const byDate = new Map<string, { poidsTotal: number; countTotal: number }>();
      const byBatch = new Map<string, { nom: string; poids: number[]; dates: string[] }>();

      result.rows.forEach((row: any) => {
        const dateKey = new Date(row.date).toISOString().split('T')[0];
        const poids = parseFloat(row.average_weight_kg || '0');
        const count = parseInt(row.count || '1');

        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, { poidsTotal: 0, countTotal: 0 });
        }
        const dateData = byDate.get(dateKey)!;
        dateData.poidsTotal += poids * count;
        dateData.countTotal += count;

        // Par batch
        if (!byBatch.has(row.batch_id)) {
          byBatch.set(row.batch_id, {
            nom: row.pen_name || row.batch_id.slice(-4),
            poids: [],
            dates: [],
          });
        }
        const batchData = byBatch.get(row.batch_id)!;
        batchData.dates.push(dateKey);
        batchData.poids.push(poids);
      });

      const dates = Array.from(byDate.keys()).sort();
      const poidsMoyens = dates.map((date) => {
        const data = byDate.get(date)!;
        return data.countTotal > 0 ? data.poidsTotal / data.countTotal : 0;
      });

      // Calculer métriques globales
      const firstPoids = poidsMoyens[0] || 0;
      const lastPoids = poidsMoyens[poidsMoyens.length - 1] || 0;
      const gainTotal = lastPoids - firstPoids;
      const joursTotal = dates.length > 1
        ? Math.floor((new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const gmq = joursTotal > 0 ? (gainTotal / joursTotal) * 1000 : 0;

      // Par sujet (si sujetIds fourni)
      const parSujet: Record<string, { nom: string; poids: number[] }> = {};
      if (sujetIds && sujetIds.length > 0) {
        sujetIds.forEach((batchId) => {
          const batchData = byBatch.get(batchId);
          if (batchData) {
            parSujet[batchId] = {
              nom: batchData.nom,
              poids: batchData.poids,
            };
          }
        });
      }

      return {
        dates,
        poids_moyens: poidsMoyens,
        poids_initial: firstPoids,
        poids_actuel: lastPoids,
        gain_total: gainTotal,
        gmq: Math.round(gmq),
        par_sujet: Object.keys(parSujet).length > 0 ? parSujet : undefined,
      };
    }
  }

  /**
   * Récupère les détails complets des pesées d'un animal avec métriques
   */
  async getAnimalPeseesDetail(animalId: string, userId: string) {
    await this.checkAnimalOwnership(animalId, userId);

    // Récupérer l'animal
    const animalResult = await this.databaseService.query(
      `SELECT * FROM production_animaux WHERE id = $1`,
      [animalId]
    );
    if (animalResult.rows.length === 0) {
      throw new NotFoundException('Animal introuvable');
    }
    const animal = animalResult.rows[0];

    // Récupérer toutes les pesées
    const peseesResult = await this.databaseService.query(
      `SELECT * FROM production_pesees 
       WHERE animal_id = $1 
       ORDER BY date ASC`,
      [animalId]
    );

    const pesees = peseesResult.rows.map((row) => ({
      id: row.id,
      date: row.date,
      poids_kg: parseFloat(row.poids_kg),
      commentaire: row.commentaire,
      gmq: row.gmq ? parseFloat(row.gmq) * 1000 : null, // Convertir en g/j
    }));

    // Calculer les métriques
    const poidsActuel = pesees.length > 0 ? pesees[pesees.length - 1].poids_kg : parseFloat(animal.poids_initial || '0');
    const poidsInitial = pesees.length > 0 ? pesees[0].poids_kg : parseFloat(animal.poids_initial || '0');
    const gainTotal = poidsActuel - poidsInitial;

    // GMQ moyen
    let gmqMoyen = 0;
    if (pesees.length >= 2) {
      const premiereDate = new Date(pesees[0].date);
      const derniereDate = new Date(pesees[pesees.length - 1].date);
      const jours = Math.max(1, Math.floor((derniereDate.getTime() - premiereDate.getTime()) / (1000 * 60 * 60 * 24)));
      gmqMoyen = (gainTotal / jours) * 1000;
    }

    // Âge en jours
    const dateNaissance = new Date(animal.date_naissance);
    const ageJours = Math.floor((new Date().getTime() - dateNaissance.getTime()) / (1000 * 60 * 60 * 24));

    // Vérifier si en retard (dernière pesée > 7 jours)
    const dernierePeseeDate = pesees.length > 0 ? new Date(pesees[pesees.length - 1].date) : null;
    const enRetard = !dernierePeseeDate || 
      (new Date().getTime() - dernierePeseeDate.getTime()) > 7 * 24 * 60 * 60 * 1000;

    // Moyennes du cheptel (pour comparaison)
    const cheptelResult = await this.databaseService.query(
      `SELECT 
        AVG(pp.poids_kg)::numeric(10,2) as poids_moyen,
        AVG(pp.gmq)::numeric(10,2) as gmq_moyen
      FROM production_pesees pp
      JOIN production_animaux pa ON pp.animal_id = pa.id
      WHERE pa.projet_id = $1 
        AND pa.actif = true
        AND pp.gmq IS NOT NULL
        AND pp.date >= NOW() - INTERVAL '30 days'`,
      [animal.projet_id]
    );
    const moyenneCheptelPoids = parseFloat(cheptelResult.rows[0]?.poids_moyen || '0');
    const moyenneCheptelGmq = parseFloat(cheptelResult.rows[0]?.gmq_moyen || '0') * 1000;

    return {
      animal: {
        id: animal.id,
        code: animal.code,
        race: animal.race,
        sexe: animal.sexe,
        date_naissance: animal.date_naissance,
      },
      pesees,
      metriques: {
        poids_actuel: poidsActuel,
        poids_initial: poidsInitial,
        gain_total: gainTotal,
        gmq_moyen: Math.round(gmqMoyen),
        age_jours: ageJours,
        objectif_poids: null, // À implémenter plus tard
        objectif_date: null,
        progression_objectif: null,
        en_retard: enRetard,
        moyenne_cheptel_poids: moyenneCheptelPoids,
        moyenne_cheptel_gmq: Math.round(moyenneCheptelGmq),
      },
    };
  }
}
