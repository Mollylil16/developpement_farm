/**
 * Hook pour gérer un cache d'appels API
 * Évite les appels répétés pour les mêmes données
 */

import { useRef, useCallback } from 'react';
import { logger } from '../utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  projetId?: string;
}

interface CacheConfig {
  ttl?: number; // Time to live en millisecondes (défaut: 30 secondes)
  key?: string; // Clé de cache personnalisée
}

const DEFAULT_TTL = 30000; // 30 secondes

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private ttls = new Map<string, number>(); // Stocke le TTL pour chaque clé

  /**
   * Récupère une entrée du cache si elle existe et n'est pas expirée
   */
  get<T>(key: string, projetId?: string, ttl?: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Vérifier si l'entrée est pour le même projet
    if (projetId && entry.projetId !== projetId) {
      this.cache.delete(key);
      this.ttls.delete(key);
      return null;
    }

    // Vérifier si l'entrée est expirée
    const now = Date.now();
    const entryTtl = ttl || this.ttls.get(key) || DEFAULT_TTL;
    if (now - entry.timestamp > entryTtl) {
      this.cache.delete(key);
      this.ttls.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Stocke une entrée dans le cache
   */
  set<T>(key: string, data: T, projetId?: string, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      projetId,
    });
    if (ttl) {
      this.ttls.set(key, ttl);
    }
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.ttls.delete(key);
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Nettoie les entrées expirées
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const ttl = this.ttls.get(key) || DEFAULT_TTL;
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
        this.ttls.delete(key);
      }
    }
  }
}

// Instance globale du cache
const globalCache = new ApiCache();

// Nettoyer le cache toutes les minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    globalCache.cleanup();
  }, 60000); // Toutes les minutes
}

/**
 * Hook pour utiliser le cache API avec une fonction de chargement
 * @param loadFn Fonction qui charge les données depuis l'API
 * @param cacheKey Clé unique pour le cache
 * @param config Configuration du cache
 */
export function useApiCache<T>(
  loadFn: () => Promise<T>,
  cacheKey: string,
  config?: CacheConfig
): {
  load: () => Promise<T>;
  clearCache: () => void;
} {
  const projetIdRef = useRef<string | undefined>();

  const load = useCallback(async (): Promise<T> => {
    const ttl = config?.ttl || DEFAULT_TTL;
    const key = config?.key || cacheKey;

    // Vérifier le cache
    const cached = globalCache.get<T>(key, projetIdRef.current, ttl);
    if (cached) {
      logger.debug(`[useApiCache] Cache hit pour ${key}`);
      return cached;
    }

    // Charger depuis l'API
    logger.debug(`[useApiCache] Cache miss pour ${key}, chargement depuis l'API`);
    const data = await loadFn();
    
    // Stocker dans le cache avec le TTL
    globalCache.set(key, data, projetIdRef.current, ttl);

    return data;
  }, [loadFn, cacheKey, config]);

  const clearCache = useCallback(() => {
    const key = config?.key || cacheKey;
    globalCache.delete(key);
  }, [cacheKey, config]);

  return { load, clearCache };
}

/**
 * Hook pour charger des données uniquement quand l'écran est visible
 * Combine useFocusEffect avec le cache API
 * Note: Ce hook nécessite d'être utilisé dans un contexte de navigation React Navigation
 * 
 * Exemple d'utilisation:
 * ```tsx
 * const { data, loading, error, refresh } = useFocusedApiLoad(
 *   () => apiClient.get('/endpoint'),
 *   'cache-key',
 *   [projetId]
 * );
 * ```
 */
export function useFocusedApiLoad<T>(
  loadFn: () => Promise<T>,
  cacheKey: string,
  dependencies: any[] = [],
  config?: CacheConfig
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  // Import dynamique pour éviter les erreurs si React Navigation n'est pas disponible
  const React = require('react');
  const { useFocusEffect } = require('@react-navigation/native');
  
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const { load, clearCache } = useApiCache(loadFn, cacheKey, config);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;

      const fetchData = async () => {
        if (cancelled) return;

        setLoading(true);
        setError(null);

        try {
          const result = await load();
          if (!cancelled) {
            setData(result);
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      fetchData();

      return () => {
        cancelled = true;
      };
    }, [load, ...dependencies])
  );

  const refresh = React.useCallback(async () => {
    clearCache();
    setLoading(true);
    setError(null);

    try {
      const result = await loadFn();
      globalCache.set(cacheKey, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [loadFn, cacheKey, clearCache]);

  return { data, loading, error, refresh };
}

export default globalCache;

