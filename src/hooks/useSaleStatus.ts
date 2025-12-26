/**
 * Hook pour gérer le statut des ventes marketplace
 * Gère le statut des sujets (inMarketplace, inHerd, etc.)
 */

import { useState, useCallback } from 'react';
import apiClient from '../services/api/apiClient';
import type { MarketplaceStatus } from '../types/marketplace';
import { logger } from '../utils/logger';

export interface SubjectSaleStatus {
  inMarketplace: boolean;
  marketplaceStatus: MarketplaceStatus | null;
  listingId: string | null;
}

/**
 * Hook pour gérer le statut de vente d'un sujet
 */
export function useSaleStatus(subjectId: string) {
  const [status, setStatus] = useState<SubjectSaleStatus>({
    inMarketplace: false,
    marketplaceStatus: null,
    listingId: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charger le statut actuel du sujet
   */
  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger l'animal depuis l'API backend
      const animal = await apiClient.get<any>(`/production/animaux/${subjectId}`);

      if (animal) {
        // Les champs marketplace_status et marketplace_listing_id peuvent être dans les données supplémentaires
        const marketplaceStatus = animal.marketplace_status;
        const marketplaceListingId = animal.marketplace_listing_id;
        
        setStatus({
          inMarketplace: !!marketplaceStatus,
          marketplaceStatus: marketplaceStatus as MarketplaceStatus | null,
          listingId: marketplaceListingId || null,
        });
      }
    } catch (err: unknown) {
      setError('Erreur lors du chargement du statut');
      logger.error('Error loading sale status:', err);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  /**
   * Mettre à jour le statut marketplace du sujet
   */
  const updateStatus = useCallback(
    async (marketplaceStatus: MarketplaceStatus | null, listingId: string | null) => {
      try {
        setLoading(true);
        setError(null);

        // Mettre à jour via l'API backend
        await apiClient.patch(`/production/animaux/${subjectId}`, {
          marketplace_status: marketplaceStatus,
          marketplace_listing_id: listingId,
        });

        setStatus({
          inMarketplace: !!marketplaceStatus,
          marketplaceStatus,
          listingId,
        });
      } catch (err: unknown) {
        setError('Erreur lors de la mise à jour du statut');
        logger.error('Error updating sale status:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [subjectId]
  );

  /**
   * Marquer le sujet comme mis en vente
   */
  const markAsListed = useCallback(
    async (listingId: string) => {
      await updateStatus('available', listingId);
    },
    [updateStatus]
  );

  /**
   * Marquer le sujet comme réservé
   */
  const markAsReserved = useCallback(async () => {
    await updateStatus('reserved', status.listingId);
  }, [updateStatus, status.listingId]);

  /**
   * Marquer le sujet comme vendu
   */
  const markAsSold = useCallback(async () => {
    await updateStatus('sold', status.listingId);
  }, [updateStatus, status.listingId]);

  /**
   * Retirer le sujet du marketplace
   */
  const removeFromMarketplace = useCallback(async () => {
    await updateStatus(null, null);
  }, [updateStatus]);

  return {
    status,
    loading,
    error,
    loadStatus,
    markAsListed,
    markAsReserved,
    markAsSold,
    removeFromMarketplace,
  };
}

/**
 * Hook pour gérer le statut de plusieurs sujets
 */
export function useBulkSaleStatus(subjectIds: string[]) {
  const [statuses, setStatuses] = useState<Map<string, SubjectSaleStatus>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charger les statuts de tous les sujets
   */
  const loadStatuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer tous les animaux depuis l'API backend
      const animals = await Promise.all(
        subjectIds.map((id) => apiClient.get<any>(`/production/animaux/${id}`))
      );

      const statusMap = new Map<string, SubjectSaleStatus>();
      animals.forEach((animal, index) => {
        if (animal) {
          const marketplaceStatus = animal.marketplace_status;
          const marketplaceListingId = animal.marketplace_listing_id;
          
          statusMap.set(subjectIds[index], {
            inMarketplace: !!marketplaceStatus,
            marketplaceStatus: marketplaceStatus as MarketplaceStatus | null,
            listingId: marketplaceListingId || null,
          });
        }
      });

      setStatuses(statusMap);
    } catch (err: unknown) {
      setError('Erreur lors du chargement des statuts');
      logger.error('Error loading bulk sale statuses:', err);
    } finally {
      setLoading(false);
    }
  }, [subjectIds]);

  /**
   * Marquer plusieurs sujets comme mis en vente
   */
  const markMultipleAsListed = useCallback(
    async (listingId: string) => {
      try {
        setLoading(true);
        setError(null);

        // Mettre à jour chaque animal individuellement via l'API backend
        await Promise.all(
          subjectIds.map((id) =>
            apiClient.patch(`/production/animaux/${id}`, {
              marketplace_status: 'available',
              marketplace_listing_id: listingId,
            })
          )
        );

        // Recharger les statuts
        await loadStatuses();
      } catch (err: unknown) {
        setError('Erreur lors de la mise à jour multiple');
        logger.error('Error bulk updating sale status:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [subjectIds, loadStatuses]
  );

  return {
    statuses,
    loading,
    error,
    loadStatuses,
    markMultipleAsListed,
  };
}
