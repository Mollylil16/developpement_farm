/**
 * Slice Redux pour la gestion des projets
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Projet, CreateProjetInput } from '../../types';
import { databaseService } from '../../services/database';

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
  async (input: CreateProjetInput & { proprietaire_id: string }, { rejectWithValue }) => {
    try {
      const projet = await databaseService.createProjet({
        ...input,
        statut: 'actif',
      });
      return projet;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création du projet');
    }
  }
);

export const loadProjets = createAsyncThunk(
  'projet/loadAll',
  async (_, { rejectWithValue }) => {
    try {
      const projets = await databaseService.getAllProjets();
      return projets;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des projets');
    }
  }
);

export const loadProjetActif = createAsyncThunk(
  'projet/loadActif',
  async (_, { rejectWithValue }) => {
    try {
      const projet = await databaseService.getProjetActif();
      return projet;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement du projet actif');
    }
  }
);

export const switchProjetActif = createAsyncThunk(
  'projet/switchActif',
  async (projetId: string, { rejectWithValue }) => {
    try {
      // Marquer tous les projets comme non actifs
      const projets = await databaseService.getAllProjets();
      for (const projet of projets) {
        if (projet.statut === 'actif' && projet.id !== projetId) {
          await databaseService.updateProjet(projet.id, { statut: 'archive' });
        }
      }
      // Activer le nouveau projet
      const nouveauProjet = await databaseService.updateProjet(projetId, { statut: 'actif' });
      return nouveauProjet;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du changement de projet');
    }
  }
);

export const updateProjet = createAsyncThunk(
  'projet/update',
  async ({ id, updates }: { id: string; updates: Partial<Projet> }, { rejectWithValue }) => {
    try {
      const projet = await databaseService.updateProjet(id, updates);
      return projet;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la mise à jour du projet');
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

