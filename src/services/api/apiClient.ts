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

const logger = createLoggerWithPrefix('apiClient');

// Configuration depuis le fichier de config
const API_BASE_URL = API_CONFIG.baseURL;
const API_TIMEOUT = API_CONFIG.timeout;

// Clés de stockage
const ACCESS_TOKEN_KEY = '@fermier_pro:access_token';
const REFRESH_TOKEN_KEY = '@fermier_pro:refresh_token';

// Verrouillage pour éviter plusieurs refresh simultanés
let refreshPromise: Promise<string | null> | null = null;
let lastRefreshAttempt = 0;
const REFRESH_COOLDOWN = 5000; // 5 secondes entre les tentatives de refresh

/**
 * Interface pour les options de requête
 */
interface RequestOptions extends RequestInit {
  timeout?: number;
  skipAuth?: boolean; // Pour les routes publiques
  retry?: RetryOptions | boolean; // Options de retry (true = par défaut, false = désactivé)
  offlineFallback?: boolean; // Activer le fallback SQLite en mode hors ligne
  params?: Record<string, unknown>; // Paramètres de requête (query string)
}

/**
 * Classe d'erreur personnalisée pour les erreurs API
 */
export class APIError extends Error {
  // Propriétés publiques utilisées par les consommateurs de l'erreur
  public readonly status: number;
  public readonly data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Récupère le token d'accès depuis AsyncStorage
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (isLoggingEnabled() && token) {
      logger.debug('Token récupéré');
    }
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
  // Si un refresh est déjà en cours, attendre son résultat
  if (refreshPromise) {
    logger.debug('Refresh déjà en cours, attente du résultat...');
    return refreshPromise;
  }

  // Vérifier le cooldown pour éviter trop de tentatives
  const now = Date.now();
  if (now - lastRefreshAttempt < REFRESH_COOLDOWN) {
    const waitTime = REFRESH_COOLDOWN - (now - lastRefreshAttempt);
    logger.debug(`Cooldown actif, attente de ${waitTime}ms avant nouvelle tentative`);
    return null;
  }

  lastRefreshAttempt = now;

  // Créer la promesse de refresh
  refreshPromise = (async (): Promise<string | null> => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:118',message:'refreshAccessToken: début',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:121',message:'refreshAccessToken: pas de refresh token',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        logger.warn('No refresh token available');
        throw new Error('No refresh token available');
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:126',message:'refreshAccessToken: appel API',data:{apiBaseUrl:API_BASE_URL,hasRefreshToken:!!refreshToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      logger.debug('Tentative de rafraîchissement du token...');
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:135',message:'refreshAccessToken: réponse reçue',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:138',message:'refreshAccessToken: refresh failed',data:{status:response.status,errorText:errorText.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        logger.error(`Refresh failed: ${response.status} - ${errorText}`);
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const data = await response.json();
      await setTokens(data.access_token, data.refresh_token);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:142',message:'refreshAccessToken: succès',data:{hasAccessToken:!!data.access_token,hasRefreshToken:!!data.refresh_token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      logger.debug('Token rafraîchi avec succès');

      return data.access_token;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:146',message:'refreshAccessToken: erreur catch',data:{errorMessage:error?.message,errorName:error?.constructor?.name,isTypeError:error instanceof TypeError,isNetworkError:error instanceof TypeError && error.message.includes('fetch')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Distinguer les erreurs réseau des autres erreurs
      if (error instanceof TypeError && error.message.includes('fetch')) {
        logger.error('Erreur réseau lors du rafraîchissement - Backend inaccessible:', error);
        // Ne pas nettoyer les tokens en cas d'erreur réseau, juste retourner null
        // pour permettre une nouvelle tentative plus tard
        return null;
      }

      logger.error('Erreur lors du rafraîchissement du token:', error);
      // Nettoyer les tokens seulement si c'est une erreur d'authentification (401, 403)
      // Ne pas nettoyer pour les erreurs réseau ou autres erreurs temporaires
      if (error instanceof Error && error.message.includes('Refresh failed: 401')) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:157',message:'refreshAccessToken: nettoyage tokens (401)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        await clearTokens();
      }
      return null;
    } finally {
      // Libérer le verrou immédiatement après le refresh (pas de délai)
      // Le délai était trop long et bloquait les requêtes suivantes
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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

  // Appliquer le retry si activé
  if (retry) {
    const retryOptions = typeof retry === 'object' ? retry : undefined;
    return withRetry(executeRequest, retryOptions);
  }

  return executeRequest();
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:285',message:'executeHttpRequest: 401 détecté, refresh token',data:{endpoint,hasRefreshPromise:!!refreshPromise},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const newToken = await refreshAccessToken();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:287',message:'executeHttpRequest: refresh token résultat',data:{endpoint,hasNewToken:!!newToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (newToken) {
        // Réessayer la requête avec le nouveau token
        headers['Authorization'] = `Bearer ${newToken}`;
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
      } else {
        // Refresh échoué - vérifier si c'est à cause d'une erreur réseau
        // Si oui, laisser l'erreur réseau originale passer plutôt que "Session expirée"
        const networkState = await checkNetworkConnectivity();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apiClient.ts:306',message:'executeHttpRequest: refresh échoué',data:{endpoint,isConnected:networkState.isConnected},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        if (!networkState.isConnected) {
          // Pas de connexion réseau - propager l'erreur réseau originale
          throw new APIError('Pas de connexion réseau. Vérifiez votre connexion Internet.', 0);
        }
        // Refresh échoué pour une autre raison (token invalide, etc.), déconnecter l'utilisateur
        throw new APIError('Session expirée. Veuillez vous reconnecter.', 401);
      }
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
      
      logger.error(`Erreur API [${response.status}]: ${errorMessage}`, {
        endpoint,
        status: response.status,
        errorData,
      });
      
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
      logger.warn('Erreur de parsing JSON, réponse:', text.substring(0, 100));
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
