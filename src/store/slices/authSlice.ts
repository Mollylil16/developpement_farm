/**
 * Slice Redux pour l'authentification
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthState, EmailSignUpInput, EmailSignInInput, AuthProvider } from '../../types';
import { setProjetActif } from './projetSlice';

const AUTH_STORAGE_KEY = '@fermier_pro:auth';

// Fonction pour sauvegarder l'utilisateur
const saveUserToStorage = async (user: User) => {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'utilisateur:', error);
  }
};

// Fonction pour charger l'utilisateur depuis le stockage
const loadUserFromStorage = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error('Erreur lors du chargement de l\'utilisateur:', error);
    return null;
  }
};

// Fonction pour supprimer l'utilisateur du stockage
const removeUserFromStorage = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
  }
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Commence à true pour vérifier le stockage
  error: null,
};

// Thunk pour charger l'utilisateur depuis le stockage au démarrage
export const loadUserFromStorageThunk = createAsyncThunk(
  'auth/loadUserFromStorage',
  async () => {
    return await loadUserFromStorage();
  }
);

// Thunk pour l'inscription avec email
export const signUpWithEmail = createAsyncThunk(
  'auth/signUpWithEmail',
  async (input: EmailSignUpInput, { rejectWithValue, dispatch }) => {
    try {
      // Vérifier si un utilisateur existe déjà avec cet email
      const existingUser = await loadUserFromStorage();
      
      if (existingUser) {
        // Si l'email correspond, proposer de se connecter
        if (existingUser.email.toLowerCase() === input.email.toLowerCase()) {
          return rejectWithValue('Un compte existe déjà avec cet email. Veuillez vous connecter.');
        }
        
        // Si l'email est différent, c'est un nouvel utilisateur
        // Nettoyer les données de l'ancien utilisateur (projets, etc.)
        // Import dynamique pour éviter les dépendances circulaires
        const { databaseService } = await import('../../services/database');
        await databaseService.clearUserData(existingUser.id);
      }

      // Créer le nouvel utilisateur
      const user: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: input.email,
        nom: input.nom,
        prenom: input.prenom,
        provider: 'email',
        date_creation: new Date().toISOString(),
        derniere_connexion: new Date().toISOString(),
      };

      await saveUserToStorage(user);
      
      // Réinitialiser le projet actif pour le nouvel utilisateur
      dispatch(setProjetActif(null));
      
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de l\'inscription');
    }
  }
);

// Thunk pour la connexion avec email
export const signInWithEmail = createAsyncThunk(
  'auth/signInWithEmail',
  async (input: EmailSignInInput, { rejectWithValue }) => {
    try {
      // Vérifier si l'utilisateur existe dans le stockage
      const existingUser = await loadUserFromStorage();
      
      if (!existingUser) {
        return rejectWithValue('Aucun compte trouvé. Veuillez vous inscrire d\'abord.');
      }

      // Vérifier si l'email correspond
      if (existingUser.email.toLowerCase() !== input.email.toLowerCase()) {
        return rejectWithValue('Email incorrect. Veuillez vérifier votre adresse email.');
      }

      // Mettre à jour la dernière connexion
      const updatedUser: User = {
        ...existingUser,
        derniere_connexion: new Date().toISOString(),
      };

      await saveUserToStorage(updatedUser);
      return updatedUser;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la connexion');
    }
  }
);

// Thunk pour la connexion avec Google
export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      // TODO: Implémenter avec expo-auth-session
      // Pour l'instant, simulation
      const user: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: 'user@gmail.com',
        nom: 'Google',
        prenom: 'User',
        provider: 'google',
        photo: undefined,
        date_creation: new Date().toISOString(),
        derniere_connexion: new Date().toISOString(),
      };

      await saveUserToStorage(user);
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la connexion avec Google');
    }
  }
);

// Thunk pour la connexion avec Apple
export const signInWithApple = createAsyncThunk(
  'auth/signInWithApple',
  async (_, { rejectWithValue }) => {
    try {
      // TODO: Implémenter avec expo-apple-authentication
      // Pour l'instant, simulation
      const user: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: 'user@icloud.com',
        nom: 'Apple',
        prenom: 'User',
        provider: 'apple',
        photo: undefined,
        date_creation: new Date().toISOString(),
        derniere_connexion: new Date().toISOString(),
      };

      await saveUserToStorage(user);
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la connexion avec Apple');
    }
  }
);

// Thunk pour la déconnexion
export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { dispatch }) => {
    // Ne pas nettoyer les données lors de la déconnexion
    // pour permettre à l'utilisateur de se reconnecter plus tard
    await removeUserFromStorage();
    // Réinitialiser le projet actif lors de la déconnexion
    dispatch(setProjetActif(null));
    return null;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
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
      // signUpWithEmail
      .addCase(signUpWithEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUpWithEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(signUpWithEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // signInWithEmail
      .addCase(signInWithEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(signInWithEmail.rejected, (state, action) => {
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
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;

