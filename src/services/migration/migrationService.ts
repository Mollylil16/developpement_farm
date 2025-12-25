/**
 * Service pour les opérations de migration entre modes batch et individualisé
 */

import apiClient from '../api/apiClient';

export interface BatchToIndividualOptions {
  generateIds: boolean;
  idPattern?: string;
  distributionMethod: 'uniform' | 'normal' | 'manual';
  sexRatio?: { male: number; female: number };
  preserveBatchReference: boolean;
  handleHealthRecords: 'duplicate' | 'generic' | 'skip';
  handleFeedRecords: 'divide' | 'skip';
  createWeightRecords: boolean;
  weightStdDevPercent?: number;
}

export interface IndividualToBatchOptions {
  groupingCriteria: {
    byStage: boolean;
    byLocation: boolean;
    bySex: boolean;
    byBreed: boolean;
    ageToleranceDays?: number;
  };
  batchNumberPattern?: string;
  aggregateHealthRecords: boolean;
  aggregateFeedRecords: boolean;
  keepIndividualRecords: boolean;
  minimumBatchSize?: number;
}

export interface MigrationPreview {
  pigsToCreate?: number;
  batchesToCreate?: number;
  recordsToMigrate?: number;
  estimatedDuration?: number;
  warnings?: string[];
  errors?: string[];
  sampleData?: any;
}

export interface MigrationResult {
  success: boolean;
  migrationId: string;
  pigsCreated?: number;
  batchesCreated?: number;
  recordsMigrated?: number;
  warnings?: string[];
  errors?: string[];
}

export interface MigrationHistoryItem {
  id: string;
  migration_type: 'batch_to_individual' | 'individual_to_batch';
  projet_id: string;
  user_id: string;
  source_ids: string[];
  target_ids: string[];
  options: any;
  statistics: any;
  status: 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  error_message?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

class MigrationService {
  /**
   * Prévisualise la conversion batch → individualisé
   */
  async previewBatchToIndividual(
    batchId: string,
    options: BatchToIndividualOptions,
  ): Promise<MigrationPreview> {
    const response = await apiClient.post<MigrationPreview>(
      '/migration/preview/batch-to-individual',
      {
        batchId,
        options,
      },
    );
    return response;
  }

  /**
   * Prévisualise la conversion individualisé → batch
   */
  async previewIndividualToBatch(
    pigIds: string[],
    options: IndividualToBatchOptions,
  ): Promise<MigrationPreview> {
    const response = await apiClient.post<MigrationPreview>(
      '/migration/preview/individual-to-batch',
      {
        pigIds,
        options,
      },
    );
    return response;
  }

  /**
   * Convertit une bande en animaux individuels
   */
  async convertBatchToIndividual(
    batchId: string,
    options: BatchToIndividualOptions,
  ): Promise<MigrationResult> {
    const response = await apiClient.post<MigrationResult>(
      '/migration/convert/batch-to-individual',
      {
        batchId,
        options,
      },
    );
    return response;
  }

  /**
   * Convertit des animaux individuels en bandes
   */
  async convertIndividualToBatch(
    pigIds: string[],
    options: IndividualToBatchOptions,
  ): Promise<MigrationResult> {
    const response = await apiClient.post<MigrationResult>(
      '/migration/convert/individual-to-batch',
      {
        pigIds,
        options,
      },
    );
    return response;
  }

  /**
   * Récupère l'historique des migrations
   */
  async getMigrationHistory(projetId: string): Promise<MigrationHistoryItem[]> {
    const response = await apiClient.get<MigrationHistoryItem[]>(
      `/migration/history/${projetId}`,
    );
    return response;
  }
}

export const migrationService = new MigrationService();

