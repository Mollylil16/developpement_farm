/**
 * Slice Redux pour la gestion de la reproduction
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  Gestation,
  Sevrage,
  CreateGestationInput,
  CreateSevrageInput,
} from '../../types';
import { databaseService } from '../../services/database';

interface ReproductionState {
  gestations: Gestation[];
  sevrages: Sevrage[];
  loading: boolean;
  error: string | null;
}

const initialState: ReproductionState = {
  gestations: [],
  sevrages: [],
  loading: false,
  error: null,
};

// Thunks pour Gestations
export const createGestation = createAsyncThunk(
  'reproduction/createGestation',
  async (input: CreateGestationInput, { rejectWithValue }) => {
    try {
      const gestation = await databaseService.createGestation({
        ...input,
        statut: 'en_cours',
      });
      return gestation;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création de la gestation');
    }
  }
);

export const loadGestations = createAsyncThunk(
  'reproduction/loadGestations',
  async (_, { rejectWithValue }) => {
    try {
      const gestations = await databaseService.getAllGestations();
      return gestations;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des gestations');
    }
  }
);

export const loadGestationsEnCours = createAsyncThunk(
  'reproduction/loadGestationsEnCours',
  async (_, { rejectWithValue }) => {
    try {
      const gestations = await databaseService.getGestationsEnCours();
      return gestations;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des gestations en cours');
    }
  }
);

export const updateGestation = createAsyncThunk(
  'reproduction/updateGestation',
  async ({ id, updates }: { id: string; updates: Partial<Gestation> }, { rejectWithValue }) => {
    try {
      const gestation = await databaseService.updateGestation(id, updates);
      return gestation;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la mise à jour de la gestation');
    }
  }
);

export const deleteGestation = createAsyncThunk(
  'reproduction/deleteGestation',
  async (id: string, { rejectWithValue }) => {
    try {
      await databaseService.deleteGestation(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la suppression de la gestation');
    }
  }
);

// Thunks pour Sevrages
export const createSevrage = createAsyncThunk(
  'reproduction/createSevrage',
  async (input: CreateSevrageInput, { rejectWithValue }) => {
    try {
      const sevrage = await databaseService.createSevrage(input);
      return sevrage;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création du sevrage');
    }
  }
);

export const loadSevrages = createAsyncThunk(
  'reproduction/loadSevrages',
  async (_, { rejectWithValue }) => {
    try {
      const sevrages = await databaseService.getAllSevrages();
      return sevrages;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des sevrages');
    }
  }
);

export const loadSevragesParGestation = createAsyncThunk(
  'reproduction/loadSevragesParGestation',
  async (gestationId: string, { rejectWithValue }) => {
    try {
      const sevrages = await databaseService.getSevragesParGestation(gestationId);
      return sevrages;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des sevrages');
    }
  }
);

export const deleteSevrage = createAsyncThunk(
  'reproduction/deleteSevrage',
  async (id: string, { rejectWithValue }) => {
    try {
      await databaseService.deleteSevrage(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la suppression du sevrage');
    }
  }
);

const reproductionSlice = createSlice({
  name: 'reproduction',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // createGestation
      .addCase(createGestation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGestation.fulfilled, (state, action) => {
        state.loading = false;
        state.gestations.unshift(action.payload);
      })
      .addCase(createGestation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadGestations
      .addCase(loadGestations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadGestations.fulfilled, (state, action) => {
        state.loading = false;
        state.gestations = action.payload;
      })
      .addCase(loadGestations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadGestationsEnCours
      .addCase(loadGestationsEnCours.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadGestationsEnCours.fulfilled, (state, action) => {
        state.loading = false;
        // On met à jour uniquement les gestations en cours, mais on garde les autres
        const enCoursIds = action.payload.map((g) => g.id);
        state.gestations = [
          ...action.payload,
          ...state.gestations.filter((g: Gestation) => !enCoursIds.includes(g.id) && g.statut === 'en_cours'),
        ];
      })
      .addCase(loadGestationsEnCours.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateGestation
      .addCase(updateGestation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateGestation.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.gestations.findIndex((g: Gestation) => g.id === action.payload.id);
        if (index !== -1) {
          state.gestations[index] = action.payload;
        }
      })
      .addCase(updateGestation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteGestation
      .addCase(deleteGestation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteGestation.fulfilled, (state, action) => {
        state.loading = false;
        state.gestations = state.gestations.filter((g: Gestation) => g.id !== action.payload);
      })
      .addCase(deleteGestation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createSevrage
      .addCase(createSevrage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSevrage.fulfilled, (state, action) => {
        state.loading = false;
        state.sevrages.unshift(action.payload);
      })
      .addCase(createSevrage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadSevrages
      .addCase(loadSevrages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadSevrages.fulfilled, (state, action) => {
        state.loading = false;
        state.sevrages = action.payload;
      })
      .addCase(loadSevrages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadSevragesParGestation
      .addCase(loadSevragesParGestation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadSevragesParGestation.fulfilled, (state, action) => {
        state.loading = false;
        // On remplace les sevrages pour cette gestation
        const autresSevrages = state.sevrages.filter(
          (s: Sevrage) => s.gestation_id !== action.meta.arg
        );
        state.sevrages = [...action.payload, ...autresSevrages];
      })
      .addCase(loadSevragesParGestation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteSevrage
      .addCase(deleteSevrage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSevrage.fulfilled, (state, action) => {
        state.loading = false;
        state.sevrages = state.sevrages.filter((s: Sevrage) => s.id !== action.payload);
      })
      .addCase(deleteSevrage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = reproductionSlice.actions;
export default reproductionSlice.reducer;

