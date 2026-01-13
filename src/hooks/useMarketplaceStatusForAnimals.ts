/**
 * Hook pour enrichir les animaux avec leur statut marketplace
 * Récupère les listings actifs pour déterminer si un animal est en vente
 * Optimisé avec cache pour éviter les requêtes répétées
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectProjetActif } from '../store/selectors/projetSelectors';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import apiClient from '../services/api/apiClient';
import marketplaceCache from '../services/marketplaceCache';
import type { MarketplaceListing, MarketplaceStatus } from '../types/marketplace';
import type { ProductionAnimal } from '../types/production';
import { createLoggerWithPrefix } from '../utils/logger';

const logger = createLoggerWithPrefix('useMarketplaceStatusForAnimals');

export interface AnimalWithMarketplaceStatus extends ProductionAnimal {
  marketplace_status?: MarketplaceStatus | null;
  marketplace_listing_id?: string | null;
  marketplace_listing?: MarketplaceListing | null;
}

// Cache local pour les listings actifs par projet (spécialisé pour ce hook)
const activeListingsCache = new Map<string, { listings: MarketplaceListing[]; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Hook qui enrichit les animaux avec leur statut marketplace
 * @returns Map<animalId, marketplaceStatus> et fonction de rechargement
 */
export function useMarketplaceStatusForAnimals() {
  const projetActif = useAppSelector(selectProjetActif);
  const animaux = useAppSelector(selectAllAnimaux);
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastProjetIdRef = useRef<string | null>(null);
  const listingsRef = useRef<MarketplaceListing[]>([]); // Ref pour éviter les dépendances circulaires

  // Mettre à jour la ref quand les listings changent
  useEffect(() => {
    listingsRef.current = marketplaceListings;
  }, [marketplaceListings]);

  // Créer une map des listings par subject_id (pour individual) et par pig_ids (pour batch)
  const listingsByAnimalId = useMemo(() => {
    const map = new Map<string, MarketplaceListing>();
    
    marketplaceListings.forEach((listing) => {
      // Listings individuels
      if (listing.listingType === 'individual' && listing.subjectId) {
        map.set(listing.subjectId, listing);
      }
      
      // Listings batch - chaque pig_id dans pigIds
      if (listing.listingType === 'batch' && listing.pigIds && listing.pigIds.length > 0) {
        listing.pigIds.forEach((pigId) => {
          map.set(pigId, listing);
        });
      }
    });
    
    return map;
  }, [marketplaceListings]);

  // Fonction pour charger les listings actifs
  const loadMarketplaceListings = useCallback(async (forceRefresh = false) => {
    if (!projetActif?.id) {
      setMarketplaceListings([]);
      listingsRef.current = [];
      return;
    }

    const projetId = projetActif.id;
    
    // Éviter les requêtes en double pour le même projet
    if (!forceRefresh && lastProjetIdRef.current === projetId && listingsRef.current.length > 0) {
      return;
    }

    // Vérifier le cache local d'abord
    if (!forceRefresh) {
      const cached = activeListingsCache.get(projetId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setMarketplaceListings(cached.listings);
        listingsRef.current = cached.listings;
        lastProjetIdRef.current = projetId;
        logger.debug(`[loadMarketplaceListings] Cache HIT pour projet ${projetId}`);
        return;
      }
    }

    // Vérifier aussi le cache global marketplaceCache
    if (!forceRefresh) {
      const globalCache = marketplaceCache.getListings({ projet_id: projetId });
      if (globalCache && globalCache.length > 0) {
        const activeListings = globalCache.filter(
          (listing) => listing.status === 'available' || listing.status === 'reserved'
        );
        if (activeListings.length > 0) {
          setMarketplaceListings(activeListings);
          listingsRef.current = activeListings;
          lastProjetIdRef.current = projetId;
          // Mettre aussi dans le cache local
          activeListingsCache.set(projetId, { listings: activeListings, timestamp: Date.now() });
          logger.debug(`[loadMarketplaceListings] Cache global HIT pour projet ${projetId}`);
          return;
        }
      }
    }

    // Annuler les requêtes précédentes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // Utiliser une limite raisonnable - le backend pagine automatiquement
      const response = await apiClient.get<{
        listings: MarketplaceListing[];
        total: number;
      }>('/marketplace/listings', {
        params: {
          projet_id: projetId,
          limit: 100, // Limité à 100 pour les performances
        },
      });

      const listings = response.listings || [];

      // Filtrer uniquement les listings actifs (available, reserved)
      const activeListings = listings.filter(
        (listing) => listing.status === 'available' || listing.status === 'reserved'
      );

      // Mettre en cache local et global
      activeListingsCache.set(projetId, { listings: activeListings, timestamp: Date.now() });
      marketplaceCache.setListings({ projet_id: projetId }, listings); // Cache global avec tous les listings
      lastProjetIdRef.current = projetId;
      listingsRef.current = activeListings;

      setMarketplaceListings(activeListings);
      logger.debug(`[loadMarketplaceListings] ${activeListings.length} listings actifs chargés pour projet ${projetId}`);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      logger.error('[loadMarketplaceListings] Erreur:', err);
      setError(err?.message || 'Erreur lors du chargement des listings');
      setMarketplaceListings([]);
      listingsRef.current = [];
    } finally {
      setLoading(false);
    }
  }, [projetActif?.id]); // ✅ Corrigé : plus de dépendance sur marketplaceListings.length

  // Charger les listings au montage et quand le projet change
  useEffect(() => {
    loadMarketplaceListings();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadMarketplaceListings]); // ✅ Corrigé : inclure loadMarketplaceListings dans les dépendances

  // Fonction pour enrichir un animal avec son statut marketplace
  const enrichAnimal = useCallback((animal: ProductionAnimal): AnimalWithMarketplaceStatus => {
    const listing = listingsByAnimalId.get(animal.id);
    
    return {
      ...animal,
      marketplace_status: listing?.status || null,
      marketplace_listing_id: listing?.id || null,
      marketplace_listing: listing || null,
    };
  }, [listingsByAnimalId]);

  // Enrichir tous les animaux
  const animauxEnrichis = useMemo(() => {
    return animaux.map(enrichAnimal);
  }, [animaux, enrichAnimal]);

  // Fonction de rafraîchissement qui force le rechargement
  const refresh = useCallback(() => {
    if (projetActif?.id) {
      activeListingsCache.delete(projetActif.id);
      marketplaceCache.invalidateForProject(projetActif.id);
    }
    return loadMarketplaceListings(true);
  }, [projetActif?.id, loadMarketplaceListings]);

  return {
    animauxEnrichis,
    listingsByAnimalId,
    loading,
    error,
    refresh,
  };
}

// Fonction pour invalider le cache
export function invalidateMarketplaceStatusCache(projetId?: string): void {
  if (projetId) {
    activeListingsCache.delete(projetId);
    marketplaceCache.invalidateForProject(projetId);
  } else {
    activeListingsCache.clear();
    marketplaceCache.invalidateAll();
  }
}
