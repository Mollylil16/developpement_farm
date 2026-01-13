/**
 * Service de cache pour le Marketplace
 * Optimise les performances en évitant les rechargements inutiles
 */

import { MarketplaceListing, FarmCard } from '../types/marketplace';
import { createLoggerWithPrefix } from '../utils/logger';

const logger = createLoggerWithPrefix('MarketplaceCache');

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PaginatedCache<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  lastFetchedAt: number;
}

// Durée de vie du cache (en ms)
const CACHE_TTL = {
  LISTINGS: 5 * 60 * 1000, // 5 minutes
  FARMS: 10 * 60 * 1000, // 10 minutes
  ENRICHED_DATA: 15 * 60 * 1000, // 15 minutes
  ANIMAL_INFO: 30 * 60 * 1000, // 30 minutes
};

// Taille de page par défaut
export const DEFAULT_PAGE_SIZE = 20;

class MarketplaceCacheService {
  private listingsCache: Map<string, CacheEntry<MarketplaceListing[]>> = new Map();
  private farmsCache: Map<string, CacheEntry<FarmCard[]>> = new Map();
  private enrichedListingsCache: Map<string, CacheEntry<MarketplaceListing>> = new Map();
  private animalInfoCache: Map<string, CacheEntry<any>> = new Map();
  private paginatedListingsCache: Map<string, PaginatedCache<MarketplaceListing>> = new Map();

  /**
   * Génère une clé de cache unique basée sur les paramètres
   */
  private generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Vérifie si une entrée de cache est valide
   */
  private isValid<T>(entry: CacheEntry<T> | undefined): boolean {
    if (!entry) return false;
    return Date.now() < entry.expiresAt;
  }

  // ==================== LISTINGS CACHE ====================

  /**
   * Récupère les listings du cache
   */
  getListings(params: Record<string, any>): MarketplaceListing[] | null {
    const key = this.generateCacheKey('listings', params);
    const entry = this.listingsCache.get(key);
    
    if (this.isValid(entry)) {
      logger.debug(`[Cache HIT] Listings: ${key}`);
      return entry!.data;
    }
    
    logger.debug(`[Cache MISS] Listings: ${key}`);
    return null;
  }

