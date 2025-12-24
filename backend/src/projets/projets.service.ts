import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateProjetDto } from './dto/create-projet.dto';
import { UpdateProjetDto } from './dto/update-projet.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BatchPigsService } from '../batches/batch-pigs.service';

@Injectable()
export class ProjetsService {
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
    return {
      id: row.id,
      nom: row.nom,
      localisation: row.localisation,
      nombre_truies: row.nombre_truies,
      nombre_verrats: row.nombre_verrats,
      nombre_porcelets: row.nombre_porcelets,
      nombre_croissance: row.nombre_croissance || 0,
      poids_moyen_actuel: parseFloat(row.poids_moyen_actuel),
      age_moyen_actuel: row.age_moyen_actuel,
      prix_kg_vif: row.prix_kg_vif ? parseFloat(row.prix_kg_vif) : undefined,
      prix_kg_carcasse: row.prix_kg_carcasse ? parseFloat(row.prix_kg_carcasse) : undefined,
      notes: row.notes || undefined,
      statut: row.statut,
      proprietaire_id: row.proprietaire_id,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
      management_method: row.management_method || 'individual', // Méthode d'élevage
      duree_amortissement_par_defaut_mois: row.duree_amortissement_par_defaut_mois || 36,
    };
  }

  /**
   * Vérifie que le projet appartient à l'utilisateur
   */
  private async checkOwnership(projetId: string, userId: string): Promise<void> {
    const projet = await this.findOne(projetId);
    if (!projet) {
      throw new NotFoundException('Projet introuvable');
    }
    
    console.log('🐛 [ProjetsService] checkOwnership: COMPARAISON');
    console.log('  - userId (du JWT):', userId);
    console.log('  - proprietaire_id (du projet):', projet.proprietaire_id);
    console.log('  - Match?', projet.proprietaire_id === userId);
    
    if (projet.proprietaire_id !== userId) {
      console.error('❌ [ProjetsService] OWNERSHIP MISMATCH!');
      throw new ForbiddenException('Ce projet ne vous appartient pas');
    }
  }

  async create(createProjetDto: CreateProjetDto, userId: string) {
    console.log('🏗️ [ProjetService] create: userId reçu =', userId);
    const id = this.generateProjetId();
    const now = new Date().toISOString();
    const statut = 'actif';
    const nombre_croissance = createProjetDto.nombre_croissance || 0;
    const duree_amortissement = createProjetDto.duree_amortissement_par_defaut_mois || 36;
    const management_method = createProjetDto.management_method || 'individual';

    // Archiver tous les autres projets actifs de l'utilisateur
    await this.databaseService.query(
      `UPDATE projets SET statut = 'archive', derniere_modification = $1 
       WHERE proprietaire_id = $2 AND statut = 'actif'`,
      [now, userId]
    );

    const result = await this.databaseService.query(
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

    console.log('✅ [ProjetService] Projet créé:', {
      id: result.rows[0].id,
      proprietaire_id: result.rows[0].proprietaire_id,
      nom: result.rows[0].nom,
    });

    const projet = this.mapRowToProjet(result.rows[0]);

    // Si mode batch + effectifs initiaux → Auto-regrouper en loges
    if (management_method === 'batch') {
      await this.autoGroupIntoBatches(projet.id, createProjetDto, userId);
    }

    return projet;
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

    let logeIndex = 1;
    const letterLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    for (const cat of categories) {
      if (cat.count > 0) {
        // Générer nom de loge : A1, A2, A3, etc. puis B1, B2, etc.
        const letterIndex = Math.floor((logeIndex - 1) / 8);
        const numberIndex = ((logeIndex - 1) % 8) + 1;
        const letter =
          letterIndex < letterLabels.length
            ? letterLabels[letterIndex]
            : String.fromCharCode(65 + letterIndex); // A, B, C, etc.
        const penName = `Loge ${letter}${numberIndex}`;

        // Créer une loge pour cette catégorie
        await this.batchPigsService.createBatchWithPigs(
          {
            projet_id: projetId,
            pen_name: penName,
            category: cat.category,
            population: this.distributeByDefaultSex(cat.count, cat.category),
            average_age_months: cat.defaultAge,
            average_weight_kg: cat.defaultWeight,
            notes: 'Effectif initial - Créé automatiquement lors de la création du projet',
          },
          userId,
        );

        logeIndex++;
      }
    }
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
    const result = await this.databaseService.query(
      `SELECT * FROM projets 
       WHERE proprietaire_id = $1 
       ORDER BY date_creation DESC`,
      [userId]
    );
    return result.rows.map((row) => this.mapRowToProjet(row));
  }

  async findOne(id: string) {
    const result = await this.databaseService.query('SELECT * FROM projets WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRowToProjet(result.rows[0]) : null;
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

    // Archiver tous les autres projets actifs
    await this.databaseService.query(
      `UPDATE projets SET statut = 'archive', derniere_modification = $1 
       WHERE proprietaire_id = $2 AND statut = 'actif' AND id != $3`,
      [now, userId, projetId]
    );

    // Activer le nouveau projet
    return this.update(projetId, { statut: 'actif' }, userId);
  }

  async remove(id: string, userId: string) {
    await this.checkOwnership(id, userId);
    await this.databaseService.query('DELETE FROM projets WHERE id = $1', [id]);
    return { id };
  }
}
