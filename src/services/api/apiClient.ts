/**
 * Service API Client pour communiquer avec le backend
 * Utilise fetch (natif) pour rester cohérent avec le reste du projet
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from '../../config/api.config';
import { isLoggingEnabled } from '../../config/env';
import { withRetry, RetryOptions } from './retryHandler';
import { checkNetworkConnectivity } from '../network/networkService';
import { createLoggerWithPrefix } from '../../utils/logger';
import { requestQueue, getRequestPriority, RequestPriority } from './requestQueue';
import { APIError } from './apiError';

const logger = createLoggerWithPrefix('apiClient');

// Configuration depuis le fichier de config
const API_BASE_URL = API_CONFIG.baseURL;
const API_TIMEOUT = API_CONFIG.timeout;

/**
 * Timeouts configurés par type d'endpoint
 * Permet d'optimiser les timeouts selon la nature de la requête
 */
const ENDPOINT_TIMEOUTS: Record<string, number> = {
  // Auth - rapide
  '/auth/login': 10000,
  '/auth/refresh': 5000,
  '/auth/me': 5000,
  
  // Production - peut être lourd avec beaucoup d'animaux
  '/production/animaux': 20000,
  '/production/pesees': 15000,
  
  // Finance - données souvent nombreuses
  '/finance/revenus': 15000,
  '/finance/depenses': 15000,
  '/finance/charges-fixes': 15000,
  
  // Marketplace - peut avoir beaucoup de listings
  '/marketplace/listings': 20000,
  
  // Kouakou - IA peut prendre du temps
  '/kouakou/chat': 30000,
  
  // Uploads/Downloads - toujours longs
  '/upload': 60000,
  '/download': 60000,
};

/**
 * Détermine le timeout approprié pour un endpoint donné
 */
function getEndpointTimeout(endpoint: string, defaultTimeout: number): number {
  // Chercher un timeout spécifique pour cet endpoint
  for (const [pattern, timeout] of Object.entries(ENDPOINT_TIMEOUTS)) {
    if (endpoint.includes(pattern)) {
      return timeout;
    }
  }
  
  // Utiliser le timeout par défaut
  return defaultTimeout;
}

// Clés de stockage - DOIVENT respecter les règles SecureStore (alphanumérique + . - _)
const ACCESS_TOKEN_KEY = 'fermier_pro.access_token';
const REFRESH_TOKEN_KEY = 'fermier_pro.refresh_token';

// Anciennes clés pour migration (avec @ et :) - plus utilisées mais gardées pour référence
const LEGACY_ACCESS_TOKEN_KEY = '@fermier_pro:access_token';
const LEGACY_REFRESH_TOKEN_KEY = '@fermier_pro:refresh_token';

// Fonction de validation des clés SecureStore
function validateSecureStoreKey(key: string): boolean {
  // SecureStore n'accepte que : alphanumérique + . - _
  return /^[a-zA-Z0-9._-]+$/.test(key) && key.length > 0;
}

/**
 * Contrôle des logs SecureStore pour éviter le spam
 * On ne log qu'une fois par type d'opération toutes les 5 secondes
 */
const secureStoreLogTimestamps: Record<string, number> = {};
const SECURE_STORE_LOG_THROTTLE_MS = 5000; // 5 secondes entre chaque log du même type

/**
 * Fonction de debug sécurisée pour les clés SecureStore
 * ⚠️ SÉCURITÉ : Ne log JAMAIS le contenu réel des tokens ou les noms de clés complets
 * Seulement des métadonnées non sensibles pour le débogage
 * 
 * ⚡ PERFORMANCE : Les logs sont throttlés (1 log par opération toutes les 5 secondes)
 * pour éviter le spam de logs répétitifs
 */
