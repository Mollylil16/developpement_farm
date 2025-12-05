/**
 * Slice Redux pour la gestion des mortalités
 * Utilise normalizr pour stocker les données de manière normalisée
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getErrorMessage } from '../../types/common';
import { normalize } from 'normalizr';
import {
  Mortalite,
  CreateMortaliteInput,
  UpdateMortaliteInput,
  StatistiquesMortalite,
} from '../../types';
import { getDatabase } from '../../services/database';
import { MortaliteRepository } from '../../database/repositories';
import { mortalitesSchema, mortaliteSchema } from '../normalization/schemas';

// Structure normalisée de l'état
interface NormalizedEntities {
  mortalites: Record<string, Mortalite>;
}

interface MortalitesState {
  entities: NormalizedEntities;
  ids: {
    mortalites: string[];
  };
  statistiques: StatistiquesMortalite | null;
  loading: boolean;
  error: string | null;
}

const initialState: MortalitesState = {
  entities: {
    mortalites: {},
  },
  ids: {
    mortalites: [],
  },
  statistiques: null,
  loading: false,
  error: null,
};

// Helpers pour normaliser
const normalizeMortalites = (mortalites: Mortalite[]) => normalize(mortalites, mortalitesSchema);
const normalizeMortalite = (mortalite: Mortalite) => normalize([mortalite], mortalitesSchema);

// Thunks pour Mortalités
export const createMortalite = createAsyncThunk(
  'mortalites/createMortalite',
  async (input: CreateMortaliteInput, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const mortaliteRepo = new MortaliteRepository(db);
      // Utiliser createWithAnimalUpdate pour inclure la logique de mise à jour des animaux
      const mortalite = await mortaliteRepo.createWithAnimalUpdate(input);
      return mortalite;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors de la création de la mortalité');
    }
  }
);

export const loadMortalites = createAsyncThunk(
  'mortalites/loadMortalites',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const mortaliteRepo = new MortaliteRepository(db);
      const mortalites = await mortaliteRepo.findByProjet(projetId);
      return mortalites;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors du chargement des mortalités');
    }
  }
);

export const loadMortalitesParProjet = createAsyncThunk(
  'mortalites/loadMortalitesParProjet',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const mortaliteRepo = new MortaliteRepository(db);
      const mortalites = await mortaliteRepo.findByProjet(projetId);
      return mortalites;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors du chargement des mortalités');
    }
  }
);

export const loadStatistiquesMortalite = createAsyncThunk(
  'mortalites/loadStatistiquesMortalite',
  async (projetId: string, { rejectWithValue }) => {
    try {
      console.log('🔄 [loadStatistiquesMortalite] Début du chargement pour projet:', projetId);
      const db = await getDatabase();
      const mortaliteRepo = new MortaliteRepository(db);
      const stats = await mortaliteRepo.getStatistiquesMortalite(projetId);
      console.log('✅ [loadStatistiquesMortalite] Stats retournées:', stats);
      return stats;
    } catch (error: unknown) {
      console.error('❌ Erreur chargement statistiques mortalité:', error);
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors du chargement des statistiques');
    }
  }
);

export const updateMortalite = createAsyncThunk(
  'mortalites/updateMortalite',
  async ({ id, updates }: { id: string; updates: UpdateMortaliteInput }, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const mortaliteRepo = new MortaliteRepository(db);
      const mortalite = await mortaliteRepo.update(id, updates);
      return mortalite;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors de la mise à jour de la mortalité');
    }
  }
);

export const deleteMortalite = createAsyncThunk(
  'mortalites/deleteMortalite',
  async (id: string, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const mortaliteRepo = new MortaliteRepository(db);
      await mortaliteRepo.delete(id);
      return id;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors de la suppression de la mortalité');
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
      .addCase(createMortalite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMortalite.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeMortalite(action.payload);
        state.entities.mortalites = {
          ...state.entities.mortalites,
          ...normalized.entities.mortalites,
        };
        state.ids.mortalites = [normalized.result[0], ...state.ids.mortalites];
      })
      .addCase(createMortalite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadMortalites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadMortalites.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeMortalites(action.payload);
        state.entities.mortalites = {
          ...state.entities.mortalites,
          ...normalized.entities.mortalites,
        };
        state.ids.mortalites = normalized.result;
      })
      .addCase(loadMortalites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadMortalitesParProjet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadMortalitesParProjet.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeMortalites(action.payload);
        state.entities.mortalites = {
          ...state.entities.mortalites,
          ...normalized.entities.mortalites,
        };
        state.ids.mortalites = normalized.result;
      })
      .addCase(loadMortalitesParProjet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadStatistiquesMortalite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadStatistiquesMortalite.fulfilled, (state, action) => {
        state.loading = false;
        state.statistiques = action.payload;
        console.log('📊 [mortalitesSlice] Statistiques chargées:', action.payload);
      })
      .addCase(loadStatistiquesMortalite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateMortalite.fulfilled, (state, action) => {
        const normalized = normalizeMortalite(action.payload);
        state.entities.mortalites = {
          ...state.entities.mortalites,
          ...normalized.entities.mortalites,
        };
      })
      .addCase(updateMortalite.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteMortalite.fulfilled, (state, action) => {
        const mortaliteId = action.payload;
        state.ids.mortalites = state.ids.mortalites.filter((id) => id !== mortaliteId);
        delete state.entities.mortalites[mortaliteId];
      })
      .addCase(deleteMortalite.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = mortalitesSlice.actions;
export default mortalitesSlice.reducer;
