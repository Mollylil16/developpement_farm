import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Porc } from '../../types';
import { DatabaseService } from '../../services/database';

interface PorcsState {
  porcs: Porc[];
  loading: boolean;
  error?: string;
}

const initialState: PorcsState = {
  porcs: [],
  loading: false,
};

// Actions asynchrones
export const loadPorcs = createAsyncThunk(
  'porcs/loadPorcs',
  async (_, { rejectWithValue }) => {
    try {
      const db = DatabaseService.getInstance();
      const porcs = await db.getAllPorcs();
      return porcs;
    } catch (error) {
      return rejectWithValue('Erreur lors du chargement des porcs');
    }
  }
);

export const savePorc = createAsyncThunk(
  'porcs/savePorc',
  async (porc: Porc, { rejectWithValue }) => {
    try {
      const db = DatabaseService.getInstance();
      await db.savePorc(porc);
      return porc;
    } catch (error) {
      return rejectWithValue('Erreur lors de la sauvegarde du porc');
    }
  }
);

export const deletePorcAsync = createAsyncThunk(
  'porcs/deletePorcAsync',
  async (porcId: string, { rejectWithValue }) => {
    try {
      // Ici vous pourriez ajouter une méthode deletePorc dans DatabaseService
      return porcId;
    } catch (error) {
      return rejectWithValue('Erreur lors de la suppression du porc');
    }
  }
);

const porcsSlice = createSlice({
  name: 'porcs',
  initialState,
  reducers: {
    addPorc: (state, action: PayloadAction<Porc>) => {
      state.porcs.push(action.payload);
    },
    updatePorc: (state, action: PayloadAction<Porc>) => {
      const index = state.porcs.findIndex(porc => porc.id === action.payload.id);
      if (index !== -1) {
        state.porcs[index] = action.payload;
      }
    },
    deletePorc: (state, action: PayloadAction<string>) => {
      state.porcs = state.porcs.filter(porc => porc.id !== action.payload);
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
      // Load Porcs
      .addCase(loadPorcs.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(loadPorcs.fulfilled, (state, action) => {
        state.loading = false;
        state.porcs = action.payload;
      })
      .addCase(loadPorcs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Save Porc
      .addCase(savePorc.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(savePorc.fulfilled, (state, action) => {
        state.loading = false;
        const existingIndex = state.porcs.findIndex(p => p.id === action.payload.id);
        if (existingIndex !== -1) {
          state.porcs[existingIndex] = action.payload;
        } else {
          state.porcs.push(action.payload);
        }
      })
      .addCase(savePorc.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete Porc
      .addCase(deletePorcAsync.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(deletePorcAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.porcs = state.porcs.filter(porc => porc.id !== action.payload);
      })
      .addCase(deletePorcAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  addPorc, 
  updatePorc, 
  deletePorc, 
  setLoading, 
  setError,
  clearError
} = porcsSlice.actions;
export default porcsSlice.reducer;
