/**
 * Configuration des environnements
 * Gère les différentes URLs selon l'environnement (dev, staging, prod)
 */

import { Platform } from 'react-native';

function getExpoDevHost(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants')?.default;
    const hostUri: string | undefined =
      Constants?.expoConfig?.hostUri ||
      Constants?.manifest?.hostUri ||
      Constants?.manifest?.debuggerHost ||
      Constants?.manifest2?.extra?.expoGo?.developer?.hostUri ||
      Constants?.manifest2?.extra?.expoClient?.hostUri;

    if (!hostUri || typeof hostUri !== 'string') return null;
    // hostUri / debuggerHost look like "192.168.x.x:19000"
    const host = hostUri.split(':')[0]?.trim();
    if (!host) return null;
    return host;
  } catch {
    return null;
  }
}

export type Environment = 'development' | 'staging' | 'production';

/**
 * Détecte l'environnement actuel
 * Peut être surchargé via AsyncStorage pour les tests
 */
export async function getEnvironment(): Promise<Environment> {
  try {
    // Permettre de forcer l'environnement via AsyncStorage (pour tests)
    const forcedEnv = await import('@react-native-async-storage/async-storage').then((m) =>
      m.default.getItem('@fermier_pro:forced_env')
    );
    if (forcedEnv && ['development', 'staging', 'production'].includes(forcedEnv)) {
      return forcedEnv as Environment;
    }
  } catch {
    // Ignorer si AsyncStorage n'est pas disponible
  }

  // En développement
  if (__DEV__) {
    return 'development';
  }

  // Par défaut, production
  return 'production';
}

/**
 * Version synchrone (pour usage immédiat)
 */
export function getEnvironmentSync(): Environment {
  if (__DEV__) {
    return 'development';
  }
  return 'production';
}

/**
 * Configuration par environnement
 */
const ENV_CONFIG = {
  development: {
    apiUrl:
      Platform.select({
        // Pour Android/iOS physique, utiliser l'IP locale de votre machine
        // Remplacer par votre IP locale (ex: ipconfig sur Windows, ifconfig sur Mac/Linux)
        default:
          process.env.EXPO_PUBLIC_API_URL ||
          (() => {
            // Auto-détection en dev: utiliser l'hôte du bundler Expo -> backend sur :3000
            const host = getExpoDevHost();
            if (host) return `http://${host}:3000`;
            // Fallback émulateur Android
            if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
            // Fallback simulateur iOS / desktop
            return 'http://localhost:3000';
          })(),
        web: 'http://localhost:3000',
      }) || 'http://localhost:3000',
    timeout: 30000, // 30 secondes en dev (plus long pour les opérations lourdes comme la création de projet)
    enableLogging: true,
  },
  staging: {
    apiUrl: 'https://staging-api.fermier-pro.com',
    timeout: 10000, // 10 secondes
    enableLogging: true,
  },
  production: {
    // URL du backend Render en production
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://fermier-pro-backend.onrender.com',
    timeout: 10000, // 10 secondes
    enableLogging: false,
  },
};

/**
 * Récupère la configuration pour l'environnement actuel
 */
export function getEnvConfig() {
  const env = getEnvironmentSync();
  return ENV_CONFIG[env];
}

/**
 * Récupère l'URL de base de l'API
 * Peut être surchargée via AsyncStorage
 */
export async function getApiBaseUrl(): Promise<string> {
  try {
    // Permettre de surcharger l'URL via AsyncStorage (pour tests)
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const customUrl = await AsyncStorage.getItem('@fermier_pro:api_url');
    if (customUrl) {
      return customUrl;
    }
  } catch {
    // Ignorer si AsyncStorage n'est pas disponible
  }

  const config = getEnvConfig();
  return config.apiUrl;
}

/**
 * Version synchrone de getApiBaseUrl
 */
export function getApiBaseUrlSync(): string {
  const config = getEnvConfig();
  return config.apiUrl;
}

/**
 * Récupère le timeout par défaut
 */
export function getApiTimeout(): number {
  const config = getEnvConfig();
  return config.timeout;
}

/**
 * Vérifie si le logging est activé
 */
export function isLoggingEnabled(): boolean {
  const config = getEnvConfig();
  return config.enableLogging;
}
