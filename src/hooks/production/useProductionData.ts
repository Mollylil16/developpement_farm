/**
 * Hook centralisé pour charger et gérer toutes les données de production
 * Évite les appels API dupliqués en centralisant la logique de chargement
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useProjetEffectif } from '../useProjetEffectif';
import { selectAllAnimaux, selectProductionLoading, selectProductionError } from '../../store/selectors/productionSelectors';
import { loadProductionAnimaux } from '../../store/slices/productionSlice';
import { createLoggerWithPrefix } from '../../utils/logger';

const logger = createLoggerWithPrefix('useProductionData');

/**
 * Options pour le hook de données de production
 */
interface UseProductionDataOptions {
  /**
   * Si true, inclut les animaux inactifs dans le chargement
   * @default true
   */
  inclureInactifs?: boolean;
  /**
   * Si true, force le rechargement même si les données existent déjà
   * @default false
   */
  forceReload?: boolean;
  /**
   * Callback appelé après le chargement réussi
   */
  onLoaded?: () => void;
  /**
   * Callback appelé en cas d'erreur
   */
  onError?: (error: string) => void;
}

/**
 * Hook centralisé pour charger et gérer les données de production
 *
 * Ce hook :
 * - Évite les appels API dupliqués
 * - Utilise le cache Redux efficacement
 * - Fournit un état de chargement et d'erreur consolidé
 * - Permet le rechargement forcé quand nécessaire
 *
 * @param options Options de configuration
 * @returns État des données de production
 */
export function useProductionData(options: UseProductionDataOptions = {}) {
  const {
    inclureInactifs = true,
    forceReload = false,
    onLoaded,
    onError
  } = options;

  const dispatch = useAppDispatch();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const animaux = useAppSelector(selectAllAnimaux);
  const loading = useAppSelector(selectProductionLoading);
  const error = useAppSelector(selectProductionError);

  // Référence pour éviter les chargements multiples
  const chargeRef = useRef<string | null>(null);
  const dernierChargementRef = useRef<number>(0);

  // Fonction de chargement centralisée
  const loadData = useCallback(async () => {
    if (!projetActif?.id) {
      logger.debug('Aucun projet actif, chargement annulé');
      return;
    }

    // Éviter les chargements simultanés pour le même projet
    if (chargeRef.current === projetActif.id && !forceReload) {
      logger.debug(`Données déjà chargées pour le projet ${projetActif.id}`);
      return;
    }

    // Vérifier si un chargement récent a eu lieu (éviter les spam)
    const maintenant = Date.now();
    if (!forceReload && maintenant - dernierChargementRef.current < 5000) {
      logger.debug('Chargement récent détecté, annulation');
      return;
    }

    // Vérifier le cache Redux avant de charger
    const animauxDuProjet = animaux.filter(a => a.projet_id === projetActif.id);
    if (animauxDuProjet.length > 0 && !forceReload) {
      logger.debug(`Cache Redux valide trouvé pour ${animauxDuProjet.length} animaux`);
      chargeRef.current = projetActif.id;
      onLoaded?.();
      return;
    }

    logger.info(`Chargement des données de production pour le projet ${projetActif.id}`);

    chargeRef.current = projetActif.id;
    dernierChargementRef.current = maintenant;

    try {
      await dispatch(loadProductionAnimaux({
        projetId: projetActif.id,
        inclureInactifs
      })).unwrap();

      logger.debug('Données de production chargées avec succès');
      onLoaded?.();
    } catch (error: any) {
      logger.error('Erreur lors du chargement des données de production:', error);
      onError?.(error);
    }
  }, [dispatch, projetActif?.id, animaux, inclureInactifs, forceReload, onLoaded, onError]);

  // Fonction de rechargement forcé
  const reload = useCallback(() => {
    logger.info('Rechargement forcé des données de production demandé');
    loadData();
  }, [loadData]);

  // Chargement automatique au montage et changement de projet
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Nettoyer la référence quand le projet change
  useEffect(() => {
    return () => {
      if (chargeRef.current !== projetActif?.id) {
        chargeRef.current = null;
      }
    };
  }, [projetActif?.id]);

  return {
    // Données
    animaux,
    animauxDuProjet: animaux.filter(a => a.projet_id === projetActif?.id || ''),

    // État
    loading,
    error,
    hasData: animaux.filter(a => a.projet_id === projetActif?.id || '').length > 0,

    // Actions
    reload,
    loadData,
  };
}
