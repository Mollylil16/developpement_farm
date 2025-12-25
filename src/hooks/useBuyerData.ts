/**
 * Hook pour charger les données spécifiques à l'acheteur
 * Offres en cours, historique d'achats, nouvelles annonces
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { getErrorMessage } from '../types/common';
import apiClient from '../services/api/apiClient';
import type { Offer, Transaction, MarketplaceListing } from '../types/marketplace';
import { logger } from '../utils/logger';

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

      // Charger les offres actives depuis l'API backend
      const allOffers = await apiClient.get<any[]>('/marketplace/offers', {
        params: { buyer_id: user.id },
      });
      const activeOffers = allOffers.filter(
        (offer) => offer.status === 'pending' || offer.status === 'countered'
      );

      // Charger les transactions complétées depuis l'API backend
      const allTransactions = await apiClient.get<any[]>('/marketplace/transactions', {
        params: { role: 'buyer' },
      });
      const completedTransactions = allTransactions.filter(
        (transaction) => transaction.status === 'completed' || transaction.status === 'delivered'
      );

      // Charger les nouvelles annonces depuis l'API backend
      const allListings = await apiClient.get<any[]>('/marketplace/listings');
      const recentListings = allListings
        .filter((listing) => listing.producerId !== user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      setData({
        activeOffers,
        completedTransactions,
        recentListings,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      logger.error('Erreur lors du chargement des données acheteur:', error);
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
