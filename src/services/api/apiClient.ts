/**
 * Service API Client pour communiquer avec le backend
 * Utilise fetch (natif) pour rester cohérent avec le reste du projet
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/api.config';
import { isLoggingEnabled } from '../../config/env';
import { withRetry, RetryOptions } from './retryHandler';
import { checkNetworkConnectivity } from '../network/networkService';

// Configuration depuis le fichier de config
const API_BASE_URL = API_CONFIG.baseURL;
const API_TIMEOUT = API_CONFIG.timeout;

// Clés de stockage
const ACCESS_TOKEN_KEY = '@fermier_pro:access_token';
const REFRESH_TOKEN_KEY = '@fermier_pro:refresh_token';

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
      // eslint-disable-next-line no-console
      console.log('[apiClient] Token récupéré');
    }
    return token;
  } catch (error) {
    console.error('[apiClient] Erreur lors de la récupération du token:', error);
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
    console.error('[apiClient] Erreur lors du stockage des tokens:', error);
  }
}

/**
 * Supprime les tokens d'AsyncStorage
 */
async function clearTokens(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  } catch (error) {
    console.error('[apiClient] Erreur lors de la suppression des tokens:', error);
  }
}

/**
 * Rafraîchit le token d'accès en utilisant le refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Refresh failed: ${response.status}`);
    }

    const data = await response.json();
    await setTokens(data.access_token, data.refresh_token);

    return data.access_token;
  } catch (error) {
    console.error('[apiClient] Erreur lors du rafraîchissement du token:', error);
    await clearTokens();
    return null;
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
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Réessayer la requête avec le nouveau token
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        if (!retryResponse.ok) {
          throw new APIError(
            `Request failed: ${retryResponse.statusText}`,
            retryResponse.status,
            await retryResponse.json().catch(() => null)
          );
        }

        return await retryResponse.json();
      } else {
        // Refresh échoué, déconnecter l'utilisateur
        throw new APIError('Session expirée. Veuillez vous reconnecter.', 401);
      }
    }

    // Gérer les erreurs HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.message || `Request failed: ${response.statusText}`,
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
      console.warn('[apiClient] Erreur de parsing JSON, réponse:', text.substring(0, 100));
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
      console.error('[apiClient] Erreur réseau - Backend inaccessible:', {
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
    // eslint-disable-next-line no-console
    console.log(`[apiClient] Mode hors ligne: ${method} ${endpoint}`);
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
      console.warn('[apiClient] Erreur lors du fallback hors ligne:', error);
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
