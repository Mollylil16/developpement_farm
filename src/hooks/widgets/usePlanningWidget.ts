/**
 * Hook spécialisé pour le widget Planning
 */

import { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import planificationSliceModule from '../../store/slices/planificationSlice';
const loadPlanificationsAVenir: any = (planificationSliceModule as any).loadPlanificationsAVenir;
import { useEffect, useRef } from 'react';

export interface PlanningWidgetData {
  emoji: string;
  title: string;
  primary: number;
  secondary: number;
  labelPrimary: string;
  labelSecondary: string;
}

export function usePlanningWidget(projetId?: string): PlanningWidgetData | null {
  const dispatch = useAppDispatch();
  const { planifications } = useAppSelector((state) => state.planification);
  const dataChargeesRef = useRef<string | null>(null);

  // Charger les données
  useEffect(() => {
    if (!projetId) {
      dataChargeesRef.current = null;
      return;
    }

    const cle = `planning-${projetId}`;
    if (dataChargeesRef.current === cle) return;

    dataChargeesRef.current = cle;
    dispatch(loadPlanificationsAVenir({ projetId }));
  }, [dispatch, projetId]);

  return useMemo(() => {
    if (!projetId) return null;

    const tachesAFaire = planifications.filter((p) => (p as any).statut === 'a_faire');

    return {
      emoji: '📅',
      title: 'Planning',
      primary: planifications.length,
      secondary: tachesAFaire.length,
      labelPrimary: 'Tâches',
      labelSecondary: 'À faire',
    };
  }, [projetId, planifications]);
}
