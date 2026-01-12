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
      // Le backend retourne maintenant un objet avec pagination
      // Utiliser exclude_own_listings pour exclure automatiquement les listings de l'utilisateur
      // Utiliser sort=newest pour prioriser les nouveaux listings
      const listingsResponse = await apiClient.get<{
        listings: any[];
        total: number;
      }>('/marketplace/listings', {
        params: {
          exclude_own_listings: 'true', // Exclure les listings de l'utilisateur connecté
          sort: 'newest', // Prioriser les nouveaux listings
          limit: 5, // Limiter à 5 pour les nouvelles annonces
        },
      });
      const allListings = listingsResponse.listings || [];
      // Trier par date de création (les plus récents en premier) et limiter à 5
      const recentListings = allListings
        .sort((a, b) => {
          const aDate = new Date(a.listedAt || a.createdAt || 0).getTime();
          const bDate = new Date(b.listedAt || b.createdAt || 0).getTime();
          return bDate - aDate;
        })
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
