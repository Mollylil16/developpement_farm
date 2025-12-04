/**
 * Hook spécialisé pour la logique des vaccinations
 */

import { useCallback } from 'react';
import { useAppDispatch } from '../../store/hooks';
import {
  loadVaccinations,
  loadRappelsVaccinations,
  loadStatistiquesVaccinations,
} from '../../store/slices/santeSlice';

export function useVaccinationsLogic() {
  const dispatch = useAppDispatch();

  const chargerDonnees = useCallback(
    (projetId: string) => {
      dispatch(loadVaccinations(projetId));
      dispatch(loadRappelsVaccinations(projetId));
      dispatch(loadStatistiquesVaccinations(projetId));
    },
    [dispatch]
  );

  return { chargerDonnees };
}

