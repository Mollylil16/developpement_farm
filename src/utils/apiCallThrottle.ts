/**
 * Utilitaire de gestion des appels API pour éviter les appels excessifs
 * - Throttle: limite les appels à un intervalle minimum
 * - Cache: garde en mémoire le timestamp du dernier appel
 */

// Map pour stocker les derniers appels par clé
const lastCallTimestamps = new Map<string, number>();

// Durée minimum entre appels par défaut (60 secondes)
const DEFAULT_MIN_INTERVAL_MS = 60_000;

// Durées par type de données
export const API_INTERVALS = {
  LISTINGS: 60_000,        // 1 minute pour les listings marketplace
  OFFERS: 30_000,          // 30 secondes pour les offres (plus sensible)
  NOTIFICATIONS: 60_000,   // 1 minute pour les notifications
  FINANCIAL_DATA: 120_000, // 2 minutes pour les données financières
  ANIMALS: 60_000,         // 1 minute pour les animaux
  BATCHES: 60_000,         // 1 minute pour les bandes
  CHAT_MESSAGES: 30_000,   // 30 secondes pour le chat
  DEFAULT: 60_000,         // Défaut: 1 minute
} as const;

/**
 * Vérifie si un appel API peut être effectué (pas fait récemment)
 * @param key Identifiant unique de l'appel (ex: 'marketplace-listings-{userId}')
 * @param minIntervalMs Intervalle minimum entre appels
 * @returns true si l'appel peut être effectué
 */
export function shouldMakeApiCall(
  key: string,
  minIntervalMs: number = DEFAULT_MIN_INTERVAL_MS
): boolean {
  const now = Date.now();
  const lastCall = lastCallTimestamps.get(key);
  
  if (!lastCall) {
    return true; // Premier appel
  }
  
  return now - lastCall >= minIntervalMs;
}

/**
 * Enregistre qu'un appel API a été fait
 * @param key Identifiant unique de l'appel
 */
export function recordApiCall(key: string): void {
  lastCallTimestamps.set(key, Date.now());
}

/**
 * Invalide le cache pour une clé (force le prochain appel)
 * @param key Identifiant unique de l'appel ou pattern (ex: 'marketplace-*')
 */
export function invalidateApiCache(key: string): void {
  if (key.includes('*')) {
    // Pattern matching simple
    const prefix = key.replace('*', '');
    for (const existingKey of lastCallTimestamps.keys()) {
      if (existingKey.startsWith(prefix)) {
        lastCallTimestamps.delete(existingKey);
      }
    }
  } else {
    lastCallTimestamps.delete(key);
  }
}

/**
 * Récupère le temps restant avant le prochain appel autorisé
 * @param key Identifiant unique de l'appel
 * @param minIntervalMs Intervalle minimum entre appels
 * @returns Temps restant en ms (0 si appel autorisé)
 */
export function getTimeUntilNextCall(
  key: string,
  minIntervalMs: number = DEFAULT_MIN_INTERVAL_MS
): number {
  const now = Date.now();
  const lastCall = lastCallTimestamps.get(key);
  
  if (!lastCall) {
    return 0;
  }
  
  const elapsed = now - lastCall;
  return Math.max(0, minIntervalMs - elapsed);
}

/**
 * Hook helper: vérifie et enregistre un appel API
 * @param key Identifiant unique de l'appel
 * @param minIntervalMs Intervalle minimum entre appels
 * @returns true si l'appel a été autorisé et enregistré
 */
export function throttleApiCall(
  key: string,
  minIntervalMs: number = DEFAULT_MIN_INTERVAL_MS
): boolean {
  if (shouldMakeApiCall(key, minIntervalMs)) {
    recordApiCall(key);
    return true;
  }
  return false;
}

/**
 * Nettoie les entrées anciennes (appelé périodiquement)
 * @param maxAge Age maximum des entrées en ms (défaut: 10 minutes)
 */
export function cleanupOldEntries(maxAge: number = 10 * 60 * 1000): void {
  const now = Date.now();
  for (const [key, timestamp] of lastCallTimestamps.entries()) {
    if (now - timestamp > maxAge) {
      lastCallTimestamps.delete(key);
    }
  }
}

// Nettoyer les entrées anciennes toutes les 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => cleanupOldEntries(), 5 * 60 * 1000);
}
