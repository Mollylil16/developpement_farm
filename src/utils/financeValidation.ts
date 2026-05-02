/**
 * Utilitaires de validation pour le module Finance
 * Valide les montants, les calculs financiers et la cohérence des données
 */

import {
  FINANCE_LIMITS,
  FINANCE_WEIGHT_LIMITS,
  FINANCE_ANIMAL_LIMITS,
  FINANCE_PRICE_RANGES,
  FINANCE_MARGIN_PERCENTAGE_RANGE,
  FINANCE_CALCULATION_TOLERANCE,
} from '../config/finance.config';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valide un montant financier
 */
export function validateMontant(montant: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Vérifier que le montant est un nombre
  if (typeof montant !== 'number' || isNaN(montant)) {
    errors.push('Le montant doit être un nombre valide');
    return { isValid: false, errors, warnings };
  }

  // Vérifier que le montant n'est pas négatif
  if (montant < FINANCE_LIMITS.MIN_MONTANT) {
    errors.push(`Le montant ne peut pas être négatif (minimum: ${FINANCE_LIMITS.MIN_MONTANT} FCFA)`);
  }

  // Vérifier que le montant n'excède pas la limite maximale
  if (montant > FINANCE_LIMITS.MAX_MONTANT) {
    errors.push(`Le montant ne peut pas dépasser ${FINANCE_LIMITS.MAX_MONTANT.toLocaleString()} FCFA`);
  }

  // Avertissements pour montants suspects
  if (montant > 0 && montant < FINANCE_LIMITS.MIN_MONTANT_WARNING) {
    warnings.push(`Montant très faible (< ${FINANCE_LIMITS.MIN_MONTANT_WARNING.toLocaleString()} FCFA). Vérifiez que c\'est correct.`);
  }

  if (montant > FINANCE_LIMITS.MAX_MONTANT_WARNING) {
    warnings.push(`Montant très élevé (> ${FINANCE_LIMITS.MAX_MONTANT_WARNING.toLocaleString()} FCFA). Vérifiez que c\'est correct.`);
  }

  // Vérifier que le montant a au plus 2 décimales (pour les centimes)
  if (montant !== Math.floor(montant * 100) / 100) {
    errors.push('Le montant ne peut avoir que 2 décimales maximum (pour les centimes)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valide la cohérence entre montant, poids et nombre d'animaux (pour les ventes)
 */
export function validateCohérenceVente(
  montant: number,
  poidsKg?: number,
  nombreAnimaux?: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validation du montant de base
  const montantValidation = validateMontant(montant);
  errors.push(...montantValidation.errors);
  warnings.push(...montantValidation.warnings);

  // Si le poids est fourni, vérifier la cohérence
  if (poidsKg !== undefined && poidsKg !== null) {
    if (typeof poidsKg !== 'number' || isNaN(poidsKg) || poidsKg <= 0) {
      errors.push('Le poids doit être un nombre positif');
    } else if (poidsKg < FINANCE_WEIGHT_LIMITS.MIN_POIDS_KG) {
      errors.push(`Le poids doit être au moins ${FINANCE_WEIGHT_LIMITS.MIN_POIDS_KG} kg`);
    } else if (poidsKg > FINANCE_WEIGHT_LIMITS.MAX_POIDS_KG) {
      errors.push(`Le poids ne peut pas dépasser ${FINANCE_WEIGHT_LIMITS.MAX_POIDS_KG} kg par animal`);
    } else {
      // Vérifier le prix au kg (entre MIN_PRIX_KG et MAX_PRIX_KG FCFA/kg généralement)
      const prixAuKg = montant / poidsKg;
      if (prixAuKg < FINANCE_PRICE_RANGES.MIN_PRIX_KG) {
        warnings.push(`Prix au kg très faible (${prixAuKg.toFixed(2)} FCFA/kg). Vérifiez que c\'est correct.`);
      } else if (prixAuKg > FINANCE_PRICE_RANGES.MAX_PRIX_KG) {
        warnings.push(`Prix au kg très élevé (${prixAuKg.toFixed(2)} FCFA/kg). Vérifiez que c\'est correct.`);
      }
    }
  }

  // Si le nombre d'animaux est fourni, vérifier la cohérence
  if (nombreAnimaux !== undefined && nombreAnimaux !== null) {
    if (typeof nombreAnimaux !== 'number' || isNaN(nombreAnimaux) || nombreAnimaux <= 0) {
      errors.push('Le nombre d\'animaux doit être un nombre positif');
    } else if (nombreAnimaux < FINANCE_ANIMAL_LIMITS.MIN_NOMBRE_ANIMAUX) {
      errors.push(`Le nombre d'animaux doit être au moins ${FINANCE_ANIMAL_LIMITS.MIN_NOMBRE_ANIMAUX}`);
    } else if (nombreAnimaux > FINANCE_ANIMAL_LIMITS.MAX_NOMBRE_ANIMAUX) {
      errors.push(`Le nombre d'animaux ne peut pas dépasser ${FINANCE_ANIMAL_LIMITS.MAX_NOMBRE_ANIMAUX}`);
    } else {
      // Vérifier le prix par animal (entre MIN_PRIX_PAR_ANIMAL et MAX_PRIX_PAR_ANIMAL FCFA généralement)
      const prixParAnimal = montant / nombreAnimaux;
      if (prixParAnimal < FINANCE_PRICE_RANGES.MIN_PRIX_PAR_ANIMAL) {
        warnings.push(`Prix par animal très faible (${prixParAnimal.toLocaleString()} FCFA). Vérifiez que c\'est correct.`);
      } else if (prixParAnimal > FINANCE_PRICE_RANGES.MAX_PRIX_PAR_ANIMAL) {
        warnings.push(`Prix par animal très élevé (${prixParAnimal.toLocaleString()} FCFA). Vérifiez que c\'est correct.`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valide les calculs de marges (OPEX/CAPEX)
 */
export function validateCalculMarges(revenu: {
  montant: number;
  marge_opex?: number;
  marge_complete?: number;
  marge_opex_pourcent?: number;
  marge_complete_pourcent?: number;
  cout_reel_opex?: number;
  cout_reel_complet?: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Valider le montant de base
  const montantValidation = validateMontant(revenu.montant);
  errors.push(...montantValidation.errors);
  warnings.push(...montantValidation.warnings);

  // Valider les marges en valeur
  if (revenu.marge_opex !== undefined && revenu.marge_opex !== null) {
    if (typeof revenu.marge_opex !== 'number' || isNaN(revenu.marge_opex)) {
      errors.push('La marge OPEX doit être un nombre valide');
    } else {
      // La marge OPEX ne peut pas être supérieure au montant
      if (revenu.marge_opex > revenu.montant) {
        errors.push('La marge OPEX ne peut pas être supérieure au montant de vente');
      }
      // La marge OPEX peut être négative (pertes)
      if (Math.abs(revenu.marge_opex) > revenu.montant * 2) {
        warnings.push('Marge OPEX très négative (pertes importantes). Vérifiez que c\'est correct.');
      }
    }
  }

  if (revenu.marge_complete !== undefined && revenu.marge_complete !== null) {
    if (typeof revenu.marge_complete !== 'number' || isNaN(revenu.marge_complete)) {
      errors.push('La marge complète doit être un nombre valide');
    } else {
      // La marge complète ne peut pas être supérieure au montant
      if (revenu.marge_complete > revenu.montant) {
        errors.push('La marge complète ne peut pas être supérieure au montant de vente');
      }
      // La marge complète peut être négative (pertes)
      if (Math.abs(revenu.marge_complete) > revenu.montant * 2) {
        warnings.push('Marge complète très négative (pertes importantes). Vérifiez que c\'est correct.');
      }
    }
  }

  // Valider les marges en pourcentage
  if (revenu.marge_opex_pourcent !== undefined && revenu.marge_opex_pourcent !== null) {
    if (typeof revenu.marge_opex_pourcent !== 'number' || isNaN(revenu.marge_opex_pourcent)) {
      errors.push('Le pourcentage de marge OPEX doit être un nombre valide');
    } else if (
      revenu.marge_opex_pourcent < FINANCE_MARGIN_PERCENTAGE_RANGE.MIN_POURCENT ||
      revenu.marge_opex_pourcent > FINANCE_MARGIN_PERCENTAGE_RANGE.MAX_POURCENT
    ) {
      errors.push(`Le pourcentage de marge OPEX doit être entre ${FINANCE_MARGIN_PERCENTAGE_RANGE.MIN_POURCENT}% et ${FINANCE_MARGIN_PERCENTAGE_RANGE.MAX_POURCENT}%`);
    }
  }

  if (revenu.marge_complete_pourcent !== undefined && revenu.marge_complete_pourcent !== null) {
    if (typeof revenu.marge_complete_pourcent !== 'number' || isNaN(revenu.marge_complete_pourcent)) {
      errors.push('Le pourcentage de marge complète doit être un nombre valide');
    } else if (
      revenu.marge_complete_pourcent < FINANCE_MARGIN_PERCENTAGE_RANGE.MIN_POURCENT ||
      revenu.marge_complete_pourcent > FINANCE_MARGIN_PERCENTAGE_RANGE.MAX_POURCENT
    ) {
      errors.push(`Le pourcentage de marge complète doit être entre ${FINANCE_MARGIN_PERCENTAGE_RANGE.MIN_POURCENT}% et ${FINANCE_MARGIN_PERCENTAGE_RANGE.MAX_POURCENT}%`);
    }
  }

  // Valider la cohérence entre marge en valeur et marge en pourcentage
  if (
    revenu.marge_opex !== undefined &&
    revenu.marge_opex !== null &&
    revenu.marge_opex_pourcent !== undefined &&
    revenu.marge_opex_pourcent !== null &&
    revenu.montant > 0
  ) {
    const expectedPourcent = (revenu.marge_opex / revenu.montant) * 100;
    const diff = Math.abs(revenu.marge_opex_pourcent - expectedPourcent);
    if (diff > FINANCE_CALCULATION_TOLERANCE.POURCENT_TOLERANCE) {
      warnings.push(
        `Incohérence entre marge OPEX en valeur (${revenu.marge_opex.toLocaleString()} FCFA) et en pourcentage (${revenu.marge_opex_pourcent.toFixed(2)}%). Calcul attendu: ${expectedPourcent.toFixed(2)}%`
      );
    }
  }

  if (
    revenu.marge_complete !== undefined &&
    revenu.marge_complete !== null &&
    revenu.marge_complete_pourcent !== undefined &&
    revenu.marge_complete_pourcent !== null &&
    revenu.montant > 0
  ) {
    const expectedPourcent = (revenu.marge_complete / revenu.montant) * 100;
    const diff = Math.abs(revenu.marge_complete_pourcent - expectedPourcent);
    if (diff > FINANCE_CALCULATION_TOLERANCE.POURCENT_TOLERANCE) {
      warnings.push(
        `Incohérence entre marge complète en valeur (${revenu.marge_complete.toLocaleString()} FCFA) et en pourcentage (${revenu.marge_complete_pourcent.toFixed(2)}%). Calcul attendu: ${expectedPourcent.toFixed(2)}%`
      );
    }
  }

  // Valider la cohérence entre marge et coût
  if (
    revenu.marge_opex !== undefined &&
    revenu.marge_opex !== null &&
    revenu.cout_reel_opex !== undefined &&
    revenu.cout_reel_opex !== null
  ) {
    const expectedMarge = revenu.montant - revenu.cout_reel_opex;
    const diff = Math.abs(revenu.marge_opex - expectedMarge);
    if (diff > FINANCE_CALCULATION_TOLERANCE.MONTANT_TOLERANCE) {
      warnings.push(
        `Incohérence entre marge OPEX (${revenu.marge_opex.toLocaleString()} FCFA) et coût OPEX (${revenu.cout_reel_opex.toLocaleString()} FCFA). Marge attendue: ${expectedMarge.toLocaleString()} FCFA`
      );
    }
  }

  if (
    revenu.marge_complete !== undefined &&
    revenu.marge_complete !== null &&
    revenu.cout_reel_complet !== undefined &&
    revenu.cout_reel_complet !== null
  ) {
    const expectedMarge = revenu.montant - revenu.cout_reel_complet;
    const diff = Math.abs(revenu.marge_complete - expectedMarge);
    if (diff > FINANCE_CALCULATION_TOLERANCE.MONTANT_TOLERANCE) {
      warnings.push(
        `Incohérence entre marge complète (${revenu.marge_complete.toLocaleString()} FCFA) et coût complet (${revenu.cout_reel_complet.toLocaleString()} FCFA). Marge attendue: ${expectedMarge.toLocaleString()} FCFA`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valide une charge fixe
 */
export function validateChargeFixe(input: {
  montant: number;
  frequence: string;
  jour_paiement?: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Valider le montant
  const montantValidation = validateMontant(input.montant);
  errors.push(...montantValidation.errors);
  warnings.push(...montantValidation.warnings);

  // Valider la fréquence
  if (!['mensuel', 'trimestriel', 'annuel'].includes(input.frequence)) {
    errors.push('La fréquence doit être "mensuel", "trimestriel" ou "annuel"');
  }

  // Valider le jour de paiement (si mensuel)
  if (input.frequence === 'mensuel' && input.jour_paiement !== undefined) {
    if (typeof input.jour_paiement !== 'number' || isNaN(input.jour_paiement)) {
      errors.push('Le jour de paiement doit être un nombre valide');
    } else if (input.jour_paiement < 1 || input.jour_paiement > 31) {
      errors.push('Le jour de paiement doit être entre 1 et 31');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valide une dépense ponctuelle
 */
export function validateDepensePonctuelle(input: {
  montant: number;
  categorie: string;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Valider le montant
  const montantValidation = validateMontant(input.montant);
  errors.push(...montantValidation.errors);
  warnings.push(...montantValidation.warnings);

  // La catégorie est validée côté backend, pas besoin de validation stricte ici

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valide un revenu
 */
export function validateRevenu(input: {
  montant: number;
  categorie: string;
  poids_kg?: number;
  nombre_animaux?: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Valider la cohérence générale (montant, poids, nombre)
  const cohérenceValidation = validateCohérenceVente(
    input.montant,
    input.poids_kg,
    input.nombre_animaux
  );
  errors.push(...cohérenceValidation.errors);
  warnings.push(...cohérenceValidation.warnings);

  // La catégorie est validée côté backend, pas besoin de validation stricte ici

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
