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
   * Note: Si rate limiting nécessaire, il doit être géré côté API client avec retry
   */
  const chargerDonnees = useCallback(async () => {
    if (!projetId) return;

    try {
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

      // Charger aussi la photo de profil si fournie (séparément car optionnel)
      if (onProfilPhotoLoad) {
        await onProfilPhotoLoad();
      }
    } catch (error) {
      logger.error('Erreur lors du chargement des données:', error);
      // Ne pas bloquer l'application si une requête échoue
      // Les données disponibles seront affichées
    }
  }, [projetId, dispatch, onProfilPhotoLoad]);

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
    if (!projetId) return;

    // Éviter les rechargements inutiles du même projet
    const memeProjet = dernierChargementRef.current.projetId === projetId;
    if (memeProjet) {
      return;
    }

    // Mettre à jour la référence
    dernierChargementRef.current = {
      projetId,
      timestamp: Date.now(),
    };

    // Charger les données
    chargerDonnees();

    // Marquer comme chargé après un court délai (UX)
    const timeoutId = setTimeout(() => {
      setIsInitialLoading(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [projetId, chargerDonnees]);

  return {
    isInitialLoading,
    refreshing,
    onRefresh,
  };
}
