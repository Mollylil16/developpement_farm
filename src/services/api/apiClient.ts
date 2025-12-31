/**
 * Service API Client pour communiquer avec le backend
 * Utilise fetch (natif) pour rester cohérent avec le reste du projet
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/api.config';
import { isLoggingEnabled } from '../../config/env';
import { withRetry, RetryOptions } from './retryHandler';
import { checkNetworkConnectivity } from '../network/networkService';
import { createLoggerWithPrefix } from '../../utils/logger';
import { requestQueue } from './requestQueue';
import { APIError } from './apiError';

const logger = createLoggerWithPrefix('apiClient');

// Configuration depuis le fichier de config
const API_BASE_URL = API_CONFIG.baseURL;
const API_TIMEOUT = API_CONFIG.timeout;

// Clés de stockage
const ACCESS_TOKEN_KEY = '@fermier_pro:access_token';
const REFRESH_TOKEN_KEY = '@fermier_pro:refresh_token';

// Système simplifié de gestion des refresh simultanés
const activeRefreshPromises = new Map<string, Promise<string | null>>();
let lastRefreshAttempt = 0;
const REFRESH_COOLDOWN = 2000; // 2 secondes entre les tentatives de refresh (réduit)
const MAX_REFRESH_ATTEMPTS = 3;
const DEFAULT_RATE_LIMIT_BACKOFF = 4000; // 4 secondes si le backend renvoie 429 sans header

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function isRefreshInProgress(): boolean {
  return activeRefreshPromises.size > 0;
}

export async function waitForActiveRefresh(maxWaitMs = 5000): Promise<void> {
  if (activeRefreshPromises.size === 0) return;

  // Attendre que toutes les promesses en cours se terminent ou timeout
  const promises = Array.from(activeRefreshPromises.values()).map((p) =>
    p.catch(() => null)
  );

  await Promise.race([Promise.all(promises), delay(maxWaitMs)]);
}

// Type pour les résultats de refresh
interface RefreshResult {
  token: string | null;
  reason:
    | 'success'
    | 'no_refresh_token'
    | 'refresh_token_invalid'
    | 'network_error'
    | 'cooldown'
    | 'rate_limited'
    | 'unknown_error';
  error?: string;
  retryAfterMs?: number;
}

/**
 * Interface pour les options de requête
 */
interface RequestOptions extends RequestInit {
  timeout?: number;
  skipAuth?: boolean; // Pour les routes publiques
  retry?: RetryOptions | boolean; // Options de retry (true = par défaut, false = désactivé)
  offlineFallback?: boolean; // Activer le fallback SQLite en mode hors ligne
  params?: Record<string, unknown>; // Paramètres de requête (query string)
  skipQueue?: boolean; // Pour les requêtes prioritaires (auth, refresh token)
}

// APIError est maintenant exporté depuis apiError.ts pour éviter les cycles de dépendances
export { APIError } from './apiError';

class RefreshHttpError extends Error {
  status?: number;
  retryAfterMs?: number;

  constructor(message: string, options: { status?: number; retryAfterMs?: number } = {}) {
    super(message);
    this.status = options.status;
    this.retryAfterMs = options.retryAfterMs;
  }
}

function parseRetryAfter(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const numeric = Number(headerValue);
  if (!Number.isNaN(numeric)) {
    return Math.max(numeric, 0) * 1000;
  }
  const parsedDate = Date.parse(headerValue);
  if (!Number.isNaN(parsedDate)) {
    return Math.max(parsedDate - Date.now(), 0);
  }
  return undefined;
}

/**
 * Récupère le token d'accès depuis AsyncStorage
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    // Ne logger le token que si le logging très détaillé est activé (évite les logs excessifs)
    // Le token est récupéré à chaque requête API, donc pas besoin de logger systématiquement
    return token;
  } catch (error) {
    logger.error('Erreur lors de la récupération du token:', error);
    return null;
  }
}

/**
 * Stocke les tokens dans AsyncStorage
 */
async function setTokens(accessToken: string, refreshToken?: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch (error) {
    logger.error('Erreur lors du stockage des tokens:', error);
  }
}

/**
 * Supprime les tokens d'AsyncStorage
 */
async function clearTokens(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  } catch (error) {
    logger.error('Erreur lors de la suppression des tokens:', error);
  }
}

/**
 * Rafraîchit le token d'accès en utilisant le refresh token
 * Utilise un verrouillage pour éviter plusieurs refresh simultanés
 */
async function refreshAccessToken(): Promise<string | null> {
  const result = await refreshAccessTokenWithReason();
  return result.token;
}

