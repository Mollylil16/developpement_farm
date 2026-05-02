/**
 * Hook pour récupérer les statistiques globales des pesées
 * Fonctionne pour les modes individuel et bande
 */

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/api/apiClient';
import { getErrorMessage } from '../../types/common';
import { logger } from '../../utils/logger';

export interface PeseesStats {
  poids_moyen: number;
  gmq_moyen: number;
  derniere_pesee_date: string | null;
  nb_en_retard: number;
  objectifs_atteints: number;
  total_animaux: number;
}

interface UsePeseesStatsParams {
  projetId: string | undefined;
  mode: 'individuel' | 'bande';
  periode?: '7j' | '30j' | '90j' | 'tout';
  enabled?: boolean; // Optionnel : pour désactiver le chargement automatique
}

interface UsePeseesStatsReturn {
  data: PeseesStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePeseesStats({
  projetId,
  mode,
  periode = '30j',
  enabled = true,
}: UsePeseesStatsParams): UsePeseesStatsReturn {
  const [data, setData] = useState<PeseesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!projetId || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post<PeseesStats>('/production/pesees/stats', {
        projet_id: projetId,
        mode,
        periode,
      });

      setData(response);
    } catch (err: unknown) {
      logger.error('[usePeseesStats] Erreur lors du chargement des statistiques:', err);
      setError(getErrorMessage(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projetId, mode, periode, enabled]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    data,
    loading,
    error,
    refetch: fetchStats,
  };
}

