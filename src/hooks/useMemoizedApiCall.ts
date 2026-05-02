/**
 * Hook pour mémoriser les appels API avec cache et deduplication
 * 
 * Fonctionnalités:
 * - Cache en mémoire avec TTL
 * - Déduplication des requêtes en cours
 * - Rafraîchissement automatique optionnel
 * - AbortController pour annuler les requêtes
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '../utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

interface UseMemoizedApiCallOptions {
  /** Durée du cache en ms (défaut: 60s) */
  ttl?: number;
  /** Clé unique pour le cache */
  cacheKey: string;
  /** Activer le cache (défaut: true) */
  enabled?: boolean;
  /** Rafraîchir automatiquement quand le TTL expire */
  autoRefresh?: boolean;
}

// Cache global partagé entre les instances
const globalCache = new Map<string, CacheEntry<any>>();

// Requêtes en cours (pour déduplication)
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Hook pour mémoriser les appels API
 */
export function useMemoizedApiCall<T>(
  apiCall: () => Promise<T>,
  options: UseMemoizedApiCallOptions
) {
  const { ttl = 60000, cacheKey, enabled = true, autoRefresh = false } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Vérifier si le cache est valide
  const isCacheValid = useCallback((entry: CacheEntry<T> | undefined): boolean => {
    if (!entry || !enabled) return false;
    return Date.now() - entry.timestamp < ttl;
  }, [ttl, enabled]);

  // Fonction de chargement principale
  const load = useCallback(async (forceRefresh = false): Promise<T | null> => {
    if (!enabled) return null;

    // Vérifier le cache
    const cached = globalCache.get(cacheKey) as CacheEntry<T> | undefined;
    if (!forceRefresh && isCacheValid(cached)) {
      logger.debug(`[useMemoizedApiCall] Cache hit: ${cacheKey}`);
      if (mountedRef.current) {
        setData(cached!.data);
      }
      return cached!.data;
    }

    // Vérifier si une requête est déjà en cours (déduplication)
    const pending = pendingRequests.get(cacheKey);
    if (pending && !forceRefresh) {
      logger.debug(`[useMemoizedApiCall] Requête en cours, attente: ${cacheKey}`);
      try {
        const result = await pending;
        if (mountedRef.current) {
          setData(result);
        }
        return result;
      } catch (err) {
        // La requête en cours a échoué, on ne fait rien
        return null;
      }
    }

    // Annuler la requête précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    // Créer la promesse et l'enregistrer
    const promise = apiCall();
    pendingRequests.set(cacheKey, promise);

    try {
      const result = await promise;
      
      // Mettre en cache
      globalCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }

      logger.debug(`[useMemoizedApiCall] Données chargées: ${cacheKey}`);
      return result;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        logger.debug(`[useMemoizedApiCall] Requête annulée: ${cacheKey}`);
        return null;
      }

      const error = err instanceof Error ? err : new Error(String(err));
      
      if (mountedRef.current) {
        setError(error);
        setLoading(false);
      }

      logger.error(`[useMemoizedApiCall] Erreur: ${cacheKey}`, err);
      throw error;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  }, [apiCall, cacheKey, enabled, isCacheValid]);

  // Rafraîchir (forcer le rechargement)
  const refresh = useCallback(() => {
    return load(true);
  }, [load]);

  // Invalider le cache
  const invalidate = useCallback(() => {
    globalCache.delete(cacheKey);
    logger.debug(`[useMemoizedApiCall] Cache invalidé: ${cacheKey}`);
  }, [cacheKey]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !enabled) return;

    const setupRefresh = () => {
      refreshTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          load(true).then(setupRefresh);
        }
      }, ttl);
    };

    setupRefresh();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, enabled, ttl, load]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    load,
    refresh,
    invalidate,
  };
}

/**
 * Invalider tout le cache global
 */
export function invalidateAllCache(): void {
  globalCache.clear();
  logger.debug('[useMemoizedApiCall] Tout le cache invalidé');
}

/**
 * Invalider le cache par pattern
 */
export function invalidateCacheByPattern(pattern: RegExp | string): void {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  
  for (const key of globalCache.keys()) {
    if (regex.test(key)) {
      globalCache.delete(key);
    }
  }
  
  logger.debug(`[useMemoizedApiCall] Cache invalidé par pattern: ${pattern}`);
}

export default useMemoizedApiCall;
