/**
 * Helpers pour le module Vaccination
 */

import { Ionicons } from '@expo/vector-icons';
import { TypeProphylaxie } from '../types/sante';

/**
 * Obtenir l'icône pour un type de prophylaxie
 */
export function getIconeType(type: TypeProphylaxie): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'vitamine':
      return 'nutrition';
    case 'vaccin_obligatoire':
      return 'medical';
    case 'deparasitant':
      return 'bug';
    case 'antibiotique_preventif':
      return 'shield-checkmark';
    case 'autre_traitement':
      return 'flask';
    case 'fer':
      return 'medical';
    default:
      return 'medical';
  }
}

/**
 * Obtenir la couleur pour un type de prophylaxie
 */
export function getCouleurType(type: TypeProphylaxie): string {
  switch (type) {
    case 'vitamine':
      return '#FFA726'; // Orange
    case 'vaccin_obligatoire':
      return '#66BB6A'; // Vert
    case 'deparasitant':
      return '#AB47BC'; // Violet
    case 'antibiotique_preventif':
      return '#42A5F5'; // Bleu
    case 'autre_traitement':
      return '#78909C'; // Gris-bleu
    case 'fer':
      return '#EF5350'; // Rouge
    default:
      return '#2196F3'; // Bleu primaire
  }
}
