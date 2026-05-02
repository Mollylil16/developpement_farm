/**
 * Hook spécialisé pour la logique des maladies
 */

import { useCallback } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { loadMaladies, loadStatistiquesMaladies } from '../../store/slices/santeSlice';

export function useMaladiesLogic() {
  const dispatch = useAppDispatch();

  const chargerDonnees = useCallback(
    (projetId: string) => {
      dispatch(loadMaladies(projetId));
      dispatch(loadStatistiquesMaladies(projetId));
    },
    [dispatch]
  );

  return { chargerDonnees };
}
