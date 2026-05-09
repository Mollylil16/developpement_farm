/**
 * Hook spécialisé pour le widget Mortalités
 */

import { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import mortalitesSliceModule from '../../store/slices/mortalitesSlice';
const loadMortalitesParProjet: any = (mortalitesSliceModule as any).loadMortalitesParProjet;
import { selectAllMortalites } from '../../store/selectors/mortalitesSelectors';
import { startOfMonth, parseISO, isAfter } from 'date-fns';
import type { Mortalite } from '../../types/mortalites';
import { useEffect, useRef } from 'react';

export interface MortalitesWidgetData {
  emoji: string;
  title: string;
  primary: number;
  secondary: number;
  labelPrimary: string;
  labelSecondary: string;
}

export function useMortalitesWidget(projetId?: string): MortalitesWidgetData | null {
  const dispatch = useAppDispatch();
  const mortalites = useAppSelector(selectAllMortalites);
  const dataChargeesRef = useRef<string | null>(null);

  // Charger les données
  useEffect(() => {
    if (!projetId) {
      dataChargeesRef.current = null;
      return;
    }

    const cle = `mortalites-${projetId}`;
    if (dataChargeesRef.current === cle) return;

    dataChargeesRef.current = cle;
    dispatch(loadMortalitesParProjet(projetId));
  }, [dispatch, projetId]);

  return useMemo(() => {
    if (!projetId) return null;

    const mortalitesCeMois = mortalites.filter((m: Mortalite) => {
      const dateMortalite = parseISO(m.date);
      const debutMois = startOfMonth(new Date());
      return isAfter(dateMortalite, debutMois);
    });

    return {
      emoji: '💀',
      title: 'Mortalités',
      primary: mortalites.reduce((sum: number, m: Mortalite) => sum + m.nombre_porcs, 0),
      secondary: mortalitesCeMois.reduce((sum: number, m: Mortalite) => sum + m.nombre_porcs, 0),
      labelPrimary: 'Total',
      labelSecondary: 'Ce mois',
    };
  }, [projetId, mortalites]);
}
