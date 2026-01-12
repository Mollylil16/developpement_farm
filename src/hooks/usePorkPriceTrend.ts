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

      // Récupérer les tendances depuis le backend
      // On récupère 8 semaines pour avoir 4 semaines + 4 semaines de comparaison
      const trends = await trendService.getLastWeeksTrends(8);

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
          error: null,
          lastUpdated: currentTrend?.updatedAt,
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
          error: null,
          lastUpdated: undefined,
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
