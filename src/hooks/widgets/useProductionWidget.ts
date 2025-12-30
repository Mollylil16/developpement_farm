/**
 * Hook spécialisé pour le widget Production
 */

import { useMemo, useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadProductionAnimaux, loadPeseesRecents } from '../../store/slices/productionSlice';
import {
  selectPeseesRecents,
  selectAnimauxActifs,
} from '../../store/selectors/productionSelectors';
import apiClient from '../../services/api/apiClient';
import type { Batch } from '../../types/batch';
import { logger } from '../../utils/logger';

export interface ProductionWidgetData {
  emoji: string;
  title: string;
  primary: number;
  secondary: number;
  labelPrimary: string;
  labelSecondary: string;
}

export function useProductionWidget(projetId?: string): ProductionWidgetData | null {
  const dispatch = useAppDispatch();
  const animauxActifs = useAppSelector(selectAnimauxActifs);
  const peseesRecents = useAppSelector(selectPeseesRecents);
  const projetActif = useAppSelector((state) => state.projet.projetActif);
  const isBatchMode = projetActif?.management_method === 'batch';
  const dataChargeesRef = useRef<string | null>(null);
  const [batchMetrics, setBatchMetrics] = useState<{ total: number; loges: number } | null>(null);

  // Charger les données
  useEffect(() => {
    if (!projetId || isBatchMode) {
      dataChargeesRef.current = null;
      return;
    }

    const cle = `production-${projetId}`;
    if (dataChargeesRef.current === cle) return;

    dataChargeesRef.current = cle;
    dispatch(loadProductionAnimaux({ projetId }));
    dispatch(loadPeseesRecents({ projetId, limit: 20 }));
  }, [dispatch, projetId, isBatchMode]);

  // Charger les métriques batch quand l'élevage est en mode bande
  useEffect(() => {
    if (!projetId || !isBatchMode) {
      setBatchMetrics(null);
      return;
    }

    let cancelled = false;
    const fetchBatchMetrics = async () => {
      try {
        const batches = await apiClient.get<Batch[]>(`/batch-pigs/projet/${projetId}`);
        if (cancelled || !batches) return;

        const aggregate = batches.reduce(
          (acc, batch) => {
            acc.total += batch.total_count || 0;
            acc.loges += 1;
            return acc;
          },
          { total: 0, loges: 0 },
        );

        setBatchMetrics(aggregate);
      } catch (error) {
        if (!cancelled) {
          logger.warn('[useProductionWidget] Impossible de charger les loges batch', error);
          setBatchMetrics({ total: 0, loges: 0 });
        }
      }
    };

    fetchBatchMetrics();
    return () => {
      cancelled = true;
    };
  }, [projetId, isBatchMode]);

  return useMemo(() => {
    if (!projetId) return null;

    if (isBatchMode) {
      const fallbackTotal =
        (projetActif?.nombre_truies ?? 0) +
        (projetActif?.nombre_verrats ?? 0) +
        (projetActif?.nombre_porcelets ?? 0) +
        (projetActif?.nombre_croissance ?? 0);

      return {
        emoji: '🐖',
        title: 'Production',
        primary: batchMetrics?.total ?? fallbackTotal,
        secondary: batchMetrics?.loges ?? 0,
        labelPrimary: 'Animaux',
        labelSecondary: 'Loges',
      };
    }

    return {
      emoji: '🐷',
      title: 'Production',
      primary: animauxActifs.length,
      secondary: (peseesRecents as unknown[]).length,
      labelPrimary: 'Animaux',
      labelSecondary: 'Pesées',
    };
  }, [
    projetId,
    animauxActifs,
    peseesRecents,
    isBatchMode,
    batchMetrics,
    projetActif?.nombre_truies,
    projetActif?.nombre_verrats,
    projetActif?.nombre_porcelets,
    projetActif?.nombre_croissance,
  ]);
}
