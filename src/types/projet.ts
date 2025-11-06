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
  notes?: string;
  statut: 'actif' | 'archive' | 'suspendu';
  proprietaire_id: string;
  date_creation: string;
  derniere_modification: string;
}

export interface CreateProjetInput {
  nom: string;
  localisation: string;
  nombre_truies: number;
  nombre_verrats: number;
  nombre_porcelets: number;
  poids_moyen_actuel: number;
  age_moyen_actuel: number;
  notes?: string;
}

