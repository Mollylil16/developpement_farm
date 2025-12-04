/**
 * Hook spécialisé pour le widget Santé
 */

import { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadVaccinations, loadMaladies } from '../../store/slices/santeSlice';
import { selectAllVaccinations, selectAllMaladies } from '../../store/selectors/santeSelectors';
import { useEffect, useRef } from 'react';

export interface SanteWidgetData {
  emoji: string;
  title: string;
  primary: number;
  secondary: number;
  labelPrimary: string;
  labelSecondary: string;
}

export function useSanteWidget(projetId?: string): SanteWidgetData | null {
  const dispatch = useAppDispatch();
  const vaccinations = useAppSelector(selectAllVaccinations);
  const maladies = useAppSelector(selectAllMaladies);
  const dataChargeesRef = useRef<string | null>(null);

  // Charger les données
  useEffect(() => {
    if (!projetId) {
      dataChargeesRef.current = null;
      return;
    }

    const cle = `sante-${projetId}`;
    if (dataChargeesRef.current === cle) return;

    dataChargeesRef.current = cle;
    dispatch(loadVaccinations(projetId));
    dispatch(loadMaladies(projetId));
  }, [dispatch, projetId]);

  return useMemo(() => {
    if (!projetId) return null;

    const maladiesEnCours = maladies.filter((m: any) => !m.date_fin || m.date_fin === '');

    return {
      emoji: '🏥',
      title: 'Santé',
      primary: vaccinations.length,
      secondary: maladiesEnCours.length,
      labelPrimary: 'Vaccins',
      labelSecondary: 'Maladies',
    };
  }, [projetId, vaccinations, maladies]);
}

