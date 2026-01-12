/**
 * Service de cache simple pour les listings du marketplace
 * Stocke les listings récemment consultés pour améliorer les performances
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MarketplaceListing } from '../types/marketplace';

const CACHE_KEY = '@marketplace_listings_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum 100 listings en cache

interface CachedListings {
  listings: MarketplaceListing[];
  timestamp: number;
  filters?: string; // Hash des filtres pour invalider le cache si les filtres changent
}

/**
 * Génère un hash simple des filtres pour identifier le cache
 */
function hashFilters(filters: any, sort?: string, page?: number): string {
  return JSON.stringify({ filters, sort, page });
}

/**
 * Récupère les listings du cache s'ils sont encore valides
 */
export async function getCachedListings(
  filters?: any,
  sort?: string,
  page?: number
): Promise<MarketplaceListing[] | null> {
  try {
    const cacheKey = hashFilters(filters, sort, page);
    const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${cacheKey}`);
    
    if (!cached) {
      return null;
    }

    const cachedData: CachedListings = JSON.parse(cached);
    const now = Date.now();
    
    // Vérifier si le cache est encore valide
    if (now - cachedData.timestamp > CACHE_EXPIRY_MS) {
      // Cache expiré, le supprimer
      await AsyncStorage.removeItem(`${CACHE_KEY}_${cacheKey}`);
      return null;
    }

    // Vérifier que les filtres correspondent
    if (cachedData.filters !== cacheKey) {
      return null;
    }

    return cachedData.listings;
  } catch (error) {
    console.error('[marketplaceCache] Erreur lors de la récupération du cache:', error);
    return null;
  }
}

/**
 * Stocke les listings dans le cache
 */
export async function setCachedListings(
  listings: MarketplaceListing[],
  filters?: any,
  sort?: string,
  page?: number
): Promise<void> {
  try {
    const cacheKey = hashFilters(filters, sort, page);
    const cachedData: CachedListings = {
      listings: listings.slice(0, MAX_CACHE_SIZE), // Limiter la taille du cache
      timestamp: Date.now(),
      filters: cacheKey,
    };

    await AsyncStorage.setItem(`${CACHE_KEY}_${cacheKey}`, JSON.stringify(cachedData));
    
    // Nettoyer les anciens caches si nécessaire (garder seulement les 10 derniers)
    await cleanupOldCaches();
  } catch (error) {
    console.error('[marketplaceCache] Erreur lors du stockage du cache:', error);
  }
}

/**
 * Nettoie les anciens caches pour éviter de remplir AsyncStorage
 */
async function cleanupOldCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY));
    
    if (cacheKeys.length <= 10) {
      return; // Pas besoin de nettoyer si moins de 10 caches
    }

    // Récupérer tous les caches avec leur timestamp
    const cachesWithTime: Array<{ key: string; timestamp: number }> = [];
    
    for (const key of cacheKeys) {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cachedData: CachedListings = JSON.parse(cached);
          cachesWithTime.push({ key, timestamp: cachedData.timestamp });
        }
      } catch (error) {
        // Ignorer les erreurs de parsing
      }
    }

    // Trier par timestamp (plus ancien en premier)
    cachesWithTime.sort((a, b) => a.timestamp - b.timestamp);

    // Supprimer les caches les plus anciens (garder seulement les 10 derniers)
    const toRemove = cachesWithTime.slice(0, cachesWithTime.length - 10);
    for (const { key } of toRemove) {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error('[marketplaceCache] Erreur lors du nettoyage du cache:', error);
  }
}

/**
 * Vide tout le cache du marketplace
 */
export async function clearMarketplaceCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY));
    
    for (const key of cacheKeys) {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error('[marketplaceCache] Erreur lors du vidage du cache:', error);
  }
}
