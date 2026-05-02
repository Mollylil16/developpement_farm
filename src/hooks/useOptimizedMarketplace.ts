/**
 * Hook optimisé pour le Marketplace
 * - Pagination et lazy loading
 * - Cache intelligent
 * - Enrichissement batch
 * - Groupement par ferme optimisé
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MarketplaceListing, FarmCard, MarketplaceFilters } from '../types/marketplace';
import apiClient from '../services/api/apiClient';
import marketplaceCache, { DEFAULT_PAGE_SIZE } from '../services/marketplaceCache';
import { createLoggerWithPrefix } from '../utils/logger';
import { useAppSelector } from '../store/hooks';

const logger = createLoggerWithPrefix('useOptimizedMarketplace');

interface UseOptimizedMarketplaceOptions {
  pageSize?: number;
  enableCache?: boolean;
  autoLoad?: boolean;
}

interface MarketplaceState {
  listings: MarketplaceListing[];
  farms: FarmCard[];
  total: number;
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  isGrouping: boolean;
  error: string | null;
}

interface UseOptimizedMarketplaceResult {
  state: MarketplaceState;
  loadListings: (filters?: Record<string, any>) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  groupByFarm: (listings: MarketplaceListing[]) => Promise<FarmCard[]>;
  invalidateCache: () => void;
}

/**
 * Hook principal pour le Marketplace optimisé
 */
