/**
 * Slice Redux pour la gestion financière
 * Utilise normalizr pour stocker les données de manière normalisée
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { normalize } from 'normalizr';
import {
  ChargeFixe,
  DepensePonctuelle,
  Revenu,
  CreateChargeFixeInput,
  CreateDepensePonctuelleInput,
  UpdateDepensePonctuelleInput,
  CreateRevenuInput,
  UpdateRevenuInput,
} from '../../types';
import { databaseService } from '../../services/database';
import { chargesFixesSchema, depensesPonctuellesSchema, revenusSchema, chargeFixeSchema, depensePonctuelleSchema, revenuSchema } from '../normalization/schemas';

// Structure normalisée de l'état
interface NormalizedEntities {
  chargesFixes: Record<string, ChargeFixe>;
  depensesPonctuelles: Record<string, DepensePonctuelle>;
  revenus: Record<string, Revenu>;
}

interface FinanceState {
  entities: NormalizedEntities;
  ids: {
    chargesFixes: string[];
    depensesPonctuelles: string[];
    revenus: string[];
  };
  loading: boolean;
  error: string | null;
}

const initialState: FinanceState = {
  entities: {
    chargesFixes: {},
    depensesPonctuelles: {},
    revenus: {},
  },
  ids: {
    chargesFixes: [],
    depensesPonctuelles: [],
    revenus: [],
  },
  loading: false,
  error: null,
};

// Helpers pour normaliser
const normalizeChargesFixes = (charges: ChargeFixe[]) => normalize(charges, chargesFixesSchema);
const normalizeDepensesPonctuelles = (depenses: DepensePonctuelle[]) => normalize(depenses, depensesPonctuellesSchema);
const normalizeRevenus = (revenus: Revenu[]) => normalize(revenus, revenusSchema);
const normalizeChargeFixe = (charge: ChargeFixe) => normalize([charge], chargesFixesSchema);
const normalizeDepensePonctuelle = (depense: DepensePonctuelle) => normalize([depense], depensesPonctuellesSchema);
const normalizeRevenu = (revenu: Revenu) => normalize([revenu], revenusSchema);

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

// Thunks pour Revenus
export const createRevenu = createAsyncThunk(
  'finance/createRevenu',
  async (input: CreateRevenuInput, { rejectWithValue }) => {
    try {
      const revenu = await databaseService.createRevenu(input);
      return revenu;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création du revenu');
    }
  }
);

export const loadRevenus = createAsyncThunk(
  'finance/loadRevenus',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const revenus = await databaseService.getAllRevenus(projetId);
      return revenus;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des revenus');
    }
  }
);

export const updateRevenu = createAsyncThunk(
  'finance/updateRevenu',
  async ({ id, updates }: { id: string; updates: UpdateRevenuInput }, { rejectWithValue }) => {
    try {
      const revenu = await databaseService.updateRevenu(id, updates);
      return revenu;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la mise à jour du revenu');
    }
  }
);

export const deleteRevenu = createAsyncThunk(
  'finance/deleteRevenu',
  async (id: string, { rejectWithValue }) => {
    try {
      await databaseService.deleteRevenu(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la suppression du revenu');
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
    // Migration: convertir l'ancienne structure en nouvelle structure normalisée
    migrateFromLegacy: (state, action: PayloadAction<any>) => {
      const legacyState = action.payload;
      if (legacyState && !legacyState.entities) {
        // Ancienne structure: arrays directs
        if (Array.isArray(legacyState.chargesFixes)) {
          const normalized = normalizeChargesFixes(legacyState.chargesFixes);
          state.entities.chargesFixes = normalized.entities.chargesFixes;
          state.ids.chargesFixes = normalized.result;
        }
        if (Array.isArray(legacyState.depensesPonctuelles)) {
          const normalized = normalizeDepensesPonctuelles(legacyState.depensesPonctuelles);
          state.entities.depensesPonctuelles = normalized.entities.depensesPonctuelles;
          state.ids.depensesPonctuelles = normalized.result;
        }
        if (Array.isArray(legacyState.revenus)) {
          const normalized = normalizeRevenus(legacyState.revenus);
          state.entities.revenus = normalized.entities.revenus;
          state.ids.revenus = normalized.result;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Charges Fixes
      .addCase(createChargeFixe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createChargeFixe.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeChargeFixe(action.payload);
        state.entities.chargesFixes = { ...state.entities.chargesFixes, ...normalized.entities.chargesFixes };
        state.ids.chargesFixes = [normalized.result[0], ...state.ids.chargesFixes];
      })
      .addCase(createChargeFixe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadChargesFixes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadChargesFixes.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeChargesFixes(action.payload);
        state.entities.chargesFixes = { ...state.entities.chargesFixes, ...normalized.entities.chargesFixes };
        state.ids.chargesFixes = normalized.result;
      })
      .addCase(loadChargesFixes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateChargeFixe.fulfilled, (state, action) => {
        const normalized = normalizeChargeFixe(action.payload);
        state.entities.chargesFixes = { ...state.entities.chargesFixes, ...normalized.entities.chargesFixes };
      })
      .addCase(updateChargeFixe.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteChargeFixe.fulfilled, (state, action) => {
        const chargeId = action.payload;
        state.ids.chargesFixes = state.ids.chargesFixes.filter((id) => id !== chargeId);
        delete state.entities.chargesFixes[chargeId];
      })
      .addCase(deleteChargeFixe.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Dépenses Ponctuelles
      .addCase(createDepensePonctuelle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDepensePonctuelle.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeDepensePonctuelle(action.payload);
        state.entities.depensesPonctuelles = { ...state.entities.depensesPonctuelles, ...normalized.entities.depensesPonctuelles };
        state.ids.depensesPonctuelles = [normalized.result[0], ...state.ids.depensesPonctuelles];
      })
      .addCase(createDepensePonctuelle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadDepensesPonctuelles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDepensesPonctuelles.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeDepensesPonctuelles(action.payload);
        state.entities.depensesPonctuelles = { ...state.entities.depensesPonctuelles, ...normalized.entities.depensesPonctuelles };
        state.ids.depensesPonctuelles = normalized.result;
      })
      .addCase(loadDepensesPonctuelles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateDepensePonctuelle.fulfilled, (state, action) => {
        const normalized = normalizeDepensePonctuelle(action.payload);
        state.entities.depensesPonctuelles = { ...state.entities.depensesPonctuelles, ...normalized.entities.depensesPonctuelles };
      })
      .addCase(updateDepensePonctuelle.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteDepensePonctuelle.fulfilled, (state, action) => {
        const depenseId = action.payload;
        state.ids.depensesPonctuelles = state.ids.depensesPonctuelles.filter((id) => id !== depenseId);
        delete state.entities.depensesPonctuelles[depenseId];
      })
      .addCase(deleteDepensePonctuelle.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Revenus
      .addCase(createRevenu.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRevenu.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeRevenu(action.payload);
        state.entities.revenus = { ...state.entities.revenus, ...normalized.entities.revenus };
        state.ids.revenus = [normalized.result[0], ...state.ids.revenus];
      })
      .addCase(createRevenu.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadRevenus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadRevenus.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeRevenus(action.payload);
        state.entities.revenus = { ...state.entities.revenus, ...normalized.entities.revenus };
        state.ids.revenus = normalized.result;
      })
      .addCase(loadRevenus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateRevenu.fulfilled, (state, action) => {
        const normalized = normalizeRevenu(action.payload);
        state.entities.revenus = { ...state.entities.revenus, ...normalized.entities.revenus };
      })
      .addCase(updateRevenu.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteRevenu.fulfilled, (state, action) => {
        const revenuId = action.payload;
        state.ids.revenus = state.ids.revenus.filter((id) => id !== revenuId);
        delete state.entities.revenus[revenuId];
      })
      .addCase(deleteRevenu.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = financeSlice.actions;
export default financeSlice.reducer;