function debugSecureStoreKey(key: string, operation: string) {
  if (__DEV__) {
    // Throttling : éviter les logs répétitifs pour la même opération
    const now = Date.now();
    const lastLog = secureStoreLogTimestamps[operation] || 0;
    
    if (now - lastLog < SECURE_STORE_LOG_THROTTLE_MS) {
      // Ignorer ce log car un log similaire a été émis récemment
      return;
    }
    
    // Mettre à jour le timestamp de dernier log
    secureStoreLogTimestamps[operation] = now;
    
    // Logger uniquement des informations non sensibles :
    // - Type de clé (access_token/refresh_token) au lieu du nom complet
    // - Validation de la clé (pour détecter les erreurs de format)
    // NE JAMAIS logger : la clé complète, les caractères individuels, ou le contenu des tokens
    const isValid = validateSecureStoreKey(key);
    
    // Déterminer le type de clé sans exposer le nom complet
    let keyType = 'unknown';
    if (operation.includes('access') || key.includes('access')) {
      keyType = 'access_token';
    } else if (operation.includes('refresh') || key.includes('refresh')) {
      keyType = 'refresh_token';
    }
    
    logger.debug(`[SecureStore] ${operation}`, {
      keyType, // Type de clé sans exposer le nom complet
      isValid,
      // ⚠️ SÉCURITÉ : Ne pas logger la clé complète ou son contenu
    });
  }
}

// Système simplifié de gestion des refresh simultanés
const activeRefreshPromises = new Map<string, Promise<string | null>>();
let lastRefreshAttempt = 0;
const REFRESH_COOLDOWN = 500; // 500ms entre les tentatives de refresh (optimisé - le verrouillage par activeRefreshPromises devrait suffire)
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
 * Migre les tokens d'AsyncStorage vers SecureStore (une seule fois)
 * SÉCURITÉ : Cette fonction migre les tokens existants pour ne pas perdre les sessions
 */
async function migrateTokensToSecureStore(): Promise<void> {
  try {
    // Vérifier si on a déjà des tokens dans SecureStore avec les nouvelles clés
    const existingToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (existingToken) {
      // Migration déjà faite, supprimer les anciens tokens de AsyncStorage
      await AsyncStorage.multiRemove([LEGACY_ACCESS_TOKEN_KEY, LEGACY_REFRESH_TOKEN_KEY]);
      return;
    }

    // Vérifier d'abord les nouvelles clés dans AsyncStorage (au cas où)
    let oldAccessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    let oldRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

    // Si pas trouvé, essayer les anciennes clés (legacy)
    if (!oldAccessToken) {
      oldAccessToken = await AsyncStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
    }
    if (!oldRefreshToken) {
      oldRefreshToken = await AsyncStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
    }

    if (oldAccessToken || oldRefreshToken) {
      // Migrer vers SecureStore avec les nouvelles clés valides
      if (oldAccessToken) {
        debugSecureStoreKey(ACCESS_TOKEN_KEY, 'migration access_token');
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, oldAccessToken);
      }
      if (oldRefreshToken) {
        debugSecureStoreKey(REFRESH_TOKEN_KEY, 'migration refresh_token');
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, oldRefreshToken);
      }

      // Supprimer les anciens tokens d'AsyncStorage après migration réussie
      await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, LEGACY_ACCESS_TOKEN_KEY, LEGACY_REFRESH_TOKEN_KEY]);

      if (__DEV__) {
        logger.log('[SECURITY] Migration des tokens vers SecureStore réussie (nouvelles clés)');
      }
    }
  } catch (error) {
    if (__DEV__) {
      logger.warn('Erreur lors de la migration des tokens vers SecureStore:', {
        message: (error as any)?.message || 'Message d\'erreur non disponible',
        name: (error as any)?.name || 'Type d\'erreur inconnu',
      });
    }
    // Ne pas bloquer l'application en cas d'erreur de migration
  }
}

/**
 * Récupère le token d'accès depuis SecureStore (chiffré)
 * SÉCURITÉ : Utilise SecureStore au lieu d'AsyncStorage pour stocker les tokens de manière sécurisée
 */
