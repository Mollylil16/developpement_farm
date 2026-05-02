/**
 * Utilitaire de rate limiting côté client
 * Limite le nombre de tentatives d'une action dans une fenêtre de temps donnée
 * SÉCURITÉ : Empêche les attaques par force brute et les abus
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Stockage en mémoire des compteurs de rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Vérifie si une action est autorisée selon les limites de rate limiting
 * @param key - Clé unique pour identifier l'action (ex: 'auth:signIn:email:user@example.com')
 * @param maxAttempts - Nombre maximum de tentatives autorisées
 * @param windowMs - Fenêtre de temps en millisecondes
 * @returns true si l'action est autorisée, false sinon
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000 // 1 minute par défaut
): { allowed: boolean; remainingAttempts: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Si pas d'entrée ou fenêtre expirée, créer une nouvelle entrée
  if (!entry || now >= entry.resetAt) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, newEntry);
    return {
      allowed: true,
      remainingAttempts: maxAttempts - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Si la limite est atteinte, refuser
  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remainingAttempts: 0,
      resetAt: entry.resetAt,
    };
  }

  // Incrémenter le compteur
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remainingAttempts: maxAttempts - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Réinitialise le compteur pour une clé spécifique
 * Utile après une authentification réussie
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Réinitialise tous les compteurs de rate limiting
 * Utile pour les tests ou le nettoyage
 */
export function resetAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Obtient les informations de rate limiting pour une clé
 */
export function getRateLimitInfo(key: string): {
  count: number;
  remainingAttempts: number;
  resetAt: number;
} | null {
  const entry = rateLimitStore.get(key);
  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now >= entry.resetAt) {
    // Fenêtre expirée, supprimer l'entrée
    rateLimitStore.delete(key);
    return null;
  }

  // Calculer les tentatives restantes (supposons maxAttempts = 5 par défaut)
  const maxAttempts = 5;
  return {
    count: entry.count,
    remainingAttempts: Math.max(0, maxAttempts - entry.count),
    resetAt: entry.resetAt,
  };
}
