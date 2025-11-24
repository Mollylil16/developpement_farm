/**
 * Utilitaires pour créer des effets néomorphiques
 * Le néomorphisme crée un effet 3D en utilisant des ombres multiples
 */

import { ViewStyle } from 'react-native';

export interface NeomorphismStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
  backgroundColor: string;
  borderWidth?: number;
  borderColor?: string;
}

/**
 * Génère un style néomorphique "pressed" (enfoncé)
 * Pour les éléments qui semblent être enfoncés dans la surface
 */
export function getNeomorphismPressed(
  backgroundColor: string,
  isDark: boolean = false
): NeomorphismStyle {
  if (isDark) {
    // En mode sombre, le néomorphisme est moins visible, on utilise des ombres plus subtiles
    return {
      shadowColor: '#000000',
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 2,
      backgroundColor,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
    };
  }

  // Mode clair : effet néomorphique classique
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  };
}

/**
 * Génère un style néomorphique "raised" (surélevé)
 * Pour les éléments qui semblent sortir de la surface
 */
export function getNeomorphismRaised(
  backgroundColor: string,
  isDark: boolean = false
): NeomorphismStyle {
  if (isDark) {
    // En mode sombre, effet plus subtil avec ombres sombres
    return {
      shadowColor: '#000000',
      shadowOffset: { width: -3, height: -3 },
      shadowOpacity: 0.5,
      shadowRadius: 6,
      elevation: 8,
      backgroundColor,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    };
  }

  // Mode clair : effet néomorphique classique avec ombres claires et sombres
  // Utilise deux ombres : une claire (haut-gauche) et une sombre (bas-droite)
  // Note: React Native ne supporte qu'une seule ombre, donc on utilise l'ombre claire principale
  // et on ajoute une bordure pour simuler l'ombre sombre
  return {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -8, height: -8 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
    backgroundColor,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  };
}

/**
 * Génère un style néomorphique "flat" (plat avec effet subtil)
 * Pour les éléments qui ont un léger effet 3D
 */
export function getNeomorphismFlat(
  backgroundColor: string,
  isDark: boolean = false
): NeomorphismStyle {
  if (isDark) {
    return {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 3,
      backgroundColor,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    };
  }

  // Mode clair : effet subtil avec ombres douces
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    backgroundColor,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  };
}

/**
 * Convertit un style néomorphique en ViewStyle pour React Native
 */
export function neomorphismToStyle(neomorphism: NeomorphismStyle): ViewStyle {
  return {
    backgroundColor: neomorphism.backgroundColor,
    shadowColor: neomorphism.shadowColor,
    shadowOffset: neomorphism.shadowOffset,
    shadowOpacity: neomorphism.shadowOpacity,
    shadowRadius: neomorphism.shadowRadius,
    elevation: neomorphism.elevation,
    borderWidth: neomorphism.borderWidth || 0,
    borderColor: neomorphism.borderColor,
  };
}
