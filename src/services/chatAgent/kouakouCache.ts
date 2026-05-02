/**
 * Service de cache pour les réponses de Kouakou
 * Stocke les réponses récentes pour éviter les appels API répétés
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLoggerWithPrefix } from '../../utils/logger';

const logger = createLoggerWithPrefix('KouakouCache');

const CACHE_KEY_PREFIX = '@kouakou_responses_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50; // Maximum 50 réponses en cache

interface CachedResponse {
  message: string;
  response: string;
  timestamp: number;
  projetId: string;
  executedActions?: Array<{
    name: string;
    args: Record<string, unknown>;
    success: boolean;
    message: string;
    data?: unknown;
  }>;
}

/**
 * Génère une clé de cache basée sur le message et le projet
 * Normalise le message pour éviter les variations mineures
 */
function generateCacheKey(message: string, projetId: string): string {
  // Normaliser le message (minuscules, suppression des espaces multiples, ponctuation)
  const normalized = message
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
  
  // Utiliser un hash simple (code de 16 caractères) au lieu du message complet
  // pour éviter des clés trop longues
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir en entier 32 bits
  }
  
  const hashString = Math.abs(hash).toString(36).substring(0, 16);
  return `${CACHE_KEY_PREFIX}_${projetId}_${hashString}`;
}

/**
 * Récupère une réponse du cache si elle existe et est encore valide
 */
export async function getCachedResponse(
  message: string,
  projetId: string
): Promise<string | null> {
  try {
    const cacheKey = generateCacheKey(message, projetId);
    const cached = await AsyncStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const cachedData: CachedResponse = JSON.parse(cached);
    const now = Date.now();

    // Vérifier si le cache est encore valide
    if (now - cachedData.timestamp > CACHE_EXPIRY_MS) {
      // Cache expiré, le supprimer
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    // Vérifier que le projet correspond
    if (cachedData.projetId !== projetId) {
      return null;
    }

    logger.debug(`[getCachedResponse] Réponse trouvée dans le cache pour: "${message.substring(0, 50)}..."`);
    return cachedData.response;
  } catch (error) {
    logger.error('[getCachedResponse] Erreur lors de la récupération du cache:', error);
    return null;
  }
}

/**
 * Stocke une réponse dans le cache
 */
export async function setCachedResponse(
  message: string,
  response: string,
  projetId: string,
  executedActions?: Array<{
    name: string;
    args: Record<string, unknown>;
    success: boolean;
    message: string;
    data?: unknown;
  }>
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(message, projetId);
    const cachedData: CachedResponse = {
      message,
      response,
      projetId,
      timestamp: Date.now(),
      executedActions,
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));
    logger.debug(`[setCachedResponse] Réponse mise en cache pour: "${message.substring(0, 50)}..."`);

    // Nettoyer les anciens caches si nécessaire
    await cleanupOldCaches(projetId);
  } catch (error) {
    logger.error('[setCachedResponse] Erreur lors du stockage du cache:', error);
  }
}

/**
 * Invalide le cache pour un projet spécifique (appelé après des actions)
 */
export async function invalidateProjetCache(projetId: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) =>
      key.startsWith(`${CACHE_KEY_PREFIX}_${projetId}_`)
    );

    await AsyncStorage.multiRemove(cacheKeys);
    logger.debug(`[invalidateProjetCache] ${cacheKeys.length} réponses supprimées du cache pour projet ${projetId}`);
  } catch (error) {
    logger.error('[invalidateProjetCache] Erreur lors de l\'invalidation du cache:', error);
  }
}

/**
 * Nettoie les anciens caches pour éviter de remplir AsyncStorage
 */
async function cleanupOldCaches(projetId: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const projetCacheKeys = keys.filter((key) =>
      key.startsWith(`${CACHE_KEY_PREFIX}_${projetId}_`)
    );

    if (projetCacheKeys.length <= MAX_CACHE_SIZE) {
      return; // Pas besoin de nettoyer
    }

    // Récupérer tous les caches avec leur timestamp
    const cachesWithTime: Array<{ key: string; timestamp: number }> = [];

    for (const key of projetCacheKeys) {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cachedData: CachedResponse = JSON.parse(cached);
          cachesWithTime.push({ key, timestamp: cachedData.timestamp });
        }
      } catch (error) {
        // Ignorer les erreurs de parsing
      }
    }

    // Trier par timestamp (plus ancien en premier)
    cachesWithTime.sort((a, b) => a.timestamp - b.timestamp);

    // Supprimer les caches les plus anciens (garder seulement les MAX_CACHE_SIZE derniers)
    const toRemove = cachesWithTime.slice(0, cachesWithTime.length - MAX_CACHE_SIZE);
    for (const { key } of toRemove) {
      await AsyncStorage.removeItem(key);
    }

    logger.debug(`[cleanupOldCaches] ${toRemove.length} anciennes réponses supprimées du cache`);
  } catch (error) {
    logger.error('[cleanupOldCaches] Erreur lors du nettoyage du cache:', error);
  }
}

/**
 * Vide tout le cache Kouakou
 */
export async function clearKouakouCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));

    await AsyncStorage.multiRemove(cacheKeys);
    logger.debug(`[clearKouakouCache] ${cacheKeys.length} réponses supprimées du cache`);
  } catch (error) {
    logger.error('[clearKouakouCache] Erreur lors du vidage du cache:', error);
  }
}
