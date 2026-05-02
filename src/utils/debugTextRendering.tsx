/**
 * Utilitaire de débogage pour identifier les problèmes de rendu de texte
 * Wrapper pour détecter les strings rendues directement dans des View
 */

import React from 'react';
import { Text } from 'react-native';

/**
 * Wrapper pour sécuriser le rendu des enfants
 * Détecte et corrige les strings rendues directement
 */
export function SafeChildren({ children }: { children: React.ReactNode }) {
  // Si children est une string, la wrapper dans un Text
  if (typeof children === 'string') {
    console.warn('⚠️ [SafeChildren] String détectée directement, wrapping dans <Text>');
    return <Text>{children}</Text>;
  }

  // Si children est un nombre, le wrapper dans un Text
  if (typeof children === 'number') {
    console.warn('⚠️ [SafeChildren] Number détecté directement, wrapping dans <Text>');
    return <Text>{children}</Text>;
  }

  // Si children est null ou undefined, retourner null
  if (children === null || children === undefined) {
    return null;
  }

  // Sinon, retourner tel quel
  return <>{children}</>;
}

/**
 * Hook pour déboguer les valeurs qui pourraient être rendues directement
 */
export function useDebugValue(value: unknown, label: string) {
  React.useEffect(() => {
    if (typeof value === 'string' || typeof value === 'number') {
      console.warn(`⚠️ [useDebugValue] ${label} est une valeur primitive:`, value);
    }
  }, [value, label]);
}
