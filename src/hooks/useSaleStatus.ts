/**
 * Hook pour gérer le statut des ventes marketplace
 * Gère le statut des sujets (inMarketplace, inHerd, etc.)
 */

import { useState, useCallback } from 'react';
import { getDatabase } from '../services/database';
import type { MarketplaceStatus } from '../types/marketplace';

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

      const db = await getDatabase();
      
      // Récupérer les colonnes marketplace du sujet
      const result = await db.getFirstAsync<{
        marketplace_status: string | null;
        marketplace_listing_id: string | null;
      }>(
        `SELECT marketplace_status, marketplace_listing_id 
         FROM production_animaux 
         WHERE id = ?`,
        [subjectId]
      );

      if (result) {
        setStatus({
          inMarketplace: !!result.marketplace_status,
          marketplaceStatus: result.marketplace_status as MarketplaceStatus | null,
          listingId: result.marketplace_listing_id,
        });
      }
    } catch (err: any) {
      setError('Erreur lors du chargement du statut');
      console.error('Error loading sale status:', err);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  /**
   * Mettre à jour le statut marketplace du sujet
   */
  const updateStatus = useCallback(
    async (
      marketplaceStatus: MarketplaceStatus | null,
      listingId: string | null
    ) => {
      try {
        setLoading(true);
        setError(null);

        const db = await getDatabase();
        
        await db.runAsync(
          `UPDATE production_animaux 
           SET marketplace_status = ?, marketplace_listing_id = ? 
           WHERE id = ?`,
          [marketplaceStatus, listingId, subjectId]
        );

        setStatus({
          inMarketplace: !!marketplaceStatus,
          marketplaceStatus,
          listingId,
        });
      } catch (err: any) {
        setError('Erreur lors de la mise à jour du statut');
        console.error('Error updating sale status:', err);
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

      const db = await getDatabase();
      
      const placeholders = subjectIds.map(() => '?').join(',');
      const results = await db.getAllAsync<{
        id: string;
        marketplace_status: string | null;
        marketplace_listing_id: string | null;
      }>(
        `SELECT id, marketplace_status, marketplace_listing_id 
         FROM production_animaux 
         WHERE id IN (${placeholders})`,
        subjectIds
      );

      const statusMap = new Map<string, SubjectSaleStatus>();
      results.forEach((result) => {
        statusMap.set(result.id, {
          inMarketplace: !!result.marketplace_status,
          marketplaceStatus: result.marketplace_status as MarketplaceStatus | null,
          listingId: result.marketplace_listing_id,
        });
      });

      setStatuses(statusMap);
    } catch (err: any) {
      setError('Erreur lors du chargement des statuts');
      console.error('Error loading bulk sale statuses:', err);
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

        const db = await getDatabase();
        
        const placeholders = subjectIds.map(() => '?').join(',');
        await db.runAsync(
          `UPDATE production_animaux 
           SET marketplace_status = 'available', marketplace_listing_id = ? 
           WHERE id IN (${placeholders})`,
          [listingId, ...subjectIds]
        );

        // Recharger les statuts
        await loadStatuses();
      } catch (err: any) {
        setError('Erreur lors de la mise à jour multiple');
        console.error('Error bulk updating sale status:', err);
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

