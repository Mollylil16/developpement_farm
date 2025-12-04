/**
 * Hook pour charger les données spécifiques à l'acheteur
 * Offres en cours, historique d'achats, nouvelles annonces
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { getDatabase } from '../services/database';
import { getErrorMessage } from '../types/common';
import { getMarketplaceService } from '../services/MarketplaceService';
import { MarketplaceOfferRepository, MarketplaceTransactionRepository, MarketplaceListingRepository } from '../database/repositories';
import type { Offer, Transaction, MarketplaceListing } from '../types/marketplace';

interface BuyerData {
  activeOffers: Offer[];
  completedTransactions: Transaction[];
  recentListings: MarketplaceListing[];
  loading: boolean;
  error: string | null;
}

export function useBuyerData() {
  const { user } = useAppSelector((state) => state.auth);
  const [data, setData] = useState<BuyerData>({
    activeOffers: [],
    completedTransactions: [],
    recentListings: [],
    loading: true,
    error: null,
  });

  const loadBuyerData = useCallback(async () => {
    if (!user?.id) {
      setData((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData((prev) => ({ ...prev, loading: true, error: null }));

      const db = await getDatabase();
      const offerRepo = new MarketplaceOfferRepository(db);
      const transactionRepo = new MarketplaceTransactionRepository(db);
      const listingRepo = new MarketplaceListingRepository(db);
      const marketplaceService = getMarketplaceService(db);

      // Charger les offres actives (pending, countered)
      const allOffers = await offerRepo.findByBuyerId(user.id);
      const activeOffers = allOffers.filter(
        (offer) => offer.status === 'pending' || offer.status === 'countered'
      );

      // Charger les transactions complétées
      const allTransactions = await transactionRepo.findByBuyerId(user.id);
      const completedTransactions = allTransactions.filter(
        (transaction) =>
          transaction.status === 'completed' || transaction.status === 'delivered'
      );

      // Charger les nouvelles annonces (exclure celles de l'utilisateur)
      const searchResult = await marketplaceService.searchListings(
        {},
        'newest',
        1,
        5,
        user.id // Exclure les propres annonces
      );
      const recentListings = searchResult.listings.slice(0, 5);

      setData({
        activeOffers,
        completedTransactions,
        recentListings,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      console.error('Erreur lors du chargement des données acheteur:', error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }, [user?.id]);

  useEffect(() => {
    loadBuyerData();
  }, [loadBuyerData]);

  return {
    ...data,
    refresh: loadBuyerData,
  };
}

