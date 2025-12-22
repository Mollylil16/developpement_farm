/**
 * Configuration de l'API
 * Utilise la configuration d'environnement pour déterminer l'URL
 */

import { getApiBaseUrlSync, getApiTimeout } from './env';

export const API_CONFIG = {
  /**
   * URL de base de l'API (déterminée automatiquement selon l'environnement)
   * - Dev: http://192.168.0.214:3000 (ou localhost pour web)
   * - Staging: https://staging-api.fermier-pro.com
   * - Prod: https://fermier-pro-backend.onrender.com (Render)
   *
   * ⚠️ IMPORTANT: Pour tester sur un appareil physique, modifiez l'IP dans src/config/env.ts
   * Remplacez '192.168.0.214' par l'IP locale de votre machine
   */
  baseURL: getApiBaseUrlSync(),

  /**
   * Timeout par défaut pour les requêtes (en millisecondes)
   */
  timeout: getApiTimeout(),

  /**
   * Clés de stockage pour les tokens
   */
  storageKeys: {
    accessToken: '@fermier_pro:access_token',
    refreshToken: '@fermier_pro:refresh_token',
  },
};
