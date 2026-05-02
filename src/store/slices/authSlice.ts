/**
 * Slice Redux pour l'authentification
 * Utilise maintenant l'API backend au lieu de SQLite
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, AuthState, SignUpInput, SignInInput, AuthProvider } from '../../types/auth';
import { getErrorMessage } from '../../types/common';
import { setProjetActif } from './projetSlice';
import apiClient from '../../services/api/apiClient';
import { validateRegisterData } from '../../utils/validation';
import { createLoggerWithPrefix } from '../../utils/logger';

const logger = createLoggerWithPrefix('AuthSlice');

const AUTH_STORAGE_KEY = '@fermier_pro:auth';

// SÉCURITÉ : Ne plus stocker l'utilisateur dans AsyncStorage
// L'utilisateur est maintenant stocké uniquement dans Redux (via Redux Persist si configuré)
// Cette fonction est gardée uniquement pour nettoyer les anciennes données (migration)

// Fonction pour supprimer l'utilisateur du stockage (migration uniquement)
// Utilisée pour nettoyer les anciennes données d'AsyncStorage après migration vers Redux uniquement
const removeUserFromStorage = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    // Ignorer les erreurs de suppression (peut ne pas exister)
    if (__DEV__) {
      logger.debug("Suppression de l'utilisateur AsyncStorage (migration):", error);
    }
  }
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Commence à true pour vérifier le stockage
  error: null,
};

// Thunk pour charger l'utilisateur depuis le stockage au démarrage
export const loadUserFromStorageThunk = createAsyncThunk('auth/loadUserFromStorage', async () => {
  try {
    // Vérifier si on a un token d'accès
    const token = await apiClient.tokens.getAccess();
    if (!token) {
      // Pas de token, nettoyer tout stockage utilisateur obsolète (AsyncStorage)
      // SÉCURITÉ : Ne plus stocker l'utilisateur dans AsyncStorage, uniquement dans Redux
      await removeUserFromStorage();
      return null;
    }

    // Récupérer le profil depuis l'API
    try {
      const user = await apiClient.get<User>('/auth/me');

      // SÉCURITÉ : Ne plus stocker l'utilisateur dans AsyncStorage
      // L'utilisateur est maintenant stocké uniquement dans Redux (via Redux Persist si configuré)

      // Vérifier si l'utilisateur est un collaborateur et le lier si nécessaire (SQLite local)
      if (user.email) {
        try {
          const { CollaborateurRepository } = await import('../../database/repositories');
          const collaborateurRepo = new CollaborateurRepository();
          await collaborateurRepo.lierCollaborateurAUtilisateur(user.id, user.email);
        } catch (error: unknown) {
          // Ne pas bloquer le chargement si la liaison échoue
          logger.warn(
            'Avertissement lors de la liaison du collaborateur au démarrage:',
            getErrorMessage(error)
          );
        }
      }

      return user;
    } catch (error: unknown) {
      // Token invalide ou erreur API
      logger.error('Erreur lors de la récupération du profil:', error);

      // Nettoyer les tokens et l'utilisateur stocké
      await apiClient.tokens.clear();
      await removeUserFromStorage();
      return null;
    }
  } catch (error) {
    logger.error("Erreur lors du chargement de l'utilisateur:", error);
    await apiClient.tokens.clear();
    await removeUserFromStorage();
    return null;
  }
});

// Thunk pour l'inscription
export const signUp = createAsyncThunk(
  'auth/signUp',
  async (input: SignUpInput, { rejectWithValue, dispatch }) => {
    try {
      // SÉCURITÉ : Rate limiting pour éviter les abus d'inscription
      const { checkRateLimit, resetRateLimit } = await import('../../utils/rateLimiter');
      // Utiliser l'identifiant dans la clé pour limiter par utilisateur
      const identifier = input.email || input.telephone || '';
      const rateLimitKey = `auth:signUp:${identifier}`;
      const rateLimit = checkRateLimit(rateLimitKey, 3, 600000); // 3 tentatives par 10 minutes
      
      if (!rateLimit.allowed) {
        const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
        return rejectWithValue(
          `Trop de tentatives d'inscription. Veuillez patienter ${waitSeconds} seconde(s) avant de réessayer.`
        );
      }
      
      // Validation complète avec les utilitaires de validation
      const validation = validateRegisterData({
        email: input.email,
        telephone: input.telephone,
        nom: input.nom,
        prenom: input.prenom,
        password: input.password,
      });

      if (!validation.isValid) {
        return rejectWithValue(validation.errors.join('. '));
      }

      // Appeler l'API backend pour créer l'utilisateur
      const response = await apiClient.post<{
        access_token: string;
        refresh_token: string;
        user: User;
      }>(
        '/auth/register',
        {
          email: input.email?.trim(),
          telephone: input.telephone?.replace(/\s+/g, ''),
          nom: input.nom.trim(),
          prenom: input.prenom.trim(),
        },
        { skipAuth: true }
      );

      const { access_token, refresh_token, user } = response;

      // Stocker les tokens
      await apiClient.tokens.set(access_token, refresh_token);

      // Vérifier si l'utilisateur est un collaborateur et le lier (SQLite local)
      // On vérifie seulement si l'utilisateur a un email (pas de téléphone pour les collaborateurs)
      if (user.email) {
        try {
          const { CollaborateurRepository } = await import('../../database/repositories');
          const collaborateurRepo = new CollaborateurRepository();
          const collaborateur = await collaborateurRepo.lierCollaborateurAUtilisateur(
            user.id,
            user.email
          );

          if (collaborateur) {
            logger.debug(
              "Collaborateur lié à l'utilisateur lors de l'inscription:",
              collaborateur.id
            );
            // Le projet sera chargé automatiquement dans loadProjetActif
          }
        } catch (error: unknown) {
          // Ne pas bloquer l'inscription si la liaison échoue
          logger.warn(
            "Avertissement lors de la liaison du collaborateur à l'inscription:",
            getErrorMessage(error)
          );
        }
      }

      // SÉCURITÉ : Ne plus stocker l'utilisateur dans AsyncStorage
      // L'utilisateur est maintenant stocké uniquement dans Redux

      // Réinitialiser le projet actif pour le nouvel utilisateur
      // (sera rechargé automatiquement si c'est un collaborateur)
      dispatch(setProjetActif(null));

      // Réinitialiser le rate limiting en cas de succès
      resetRateLimit(rateLimitKey);

      return user;
    } catch (error: unknown) {
      // Gérer les erreurs API
      if (error && typeof error === 'object' && 'status' in error && error.status === 409) {
        const apiError = error as { status: number; data?: { message?: string } };
        return rejectWithValue(
          apiError.data?.message || 'Un compte existe déjà avec cet email ou ce numéro'
        );
      }
      return rejectWithValue(
        (error instanceof Error ? error.message : null) || getErrorMessage(error)
      );
    }
  }
);

// Thunk pour la connexion
export const signIn = createAsyncThunk(
  'auth/signIn',
  async (input: SignInInput, { rejectWithValue, dispatch }) => {
    try {
      // SÉCURITÉ : Rate limiting pour éviter les attaques par force brute
      const { checkRateLimit, resetRateLimit } = await import('../../utils/rateLimiter');
      // Utiliser l'identifiant dans la clé pour limiter par utilisateur (garder original pour le rate limit)
      const identifierForRateLimit = input.identifier || '';
      const rateLimitKey = `auth:signIn:${identifierForRateLimit}`;
      const rateLimit = checkRateLimit(rateLimitKey, 5, 300000); // 5 tentatives par 5 minutes
      
      if (!rateLimit.allowed) {
        const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
        return rejectWithValue(
          `Trop de tentatives de connexion. Veuillez patienter ${waitSeconds} seconde(s) avant de réessayer.`
        );
      }
      
      // Validation
      if (!input.identifier || !input.identifier.trim()) {
        return rejectWithValue('Veuillez entrer votre email ou numéro de téléphone');
      }

      // Déterminer si c'est un email ou un téléphone (utiliser version trimée pour les API)
      const identifier = input.identifier.trim();
      const isEmail = identifier.includes('@');

      // Si mot de passe fourni, utiliser /auth/login
      if (input.password) {
        const response = await apiClient.post<{
          access_token: string;
          refresh_token: string;
          user: User;
        }>(
          '/auth/login',
          isEmail
            ? { email: identifier, password: input.password }
            : { telephone: identifier, password: input.password },
          { skipAuth: true }
        );

        const { access_token, refresh_token, user } = response;

        // Stocker les tokens
        await apiClient.tokens.set(access_token, refresh_token);

        // Vérifier si l'utilisateur est un collaborateur et le lier (SQLite local)
        if (user && user.email) {
          try {
            const { CollaborateurRepository } = await import('../../database/repositories');
            const collaborateurRepo = new CollaborateurRepository();
            await collaborateurRepo.lierCollaborateurAUtilisateur(user.id, user.email);
          } catch (error: unknown) {
            logger.warn(
              'Avertissement lors de la liaison du collaborateur:',
              getErrorMessage(error)
            );
          }
        }

        return user;
      }

      // Sinon, utiliser /auth/login-simple (sans mot de passe)
      const response = await apiClient.post<{
        access_token: string;
        refresh_token: string;
        user: User;
      }>(
        '/auth/login-simple',
        {
          identifier: identifier,
        },
        { skipAuth: true }
      );

      const { access_token, refresh_token, user } = response;

      // Stocker les tokens
      await apiClient.tokens.set(access_token, refresh_token);

      // Vérifier si l'utilisateur est un collaborateur et le lier (SQLite local)
      // On vérifie seulement si l'utilisateur a un email (pas de téléphone pour les collaborateurs)
      if (user && user.email) {
        try {
          const { CollaborateurRepository } = await import('../../database/repositories');
          const collaborateurRepo = new CollaborateurRepository();
          const collaborateur = await collaborateurRepo.lierCollaborateurAUtilisateur(
            user.id,
            user.email
          );

          if (collaborateur) {
            logger.debug("Collaborateur lié à l'utilisateur:", collaborateur.id);
            // Le projet sera chargé automatiquement dans loadProjetActif
          }
        } catch (error: unknown) {
          // Ne pas bloquer la connexion si la liaison échoue
          logger.warn(
            'Avertissement lors de la liaison du collaborateur:',
            getErrorMessage(error)
          );
        }
      }

      // SÉCURITÉ : Ne plus stocker l'utilisateur dans AsyncStorage
      // L'utilisateur est maintenant stocké uniquement dans Redux

      // Réinitialiser le rate limiting en cas de succès
      resetRateLimit(rateLimitKey);
      
      return user;
    } catch (error: unknown) {
      // Gérer les erreurs API
      if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
        // Pour les erreurs 401 (identifiants incorrects), utiliser un message générique
        // qui ne révèle pas si l'utilisateur existe ou non (sécurité)
        // Note: Le rate limiting reste actif même en cas d'erreur
        return rejectWithValue(
          'Identifiant ou mot de passe incorrect. Si ceci est votre première connexion, veuillez créer un compte.'
        );
      }
      return rejectWithValue(
        (error instanceof Error ? error.message : null) || getErrorMessage(error)
      );
    }
  }
);

// Thunk pour la connexion avec Google
export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      // SÉCURITÉ : Rate limiting pour éviter les abus
      const { checkRateLimit, resetRateLimit } = await import('../../utils/rateLimiter');
      const rateLimitKey = 'auth:signInWithGoogle';
      const rateLimit = checkRateLimit(rateLimitKey, 5, 60000); // 5 tentatives par minute
      
      if (!rateLimit.allowed) {
        const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
        return rejectWithValue(
          `Trop de tentatives de connexion. Veuillez patienter ${waitSeconds} seconde(s) avant de réessayer.`
        );
      }
      
      // Utiliser le service OAuth
      const { signInWithGoogle: oauthSignIn } = await import('../../services/auth/oauthService');
      const { access_token, refresh_token, user } = await oauthSignIn();
      
      // Réinitialiser le rate limiting en cas de succès
      resetRateLimit(rateLimitKey);

      // Stocker les tokens
      await apiClient.tokens.set(access_token, refresh_token);

      // Vérifier si l'utilisateur est un collaborateur et le lier (SQLite local)
      if (user && user.email) {
        try {
          const { CollaborateurRepository } = await import('../../database/repositories');
          const collaborateurRepo = new CollaborateurRepository();
          const collaborateur = await collaborateurRepo.lierCollaborateurAUtilisateur(
            user.id,
            user.email
          );

          if (collaborateur) {
            logger.debug("Collaborateur lié à l'utilisateur (Google):", collaborateur.id);
          }
        } catch (error: unknown) {
          logger.warn(
            'Avertissement lors de la liaison du collaborateur (Google):',
            getErrorMessage(error)
          );
        }
      }

      // SÉCURITÉ : Ne plus stocker l'utilisateur dans AsyncStorage
      // L'utilisateur est maintenant stocké uniquement dans Redux

      // Réinitialiser le projet actif
      dispatch(setProjetActif(null));

      return user;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Thunk pour la connexion avec Apple
export const signInWithApple = createAsyncThunk(
  'auth/signInWithApple',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      // SÉCURITÉ : Rate limiting pour éviter les abus
      const { checkRateLimit, resetRateLimit } = await import('../../utils/rateLimiter');
      const rateLimitKey = 'auth:signInWithApple';
      const rateLimit = checkRateLimit(rateLimitKey, 5, 60000); // 5 tentatives par minute
      
      if (!rateLimit.allowed) {
        const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
        return rejectWithValue(
          `Trop de tentatives de connexion. Veuillez patienter ${waitSeconds} seconde(s) avant de réessayer.`
        );
      }
      
      // Utiliser le service OAuth
      const { signInWithApple: oauthSignIn } = await import('../../services/auth/oauthService');
      const { access_token, refresh_token, user } = await oauthSignIn();
      
      // Réinitialiser le rate limiting en cas de succès
      resetRateLimit(rateLimitKey);

      // Stocker les tokens
      await apiClient.tokens.set(access_token, refresh_token);

      // Vérifier si l'utilisateur est un collaborateur et le lier (SQLite local)
      if (user && user.email) {
        try {
          const { CollaborateurRepository } = await import('../../database/repositories');
          const collaborateurRepo = new CollaborateurRepository();
          const collaborateur = await collaborateurRepo.lierCollaborateurAUtilisateur(
            user.id,
            user.email
          );

          if (collaborateur) {
            logger.debug("Collaborateur lié à l'utilisateur (Apple):", collaborateur.id);
          }
        } catch (error: unknown) {
          logger.warn(
            'Avertissement lors de la liaison du collaborateur (Apple):',
            getErrorMessage(error)
          );
        }
      }

      // SÉCURITÉ : Ne plus stocker l'utilisateur dans AsyncStorage
      // L'utilisateur est maintenant stocké uniquement dans Redux

      // Réinitialiser le projet actif
      dispatch(setProjetActif(null));

      return user;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Thunk pour la déconnexion
export const signOut = createAsyncThunk('auth/signOut', async (_, { dispatch }) => {
  // Arrêter la synchronisation du profil
  try {
    const { profileSyncService } = await import('../../services/profileSyncService');
    profileSyncService.stop();
  } catch (error) {
    // Ne pas bloquer la déconnexion si le service n'est pas disponible
    logger.warn('[AuthSlice] Impossible d\'arrêter la synchronisation du profil:', error);
  }
  try {
    // Récupérer le refresh token pour le révoquer côté backend
    const refreshTokenKey = '@fermier_pro:refresh_token';
    const refreshToken = await AsyncStorage.getItem(refreshTokenKey);

    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refresh_token: refreshToken });
      } catch (error) {
        // Ne pas bloquer la déconnexion si l'appel API échoue
        logger.warn('Avertissement lors de la déconnexion côté backend:', error);
      }
    }
  } catch (error) {
    logger.warn('Avertissement lors de la récupération du refresh token:', error);
  }

  // Nettoyer les tokens et l'utilisateur
  await apiClient.tokens.clear();
  await removeUserFromStorage();

  // Réinitialiser le projet actif lors de la déconnexion
  dispatch(setProjetActif(null));

  return null;
});

// Thunk pour la suppression de compte
export const deleteAccount = createAsyncThunk(
  'auth/deleteAccount',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      // Appeler l'API pour supprimer le compte
      await apiClient.delete('/auth/delete-account');

      // Nettoyer complètement le storage local
      await apiClient.tokens.clear();
      await removeUserFromStorage();
      
      // Nettoyer AsyncStorage complètement
      await AsyncStorage.clear();

      // Réinitialiser le projet actif
      dispatch(setProjetActif(null));

      logger.log('Compte supprimé avec succès');
      return null;
    } catch (error: unknown) {
      logger.error('Erreur lors de la suppression du compte:', error);
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors de la suppression du compte');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      // SÉCURITÉ : Ne plus stocker l'utilisateur dans AsyncStorage
      // L'utilisateur est maintenant stocké uniquement dans Redux (via Redux Persist si configuré)
    },
  },
  extraReducers: (builder) => {
    builder
      // loadUserFromStorageThunk
      .addCase(loadUserFromStorageThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadUserFromStorageThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload;
          state.isAuthenticated = true;
        } else {
          state.user = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(loadUserFromStorageThunk.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      // signUp
      .addCase(signUp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // signIn
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // signInWithGoogle
      .addCase(signInWithGoogle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // signInWithApple
      .addCase(signInWithApple.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithApple.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(signInWithApple.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // signOut
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(signOut.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      // deleteAccount
      .addCase(deleteAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
