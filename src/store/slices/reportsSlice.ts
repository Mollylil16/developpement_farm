/**
 * Slice Redux pour la gestion des rapports
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  RapportCroissance,
  CreateRapportCroissanceInput,
  IndicateursPerformance,
  Recommandation,
} from '../../types';
import { getDatabase } from '../../services/database';
import { RapportCroissanceRepository } from '../../database/repositories';

interface ReportsState {
  rapportsCroissance: RapportCroissance[];
  indicateursPerformance: IndicateursPerformance | null;
  recommandations: Recommandation[];
  loading: boolean;
  error: string | null;
}

const initialState: ReportsState = {
  rapportsCroissance: [],
  indicateursPerformance: null,
  recommandations: [],
  loading: false,
  error: null,
};

// Thunks pour Rapports de Croissance
export const createRapportCroissance = createAsyncThunk(
  'reports/createRapportCroissance',
  async (input: CreateRapportCroissanceInput, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const rapportRepo = new RapportCroissanceRepository(db);
      const rapport = await rapportRepo.create(input);
      return rapport;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création du rapport');
    }
  }
);

export const loadRapportsCroissance = createAsyncThunk(
  'reports/loadRapportsCroissance',
  async (_, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const rapportRepo = new RapportCroissanceRepository(db);
      const rapports = await rapportRepo.findAll();
      return rapports;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des rapports');
    }
  }
);

export const loadRapportsCroissanceParProjet = createAsyncThunk(
  'reports/loadRapportsCroissanceParProjet',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const rapportRepo = new RapportCroissanceRepository(db);
      const rapports = await rapportRepo.findByProjet(projetId);
      return rapports;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des rapports');
    }
  }
);

export const deleteRapportCroissance = createAsyncThunk(
  'reports/deleteRapportCroissance',
  async (id: string, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const rapportRepo = new RapportCroissanceRepository(db);
      await rapportRepo.delete(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la suppression du rapport');
    }
  }
);

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setIndicateursPerformance: (state, action: PayloadAction<IndicateursPerformance>) => {
      state.indicateursPerformance = action.payload;
    },
    setRecommandations: (state, action: PayloadAction<Recommandation[]>) => {
      state.recommandations = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // createRapportCroissance
      .addCase(createRapportCroissance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRapportCroissance.fulfilled, (state, action) => {
        state.loading = false;
        state.rapportsCroissance.unshift(action.payload);
      })
      .addCase(createRapportCroissance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadRapportsCroissance
      .addCase(loadRapportsCroissance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadRapportsCroissance.fulfilled, (state, action) => {
        state.loading = false;
        state.rapportsCroissance = action.payload;
      })
      .addCase(loadRapportsCroissance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadRapportsCroissanceParProjet
      .addCase(loadRapportsCroissanceParProjet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadRapportsCroissanceParProjet.fulfilled, (state, action) => {
        state.loading = false;
        state.rapportsCroissance = action.payload;
      })
      .addCase(loadRapportsCroissanceParProjet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteRapportCroissance
      .addCase(deleteRapportCroissance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteRapportCroissance.fulfilled, (state, action) => {
        state.loading = false;
        state.rapportsCroissance = state.rapportsCroissance.filter(
          (r: RapportCroissance) => r.id !== action.payload
        );
      })
      .addCase(deleteRapportCroissance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setIndicateursPerformance, setRecommandations } = reportsSlice.actions;
export default reportsSlice.reducer;
