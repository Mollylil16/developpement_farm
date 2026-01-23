/**
 * Hook centralisé pour charger et gérer toutes les données financières
 * Évite les appels API dupliqués en centralisant la logique de chargement
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useProjetEffectif } from '../useProjetEffectif';
import { selectDepensesPonctuelles, selectFinanceLoading, selectFinanceError } from '../../store/selectors/financeSelectors';
import { loadDepensesPonctuelles } from '../../store/slices/financeSlice';
import { createLoggerWithPrefix } from '../../utils/logger';

const logger = createLoggerWithPrefix('useFinanceData');

/**
 * Options pour le hook de données financières
 */
interface UseFinanceDataOptions {
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
 * Hook centralisé pour charger et gérer les données financières
 *
 * Ce hook :
 * - Évite les appels API dupliqués pour les dépenses ponctuelles
 * - Utilise le cache Redux efficacement
 * - Fournit un état de chargement et d'erreur consolidé
 *
 * @param options Options de configuration
 * @returns État des données financières
 */
export function useFinanceData(options: UseFinanceDataOptions = {}) {
  const {
    forceReload = false,
    onLoaded,
    onError
  } = options;

  const dispatch = useAppDispatch();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const depenses = useAppSelector(selectDepensesPonctuelles);
  const loading = useAppSelector(selectFinanceLoading);
  const error = useAppSelector(selectFinanceError);

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
    const depensesDuProjet = depenses.filter(d => d.projet_id === projetActif.id);
    if (depensesDuProjet.length > 0 && !forceReload) {
      logger.debug(`Cache Redux valide trouvé pour ${depensesDuProjet.length} dépenses`);
      chargeRef.current = projetActif.id;
      onLoaded?.();
      return;
    }

    logger.info(`Chargement des données financières pour le projet ${projetActif.id}`);

    chargeRef.current = projetActif.id;
    dernierChargementRef.current = maintenant;

    try {
      await dispatch(loadDepensesPonctuelles(projetActif.id)).unwrap();

      logger.debug('Données financières chargées avec succès');
      onLoaded?.();
    } catch (error: any) {
      logger.error('Erreur lors du chargement des données financières:', error);
      onError?.(error);
    }
  }, [dispatch, projetActif?.id, depenses, forceReload, onLoaded, onError]);

  // Fonction de rechargement forcé
  const reload = useCallback(() => {
    logger.info('Rechargement forcé des données financières demandé');
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
    depenses,
    depensesDuProjet: depenses.filter(d => d.projet_id === projetActif?.id || ''),

    // État
    loading,
    error,
    hasData: depenses.filter(d => d.projet_id === projetActif?.id || '').length > 0,

    // Actions
    reload,
    loadData,
  };
}
