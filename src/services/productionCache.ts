/**
 * Service de cache pour les données Production
 * Stocke les animaux et pesées récemment chargés pour améliorer les performances
 * et permettre un fonctionnement hors ligne limité
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProductionAnimal, ProductionPesee } from '../types/production';
import { createLoggerWithPrefix } from '../utils/logger';

const logger = createLoggerWithPrefix('ProductionCache');

const CACHE_KEY_ANIMAUX = '@production_animaux_cache';
const CACHE_KEY_PESEES = '@production_pesees_cache';
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 500; // Maximum 500 animaux en cache

interface CachedAnimals {
  animaux: ProductionAnimal[];
  projetId: string;
  timestamp: number;
}

interface CachedPesees {
  pesees: ProductionPesee[];
  animalId?: string;
  projetId?: string;
  timestamp: number;
}

/**
 * Récupère les animaux du cache s'ils sont encore valides
 */
export async function getCachedAnimaux(
  projetId: string
): Promise<ProductionAnimal[] | null> {
  try {
    const cacheKey = `${CACHE_KEY_ANIMAUX}_${projetId}`;
    const cached = await AsyncStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const cachedData: CachedAnimals = JSON.parse(cached);
    const now = Date.now();

    // Vérifier si le cache est encore valide et correspond au projet
    if (
      now - cachedData.timestamp > CACHE_EXPIRY_MS ||
      cachedData.projetId !== projetId
    ) {
      // Cache expiré ou projet différent, le supprimer
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    logger.debug(`[getCachedAnimaux] Cache valide pour projet ${projetId}`);
    return cachedData.animaux;
  } catch (error) {
    logger.error('[getCachedAnimaux] Erreur lors de la récupération du cache:', error);
    return null;
  }
}

/**
 * Stocke les animaux dans le cache
 */
export async function setCachedAnimaux(
  animaux: ProductionAnimal[],
  projetId: string
): Promise<void> {
  try {
    const cacheKey = `${CACHE_KEY_ANIMAUX}_${projetId}`;
    const cachedData: CachedAnimals = {
      animaux: animaux.slice(0, MAX_CACHE_SIZE), // Limiter la taille du cache
      projetId,
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));
    logger.debug(`[setCachedAnimaux] Cache mis à jour pour projet ${projetId}`);
    
    // Nettoyer les anciens caches si nécessaire
    await cleanupOldCaches();
  } catch (error) {
    logger.error('[setCachedAnimaux] Erreur lors du stockage du cache:', error);
  }
}

/**
 * Récupère les pesées du cache pour un animal ou projet
 */
export async function getCachedPesees(
  animalId?: string,
  projetId?: string
): Promise<ProductionPesee[] | null> {
  try {
    const cacheKey = animalId
      ? `${CACHE_KEY_PESEES}_animal_${animalId}`
      : projetId
      ? `${CACHE_KEY_PESEES}_projet_${projetId}`
      : null;

    if (!cacheKey) {
      return null;
    }

    const cached = await AsyncStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const cachedData: CachedPesees = JSON.parse(cached);
    const now = Date.now();

    // Vérifier si le cache est encore valide
    if (now - cachedData.timestamp > CACHE_EXPIRY_MS) {
      // Cache expiré, le supprimer
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    // Vérifier que les paramètres correspondent
    if (
      (animalId && cachedData.animalId !== animalId) ||
      (projetId && cachedData.projetId !== projetId)
    ) {
      return null;
    }

    logger.debug(
      `[getCachedPesees] Cache valide pour ${animalId ? `animal ${animalId}` : `projet ${projetId}`}`
    );
    return cachedData.pesees;
  } catch (error) {
    logger.error('[getCachedPesees] Erreur lors de la récupération du cache:', error);
    return null;
  }
}

/**
 * Stocke les pesées dans le cache
 */
export async function setCachedPesees(
  pesees: ProductionPesee[],
  animalId?: string,
  projetId?: string
): Promise<void> {
  try {
    if (!animalId && !projetId) {
      return;
    }

    const cacheKey = animalId
      ? `${CACHE_KEY_PESEES}_animal_${animalId}`
      : `${CACHE_KEY_PESEES}_projet_${projetId}`;

    const cachedData: CachedPesees = {
      pesees,
      animalId,
      projetId,
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));
    logger.debug(
      `[setCachedPesees] Cache mis à jour pour ${animalId ? `animal ${animalId}` : `projet ${projetId}`}`
    );
  } catch (error) {
    logger.error('[setCachedPesees] Erreur lors du stockage du cache:', error);
  }
}

/**
 * Invalide le cache pour un animal spécifique
 */
export async function invalidateAnimalCache(animalId: string): Promise<void> {
  try {
    const cacheKey = `${CACHE_KEY_PESEES}_animal_${animalId}`;
    await AsyncStorage.removeItem(cacheKey);
    logger.debug(`[invalidateAnimalCache] Cache invalidé pour animal ${animalId}`);
  } catch (error) {
    logger.error('[invalidateAnimalCache] Erreur lors de l\'invalidation:', error);
  }
}

/**
 * Invalide le cache pour un projet (animaux et pesées)
 */
export async function invalidateProjetCache(projetId: string): Promise<void> {
  try {
    const animauxKey = `${CACHE_KEY_ANIMAUX}_${projetId}`;
    const peseesKey = `${CACHE_KEY_PESEES}_projet_${projetId}`;
    await AsyncStorage.multiRemove([animauxKey, peseesKey]);
    logger.debug(`[invalidateProjetCache] Cache invalidé pour projet ${projetId}`);
  } catch (error) {
    logger.error('[invalidateProjetCache] Erreur lors de l\'invalidation:', error);
  }
}

/**
 * Nettoie les anciens caches pour éviter de remplir AsyncStorage
 */
async function cleanupOldCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(
      (key) =>
        key.startsWith(CACHE_KEY_ANIMAUX) || key.startsWith(CACHE_KEY_PESEES)
    );

    if (cacheKeys.length <= 20) {
      return; // Pas besoin de nettoyer si moins de 20 caches
    }

    // Récupérer tous les caches avec leur timestamp
    const cachesWithTime: Array<{ key: string; timestamp: number }> = [];

    for (const key of cacheKeys) {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cachedData: CachedAnimals | CachedPesees = JSON.parse(cached);
          cachesWithTime.push({ key, timestamp: cachedData.timestamp });
        }
      } catch (error) {
        // Ignorer les erreurs de parsing
      }
    }

    // Trier par timestamp (plus ancien en premier)
    cachesWithTime.sort((a, b) => a.timestamp - b.timestamp);

    // Supprimer les caches les plus anciens (garder seulement les 20 derniers)
    const toRemove = cachesWithTime.slice(0, cachesWithTime.length - 20);
    for (const { key } of toRemove) {
      await AsyncStorage.removeItem(key);
    }

    logger.debug(`[cleanupOldCaches] ${toRemove.length} anciens caches supprimés`);
  } catch (error) {
    logger.error('[cleanupOldCaches] Erreur lors du nettoyage du cache:', error);
  }
}

/**
 * Vide tout le cache de production
 */
export async function clearProductionCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(
      (key) =>
        key.startsWith(CACHE_KEY_ANIMAUX) || key.startsWith(CACHE_KEY_PESEES)
    );

    await AsyncStorage.multiRemove(cacheKeys);
    logger.debug(`[clearProductionCache] ${cacheKeys.length} caches supprimés`);
  } catch (error) {
    logger.error('[clearProductionCache] Erreur lors du vidage du cache:', error);
  }
}
