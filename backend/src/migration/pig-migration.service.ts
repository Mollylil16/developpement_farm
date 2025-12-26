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

    // Bug fix: Valider et récupérer les données nécessaires AVANT la transaction
    // pour éviter de créer des enregistrements si les validations échouent
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

    // Bug fix: Créer l'enregistrement de migration AVANT la transaction pour garantir un audit trail
    // même si la transaction échoue et que la mise à jour du record 'failed' échoue aussi
    // Entourer l'INSERT dans un try-catch pour gérer les erreurs proprement
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
      // Si l'INSERT échoue, logger l'erreur et retourner une erreur contrôlée
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

      for (let i = 0; i < batch.total_count; i++) {
        const pigId = this.generateId('pig');
        const code = identifiers[i] || `${batch.pen_name}-${i + 1}`;
        const weight = weights[i];
        const sex = sexes[i] || 'indetermine';

        await client.query(
          `INSERT INTO production_animaux (
            id, projet_id, code, nom, sexe, date_naissance, poids_initial,
            date_entree, actif, statut, categorie_poids, original_batch_id, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            pigId,
            projetId,
            code,
            code,
            sex,
            estimatedBirthDate.toISOString(),
            weight,
            entryDate,
            true,
            'actif',
            this.determineProductionStage(weight),
            dto.options.preserveBatchReference ? dto.batchId : null,
            `Migré depuis la bande ${batch.pen_name}`,
          ],
        );

        createdPigIds.push(pigId);
      }

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

      return {
          success: true,
          migrationId,
          pigsCreated: createdPigIds.length,
          recordsMigrated,
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
   */
  private getGroupKey(
    pig: any,
    criteria: IndividualToBatchOptionsDto['groupingCriteria'],
  ): string {
    const parts: string[] = [];

    if (criteria.byStage) {
      const stage = this.determineProductionStage(
        pig.poids_initial || 0,
        pig.date_naissance
          ? (new Date().getTime() - new Date(pig.date_naissance).getTime()) /
            (1000 * 60 * 60 * 24 * 30)
          : undefined,
      );
      parts.push(`stage:${stage}`);
    }

    if (criteria.bySex) {
      parts.push(`sex:${pig.sexe || 'unknown'}`);
    }

    if (criteria.byBreed && pig.race) {
      parts.push(`breed:${pig.race}`);
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

    const projetId = validationResult.rows[0].projet_id;
    // Bug fix: Réutiliser les données déjà validées au lieu de re-requêter dans la transaction
    const pigs = validationResult.rows;

    // Bug fix: Créer l'enregistrement de migration AVANT la transaction pour garantir un audit trail
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
          await client.query(
          `INSERT INTO batches (
            id, projet_id, pen_name, category, total_count, male_count, female_count,
            castrated_count, average_age_months, average_weight_kg, batch_creation_date,
            migrated_from_individual, original_animal_ids, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            batchId,
            projetId,
            batchNumber,
            stats.category,
            groupPigs.length,
            stats.maleCount,
            stats.femaleCount,
            stats.castratedCount,
            stats.averageAgeMonths,
            stats.averageWeight,
            stats.entryDate,
            true,
            JSON.stringify(groupPigs.map((p: any) => p.id)),
            `Créé depuis ${groupPigs.length} animaux individuels`,
          ],
        );

        createdBatchIds.push(batchId);

          // Créer les batch_pigs
          for (const pig of groupPigs) {
            const batchPigId = this.generateId('bpig');
            
            // Mapper le sexe : 'femelle' → 'female', 'male'/'mâle' → 'male', 'indetermine' → 'castrated'
            // Note: Le système utilise 'male' (sans accent) selon le schéma DB, mais on gère aussi 'mâle' pour robustesse
            // Pour 'indetermine', on utilise 'castrated' pour être cohérent avec calculateBatchStatistics qui compte
            // les indéterminés comme castrés, et pour que les triggers DB mettent à jour correctement les compteurs
            let mappedSex: string;
            if (pig.sexe === 'femelle') {
              mappedSex = 'female';
            } else if (pig.sexe === 'male' || pig.sexe === 'mâle') {
              // Gérer à la fois 'male' (valeur standard) et 'mâle' (variante française) pour robustesse
              mappedSex = 'male';
            } else if (pig.sexe === 'indetermine') {
              // Mapper 'indetermine' vers 'castrated' pour cohérence avec calculateBatchStatistics
              // et pour que les triggers DB mettent à jour correctement castrated_count
              mappedSex = 'castrated';
            } else {
              // Pour toute autre valeur inattendue, logger un avertissement et utiliser 'castrated' par défaut
              this.logger.warn(
                `Valeur de sexe inattendue lors de la migration: "${pig.sexe}" (pig_id: ${pig.id}). Utilisation de 'castrated' par défaut.`
              );
              mappedSex = 'castrated';
            }
            
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

          // Migrer les enregistrements
          if (dto.options.aggregateHealthRecords) {
            await this.migrateHealthRecordsToBatch(groupPigs, batchId, projetId, client);
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

    const maleCount = pigs.filter((p: any) => p.sexe === 'male').length;
    const femaleCount = pigs.filter((p: any) => p.sexe === 'femelle').length;
    // Compter explicitement les animaux indéterminés et les inclure dans castratedCount
    // pour être cohérent avec le mapping qui mappe 'indetermine' → 'castrated' dans batch_pigs
    const indeterminateCount = pigs.filter((p: any) => p.sexe === 'indetermine').length;
    // Les animaux qui ne sont ni mâles, ni femelles, ni indéterminés sont considérés comme castrés
    const castratedOnlyCount = pigs.length - maleCount - femaleCount - indeterminateCount;
    const castratedCount = castratedOnlyCount + indeterminateCount;

    const category = this.determineProductionStage(averageWeight, averageAgeMonths);

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
