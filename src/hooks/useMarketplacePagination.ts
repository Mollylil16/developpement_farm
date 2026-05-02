/**
 * Hook pour la pagination et le lazy loading du Marketplace
 * Optimise les performances en chargeant les données par pages
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { MarketplaceListing, FarmCard } from '../types/marketplace';
import apiClient from '../services/api/apiClient';
import marketplaceCache, { DEFAULT_PAGE_SIZE } from '../services/marketplaceCache';
import { createLoggerWithPrefix } from '../utils/logger';

const logger = createLoggerWithPrefix('useMarketplacePagination');

interface UsePaginationOptions {
  pageSize?: number;
  cacheKey?: string;
  enableCache?: boolean;
}

interface PaginationState<T> {
  items: T[];
  page: number;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

interface UsePaginationResult<T> {
  state: PaginationState<T>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

/**
 * Hook générique pour la pagination
 */
export function usePagination<T>(
  fetchFn: (page: number, pageSize: number) => Promise<{ items: T[]; total: number }>,
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const { pageSize = DEFAULT_PAGE_SIZE, cacheKey, enableCache = true } = options;
  
  const [state, setState] = useState<PaginationState<T>>({
    items: [],
    page: 0,
    total: 0,
    hasMore: true,
    isLoading: false,
    isLoadingMore: false,
    error: null,
  });
  
  const isLoadingRef = useRef(false);

  const loadPage = useCallback(async (targetPage: number, isRefresh: boolean = false) => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    
    setState(prev => ({
      ...prev,
      isLoading: isRefresh || targetPage === 1,
      isLoadingMore: !isRefresh && targetPage > 1,
      error: null,
    }));

    try {
      const { items, total } = await fetchFn(targetPage, pageSize);
      
      setState(prev => {
        const newItems = isRefresh || targetPage === 1 
          ? items 
          : [...prev.items, ...items];
        
        return {
          items: newItems,
          page: targetPage,
          total,
          hasMore: items.length === pageSize && newItems.length < total,
          isLoading: false,
          isLoadingMore: false,
          error: null,
        };
      });
    } catch (error: any) {
      logger.error('Erreur chargement page:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isLoadingMore: false,
        error: error.message || 'Erreur de chargement',
      }));
    } finally {
      isLoadingRef.current = false;
    }
  }, [fetchFn, pageSize]);

  const loadMore = useCallback(async () => {
    if (state.hasMore && !state.isLoadingMore && !state.isLoading) {
      await loadPage(state.page + 1);
    }
  }, [state.hasMore, state.isLoadingMore, state.isLoading, state.page, loadPage]);

  const refresh = useCallback(async () => {
    await loadPage(1, true);
  }, [loadPage]);

  const reset = useCallback(() => {
    setState({
      items: [],
      page: 0,
      total: 0,
      hasMore: true,
      isLoading: false,
      isLoadingMore: false,
      error: null,
    });
  }, []);

  // Chargement initial
  useEffect(() => {
    if (state.page === 0 && !state.isLoading) {
      loadPage(1);
    }
  }, []);

  return { state, loadMore, refresh, reset };
}

/**
 * Hook spécialisé pour les listings du Marketplace
 */
export function useMarketplaceListingsPagination(
  params: Record<string, any>,
  options: UsePaginationOptions = {}
) {
  const { pageSize = DEFAULT_PAGE_SIZE, enableCache = true } = options;
  
  const cacheKey = `listings:${JSON.stringify(params)}`;
  
  const fetchListings = useCallback(async (page: number, size: number) => {
    // Vérifier le cache d'abord
    if (enableCache && page === 1) {
      const cached = marketplaceCache.getListings(params);
      if (cached) {
        return { items: cached.slice(0, size), total: cached.length };
      }
    }
    
    const response = await apiClient.get<{
      listings: MarketplaceListing[];
      total: number;
      page: number;
      pageSize: number;
    }>('/marketplace/listings', {
      params: {
        ...params,
        page,
        pageSize: size,
      },
    });
    
    // Si c'est un ancien format sans pagination
    if (Array.isArray(response)) {
      return { items: response, total: response.length };
    }
    
    return { items: response.listings || [], total: response.total || 0 };
  }, [params, enableCache]);

  return usePagination(fetchListings, { pageSize, cacheKey, enableCache });
}

/**
 * Hook pour les fermes groupées avec pagination
 */