/**
 * Rafraîchit le token d'accès et retourne la raison en cas d'échec
 * @param forceRefresh Si true, ignore le cooldown (utile après un 401)
 */
async function refreshAccessTokenWithReason(forceRefresh = false): Promise<RefreshResult> {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    logger.warn('No refresh token available');
    return { token: null, reason: 'no_refresh_token' };
  }

  // Vérifier si un refresh pour ce token est déjà en cours
  const existingPromise = activeRefreshPromises.get(refreshToken);
  if (existingPromise && !forceRefresh) {
    logger.debug('Refresh déjà en cours pour ce token, attente du résultat...');
    try {
      const token = await existingPromise;
      return { token, reason: token ? 'success' : 'unknown_error' };
    } catch (error) {
      return { token: null, reason: 'unknown_error', error: String(error) };
    }
  }

  // Vérifier le cooldown pour éviter trop de tentatives (sauf si forceRefresh)
  const now = Date.now();
  if (!forceRefresh && now - lastRefreshAttempt < REFRESH_COOLDOWN) {
    const waitTime = REFRESH_COOLDOWN - (now - lastRefreshAttempt);
    logger.debug(`Cooldown actif, attente de ${waitTime}ms avant nouvelle tentative`);
    return { token: null, reason: 'cooldown', retryAfterMs: waitTime };
  }

  lastRefreshAttempt = now;

  const refreshPromise = (async (): Promise<string | null> => {
    try {
      let attempt = 0;
      while (attempt < MAX_REFRESH_ATTEMPTS) {
        attempt++;
        try {
          logger.debug(
            `Tentative de rafraîchissement du token (${attempt}/${MAX_REFRESH_ATTEMPTS})...`
          );
          const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After'));
            const errorCode =
              response.status === 401 ? 'REFRESH_TOKEN_INVALID' : `REFRESH_FAILED_${response.status}`;
            throw new RefreshHttpError(
              `${errorCode}: ${errorText || response.statusText || 'Unknown error'}`,
              {
                status: response.status,
                retryAfterMs: retryAfterMs,
              }
            );
          }

          const data = await response.json();
          await setTokens(data.access_token, data.refresh_token);
          logger.debug('Token rafraîchi avec succès');
          return data.access_token;
        } catch (error) {
          if (error instanceof RefreshHttpError) {
            if (error.status === 429 && attempt < MAX_REFRESH_ATTEMPTS) {
              const waitMs = Math.max(
                error.retryAfterMs ?? DEFAULT_RATE_LIMIT_BACKOFF,
                500
              );
              logger.warn(
                `Refresh rate limité (429). Nouvelle tentative dans ${waitMs}ms`
              );
              await delay(waitMs);
              continue;
            }

            if (error.message.includes('REFRESH_TOKEN_INVALID')) {
              await clearTokens();
            }

            throw error;
          }

          if (error instanceof TypeError && error.message.includes('fetch')) {
            if (attempt < MAX_REFRESH_ATTEMPTS) {
              const waitMs = 1000 * attempt;
              logger.warn(
                `Erreur réseau lors du rafraîchissement (tentative ${attempt}). Nouvel essai dans ${waitMs}ms`
              );
              await delay(waitMs);
              continue;
            }
            throw new Error('NETWORK_ERROR');
          }

          logger.error('Erreur lors du rafraîchissement du token:', error);
          throw error;
        }
      }

      throw new RefreshHttpError('REFRESH_FAILED_MAX_ATTEMPTS');
    } finally {
      activeRefreshPromises.delete(refreshToken);
    }
  })();

  activeRefreshPromises.set(refreshToken, refreshPromise);

  try {
    const token = await refreshPromise;
    return { token, reason: 'success' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const [errorType] = errorMessage.split(':');

    let reason: RefreshResult['reason'] = 'unknown_error';
    let retryAfterMs: number | undefined;

    if (error instanceof RefreshHttpError) {
      if (error.message.includes('REFRESH_TOKEN_INVALID')) {
        reason = 'refresh_token_invalid';
      } else if (error.status === 429) {
        reason = 'rate_limited';
        retryAfterMs = error.retryAfterMs ?? DEFAULT_RATE_LIMIT_BACKOFF;
      } else if (error.message === 'REFRESH_FAILED_MAX_ATTEMPTS') {
        reason = 'rate_limited';
      }
    } else if (errorType === 'NO_REFRESH_TOKEN') {
      reason = 'no_refresh_token';
    } else if (errorType === 'NETWORK_ERROR') {
      reason = 'network_error';
    }

    return {
      token: null,
      reason,
      error: errorMessage,
      retryAfterMs,
    };
  }
}

