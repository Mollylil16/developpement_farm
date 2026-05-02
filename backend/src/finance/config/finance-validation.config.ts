/**
 * Configuration centralisée pour la validation du module Finance (Backend)
 * Ces constantes doivent correspondre aux limites définies côté frontend
 */

/**
 * Limites de validation des montants financiers
 */
export const FINANCE_LIMITS = {
  /** Montant minimum (ne peut pas être négatif) */
  MIN_MONTANT: 0,
  /** Montant maximum (1 milliard FCFA) */
  MAX_MONTANT: 1000000000,
  /** Seuil d'avertissement pour montant faible (< 1000 FCFA) */
  MIN_MONTANT_WARNING: 1000,
  /** Seuil d'avertissement pour montant élevé (> 100M FCFA) */
  MAX_MONTANT_WARNING: 100000000,
} as const;

/**
 * Limites de validation pour les poids
 */
export const FINANCE_WEIGHT_LIMITS = {
  /** Poids minimum par animal (1 kg) */
  MIN_POIDS_KG: 1,
  /** Poids maximum par animal (500 kg - limite réaliste pour porc) */
  MAX_POIDS_KG: 500,
} as const;

/**
 * Limites de validation pour le nombre d'animaux
 */
export const FINANCE_ANIMAL_LIMITS = {
  /** Nombre minimum d'animaux */
  MIN_NOMBRE_ANIMAUX: 1,
  /** Nombre maximum d'animaux (limite pour éviter les erreurs) */
  MAX_NOMBRE_ANIMAUX: 10000,
} as const;

/**
 * Limites de validation pour la durée d'amortissement (CAPEX)
 */
export const FINANCE_AMORTIZATION_LIMITS = {
  /** Durée minimum d'amortissement (1 mois) */
  MIN_DUREE_MOIS: 1,
  /** Durée maximum d'amortissement (360 mois = 30 ans) */
  MAX_DUREE_MOIS: 360,
} as const;

/**
 * Fourchettes de prix pour validation contextuelle
 */
export const FINANCE_PRICE_RANGES = {
  /** Prix minimum au kg (FCFA/kg) - en dessous, avertir */
  MIN_PRIX_KG: 500,
  /** Prix maximum au kg (FCFA/kg) - au-dessus, avertir */
  MAX_PRIX_KG: 15000,
  /** Prix minimum par animal (FCFA) - en dessous, avertir */
  MIN_PRIX_PAR_ANIMAL: 50000,
  /** Prix maximum par animal (FCFA) - au-dessus, avertir */
  MAX_PRIX_PAR_ANIMAL: 500000,
} as const;
