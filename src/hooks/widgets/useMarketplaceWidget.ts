/**
 * Hook spécialisé pour le widget Marketplace
 * Optimisé pour ne charger que les compteurs (pas tous les listings)
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

// Cache des stats pour éviter les requêtes répétées
const statsCache = new Map<string, { stats: { myListings: number; available: number }; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useMarketplaceWidget(projetId?: string): MarketplaceWidgetData | null {
  const [marketplaceStats, setMarketplaceStats] = useState({ myListings: 0, available: 0 });
  const dataChargeesRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Charger les stats du marketplace
  useEffect(() => {
    if (!projetId) {
      dataChargeesRef.current = null;
      return;
    }

    const cle = `marketplace-${projetId}`;
    if (dataChargeesRef.current === cle) return;

    dataChargeesRef.current = cle;

    // Vérifier le cache
    const cached = statsCache.get(cle);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setMarketplaceStats(cached.stats);
      return;
    }

    // Annuler les requêtes précédentes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    (async () => {
      try {
        const apiClient = (await import('../../services/api/apiClient')).default;

        // Utiliser des requêtes légères avec limit=1 et récupérer uniquement le total
        // Le backend retourne {listings, total} - on n'a besoin que du total
        const [myListingsResponse, allListingsResponse] = await Promise.all([
          // Mes annonces actives
          apiClient.get<{ listings: any[]; total: number }>('/marketplace/listings', {
            params: { 
              projet_id: projetId,
              limit: 1, // On ne veut que le compteur total
            },
          }),
          // Annonces disponibles (excluant les miennes)
          apiClient.get<{ listings: any[]; total: number }>('/marketplace/listings', {
            params: {
              exclude_own_listings: 'true',
              limit: 1, // On ne veut que le compteur total
            },
          }),
        ]);

        const stats = {
          myListings: myListingsResponse.total || 0,
          available: allListingsResponse.total || 0,
        };

        // Mettre en cache
        statsCache.set(cle, { stats, timestamp: Date.now() });

        setMarketplaceStats(stats);
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        logger.error('Erreur chargement stats marketplace:', error);
      }
    })();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
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

// Fonction pour invalider le cache du widget
export function invalidateMarketplaceWidgetCache(projetId?: string): void {
  if (projetId) {
    statsCache.delete(`marketplace-${projetId}`);
  } else {
    statsCache.clear();
  }
}
