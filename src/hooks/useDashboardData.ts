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
   * Charge les données du dashboard de manière séquencée pour éviter les rate limits
   */
  const chargerDonnees = useCallback(async () => {
    if (!projetId) return;

    try {
      // Séquencer les requêtes pour éviter le rate limiting
      // Commencer par les données les plus critiques
      await dispatch(
        loadProductionAnimaux({
          projetId,
          inclureInactifs: true,
        })
      ).unwrap();

      // Petit délai entre les requêtes pour éviter le rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));

      await dispatch(loadMortalitesParProjet(projetId)).unwrap();

      await new Promise((resolve) => setTimeout(resolve, 100));

      await dispatch(loadStatistiquesMortalite(projetId)).unwrap();

      await new Promise((resolve) => setTimeout(resolve, 100));

      await dispatch(
        loadPeseesRecents({
          projetId,
          limit: 20,
        })
      ).unwrap();

      // Charger aussi la photo de profil si fournie
      if (onProfilPhotoLoad) {
        await onProfilPhotoLoad();
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
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
      console.error('Erreur lors du rafraîchissement:', error);
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
