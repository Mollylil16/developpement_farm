/**
 * Hook pour précharger intelligemment les données des écrans
 * Améliore la fluidité de navigation en préchargeant les données avant l'arrivée sur l'écran
 */

import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

interface PreloadConfig {
  /**
   * Fonction pour précharger les données
   */
  preloadFn: () => Promise<void> | void;
  
  /**
   * Délai avant de précharger (en ms) - pour éviter de précharger trop tôt
   */
  delay?: number;
  
  /**
   * Durée de validité du cache (en ms) - les données seront rechargées après ce délai
   */
  cacheTime?: number;
  
  /**
   * Si true, précharge uniquement quand l'écran est proche (dans la stack)
   */
  preloadOnFocus?: boolean;
}

interface PreloadCache {
  timestamp: number;
  data: any;
}

/**
 * Hook pour précharger les données d'un écran de manière intelligente
 * 
 * @example
 * ```tsx
 * useScreenPreloader({
 *   preloadFn: async () => {
 *     await dispatch(loadProductionAnimaux(projetActif.id));
 *   },
 *   delay: 500,
 *   cacheTime: 5 * 60 * 1000, // 5 minutes
 * });
 * ```
 */
export function useScreenPreloader(config: PreloadConfig) {
  const { preloadFn, delay = 0, cacheTime = 5 * 60 * 1000, preloadOnFocus = false } = config;
  const navigation = useNavigation<NavigationProp<any>>();
  const cacheRef = useRef<PreloadCache | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPreloadingRef = useRef(false);

  const preload = async () => {
    // Vérifier le cache
    if (cacheRef.current) {
      const age = Date.now() - cacheRef.current.timestamp;
      if (age < cacheTime) {
        return; // Cache encore valide
      }
    }

    // Éviter les préchargements multiples simultanés
    if (isPreloadingRef.current) {
      return;
    }

    try {
      isPreloadingRef.current = true;
      await preloadFn();
      
      cacheRef.current = {
        timestamp: Date.now(),
        data: null, // On ne stocke pas les données ici, juste le timestamp
      };
    } catch (error) {
      // Ignorer les erreurs de préchargement (non bloquant)
      console.warn('[useScreenPreloader] Erreur lors du préchargement:', error);
    } finally {
      isPreloadingRef.current = false;
    }
  };

  useEffect(() => {
    if (preloadOnFocus) {
      // Précharger uniquement quand l'écran est focus
      const unsubscribe = navigation.addListener('focus', () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(preload, delay);
      });

      return () => {
        unsubscribe();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    } else {
      // Précharger immédiatement (avec délai optionnel)
      if (delay > 0) {
        timeoutRef.current = setTimeout(preload, delay);
      } else {
        preload();
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [preloadFn, delay, cacheTime, preloadOnFocus]);

  return {
    preload,
    clearCache: () => {
      cacheRef.current = null;
    },
  };
}

/**
 * Hook pour précharger les données d'un écran adjacent (écran suivant dans la navigation)
 * Utile pour précharger les données de l'écran suivant quand l'utilisateur est sur l'écran actuel
 */
export function useAdjacentScreenPreloader(
  screenName: string,
  preloadFn: () => Promise<void> | void
) {
  const navigation = useNavigation<NavigationProp<any>>();
  const preloadedRef = useRef(false);

  useEffect(() => {
    // Précharger quand l'utilisateur est sur cet écran (préparation pour l'écran suivant)
    const unsubscribe = navigation.addListener('focus', () => {
      if (!preloadedRef.current) {
        preloadFn();
        preloadedRef.current = true;
      }
    });

    return unsubscribe;
  }, [screenName, preloadFn]);
}