export function useOptimizedMarketplace(
  options: UseOptimizedMarketplaceOptions = {}
): UseOptimizedMarketplaceResult {
  const { pageSize = DEFAULT_PAGE_SIZE, enableCache = true, autoLoad = true } = options;
  
  const [state, setState] = useState<MarketplaceState>({
    listings: [],
    farms: [],
    total: 0,
    page: 0,
    hasMore: true,
    isLoading: false,
    isLoadingMore: false,
    isGrouping: false,
    error: null,
  });
  
  const currentFiltersRef = useRef<Record<string, any>>({});
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Charger les listings avec pagination
  const loadListings = useCallback(async (filters: Record<string, any> = {}) => {
    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    currentFiltersRef.current = filters;
    const cacheKey = `listings:${JSON.stringify(filters)}`;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      listings: [], // Reset lors d'un nouveau chargement
      farms: [],
    }));

    try {
      // Vérifier le cache d'abord
      if (enableCache) {
        const cachedListings = marketplaceCache.getListings(filters);
        if (cachedListings) {
          logger.debug('[Cache HIT] Utilisation du cache pour les listings');
          setState(prev => ({
            ...prev,
            listings: cachedListings.slice(0, pageSize),
            total: cachedListings.length,
            page: 1,
            hasMore: cachedListings.length > pageSize,
            isLoading: false,
          }));
          isLoadingRef.current = false;
          return;
        }
      }

      // Appeler l'API avec pagination
      const response = await apiClient.get<{
        listings: MarketplaceListing[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
      }>('/marketplace/listings', {
        params: {
          ...filters,
          page: 1,
          pageSize,
        },
      });

      // Gérer l'ancien format (tableau direct) et le nouveau format (objet paginé)
      let listings: MarketplaceListing[];
      let total: number;
      let hasMore: boolean;

      if (Array.isArray(response)) {
        // Ancien format
        listings = response;
        total = response.length;
        hasMore = false;
        
        // Mettre en cache
        if (enableCache) {
          marketplaceCache.setListings(filters, listings);
        }
      } else {
        // Nouveau format paginé
        listings = response.listings || [];
        total = response.total || 0;
        hasMore = response.hasMore ?? (listings.length === pageSize);
        
        // Mettre en cache si on a tout récupéré
        if (enableCache && !hasMore) {
          marketplaceCache.setListings(filters, listings);
        }
      }

      setState(prev => ({
        ...prev,
        listings,
        total,
        page: 1,
        hasMore,
        isLoading: false,
      }));

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Requête annulée, ignorer
        return;
      }
      logger.error('Erreur chargement listings:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erreur de chargement',
      }));
    } finally {
      isLoadingRef.current = false;
    }
  }, [pageSize, enableCache]);

  // Charger plus de listings (pagination infinie)
  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.isLoadingMore || state.isLoading || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setState(prev => ({ ...prev, isLoadingMore: true }));

    try {
      const nextPage = state.page + 1;
      
      const response = await apiClient.get<{
        listings: MarketplaceListing[];
        total: number;
        hasMore: boolean;
      }>('/marketplace/listings', {
        params: {
          ...currentFiltersRef.current,
          page: nextPage,
          pageSize,
        },
      });

      let newListings: MarketplaceListing[];
      let hasMore: boolean;

      if (Array.isArray(response)) {
        newListings = response;
        hasMore = false;
      } else {
        newListings = response.listings || [];
        hasMore = response.hasMore ?? (newListings.length === pageSize);
      }

      setState(prev => ({
        ...prev,
        listings: [...prev.listings, ...newListings],
        page: nextPage,
        hasMore,
        isLoadingMore: false,
      }));

    } catch (error: any) {
      logger.error('Erreur chargement page suivante:', error);
      setState(prev => ({
        ...prev,
        isLoadingMore: false,
        error: error.message || 'Erreur de chargement',
      }));
    } finally {
      isLoadingRef.current = false;
    }
  }, [state.hasMore, state.isLoadingMore, state.isLoading, state.page, pageSize]);

  // Rafraîchir les listings
  const refresh = useCallback(async () => {
    // Invalider le cache pour les filtres actuels
    if (enableCache) {
      marketplaceCache.invalidateForProject(currentFiltersRef.current.projet_id || '');
    }
    await loadListings(currentFiltersRef.current);
  }, [loadListings, enableCache]);

  // Grouper par ferme de manière optimisée
  const groupByFarm = useCallback(async (listings: MarketplaceListing[]): Promise<FarmCard[]> => {
    if (listings.length === 0) return [];

    setState(prev => ({ ...prev, isGrouping: true }));

    try {
      // Vérifier le cache
      const cacheKey = { ...currentFiltersRef.current, type: 'farms' };
      if (enableCache) {
        const cachedFarms = marketplaceCache.getFarms(cacheKey);
        if (cachedFarms) {
          setState(prev => ({
            ...prev,
            farms: cachedFarms,
            isGrouping: false,
          }));
          return cachedFarms;
        }
      }

      // Grouper localement pour éviter un appel API
      const farmMap = new Map<string, {
        listings: MarketplaceListing[];
        totalPrice: number;
        totalWeight: number;
        minPrice: number;
        maxPrice: number;
      }>();

      for (const listing of listings) {
        const farmId = listing.farmId;
        const existing = farmMap.get(farmId);

        if (existing) {
          existing.listings.push(listing);
          existing.totalPrice += listing.calculatedPrice || 0;
          existing.totalWeight += listing.weight || 0;
          existing.minPrice = Math.min(existing.minPrice, listing.pricePerKg);
          existing.maxPrice = Math.max(existing.maxPrice, listing.pricePerKg);
        } else {
          farmMap.set(farmId, {
            listings: [listing],
            totalPrice: listing.calculatedPrice || 0,
            totalWeight: listing.weight || 0,
            minPrice: listing.pricePerKg,
            maxPrice: listing.pricePerKg,
          });
        }
      }

      // Créer les FarmCards
      const farms: FarmCard[] = [];

      for (const [farmId, data] of farmMap) {
        const firstListing = data.listings[0];

        farms.push({
          id: farmId,
          farmId,
          farmName: `Ferme #${farmId.slice(0, 8)}`,
          producerId: firstListing.producerId,
          location: firstListing.location,
          subjectCount: data.listings.length,
          totalPrice: data.totalPrice,
          averageWeight: data.listings.length > 0 ? data.totalWeight / data.listings.length : 0,
          priceRange: {
            min: data.minPrice,
            max: data.maxPrice,
          },
          listings: data.listings,
          representativeListing: firstListing,
        });
      }

      // Trier par nombre de sujets décroissant
      farms.sort((a, b) => b.subjectCount - a.subjectCount);

      // Mettre en cache
      if (enableCache) {
        marketplaceCache.setFarms(cacheKey, farms);
      }

      setState(prev => ({
        ...prev,
        farms,
        isGrouping: false,
      }));

      return farms;
    } catch (error) {
      logger.error('Erreur groupement par ferme:', error);
      setState(prev => ({ ...prev, isGrouping: false }));
      return [];
    }
  }, [enableCache]);

  // Invalider le cache
  const invalidateCache = useCallback(() => {
    marketplaceCache.invalidateAll();
    setState(prev => ({
      ...prev,
      listings: [],
      farms: [],
      page: 0,
      hasMore: true,
    }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    state,
    loadListings,
    loadMore,
    refresh,
    groupByFarm,
    invalidateCache,
  };
}

/**
 * Hook pour le chat Kouakou avec pagination des messages
 */
export function useOptimizedChatHistory(conversationId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20; // Charger 20 messages à la fois au lieu de 100

  const loadMessages = useCallback(async (reset: boolean = false) => {
    if (!conversationId) return;
    if (!reset && (isLoading || !hasMore)) return;

    setIsLoading(true);
    const targetPage = reset ? 1 : page;

    try {
      // Pour le chat, on peut charger depuis le stockage local
      // ou implémenter un endpoint paginé au backend
      const response = await apiClient.get<{
        messages: any[];
        total: number;
        hasMore: boolean;
      }>('/kouakou/history', {
        params: {
          conversationId,
          page: targetPage,
          pageSize,
        },
      });

      if (Array.isArray(response)) {
        // Ancien format
        const allMessages = response;
        const startIndex = (targetPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageMessages = allMessages.slice(startIndex, endIndex).reverse();
        
        if (reset) {
          setMessages(pageMessages);
        } else {
          setMessages(prev => [...pageMessages, ...prev]);
        }
        setHasMore(endIndex < allMessages.length);
      } else {
        // Nouveau format paginé
        const newMessages = response.messages || [];
        
        if (reset) {
          setMessages(newMessages.reverse());
        } else {
          setMessages(prev => [...newMessages.reverse(), ...prev]);
        }
        setHasMore(response.hasMore ?? false);
      }

      setPage(targetPage + 1);
    } catch (error) {
      logger.error('Erreur chargement historique chat:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading, hasMore, page]);

  const refresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    loadMessages(true);
  }, [loadMessages]);

  const loadMore = useCallback(() => {
    loadMessages(false);
  }, [loadMessages]);

  return {
    messages,
    isLoading,
    hasMore,
    loadMessages: refresh,
    loadMore,
    setMessages,
  };
}

export default useOptimizedMarketplace;
