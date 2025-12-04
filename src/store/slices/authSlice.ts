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
    console.error("Erreur lors de la sauvegarde de l'utilisateur:", error);
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
    console.error("Erreur lors du chargement de l'utilisateur:", error);
    return null;
  }
};

// Fonction pour supprimer l'utilisateur du stockage
const removeUserFromStorage = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
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
  // D'abord essayer AsyncStorage (pour compatibilité)
  const storedUser = await loadUserFromStorage();

  if (storedUser) {
    // Vérifier si l'utilisateur existe toujours dans la base de données
    try {
      const { getDatabase } = await import('../../services/database');
      const { UserRepository } = await import('../../database/repositories');
      const db = await getDatabase();
      const userRepo = new UserRepository(db);
      const dbUser = await userRepo.findById(storedUser.id);

      if (dbUser) {
        // Utilisateur trouvé dans la DB
        // Vérifier si l'utilisateur est un collaborateur et le lier si nécessaire
        if (dbUser.email) {
          try {
            const { getDatabase } = await import('../../services/database');
            const { CollaborateurRepository } = await import('../../database/repositories');
            const db = await getDatabase();
            const collaborateurRepo = new CollaborateurRepository(db);
            await collaborateurRepo.lierCollaborateurAUtilisateur(dbUser.id, dbUser.email);
          } catch (error: any) {
            // Ne pas bloquer le chargement si la liaison échoue
            console.warn(
              'Avertissement lors de la liaison du collaborateur au démarrage:',
              error?.message || error
            );
          }
        }

        return dbUser;
      } else {
        // ⚠️ Utilisateur introuvable dans la DB
        // Avec les migrations corrigées, cela ne devrait plus arriver
        // Si cela arrive, c'est un problème grave
        console.error('❌ Utilisateur absent de la base de données:', storedUser.id);
        console.error('→ Les migrations n\'ont pas préservé les données correctement');
        console.error('→ Déconnexion de l\'utilisateur pour réauthentification');
        
        await removeUserFromStorage();
        return null;
      }
    } catch (error) {
      // En cas d'erreur lors de la vérification DB
      console.error('❌ Erreur lors du chargement de l\'utilisateur depuis la DB:', error);
      await removeUserFromStorage();
      return null;
    }
  }

  return null;
});

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
          return rejectWithValue("Format d'email invalide");
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
      const { getDatabase } = await import('../../services/database');
      const { UserRepository } = await import('../../database/repositories');
      const db = await getDatabase();
      const userRepo = new UserRepository(db);

      // Créer l'utilisateur dans la base de données
      const user = await userRepo.create({
        email: input.email?.trim(),
        telephone: input.telephone?.replace(/\s+/g, ''),
        nom: input.nom.trim(),
        prenom: input.prenom.trim(),
        provider: input.telephone ? 'telephone' : 'email',
      });

      // Vérifier si l'utilisateur est un collaborateur et le lier
      // On vérifie seulement si l'utilisateur a un email (pas de téléphone pour les collaborateurs)
      if (user.email) {
        try {
          // Chercher un collaborateur avec cet email et le lier
          const { getDatabase } = await import('../../services/database');
          const { CollaborateurRepository } = await import('../../database/repositories');
          const db = await getDatabase();
          const collaborateurRepo = new CollaborateurRepository(db);
          const collaborateur = await collaborateurRepo.lierCollaborateurAUtilisateur(
            user.id,
            user.email
          );

          if (collaborateur) {
            console.log(
              "✅ Collaborateur lié à l'utilisateur lors de l'inscription:",
              collaborateur.id
            );
            // Le projet sera chargé automatiquement dans loadProjetActif
          }
        } catch (error: any) {
          // Ne pas bloquer l'inscription si la liaison échoue
          console.warn(
            "Avertissement lors de la liaison du collaborateur à l'inscription:",
            error?.message || error
          );
        }
      }

      // Sauvegarder aussi dans AsyncStorage pour compatibilité
      await saveUserToStorage(user);

      // Réinitialiser le projet actif pour le nouvel utilisateur
      // (sera rechargé automatiquement si c'est un collaborateur)
      dispatch(setProjetActif(null));

      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || "Erreur lors de l'inscription");
    }
  }
);

