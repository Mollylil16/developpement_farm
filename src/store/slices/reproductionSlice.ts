import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Gestation, Sevrage } from '../../types';
import { DatabaseService } from '../../services/database';

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
