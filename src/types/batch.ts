/**
 * Types pour la gestion des bandes (batches) d'animaux
 * Utilisé pour le mode de suivi par bande
 */

export type BatchCategory =
  | 'truie_reproductrice'
  | 'verrat_reproducteur'
  | 'porcelets'
  | 'porcs_croissance'
  | 'porcs_engraissement';

export interface Batch {
  id: string;
  projet_id: string;
  pen_name: string; // Nom de la loge/enclos

  // Catégorie
  category: BatchCategory;

  // Effectifs
  total_count: number;
  male_count: number;
  female_count: number;
  castrated_count: number;

  // Caractéristiques moyennes
  average_age_months: number;
  average_weight_kg: number;
  avg_daily_gain?: number;

  // Dates
  batch_creation_date: string;
  expected_sale_date?: string;

  // Métadonnées
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBatchInput {
  projet_id: string;
  pen_name: string;
  category: BatchCategory;
  total_count: number;
  male_count?: number;
  female_count?: number;
  castrated_count?: number;
  average_age_months: number;
  average_weight_kg: number;
  batch_creation_date?: string;
  expected_sale_date?: string;
  notes?: string;
}

export interface UpdateBatchInput {
  pen_name?: string;
  category?: BatchCategory;
  total_count?: number;
  male_count?: number;
  female_count?: number;
  castrated_count?: number;
  average_age_months?: number;
  average_weight_kg?: number;
  expected_sale_date?: string;
  notes?: string;
}

/**
 * Labels lisibles pour les catégories
 */
export const BATCH_CATEGORY_LABELS: Record<BatchCategory, string> = {
  truie_reproductrice: '🐖 Truies reproductrices',
  verrat_reproducteur: '🐗 Verrats reproducteurs',
  porcelets: '🐷 Porcelets',
  porcs_croissance: '🐽 Porcs en croissance',
  porcs_engraissement: '🐖 Porcs en engraissement',
};

/**
 * Icônes pour les catégories
 */
export const BATCH_CATEGORY_ICONS: Record<BatchCategory, string> = {
  truie_reproductrice: '🐖',
  verrat_reproducteur: '🐗',
  porcelets: '🐷',
  porcs_croissance: '🐽',
  porcs_engraissement: '🐖',
};

export interface BatchWeighingSummary {
  id: string;
  batch_id: string;
  pen_name?: string;
  weighing_date: string;
  average_weight_kg: number;
  min_weight_kg?: number | null;
  max_weight_kg?: number | null;
  count: number;
  notes?: string | null;
}

export interface BatchWeighingDetail {
  id: string;
  pig_id: string;
  weight_kg: number;
  created_at: string;
  pig_name?: string | null;
  sex?: 'male' | 'female' | 'castrated' | string | null;
  current_weight_kg?: number | null;
  entry_date?: string | null;
  batch_id?: string | null;
}

