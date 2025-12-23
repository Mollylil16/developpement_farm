/**
 * Slice Redux pour la gestion des projets
 * Utilise maintenant l'API backend au lieu de SQLite
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Projet, CreateProjetInput } from '../../types';
import { getErrorMessage } from '../../types/common';
import apiClient from '../../services/api/apiClient';

interface ProjetState {
  projetActif: Projet | null;
  projets: Projet[];
  loading: boolean;
  error: string | null;
}

const initialState: ProjetState = {
  projetActif: null,
  projets: [],
  loading: false,
  error: null,
};

// Thunks asynchrones
export const createProjet = createAsyncThunk(
  'projet/create',
  async (input: CreateProjetInput, { rejectWithValue }) => {
    try {
      // Le backend récupère automatiquement proprietaire_id depuis le JWT
      // On ne doit PAS l'envoyer dans le body
      const projet = await apiClient.post<Projet>('/projets', input);
      return projet;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors de la création du projet');
    }
  }
);

export const loadProjets = createAsyncThunk('projet/loadAll', async (_, { rejectWithValue }) => {
  try {
    // Le backend filtre automatiquement par utilisateur connecté
    const projets = await apiClient.get<Projet[]>('/projets');
    return projets;
  } catch (error: unknown) {
    return rejectWithValue(getErrorMessage(error) || 'Erreur lors du chargement des projets');
  }
});

export const loadProjetActif = createAsyncThunk(
  'projet/loadActif',
  async (_, { rejectWithValue }) => {
    try {
      // Le backend retourne le projet actif de l'utilisateur connecté
      const projet = await apiClient.get<Projet | null>('/projets/actif');
      return projet;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors du chargement du projet actif');
    }
  }
);

export const switchProjetActif = createAsyncThunk(
  'projet/switchActif',
  async (projetId: string, { rejectWithValue }) => {
    try {
      // Le backend gère automatiquement l'archivage des autres projets et la vérification de propriété
      const nouveauProjet = await apiClient.patch<Projet>(`/projets/${projetId}/activer`, {});
      return nouveauProjet;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors du changement de projet');
    }
  }
);

export const updateProjet = createAsyncThunk(
  'projet/update',
  async ({ id, updates }: { id: string; updates: Partial<Projet> }, { rejectWithValue }) => {
    try {
      // Le backend vérifie automatiquement que le projet appartient à l'utilisateur connecté
      const projet = await apiClient.patch<Projet>(`/projets/${id}`, updates);
      return projet;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors de la mise à jour du projet');
    }
  }
);

const projetSlice = createSlice({
  name: 'projet',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setProjetActif: (state, action: PayloadAction<Projet | null>) => {
      state.projetActif = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // createProjet
      .addCase(createProjet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProjet.fulfilled, (state, action) => {
        state.loading = false;
        state.projetActif = action.payload;
        state.projets.unshift(action.payload);
      })
      .addCase(createProjet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadProjets
      .addCase(loadProjets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProjets.fulfilled, (state, action) => {
        state.loading = false;
        state.projets = action.payload;
      })
      .addCase(loadProjets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadProjetActif
      .addCase(loadProjetActif.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProjetActif.fulfilled, (state, action) => {
        state.loading = false;
        state.projetActif = action.payload;
      })
      .addCase(loadProjetActif.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateProjet
      .addCase(updateProjet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProjet.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.projets.findIndex((p: Projet) => p.id === action.payload.id);
        if (index !== -1) {
          state.projets[index] = action.payload;
        }
        if (state.projetActif?.id === action.payload.id) {
          state.projetActif = action.payload;
        }
      })
      .addCase(updateProjet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // switchProjetActif
      .addCase(switchProjetActif.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(switchProjetActif.fulfilled, (state, action) => {
        state.loading = false;
        state.projetActif = action.payload;
        // Mettre à jour le statut dans la liste des projets
        state.projets = state.projets.map((p: Projet) => ({
          ...p,
          statut: p.id === action.payload.id ? 'actif' : 'archive',
        }));
      })
      .addCase(switchProjetActif.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setProjetActif } = projetSlice.actions;
export default projetSlice.reducer;
