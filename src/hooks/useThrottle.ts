/**
 * Hook pour throttle (limiter la fréquence des appels)
 * Utile pour les événements fréquents comme scroll, resize, etc.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Throttle une valeur avec un délai minimum entre les mises à jour
 * @param value La valeur à throttle
 * @param limit Le délai minimum en millisecondes (défaut: 300ms)
 * @returns La valeur throttlée
 */
export function useThrottle<T>(value: T, limit: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * Crée une fonction throttlée qui ne s'exécute qu'une fois par intervalle
 * @param fn La fonction à throttle
 * @param limit Le délai minimum entre les exécutions (défaut: 300ms)
 * @returns La fonction throttlée
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  fn: T,
  limit: number = 300
): T {
  const lastRan = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);

  const throttledFn = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRan.current >= limit) {
      // Exécuter immédiatement
      lastRan.current = now;
      return fn(...args);
    } else {
      // Sauvegarder les args pour exécution différée
      pendingArgsRef.current = args;
      
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          if (pendingArgsRef.current) {
            lastRan.current = Date.now();
            fn(...pendingArgsRef.current);
            pendingArgsRef.current = null;
          }
          timeoutRef.current = null;
        }, limit - (now - lastRan.current));
      }
    }
  }, [fn, limit]) as T;

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledFn;
}

export default useThrottle;
