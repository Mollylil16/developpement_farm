/**
 * Hook pour charger les animaux au montage du composant
 * Centralise la logique de chargement et évite les duplications
 * Vérifie le cache Redux avant de dispatcher pour éviter les appels API inutiles
 */

import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import { selectProjetActif } from '../store/selectors/projetSelectors';

interface UseLoadAnimauxOnMountOptions {
  /**
   * Si true, force le rechargement même si les animaux sont déjà chargés
   * @default false
   */
  forceReload?: boolean;
  /**
   * Callback appelé après le chargement
   */
  onLoaded?: () => void;
}

/**
 * Hook pour charger les animaux du projet actif au montage
 * Évite les appels API dupliqués en vérifiant le cache Redux
 * 
 * @param options Options de chargement
 * @example
 * ```tsx
 * function MyComponent() {
 *   useLoadAnimauxOnMount();
 *   const animaux = useAppSelector(selectAllAnimaux);
 *   // ...
 * }
 * ```
 */
export function useLoadAnimauxOnMount(options: UseLoadAnimauxOnMountOptions = {}) {
  const { forceReload = false, onLoaded } = options;
  const dispatch = useAppDispatch();
  const projetActif = useAppSelector(selectProjetActif);
  const animaux = useAppSelector(selectAllAnimaux);
  
  // Utiliser useRef pour éviter les chargements multiples
  const chargeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projetActif?.id) {
      chargeRef.current = null;
      return;
    }

    // Si déjà chargé pour ce projet et pas de force reload, ne rien faire
    if (chargeRef.current === projetActif.id && !forceReload) {
      return;
    }

    // Vérifier si les animaux du projet sont déjà dans Redux (cache)
    const animauxDuProjet = animaux.filter((a) => a.projet_id === projetActif.id);
    
    // Si les animaux sont déjà chargés et pas de force reload, marquer comme chargé
    if (animauxDuProjet.length > 0 && !forceReload) {
      chargeRef.current = projetActif.id;
      onLoaded?.();
      return;
    }

    // Charger les animaux uniquement si nécessaire
    chargeRef.current = projetActif.id;
    dispatch(loadProductionAnimaux({ projetId: projetActif.id }))
      .then(() => {
        onLoaded?.();
      })
      .catch((error) => {
        console.error('[useLoadAnimauxOnMount] Erreur lors du chargement:', error);
        // Réinitialiser pour permettre une nouvelle tentative
        if (chargeRef.current === projetActif.id) {
          chargeRef.current = null;
        }
      });
  }, [dispatch, projetActif?.id, forceReload, onLoaded]); // Retirer 'animaux' pour éviter re-renders
}