/**
 * Effectue une requête HTTP avec gestion automatique des tokens, retry et mode hors ligne
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    timeout = API_TIMEOUT,
    skipAuth = false,
    retry = true,
    offlineFallback = false,
    skipQueue = false,
    ...fetchOptions
  } = options;

  // Vérifier la connectivité réseau
  const networkState = await checkNetworkConnectivity();
  if (!networkState.isConnected && offlineFallback) {
    // Mode hors ligne : utiliser le fallback SQLite
    return handleOfflineRequest<T>(endpoint, fetchOptions);
  }

  // Fonction de requête avec retry
  const executeRequest = async (): Promise<T> => {
    return executeHttpRequest<T>(endpoint, {
      timeout,
      skipAuth,
      ...fetchOptions,
    });
  };

  // Fonction avec retry si activé
  const executeWithRetry = async (): Promise<T> => {
    if (retry) {
      const retryOptions = typeof retry === 'object' ? retry : undefined;
      return withRetry(executeRequest, retryOptions);
    }
    return executeRequest();
  };

  // Les requêtes auth sont prioritaires et contournent la queue
  const isAuthRequest = endpoint.includes('/auth/') || skipQueue;
  
  if (isAuthRequest) {
    return executeWithRetry();
  }

  // Les autres requêtes passent par la queue pour éviter le thundering herd
  return requestQueue.enqueue(executeWithRetry);
}

/**
 * Construit une query string à partir d'un objet de paramètres
 */
function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Pour les tableaux, ajouter chaque élément
        value.forEach((item) => {
          searchParams.append(key, String(item));
        });
      } else {
        searchParams.append(key, String(value));
      }
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Exécute une requête HTTP (sans retry)
 */
