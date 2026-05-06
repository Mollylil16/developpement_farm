import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { Gestation, Sevrage, CreateSevrageInput } from '../../types/reproduction';
import { DatabaseService } from '../../services/database';
import apiClient from '../../services/api/apiClient';
import { createLoggerWithPrefix } from '../../utils/logger';

const logger = createLoggerWithPrefix('ReproductionSlice');

interface ReproductionState {
  gestations: Gestation[];
  sevrages: Sevrage[];
  loading: boolean;
  error?: string;
}

const initialState: ReproductionState = {
  gestations: [],
  sevrages: [],
  loading: false,
};

// Actions asynchrones
export const loadGestations = createAsyncThunk(
  'reproduction/loadGestations',
  async (_, { rejectWithValue }) => {
    try {
      const db = DatabaseService.getInstance();
      const gestations = await db.getAllGestations();
      return gestations;
    } catch (error) {
      return rejectWithValue('Erreur lors du chargement des gestations');
    }
  }
);

export const loadSevrages = createAsyncThunk(
  'reproduction/loadSevrages',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const sevrages = await apiClient.get<Sevrage[]>('/reproduction/sevrages', {
        params: { projet_id: projetId },
      });
      return sevrages;
    } catch (error) {
      logger.error('[loadSevrages]', error);
      return rejectWithValue('Erreur lors du chargement des sevrages');
    }
  }
);

export const createSevrage = createAsyncThunk(
  'reproduction/createSevrage',
  async (input: CreateSevrageInput, { rejectWithValue }) => {
    try {
      const sevrage = await apiClient.post<Sevrage>('/reproduction/sevrages', input);
      return sevrage;
    } catch (error) {
      logger.error('[createSevrage]', error);
      return rejectWithValue('Erreur lors de la création du sevrage');
    }
  }
);

export const deleteSevrage = createAsyncThunk(
  'reproduction/deleteSevrage',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/reproduction/sevrages/${id}`);
      return id;
    } catch (error) {
      logger.error('[deleteSevrage]', error);
      return rejectWithValue('Erreur lors de la suppression du sevrage');
    }
  }
);

export const saveGestation = createAsyncThunk(
  'reproduction/saveGestation',
  async (gestation: Gestation, { rejectWithValue }) => {
    try {
      const db = DatabaseService.getInstance();
      await db.saveGestation(gestation);
      return gestation;
    } catch (error) {
      return rejectWithValue('Erreur lors de la sauvegarde de la gestation');
    }
  }
);

const reproductionSlice = createSlice({
  name: 'reproduction',
  initialState,
  reducers: {
    addGestation: (state, action: PayloadAction<Gestation>) => {
      state.gestations.push(action.payload);
    },
    updateGestation: (state, action: PayloadAction<Gestation>) => {
      const index = state.gestations.findIndex(g => g.id === action.payload.id);
      if (index !== -1) {
        state.gestations[index] = action.payload;
      }
    },
    addSevrage: (state, action: PayloadAction<Sevrage>) => {
      state.sevrages.push(action.payload);
    },
    updateSevrage: (state, action: PayloadAction<Sevrage>) => {
      const index = state.sevrages.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.sevrages[index] = action.payload;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load Gestations
      .addCase(loadGestations.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(loadGestations.fulfilled, (state, action) => {
        state.loading = false;
        state.gestations = action.payload;
      })
      .addCase(loadGestations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Load Sevrages
      .addCase(loadSevrages.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(loadSevrages.fulfilled, (state, action) => {
        state.loading = false;
        state.sevrages = action.payload;
      })
      .addCase(loadSevrages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create Sevrage
      .addCase(createSevrage.fulfilled, (state, action) => {
        state.sevrages.push(action.payload);
      })
      .addCase(createSevrage.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Delete Sevrage
      .addCase(deleteSevrage.fulfilled, (state, action) => {
        state.sevrages = state.sevrages.filter(s => s.id !== action.payload);
      })
      .addCase(deleteSevrage.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Save Gestation
      .addCase(saveGestation.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(saveGestation.fulfilled, (state, action) => {
        state.loading = false;
        const existingIndex = state.gestations.findIndex(g => g.id === action.payload.id);
        if (existingIndex !== -1) {
          state.gestations[existingIndex] = action.payload;
        } else {
          state.gestations.push(action.payload);
        }
      })
      .addCase(saveGestation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  addGestation, 
  updateGestation, 
  addSevrage, 
  updateSevrage, 
  setLoading, 
  setError,
  clearError
} = reproductionSlice.actions;
export default reproductionSlice.reducer;
