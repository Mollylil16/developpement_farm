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

