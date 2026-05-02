/**
 * Hook pour debouncer une valeur
 * Utile pour les recherches et autres inputs qui déclenchent des calculs coûteux
 */

import { useState, useEffect } from 'react';

/**
 * Debounce une valeur avec un délai spécifié
 * @param value La valeur à debouncer
 * @param delay Le délai en millisecondes (défaut: 300ms)
 * @returns La valeur debouncée
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Créer un timer pour mettre à jour la valeur après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timer si la valeur change avant la fin du délai
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

