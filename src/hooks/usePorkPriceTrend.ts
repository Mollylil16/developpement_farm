/**
 * Hook pour charger les tendances de prix hebdomadaires du porc poids vif
 */

import { useState, useEffect, useCallback } from 'react';
import { getPorkPriceTrendService } from '../services/PorkPriceTrendService';
import { getErrorMessage } from '../types/common';
import type { WeeklyPorkPriceTrend } from '../database/repositories/WeeklyPorkPriceTrendRepository';
import { logger } from '../utils/logger';

interface PorkPriceTrendData {
  trends: WeeklyPorkPriceTrend[];
  currentWeekPrice?: number;
  previousWeekPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated?: string;
}

export function usePorkPriceTrend() {
  const [data, setData] = useState<PorkPriceTrendData>({
    trends: [],
    loading: true,
    refreshing: false,
    error: null,
  });

  const loadTrends = useCallback(async (forceRecalculate: boolean = false) => {
    try {
      if (forceRecalculate) {
        setData((prev) => ({ ...prev, refreshing: true, error: null }));
      } else {
        setData((prev) => ({ ...prev, loading: true, error: null }));
      }

      const trendService = getPorkPriceTrendService();

      let trends: WeeklyPorkPriceTrend[];
      
      if (forceRecalculate) {
        // Forcer le recalcul des 4 dernières semaines
        logger.debug('[usePorkPriceTrend] Recalcul forcé des tendances...');
        trends = await trendService.forceRecalculateTrends(4);
        // Récupérer aussi les 4 semaines précédentes pour la comparaison
        const allTrends = await trendService.getLastWeeksTrends(8);
        trends = allTrends;
      } else {
        // Récupérer les tendances depuis le backend
        // On récupère 8 semaines pour avoir 4 semaines + 4 semaines de comparaison
        trends = await trendService.getLastWeeksTrends(8);
      }

      // Calculer les métriques si des données sont disponibles
      if (trends.length > 0) {
        const currentTrend = trends[trends.length - 1];
        const previousTrend = trends.length > 1 ? trends[trends.length - 2] : undefined;

        const currentPrice = currentTrend?.avgPricePlatform;
        const previousPrice = previousTrend?.avgPricePlatform;

        const priceChange = currentPrice && previousPrice 
          ? currentPrice - previousPrice 
          : undefined;

        const priceChangePercent = currentPrice && previousPrice && previousPrice > 0
          ? ((currentPrice - previousPrice) / previousPrice) * 100
          : undefined;

        setData({
          trends,
          currentWeekPrice: currentPrice,
          previousWeekPrice: previousPrice,
          priceChange,
          priceChangePercent,
          loading: false,
          refreshing: false,
          error: null,
          lastUpdated: currentTrend?.updatedAt || new Date().toISOString(),
        });
      } else {
        // Pas de données disponibles
        setData({
          trends: [],
          currentWeekPrice: undefined,
          previousWeekPrice: undefined,
          priceChange: undefined,
          priceChangePercent: undefined,
          loading: false,
          refreshing: false,
          error: null,
          lastUpdated: undefined,
        });
      }
    } catch (error: unknown) {
      logger.error('Erreur lors du chargement des tendances de prix:', error);
      setData((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: getErrorMessage(error),
      }));
    }
  }, []);

  useEffect(() => {
    loadTrends(false);
  }, [loadTrends]);

  const forceRefresh = useCallback(() => {
    loadTrends(true);
  }, [loadTrends]);

  return {
    ...data,
    refresh: () => loadTrends(false),
    forceRefresh,
  };
}
