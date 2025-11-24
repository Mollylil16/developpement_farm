/**
 * Types pour la gestion des projets de ferme
 */

export interface Projet {
  id: string;
  nom: string;
  localisation: string;
  nombre_truies: number;
  nombre_verrats: number;
  nombre_porcelets: number;
  poids_moyen_actuel: number;
  age_moyen_actuel: number;
  prix_kg_vif?: number;
  prix_kg_carcasse?: number;
  notes?: string;
  statut: 'actif' | 'archive' | 'suspendu';
  proprietaire_id: string;
  date_creation: string;
  derniere_modification: string;
  
  // ✨ Paramètres OPEX/CAPEX
  duree_amortissement_par_defaut_mois?: number; // Durée d'amortissement pour CAPEX (défaut: 36 mois)
}

export type ProjetStatut = 'actif' | 'archive' | 'suspendu';

export interface CreateProjetInput {
  nom: string;
  localisation: string;
  nombre_truies: number;
  nombre_verrats: number;
  nombre_porcelets: number;
  poids_moyen_actuel: number;
  age_moyen_actuel: number;
  prix_kg_vif?: number;
  prix_kg_carcasse?: number;
  notes?: string;
  duree_amortissement_par_defaut_mois?: number; // Défaut: 36 mois
}

/**
 * Paramètres par défaut
 */
export const DEFAULT_DUREE_AMORTISSEMENT_MOIS = 36; // 3 ans
