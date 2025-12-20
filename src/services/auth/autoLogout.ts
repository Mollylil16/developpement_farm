/**
 * Service de déconnexion automatique après inactivité
 * Déconnecte l'utilisateur après une période d'inactivité
 */

import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const LAST_ACTIVITY_KEY = '@fermier_pro:last_activity';

let inactivityTimer: NodeJS.Timeout | null = null;
let onLogoutCallback: (() => void) | null = null;

/**
 * Enregistre l'activité de l'utilisateur
 */
export async function recordActivity(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    resetInactivityTimer();
  } catch (error) {
    console.error("[autoLogout] Erreur lors de l'enregistrement de l'activité:", error);
  }
}

/**
 * Réinitialise le timer d'inactivité
 */
function resetInactivityTimer(): void {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }

  inactivityTimer = setTimeout(() => {
    void handleAutoLogout();
  }, INACTIVITY_TIMEOUT);
}

/**
 * Gère la déconnexion automatique
 */
async function handleAutoLogout(): Promise<void> {
  try {
    console.log('[autoLogout] Déconnexion automatique après inactivité');

    // Nettoyer les tokens
    await apiClient.tokens.clear();

    // Appeler le callback si défini
    if (onLogoutCallback) {
      onLogoutCallback();
    }
  } catch (error) {
    console.error('[autoLogout] Erreur lors de la déconnexion automatique:', error);
  }
}

/**
 * Vérifie l'inactivité au démarrage de l'app
 */
export async function checkInactivity(): Promise<boolean> {
  try {
    const lastActivityStr = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivityStr) {
      return false;
    }

    const lastActivity = parseInt(lastActivityStr, 10);
    const now = Date.now();
    const timeSinceActivity = now - lastActivity;

    if (timeSinceActivity > INACTIVITY_TIMEOUT) {
      // Inactivité trop longue, déconnecter
      await handleAutoLogout();
      return true;
    }

    // Réinitialiser le timer
    resetInactivityTimer();
    return false;
  } catch (error) {
    console.error("[autoLogout] Erreur lors de la vérification de l'inactivité:", error);
    return false;
  }
}

/**
 * Initialise le service de déconnexion automatique
 */
export function initAutoLogout(onLogout: () => void): void {
  onLogoutCallback = onLogout;

  // Écouter les changements d'état de l'app
  AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App devient active, vérifier l'inactivité
      void checkInactivity();
      void recordActivity();
    } else if (nextAppState === 'background') {
      // App passe en arrière-plan, enregistrer l'activité
      void recordActivity();
    }
  });

  // Enregistrer l'activité initiale
  void recordActivity();
}

/**
 * Nettoie le service
 */
export function cleanupAutoLogout(): void {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
  onLogoutCallback = null;
}
