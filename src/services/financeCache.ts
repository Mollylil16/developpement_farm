/**
 * Cache pour les calculs financiers (marges, coûts de production)
 * Réduit les appels API en mettant en cache les résultats récents
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLoggerWithPrefix } from '../utils/logger';

const logger = createLoggerWithPrefix('FinanceCache');

const CACHE_KEY_PREFIX = '@fermier_pro:finance_cache:';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes (calculs financiers changent moins fréquemment)

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  projetId: string;
}

// Cache pour les coûts de production (par projet et période)
const COUTS_PRODUCTION_KEY = (projetId: string, dateDebut: string, dateFin: string) =>
  `${CACHE_KEY_PREFIX}cout_production:${projetId}:${dateDebut}:${dateFin}`;

// Cache pour les marges calculées (par vente)
const MARGES_VENTE_KEY = (venteId: string) =>
  `${CACHE_KEY_PREFIX}marges_vente:${venteId}`;

/**
 * Met en cache les coûts de production calculés
 */
export async function setCachedCoutsProduction(
  projetId: string,
  dateDebut: string,
  dateFin: string,
  couts: {
    total_opex: number;
    total_amortissement_capex: number;
    total_kg_vendus: number;
    cout_kg_opex: number;
    cout_kg_complet: number;
  }
): Promise<void> {
  try {
    const key = COUTS_PRODUCTION_KEY(projetId, dateDebut, dateFin);
    const entry: CacheEntry<typeof couts> = {
      data: couts,
      timestamp: Date.now(),
      projetId,
    };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    logger.debug(`Coûts de production mis en cache pour ${projetId} (${dateDebut} - ${dateFin})`);
  } catch (error) {
    logger.error('Erreur lors de la mise en cache des coûts de production:', error);
  }
}

/**
 * Récupère les coûts de production en cache
 */
export async function getCachedCoutsProduction(
  projetId: string,
  dateDebut: string,
  dateFin: string
): Promise<{
  total_opex: number;
  total_amortissement_capex: number;
  total_kg_vendus: number;
  cout_kg_opex: number;
  cout_kg_complet: number;
} | null> {
  try {
    const key = COUTS_PRODUCTION_KEY(projetId, dateDebut, dateFin);
    const item = await AsyncStorage.getItem(key);

    if (item) {
      const entry: CacheEntry<any> = JSON.parse(item);
      if (Date.now() - entry.timestamp < CACHE_TTL_MS && entry.projetId === projetId) {
        logger.debug(`Coûts de production récupérés du cache pour ${projetId}`);
        return entry.data;
      } else {
        logger.debug(`Cache expiré pour ${projetId}, suppression...`);
        await AsyncStorage.removeItem(key);
      }
    }
    return null;
  } catch (error) {
    logger.error('Erreur lors de la récupération du cache des coûts de production:', error);
    return null;
  }
}

/**
 * Met en cache les marges calculées pour une vente
 */
export async function setCachedMargesVente(
  venteId: string,
  marges: {
    poids_kg: number;
    cout_kg_opex: number;
    cout_kg_complet: number;
    cout_reel_opex: number;
    cout_reel_complet: number;
    marge_opex: number;
    marge_complete: number;
    marge_opex_pourcent: number;
    marge_complete_pourcent: number;
  }
): Promise<void> {
  try {
    const key = MARGES_VENTE_KEY(venteId);
    const entry: CacheEntry<typeof marges> = {
      data: marges,
      timestamp: Date.now(),
      projetId: '', // Pas nécessaire pour les marges par vente
    };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    logger.debug(`Marges mises en cache pour la vente ${venteId}`);
  } catch (error) {
    logger.error('Erreur lors de la mise en cache des marges:', error);
  }
}

/**
 * Récupère les marges calculées en cache
 */
export async function getCachedMargesVente(
  venteId: string
): Promise<{
  poids_kg: number;
  cout_kg_opex: number;
  cout_kg_complet: number;
  cout_reel_opex: number;
  cout_reel_complet: number;
  marge_opex: number;
  marge_complete: number;
  marge_opex_pourcent: number;
  marge_complete_pourcent: number;
} | null> {
  try {
    const key = MARGES_VENTE_KEY(venteId);
    const item = await AsyncStorage.getItem(key);

    if (item) {
      const entry: CacheEntry<any> = JSON.parse(item);
      if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
        logger.debug(`Marges récupérées du cache pour la vente ${venteId}`);
        return entry.data;
      } else {
        logger.debug(`Cache expiré pour la vente ${venteId}, suppression...`);
        await AsyncStorage.removeItem(key);
      }
    }
    return null;
  } catch (error) {
    logger.error('Erreur lors de la récupération du cache des marges:', error);
    return null;
  }
}

/**
 * Invalide le cache des coûts de production pour un projet
 * Utile lorsque des dépenses ou charges fixes sont modifiées
 */
export async function invalidateCoutsProductionCache(projetId: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) =>
      key.startsWith(`${CACHE_KEY_PREFIX}cout_production:${projetId}:`)
    );
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      logger.debug(`Cache des coûts de production invalidé pour ${projetId} (${cacheKeys.length} entrées)`);
    }
  } catch (error) {
    logger.error('Erreur lors de l\'invalidation du cache des coûts:', error);
  }
}

/**
 * Invalide le cache des marges pour une vente spécifique
 */
export async function invalidateMargesVenteCache(venteId: string): Promise<void> {
  try {
    const key = MARGES_VENTE_KEY(venteId);
    await AsyncStorage.removeItem(key);
    logger.debug(`Cache des marges invalidé pour la vente ${venteId}`);
  } catch (error) {
    logger.error('Erreur lors de l\'invalidation du cache des marges:', error);
  }
}

/**
 * Nettoie tous les caches financiers expirés
 */
export async function clearExpiredFinanceCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const financeKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    
    let cleanedCount = 0;
    for (const key of financeKeys) {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          const entry: CacheEntry<any> = JSON.parse(item);
          if (Date.now() - entry.timestamp >= CACHE_TTL_MS) {
            await AsyncStorage.removeItem(key);
            cleanedCount++;
          }
        }
      } catch (error) {
        // Si erreur de parsing, supprimer la clé corrompue
        await AsyncStorage.removeItem(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug(`Nettoyage de ${cleanedCount} caches financiers expirés`);
    }
  } catch (error) {
    logger.error('Erreur lors du nettoyage des caches financiers:', error);
  }
}

/**
 * Nettoie tous les caches financiers (pour un projet ou tous)
 */
export async function clearAllFinanceCaches(projetId?: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    let financeKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    
    if (projetId) {
      // Nettoyer uniquement les caches du projet spécifié
      financeKeys = financeKeys.filter((key) => key.includes(projetId));
    }
    
    if (financeKeys.length > 0) {
      await AsyncStorage.multiRemove(financeKeys);
      logger.debug(`Nettoyage de ${financeKeys.length} caches financiers${projetId ? ` pour ${projetId}` : ''}`);
    }
  } catch (error) {
    logger.error('Erreur lors du nettoyage complet des caches financiers:', error);
  }
}
