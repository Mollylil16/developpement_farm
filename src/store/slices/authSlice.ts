/**
 * Slice Redux pour l'authentification
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthState, SignUpInput, SignInInput, AuthProvider } from '../../types';
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
    // D'abord essayer AsyncStorage (pour compatibilité)
    const storedUser = await loadUserFromStorage();
    
    if (storedUser) {
      // Vérifier si l'utilisateur existe toujours dans la base de données
      try {
        const { databaseService } = await import('../../services/database');
        const dbUser = await databaseService.getUserById(storedUser.id);
        // Si trouvé dans la DB, utiliser celui de la DB (plus à jour)
        return dbUser;
      } catch (error) {
        // Si pas trouvé dans la DB, utiliser celui d'AsyncStorage
        return storedUser;
      }
    }
    
    return null;
  }
);

// Thunk pour l'inscription
export const signUp = createAsyncThunk(
  'auth/signUp',
  async (input: SignUpInput, { rejectWithValue, dispatch }) => {
    try {
      // Validation : au moins email ou téléphone
      if (!input.email && !input.telephone) {
        return rejectWithValue('Veuillez renseigner un email ou un numéro de téléphone');
      }

      // Validation du format email si fourni
      if (input.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.email.trim())) {
          return rejectWithValue('Format d\'email invalide');
        }
      }

      // Validation du format téléphone si fourni (au moins 8 chiffres)
      if (input.telephone) {
        const phoneRegex = /^[0-9]{8,15}$/;
        const cleanPhone = input.telephone.replace(/\s+/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          return rejectWithValue('Format de numéro de téléphone invalide (8-15 chiffres)');
        }
      }

      // Import dynamique pour éviter les dépendances circulaires
      const { databaseService } = await import('../../services/database');

      // Créer l'utilisateur dans la base de données
      const user = await databaseService.createUser({
        email: input.email?.trim(),
        telephone: input.telephone?.replace(/\s+/g, ''),
        nom: input.nom.trim(),
        prenom: input.prenom.trim(),
        provider: input.telephone ? 'telephone' : 'email',
      });

      // Sauvegarder aussi dans AsyncStorage pour compatibilité
      await saveUserToStorage(user);
      
      // Réinitialiser le projet actif pour le nouvel utilisateur
      dispatch(setProjetActif(null));
      
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de l\'inscription');
    }
  }
);

// Thunk pour la connexion
export const signIn = createAsyncThunk(
  'auth/signIn',
  async (input: SignInInput, { rejectWithValue }) => {
    try {
      // Validation
      if (!input.identifier || !input.identifier.trim()) {
        return rejectWithValue('Veuillez entrer votre email ou numéro de téléphone');
      }

      // Import dynamique pour éviter les dépendances circulaires
      const { databaseService } = await import('../../services/database');

      // Se connecter avec email ou téléphone (sans mot de passe)
      const user = await databaseService.loginUser(input.identifier.trim());
      
      if (!user) {
        return rejectWithValue('Aucun compte trouvé avec cet email ou ce numéro. Veuillez vous inscrire.');
      }

      // Sauvegarder aussi dans AsyncStorage pour compatibilité
      await saveUserToStorage(user);
      
      return user;
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
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;

