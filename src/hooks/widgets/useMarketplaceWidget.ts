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
        const { getDatabase } = await import('../../services/database');
        const db = await getDatabase();
        const { MarketplaceListingRepository } = await import('../../database/repositories');
        const listingRepo = new MarketplaceListingRepository(db);

        const myListings = await listingRepo.findByFarmId(projetId);
        const myActiveListings = myListings.filter(
          (l) => l.status === 'available' || l.status === 'reserved'
        ).length;

        const allListings = await listingRepo.findAll();
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

