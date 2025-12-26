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
  error: string | null;
  lastUpdated?: string;
}

export function usePorkPriceTrend() {
  const [data, setData] = useState<PorkPriceTrendData>({
    trends: [],
    loading: true,
    error: null,
  });

  const loadTrends = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, loading: true, error: null }));

      const trendService = getPorkPriceTrendService();

      // Récupérer les tendances des 26 dernières semaines + semaine en cours
      const trends = await trendService.getLast26WeeksTrends();

      // Calculer les tendances manquantes si nécessaire
      if (trends.length < 27) {
        // Calculer les tendances manquantes
        await trendService.calculateLast26Weeks();
        const updatedTrends = await trendService.getLast26WeeksTrends();
        setData({
          trends: updatedTrends,
          currentWeekPrice: updatedTrends[updatedTrends.length - 1]?.avgPricePlatform,
          previousWeekPrice: updatedTrends[updatedTrends.length - 2]?.avgPricePlatform,
          priceChange:
            updatedTrends[updatedTrends.length - 1]?.avgPricePlatform &&
            updatedTrends[updatedTrends.length - 2]?.avgPricePlatform
              ? updatedTrends[updatedTrends.length - 1].avgPricePlatform! -
                updatedTrends[updatedTrends.length - 2].avgPricePlatform!
              : undefined,
          priceChangePercent:
            updatedTrends[updatedTrends.length - 1]?.avgPricePlatform &&
            updatedTrends[updatedTrends.length - 2]?.avgPricePlatform
              ? ((updatedTrends[updatedTrends.length - 1].avgPricePlatform! -
                  updatedTrends[updatedTrends.length - 2].avgPricePlatform!) /
                  updatedTrends[updatedTrends.length - 2].avgPricePlatform!) *
                100
              : undefined,
          loading: false,
          error: null,
          lastUpdated: updatedTrends[updatedTrends.length - 1]?.updatedAt,
        });
      } else {
        setData({
          trends,
          currentWeekPrice: trends[trends.length - 1]?.avgPricePlatform,
          previousWeekPrice: trends[trends.length - 2]?.avgPricePlatform,
          priceChange:
            trends[trends.length - 1]?.avgPricePlatform &&
            trends[trends.length - 2]?.avgPricePlatform
              ? trends[trends.length - 1].avgPricePlatform! -
                trends[trends.length - 2].avgPricePlatform!
              : undefined,
          priceChangePercent:
            trends[trends.length - 1]?.avgPricePlatform &&
            trends[trends.length - 2]?.avgPricePlatform
              ? ((trends[trends.length - 1].avgPricePlatform! -
                  trends[trends.length - 2].avgPricePlatform!) /
                  trends[trends.length - 2].avgPricePlatform!) *
                100
              : undefined,
          loading: false,
          error: null,
          lastUpdated: trends[trends.length - 1]?.updatedAt,
        });
      }
    } catch (error: unknown) {
      logger.error('Erreur lors du chargement des tendances de prix:', error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }, []);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  return {
    ...data,
    refresh: loadTrends,
  };
}
