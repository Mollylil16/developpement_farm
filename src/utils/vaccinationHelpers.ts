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
    case 'vaccin':
      return 'medical';
    case 'antiparasitaire':
      return 'bug';
    case 'antibiotique':
      return 'shield-checkmark';
    case 'autre':
      return 'flask';
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
    case 'vaccin':
      return '#66BB6A'; // Vert
    case 'antiparasitaire':
      return '#AB47BC'; // Violet
    case 'antibiotique':
      return '#42A5F5'; // Bleu
    case 'autre':
      return '#78909C'; // Gris-bleu
    default:
      return '#2196F3'; // Bleu primaire
  }
}

