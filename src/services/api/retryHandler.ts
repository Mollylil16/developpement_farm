/**
 * Gestionnaire de retry pour les requêtes API
 * Implémente une stratégie de retry exponentielle
 */

import { APIError } from './apiError';
import { checkNetworkConnectivity } from '../network/networkService';

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryableStatuses?: number[];
  retryableErrors?: string[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000, // 1 seconde
  retryableStatuses: [408, 429, 500, 502, 503, 504], // Timeout, Rate Limit, Server Errors
  retryableErrors: [
    'Network error',
    'Request timeout',
    'Failed to fetch',
    'Network request failed',
    'TypeError: Failed to fetch',
    'NetworkError',
    'TIMEOUT',
    'timeout',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
  ],
};

/**
 * Calcule le délai avant le prochain retry (backoff exponentiel)
 * Pour les erreurs 429 (rate limit), utilise un délai plus long
 */
function calculateRetryDelay(attempt: number, baseDelay: number, statusCode?: number): number {
  const baseBackoff = baseDelay * Math.pow(2, attempt - 1);
  
  // Pour les erreurs 429 (rate limiting), attendre plus longtemps (5-10 secondes)
  if (statusCode === 429) {
    return Math.max(5000, baseBackoff * 5);
  }
  
  return baseBackoff;
}

/**
 * Vérifie si une erreur est retryable
 */
function isRetryableError(error: unknown, options: Required<RetryOptions>): boolean {
  // Erreur API (notre type d'erreur personnalisé)
  if (error instanceof APIError) {
    // Erreurs réseau (status 0) - toujours retryables
    if (error.status === 0) {
      return true;
    }

    // Erreurs HTTP retryables
    return options.retryableStatuses.includes(error.status);
  }

  // Erreurs génériques (Error, TypeError, etc.)
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    
    // Vérifier le message d'erreur
    const matchesMessage = options.retryableErrors.some((msg) =>
      errorMessage.includes(msg.toLowerCase())
    );
    
    // Vérifier le nom de l'erreur (pour les erreurs spécifiques React Native/Expo)
    const matchesName = [
      'networkerror',
      'timeout',
      'connection',
      'fetch',
      'network',
    ].some((name) => errorName.includes(name));
    
    // Erreurs TypeError avec "fetch" sont généralement des erreurs réseau
    if (errorName === 'typeerror' && errorMessage.includes('fetch')) {
      return true;
    }
    
    return matchesMessage || matchesName;
  }

  // Erreurs sous forme de chaîne (peu courant mais possible)
  if (typeof error === 'string') {
    const errorString = error.toLowerCase();
    return options.retryableErrors.some((msg) =>
      errorString.includes(msg.toLowerCase())
    );
  }

  return false;
}

/**
 * Attend avant de réessayer
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exécute une fonction avec retry automatique
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;
  let lastStatusCode: number | undefined;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      // Vérifier la connectivité avant chaque tentative
      if (attempt > 1) {
        const networkState = await checkNetworkConnectivity();
        if (!networkState.isConnected) {
          throw new APIError('Pas de connexion Internet. Vérifiez votre connexion réseau.', 0);
        }
      }

      return await fn();
    } catch (error) {
      lastError = error;

      // Extraire le code de statut si c'est une APIError
      if (error instanceof APIError) {
        lastStatusCode = error.status;
      }

      // Ne pas retry si ce n'est pas une erreur retryable
      if (!isRetryableError(error, config)) {
        throw error;
      }

      // Ne pas retry si on a atteint le nombre max de tentatives
      if (attempt >= config.maxRetries) {
        break;
      }

      // Calculer le délai avant le prochain retry (avec prise en compte du status code)
      const delay = calculateRetryDelay(attempt, config.retryDelay, lastStatusCode);

      if (__DEV__) {
        console.log(
          `[RetryHandler] Tentative ${attempt}/${config.maxRetries} échouée${lastStatusCode ? ` (${lastStatusCode})` : ''}. Nouvelle tentative dans ${delay}ms...`
        );
      }

      // Attendre avant de réessayer
      await wait(delay);
    }
  }

  // Toutes les tentatives ont échoué
  throw lastError;
}