export function useMarketplaceFarmsPagination(
  params: Record<string, any>,
  options: UsePaginationOptions = {}
) {
  const { pageSize = DEFAULT_PAGE_SIZE, enableCache = true } = options;
  
  const fetchFarms = useCallback(async (page: number, size: number) => {
    // Vérifier le cache d'abord
    if (enableCache && page === 1) {
      const cached = marketplaceCache.getFarms(params);
      if (cached) {
        return { items: cached.slice(0, size), total: cached.length };
      }
    }
    
    const response = await apiClient.get<{
      farms: FarmCard[];
      total: number;
    }>('/marketplace/farms', {
      params: {
        ...params,
        page,
        pageSize: size,
      },
    });
    
    // Si c'est un ancien format
    if (Array.isArray(response)) {
      if (enableCache) {
        marketplaceCache.setFarms(params, response);
      }
      return { items: response, total: response.length };
    }
    
    if (enableCache && response.farms) {
      marketplaceCache.setFarms(params, response.farms);
    }
    
    return { items: response.farms || [], total: response.total || 0 };
  }, [params, enableCache]);

  return usePagination(fetchFarms, { pageSize });
}

/**
 * Hook pour l'enrichissement batch des listings
 * Évite les appels API en cascade
 */
export function useListingsEnrichment() {
  const [isEnriching, setIsEnriching] = useState(false);
  
  const enrichListings = useCallback(async (
    listings: MarketplaceListing[]
  ): Promise<MarketplaceListing[]> => {
    if (listings.length === 0) return [];
    
    setIsEnriching(true);
    
    try {
      // Vérifier le cache d'abord
      const listingIds = listings.map(l => l.id);
      const { found, missing } = marketplaceCache.getEnrichedListingsBatch(listingIds);
      
      // Si tout est en cache, retourner directement
      if (missing.length === 0) {
        setIsEnriching(false);
        return listings.map(l => found.get(l.id) || l);
      }
      
      // Enrichir uniquement les listings manquants via un appel batch
      const missingListings = listings.filter(l => missing.includes(l.id));
      
      // Appel batch pour enrichir plusieurs listings à la fois
      const enrichedResponse = await apiClient.post<MarketplaceListing[]>(
        '/marketplace/listings/enrich-batch',
        { listingIds: missing }
      );
      
      // Mettre en cache les résultats
      if (Array.isArray(enrichedResponse)) {
        enrichedResponse.forEach(listing => {
          marketplaceCache.setEnrichedListing(listing.id, listing);
        });
      }
      
      // Combiner les résultats du cache et de l'API
      const enrichedMap = new Map<string, MarketplaceListing>();
      
      // D'abord, ajouter les items du cache
      found.forEach((listing, id) => {
        enrichedMap.set(id, listing);
      });
      
      // Puis, ajouter les nouveaux enrichis
      if (Array.isArray(enrichedResponse)) {
        enrichedResponse.forEach(listing => {
          enrichedMap.set(listing.id, listing);
        });
      }
      
      // Retourner dans l'ordre original
      return listings.map(l => enrichedMap.get(l.id) || l);
    } catch (error) {
      logger.error('Erreur enrichissement batch:', error);
      // En cas d'erreur, retourner les listings originaux
      return listings;
    } finally {
      setIsEnriching(false);
    }
  }, []);

  return { enrichListings, isEnriching };
}

/**
 * Hook pour le groupement par ferme optimisé
 */
export function useFarmGrouping() {
  const [isGrouping, setIsGrouping] = useState(false);
  
  const groupByFarm = useCallback(async (
    listings: MarketplaceListing[]
  ): Promise<FarmCard[]> => {
    if (listings.length === 0) return [];
    
    setIsGrouping(true);
    
    try {
      // Grouper localement par farmId
      const farmMap = new Map<string, {
        listings: MarketplaceListing[];
        totalPrice: number;
        totalWeight: number;
      }>();
      
      for (const listing of listings) {
        const farmId = listing.farmId;
        const existing = farmMap.get(farmId);
        
        if (existing) {
          existing.listings.push(listing);
          existing.totalPrice += listing.calculatedPrice || 0;
          existing.totalWeight += listing.weight || 0;
        } else {
          farmMap.set(farmId, {
            listings: [listing],
            totalPrice: listing.calculatedPrice || 0,
            totalWeight: listing.weight || 0,
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
          averageWeight: data.totalWeight / data.listings.length,
          priceRange: {
            min: Math.min(...data.listings.map(l => l.pricePerKg)),
            max: Math.max(...data.listings.map(l => l.pricePerKg)),
          },
          listings: data.listings,
          representativeListing: firstListing,
        });
      }
      
      // Trier par nombre de sujets décroissant
      farms.sort((a, b) => b.subjectCount - a.subjectCount);
      
      return farms;
    } catch (error) {
      logger.error('Erreur groupement par ferme:', error);
      return [];
    } finally {
      setIsGrouping(false);
    }
  }, []);

  return { groupByFarm, isGrouping };
}

export default usePagination;
