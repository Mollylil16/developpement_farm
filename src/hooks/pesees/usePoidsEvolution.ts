/**
 * Hook pour récupérer l'évolution du poids
 * Fonctionne pour les modes individuel et bande
 */

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/api/apiClient';
import { getErrorMessage } from '../../types/common';
import { logger } from '../../utils/logger';

export interface PoidsEvolution {
  dates: string[];
  poids_moyens: number[];
  poids_initial: number;
  poids_actuel: number;
  gain_total: number;
  gmq: number;
  par_sujet?: Record<string, {
    nom: string;
    poids: number[];
  }>;
}

interface UsePoidsEvolutionParams {
  projetId: string | undefined;
  mode: 'individuel' | 'bande';
  periode?: '7j' | '30j' | '90j' | 'tout';
  sujetIds?: string[]; // Optionnel : pour filtrer certains sujets
  enabled?: boolean; // Optionnel : pour désactiver le chargement automatique
}

interface UsePoidsEvolutionReturn {
  data: PoidsEvolution | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePoidsEvolution({
  projetId,
  mode,
  periode = '30j',
  sujetIds,
  enabled = true,
}: UsePoidsEvolutionParams): UsePoidsEvolutionReturn {
  const [data, setData] = useState<PoidsEvolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvolution = useCallback(async () => {
    if (!projetId || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const body: any = {
        projet_id: projetId,
        mode,
        periode,
      };

      if (sujetIds && sujetIds.length > 0) {
        body.sujet_ids = sujetIds;
      }

      const response = await apiClient.post<PoidsEvolution>('/production/pesees/evolution', body);

      setData(response);
    } catch (err: unknown) {
      logger.error('[usePoidsEvolution] Erreur lors du chargement de l\'évolution:', err);
      setError(getErrorMessage(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projetId, mode, periode, sujetIds, enabled]);

  useEffect(() => {
    fetchEvolution();
  }, [fetchEvolution]);

  return {
    data,
    loading,
    error,
    refetch: fetchEvolution,
  };
}

