import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateProjetDto } from './dto/create-projet.dto';
import { UpdateProjetDto } from './dto/update-projet.dto';
import { BatchPigsService } from '../batches/batch-pigs.service';
import { ProductionService } from '../production/production.service';

@Injectable()
export class ProjetsService {
  private readonly logger = new Logger(ProjetsService.name);

  constructor(
    private databaseService: DatabaseService,
    @Inject(forwardRef(() => BatchPigsService))
    private batchPigsService: BatchPigsService,
  ) {}

  /**
   * Génère un ID comme le frontend : projet_${Date.now()}_${random}
   */
  private generateProjetId(): string {
    return `projet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Mapper une ligne de la base de données vers un objet Projet
   */
  private mapRowToProjet(row: any): any {
    // Convertir les nombres explicitement pour éviter les problèmes de type
    const projet = {
      id: row.id,
      nom: row.nom,
      localisation: row.localisation,
      nombre_truies: row.nombre_truies != null ? parseInt(row.nombre_truies, 10) : 0,
      nombre_verrats: row.nombre_verrats != null ? parseInt(row.nombre_verrats, 10) : 0,
      nombre_porcelets: row.nombre_porcelets != null ? parseInt(row.nombre_porcelets, 10) : 0,
      nombre_croissance: row.nombre_croissance != null ? parseInt(row.nombre_croissance, 10) : 0,
      poids_moyen_actuel: parseFloat(row.poids_moyen_actuel) || 0,
      age_moyen_actuel: row.age_moyen_actuel != null ? parseInt(row.age_moyen_actuel, 10) : 0,
      prix_kg_vif: row.prix_kg_vif ? parseFloat(row.prix_kg_vif) : undefined,
      prix_kg_carcasse: row.prix_kg_carcasse ? parseFloat(row.prix_kg_carcasse) : undefined,
      notes: row.notes || undefined,
      statut: row.statut,
      proprietaire_id: row.proprietaire_id,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
      management_method: row.management_method || 'individual', // Méthode d'élevage
      duree_amortissement_par_defaut_mois: row.duree_amortissement_par_defaut_mois != null ? parseInt(row.duree_amortissement_par_defaut_mois, 10) : 36,
    };
return projet;
  }

  /**
   * Vérifie que le projet appartient à l'utilisateur
   */
  private async checkOwnership(projetId: string, userId: string): Promise<void> {
    const projet = await this.findOne(projetId);
    if (!projet) {
      throw new NotFoundException('Projet introuvable');
    }
    
    // Log de debug uniquement en développement
    this.logger.debug(`checkOwnership: userId=${userId}, proprietaire_id=${projet.proprietaire_id}, match=${projet.proprietaire_id === userId}`);
    
    if (projet.proprietaire_id !== userId) {
      this.logger.warn(`Ownership mismatch: userId=${userId} tried to access projet=${projetId} owned by ${projet.proprietaire_id}`);
      throw new ForbiddenException('Ce projet ne vous appartient pas');
    }
  }

  async create(createProjetDto: CreateProjetDto, userId: string) {
    this.logger.debug(`Creating projet for userId=${userId}`);
    const id = this.generateProjetId();
    const now = new Date().toISOString();
    const statut = 'actif';
    const nombre_croissance = createProjetDto.nombre_croissance || 0;
    const duree_amortissement = createProjetDto.duree_amortissement_par_defaut_mois || 36;
    const management_method = createProjetDto.management_method || 'individual';

    // Utiliser une transaction pour garantir la cohérence :
    // - Archiver tous les autres projets actifs
    // - Créer le nouveau projet actif
    // Garantit qu'un seul projet est actif à la fois
    return await this.databaseService.transaction(async (client) => {
      // 1. Archiver tous les autres projets actifs de l'utilisateur
      await client.query(
        `UPDATE projets SET statut = 'archive', derniere_modification = $1 
         WHERE proprietaire_id = $2 AND statut = 'actif'`,
        [now, userId]
      );

// 2. Créer le nouveau projet actif
      const result = await client.query(
        `INSERT INTO projets (
          id, nom, localisation, nombre_truies, nombre_verrats, nombre_porcelets,
          nombre_croissance, poids_moyen_actuel, age_moyen_actuel, prix_kg_vif,
          prix_kg_carcasse, notes, statut, proprietaire_id, management_method,
          duree_amortissement_par_defaut_mois, date_creation, derniere_modification
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
        [
          id,
          createProjetDto.nom,
          createProjetDto.localisation,
          createProjetDto.nombre_truies,
          createProjetDto.nombre_verrats,
          createProjetDto.nombre_porcelets,
          nombre_croissance,
          createProjetDto.poids_moyen_actuel,
          createProjetDto.age_moyen_actuel,
          createProjetDto.prix_kg_vif || null,
          createProjetDto.prix_kg_carcasse || null,
          createProjetDto.notes || null,
          statut,
          userId,
          management_method,
          duree_amortissement,
          now,
          now,
        ]
      );
const projet = this.mapRowToProjet(result.rows[0]);
this.logger.log(`Projet créé: id=${projet.id}, nom=${projet.nom}, proprietaire_id=${projet.proprietaire_id}`);

      return projet;
    }).then(async (projet) => {
// Si mode batch + effectifs initiaux → Auto-regrouper en loges
      // Fait en dehors de la transaction car c'est une opération complexe qui peut échouer
      // et ne doit pas empêcher la création du projet
      if (management_method === 'batch') {
        try {
// Attendre un court délai pour s'assurer que la transaction est bien commitée
          // et que le projet est visible dans la base de données
          await new Promise(resolve => setTimeout(resolve, 100));
          await this.autoGroupIntoBatches(projet.id, createProjetDto, userId);
} catch (error) {
this.logger.error(`Erreur lors de l'auto-groupement en bandes pour projet ${projet.id}:`, error);
          // Ne pas faire échouer la création du projet si l'auto-groupement échoue
          // mais logger l'erreur pour debugging
        }
      } else {
        // Mode individuel : créer les animaux individuels dans production_animaux
        try {
// Attendre un court délai pour s'assurer que la transaction est bien commitée
          await new Promise(resolve => setTimeout(resolve, 100));
          await this.autoCreateIndividualAnimals(projet.id, createProjetDto, userId);
} catch (error) {
this.logger.error(`Erreur lors de la création automatique des animaux individuels pour projet ${projet.id}:`, error);
          // Ne pas faire échouer la création du projet si la création d'animaux échoue
          // mais logger l'erreur pour debugging
        }
      }

      return projet;
    });
  }

  /**
   * Initialise le cheptel en mode "individual" à partir des effectifs initiaux du projet.
   * Utile pour les projets existants créés avant correction (ou si l'auto-création a échoué).
   *
   * Stratégie: idempotent "soft" → si des animaux existent déjà, on ne recrée rien (évite doublons).
   */
  async initializeIndividualAnimals(projetId: string, userId: string): Promise<{
    created: number;
    skipped: boolean;
    reason?: string;
  }> {
    await this.checkOwnership(projetId, userId);

    const projet = await this.findOne(projetId);
    if (!projet) {
      throw new NotFoundException('Projet introuvable');
    }

    if (projet.management_method !== 'individual') {
      return { created: 0, skipped: true, reason: 'management_method_not_individual' };
    }

    const existing = await this.databaseService.query(
      'SELECT COUNT(*)::int AS count FROM production_animaux WHERE projet_id = $1',
      [projetId]
    );
    const existingCount = existing.rows?.[0]?.count ?? 0;
    if (existingCount > 0) {
      return { created: 0, skipped: true, reason: 'animals_already_exist' };
    }

    const dto: CreateProjetDto = {
      nom: projet.nom,
      localisation: projet.localisation,
      nombre_truies: projet.nombre_truies || 0,
      nombre_verrats: projet.nombre_verrats || 0,
      nombre_porcelets: projet.nombre_porcelets || 0,
      nombre_croissance: projet.nombre_croissance || 0,
      poids_moyen_actuel: projet.poids_moyen_actuel || 0,
      age_moyen_actuel: projet.age_moyen_actuel || 0,
      notes: projet.notes,
      management_method: 'individual',
      prix_kg_vif: projet.prix_kg_vif,
      prix_kg_carcasse: projet.prix_kg_carcasse,
      duree_amortissement_par_defaut_mois: projet.duree_amortissement_par_defaut_mois,
    };

    await this.autoCreateIndividualAnimals(projetId, dto, userId);

    const created =
      (dto.nombre_truies || 0) +
      (dto.nombre_verrats || 0) +
      (dto.nombre_porcelets || 0) +
      (dto.nombre_croissance || 0);

    return { created, skipped: false };
  }

  /**
   * Initialise les loges en mode "batch" pour les projets existants.
   * Idempotent : si des bandes existent déjà, ne rien créer.
   */
  async initializeBatchBatches(
    projetId: string,
    userId: string,
  ): Promise<{ created: number; skipped: boolean; reason?: string }> {
    await this.checkOwnership(projetId, userId);

    const projet = await this.findOne(projetId);
    if (!projet) {
      throw new NotFoundException('Projet introuvable');
    }

    if (projet.management_method !== 'batch') {
      return { created: 0, skipped: true, reason: 'management_method_not_batch' };
    }

    const existing = await this.databaseService.query(
      'SELECT COUNT(*)::int AS count FROM batches WHERE projet_id = $1',
      [projetId],
    );
    const existingCount = existing.rows?.[0]?.count ?? 0;
    if (existingCount > 0) {
      return { created: 0, skipped: true, reason: 'batches_already_exist' };
    }

    const dto: CreateProjetDto = {
      nom: projet.nom,
      localisation: projet.localisation,
      nombre_truies: projet.nombre_truies || 0,
      nombre_verrats: projet.nombre_verrats || 0,
      nombre_porcelets: projet.nombre_porcelets || 0,
      nombre_croissance: projet.nombre_croissance || 0,
      poids_moyen_actuel: projet.poids_moyen_actuel || 0,
      age_moyen_actuel: projet.age_moyen_actuel || 0,
      notes: projet.notes,
      management_method: 'batch',
      prix_kg_vif: projet.prix_kg_vif,
      prix_kg_carcasse: projet.prix_kg_carcasse,
      duree_amortissement_par_defaut_mois: projet.duree_amortissement_par_defaut_mois,
    };

    await this.autoGroupIntoBatches(projetId, dto, userId);

    const created =
      (dto.nombre_truies && dto.nombre_truies > 0 ? 1 : 0) +
      (dto.nombre_verrats && dto.nombre_verrats > 0 ? 1 : 0) +
      (dto.nombre_porcelets && dto.nombre_porcelets > 0 ? 1 : 0) +
      (dto.nombre_croissance && dto.nombre_croissance > 0 ? 1 : 0);

    return { created, skipped: false };
  }

  /**
   * Auto-regrouper les effectifs initiaux en loges par catégorie
   */
  private async autoGroupIntoBatches(
    projetId: string,
    dto: CreateProjetDto,
    userId: string,
  ): Promise<void> {
    // Mapping catégorie → effectifs
    const categories = [
      {
        category: 'truie_reproductrice' as const,
        count: dto.nombre_truies || 0,
        defaultAge: 18, // mois
        defaultWeight: 180, // kg
      },
      {
        category: 'verrat_reproducteur' as const,
        count: dto.nombre_verrats || 0,
        defaultAge: 18,
        defaultWeight: 200,
      },
      {
        category: 'porcelets' as const,
        count: dto.nombre_porcelets || 0,
        defaultAge: 2,
        defaultWeight: 15,
      },
      {
        category: 'porcs_croissance' as const,
        count: dto.nombre_croissance || 0,
        defaultAge: 4,
        defaultWeight: 40,
      },
      // Note: porcs_engraissement pas encore dans le DTO, à ajouter si nécessaire
    ];

    // Compteurs séparés pour les loges à droite (A) et à gauche (B)
    let logeIndexDroite = 1; // Pour les loges A (droite)
    let logeIndexGauche = 1; // Pour les loges B (gauche)

    for (const cat of categories) {
      if (cat.count > 0) {
        // Alterner entre droite et gauche pour les loges initiales
        // Les premières loges vont à droite (A), les suivantes à gauche (B)
        const isDroite = (logeIndexDroite + logeIndexGauche - 1) % 2 === 1;
        const position: 'gauche' | 'droite' = isDroite ? 'droite' : 'gauche';
        const letter = isDroite ? 'A' : 'B';
        const numberIndex = isDroite ? logeIndexDroite : logeIndexGauche;
        const penName = `${letter}${numberIndex}`;

        const population = this.distributeByDefaultSex(cat.count, cat.category);
        // Créer une loge pour cette catégorie
        try {
          // Passer skipOwnershipCheck=true car le projet vient d'être créé et on connaît déjà le proprietaire_id
          await this.batchPigsService.createBatchWithPigs(
            {
              projet_id: projetId,
              pen_name: penName,
              position: position,
              category: cat.category,
              population,
              average_age_months: cat.defaultAge,
              average_weight_kg: cat.defaultWeight,
              notes: 'Effectif initial - Créé automatiquement lors de la création du projet',
            },
            userId,
            true, // skipOwnershipCheck: true car le projet vient d'être créé dans la même transaction
          );
        } catch (error) {
          throw error;
        }

        // Incrémenter le compteur approprié
        if (isDroite) {
          logeIndexDroite++;
        } else {
          logeIndexGauche++;
        }
      }
    }
  }

  /**
   * Auto-créer les animaux individuels en mode suivi individuel
   */
  private async autoCreateIndividualAnimals(
    projetId: string,
    dto: CreateProjetDto,
    userId: string,
  ): Promise<void> {
    // Mapping catégorie → effectifs avec paramètres par défaut
    const categories = [
      {
        category: 'truie_reproductrice',
        count: dto.nombre_truies || 0,
        defaultAge: 18, // mois
        defaultWeight: dto.poids_moyen_actuel || 180, // kg
        // IMPORTANT: la DB contraint sexe à ('male','femelle','indetermine')
        // (voir migration `004_create_production_animaux_table.sql`)
        sexe: 'femelle' as const,
        reproducteur: true,
      },
      {
        category: 'verrat_reproducteur',
        count: dto.nombre_verrats || 0,
        defaultAge: 18,
        defaultWeight: dto.poids_moyen_actuel || 200,
        sexe: 'male' as const,
        reproducteur: true,
      },
      {
        category: 'porcelets',
        count: dto.nombre_porcelets || 0,
        defaultAge: 2,
        defaultWeight: dto.poids_moyen_actuel || 15,
        sexe: null as 'male' | 'femelle' | null, // Répartition 50/50
        reproducteur: false,
      },
      {
        category: 'porcs_croissance',
        count: dto.nombre_croissance || 0,
        defaultAge: 4,
        defaultWeight: dto.poids_moyen_actuel || 40,
        sexe: null as 'male' | 'femelle' | null, // Répartition variable
        reproducteur: false,
      },
    ];

    let animalIndex = 1;

    for (const cat of categories) {
      if (cat.count > 0) {
// Calculer la répartition par sexe
        let maleCount = 0;
        let femaleCount = 0;
        let castratedCount = 0;

        if (cat.sexe === 'male') {
          maleCount = cat.count;
        } else if (cat.sexe === 'femelle') {
          femaleCount = cat.count;
        } else {
          // Répartition 50/50 pour porcelets, 30/40/30 pour croissance
          if (cat.category === 'porcelets') {
            maleCount = Math.floor(cat.count / 2);
            femaleCount = cat.count - maleCount;
          } else {
            // porcs_croissance
            maleCount = Math.floor(cat.count * 0.3);
            femaleCount = Math.floor(cat.count * 0.4);
            castratedCount = cat.count - maleCount - femaleCount;
          }
        }

        // Créer les animaux
        const now = new Date();
        const dateEntree = now.toISOString();
        // Calculer la date de naissance estimée (âge moyen en jours)
        const ageJours = cat.defaultAge * 30; // Approximation : 1 mois = 30 jours
        const dateNaissance = new Date(now.getTime() - ageJours * 24 * 60 * 60 * 1000);

        // Créer les mâles
        let maleIndex = 1;
        for (let i = 0; i < maleCount; i++) {
          const code = `${cat.category.substring(0, 3).toUpperCase()}-${String(animalIndex).padStart(3, '0')}`;
          const nom = this.generateAnimalName(cat.category, 'male', maleIndex);
          await this.createIndividualAnimal(
            projetId,
            code,
            nom,
            cat.defaultWeight,
            dateNaissance.toISOString(),
            dateEntree,
            'male',
            cat.reproducteur,
            userId,
          );
          animalIndex++;
          maleIndex++;
        }

        // Créer les femelles
        let femaleIndex = 1;
        for (let i = 0; i < femaleCount; i++) {
          const code = `${cat.category.substring(0, 3).toUpperCase()}-${String(animalIndex).padStart(3, '0')}`;
          const nom = this.generateAnimalName(cat.category, 'female', femaleIndex);
          await this.createIndividualAnimal(
            projetId,
            code,
            nom,
            cat.defaultWeight,
            dateNaissance.toISOString(),
            dateEntree,
            'femelle',
            cat.reproducteur,
            userId,
          );
          animalIndex++;
          femaleIndex++;
        }

        // Créer les castrés
        let castratedIndex = 1;
        for (let i = 0; i < castratedCount; i++) {
          const code = `${cat.category.substring(0, 3).toUpperCase()}-${String(animalIndex).padStart(3, '0')}`;
          const nom = this.generateAnimalName(cat.category, 'castrated', castratedIndex);
          await this.createIndividualAnimal(
            projetId,
            code,
            nom,
            cat.defaultWeight,
            dateNaissance.toISOString(),
            dateEntree,
            // La DB n'a pas de valeur "castre" pour sexe.
            // Un porc castré est un mâle non reproducteur.
            'male',
            false,
            userId,
          );
          animalIndex++;
          castratedIndex++;
        }

}
    }
  }

  /**
   * Génère un nom automatique pour un animal selon sa catégorie et son sexe
   */
  private generateAnimalName(
    category: string,
    sexe: 'male' | 'female' | 'castrated',
    index: number
  ): string {
    switch (category) {
      case 'truie_reproductrice':
        return `Truie ${index}`;
      case 'verrat_reproducteur':
        return `Verrat ${index}`;
      case 'porcelets':
        if (sexe === 'male') {
          return `Porcelet Mâle ${index}`;
        } else {
          return `Porcelet Femelle ${index}`;
        }
      case 'porcs_croissance':
      case 'porcs_engraissement':
        if (sexe === 'male') {
          return `Porc Mâle ${index}`;
        } else if (sexe === 'female') {
          return `Porc Femelle ${index}`;
        } else {
          return `Porc Castré ${index}`;
        }
      default:
        // Fallback générique
        if (sexe === 'male') {
          return `Animal Mâle ${index}`;
        } else if (sexe === 'female') {
          return `Animal Femelle ${index}`;
        } else {
          return `Animal Castré ${index}`;
        }
    }
  }

  /**
   * Créer un animal individuel dans production_animaux
   */
  private async createIndividualAnimal(
    projetId: string,
    code: string,
    nom: string,
    poidsInitial: number,
    dateNaissance: string,
    dateEntree: string,
    sexe: 'male' | 'femelle' | 'indetermine',
    reproducteur: boolean,
    userId: string,
  ): Promise<void> {
    const id = `animal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // IMPORTANT: la DB contraint sexe à ('male','femelle','indetermine')
    // Donc on envoie directement une valeur valide.
    const sexeMapped = sexe;

    await this.databaseService.query(
      `INSERT INTO production_animaux (
        id, projet_id, code, nom, origine, sexe, date_naissance, poids_initial,
        date_entree, actif, statut, race, reproducteur, categorie_poids,
        pere_id, mere_id, notes, photo_uri, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
      [
        id,
        projetId,
        code,
        nom, // nom généré automatiquement
        'Effectif initial', // origine
        sexeMapped,
        dateNaissance,
        poidsInitial,
        dateEntree,
        true, // actif
        'actif', // statut
        null, // race
        reproducteur,
        null, // categorie_poids
        null, // pere_id
        null, // mere_id
        'Créé automatiquement lors de la création du projet', // notes
        null, // photo_uri
        now,
        now,
      ]
    );
  }

  /**
   * Distribuer par sexe selon la catégorie
   */
  private distributeByDefaultSex(
    total: number,
    category: string,
  ): { male_count: number; female_count: number; castrated_count: number } {
    switch (category) {
      case 'truie_reproductrice':
        return { male_count: 0, female_count: total, castrated_count: 0 };

      case 'verrat_reproducteur':
        return { male_count: total, female_count: 0, castrated_count: 0 };

      case 'porcelets':
        // Répartition 50/50 mâles-femelles pour porcelets
        const maleCount = Math.floor(total / 2);
        const femaleCount = total - maleCount;
        return {
          male_count: maleCount,
          female_count: femaleCount,
          castrated_count: 0,
        };

      case 'porcs_croissance':
      case 'porcs_engraissement':
        // Répartition : 30% mâles, 40% femelles, 30% castrés
        const males = Math.floor(total * 0.3);
        const females = Math.floor(total * 0.4);
        const castrated = total - males - females;
        return {
          male_count: males,
          female_count: females,
          castrated_count: castrated,
        };

      default:
        return { male_count: 0, female_count: 0, castrated_count: total };
    }
  }

  async findAll(userId: string) {
    // Récupérer les projets où l'utilisateur est propriétaire
    const ownedProjects = await this.databaseService.query(
      `SELECT * FROM projets 
       WHERE proprietaire_id = $1 
       ORDER BY date_creation DESC`,
      [userId]
    );

    // Récupérer les projets où l'utilisateur est collaborateur actif
    const collaborationProjects = await this.databaseService.query(
      `SELECT DISTINCT p.* 
       FROM projets p
       INNER JOIN collaborations c ON p.id = c.projet_id
       WHERE (c.user_id = $1 OR c.profile_id LIKE $2)
         AND c.statut = 'actif'
       ORDER BY p.date_creation DESC`,
      [userId, `%${userId}%`]
    );

    // Combiner les deux listes et éliminer les doublons (au cas où un utilisateur serait propriétaire ET collaborateur)
    const allProjectsMap = new Map();
    
    // Ajouter les projets possédés
    ownedProjects.rows.forEach((row) => {
      allProjectsMap.set(row.id, row);
    });

    // Ajouter les projets de collaboration (sans écraser les projets possédés)
    collaborationProjects.rows.forEach((row) => {
      if (!allProjectsMap.has(row.id)) {
        allProjectsMap.set(row.id, row);
      }
    });

    // Convertir en tableau et mapper
    return Array.from(allProjectsMap.values())
      .map((row) => this.mapRowToProjet(row))
      .sort((a, b) => {
        // Trier par date de création décroissante
        const dateA = new Date(a.date_creation || 0).getTime();
        const dateB = new Date(b.date_creation || 0).getTime();
        return dateB - dateA;
      });
  }

  async findOne(id: string) {
    const result = await this.databaseService.query('SELECT * FROM projets WHERE id = $1', [id]);
    if (!result.rows[0]) return null;
    const projet = this.mapRowToProjet(result.rows[0]);
return projet;
  }

  async findActive(userId: string) {
    const result = await this.databaseService.query(
      `SELECT * FROM projets 
       WHERE proprietaire_id = $1 AND statut = 'actif' 
       ORDER BY date_creation DESC 
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] ? this.mapRowToProjet(result.rows[0]) : null;
  }

  async update(id: string, updateProjetDto: UpdateProjetDto, userId: string) {
    await this.checkOwnership(id, userId);

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateProjetDto.nom !== undefined) {
      fields.push(`nom = $${paramIndex}`);
      values.push(updateProjetDto.nom);
      paramIndex++;
    }
    if (updateProjetDto.localisation !== undefined) {
      fields.push(`localisation = $${paramIndex}`);
      values.push(updateProjetDto.localisation);
      paramIndex++;
    }
    if (updateProjetDto.nombre_truies !== undefined) {
      fields.push(`nombre_truies = $${paramIndex}`);
      values.push(updateProjetDto.nombre_truies);
      paramIndex++;
    }
    if (updateProjetDto.nombre_verrats !== undefined) {
      fields.push(`nombre_verrats = $${paramIndex}`);
      values.push(updateProjetDto.nombre_verrats);
      paramIndex++;
    }
    if (updateProjetDto.nombre_porcelets !== undefined) {
      fields.push(`nombre_porcelets = $${paramIndex}`);
      values.push(updateProjetDto.nombre_porcelets);
      paramIndex++;
    }
    if (updateProjetDto.nombre_croissance !== undefined) {
      fields.push(`nombre_croissance = $${paramIndex}`);
      values.push(updateProjetDto.nombre_croissance);
      paramIndex++;
    }
    if (updateProjetDto.poids_moyen_actuel !== undefined) {
      fields.push(`poids_moyen_actuel = $${paramIndex}`);
      values.push(updateProjetDto.poids_moyen_actuel);
      paramIndex++;
    }
    if (updateProjetDto.age_moyen_actuel !== undefined) {
      fields.push(`age_moyen_actuel = $${paramIndex}`);
      values.push(updateProjetDto.age_moyen_actuel);
      paramIndex++;
    }
    if (updateProjetDto.prix_kg_vif !== undefined) {
      fields.push(`prix_kg_vif = $${paramIndex}`);
      values.push(updateProjetDto.prix_kg_vif);
      paramIndex++;
    }
    if (updateProjetDto.prix_kg_carcasse !== undefined) {
      fields.push(`prix_kg_carcasse = $${paramIndex}`);
      values.push(updateProjetDto.prix_kg_carcasse);
      paramIndex++;
    }
    if (updateProjetDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateProjetDto.notes);
      paramIndex++;
    }
    if (updateProjetDto.statut !== undefined) {
      fields.push(`statut = $${paramIndex}`);
      values.push(updateProjetDto.statut);
      paramIndex++;
    }
    if (updateProjetDto.duree_amortissement_par_defaut_mois !== undefined) {
      fields.push(`duree_amortissement_par_defaut_mois = $${paramIndex}`);
      values.push(updateProjetDto.duree_amortissement_par_defaut_mois);
      paramIndex++;
    }
    if (updateProjetDto.management_method !== undefined) {
      fields.push(`management_method = $${paramIndex}`);
      values.push(updateProjetDto.management_method);
      paramIndex++;
    }

    if (fields.length === 0) {
      return this.findOne(id);
    }

    // Toujours mettre à jour derniere_modification
    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE projets SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToProjet(result.rows[0]);
  }

  async switchActive(projetId: string, userId: string) {
    // Vérifier que le projet appartient à l'utilisateur
    const projets = await this.findAll(userId);
    const projetExiste = projets.find((p) => p.id === projetId);
    if (!projetExiste) {
      throw new ForbiddenException('Ce projet ne vous appartient pas');
    }

    const now = new Date().toISOString();

    // Utiliser une transaction pour garantir la cohérence :
    // - Archiver tous les autres projets actifs
    // - Activer le projet sélectionné
    // Garantit qu'un seul projet est actif à la fois
    return await this.databaseService.transaction(async (client) => {
      // 1. Archiver tous les autres projets actifs
      await client.query(
        `UPDATE projets SET statut = 'archive', derniere_modification = $1 
         WHERE proprietaire_id = $2 AND statut = 'actif' AND id != $3`,
        [now, userId, projetId]
      );

      // 2. Activer le projet sélectionné
      await client.query(
        `UPDATE projets SET statut = 'actif', derniere_modification = $1 WHERE id = $2`,
        [now, projetId]
      );

      // Récupérer le projet mis à jour
      const result = await client.query('SELECT * FROM projets WHERE id = $1', [projetId]);
      return this.mapRowToProjet(result.rows[0]);
    });
  }

  async remove(id: string, userId: string) {
    await this.checkOwnership(id, userId);
    
    this.logger.warn(`Suppression du projet: projetId=${id}, userId=${userId}`);

    // Utiliser une transaction pour garantir la cohérence
    await this.databaseService.transaction(async (client) => {
      // Les contraintes ON DELETE CASCADE s'occuperont automatiquement de supprimer :
      // - Toutes les bandes (batches) et leurs données associées
      // - Tous les animaux individuels (production_animaux)
      // - Toutes les données liées (santé, finance, reproduction, etc.)
      
      // Supprimer le projet (cela déclenchera les CASCADE)
      await client.query('DELETE FROM projets WHERE id = $1', [id]);
      
      this.logger.log(`Projet supprimé avec succès: projetId=${id}`);
    });

    return { id, message: 'Projet supprimé avec succès' };
  }
}
