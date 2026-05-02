/**
 * Hook optimisé pour charger les données du marketplace
 * 
 * Fonctionnalités:
 * - Cache local pour éviter les appels redondants
 * - Debounce automatique des recherches
 * - Gestion des états de chargement
 * - Nettoyage automatique lors du démontage
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import marketplaceService from '../services/MarketplaceService';
import { logger } from '../utils/logger';

interface MarketplaceDataOptions {
  /** Durée du cache en ms (défaut: 30s) */
  cacheDuration?: number;
  /** Forcer le rechargement */
  forceReload?: boolean;
  /** Callback après chargement */
  onLoaded?: () => void;
  /** Callback en cas d'erreur */
  onError?: (error: Error) => void;
  /** Activer le chargement automatique */
  autoLoad?: boolean;
}

interface MarketplaceFilters {
  tab?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  region?: string;
  sortBy?: string;
  excludeOwnListings?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  filters: string;
}

const DEFAULT_CACHE_DURATION = 30000; // 30 secondes

export function useMarketplaceData(options: MarketplaceDataOptions = {}) {
  const {
    cacheDuration = DEFAULT_CACHE_DURATION,
    forceReload = false,
    onLoaded,
    onError,
    autoLoad = true,
  } = options;

  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  // États
  const [listings, setListings] = useState<any[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<any[]>([]);
  const [sentOffers, setSentOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs pour le cache et le debounce
  const listingsCache = useRef<CacheEntry<any[]> | null>(null);
  const offersCache = useRef<{ received: CacheEntry<any[]> | null; sent: CacheEntry<any[]> | null }>({
    received: null,
    sent: null,
  });
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Vérifier si le cache est valide
  const isCacheValid = useCallback((cache: CacheEntry<any> | null, currentFilters: string): boolean => {
    if (!cache || forceReload) return false;
    const now = Date.now();
    return (now - cache.timestamp < cacheDuration) && (cache.filters === currentFilters);
  }, [cacheDuration, forceReload]);

  // Charger les listings avec cache et debounce
  const loadListings = useCallback(async (filters: MarketplaceFilters = {}) => {
    const filtersKey = JSON.stringify(filters);
    
    // Vérifier le cache
    if (isCacheValid(listingsCache.current, filtersKey)) {
      logger.debug('[useMarketplaceData] Cache hit pour listings');
      setListings(listingsCache.current!.data);
      return listingsCache.current!.data;
    }

    // Annuler la requête précédente
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const params: any = {
        limit: 50,
        exclude_own_listings: filters.excludeOwnListings ?? true,
      };
      
      if (filters.region) params.region = filters.region;
      if (filters.sortBy) params.sort = filters.sortBy;
      
      const data = await marketplaceService.getListings(params);
      
      if (!mountedRef.current) return [];
      
      // Mettre en cache
      listingsCache.current = {
        data: data || [],
        timestamp: Date.now(),
        filters: filtersKey,
      };
      
      setListings(data || []);
      onLoaded?.();
      
      logger.debug(`[useMarketplaceData] ${data?.length || 0} listings chargés`);
      return data || [];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        logger.debug('[useMarketplaceData] Requête annulée');
        return [];
      }
      
      if (!mountedRef.current) return [];
      
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      logger.error('[useMarketplaceData] Erreur chargement listings:', err);
      return [];
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isCacheValid, onLoaded, onError]);

  // Charger les listings avec debounce (pour recherche)
  const loadListingsDebounced = useCallback((filters: MarketplaceFilters, delay = 300) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    debounceTimeout.current = setTimeout(() => {
      loadListings(filters);
    }, delay);
  }, [loadListings]);

  // Charger les offres reçues
  const loadReceivedOffers = useCallback(async () => {
    if (!user?.id) return [];
    
    const cacheKey = `received_${user.id}`;
    if (isCacheValid(offersCache.current.received, cacheKey)) {
      logger.debug('[useMarketplaceData] Cache hit pour offres reçues');
      return offersCache.current.received!.data;
    }

    try {
      const data = await marketplaceService.getReceivedOffers();
      
      if (!mountedRef.current) return [];
      
      offersCache.current.received = {
        data: data || [],
        timestamp: Date.now(),
        filters: cacheKey,
      };
      
      setReceivedOffers(data || []);
      return data || [];
    } catch (err) {
      logger.error('[useMarketplaceData] Erreur chargement offres reçues:', err);
      return [];
    }
  }, [user?.id, isCacheValid]);

  // Charger les offres envoyées
  const loadSentOffers = useCallback(async () => {
    if (!user?.id) return [];
    
    const cacheKey = `sent_${user.id}`;
    if (isCacheValid(offersCache.current.sent, cacheKey)) {
      logger.debug('[useMarketplaceData] Cache hit pour offres envoyées');
      return offersCache.current.sent!.data;
    }

    try {
      const data = await marketplaceService.getMyOffers();
      
      if (!mountedRef.current) return [];
      
      offersCache.current.sent = {
        data: data || [],
        timestamp: Date.now(),
        filters: cacheKey,
      };
      
      setSentOffers(data || []);
      return data || [];
    } catch (err) {
      logger.error('[useMarketplaceData] Erreur chargement offres envoyées:', err);
      return [];
    }
  }, [user?.id, isCacheValid]);

  // Charger toutes les données
  const loadAll = useCallback(async (filters: MarketplaceFilters = {}) => {
    setLoading(true);
    
    try {
      // Charger en parallèle
      await Promise.all([
        loadListings(filters),
        loadReceivedOffers(),
        loadSentOffers(),
      ]);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [loadListings, loadReceivedOffers, loadSentOffers]);

  // Invalider le cache
  const invalidateCache = useCallback(() => {
    listingsCache.current = null;
    offersCache.current = { received: null, sent: null };
    logger.debug('[useMarketplaceData] Cache invalidé');
  }, []);

  // Rafraîchir les données
  const refresh = useCallback(async (filters: MarketplaceFilters = {}) => {
    invalidateCache();
    await loadAll(filters);
  }, [invalidateCache, loadAll]);

  // Nettoyage au démontage
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  // Chargement automatique
  useEffect(() => {
    if (autoLoad && user?.id) {
      loadAll();
    }
  }, [autoLoad, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Données
    listings,
    receivedOffers,
    sentOffers,
    
    // États
    loading,
    error,
    
    // Actions
    loadListings,
    loadListingsDebounced,
    loadReceivedOffers,
    loadSentOffers,
    loadAll,
    refresh,
    invalidateCache,
  };
}

export default useMarketplaceData;
