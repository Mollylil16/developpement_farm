/**
 * Hook pour récupérer les détails complets des pesées d'un animal
 * Mode individuel uniquement (pour le mode bande, utiliser les endpoints batch existants)
 */

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/api/apiClient';
import { getErrorMessage } from '../../types/common';
import { logger } from '../../utils/logger';
import type { ProductionAnimal } from '../../types/production';
import type { ProductionPesee } from '../../types/production';

export interface AnimalPeseeDetail {
  animal: ProductionAnimal;
  pesees: ProductionPesee[];
  metriques: {
    poids_actuel: number;
    poids_initial: number;
    gain_total: number;
    gmq_moyen: number;
    age_jours: number;
    objectif_poids: number | null;
    objectif_date: string | null;
    progression_objectif: number | null;
    en_retard: boolean;
    moyenne_cheptel_poids: number;
    moyenne_cheptel_gmq: number;
  };
}

interface UseAnimalPeseeDetailParams {
  animalId: string | undefined;
  enabled?: boolean; // Optionnel : pour désactiver le chargement automatique
}

interface UseAnimalPeseeDetailReturn {
  data: AnimalPeseeDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAnimalPeseeDetail({
  animalId,
  enabled = true,
}: UseAnimalPeseeDetailParams): UseAnimalPeseeDetailReturn {
  const [data, setData] = useState<AnimalPeseeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!animalId || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<AnimalPeseeDetail>(
        `/production/animaux/${animalId}/pesees`
      );

      setData(response);
    } catch (err: unknown) {
      logger.error('[useAnimalPeseeDetail] Erreur lors du chargement des détails:', err);
      setError(getErrorMessage(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [animalId, enabled]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return {
    data,
    loading,
    error,
    refetch: fetchDetail,
  };
}

