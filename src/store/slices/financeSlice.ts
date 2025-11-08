/**
 * Slice Redux pour la gestion financière
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  ChargeFixe,
  DepensePonctuelle,
  CreateChargeFixeInput,
  CreateDepensePonctuelleInput,
  UpdateDepensePonctuelleInput,
} from '../../types';
import { databaseService } from '../../services/database';

interface FinanceState {
  chargesFixes: ChargeFixe[];
  depensesPonctuelles: DepensePonctuelle[];
  loading: boolean;
  error: string | null;
}

const initialState: FinanceState = {
  chargesFixes: [],
  depensesPonctuelles: [],
  loading: false,
  error: null,
};

// Thunks pour Charges Fixes
export const createChargeFixe = createAsyncThunk(
  'finance/createChargeFixe',
  async (input: CreateChargeFixeInput, { rejectWithValue }) => {
    try {
      const charge = await databaseService.createChargeFixe({
        ...input,
        statut: 'actif',
      });
      return charge;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création de la charge fixe');
    }
  }
);

export const loadChargesFixes = createAsyncThunk(
  'finance/loadChargesFixes',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const charges = await databaseService.getAllChargesFixes(projetId);
      return charges;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des charges fixes');
    }
  }
);

export const updateChargeFixe = createAsyncThunk(
  'finance/updateChargeFixe',
  async ({ id, updates }: { id: string; updates: Partial<ChargeFixe> }, { rejectWithValue }) => {
    try {
      const charge = await databaseService.updateChargeFixe(id, updates);
      return charge;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la mise à jour de la charge fixe');
    }
  }
);

export const deleteChargeFixe = createAsyncThunk(
  'finance/deleteChargeFixe',
  async (id: string, { rejectWithValue }) => {
    try {
      await databaseService.deleteChargeFixe(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la suppression de la charge fixe');
    }
  }
);

// Thunks pour Dépenses Ponctuelles
export const createDepensePonctuelle = createAsyncThunk(
  'finance/createDepensePonctuelle',
  async (input: CreateDepensePonctuelleInput, { rejectWithValue }) => {
    try {
      const depense = await databaseService.createDepensePonctuelle(input);
      return depense;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création de la dépense');
    }
  }
);

export const loadDepensesPonctuelles = createAsyncThunk(
  'finance/loadDepensesPonctuelles',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const depenses = await databaseService.getAllDepensesPonctuelles(projetId);
      return depenses;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des dépenses');
    }
  }
);

export const updateDepensePonctuelle = createAsyncThunk(
  'finance/updateDepensePonctuelle',
  async ({ id, updates }: { id: string; updates: UpdateDepensePonctuelleInput }, { rejectWithValue }) => {
    try {
      const depense = await databaseService.updateDepensePonctuelle(id, updates);
      return depense;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la mise à jour de la dépense');
    }
  }
);

export const deleteDepensePonctuelle = createAsyncThunk(
  'finance/deleteDepensePonctuelle',
  async (id: string, { rejectWithValue }) => {
    try {
      await databaseService.deleteDepensePonctuelle(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la suppression de la dépense');
    }
  }
);

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // createChargeFixe
      .addCase(createChargeFixe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createChargeFixe.fulfilled, (state, action) => {
        state.loading = false;
        state.chargesFixes.unshift(action.payload);
      })
      .addCase(createChargeFixe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadChargesFixes
      .addCase(loadChargesFixes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadChargesFixes.fulfilled, (state, action) => {
        state.loading = false;
        state.chargesFixes = action.payload;
      })
      .addCase(loadChargesFixes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateChargeFixe
      .addCase(updateChargeFixe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateChargeFixe.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.chargesFixes.findIndex((c: ChargeFixe) => c.id === action.payload.id);
        if (index !== -1) {
          state.chargesFixes[index] = action.payload;
        }
      })
      .addCase(updateChargeFixe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteChargeFixe
      .addCase(deleteChargeFixe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteChargeFixe.fulfilled, (state, action) => {
        state.loading = false;
        state.chargesFixes = state.chargesFixes.filter((c: ChargeFixe) => c.id !== action.payload);
      })
      .addCase(deleteChargeFixe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createDepensePonctuelle
      .addCase(createDepensePonctuelle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDepensePonctuelle.fulfilled, (state, action) => {
        state.loading = false;
        state.depensesPonctuelles.unshift(action.payload);
      })
      .addCase(createDepensePonctuelle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadDepensesPonctuelles
      .addCase(loadDepensesPonctuelles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDepensesPonctuelles.fulfilled, (state, action) => {
        state.loading = false;
        state.depensesPonctuelles = action.payload;
      })
      .addCase(loadDepensesPonctuelles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateDepensePonctuelle
      .addCase(updateDepensePonctuelle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDepensePonctuelle.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.depensesPonctuelles.findIndex((d: DepensePonctuelle) => d.id === action.payload.id);
        if (index !== -1) {
          state.depensesPonctuelles[index] = action.payload;
        }
      })
      .addCase(updateDepensePonctuelle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteDepensePonctuelle
      .addCase(deleteDepensePonctuelle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDepensePonctuelle.fulfilled, (state, action) => {
        state.loading = false;
        state.depensesPonctuelles = state.depensesPonctuelles.filter(
          (d: DepensePonctuelle) => d.id !== action.payload
        );
      })
      .addCase(deleteDepensePonctuelle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = financeSlice.actions;
export default financeSlice.reducer;

