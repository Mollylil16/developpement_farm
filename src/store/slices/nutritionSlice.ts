import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  Ration,
  Ingredient,
  CreateIngredientInput,
  UpdateIngredientInput,
  RationBudget,
  CreateRationBudgetInput,
  UpdateRationBudgetInput,
} from '../../types/nutrition';
import apiClient from '../../services/api/apiClient';
import { createLoggerWithPrefix } from '../../utils/logger';

const logger = createLoggerWithPrefix('NutritionSlice');

interface NutritionState {
  rations: Ration[];
  ingredients: Ingredient[];
  rationsBudget: RationBudget[];
  loading: boolean;
  error?: string;
}

const initialState: NutritionState = {
  rations: [],
  ingredients: [],
  rationsBudget: [],
  loading: false,
};

// ─── Ingredient Thunks ────────────────────────────────────────────────────

export const loadIngredients = createAsyncThunk(
  'nutrition/loadIngredients',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const data = await apiClient.get<Ingredient[]>('/nutrition/ingredients', {
        params: { projet_id: projetId },
      });
      return data;
    } catch (error) {
      logger.error('[loadIngredients]', error);
      return rejectWithValue('Erreur lors du chargement des ingrédients');
    }
  }
);

export const createIngredient = createAsyncThunk(
  'nutrition/createIngredient',
  async (input: CreateIngredientInput, { rejectWithValue }) => {
    try {
      const data = await apiClient.post<Ingredient>('/nutrition/ingredients', input);
      return data;
    } catch (error) {
      logger.error('[createIngredient]', error);
      return rejectWithValue('Erreur lors de la création de l\'ingrédient');
    }
  }
);

export const updateIngredient = createAsyncThunk(
  'nutrition/updateIngredient',
  async ({ id, data }: { id: string; data: UpdateIngredientInput }, { rejectWithValue }) => {
    try {
      const updated = await apiClient.patch<Ingredient>(`/nutrition/ingredients/${id}`, data);
      return updated;
    } catch (error) {
      logger.error('[updateIngredient]', error);
      return rejectWithValue('Erreur lors de la mise à jour de l\'ingrédient');
    }
  }
);

export const deleteIngredient = createAsyncThunk(
  'nutrition/deleteIngredient',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/nutrition/ingredients/${id}`);
      return id;
    } catch (error) {
      logger.error('[deleteIngredient]', error);
      return rejectWithValue('Erreur lors de la suppression de l\'ingrédient');
    }
  }
);

// ─── Ration Thunks ────────────────────────────────────────────────────────

export const loadRations = createAsyncThunk(
  'nutrition/loadRations',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const data = await apiClient.get<Ration[]>('/nutrition/rations', {
        params: { projet_id: projetId },
      });
      return data;
    } catch (error) {
      logger.error('[loadRations]', error);
      return rejectWithValue('Erreur lors du chargement des rations');
    }
  }
);

export const createRation = createAsyncThunk(
  'nutrition/createRation',
  async (input: Partial<Ration>, { rejectWithValue }) => {
    try {
      const data = await apiClient.post<Ration>('/nutrition/rations', input);
      return data;
    } catch (error) {
      logger.error('[createRation]', error);
      return rejectWithValue('Erreur lors de la création de la ration');
    }
  }
);

// ─── Ration Budget Thunks ─────────────────────────────────────────────────

export const loadRationsBudget = createAsyncThunk(
  'nutrition/loadRationsBudget',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const data = await apiClient.get<RationBudget[]>('/nutrition/rations-budget', {
        params: { projet_id: projetId },
      });
      return data;
    } catch (error) {
      logger.error('[loadRationsBudget]', error);
      return rejectWithValue('Erreur lors du chargement des budgets de rations');
    }
  }
);

export const createRationBudget = createAsyncThunk(
  'nutrition/createRationBudget',
  async (input: CreateRationBudgetInput, { rejectWithValue }) => {
    try {
      const data = await apiClient.post<RationBudget>('/nutrition/rations-budget', input);
      return data;
    } catch (error) {
      logger.error('[createRationBudget]', error);
      return rejectWithValue('Erreur lors de la création du budget de ration');
    }
  }
);

export const updateRationBudget = createAsyncThunk(
  'nutrition/updateRationBudget',
  async ({ id, data }: { id: string; data: UpdateRationBudgetInput }, { rejectWithValue }) => {
    try {
      const updated = await apiClient.patch<RationBudget>(`/nutrition/rations-budget/${id}`, data);
      return updated;
    } catch (error) {
      logger.error('[updateRationBudget]', error);
      return rejectWithValue('Erreur lors de la mise à jour du budget de ration');
    }
  }
);

export const deleteRationBudget = createAsyncThunk(
  'nutrition/deleteRationBudget',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/nutrition/rations-budget/${id}`);
      return id;
    } catch (error) {
      logger.error('[deleteRationBudget]', error);
      return rejectWithValue('Erreur lors de la suppression du budget de ration');
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────

const nutritionSlice = createSlice({
  name: 'nutrition',
  initialState,
  reducers: {
    addRation: (state, action: PayloadAction<Ration>) => {
      state.rations.push(action.payload);
    },
    updateRation: (state, action: PayloadAction<Ration>) => {
      const index = state.rations.findIndex(r => r.id === action.payload.id);
      if (index !== -1) {
        state.rations[index] = action.payload;
      }
    },
    deleteRation: (state, action: PayloadAction<string>) => {
      state.rations = state.rations.filter(r => r.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Ingredients ──
      .addCase(loadIngredients.pending, (state) => { state.loading = true; })
      .addCase(loadIngredients.fulfilled, (state, action) => {
        state.loading = false;
        state.ingredients = action.payload;
      })
      .addCase(loadIngredients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createIngredient.fulfilled, (state, action) => {
        state.ingredients.push(action.payload);
      })
      .addCase(updateIngredient.fulfilled, (state, action) => {
        const idx = state.ingredients.findIndex(i => i.id === action.payload.id);
        if (idx !== -1) state.ingredients[idx] = action.payload;
      })
      .addCase(deleteIngredient.fulfilled, (state, action) => {
        state.ingredients = state.ingredients.filter(i => i.id !== action.payload);
      })

      // ── Rations ──
      .addCase(loadRations.pending, (state) => { state.loading = true; })
      .addCase(loadRations.fulfilled, (state, action) => {
        state.loading = false;
        state.rations = action.payload;
      })
      .addCase(loadRations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createRation.fulfilled, (state, action) => {
        state.rations.push(action.payload);
      })

      // ── Rations Budget ──
      .addCase(loadRationsBudget.pending, (state) => { state.loading = true; })
      .addCase(loadRationsBudget.fulfilled, (state, action) => {
        state.loading = false;
        state.rationsBudget = action.payload;
      })
      .addCase(loadRationsBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createRationBudget.fulfilled, (state, action) => {
        state.rationsBudget.push(action.payload);
      })
      .addCase(updateRationBudget.fulfilled, (state, action) => {
        const idx = state.rationsBudget.findIndex(r => r.id === action.payload.id);
        if (idx !== -1) state.rationsBudget[idx] = action.payload;
      })
      .addCase(deleteRationBudget.fulfilled, (state, action) => {
        state.rationsBudget = state.rationsBudget.filter(r => r.id !== action.payload);
      });
  },
});

export const { addRation, updateRation, deleteRation, setLoading, setError } = nutritionSlice.actions;
export default nutritionSlice.reducer;
