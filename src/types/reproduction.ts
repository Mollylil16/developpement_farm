/**
 * Types pour la gestion de la reproduction
 */

export type StatutGestation = 'en_cours' | 'terminee' | 'annulee';

export interface Gestation {
  id: string;
  truie_id: string; // ID de la truie (pour l'instant simple string, pourrait être référence à table porcs)
  truie_nom?: string; // Nom de la truie pour affichage rapide
  date_sautage: string; // Date ISO
  date_mise_bas_prevue: string; // Date ISO (calculée automatiquement)
  date_mise_bas_reelle?: string; // Date ISO (optionnelle, remplie après la mise bas)
  nombre_porcelets_prevu: number;
  nombre_porcelets_reel?: number;
  statut: StatutGestation;
  notes?: string;
  date_creation: string;
  derniere_modification: string;
}

export interface Sevrage {
  id: string;
  gestation_id: string; // Référence à la gestation
  date_sevrage: string; // Date ISO
  nombre_porcelets_sevres: number;
  poids_moyen_sevrage?: number; // Poids moyen en kg
  notes?: string;
  date_creation: string;
}

export interface CreateGestationInput {
  truie_id: string;
  truie_nom?: string;
  date_sautage: string;
  nombre_porcelets_prevu: number;
  notes?: string;
}

export interface CreateSevrageInput {
  gestation_id: string;
  date_sevrage: string;
  nombre_porcelets_sevres: number;
  poids_moyen_sevrage?: number;
  notes?: string;
}

/**
 * Constantes pour les calculs
 */
export const DUREE_GESTATION_JOURS = 114; // Durée standard d'une gestation porcine
export const ALERTE_MISE_BAS_JOURS = 7; // Nombre de jours avant la mise bas pour générer une alerte

/**
 * Fonction utilitaire pour calculer la date de mise bas prévue
 */
export function calculerDateMiseBasPrevue(dateSautage: string): string {
  const date = new Date(dateSautage);
  date.setDate(date.getDate() + DUREE_GESTATION_JOURS);
  return date.toISOString().split('T')[0];
}

/**
 * Fonction utilitaire pour vérifier si une alerte doit être générée
 */
export function doitGenererAlerte(dateMiseBasPrevue: string): boolean {
  const datePrevue = new Date(dateMiseBasPrevue);
  const aujourdhui = new Date();
  const differenceJours = Math.ceil(
    (datePrevue.getTime() - aujourdhui.getTime()) / (1000 * 60 * 60 * 24)
  );
  return differenceJours <= ALERTE_MISE_BAS_JOURS && differenceJours >= 0;
}

/**
 * Fonction utilitaire pour obtenir le nombre de jours restants avant la mise bas
 */
export function joursRestantsAvantMiseBas(dateMiseBasPrevue: string): number {
  const datePrevue = new Date(dateMiseBasPrevue);
  const aujourdhui = new Date();
  const differenceJours = Math.ceil(
    (datePrevue.getTime() - aujourdhui.getTime()) / (1000 * 60 * 60 * 24)
  );
  return differenceJours;
}

