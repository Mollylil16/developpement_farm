/**
 * Service de migration entre modes batch et individualisé
 * Permet de convertir les données entre les deux systèmes de gestion
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  BatchToIndividualDto,
  BatchToIndividualOptionsDto,
  DistributionMethod,
  HealthRecordsHandling,
  FeedRecordsHandling,
} from './dto/batch-to-individual.dto';
import {
  IndividualToBatchDto,
  IndividualToBatchOptionsDto,
} from './dto/individual-to-batch.dto';

export interface MigrationResult {
  success: boolean;
  migrationId: string;
  pigsCreated?: number;
  batchesCreated?: number;
  recordsMigrated?: number;
  warnings?: string[];
  errors?: string[];
}

export interface MigrationPreview {
  pigsToCreate?: number;
  batchesToCreate?: number;
  recordsToMigrate?: number;
  estimatedDuration?: number; // en secondes
  warnings?: string[];
  errors?: string[];
  sampleData?: any;
}

@Injectable()
export class PigMigrationService {
  private readonly logger = new Logger(PigMigrationService.name);

  constructor(private db: DatabaseService) {}

  /**
   * Vérifie que le projet appartient à l'utilisateur
   */
  private async checkProjectOwnership(
    projetId: string,
    userId: string,
  ): Promise<void> {
    const result = await this.db.query(
      `SELECT proprietaire_id FROM projets WHERE id = $1`,
      [projetId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Projet non trouvé');
    }
    if (result.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Ce projet ne vous appartient pas');
    }
  }

  /**
   * Génère un ID unique
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère des numéros d'identification pour les porcs
   */
  generatePigIdentifiers(
    batchNumber: string,
    quantity: number,
    pattern: string,
  ): string[] {
    const identifiers: string[] = [];
    const year = new Date().getFullYear();

    for (let i = 1; i <= quantity; i++) {
      let identifier = pattern
        .replace('{building}', batchNumber.split('-')[0] || 'B1')
        .replace('{batch}', batchNumber)
        .replace('{year}', year.toString())
        .replace('{seq:3}', i.toString().padStart(3, '0'))
        .replace('{seq}', i.toString());

      identifiers.push(identifier);
    }

    return identifiers;
  }

  /**
   * Génère une distribution de poids normale
   */
  generateWeightDistribution(
    averageWeight: number,
    quantity: number,
    stdDevPercent: number = 10,
  ): number[] {
    const stdDev = (averageWeight * stdDevPercent) / 100;
    const weights: number[] = [];

    // Utiliser Box-Muller pour générer une distribution normale
    for (let i = 0; i < quantity; i++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const weight = averageWeight + z0 * stdDev;
      weights.push(Math.max(weight, averageWeight * 0.5)); // Minimum 50% du poids moyen
    }

    return weights;
  }

  /**
   * Détermine le stade de production d'un animal
   */
  private determineProductionStage(weight: number, ageMonths?: number): string {
    if (weight < 7) return 'porcelets';
    if (weight < 25) return 'porcs_croissance';
    if (weight < 110) return 'porcs_engraissement';
    if (ageMonths && ageMonths > 8) return 'truie_reproductrice'; // Approximation
    return 'porcs_engraissement';
  }

  /**
   * Détermine la catégorie batch à partir d'un animal individuel.
   * IMPORTANT: pour les reproducteurs, on doit respecter sexe + reproducteur (truie/verrat).
   * Pour les non-reproducteurs, on se base sur categorie_poids si dispo, sinon sur le poids.
   */
  private determineBatchCategoryFromIndividual(pig: any): string {
    const sexe = String(pig.sexe || '').toLowerCase();
    const isReproducteur = pig.reproducteur === true || pig.reproducteur === 1;

    if (isReproducteur) {
      if (sexe === 'male' || sexe === 'mâle') return 'verrat_reproducteur';
      if (sexe === 'femelle') return 'truie_reproductrice';
      // Si sexe inconnu, fallback reproducteur femelle (plus fréquent en élevage)
      return 'truie_reproductrice';
    }

    const categoriePoids = String(pig.categorie_poids || '').toLowerCase();
    if (categoriePoids === 'porcelet') return 'porcelets';
    if (categoriePoids === 'croissance') return 'porcs_croissance';
    if (categoriePoids === 'finition') return 'porcs_engraissement';

    const poids = Number(pig.poids_initial || 0);
    if (poids > 0) {
      if (poids < 25) return 'porcelets';
      if (poids <= 60) return 'porcs_croissance';
      return 'porcs_engraissement';
    }

    // Fallback
    return 'porcelets';
  }

  /**
   * Mappe un sexe individuel (male/femelle/indetermine) vers le sexe batch (male/female/castrated).
   * LOGIQUE MÉTIER CRITIQUE :
   * - Truie = femelle reproductrice
   * - Verrrat = mâle reproducteur
   * - Porcelet = tous les autres animaux (indépendamment du sexe)
   */
  private mapIndividualSexToBatchSex(pig: any): 'male' | 'female' | 'castrated' {
    const sexe = String(pig.sexe || '').toLowerCase();
    const isReproducteur = Boolean(pig.reproducteur);

    // Logique métier : les reproducteurs vont dans leurs catégories dédiées
    if (sexe === 'femelle' && isReproducteur) return 'female'; // → truie_reproductrice
    if ((sexe === 'male' || sexe === 'mâle') && isReproducteur) return 'male'; // → verrat_reproducteur

    // Tous les autres animaux sont des porcelets, on garde leur sexe pour cohérence
    if (sexe === 'femelle') return 'female';
    if (sexe === 'male' || sexe === 'mâle') return 'male';

    // Pour indetermine : utiliser 'castrated' car ces animaux vont dans les bandes porcelets
    return 'castrated';
  }

  /**
   * Prévisualise la conversion batch → individualisé
   */
  async previewBatchToIndividual(
    batchId: string,
    options: BatchToIndividualOptionsDto,
    userId: string,
  ): Promise<MigrationPreview> {
    // Vérifier la bande
    const batchResult = await this.db.query(
      `SELECT b.*, p.proprietaire_id 
       FROM batches b
       JOIN projets p ON b.projet_id = p.id
       WHERE b.id = $1`,
      [batchId],
    );

    if (batchResult.rows.length === 0) {
      throw new NotFoundException('Bande non trouvée');
    }

    if (batchResult.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Cette bande ne vous appartient pas');
    }

    const batch = batchResult.rows[0];

    // Compter les enregistrements à migrer
    const [vaccinationsCount, weighingsCount, diseasesCount] = await Promise.all([
      this.db.query(
        `SELECT COUNT(*) as count FROM batch_vaccinations WHERE batch_id = $1`,
        [batchId],
      ),
      this.db.query(
        `SELECT COUNT(*) as count FROM batch_weighings WHERE batch_id = $1`,
        [batchId],
      ),
      this.db.query(
        `SELECT COUNT(*) as count FROM batch_diseases WHERE batch_id = $1`,
        [batchId],
      ),
    ]);

    const recordsCount =
      parseInt(vaccinationsCount.rows[0].count) +
      parseInt(weighingsCount.rows[0].count) +
      parseInt(diseasesCount.rows[0].count);

    const warnings: string[] = [];
    if (batch.total_count > 1000) {
      warnings.push(
        `Grande bande (${batch.total_count} porcs). La migration peut prendre plusieurs minutes.`,
      );
    }

    return {
      pigsToCreate: batch.total_count,
      recordsToMigrate: recordsCount,
      estimatedDuration: Math.ceil(batch.total_count / 100) * 5, // ~5s par 100 porcs
      warnings,
      sampleData: {
        batchName: batch.pen_name,
        averageWeight: batch.average_weight_kg,
        category: batch.category,
      },
    };
  }

  /**
   * Convertit une bande en animaux individuels
   */
  async convertBatchToIndividual(
    dto: BatchToIndividualDto,
    userId: string,
  ): Promise<MigrationResult> {
    const migrationId = this.generateId('mig');

    // Phase 1: Validation complète AVANT toute modification
    const batchResult = await this.db.query(
      `SELECT b.*, p.proprietaire_id, p.id as projet_id
       FROM batches b
       JOIN projets p ON b.projet_id = p.id
       WHERE b.id = $1`,
      [dto.batchId],
    );

    if (batchResult.rows.length === 0) {
      throw new NotFoundException('Bande non trouvée');
    }

    if (batchResult.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Cette bande ne vous appartient pas');
    }

    const batch = batchResult.rows[0];
    const projetId = batch.projet_id;

    // Validation supplémentaire : vérifier que la bande a des porcs
    const pigsCount = await this.db.query(
      'SELECT COUNT(*) as count FROM batch_pigs WHERE batch_id = $1',
      [dto.batchId],
    );

    if (parseInt(pigsCount.rows[0].count) === 0) {
      throw new BadRequestException('Cette bande ne contient aucun porc');
    }

    // Validation des références : s'assurer que les données liées sont cohérentes
    const [vaccinationsCount, diseasesCount, weighingsCount] = await Promise.all([
      this.db.query('SELECT COUNT(*) as count FROM batch_vaccinations WHERE batch_id = $1', [dto.batchId]),
      this.db.query('SELECT COUNT(*) as count FROM batch_diseases WHERE batch_id = $1', [dto.batchId]),
      this.db.query('SELECT COUNT(*) as count FROM batch_weighings WHERE batch_id = $1', [dto.batchId]),
    ]);

    const totalRecords = parseInt(vaccinationsCount.rows[0].count) +
                        parseInt(diseasesCount.rows[0].count) +
                        parseInt(weighingsCount.rows[0].count);

    if (totalRecords > 0) {
      this.logger.debug(`Bande ${dto.batchId} contient ${totalRecords} enregistrements liés à migrer`);
    }

    // Phase 2: Préparer les données de rollback
    const rollbackData = {
      migrationId,
      projetId,
      originalManagementMethod: 'batch', // On suppose qu'on migre depuis batch
      createdPigIds: [] as string[],
      createdVaccinationIds: [] as string[],
      createdDiseaseIds: [] as string[],
      createdWeighingIds: [] as string[],
      createdGestationIds: [] as string[],
      createdBatchIds: [] as string[], // Pour compatibilité avec l'interface
    };

    // Phase 3: Créer l'enregistrement de migration
    let migrationRecordCreated = false;
    try {
      await this.db.query(
        `INSERT INTO migration_history (
          id, migration_type, projet_id, user_id, source_ids, target_ids, options, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          migrationId,
          'batch_to_individual',
          projetId,
          userId,
          JSON.stringify([dto.batchId]),
          JSON.stringify([]),
          JSON.stringify(dto.options),
          'in_progress',
        ],
      );
      migrationRecordCreated = true;
    } catch (insertError) {
      this.logger.error('Erreur lors de la création de l\'enregistrement migration_history:', insertError);
      throw new Error(
        `Impossible de créer l'enregistrement de migration: ${insertError instanceof Error ? insertError.message : String(insertError)}`
      );
    }

    // Utiliser la méthode transaction() pour garantir l'atomicité
    try {
      return await this.db.transaction(async (client) => {
        // Générer les identifiants
      const identifiers = dto.options.generateIds
        ? this.generatePigIdentifiers(
            batch.pen_name,
            batch.total_count,
            dto.options.idPattern || '{batch}-{seq:3}',
          )
        : [];

      // Générer les poids
      const weights =
        dto.options.distributionMethod === DistributionMethod.NORMAL
          ? this.generateWeightDistribution(
              batch.average_weight_kg,
              batch.total_count,
              dto.options.weightStdDevPercent || 10,
            )
          : new Array(batch.total_count).fill(batch.average_weight_kg);

      // Générer les sexes selon le ratio
      const sexRatio = dto.options.sexRatio || { male: 0.5, female: 0.5 };
      const sexes: string[] = [];
      const maleCount = Math.round(batch.total_count * sexRatio.male);
      const femaleCount = Math.round(batch.total_count * sexRatio.female);
      const castratedCount = batch.total_count - maleCount - femaleCount;

      for (let i = 0; i < maleCount; i++) sexes.push('male');
      for (let i = 0; i < femaleCount; i++) sexes.push('femelle');
      for (let i = 0; i < castratedCount; i++) sexes.push('male'); // Par défaut, on met male si pas assez

      // Mélanger aléatoirement
      for (let i = sexes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sexes[i], sexes[j]] = [sexes[j], sexes[i]];
      }

      // Estimer la date de naissance à partir de l'âge moyen
      const estimatedBirthDate = new Date();
      estimatedBirthDate.setMonth(
        estimatedBirthDate.getMonth() - Math.round(batch.average_age_months),
      );

      // Créer les animaux individuels
      const createdPigIds: string[] = [];
      const entryDate = batch.batch_creation_date || new Date().toISOString();

      // Préparer les données pour insertion en batch
      const animalsToInsert = [];
      for (let i = 0; i < batch.total_count; i++) {
        const pigId = this.generateId('pig');
        const code = identifiers[i] || `${batch.pen_name}-${i + 1}`;
        const weight = weights[i];
        const sex = sexes[i] || 'indetermine';

        animalsToInsert.push({
          id: pigId,
          projet_id: projetId,
          code: code,
          sexe: sex,
          date_naissance: estimatedBirthDate.toISOString(),
          poids_initial: weight,
          date_entree: entryDate,
          categorie_poids: this.determineProductionStage(weight),
          original_batch_id: dto.options.preserveBatchReference ? dto.batchId : undefined,
          notes: `Migré depuis la bande ${batch.pen_name}`,
        });

        createdPigIds.push(pigId);
        rollbackData.createdPigIds.push(pigId);
      }

      // Utiliser l'insertion en batch pour de meilleures performances
      await this.batchInsertAnimals(animalsToInsert, client);

      // Migrer les enregistrements de santé
      let recordsMigrated = 0;

      if (dto.options.handleHealthRecords === HealthRecordsHandling.DUPLICATE) {
        // Vaccinations
        const vaccinations = await client.query(
          `SELECT * FROM batch_vaccinations WHERE batch_id = $1`,
          [dto.batchId],
        );

        for (const vacc of vaccinations.rows) {
          for (const pigId of createdPigIds) {
            const vaccId = this.generateId('vacc');
            await client.query(
              `INSERT INTO vaccinations (
                projet_id, animal_id, batch_id, vaccin, nom_vaccin, date_vaccination,
                date_rappel, statut, type_prophylaxie, produit_administre, dosage
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                projetId,
                pigId,
                dto.batchId,
                vacc.vaccine_type,
                vacc.product_name,
                vacc.vaccination_date,
                null,
                'effectue',
                vacc.vaccine_type,
                vacc.product_name,
                vacc.dosage,
              ],
            );
            rollbackData.createdVaccinationIds.push(vaccId);
            recordsMigrated++;
          }
        }

        // Maladies
        const diseases = await client.query(
          `SELECT * FROM batch_diseases WHERE batch_id = $1`,
          [dto.batchId],
        );

        // Bug fix: disease.pig_id contient un ID de batch_pigs, pas de production_animaux.
        // Ces IDs ne correspondent jamais à createdPigIds. On distribue équitablement (round-robin).
        if (diseases.rows.length > 0) {
          if (createdPigIds.length > 0) {
            // Migrer les maladies en les distribuant équitablement aux porcs créés
            for (let i = 0; i < diseases.rows.length; i++) {
              const disease = diseases.rows[i];
              // Distribution round-robin : chaque maladie est assignée à un porc différent
              const targetPigId = createdPigIds[i % createdPigIds.length];

              const maladieId = this.generateId('mal');
              await client.query(
                `INSERT INTO maladies (
                  projet_id, animal_id, batch_id, type, nom_maladie, gravite,
                  date_debut, symptomes, diagnostic, gueri, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                  projetId,
                  targetPigId,
                  dto.batchId,
                  'autre',
                  disease.disease_name,
                  disease.status === 'dead' ? 'critique' : 'moderee',
                  disease.diagnosis_date,
                  disease.symptoms || '',
                  disease.treatment_description || '',
                  disease.status === 'recovered',
                  disease.notes || '',
                ],
              );
              rollbackData.createdDiseaseIds.push(maladieId);
              recordsMigrated++;
            }
          } else {
            // Avertir si des diseases existent mais aucun porc n'a été créé
            this.logger.warn(
              `Migration batch_to_individual: ${diseases.rows.length} disease(s) ne peuvent pas être migrées car aucun porc n'a été créé (batch_id: ${dto.batchId}, total_count: ${batch.total_count})`
            );
          }
        }
      }

      // Migrer les pesées
      if (dto.options.createWeightRecords) {
        const weighings = await client.query(
          `SELECT * FROM batch_weighings WHERE batch_id = $1`,
          [dto.batchId],
        );

        for (const weighing of weighings.rows) {
          // Distribuer le poids moyen aux animaux
          const individualWeights =
            dto.options.distributionMethod === DistributionMethod.NORMAL
              ? this.generateWeightDistribution(
                  weighing.average_weight_kg,
                  createdPigIds.length,
                  dto.options.weightStdDevPercent || 10,
                )
              : new Array(createdPigIds.length).fill(weighing.average_weight_kg);

          for (let i = 0; i < createdPigIds.length; i++) {
            const peseeId = this.generateId('pesee');
            await client.query(
              `INSERT INTO production_pesees (
                projet_id, animal_id, batch_id, date, poids_kg, commentaire
              ) VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                projetId,
                createdPigIds[i],
                dto.batchId,
                weighing.weighing_date,
                individualWeights[i],
                weighing.notes || '',
              ],
            );
            rollbackData.createdWeighingIds.push(peseeId);
            recordsMigrated++;
          }
        }
      }

      // Migrer les gestations (batch_gestations → gestations individuelles)
      if (dto.options.handleHealthRecords !== HealthRecordsHandling.SKIP) {
        const gestations = await client.query(
          `SELECT * FROM batch_gestations WHERE batch_id = $1`,
          [dto.batchId],
        );

        for (const gestation of gestations.rows) {
          // Distribuer les gestations aux animaux femelles créés (truies)
          const femalePigIds = createdPigIds.filter((_, index) => {
            // Trouver l'animal correspondant et vérifier si c'est une femelle
            // On doit récupérer le sexe depuis les données générées plus tôt
            // Pour simplifier, on distribue aux premiers animaux femelles
            return sexes[index] === 'femelle';
          });

          if (femalePigIds.length > 0) {
            // Distribution round-robin des gestations aux femelles
            const targetPigId = femalePigIds[recordsMigrated % femalePigIds.length];

            const gestationId = this.generateId('gest');
            await client.query(
              `INSERT INTO gestations (
                projet_id, animal_id, batch_id, date_debut, date_fin_prevue,
                nombre_porcs_attendus, numero_ordre, statut, notes
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                projetId,
                targetPigId,
                dto.batchId,
                gestation.start_date,
                gestation.expected_end_date,
                gestation.expected_litter_size,
                gestation.gestation_number,
                gestation.status,
                gestation.notes || '',
              ],
            );
            rollbackData.createdGestationIds.push(gestationId);
            recordsMigrated++;
          }
        }
      }

      // Mettre à jour l'enregistrement de migration
      await client.query(
        `UPDATE migration_history
         SET target_ids = $1, statistics = $2, status = $3, completed_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [
          JSON.stringify(createdPigIds),
          JSON.stringify({
            pigsCreated: createdPigIds.length,
            recordsMigrated,
          }),
          'completed',
          migrationId,
        ],
      );

      // Mettre à jour le mode de gestion du projet
      await client.query(
        `UPDATE projets SET management_method = 'individual', derniere_modification = NOW() WHERE id = $1`,
        [projetId],
      );

      return {
          success: true,
          migrationId,
          pigsCreated: createdPigIds.length,
          recordsMigrated,
        };
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la migration batch→individual ${migrationId}:`, error);

      // Rollback automatique si des données ont été créées
      if (migrationRecordCreated && (
        rollbackData.createdPigIds.length > 0 ||
        rollbackData.createdVaccinationIds.length > 0 ||
        rollbackData.createdDiseaseIds.length > 0 ||
        rollbackData.createdWeighingIds.length > 0 ||
        rollbackData.createdGestationIds.length > 0
      )) {
        this.logger.warn(`Déclenchement du rollback automatique pour la migration ${migrationId}`);

        try {
          await this.db.transaction(async (client) => {
            await this.rollbackMigration(rollbackData, client);
          });
        } catch (rollbackError) {
          this.logger.error(`Échec du rollback automatique:`, rollbackError);
          // L'erreur originale est plus importante, on la relance
        }
      } else {
        // Pas de rollback nécessaire, juste marquer comme failed
        if (migrationRecordCreated) {
          try {
            await this.db.query(
              `UPDATE migration_history
               SET status = $1, error_message = $2, completed_at = CURRENT_TIMESTAMP
               WHERE id = $3`,
              ['failed', error instanceof Error ? error.message : String(error), migrationId],
            );
          } catch (updateError) {
            this.logger.error('Erreur lors de la mise à jour du statut de migration (failed):', updateError);
          }
        }
      }

      throw error;
    }
  }

  /**
   * Prévisualise la conversion individualisé → batch
   */
  async previewIndividualToBatch(
    pigIds: string[],
    options: IndividualToBatchOptionsDto,
    userId: string,
  ): Promise<MigrationPreview> {
    if (pigIds.length === 0) {
      throw new BadRequestException('Aucun animal sélectionné');
    }

    // Vérifier les animaux
    const pigsResult = await this.db.query(
      `SELECT pa.*, p.proprietaire_id 
       FROM production_animaux pa
       JOIN projets p ON pa.projet_id = p.id
       WHERE pa.id = ANY($1::text[])`,
      [pigIds],
    );

    if (pigsResult.rows.length !== pigIds.length) {
      throw new NotFoundException('Certains animaux n\'ont pas été trouvés');
    }

    if (pigsResult.rows.some((p: any) => p.proprietaire_id !== userId)) {
      throw new ForbiddenException('Certains animaux ne vous appartiennent pas');
    }

    const pigs = pigsResult.rows;

    // Grouper selon les critères
    const groups = this.groupPigsByCriteria(pigs, options.groupingCriteria);

    const warnings: string[] = [];
    if (pigIds.length > 500) {
      warnings.push(
        `Grand nombre d'animaux (${pigIds.length}). La migration peut prendre plusieurs minutes.`,
      );
    }

    return {
      batchesToCreate: groups.size,
      recordsToMigrate: pigs.length * 2, // Estimation
      estimatedDuration: Math.ceil(pigIds.length / 100) * 3, // ~3s par 100 animaux
      warnings,
      sampleData: {
        totalPigs: pigs.length,
        groupsCount: groups.size,
        averageWeight:
          pigs.reduce((sum: number, p: any) => sum + (p.poids_initial || 0), 0) /
          pigs.length,
      },
    };
  }

  /**
   * Groupe les porcs selon les critères
   */
  private groupPigsByCriteria(
    pigs: any[],
    criteria: IndividualToBatchOptionsDto['groupingCriteria'],
  ): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    for (const pig of pigs) {
      const key = this.getGroupKey(pig, criteria);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(pig);
    }

    return groups;
  }

  /**
   * Génère une clé de groupe pour un porc
   * LOGIQUE MÉTIER : Toujours classifier par reproducteur d'abord, puis affiner selon critères
   */
  private getGroupKey(
    pig: any,
    criteria: IndividualToBatchOptionsDto['groupingCriteria'],
  ): string {
    const parts: string[] = [];

    // LOGIQUE CRITIQUE : Classification de base par reproducteur (toujours appliquée)
    const category = this.determineBatchCategoryFromIndividual(pig);
    parts.push(`category:${category}`);

    // Affinements optionnels selon critères utilisateur
    if (criteria.bySex && category === 'porcelets') {
      // Pour les porcelets, on peut subdiviser par sexe si demandé
      parts.push(`sex:${pig.sexe || 'unknown'}`);
    }

    if (criteria.byBreed && pig.race) {
      parts.push(`breed:${pig.race}`);
    }

    // Critères de localisation (non implémenté pour le moment)
    if (criteria.byLocation) {
      // TODO: Implémenter logique de localisation
      parts.push('location:default');
    }

    return parts.join('|') || 'default';
  }

  /**
   * Convertit des animaux individuels en bandes
   */
  async convertIndividualToBatch(
    dto: IndividualToBatchDto,
    userId: string,
  ): Promise<MigrationResult> {
    const migrationId = this.generateId('mig');

    // Bug fix: Valider et récupérer toutes les données nécessaires AVANT la transaction
    // pour éviter de créer des enregistrements si les validations échouent
    // et éviter une requête redondante dans la transaction
    const validationResult = await this.db.query(
      `SELECT pa.*, p.proprietaire_id, p.id as projet_id
       FROM production_animaux pa
       JOIN projets p ON pa.projet_id = p.id
       WHERE pa.id = ANY($1::text[])`,
      [dto.pigIds],
    );

    if (validationResult.rows.length !== dto.pigIds.length) {
      throw new NotFoundException('Certains animaux n\'ont pas été trouvés');
    }

    if (validationResult.rows.some((p: any) => p.proprietaire_id !== userId)) {
      throw new ForbiddenException('Certains animaux ne vous appartiennent pas');
    }

    // Validation supplémentaire : vérifier l'état des animaux
    const invalidAnimals = validationResult.rows.filter((p: any) =>
      p.actif !== true || p.statut !== 'actif'
    );

    if (invalidAnimals.length > 0) {
      throw new BadRequestException(
        `${invalidAnimals.length} animal(aux) ne sont pas actifs ou sont dans un état invalide pour la migration`
      );
    }

    // Vérifier que les animaux ne sont pas déjà dans des bandes (migration précédente)
    const animalsInBatches = validationResult.rows.filter((p: any) => p.original_batch_id);
    if (animalsInBatches.length > 0) {
      this.logger.warn(
        `${animalsInBatches.length} animaux ont déjà une référence batch (migration précédente). Cela peut créer des conflits.`
      );
    }

    const projetId = validationResult.rows[0].projet_id;
    // Bug fix: Réutiliser les données déjà validées au lieu de re-requêter dans la transaction
    const pigs = validationResult.rows;

    // Phase 2: Préparer les données de rollback
    const rollbackData = {
      migrationId,
      projetId,
      originalManagementMethod: 'individual',
      createdPigIds: [] as string[],
      createdVaccinationIds: [] as string[],
      createdDiseaseIds: [] as string[],
      createdWeighingIds: [] as string[],
      createdGestationIds: [] as string[],
      createdBatchIds: [] as string[], // Pour les bandes créées
    };

    // Phase 3: Créer l'enregistrement de migration
    // même si la transaction échoue et que la création du record 'failed' échoue aussi
    // Entourer l'INSERT dans un try-catch pour gérer les erreurs proprement
    let migrationRecordCreated = false;
    try {
      await this.db.query(
        `INSERT INTO migration_history (
          id, migration_type, projet_id, user_id, source_ids, target_ids, options, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          migrationId,
          'individual_to_batch',
          projetId,
          userId,
          JSON.stringify(dto.pigIds),
          JSON.stringify([]),
          JSON.stringify(dto.options),
          'in_progress',
        ],
      );
      migrationRecordCreated = true;
    } catch (insertError) {
      // Si l'INSERT échoue, logger l'erreur et retourner une erreur contrôlée
      this.logger.error('Erreur lors de la création de l\'enregistrement migration_history:', insertError);
      throw new Error(
        `Impossible de créer l'enregistrement de migration: ${insertError instanceof Error ? insertError.message : String(insertError)}`
      );
    }

    try {
      // Utiliser la méthode transaction() pour garantir l'atomicité
      return await this.db.transaction(async (client) => {
        // Les animaux sont déjà validés et récupérés, pas besoin de re-requêter

        // Grouper les porcs
        const groups = this.groupPigsByCriteria(pigs, dto.options.groupingCriteria);

        // Filtrer les groupes trop petits
        const validGroups = Array.from(groups.entries()).filter(
          ([, groupPigs]) =>
            !dto.options.minimumBatchSize ||
            groupPigs.length >= dto.options.minimumBatchSize,
        );

        const createdBatchIds: string[] = [];
        const year = new Date().getFullYear();

        // Créer les bandes
        for (let i = 0; i < validGroups.length; i++) {
          const [groupKey, groupPigs] = validGroups[i];
          const batchId = this.generateId('batch');

          // Calculer les statistiques
          const stats = this.calculateBatchStatistics(groupPigs);

          // Générer le numéro de bande
          const batchNumber =
            dto.options.batchNumberPattern
              ?.replace('{year}', year.toString())
              .replace('{seq:3}', (i + 1).toString().padStart(3, '0'))
              .replace('{seq}', (i + 1).toString()) || `B${year}${i + 1}`;

          // Créer la bande
          // IMPORTANT: les triggers sur batch_pigs maintiennent les compteurs dans batches.
          // On initialise donc à 0 pour éviter un double comptage lors de l'insertion des batch_pigs.
          // Déterminer la position selon le nom de la loge (A = droite, B = gauche)
          const position = batch.pen_name && batch.pen_name.toUpperCase().startsWith('B') ? 'gauche' : 'droite';
          
          await client.query(
          `INSERT INTO batches (
            id, projet_id, pen_name, position, category, total_count, male_count, female_count,
            castrated_count, average_age_months, average_weight_kg, batch_creation_date,
            migrated_from_individual, original_animal_ids, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            batchId,
            projetId,
            batchNumber,
            position,
            stats.category,
            0,
            0,
            0,
            0,
            stats.averageAgeMonths,
            stats.averageWeight,
            stats.entryDate,
            true,
            JSON.stringify(groupPigs.map((p: any) => p.id)),
            `Créé depuis ${groupPigs.length} animaux individuels`,
          ],
        );

        createdBatchIds.push(batchId);
        rollbackData.createdBatchIds.push(batchId);

          // Créer les batch_pigs
          for (const pig of groupPigs) {
            const batchPigId = this.generateId('bpig');
            
            const mappedSex = this.mapIndividualSexToBatchSex(pig);
            
            await client.query(
            `INSERT INTO batch_pigs (
              id, batch_id, name, sex, birth_date, age_months, current_weight_kg,
              entry_date, health_status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              batchPigId,
              batchId,
              pig.code,
              mappedSex,
              pig.date_naissance,
              pig.date_naissance
                ? (new Date().getTime() - new Date(pig.date_naissance).getTime()) /
                  (1000 * 60 * 60 * 24 * 30)
                : null,
              pig.poids_initial || 0,
              pig.date_entree || new Date().toISOString(),
              pig.statut === 'actif' ? 'healthy' : 'sick',
              pig.notes || '',
            ],
            );
          }

          // Si on ne conserve pas les enregistrements individuels, retirer ces animaux du cheptel individuel
          if (dto.options.keepIndividualRecords === false) {
            await client.query(
              `UPDATE production_animaux
               SET statut = 'autre', actif = false, derniere_modification = NOW()
               WHERE id = ANY($1::text[])`,
              [groupPigs.map((p: any) => p.id)],
            );
          }

          // Migrer les enregistrements
          if (dto.options.aggregateHealthRecords) {
            await this.migrateHealthRecordsToBatch(groupPigs, batchId, projetId, client);
            await this.migrateDiseasesToBatch(groupPigs, batchId, projetId, client);
            await this.migrateWeighingsToBatch(groupPigs, batchId, projetId, client);
          }

          if (dto.options.aggregateFeedRecords) {
            // Note: Les enregistrements d'alimentation ne sont pas encore implémentés
            // À implémenter quand la table feed_records sera créée
          }
        }

        // Mettre à jour l'enregistrement de migration
        await client.query(
          `UPDATE migration_history 
           SET target_ids = $1, statistics = $2, status = $3, completed_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [
            JSON.stringify(createdBatchIds),
            JSON.stringify({
              batchesCreated: createdBatchIds.length,
              pigsMigrated: pigs.length,
            }),
            'completed',
            migrationId,
          ],
        );

        // Mettre à jour la méthode de gestion du projet
        await client.query(
          `UPDATE projets SET management_method = 'batch', derniere_modification = NOW() WHERE id = $1`,
          [projetId],
        );

        return {
          success: true,
          migrationId,
          batchesCreated: createdBatchIds.length,
          recordsMigrated: pigs.length,
        };
      });
    } catch (error) {
      // Bug fix: Mettre à jour le statut à 'failed' dans une nouvelle transaction seulement si le record existe
      if (migrationRecordCreated) {
        try {
          await this.db.transaction(async (client) => {
            // Vérifier que le record existe avant de le mettre à jour
            const checkResult = await client.query(
              `SELECT id FROM migration_history WHERE id = $1`,
              [migrationId],
            );
            
            if (checkResult.rows.length > 0) {
              await client.query(
                `UPDATE migration_history 
                 SET status = $1, error_message = $2, completed_at = CURRENT_TIMESTAMP
                 WHERE id = $3`,
                ['failed', error instanceof Error ? error.message : String(error), migrationId],
              );
            } else {
              this.logger.warn(
                `Enregistrement migration_history (id: ${migrationId}) n'existe pas, impossible de mettre à jour le statut`
              );
            }
          });
        } catch (updateError) {
          // Si l'update échoue, on log mais on ne bloque pas l'erreur principale
          // L'enregistrement reste avec status='in_progress', ce qui est préférable à aucun audit trail
          this.logger.error('Erreur lors de la mise à jour du statut de migration (failed):', updateError);
        }
      } else {
        // Si le record n'a jamais été créé, on log un avertissement
        this.logger.warn(
          `Impossible de mettre à jour le statut de migration (id: ${migrationId}) car l'enregistrement n'a jamais été créé`
        );
      }

      throw error;
    }
  }

  /**
   * Migre les enregistrements de santé vers une bande
   */
  private async migrateHealthRecordsToBatch(
    pigs: any[],
    batchId: string,
    projetId: string,
    client: any,
  ): Promise<void> {
    // Agréger les vaccinations par date et type
    const vaccinations = await client.query(
      `SELECT * FROM vaccinations 
       WHERE animal_id = ANY($1::text[]) 
       ORDER BY date_vaccination`,
      [pigs.map((p: any) => p.id)],
    );

    const vaccinationsByDate = new Map<string, any[]>();
    for (const vacc of vaccinations.rows) {
      const dateKey = new Date(vacc.date_vaccination).toISOString().split('T')[0];
      if (!vaccinationsByDate.has(dateKey)) {
        vaccinationsByDate.set(dateKey, []);
      }
      vaccinationsByDate.get(dateKey)!.push(vacc);
    }

    // Créer des enregistrements batch_vaccinations pour les vaccinations fréquentes
    for (const [date, vaccs] of vaccinationsByDate.entries()) {
      if (vaccs.length >= pigs.length * 0.5) {
        // Si >50% des animaux ont été vaccinés ce jour
        const vaccId = this.generateId('bvacc');
        await client.query(
          `INSERT INTO batch_vaccinations (
            id, batch_id, vaccine_type, product_name, vaccination_date, reason,
            vaccinated_pigs, count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            vaccId,
            batchId,
            vaccs[0].type_prophylaxie || vaccs[0].vaccin,
            vaccs[0].nom_vaccin || vaccs[0].produit_administre,
            date,
            vaccs[0].raison_traitement || 'suivi_normal',
            JSON.stringify(pigs.map((p: any) => p.id)),
            vaccs.length,
          ],
        );
      }
    }
  }

  /**
   * Migre les maladies des animaux individuels vers une bande
   */
  private async migrateDiseasesToBatch(
    pigs: any[],
    batchId: string,
    projetId: string,
    client: any,
  ): Promise<void> {
    // Récupérer toutes les maladies des porcs du groupe
    const diseases = await client.query(
      `SELECT * FROM maladies
       WHERE animal_id = ANY($1::text[])
       ORDER BY date_debut`,
      [pigs.map((p: any) => p.id)],
    );

    // Grouper les maladies par type et date pour agréger
    const diseasesByType = new Map<string, any[]>();

    for (const disease of diseases.rows) {
      const key = `${disease.type || 'autre'}_${disease.nom_maladie || 'unknown'}`;
      if (!diseasesByType.has(key)) {
        diseasesByType.set(key, []);
      }
      diseasesByType.get(key)!.push(disease);
    }

    // Créer des enregistrements batch_diseases pour les maladies fréquentes (>30% des animaux)
    for (const [typeKey, diseaseGroup] of diseasesByType.entries()) {
      if (diseaseGroup.length >= pigs.length * 0.3) {
        // Si >30% des animaux ont cette maladie
        const disease = diseaseGroup[0]; // Prendre la première comme référence

        const batchDiseaseId = this.generateId('bdisease');
        await client.query(
          `INSERT INTO batch_diseases (
            id, batch_id, disease_name, diagnosis_date, symptoms, treatment_description,
            status, affected_pigs, count, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            batchDiseaseId,
            batchId,
            disease.nom_maladie || 'Maladie non spécifiée',
            disease.date_debut,
            disease.symptomes || '',
            disease.diagnostic || '',
            disease.gueri ? 'recovered' : 'active',
            JSON.stringify(pigs.map((p: any) => p.id)),
            diseaseGroup.length,
            disease.notes || '',
          ],
        );
      }
    }
  }

  /**
   * Migre les pesées des animaux individuels vers une bande
   */
  private async migrateWeighingsToBatch(
    pigs: any[],
    batchId: string,
    projetId: string,
    client: any,
  ): Promise<void> {
    // Récupérer toutes les pesées des porcs du groupe
    const weighings = await client.query(
      `SELECT * FROM production_pesees
       WHERE animal_id = ANY($1::text[])
       ORDER BY date`,
      [pigs.map((p: any) => p.id)],
    );

    // Grouper les pesées par date pour agréger
    const weighingsByDate = new Map<string, any[]>();

    for (const weighing of weighings.rows) {
      const dateKey = new Date(weighing.date).toISOString().split('T')[0];
      if (!weighingsByDate.has(dateKey)) {
        weighingsByDate.set(dateKey, []);
      }
      weighingsByDate.get(dateKey)!.push(weighing);
    }

    // Créer des enregistrements batch_weighings pour les pesées fréquentes (>50% des animaux pesés ce jour)
    for (const [date, weighingGroup] of weighingsByDate.entries()) {
      if (weighingGroup.length >= pigs.length * 0.5) {
        // Calculer le poids moyen pour cette date
        const totalWeight = weighingGroup.reduce((sum: number, w: any) => sum + (w.poids_kg || 0), 0);
        const averageWeight = totalWeight / weighingGroup.length;

        const batchWeighingId = this.generateId('bweigh');
        await client.query(
          `INSERT INTO batch_weighings (
            id, batch_id, weighing_date, average_weight_kg, notes
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            batchWeighingId,
            batchId,
            date,
            averageWeight,
            `Pesée migrée depuis ${weighingGroup.length} animaux individuels`,
          ],
        );
      }
    }
  }

  /**
   * Calcule les statistiques d'une bande à partir des porcs
   */
  private calculateBatchStatistics(pigs: any[]): {
    category: string;
    maleCount: number;
    femaleCount: number;
    castratedCount: number;
    averageAgeMonths: number;
    averageWeight: number;
    entryDate: string;
  } {
    const weights = pigs
      .map((p: any) => p.poids_initial || 0)
      .filter((w: number) => w > 0);
    const averageWeight =
      weights.length > 0
        ? weights.reduce((sum: number, w: number) => sum + w, 0) / weights.length
        : 0;

    const ages = pigs
      .map((p: any) => {
        if (!p.date_naissance) return null;
        return (
          (new Date().getTime() - new Date(p.date_naissance).getTime()) /
          (1000 * 60 * 60 * 24 * 30)
        );
      })
      .filter((a: number | null) => a !== null) as number[];
    const averageAgeMonths =
      ages.length > 0
        ? ages.reduce((sum: number, a: number) => sum + a, 0) / ages.length
        : 0;

    let maleCount = 0;
    let femaleCount = 0;
    let castratedCount = 0;
    for (const pig of pigs) {
      const mappedSex = this.mapIndividualSexToBatchSex(pig);
      switch (mappedSex) {
        case 'male':
          maleCount++;
          break;
        case 'female':
          femaleCount++;
          break;
        case 'castrated':
        default:
          castratedCount++;
          break;
      }
    }

    // Catégorie de la bande: si tous les porcs partagent la même catégorie, l'utiliser; sinon fallback via poids
    const categories = new Set(pigs.map((p) => this.determineBatchCategoryFromIndividual(p)));
    const category =
      categories.size === 1
        ? Array.from(categories)[0]
        : this.determineProductionStage(averageWeight, averageAgeMonths);

    const entryDates = pigs
      .map((p: any) => p.date_entree)
      .filter((d: string) => d)
      .sort();
    const entryDate = entryDates[0] || new Date().toISOString();

    return {
      category,
      maleCount,
      femaleCount,
      castratedCount,
      averageAgeMonths,
      averageWeight,
      entryDate,
    };
  }

  /**
   * Effectue un rollback automatique d'une migration en cas d'échec
   */
  private async rollbackMigration(
    rollbackData: {
      migrationId: string;
      projetId: string;
      originalManagementMethod: string;
      createdPigIds: string[];
      createdVaccinationIds: string[];
      createdDiseaseIds: string[];
      createdWeighingIds: string[];
      createdGestationIds: string[];
      createdBatchIds?: string[];
    },
    client: any,
  ): Promise<void> {
    this.logger.warn(`Rollback automatique de la migration ${rollbackData.migrationId}`);

    try {
      // Supprimer les bandes créées (cascading delete supprimera automatiquement batch_pigs)
      if (rollbackData.createdBatchIds.length > 0) {
        await client.query(
          'DELETE FROM batches WHERE id = ANY($1::text[])',
          [rollbackData.createdBatchIds],
        );
        this.logger.debug(`Rollback: supprimé ${rollbackData.createdBatchIds.length} bandes`);
      }

      // Supprimer les gestations créées
      if (rollbackData.createdGestationIds.length > 0) {
        await client.query(
          'DELETE FROM gestations WHERE id = ANY($1::text[])',
          [rollbackData.createdGestationIds],
        );
        this.logger.debug(`Rollback: supprimé ${rollbackData.createdGestationIds.length} gestations`);
      }

      // Supprimer les pesées créées
      if (rollbackData.createdWeighingIds.length > 0) {
        await client.query(
          'DELETE FROM production_pesees WHERE id = ANY($1::text[])',
          [rollbackData.createdWeighingIds],
        );
        this.logger.debug(`Rollback: supprimé ${rollbackData.createdWeighingIds.length} pesées`);
      }

      // Supprimer les maladies créées
      if (rollbackData.createdDiseaseIds.length > 0) {
        await client.query(
          'DELETE FROM maladies WHERE id = ANY($1::text[])',
          [rollbackData.createdDiseaseIds],
        );
        this.logger.debug(`Rollback: supprimé ${rollbackData.createdDiseaseIds.length} maladies`);
      }

      // Supprimer les vaccinations créées
      if (rollbackData.createdVaccinationIds.length > 0) {
        await client.query(
          'DELETE FROM vaccinations WHERE id = ANY($1::text[])',
          [rollbackData.createdVaccinationIds],
        );
        this.logger.debug(`Rollback: supprimé ${rollbackData.createdVaccinationIds.length} vaccinations`);
      }

      // Supprimer les animaux créés
      if (rollbackData.createdPigIds.length > 0) {
        await client.query(
          'DELETE FROM production_animaux WHERE id = ANY($1::text[])',
          [rollbackData.createdPigIds],
        );
        this.logger.debug(`Rollback: supprimé ${rollbackData.createdPigIds.length} animaux`);
      }

      // Restaurer le mode de gestion original
      await client.query(
        'UPDATE projets SET management_method = $1, derniere_modification = NOW() WHERE id = $2',
        [rollbackData.originalManagementMethod, rollbackData.projetId],
      );
      this.logger.debug(`Rollback: restauré management_method = ${rollbackData.originalManagementMethod}`);

      // Marquer la migration comme rollbackée
      await client.query(
        `UPDATE migration_history
         SET status = $1, error_message = $2, completed_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        ['rolled_back', 'Migration annulée automatiquement suite à une erreur', rollbackData.migrationId],
      );

      this.logger.warn(`Rollback terminé pour la migration ${rollbackData.migrationId}`);
    } catch (rollbackError) {
      this.logger.error(`Erreur lors du rollback de la migration ${rollbackData.migrationId}:`, rollbackError);
      // En cas d'échec du rollback, on marque quand même la migration comme failed
      try {
        await client.query(
          `UPDATE migration_history
           SET status = $1, error_message = $2, completed_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          ['failed', `Échec du rollback: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`, rollbackData.migrationId],
        );
      } catch (updateError) {
        this.logger.error(`Impossible de mettre à jour le statut de migration après échec de rollback:`, updateError);
      }
    }
  }

  /**
   * Insertion en batch optimisée pour de gros volumes
   */
  private async batchInsertAnimals(
    animals: Array<{
      id: string;
      projet_id: string;
      code: string;
      sexe: string;
      date_naissance: string;
      poids_initial: number;
      date_entree: string;
      categorie_poids: string;
      original_batch_id?: string;
      notes: string;
    }>,
    client: any,
  ): Promise<void> {
    if (animals.length === 0) return;

    // Pour les très gros volumes, utiliser des insertions par chunks
    const CHUNK_SIZE = 100;

    const COLUMNS_PER_ROW = 13;

    for (let i = 0; i < animals.length; i += CHUNK_SIZE) {
      const chunk = animals.slice(i, i + CHUNK_SIZE);
      const params: any[] = [];
      const values = chunk
        .map((animal, idx) => {
          const base = idx * COLUMNS_PER_ROW;
          params.push(
            animal.id,
            animal.projet_id,
            animal.code,
            animal.code, // nom = code
            animal.sexe,
            animal.date_naissance,
            animal.poids_initial,
            animal.date_entree,
            true,
            'actif',
            animal.categorie_poids,
            animal.original_batch_id || null,
            animal.notes || null,
          );
          const placeholders = Array.from({ length: COLUMNS_PER_ROW }, (_, offset) => `$${base + offset + 1}`);
          return `(${placeholders.join(', ')})`;
        })
        .join(', ');

      await client.query(
        `INSERT INTO production_animaux (
          id, projet_id, code, nom, sexe, date_naissance, poids_initial,
          date_entree, actif, statut, categorie_poids, original_batch_id, notes
        ) VALUES ${values}`,
        params,
      );
    }

    this.logger.debug(`Batch insert: ${animals.length} animaux insérés en ${Math.ceil(animals.length / CHUNK_SIZE)} chunks`);
  }

  /**
   * Récupère l'historique des migrations
   */
  async getMigrationHistory(
    projetId: string,
    userId: string,
  ): Promise<any[]> {
    await this.checkProjectOwnership(projetId, userId);

    const result = await this.db.query(
      `SELECT * FROM migration_history 
       WHERE projet_id = $1 
       ORDER BY started_at DESC 
       LIMIT 50`,
      [projetId],
    );

    return result.rows;
  }
}
