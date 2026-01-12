/**
 * Hook spécialisé pour le widget Marketplace
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { logger } from '../../utils/logger';

export interface MarketplaceWidgetData {
  emoji: string;
  title: string;
  primary: number;
  secondary: number;
  labelPrimary: string;
  labelSecondary: string;
}

export function useMarketplaceWidget(projetId?: string): MarketplaceWidgetData | null {
  const [marketplaceStats, setMarketplaceStats] = useState({ myListings: 0, available: 0 });
  const dataChargeesRef = useRef<string | null>(null);

  // Charger les stats du marketplace
  useEffect(() => {
    if (!projetId) {
      dataChargeesRef.current = null;
      return;
    }

    const cle = `marketplace-${projetId}`;
    if (dataChargeesRef.current === cle) return;

    dataChargeesRef.current = cle;

    (async () => {
      try {
        const apiClient = (await import('../../services/api/apiClient')).default;

        // Charger les listings depuis l'API backend
        // Le backend retourne maintenant un objet avec pagination
        const myListingsResponse = await apiClient.get<{
          listings: any[];
          total: number;
        }>('/marketplace/listings', {
          params: { 
            projet_id: projetId,
            limit: 500, // Récupérer tous les listings du projet (limite max)
          },
        });
        const myListings = myListingsResponse.listings || [];
        const myActiveListings = myListings.filter(
          (l) => l.status === 'available' || l.status === 'reserved'
        ).length;

        // Charger les listings disponibles (excluant ceux de l'utilisateur)
        // Utiliser exclude_own_listings pour exclure automatiquement
        const allListingsResponse = await apiClient.get<{
          listings: any[];
          total: number;
        }>('/marketplace/listings', {
          params: {
            exclude_own_listings: 'true', // Exclure les listings de l'utilisateur connecté
            limit: 500, // Récupérer tous les listings disponibles (limite max)
          },
        });
        const allListings = allListingsResponse.listings || [];
        const availableListings = allListings.filter(
          (l) => l.status === 'available' || l.status === 'reserved'
        ).length;

        setMarketplaceStats({
          myListings: myActiveListings,
          available: availableListings,
        });
      } catch (error) {
        logger.error('Erreur chargement stats marketplace:', error);
      }
    })();
  }, [projetId]);

  return useMemo(() => {
    if (!projetId) return null;

    return {
      emoji: '🏪',
      title: 'Marketplace',
      primary: marketplaceStats.myListings,
      secondary: marketplaceStats.available,
      labelPrimary: 'Annonces',
      labelSecondary: 'Disponibles',
    };
  }, [projetId, marketplaceStats]);
}
