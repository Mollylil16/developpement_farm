/**
 * Slice Redux pour la gestion du module Production
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  ProductionAnimal,
  CreateProductionAnimalInput,
  UpdateProductionAnimalInput,
  ProductionPesee,
  CreatePeseeInput,
} from '../../types';
import { databaseService } from '../../services/database';

interface ProductionState {
  animaux: ProductionAnimal[];
  peseesParAnimal: Record<string, ProductionPesee[]>;
  peseesRecents: ProductionPesee[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductionState = {
  animaux: [],
  peseesParAnimal: {},
  peseesRecents: [],
  loading: false,
  error: null,
};

export const loadProductionAnimaux = createAsyncThunk(
  'production/loadAnimaux',
  async ({ projetId, inclureInactifs = true }: { projetId: string; inclureInactifs?: boolean }, { rejectWithValue }) => {
    try {
      const animaux = await databaseService.getProductionAnimaux(projetId, inclureInactifs);
      return animaux;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des animaux');
    }
  }
);

export const createProductionAnimal = createAsyncThunk(
  'production/createAnimal',
  async (input: CreateProductionAnimalInput, { rejectWithValue }) => {
    try {
      const animal = await databaseService.createProductionAnimal(input);
      return animal;
    } catch (error: any) {
      return rejectWithValue(error.message || "Erreur lors de la création de l'animal");
    }
  }
);

export const updateProductionAnimal = createAsyncThunk(
  'production/updateAnimal',
  async ({ id, updates }: { id: string; updates: UpdateProductionAnimalInput }, { rejectWithValue }) => {
    try {
      const animal = await databaseService.updateProductionAnimal(id, updates);
      return animal;
    } catch (error: any) {
      return rejectWithValue(error.message || "Erreur lors de la mise à jour de l'animal");
    }
  }
);

export const deleteProductionAnimal = createAsyncThunk(
  'production/deleteAnimal',
  async (id: string, { rejectWithValue }) => {
    try {
      await databaseService.deleteProductionAnimal(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || "Erreur lors de la suppression de l'animal");
    }
  }
);

export const createPesee = createAsyncThunk(
  'production/createPesee',
  async (input: CreatePeseeInput, { rejectWithValue }) => {
    try {
      const pesee = await databaseService.createPesee(input);
      return pesee;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création de la pesée');
    }
  }
);

export const loadPeseesParAnimal = createAsyncThunk(
  'production/loadPeseesParAnimal',
  async (animalId: string, { rejectWithValue }) => {
    try {
      const pesees = await databaseService.getPeseesParAnimal(animalId);
      return { animalId, pesees };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des pesées');
    }
  }
);

export const loadPeseesRecents = createAsyncThunk(
  'production/loadPeseesRecents',
  async ({ projetId, limit = 20 }: { projetId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const pesees = await databaseService.getPeseesRecents(projetId, limit);
      return pesees;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des pesées récentes');
    }
  }
);

const productionSlice = createSlice({
  name: 'production',
  initialState,
  reducers: {
    clearProductionError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProductionAnimaux.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProductionAnimaux.fulfilled, (state, action) => {
        state.loading = false;
        state.animaux = action.payload;
      })
      .addCase(loadProductionAnimaux.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createProductionAnimal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProductionAnimal.fulfilled, (state, action) => {
        state.loading = false;
        state.animaux.unshift(action.payload);
      })
      .addCase(createProductionAnimal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateProductionAnimal.fulfilled, (state, action) => {
        const index = state.animaux.findIndex((a) => a.id === action.payload.id);
        if (index !== -1) {
          state.animaux[index] = action.payload;
        }
      })
      .addCase(updateProductionAnimal.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteProductionAnimal.fulfilled, (state, action) => {
        state.animaux = state.animaux.filter((a) => a.id !== action.payload);
        delete state.peseesParAnimal[action.payload];
      })
      .addCase(deleteProductionAnimal.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(createPesee.fulfilled, (state, action) => {
        const pesee = action.payload;
        const list = state.peseesParAnimal[pesee.animal_id] || [];
        state.peseesParAnimal[pesee.animal_id] = [pesee, ...list];
        state.peseesRecents = [pesee, ...state.peseesRecents].slice(0, 20);
      })
      .addCase(createPesee.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(loadPeseesParAnimal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadPeseesParAnimal.fulfilled, (state, action) => {
        state.loading = false;
        state.peseesParAnimal[action.payload.animalId] = action.payload.pesees;
      })
      .addCase(loadPeseesParAnimal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadPeseesRecents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadPeseesRecents.fulfilled, (state, action) => {
        state.loading = false;
        state.peseesRecents = action.payload;
      })
      .addCase(loadPeseesRecents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearProductionError } = productionSlice.actions;
export default productionSlice.reducer;

