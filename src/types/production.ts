/**
 * Types pour la gestion du module Production (pesées & estimations)
 */

export type SexeAnimal = 'male' | 'femelle' | 'indetermine';
export type StatutAnimal = 'actif' | 'mort' | 'vendu' | 'offert' | 'autre';

export interface ProductionAnimal {
  id: string;
  projet_id: string;
  code: string;
  nom?: string;
  origine?: string;
  sexe: SexeAnimal;
  date_naissance?: string;
  poids_initial?: number;
  date_entree?: string;
  actif: boolean; // Déprécié, utiliser statut à la place
  statut: StatutAnimal;
  race?: string;
  reproducteur: boolean;
  pere_id?: string | null;
  mere_id?: string | null;
  notes?: string;
  photo_uri?: string;
  date_creation: string;
  derniere_modification: string;
}

export const STATUT_ANIMAL_LABELS: Record<StatutAnimal, string> = {
  actif: 'Actif',
  mort: 'Mort',
  vendu: 'Vendu',
  offert: 'Offert',
  autre: 'Autre',
};

export interface CreateProductionAnimalInput {
  projet_id: string;
  code: string;
  nom?: string;
  origine?: string;
  sexe?: SexeAnimal;
  date_naissance?: string;
  poids_initial?: number;
  date_entree?: string;
  statut?: StatutAnimal;
  race?: string;
  reproducteur?: boolean;
  pere_id?: string | null;
  mere_id?: string | null;
  notes?: string;
  photo_uri?: string;
}

export interface UpdateProductionAnimalInput {
  code?: string;
  nom?: string | null;
  origine?: string | null;
  sexe?: SexeAnimal;
  date_naissance?: string | null;
  poids_initial?: number | null;
  date_entree?: string | null;
  actif?: boolean; // Déprécié, utiliser statut à la place
  statut?: StatutAnimal;
  race?: string | null;
  reproducteur?: boolean;
  pere_id?: string | null;
  mere_id?: string | null;
  notes?: string | null;
  photo_uri?: string | null;
}

export interface ProductionPesee {
  id: string;
  projet_id: string;
  animal_id: string;
  date: string;
  poids_kg: number;
  gmq?: number;
  difference_standard?: number;
  commentaire?: string;
  cree_par?: string;
  date_creation: string;
}

export interface CreatePeseeInput {
  projet_id: string;
  animal_id: string;
  date: string;
  poids_kg: number;
  commentaire?: string;
  cree_par?: string;
}

export interface ProductionStandardGMQ {
  min_poids: number;
  max_poids: number;
  gmq_cible: number; // en g/jour
}

/**
 * Standards GMQ approximatifs (exemple) en g/jour
 */
export const GMQ_STANDARDS: ProductionStandardGMQ[] = [
  { min_poids: 0, max_poids: 20, gmq_cible: 350 },
  { min_poids: 20, max_poids: 50, gmq_cible: 550 },
  { min_poids: 50, max_poids: 80, gmq_cible: 650 },
  { min_poids: 80, max_poids: 120, gmq_cible: 750 },
  { min_poids: 120, max_poids: 200, gmq_cible: 700 },
];

export function getStandardGMQ(poids: number): ProductionStandardGMQ | undefined {
  return GMQ_STANDARDS.find(
    (standard) => poids >= standard.min_poids && poids < standard.max_poids
  );
}
