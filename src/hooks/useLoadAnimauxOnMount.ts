/**
 * Hook pour charger les animaux au montage du composant
 * Centralise la logique de chargement et évite les duplications
 * Vérifie le cache Redux avant de dispatcher pour éviter les appels API inutiles
 */

import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import { useProjetEffectif } from './useProjetEffectif';

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
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const animaux = useAppSelector(selectAllAnimaux);
  
  // Utiliser useRef pour éviter les chargements multiples
  const chargeRef = useRef<string | null>(null);

  useEffect(() => {
    // Vérification robuste de projetActif
    const projetId = projetActif?.id;
    if (!projetId || typeof projetId !== 'string') {
      chargeRef.current = null;
      return;
    }

    // Si déjà chargé pour ce projet et pas de force reload, ne rien faire
    if (chargeRef.current === projetId && !forceReload) {
      return;
    }

    // Vérifier si les animaux du projet sont déjà dans Redux (cache)
    // IMPORTANT: Vérifications robustes pour éviter "Cannot convert undefined value to object"
    if (!animaux || !Array.isArray(animaux)) {
      // Si animaux n'est pas encore initialisé ou n'est pas un tableau, charger depuis l'API
      chargeRef.current = projetId;
      dispatch(loadProductionAnimaux({ projetId, inclureInactifs: true }))
        .then(() => {
          onLoaded?.();
        })
        .catch((error) => {
          // Logger l'erreur de manière plus informative
          const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
          console.error('[useLoadAnimauxOnMount] Erreur lors du chargement:', errorMessage);
          // Réinitialiser pour permettre une nouvelle tentative
          if (chargeRef.current === projetId) {
            chargeRef.current = null;
          }
        });
      return;
    }

    // Filtrer les animaux du projet avec vérification robuste
    // Protéger contre les animaux qui pourraient être null/undefined ou sans projet_id
    let animauxDuProjet: typeof animaux = [];
    try {
      animauxDuProjet = animaux.filter((a) => {
        // Vérification robuste : s'assurer que 'a' est un objet et a un projet_id
        if (!a || typeof a !== 'object') return false;
        return a.projet_id === projetId;
      });
    } catch (filterError) {
      // En cas d'erreur lors du filter (peut arriver si animaux contient des valeurs invalides)
      const filterErrorMessage = (filterError as Error)?.message || 'Erreur inconnue lors du filtrage';
      console.error('[useLoadAnimauxOnMount] Erreur lors du filtrage des animaux:', filterErrorMessage);
      // Charger depuis l'API pour récupérer des données propres
      chargeRef.current = projetId;
      dispatch(loadProductionAnimaux({ projetId, inclureInactifs: true }))
        .then(() => {
          onLoaded?.();
        })
        .catch((error) => {
          const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
          console.error('[useLoadAnimauxOnMount] Erreur lors du chargement:', errorMessage);
          if (chargeRef.current === projetId) {
            chargeRef.current = null;
          }
        });
      return;
    }
    
    // Si les animaux sont déjà chargés et pas de force reload, marquer comme chargé
    // ATTENTION: Ne pas utiliser ce cache si on vient de créer un projet car les animaux
    // viennent d'être créés par le backend et ne sont pas encore dans Redux
    if (animauxDuProjet.length > 0 && !forceReload) {
      chargeRef.current = projetId;
      onLoaded?.();
      return;
    }

    // Charger les animaux uniquement si nécessaire
    // Inclure les inactifs pour avoir tous les animaux (actif et autre statuts)
    chargeRef.current = projetId;
    dispatch(loadProductionAnimaux({ projetId, inclureInactifs: true }))
      .then(() => {
        onLoaded?.();
      })
      .catch((error) => {
        const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
        console.error('[useLoadAnimauxOnMount] Erreur lors du chargement:', errorMessage);
        // Réinitialiser pour permettre une nouvelle tentative
        if (chargeRef.current === projetId) {
          chargeRef.current = null;
        }
      });
  }, [dispatch, projetActif?.id, forceReload, onLoaded]); // Retirer 'animaux' pour éviter re-renders
}