async function getAccessToken(): Promise<string | null> {
  try {
    // Valider la clé avant utilisation
    if (!validateSecureStoreKey(ACCESS_TOKEN_KEY)) {
      throw new Error(`Clé SecureStore invalide: ${ACCESS_TOKEN_KEY}`);
    }

    debugSecureStoreKey(ACCESS_TOKEN_KEY, 'get access_token');

    // SÉCURITÉ : Utiliser SecureStore pour stocker les tokens de manière chiffrée
    // SecureStore utilise le Keychain iOS / Keystore Android
    let token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

    // Si pas de token dans SecureStore, essayer la migration depuis AsyncStorage (une fois)
    if (!token) {
      await migrateTokensToSecureStore();
      token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    }

    // ⚠️ IMPORTANT : Ne JAMAIS logger le token, même en mode développement
    return token;
  } catch (error) {
    // Si l'erreur indique que SecureStore n'est pas disponible ou autre problème technique,
    // logger seulement en développement avec plus de détails
    if (__DEV__) {
      logger.warn('Erreur lors de la récupération du token depuis SecureStore:', {
        message: (error as any)?.message || 'Message d\'erreur non disponible',
        name: (error as any)?.name || 'Type d\'erreur inconnu',
        stack: (error as any)?.stack || 'Stack trace non disponible',
        errorObject: error || 'Objet error vide',
      });
    }

    // Fallback vers AsyncStorage pour compatibilité (migration)
    try {
      // Essayer d'abord la nouvelle clé, puis l'ancienne
      let fallbackToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      if (!fallbackToken) {
        fallbackToken = await AsyncStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
      }

      if (!fallbackToken) {
        // Pas de token du tout - c'est normal si l'utilisateur n'est pas connecté
        if (__DEV__) {
          logger.debug('Aucun token trouvé (utilisateur non connecté ou première utilisation)');
        }
        return null;
      }
      return fallbackToken;
    } catch (fallbackError) {
      if (__DEV__) {
        logger.warn('Erreur lors du fallback AsyncStorage:', {
          message: (fallbackError as any)?.message || 'Message d\'erreur non disponible',
          name: (fallbackError as any)?.name || 'Type d\'erreur inconnu',
        });
      }
      return null;
    }
  }
}

/**
 * Stocke les tokens dans SecureStore (chiffré)
 * SÉCURITÉ : Utilise SecureStore au lieu d'AsyncStorage pour stocker les tokens de manière sécurisée
 */
