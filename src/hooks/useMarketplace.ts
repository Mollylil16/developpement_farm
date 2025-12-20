/**
 * Hook personnalisé pour le Marketplace
 * Gère l'état et les opérations marketplace
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  MarketplaceListing,
  MarketplaceFilters,
  MarketplaceSortOption,
  MarketplaceSearchResult,
  Offer,
  Transaction,
} from '../types/marketplace';
import { getMarketplaceService } from '../services/MarketplaceService';

export function useMarketplace() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);

  /**
   * Rechercher des annonces
   */
  const searchListings = useCallback(
    async (
      filters?: MarketplaceFilters,
      sort?: MarketplaceSortOption,
      page: number = 1
    ): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const service = getMarketplaceService();

        const result: MarketplaceSearchResult = await service.searchListings(
          filters,
          sort,
          page,
          20
        );

        if (page === 1) {
          setListings(result.listings);
        } else {
          setListings((prev) => [...prev, ...result.listings]);
        }

        setCurrentPage(result.page);
        setHasMore(result.hasMore);
        setTotalResults(result.total);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la recherche';
        setError(errorMessage);
        console.error('Error searching listings:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Charger plus de résultats (pagination)
   */
  const loadMore = useCallback(
    async (filters?: MarketplaceFilters, sort?: MarketplaceSortOption) => {
      if (!hasMore || loading) return;
      await searchListings(filters, sort, currentPage + 1);
    },
    [hasMore, loading, currentPage, searchListings]
  );

  /**
   * Rafraîchir la liste
   */
  const refresh = useCallback(
    async (filters?: MarketplaceFilters, sort?: MarketplaceSortOption) => {
      setCurrentPage(1);
      await searchListings(filters, sort, 1);
    },
    [searchListings]
  );

  return {
    listings,
    loading,
    error,
    totalResults,
    hasMore,
    currentPage,
    searchListings,
    loadMore,
    refresh,
  };
}

/**
 * Hook pour gérer les offres d'un utilisateur
 */
export function useOffers(userId: string, role: 'buyer' | 'producer') {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const service = getMarketplaceService();

      // Accéder aux repositories via le service (on ajoutera des méthodes publiques si nécessaire)
      // Pour l'instant, simulons avec un tableau vide
      // TODO: Ajouter des méthodes publiques dans MarketplaceService

      setOffers([]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des offres';
      setError(errorMessage);
      console.error('Error loading offers:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  return {
    offers,
    loading,
    error,
    reload: loadOffers,
  };
}

/**
 * Hook pour gérer les transactions d'un utilisateur
 */
export function useTransactions(userId: string, role: 'buyer' | 'producer') {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const service = getMarketplaceService();

      // TODO: Ajouter méthode getTransactions dans MarketplaceService
      setTransactions([]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des transactions';
      setError(errorMessage);
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return {
    transactions,
    loading,
    error,
    reload: loadTransactions,
  };
}

/**
 * Hook pour gérer une annonce spécifique
 */
export function useListing(listingId: string | null) {
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadListing = useCallback(async () => {
    if (!listingId) {
      setListing(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const service = getMarketplaceService();

      const result = await service.getListingDetails(listingId);
      setListing(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors du chargement de l'annonce";
      setError(errorMessage);
      console.error('Error loading listing:', err);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    loadListing();
  }, [loadListing]);

  return {
    listing,
    loading,
    error,
    reload: loadListing,
  };
}
