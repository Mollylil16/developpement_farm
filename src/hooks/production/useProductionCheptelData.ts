/**
 * Hook personnalisé pour gérer le chargement des données du cheptel
 * Extrait la logique de chargement et de cache pour simplifier ProductionCheptelComponent
 */

import React, { useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAppDispatch } from '../../store/hooks';
import {
  loadProductionAnimaux,
  loadPeseesRecents,
} from '../../store/slices/productionSlice';
import {
  loadVaccinations,
  loadMaladies,
  loadTraitements,
} from '../../store/slices/santeSlice';
import { useProjetEffectif } from '../useProjetEffectif';
import { createLoggerWithPrefix } from '../../utils/logger';
import { useMarketplaceStatusForAnimals } from '../useMarketplaceStatusForAnimals';

const logger = createLoggerWithPrefix('useProductionCheptelData');

const CACHE_DURATION_MS = 5000; // 5 secondes

/**
 * Hook pour gérer le chargement des données du cheptel avec cache
 */
export function useProductionCheptelData() {
  const dispatch = useAppDispatch();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const { refresh: refreshMarketplace } = useMarketplaceStatusForAnimals();

  const aChargeRef = useRef<string | null>(null);
  const dernierChargementRef = useRef<{ projetId: string | null; timestamp: number }>({
    projetId: null,
    timestamp: 0,
  });

  // Réinitialiser le cache si le projet actif change
  React.useEffect(() => {
    if (projetActif?.id && aChargeRef.current !== projetActif.id) {
      aChargeRef.current = null;
      dernierChargementRef.current = { projetId: null, timestamp: 0 };
    }
  }, [projetActif?.id]);

  // Charger les données uniquement quand l'onglet est visible
  useFocusEffect(
    useCallback(() => {
      if (!projetActif?.id) {
        aChargeRef.current = null;
        dernierChargementRef.current = { projetId: null, timestamp: 0 };
        return;
      }

      const maintenant = Date.now();
      const memeProjet = dernierChargementRef.current.projetId === projetActif.id;
      const donneesRecentes =
        memeProjet && maintenant - dernierChargementRef.current.timestamp < CACHE_DURATION_MS;

      // Si les données sont récentes et qu'on a déjà chargé ce projet, ne pas recharger
      if (donneesRecentes && aChargeRef.current === projetActif.id) {
        logger.debug('[useProductionCheptelData] Données en cache, pas de rechargement');
        return;
      }

      // Charger quand le projet change ou si les données sont anciennes
      logger.info('Rechargement des animaux et données associées...', { projetId: projetActif.id });
      aChargeRef.current = projetActif.id;
      dernierChargementRef.current = {
        projetId: projetActif.id,
        timestamp: maintenant,
      };

      // Charger les animaux immédiatement (critique pour l'affichage)
      // Inclure les inactifs pour avoir tous les animaux du cheptel (actif et autre)
      dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true })).catch(
        (error) => {
          const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
          logger.error('Erreur lors du chargement des animaux:', errorMessage);
        }
      );

      // Recharger aussi les statuts marketplace
      refreshMarketplace();

      // Déferrer les autres chargements (non-critiques) après un court délai
      // pour améliorer le temps de chargement initial
      setTimeout(() => {
        Promise.all([
          dispatch(loadVaccinations(projetActif.id)),
          dispatch(loadMaladies(projetActif.id)),
          dispatch(loadTraitements(projetActif.id)),
        ]).catch((error) => {
          const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
          logger.error('Erreur lors du chargement des données associées:', errorMessage);
        });
      }, 500); // Délai de 500ms pour laisser le temps au rendu initial
    }, [dispatch, projetActif?.id, refreshMarketplace])
  );

  // Fonction pour forcer le rechargement (bypass du cache)
  const forceReload = useCallback(async () => {
    if (!projetActif?.id) return;

    // Réinitialiser le cache
    aChargeRef.current = null;
    dernierChargementRef.current = { projetId: null, timestamp: 0 };

    try {
      // Inclure les inactifs pour avoir tous les animaux du cheptel (actif et autre)
      await dispatch(
        loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true })
      ).unwrap();

      // Recharger aussi les statuts marketplace
      await refreshMarketplace();

      // Charger les autres données
      await Promise.all([
        dispatch(loadVaccinations(projetActif.id)),
        dispatch(loadMaladies(projetActif.id)),
        dispatch(loadTraitements(projetActif.id)),
      ]);

      // Mettre à jour le cache
      aChargeRef.current = projetActif.id;
      dernierChargementRef.current = {
        projetId: projetActif.id,
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Erreur lors du rechargement forcé:', errorMessage);
      throw error;
    }
  }, [dispatch, projetActif?.id, refreshMarketplace]);

  return {
    forceReload,
  };
}
