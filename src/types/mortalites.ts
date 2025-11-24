/**
 * Types pour la gestion des mortalités
 */

export type CategorieMortalite = 'porcelet' | 'truie' | 'verrat' | 'autre';

export interface Mortalite {
  id: string;
  projet_id: string;
  nombre_porcs: number; // Nombre de porcs morts
  date: string; // Date ISO
  cause?: string; // Cause de la mortalité (maladie, accident, etc.)
  categorie: CategorieMortalite;
  animal_code?: string; // Code du sujet mort (optionnel, pour les animaux enregistrés)
  notes?: string;
  date_creation: string;
}

export interface CreateMortaliteInput {
  projet_id: string;
  nombre_porcs: number;
  date: string;
  cause?: string;
  categorie: CategorieMortalite;
  animal_code?: string; // Code du sujet mort (optionnel)
  notes?: string;
}

export interface UpdateMortaliteInput {
  nombre_porcs?: number;
  date?: string;
  cause?: string;
  categorie?: CategorieMortalite;
  animal_code?: string;
  notes?: string;
}

/**
 * Statistiques de mortalité
 */
export interface StatistiquesMortalite {
  total_morts: number;
  taux_mortalite: number; // Pourcentage
  mortalites_par_categorie: {
    porcelet: number;
    truie: number;
    verrat: number;
    autre: number;
  };
  mortalites_par_mois: Array<{
    mois: string;
    nombre: number;
  }>;
}
