/**
 * Middleware Redux pour gérer automatiquement les erreurs d'authentification
 * Intercepte les erreurs 401 et déclenche une déconnexion automatique
 */

import { Middleware } from '@reduxjs/toolkit';
import { APIError } from '../../services/api/apiError';
import { createLoggerWithPrefix } from '../../utils/logger';
import { signOut } from '../slices/authSlice';
import type { RootState } from '../store';

const logger = createLoggerWithPrefix('AuthMiddleware');

let lastAutoLogoutAt = 0;
const AUTO_LOGOUT_COOLDOWN_MS = 2000;

/**
 * Middleware qui intercepte les erreurs 401 et déclenche une déconnexion automatique
 */
export const authMiddleware: Middleware = (store) => (next) => (action) => {
  // Traiter l'action normalement en premier
  const result = next(action);

  // Vérifier si c'est une action rejetée (thunk rejeté)
  if (action.type && action.type.endsWith('/rejected') && action.payload) {
    const error = action.payload;

    // Vérifier si c'est une erreur API avec status 401
    const isUnauthorizedApiError = error instanceof APIError && error.status === 401;

    // Dans beaucoup de slices, on fait rejectWithValue(getErrorMessage(error)) => payload = string
    // On détecte donc aussi les messages d'auth expirée/Unauthorized.
    const isUnauthorizedMessage =
      typeof error === 'string' && /unauthorized|non autoris|session expir|reconnect/i.test(error);

    const isUnauthorizedPayloadObject =
      !!error &&
      typeof error === 'object' &&
      'status' in error &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error as any).status === 401;

    if (isUnauthorizedApiError || isUnauthorizedMessage || isUnauthorizedPayloadObject) {
      logger.warn('Erreur 401 détectée, déclenchement de la déconnexion automatique', {
        action: action.type,
        error: typeof error === 'string' ? error : (error as Error).message,
      });

      const state = store.getState() as RootState;
      const alreadyLoggedOut = !state.auth?.isAuthenticated;
      const now = Date.now();
      const inCooldown = now - lastAutoLogoutAt < AUTO_LOGOUT_COOLDOWN_MS;

      if (!alreadyLoggedOut && !inCooldown) {
        lastAutoLogoutAt = now;
        // Utiliser setTimeout pour éviter les conflits de dispatch pendant le traitement
        setTimeout(() => {
          store.dispatch(signOut());
        }, 0);
      }
    }
  }

  return result;
};
