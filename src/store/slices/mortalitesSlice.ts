/**
 * Slice Redux pour la gestion des mortalités
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Mortalite, CreateMortaliteInput, UpdateMortaliteInput, StatistiquesMortalite } from '../../types';
import { databaseService } from '../../services/database';

interface MortalitesState {
  mortalites: Mortalite[];
  statistiques: StatistiquesMortalite | null;
  loading: boolean;
  error: string | null;
}

const initialState: MortalitesState = {
  mortalites: [],
  statistiques: null,
  loading: false,
  error: null,
};

// Thunks pour Mortalités
export const createMortalite = createAsyncThunk(
  'mortalites/createMortalite',
  async (input: CreateMortaliteInput, { rejectWithValue }) => {
    try {
      const mortalite = await databaseService.createMortalite(input);
      return mortalite;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création de la mortalité');
    }
  }
);

export const loadMortalites = createAsyncThunk(
  'mortalites/loadMortalites',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const mortalites = await databaseService.getAllMortalites(projetId);
      return mortalites;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des mortalités');
    }
  }
);

export const loadMortalitesParProjet = createAsyncThunk(
  'mortalites/loadMortalitesParProjet',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const mortalites = await databaseService.getMortalitesParProjet(projetId);
      return mortalites;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des mortalités');
    }
  }
);

export const loadStatistiquesMortalite = createAsyncThunk(
  'mortalites/loadStatistiquesMortalite',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const statistiques = await databaseService.getStatistiquesMortalite(projetId);
      return statistiques;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des statistiques');
    }
  }
);

export const updateMortalite = createAsyncThunk(
  'mortalites/updateMortalite',
  async ({ id, updates }: { id: string; updates: UpdateMortaliteInput }, { rejectWithValue }) => {
    try {
      const mortalite = await databaseService.updateMortalite(id, updates);
      return mortalite;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la mise à jour de la mortalité');
    }
  }
);

export const deleteMortalite = createAsyncThunk(
  'mortalites/deleteMortalite',
  async (id: string, { rejectWithValue }) => {
    try {
      await databaseService.deleteMortalite(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la suppression de la mortalité');
    }
  }
);

const mortalitesSlice = createSlice({
  name: 'mortalites',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // createMortalite
      .addCase(createMortalite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMortalite.fulfilled, (state, action) => {
        state.loading = false;
        state.mortalites.unshift(action.payload);
      })
      .addCase(createMortalite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadMortalites
      .addCase(loadMortalites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadMortalites.fulfilled, (state, action) => {
        state.loading = false;
        state.mortalites = action.payload;
      })
      .addCase(loadMortalites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadMortalitesParProjet
      .addCase(loadMortalitesParProjet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadMortalitesParProjet.fulfilled, (state, action) => {
        state.loading = false;
        state.mortalites = action.payload;
      })
      .addCase(loadMortalitesParProjet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadStatistiquesMortalite
      .addCase(loadStatistiquesMortalite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadStatistiquesMortalite.fulfilled, (state, action) => {
        state.loading = false;
        state.statistiques = action.payload;
      })
      .addCase(loadStatistiquesMortalite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateMortalite
      .addCase(updateMortalite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMortalite.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.mortalites.findIndex((m: Mortalite) => m.id === action.payload.id);
        if (index !== -1) {
          state.mortalites[index] = action.payload;
        }
      })
      .addCase(updateMortalite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteMortalite
      .addCase(deleteMortalite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMortalite.fulfilled, (state, action) => {
        state.loading = false;
        state.mortalites = state.mortalites.filter((m: Mortalite) => m.id !== action.payload);
      })
      .addCase(deleteMortalite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = mortalitesSlice.actions;
export default mortalitesSlice.reducer;

