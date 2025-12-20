/**
 * Hook spécialisé pour le widget Production
 */

import { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadProductionAnimaux, loadPeseesRecents } from '../../store/slices/productionSlice';
import {
  selectPeseesRecents,
  selectAnimauxActifs,
} from '../../store/selectors/productionSelectors';
import { useEffect, useRef } from 'react';

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
  const dataChargeesRef = useRef<string | null>(null);

  // Charger les données
  useEffect(() => {
    if (!projetId) {
      dataChargeesRef.current = null;
      return;
    }

    const cle = `production-${projetId}`;
    if (dataChargeesRef.current === cle) return;

    dataChargeesRef.current = cle;
    dispatch(loadProductionAnimaux({ projetId }));
    dispatch(loadPeseesRecents({ projetId, limit: 20 }));
  }, [dispatch, projetId]);

  return useMemo(() => {
    if (!projetId) return null;

    return {
      emoji: '🐷',
      title: 'Production',
      primary: animauxActifs.length,
      secondary: (peseesRecents as unknown[]).length,
      labelPrimary: 'Animaux',
      labelSecondary: 'Pesées',
    };
  }, [projetId, animauxActifs, peseesRecents]);
}