async function executeHttpRequest<T>(
  endpoint: string,
  options: Omit<RequestOptions, 'retry' | 'offlineFallback'>
): Promise<T> {
  const { timeout = API_TIMEOUT, skipAuth = false, params, ...fetchOptions } = options;

  // Construire l'URL de base
  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  // Ajouter les paramètres de requête si présents
  if (params && Object.keys(params).length > 0) {
    const queryString = buildQueryString(params);
    // Vérifier si l'endpoint contient déjà des paramètres
    if (url.includes('?')) {
      // Si oui, ajouter avec &
      url += `&${queryString.substring(1)}`; // Enlever le ? initial
    } else {
      // Sinon, ajouter normalement
      url += queryString;
    }
  }

  // Headers par défaut
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Ajouter le token d'authentification si nécessaire
  if (!skipAuth) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Créer un AbortController pour le timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Si 401 (Unauthorized), essayer de rafraîchir le token
    if (response.status === 401 && !skipAuth) {
      let refreshAttempts = 0;
      while (refreshAttempts < MAX_REFRESH_ATTEMPTS) {
        const refreshResult = await refreshAccessTokenWithReason();
        if (refreshResult.token) {
          headers['Authorization'] = `Bearer ${refreshResult.token}`;
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers,
            signal: controller.signal,
          });

          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({}));
            throw new APIError(
              errorData.message || `Request failed: ${retryResponse.statusText}`,
              retryResponse.status,
              errorData
            );
          }

          return await retryResponse.json();
        }

        if (
          refreshResult.reason === 'rate_limited' ||
          refreshResult.reason === 'cooldown'
        ) {
          const waitMs =
            refreshResult.retryAfterMs ??
            (refreshResult.reason === 'rate_limited'
              ? DEFAULT_RATE_LIMIT_BACKOFF
              : REFRESH_COOLDOWN);
          const waitSeconds = Math.ceil(waitMs / 1000);
          logger.warn(
            `[apiClient] Refresh temporairement bloqué (${refreshResult.reason}). Nouvelle tentative dans ${waitSeconds}s`
          );
          await delay(waitMs);
          refreshAttempts += 1;
          continue;
        }

        let errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        switch (refreshResult.reason) {
          case 'network_error': {
            const networkState = await checkNetworkConnectivity();
            if (!networkState.isConnected) {
              throw new APIError('Pas de connexion réseau. Vérifiez votre connexion Internet.', 0);
            }
            errorMessage = 'Erreur de connexion lors du rafraîchissement. Veuillez réessayer.';
            break;
          }
          case 'no_refresh_token':
            errorMessage = 'Aucun token de rafraîchissement disponible. Veuillez vous reconnecter.';
            break;
          case 'refresh_token_invalid':
            errorMessage = 'Session expirée. Veuillez vous reconnecter.';
            break;
          case 'unknown_error':
          default:
            if (refreshResult.error) {
              logger.error('Erreur inconnue lors du refresh:', refreshResult.error);
            }
            errorMessage = 'Erreur lors du rafraîchissement de la session. Veuillez vous reconnecter.';
            break;
        }

        throw new APIError(errorMessage, 401);
      }

      throw new APIError(
        'Trop de tentatives de rafraîchissement. Veuillez vous reconnecter.',
        401
      );
    }

    // Gérer les erreurs HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Gestion spéciale pour 429 (Too Many Requests)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
        const retryAfterMs = retryAfterSeconds * 1000;
        
        logger.warn(
          `Rate limit atteint. Retry-After: ${retryAfterSeconds}s. Attendez avant de réessayer.`
        );
        
        throw new APIError(
          errorData.message || `Trop de requêtes. Veuillez réessayer dans ${retryAfterSeconds} seconde(s).`,
          response.status,
          {
            ...errorData,
            retryAfter: retryAfterSeconds,
            retryAfterMs,
          }
        );
      }
      
      // Extraire le message d'erreur de manière plus robuste
      let errorMessage = errorData.message || errorData.error || errorData.message || '';
      if (!errorMessage && response.statusText) {
        errorMessage = response.statusText;
      }
      if (!errorMessage) {
        errorMessage = `Erreur HTTP ${response.status}`;
      }
      
      // Ne pas loguer les erreurs 404 attendues (rappels qui n'existent pas encore)
      const isExpected404 = response.status === 404 && endpoint.includes('rappels-vaccinations');
      if (!isExpected404) {
        logger.error(`Erreur API [${response.status}]: ${errorMessage}`, {
          endpoint,
          status: response.status,
          errorData,
        });
      }
      
      throw new APIError(
        errorMessage,
        response.status,
        errorData
      );
    }

    // Vérifier si la réponse a du contenu avant de parser le JSON
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    // Si la réponse est vide, retourner null
    if (!text || text.trim() === '') {
      return null as T;
    }

    // Parser le JSON seulement s'il y a du contenu
    try {
      return JSON.parse(text) as T;
    } catch (parseError) {
      // Si le parsing échoue, c'est peut-être une réponse vide ou malformée
      logger.warn('Erreur de parsing JSON', {
        endpoint,
        status: response.status,
        contentType: contentType || null,
        textLen: text.length,
        snippet: text.substring(0, 160),
      });
      throw new APIError('JSON Parse error: Unexpected end of input', response.status);
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof APIError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new APIError('Request timeout', 408);
    }

    // Erreur réseau - améliorer le message d'erreur
    if (error instanceof TypeError && error.message.includes('fetch')) {
      logger.error('Erreur réseau - Backend inaccessible:', {
        url,
        endpoint,
        API_BASE_URL,
        error: error.message,
      });
      throw new APIError('Network request failed - Vérifiez que le backend est accessible', 0);
    }

    // Erreur réseau ou autre
    throw new APIError(error instanceof Error ? error.message : 'Network error', 0);
  }
}

/**
 * Gère les requêtes en mode hors ligne (fallback SQLite)
 */
async function handleOfflineRequest<T>(endpoint: string, fetchOptions: RequestInit): Promise<T> {
  // Pour l'instant, on lance une erreur
  // TODO: Implémenter le fallback SQLite selon le type de requête
  // Exemple: pour GET /auth/me, utiliser AsyncStorage
  // Pour POST /auth/register, mettre en file d'attente pour sync plus tard

  // Utiliser fetchOptions pour déterminer la méthode HTTP et logger si nécessaire
  const method = fetchOptions.method || 'GET';
  if (isLoggingEnabled()) {
    logger.debug(`Mode hors ligne: ${method} ${endpoint}`);
  }

  if (endpoint === '/auth/me' && method === 'GET') {
    // Fallback: récupérer l'utilisateur depuis AsyncStorage
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const userData = await AsyncStorage.default.getItem('@fermier_pro:auth');
      if (userData) {
        return JSON.parse(userData) as T;
      }
    } catch (error) {
      logger.warn('Erreur lors du fallback hors ligne:', error);
    }
  }

  throw new APIError('Mode hors ligne. Cette action nécessite une connexion Internet.', 0);
}
const apiClient = {
  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },

  /**
   * Fonctions utilitaires pour gérer les tokens
   */
  tokens: {
    set: setTokens,
    clear: clearTokens,
    getAccess: getAccessToken,
  },
};

export default apiClient;
