/**
 * Hook spécialisé pour la logique des traitements
 */

import { useCallback } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { loadTraitements, loadStatistiquesTraitements } from '../../store/slices/santeSlice';

export function useTraitementsLogic() {
  const dispatch = useAppDispatch();

  const chargerDonnees = useCallback(
    (projetId: string) => {
      dispatch(loadTraitements(projetId));
      dispatch(loadStatistiquesTraitements(projetId));
    },
    [dispatch]
  );

  return { chargerDonnees };
}