async function setTokens(accessToken: string, refreshToken?: string): Promise<void> {
  try {
    // Valider les clés avant utilisation
    if (!validateSecureStoreKey(ACCESS_TOKEN_KEY)) {
      throw new Error(`Clé SecureStore invalide: ${ACCESS_TOKEN_KEY}`);
    }
    if (refreshToken && !validateSecureStoreKey(REFRESH_TOKEN_KEY)) {
      throw new Error(`Clé SecureStore invalide: ${REFRESH_TOKEN_KEY}`);
    }

    debugSecureStoreKey(ACCESS_TOKEN_KEY, 'set access_token');

    // SÉCURITÉ : Utiliser SecureStore pour stocker les tokens de manière chiffrée
    // SecureStore utilise le Keychain iOS / Keystore Android
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);

    if (refreshToken) {
      debugSecureStoreKey(REFRESH_TOKEN_KEY, 'set refresh_token');
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch (error) {
    if (__DEV__) {
      logger.error('Erreur lors du stockage des tokens:', {
        message: (error as any)?.message || 'Message d\'erreur non disponible',
        name: (error as any)?.name || 'Type d\'erreur inconnu',
      });
    }
    // En cas d'erreur, essayer un fallback vers AsyncStorage pour compatibilité (déprécié)
    // TODO: Retirer ce fallback après migration complète
    if (__DEV__) {
      logger.warn('[SECURITY] Fallback vers AsyncStorage - à retirer après migration complète');
      try {
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        if (refreshToken) {
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }
      } catch (fallbackError) {
        logger.error('Erreur lors du fallback vers AsyncStorage:', fallbackError);
      }
    }
  }
}

/**
 * Supprime les tokens de SecureStore
 * SÉCURITÉ : Supprime également les tokens du fallback AsyncStorage si présents
 */
async function clearTokens(): Promise<void> {
  try {
    // Valider les clés avant utilisation
    if (validateSecureStoreKey(ACCESS_TOKEN_KEY) && validateSecureStoreKey(REFRESH_TOKEN_KEY)) {
      debugSecureStoreKey(ACCESS_TOKEN_KEY, 'delete access_token');
      debugSecureStoreKey(REFRESH_TOKEN_KEY, 'delete refresh_token');

      // Supprimer de SecureStore (méthode principale)
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch (error) {
    if (__DEV__) {
      logger.warn('Erreur lors de la suppression des tokens de SecureStore:', {
        message: (error as any)?.message || 'Message d\'erreur non disponible',
        name: (error as any)?.name || 'Type d\'erreur inconnu',
      });
    }
  }

  // Supprimer également du fallback AsyncStorage pour compatibilité (migration)
  try {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, LEGACY_ACCESS_TOKEN_KEY, LEGACY_REFRESH_TOKEN_KEY]);
  } catch (error) {
    // Ignorer les erreurs du fallback
    if (__DEV__) {
      logger.debug('Erreur lors de la suppression du fallback AsyncStorage (ignorée):', error);
    }
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
  // SÉCURITÉ : Utiliser SecureStore pour récupérer le refresh token
  let refreshToken: string | null = null;
  try {
    // Valider la clé avant utilisation
    if (!validateSecureStoreKey(REFRESH_TOKEN_KEY)) {
      throw new Error(`Clé SecureStore invalide: ${REFRESH_TOKEN_KEY}`);
    }

    debugSecureStoreKey(REFRESH_TOKEN_KEY, 'refresh get');

    refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    // Si pas de token dans SecureStore, essayer la migration depuis AsyncStorage (une fois)
    if (!refreshToken) {
      await migrateTokensToSecureStore();
      refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch (error) {
    if (__DEV__) {
      logger.warn('Erreur lors de la récupération du refresh token depuis SecureStore:', {
        message: (error as any)?.message || 'Message d\'erreur non disponible',
        name: (error as any)?.name || 'Type d\'erreur inconnu',
        errorObject: error || 'Objet error vide',
      });
    }

    // Fallback vers AsyncStorage pour compatibilité (migration)
    try {
      // Essayer d'abord la nouvelle clé, puis l'ancienne
      let fallbackToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!fallbackToken) {
        fallbackToken = await AsyncStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
      }

      // Si trouvé dans AsyncStorage, migrer vers SecureStore
      if (fallbackToken) {
        if (validateSecureStoreKey(REFRESH_TOKEN_KEY)) {
          debugSecureStoreKey(REFRESH_TOKEN_KEY, 'refresh migrate');
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, fallbackToken);
          await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
          await AsyncStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
        }
        refreshToken = fallbackToken;
      }
    } catch (fallbackError) {
      if (__DEV__) {
        logger.warn('Erreur lors du fallback vers AsyncStorage:', {
          message: (fallbackError as any)?.message || 'Message d\'erreur non disponible',
          name: (fallbackError as any)?.name || 'Type d\'erreur inconnu',
        });
      }
    }
  }

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
          
          // SÉCURITÉ : Stocker le nouveau refresh_token si fourni (rotation des tokens)
          // Le backend doit maintenant retourner un nouveau refresh_token lors du refresh
          // L'ancien refresh_token est révoqué côté backend
          if (data.refresh_token) {
            await setTokens(data.access_token, data.refresh_token);
          } else {
            // Fallback : stocker uniquement le nouveau access_token si pas de nouveau refresh_token
            // (pour compatibilité avec anciennes versions du backend)
            await setTokens(data.access_token);
          }
          
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

          if (__DEV__) {
            logger.error('Erreur lors du rafraîchissement du token:', {
              message: (error as any)?.message || 'Message d\'erreur non disponible',
              name: (error as any)?.name || 'Type d\'erreur inconnu',
            });
          }
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
    timeout: customTimeout,
    skipAuth = false,
    retry = true,
    offlineFallback = false,
    skipQueue = false,
    ...fetchOptions
  } = options;
  
  // Utiliser le timeout personnalisé, ou celui de l'endpoint, ou le défaut
  const timeout = customTimeout ?? getEndpointTimeout(endpoint, API_TIMEOUT);

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

  // Les requêtes auth critiques contournent complètement la queue
  const isCriticalAuthRequest = (endpoint.includes('/auth/refresh') || endpoint.includes('/auth/login')) && skipQueue !== false;
  
  if (isCriticalAuthRequest) {
    return executeWithRetry();
  }

  // Déterminer la priorité de la requête
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const priority = skipQueue ? RequestPriority.HIGH : getRequestPriority(endpoint, method);

  // Toutes les requêtes passent par la queue (sauf auth critique) avec priorités
  return requestQueue.enqueue(executeWithRetry, priority);
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
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Ne pas ajouter Content-Type pour FormData (React Native le fera automatiquement avec la boundary)
  // Si l'utilisateur a explicitement passé 'Content-Type': 'multipart/form-data', le retirer
  // car React Native doit générer automatiquement le Content-Type avec la boundary
  if (fetchOptions.body instanceof FormData) {
    // Retirer Content-Type si présent (React Native le génère automatiquement)
    delete headers['Content-Type'];
    delete headers['content-type'];
  } else {
    // Pour les autres types de body, utiliser application/json par défaut
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  // Ajouter le token d'authentification si nécessaire
  if (!skipAuth) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Pas de token disponible - c'est normal pour les utilisateurs non connectés
      if (__DEV__) {
        logger.debug(`[${endpoint}] Aucun token d'authentification (utilisateur non connecté)`);
      }
    }
  }

  // Créer un AbortController pour le timeout
  const controller = new AbortController();
  const requestStartTime = Date.now();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    // Construire les options de fetch
    // Important : le body doit être passé explicitement pour FormData
    const fetchRequestOptions: RequestInit = {
      method: fetchOptions.method || 'GET',
      headers,
      signal: controller.signal,
    };

    // Ajouter le body seulement s'il existe
    // Pour FormData, il doit être passé directement (pas stringifié)
    if (fetchOptions.body !== undefined) {
      fetchRequestOptions.body = fetchOptions.body;
    }

    // Ajouter les autres options (credentials, mode, etc.)
    if (fetchOptions.credentials) {
      fetchRequestOptions.credentials = fetchOptions.credentials;
    }
    if (fetchOptions.mode) {
      fetchRequestOptions.mode = fetchOptions.mode;
    }

    if (__DEV__ && fetchOptions.body instanceof FormData) {
      logger.debug(`[executeHttpRequest] Envoi FormData vers ${endpoint}`, {
        url,
        method: fetchRequestOptions.method,
        hasBody: !!fetchRequestOptions.body,
        headers: Object.keys(headers),
        API_BASE_URL,
      });
    }

    let response: Response;
    try {
      response = await fetch(url, fetchRequestOptions);
    } catch (fetchError: any) {
      // Gérer les erreurs de fetch (réseau, CORS, etc.)
      clearTimeout(timeoutId);
      
      const errorMessage = fetchError?.message || 'Erreur de connexion';
      
      // Détecter les erreurs AbortError (timeout)
      if (fetchError?.name === 'AbortError' || errorMessage.includes('Aborted')) {
        // Vérifier si c'est un timeout ou une annulation manuelle
        const elapsedMs = Date.now() - requestStartTime;
        const isTimeout = elapsedMs >= timeout * 0.9; // 90% du timeout = probablement un timeout
        
        if (isTimeout) {
          // Ne logger les timeouts qu'en mode debug pour éviter le spam
          // Les timeouts sont normaux quand le backend n'est pas accessible
          if (__DEV__) {
            logger.debug(`[executeHttpRequest] Timeout pour ${endpoint}`, {
              endpoint,
              timeout,
              elapsed: elapsedMs,
              url,
            });
          }
          throw new APIError(
            `La requête a pris trop de temps (timeout: ${timeout}ms). Le backend est peut-être inaccessible sur ${API_BASE_URL}.`,
            408,
            { originalError: errorMessage, timeout, elapsed: elapsedMs }
          );
        } else {
          // Annulation manuelle ou autre
          throw new APIError('Requête annulée', 0, { originalError: errorMessage });
        }
      }
      
      // Détecter les types d'erreurs courants
      if (errorMessage.includes('Network request failed') || 
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('network') ||
          fetchError?.name === 'TypeError' ||
          errorMessage.includes('connexion')) {
        
        // Diagnostic amélioré pour les erreurs réseau
        const isFormData = fetchOptions.body instanceof FormData;
        const diagnosticInfo = {
          url,
          API_BASE_URL,
          method: fetchOptions.method || 'GET',
          isFormData,
          endpoint,
          errorName: fetchError?.name,
          errorMessage,
        };
        
        logger.error(`[executeHttpRequest] Erreur réseau pour ${endpoint}:`, diagnosticInfo);
        
        // Message d'erreur plus détaillé pour FormData
        let userMessage = 'Erreur de connexion. Vérifiez votre connexion Internet.';
        if (isFormData) {
          userMessage = `Erreur lors de l'upload. Vérifiez que :
- Le backend est démarré sur ${API_BASE_URL}
- Votre appareil est connecté au même réseau
- Le firewall ne bloque pas la connexion`;
        }
        
        throw new APIError(userMessage, 0, { originalError: errorMessage, diagnosticInfo });
      }
      
      // Autres erreurs
      logger.error(`[executeHttpRequest] Erreur fetch pour ${endpoint}:`, fetchError);
      throw new APIError(
        errorMessage || 'Erreur lors de la requête',
        0,
        { originalError: fetchError }
      );
    }

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
      
      // Ne pas loguer les erreurs attendues dans certains contextes :
      // - 404 sur rappels-vaccinations (rappels qui n'existent pas encore)
      // - 403 sur batch-pigs/batch (acheteurs qui n'ont pas accès aux bandes d'autres producteurs - comportement normal dans le marketplace)
      // - 404 sur marketplace/ratings/average (endpoint non implémenté, calcul manuel disponible)
      const isExpectedError =
        (response.status === 404 && endpoint.includes('rappels-vaccinations')) ||
        (response.status === 403 && endpoint.includes('/batch-pigs/batch/')) ||
        (response.status === 404 && endpoint.includes('/marketplace/ratings/average'));
      
      if (!isExpectedError) {
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
/**
 * Gère une requête en mode hors ligne avec fallback depuis AsyncStorage
 * Pour une implémentation complète avec SQLite, voir les services de cache dédiés
 */
async function handleOfflineRequest<T>(endpoint: string, fetchOptions: RequestInit): Promise<T> {
  const method = (fetchOptions.method || 'GET').toUpperCase();

  if (__DEV__) {
    logger.debug(`Mode hors ligne: ${method} ${endpoint}`);
  }

  // Seules les requêtes GET peuvent être servies depuis le cache
  if (method !== 'GET') {
    throw new APIError(
      'Mode hors ligne. Les actions de modification nécessitent une connexion Internet. ' +
      'Votre requête sera synchronisée automatiquement lors de la reconnexion.',
      0
    );
  }

  // Fallback pour /auth/me
  if (endpoint === '/auth/me' || endpoint.includes('/auth/me')) {
    try {
      const userData = await AsyncStorage.getItem('@fermier_pro:auth');
      if (userData) {
        const parsed = JSON.parse(userData);
        logger.debug('[handleOfflineRequest] Utilisateur récupéré depuis AsyncStorage');
        return parsed as T;
      }
    } catch (error) {
      logger.warn('[handleOfflineRequest] Erreur lors du fallback /auth/me:', error);
    }
  }

  // Pour les autres endpoints GET, essayer de récupérer depuis le cache si disponible
  // Note: Les services de cache dédiés (productionCache, etc.) gèrent déjà ce cas
  // Ici on indique simplement que le mode hors ligne est actif
  
  throw new APIError(
    'Mode hors ligne. Cette donnée n\'est pas disponible en cache local. ' +
    'Veuillez vous connecter à Internet pour accéder à cette ressource.',
    0
  );
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
    // Si data est un FormData, l'utiliser directement sans JSON.stringify
    const body = data instanceof FormData ? data : data ? JSON.stringify(data) : undefined;
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
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
