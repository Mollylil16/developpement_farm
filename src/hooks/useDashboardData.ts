/**
 * Hook custom pour gérer les données du Dashboard
 * Responsabilités:
 * - Chargement initial des données
 * - Refresh des données
 * - Gestion des états de chargement
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '../store/hooks';
import {
  loadMortalitesParProjet,
  loadStatistiquesMortalite,
} from '../store/slices/mortalitesSlice';
import { loadProductionAnimaux, loadPeseesRecents } from '../store/slices/productionSlice';
import { logger } from '../utils/logger';

interface UseDashboardDataProps {
  projetId: string | undefined;
  onProfilPhotoLoad?: () => Promise<void>;
}

interface UseDashboardDataReturn {
  isInitialLoading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

export function useDashboardData({
  projetId,
  onProfilPhotoLoad,
}: UseDashboardDataProps): UseDashboardDataReturn {
  const dispatch = useAppDispatch();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Référence pour éviter les rechargements inutiles
  const dernierChargementRef = useRef<{
    projetId: string | null;
    timestamp: number;
  }>({
    projetId: null,
    timestamp: 0,
  });

  /**
   * Charge les données du dashboard en parallèle pour meilleure performance
   * Vérifie le cache avant de charger pour éviter les requêtes inutiles
   * Note: Si rate limiting nécessaire, il doit être géré côté API client avec retry
   */
  const chargerDonnees = useCallback(async () => {
    if (!projetId) return;

    try {
      // Vérifier si les données sont récentes (< 30 secondes) pour éviter les rechargements inutiles
      const maintenant = Date.now();
      const cacheAge = maintenant - dernierChargementRef.current.timestamp;
      const CACHE_DURATION_MS = 30000; // 30 secondes

      // Si les données sont récentes, ne pas recharger
      if (
        dernierChargementRef.current.projetId === projetId &&
        cacheAge < CACHE_DURATION_MS
      ) {
        logger.debug('[useDashboardData] Données en cache, pas de rechargement');
        return;
      }

      // Paralléliser toutes les requêtes indépendantes pour meilleure performance
      const promises = [
        dispatch(
          loadProductionAnimaux({
            projetId,
            inclureInactifs: true,
          })
        ).unwrap(),
        dispatch(loadMortalitesParProjet(projetId)).unwrap(),
        dispatch(loadStatistiquesMortalite(projetId)).unwrap(),
        dispatch(
          loadPeseesRecents({
            projetId,
            limit: 20,
          })
        ).unwrap(),
      ];

      // Exécuter toutes les requêtes en parallèle
      await Promise.all(promises);

      // Mettre à jour le timestamp du cache
      dernierChargementRef.current = {
        projetId,
        timestamp: maintenant,
      };

      // Charger aussi la photo de profil si fournie (séparément car optionnel, en arrière-plan)
      if (onProfilPhotoLoad) {
        // Ne pas attendre la photo de profil pour améliorer le temps de chargement
        onProfilPhotoLoad().catch((error) => {
          logger.warn('[useDashboardData] Erreur lors du chargement de la photo:', error);
        });
      }
    } catch (error) {
      logger.error('Erreur lors du chargement des données:', error);
      // Ne pas bloquer l'application si une requête échoue
      // Les données disponibles seront affichées
    }
  }, [projetId, dispatch]); // Retirer onProfilPhotoLoad des dépendances pour éviter re-créations

  /**
   * Rafraîchit les données (pull-to-refresh)
   */
  const onRefresh = useCallback(async () => {
    if (!projetId) return;

    setRefreshing(true);
    try {
      await chargerDonnees();
    } catch (error) {
      logger.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [projetId, chargerDonnees]);

  /**
   * Chargement initial au montage ou changement de projet
   */
  useEffect(() => {
    if (!projetId) {
      setIsInitialLoading(false);
      return;
    }

    // Vérifier si les données sont déjà chargées et récentes
    const maintenant = Date.now();
    const cacheAge = maintenant - dernierChargementRef.current.timestamp;
    const CACHE_DURATION_MS = 30000; // 30 secondes

    const memeProjet = dernierChargementRef.current.projetId === projetId;
    const donneesRecentes = memeProjet && cacheAge < CACHE_DURATION_MS;

    if (donneesRecentes) {
      // Données déjà chargées et récentes, pas besoin de recharger
      setIsInitialLoading(false);
      return;
    }

    // Mettre à jour la référence avant le chargement
    dernierChargementRef.current = {
      projetId,
      timestamp: maintenant,
    };

    // Charger les données
    chargerDonnees();

    // Marquer comme chargé après un court délai (UX)
    // Réduire le délai pour améliorer la réactivité
    const timeoutId = setTimeout(() => {
      setIsInitialLoading(false);
    }, 300); // Réduit de 500ms à 300ms

    return () => clearTimeout(timeoutId);
  }, [projetId, chargerDonnees]);

  return {
    isInitialLoading,
    refreshing,
    onRefresh,
  };
}
