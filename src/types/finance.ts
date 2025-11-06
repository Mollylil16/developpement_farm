/**
 * Types pour la gestion financière
 */

export type CategorieChargeFixe = 
  | 'salaires' 
  | 'alimentation' 
  | 'entretien' 
  | 'vaccins' 
  | 'eau_electricite' 
  | 'autre';

export type CategorieDepense = 
  | 'vaccins' 
  | 'alimentation' 
  | 'veterinaire' 
  | 'entretien' 
  | 'equipements' 
  | 'autre';

export type FrequenceCharge = 'mensuel' | 'trimestriel' | 'annuel';

export type StatutChargeFixe = 'actif' | 'suspendu' | 'termine';

export interface ChargeFixe {
  id: string;
  categorie: CategorieChargeFixe;
  libelle: string;
  montant: number;
  date_debut: string;
  frequence: FrequenceCharge;
  jour_paiement?: number; // Pour mensuel (1-31)
  notes?: string;
  statut: StatutChargeFixe;
  date_creation: string;
  derniere_modification: string;
}

export interface DepensePonctuelle {
  id: string;
  montant: number;
  categorie: CategorieDepense;
  libelle_categorie?: string; // Si "autre" est sélectionné
  date: string;
  commentaire?: string;
  photos?: string[]; // URLs des photos de reçus
  date_creation: string;
}

export interface CreateChargeFixeInput {
  categorie: CategorieChargeFixe;
  libelle: string;
  montant: number;
  date_debut: string;
  frequence: FrequenceCharge;
  jour_paiement?: number;
  notes?: string;
}

export interface CreateDepensePonctuelleInput {
  montant: number;
  categorie: CategorieDepense;
  libelle_categorie?: string;
  date: string;
  commentaire?: string;
  photos?: string[];
}

export interface UpdateDepensePonctuelleInput {
  montant?: number;
  categorie?: CategorieDepense;
  libelle_categorie?: string;
  date?: string;
  commentaire?: string;
  photos?: string[];
}

