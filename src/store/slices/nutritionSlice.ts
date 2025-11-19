/**
 * Slice Redux pour la gestion de la nutrition
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Ingredient, Ration, CreateIngredientInput, CreateRationInput, RationBudget, CreateRationBudgetInput, UpdateRationBudgetInput } from '../../types';
import { databaseService } from '../../services/database';

interface NutritionState {
  ingredients: Ingredient[];
  rations: Ration[];
  rationsBudget: RationBudget[];
  loading: boolean;
  error: string | null;
}

const initialState: NutritionState = {
  ingredients: [],
  rations: [],
  rationsBudget: [],
  loading: false,
  error: null,
};

// Thunks pour Ingrédients
export const createIngredient = createAsyncThunk(
  'nutrition/createIngredient',
  async (input: CreateIngredientInput, { rejectWithValue }) => {
    try {
      const ingredient = await databaseService.createIngredient(input);
      return ingredient;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création de l\'ingrédient');
    }
  }
);

export const loadIngredients = createAsyncThunk(
  'nutrition/loadIngredients',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const ingredients = await databaseService.getAllIngredients(projetId);
      return ingredients;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des ingrédients');
    }
  }
);

export const updateIngredient = createAsyncThunk(
  'nutrition/updateIngredient',
  async ({ id, updates }: { id: string; updates: Partial<Ingredient> }, { rejectWithValue }) => {
    try {
      const ingredient = await databaseService.updateIngredient(id, updates);
      return ingredient;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la mise à jour de l\'ingrédient');
    }
  }
);

export const deleteIngredient = createAsyncThunk(
  'nutrition/deleteIngredient',
  async (id: string, { rejectWithValue }) => {
    try {
      await databaseService.deleteIngredient(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la suppression de l\'ingrédient');
    }
  }
);

// Thunks pour Rations
export const createRation = createAsyncThunk(
  'nutrition/createRation',
  async (input: CreateRationInput, { rejectWithValue }) => {
    try {
      // Calculer le coût total
      const ingredients = await databaseService.getAllIngredients(input.projet_id);
      let coutTotal = 0;
      
      input.ingredients.forEach((ing: { ingredient_id: string; quantite: number }) => {
        const ingredient = ingredients.find((i) => i.id === ing.ingredient_id);
        if (ingredient) {
          coutTotal += ing.quantite * ingredient.prix_unitaire;
        }
      });

      const coutParKg = input.poids_kg > 0 ? coutTotal / input.poids_kg : 0;

      const ration = await databaseService.createRation({
        ...input,
        cout_total: coutTotal,
        cout_par_kg: coutParKg,
      });
      return ration;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création de la ration');
    }
  }
);

export const loadRations = createAsyncThunk(
  'nutrition/loadRations',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const rations = await databaseService.getAllRations(projetId);
      return rations;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des rations');
    }
  }
);

export const deleteRation = createAsyncThunk(
  'nutrition/deleteRation',
  async (id: string, { rejectWithValue }) => {
    try {
      await databaseService.deleteRation(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la suppression de la ration');
    }
  }
);

// Thunks pour Rations Budget (Budgétisation Aliment)
export const createRationBudget = createAsyncThunk(
  'nutrition/createRationBudget',
  async (input: CreateRationBudgetInput, { rejectWithValue }) => {
    try {
      const rationBudget = await databaseService.createRationBudget(input);
      return rationBudget;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création de la ration budget');
    }
  }
);

export const loadRationsBudget = createAsyncThunk(
  'nutrition/loadRationsBudget',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const rationsBudget = await databaseService.getRationsBudgetByProjet(projetId);
      return rationsBudget;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des rations budget');
    }
  }
);

export const updateRationBudget = createAsyncThunk(
  'nutrition/updateRationBudget',
  async ({ id, updates }: { id: string; updates: UpdateRationBudgetInput }, { rejectWithValue }) => {
    try {
      const rationBudget = await databaseService.updateRationBudget(id, updates);
      if (!rationBudget) {
        throw new Error('Ration budget non trouvée');
      }
      return rationBudget;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la mise à jour de la ration budget');
    }
  }
);

export const deleteRationBudget = createAsyncThunk(
  'nutrition/deleteRationBudget',
  async (id: string, { rejectWithValue }) => {
    try {
      await databaseService.deleteRationBudget(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la suppression de la ration budget');
    }
  }
);

const nutritionSlice = createSlice({
  name: 'nutrition',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // createIngredient
      .addCase(createIngredient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createIngredient.fulfilled, (state, action) => {
        state.loading = false;
        state.ingredients.push(action.payload);
      })
      .addCase(createIngredient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadIngredients
      .addCase(loadIngredients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadIngredients.fulfilled, (state, action) => {
        state.loading = false;
        state.ingredients = action.payload;
      })
      .addCase(loadIngredients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateIngredient
      .addCase(updateIngredient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateIngredient.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.ingredients.findIndex((i: Ingredient) => i.id === action.payload.id);
        if (index !== -1) {
          state.ingredients[index] = action.payload;
        }
      })
      .addCase(updateIngredient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteIngredient
      .addCase(deleteIngredient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteIngredient.fulfilled, (state, action) => {
        state.loading = false;
        state.ingredients = state.ingredients.filter((i: Ingredient) => i.id !== action.payload);
      })
      .addCase(deleteIngredient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createRation
      .addCase(createRation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRation.fulfilled, (state, action) => {
        state.loading = false;
        state.rations.unshift(action.payload);
      })
      .addCase(createRation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadRations
      .addCase(loadRations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadRations.fulfilled, (state, action) => {
        state.loading = false;
        state.rations = action.payload;
      })
      .addCase(loadRations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteRation
      .addCase(deleteRation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteRation.fulfilled, (state, action) => {
        state.loading = false;
        state.rations = state.rations.filter((r: Ration) => r.id !== action.payload);
      })
      .addCase(deleteRation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createRationBudget
      .addCase(createRationBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRationBudget.fulfilled, (state, action) => {
        state.loading = false;
        state.rationsBudget.unshift(action.payload);
      })
      .addCase(createRationBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadRationsBudget
      .addCase(loadRationsBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadRationsBudget.fulfilled, (state, action) => {
        state.loading = false;
        state.rationsBudget = action.payload;
      })
      .addCase(loadRationsBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateRationBudget
      .addCase(updateRationBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRationBudget.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.rationsBudget.findIndex((r: RationBudget) => r.id === action.payload.id);
        if (index !== -1) {
          state.rationsBudget[index] = action.payload;
        }
      })
      .addCase(updateRationBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteRationBudget
      .addCase(deleteRationBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteRationBudget.fulfilled, (state, action) => {
        state.loading = false;
        state.rationsBudget = state.rationsBudget.filter((r: RationBudget) => r.id !== action.payload);
      })
      .addCase(deleteRationBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = nutritionSlice.actions;
export default nutritionSlice.reducer;

