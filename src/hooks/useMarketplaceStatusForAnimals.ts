/**
 * Hook pour enrichir les animaux avec leur statut marketplace
 * Récupère les listings actifs pour déterminer si un animal est en vente
 */

import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectProjetActif } from '../store/selectors/projetSelectors';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import apiClient from '../services/api/apiClient';
import type { MarketplaceListing } from '../types/marketplace';
import type { ProductionAnimal } from '../types/production';
import { createLoggerWithPrefix } from '../utils/logger';

const logger = createLoggerWithPrefix('useMarketplaceStatusForAnimals');

export interface AnimalWithMarketplaceStatus extends ProductionAnimal {
  marketplace_status?: 'available' | 'reserved' | 'sold' | null;
  marketplace_listing_id?: string | null;
  marketplace_listing?: MarketplaceListing | null;
}

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
  const loadMarketplaceListings = async () => {
    if (!projetActif?.id) {
      setMarketplaceListings([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Le backend retourne maintenant un objet avec pagination
      // Utiliser une limite élevée pour récupérer tous les listings du projet
      const response = await apiClient.get<{
        listings: MarketplaceListing[];
        total: number;
      }>('/marketplace/listings', {
        params: {
          projet_id: projetActif.id,
          limit: 500, // Récupérer tous les listings du projet (limite max)
        },
      });

      const listings = response.listings || [];

      // Filtrer uniquement les listings actifs (available, reserved)
      const activeListings = listings.filter(
        (listing) => listing.status === 'available' || listing.status === 'reserved'
      );

      setMarketplaceListings(activeListings);
      logger.debug(`[loadMarketplaceListings] ${activeListings.length} listings actifs chargés`);
    } catch (err: any) {
      logger.error('[loadMarketplaceListings] Erreur:', err);
      setError(err?.message || 'Erreur lors du chargement des listings');
      setMarketplaceListings([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger les listings au montage et quand le projet change
  useEffect(() => {
    loadMarketplaceListings();
  }, [projetActif?.id]);

  // Fonction pour enrichir un animal avec son statut marketplace
  const enrichAnimal = (animal: ProductionAnimal): AnimalWithMarketplaceStatus => {
    const listing = listingsByAnimalId.get(animal.id);
    
    return {
      ...animal,
      marketplace_status: listing?.status || null,
      marketplace_listing_id: listing?.id || null,
      marketplace_listing: listing || null,
    };
  };

  // Enrichir tous les animaux
  const animauxEnrichis = useMemo(() => {
    return animaux.map(enrichAnimal);
  }, [animaux, listingsByAnimalId]);

  return {
    animauxEnrichis,
    listingsByAnimalId,
    loading,
    error,
    refresh: loadMarketplaceListings,
  };
}

