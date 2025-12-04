/**
 * Hook spécialisé pour le widget Nutrition
 */

import { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadRations, loadRationsBudget } from '../../store/slices/nutritionSlice';
import { startOfMonth, parseISO, isAfter } from 'date-fns';
import { useEffect, useRef } from 'react';

export interface NutritionWidgetData {
  emoji: string;
  title: string;
  primary: number;
  secondary: number;
  labelPrimary: string;
  labelSecondary: string;
}

export function useNutritionWidget(projetId?: string): NutritionWidgetData | null {
  const dispatch = useAppDispatch();
  const { rations, rationsBudget } = useAppSelector((state) => state.nutrition);
  const dataChargeesRef = useRef<string | null>(null);

  // Charger les données
  useEffect(() => {
    if (!projetId) {
      dataChargeesRef.current = null;
      return;
    }

    const cle = `nutrition-${projetId}`;
    if (dataChargeesRef.current === cle) return;

    dataChargeesRef.current = cle;
    dispatch(loadRations(projetId));
    dispatch(loadRationsBudget(projetId));
  }, [dispatch, projetId]);

  return useMemo(() => {
    if (!projetId) return null;

    const toutesLesRations = [...rations, ...rationsBudget];
    const rationsCeMois = toutesLesRations.filter((r) => {
      const dateRation = parseISO(r.date_creation);
      const debutMois = startOfMonth(new Date());
      return isAfter(dateRation, debutMois);
    });

    return {
      emoji: '🥗',
      title: 'Nutrition',
      primary: toutesLesRations.length,
      secondary: rationsCeMois.length,
      labelPrimary: 'Rations',
      labelSecondary: 'Ce mois',
    };
  }, [projetId, rations, rationsBudget]);
}

