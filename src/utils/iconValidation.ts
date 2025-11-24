/**
 * Utilitaire pour valider et sécuriser les noms d'icônes Ionicons
 */

import { Ionicons } from '@expo/vector-icons';

/**
 * Liste des noms d'icônes invalides connus qui causent des warnings
 */
const INVALID_ICON_NAMES = new Set(['livestock']);

/**
 * Vérifie si un nom d'icône est valide dans Ionicons
 */
export function isValidIconName(name: string): boolean {
  if (INVALID_ICON_NAMES.has(name)) {
    return false;
  }
  
  // Vérifier si l'icône existe dans le glyphMap d'Ionicons
  return name in Ionicons.glyphMap;
}

/**
 * Obtient un nom d'icône valide, avec un fallback si l'icône est invalide
 */
export function getValidIconName(
  iconName: string,
  fallback: keyof typeof Ionicons.glyphMap = 'help-circle-outline'
): keyof typeof Ionicons.glyphMap {
  if (isValidIconName(iconName)) {
    return iconName as keyof typeof Ionicons.glyphMap;
  }
  
  console.warn(
    `⚠️ [IconValidation] Nom d'icône invalide détecté: "${iconName}". Utilisation du fallback: "${fallback}"`
  );
  
  return fallback;
}

/**
 * Mappe les noms d'icônes invalides vers des icônes valides
 */
const ICON_NAME_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  livestock: 'paw-outline', // Icône alternative pour "livestock"
};

/**
 * Normalise un nom d'icône en utilisant le mapping si nécessaire
 */
export function normalizeIconName(
  iconName: string,
  fallback: keyof typeof Ionicons.glyphMap = 'help-circle-outline'
): keyof typeof Ionicons.glyphMap {
  // Vérifier d'abord le mapping
  if (iconName in ICON_NAME_MAP) {
    return ICON_NAME_MAP[iconName];
  }
  
  // Vérifier si l'icône est valide
  if (isValidIconName(iconName)) {
    return iconName as keyof typeof Ionicons.glyphMap;
  }
  
  // Utiliser le fallback
  console.warn(
    `⚠️ [IconValidation] Nom d'icône invalide: "${iconName}". Utilisation du fallback: "${fallback}"`
  );
  
  return fallback;
}