// Thunk pour la connexion
export const signIn = createAsyncThunk(
  'auth/signIn',
  async (input: SignInInput, { rejectWithValue, dispatch }) => {
    try {
      // Validation
      if (!input.identifier || !input.identifier.trim()) {
        return rejectWithValue('Veuillez entrer votre email ou numéro de téléphone');
      }

      // Import dynamique pour éviter les dépendances circulaires
      const { getDatabase } = await import('../../services/database');
      const { UserRepository } = await import('../../database/repositories');
      const db = await getDatabase();
      const userRepo = new UserRepository(db);

      // Se connecter avec email ou téléphone (sans mot de passe)
      const user = await userRepo.findByIdentifier(input.identifier.trim());
      if (user) {
        await userRepo.updateLastConnection(user.id);
      }

      if (!user) {
        return rejectWithValue(
          'Aucun compte trouvé avec cet email ou ce numéro. Veuillez vous inscrire.'
        );
      }

      // Vérifier si l'utilisateur est un collaborateur et le lier
      // On vérifie seulement si l'utilisateur a un email (pas de téléphone pour les collaborateurs)
      if (user && user.email) {
        try {
          // Chercher un collaborateur avec cet email et le lier
          const { getDatabase } = await import('../../services/database');
          const { CollaborateurRepository } = await import('../../database/repositories');
          const db = await getDatabase();
          const collaborateurRepo = new CollaborateurRepository(db);
          const collaborateur = await collaborateurRepo.lierCollaborateurAUtilisateur(
            user.id,
            user.email
          );

          if (collaborateur) {
            console.log("✅ Collaborateur lié à l'utilisateur:", collaborateur.id);
            // Le projet sera chargé automatiquement dans loadProjetActif
          }
        } catch (error: any) {
          // Ne pas bloquer la connexion si la liaison échoue
          console.warn(
            'Avertissement lors de la liaison du collaborateur:',
            error?.message || error
          );
        }
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
      const { getDatabase } = await import('../../services/database');
      const { UserRepository } = await import('../../database/repositories');
      const db = await getDatabase();
      const userRepo = new UserRepository(db);

      // TODO: Implémenter avec expo-auth-session
      // Pour l'instant, simulation
      const googleEmail = 'user@gmail.com';
      
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await userRepo.findByEmail(googleEmail);
      
      if (existingUser) {
        // Utilisateur existe, le connecter
        await userRepo.updateLastConnection(existingUser.id);
        await saveUserToStorage(existingUser);
        return existingUser;
      }
      
      // Nouvel utilisateur, le créer dans la base
      const user = await userRepo.create({
        email: googleEmail,
        nom: 'Google',
        prenom: 'User',
        provider: 'google',
      });

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
      const { getDatabase } = await import('../../services/database');
      const { UserRepository } = await import('../../database/repositories');
      const db = await getDatabase();
      const userRepo = new UserRepository(db);

      // TODO: Implémenter avec expo-apple-authentication
      // Pour l'instant, simulation
      const appleEmail = 'user@icloud.com';
      
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await userRepo.findByEmail(appleEmail);
      
      if (existingUser) {
        // Utilisateur existe, le connecter
        await userRepo.updateLastConnection(existingUser.id);
        await saveUserToStorage(existingUser);
        return existingUser;
      }
      
      // Nouvel utilisateur, le créer dans la base
      const user = await userRepo.create({
        email: appleEmail,
        nom: 'Apple',
        prenom: 'User',
        provider: 'apple',
      });

      await saveUserToStorage(user);
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la connexion avec Apple');
    }
  }
);

// Thunk pour la déconnexion
export const signOut = createAsyncThunk('auth/signOut', async (_, { dispatch }) => {
  // Ne pas nettoyer les données lors de la déconnexion
  // pour permettre à l'utilisateur de se reconnecter plus tard
  await removeUserFromStorage();
  // Réinitialiser le projet actif lors de la déconnexion
  dispatch(setProjetActif(null));
  return null;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      // Sauvegarder aussi dans AsyncStorage
      saveUserToStorage(action.payload).catch((error) => {
        console.error('Erreur lors de la sauvegarde de l\'utilisateur:', error);
      });
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

export const { clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
