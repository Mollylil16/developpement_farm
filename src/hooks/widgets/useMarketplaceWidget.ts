/**
 * Hook spécialisé pour le widget Marketplace
 */

import { useState, useEffect, useMemo, useRef } from 'react';

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
        const myListings = await apiClient.get<any[]>('/marketplace/listings', {
          params: { projet_id: projetId },
        });
        const myActiveListings = myListings.filter(
          (l) => l.status === 'available' || l.status === 'reserved'
        ).length;

        const allListings = await apiClient.get<any[]>('/marketplace/listings');
        const availableListings = allListings.filter(
          (l) => (l.status === 'available' || l.status === 'reserved') && l.farmId !== projetId
        ).length;

        setMarketplaceStats({
          myListings: myActiveListings,
          available: availableListings,
        });
      } catch (error) {
        console.error('Erreur chargement stats marketplace:', error);
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