  /**
   * Stocke les listings dans le cache
   */
  setListings(params: Record<string, any>, data: MarketplaceListing[]): void {
    const key = this.generateCacheKey('listings', params);
    this.listingsCache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL.LISTINGS,
    });
    logger.debug(`[Cache SET] Listings: ${key} (${data.length} items)`);
  }

  // ==================== PAGINATED LISTINGS ====================

  /**
   * Récupère les listings paginés
   */
  getPaginatedListings(cacheKey: string): PaginatedCache<MarketplaceListing> | null {
    const cache = this.paginatedListingsCache.get(cacheKey);
    
    if (cache && Date.now() - cache.lastFetchedAt < CACHE_TTL.LISTINGS) {
      logger.debug(`[Cache HIT] Paginated: ${cacheKey}`);
      return cache;
    }
    
    return null;
  }

  /**
   * Initialise ou met à jour le cache paginé
   */
  setPaginatedListings(
    cacheKey: string,
    items: MarketplaceListing[],
    total: number,
    page: number,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): void {
    const existingCache = this.paginatedListingsCache.get(cacheKey);
    
    if (page === 1 || !existingCache) {
      // Première page ou nouveau cache
      this.paginatedListingsCache.set(cacheKey, {
        items,
        total,
        page,
        pageSize,
        hasMore: items.length === pageSize && page * pageSize < total,
        lastFetchedAt: Date.now(),
      });
    } else {
      // Ajouter à l'existant (pagination infinie)
      const newItems = [...existingCache.items, ...items];
      this.paginatedListingsCache.set(cacheKey, {
        items: newItems,
        total,
        page,
        pageSize,
        hasMore: items.length === pageSize && page * pageSize < total,
        lastFetchedAt: Date.now(),
      });
    }
    
    logger.debug(`[Cache SET] Paginated: ${cacheKey} (page ${page}, ${items.length} new items)`);
  }

  /**
   * Récupère la prochaine page de listings
   */
  getNextPageInfo(cacheKey: string): { page: number; pageSize: number } | null {
    const cache = this.paginatedListingsCache.get(cacheKey);
    
    if (!cache || !cache.hasMore) {
      return null;
    }
    
    return {
      page: cache.page + 1,
      pageSize: cache.pageSize,
    };
  }

  // ==================== FARMS CACHE ====================

  /**
   * Récupère les fermes groupées du cache
   */
  getFarms(params: Record<string, any>): FarmCard[] | null {
    const key = this.generateCacheKey('farms', params);
    const entry = this.farmsCache.get(key);
    
    if (this.isValid(entry)) {
      logger.debug(`[Cache HIT] Farms: ${key}`);
      return entry!.data;
    }
    
    return null;
  }

  /**
   * Stocke les fermes groupées dans le cache
   */
  setFarms(params: Record<string, any>, data: FarmCard[]): void {
    const key = this.generateCacheKey('farms', params);
    this.farmsCache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL.FARMS,
    });
    logger.debug(`[Cache SET] Farms: ${key} (${data.length} items)`);
  }

  // ==================== ENRICHED LISTINGS CACHE ====================

  /**
   * Récupère un listing enrichi du cache
   */
  getEnrichedListing(listingId: string): MarketplaceListing | null {
    const entry = this.enrichedListingsCache.get(listingId);
    
    if (this.isValid(entry)) {
      return entry!.data;
    }
    
    return null;
  }

  /**
   * Stocke un listing enrichi
   */
  setEnrichedListing(listingId: string, data: MarketplaceListing): void {
    this.enrichedListingsCache.set(listingId, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL.ENRICHED_DATA,
    });
  }

  /**
   * Récupère plusieurs listings enrichis (batch)
   */
  getEnrichedListingsBatch(listingIds: string[]): {
    found: Map<string, MarketplaceListing>;
    missing: string[];
  } {
    const found = new Map<string, MarketplaceListing>();
    const missing: string[] = [];

    for (const id of listingIds) {
      const cached = this.getEnrichedListing(id);
      if (cached) {
        found.set(id, cached);
      } else {
        missing.push(id);
      }
    }

    logger.debug(`[Cache BATCH] Enriched: ${found.size} hits, ${missing.length} misses`);
    return { found, missing };
  }

  // ==================== ANIMAL INFO CACHE ====================

  /**
   * Récupère les infos d'un animal du cache
   */
  getAnimalInfo(animalId: string): any | null {
    const entry = this.animalInfoCache.get(animalId);
    
    if (this.isValid(entry)) {
      return entry!.data;
    }
    
    return null;
  }

  /**
   * Stocke les infos d'un animal
   */
  setAnimalInfo(animalId: string, data: any): void {
    this.animalInfoCache.set(animalId, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL.ANIMAL_INFO,
    });
  }

  /**
   * Récupère les infos de plusieurs animaux (batch)
   */
  getAnimalInfoBatch(animalIds: string[]): {
    found: Map<string, any>;
    missing: string[];
  } {
    const found = new Map<string, any>();
    const missing: string[] = [];

    for (const id of animalIds) {
      const cached = this.getAnimalInfo(id);
      if (cached) {
        found.set(id, cached);
      } else {
        missing.push(id);
      }
    }

    return { found, missing };
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Invalide le cache pour un projet spécifique
   */
  invalidateForProject(projectId: string): void {
    // Invalider les listings
    for (const [key] of this.listingsCache) {
      if (key.includes(projectId)) {
        this.listingsCache.delete(key);
      }
    }
    
    // Invalider les listings paginés
    for (const [key] of this.paginatedListingsCache) {
      if (key.includes(projectId)) {
        this.paginatedListingsCache.delete(key);
      }
    }
    
    // Invalider les fermes
    for (const [key] of this.farmsCache) {
      if (key.includes(projectId)) {
        this.farmsCache.delete(key);
      }
    }
    
    logger.info(`[Cache INVALIDATE] Project: ${projectId}`);
  }

  /**
   * Invalide tout le cache
   */
  invalidateAll(): void {
    this.listingsCache.clear();
    this.paginatedListingsCache.clear();
    this.farmsCache.clear();
    this.enrichedListingsCache.clear();
    this.animalInfoCache.clear();
    logger.info('[Cache INVALIDATE] All caches cleared');
  }

  /**
   * Nettoie les entrées expirées
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.listingsCache) {
      if (now >= entry.expiresAt) {
        this.listingsCache.delete(key);
        cleaned++;
      }
    }

    for (const [key, entry] of this.farmsCache) {
      if (now >= entry.expiresAt) {
        this.farmsCache.delete(key);
        cleaned++;
      }
    }

    for (const [key, entry] of this.enrichedListingsCache) {
      if (now >= entry.expiresAt) {
        this.enrichedListingsCache.delete(key);
        cleaned++;
      }
    }

    for (const [key, entry] of this.animalInfoCache) {
      if (now >= entry.expiresAt) {
        this.animalInfoCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`[Cache CLEANUP] Removed ${cleaned} expired entries`);
    }
  }

  /**
   * Statistiques du cache
   */
  getStats(): {
    listings: number;
    paginatedListings: number;
    farms: number;
    enrichedListings: number;
    animalInfo: number;
  } {
    return {
      listings: this.listingsCache.size,
      paginatedListings: this.paginatedListingsCache.size,
      farms: this.farmsCache.size,
      enrichedListings: this.enrichedListingsCache.size,
      animalInfo: this.animalInfoCache.size,
    };
  }
}

// Instance singleton
export const marketplaceCache = new MarketplaceCacheService();

// Nettoyage automatique toutes les 5 minutes
setInterval(() => {
  marketplaceCache.cleanup();
}, 5 * 60 * 1000);

export default marketplaceCache;
