/**
 * Slice Redux pour la gestion des planifications
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Planification, CreatePlanificationInput, UpdatePlanificationInput } from '../../types';
import { databaseService } from '../../services/database';

interface PlanificationState {
  planifications: Planification[];
  planificationsAVenir: Planification[];
  loading: boolean;
  error: string | null;
}

const initialState: PlanificationState = {
  planifications: [],
  planificationsAVenir: [],
  loading: false,
  error: null,
};

// Thunks pour Planifications
export const createPlanification = createAsyncThunk(
  'planification/createPlanification',
  async (input: CreatePlanificationInput, { rejectWithValue }) => {
    try {
      const planification = await databaseService.createPlanification({
        ...input,
        statut: 'a_faire',
      });
      return planification;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création de la planification');
    }
  }
);

export const loadPlanifications = createAsyncThunk(
  'planification/loadPlanifications',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const planifications = await databaseService.getAllPlanifications(projetId);
      return planifications;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des planifications');
    }
  }
);

export const loadPlanificationsParProjet = createAsyncThunk(
  'planification/loadPlanificationsParProjet',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const planifications = await databaseService.getPlanificationsParProjet(projetId);
      return planifications;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des planifications');
    }
  }
);

export const loadPlanificationsAVenir = createAsyncThunk(
  'planification/loadPlanificationsAVenir',
  async ({ projetId, jours }: { projetId: string; jours?: number }, { rejectWithValue }) => {
    try {
      const planifications = await databaseService.getPlanificationsAVenir(projetId, jours);
      return planifications;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des planifications');
    }
  }
);

export const updatePlanification = createAsyncThunk(
  'planification/updatePlanification',
  async ({ id, updates }: { id: string; updates: UpdatePlanificationInput }, { rejectWithValue }) => {
    try {
      const planification = await databaseService.updatePlanification(id, updates);
      return planification;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la mise à jour de la planification');
    }
  }
);

export const deletePlanification = createAsyncThunk(
  'planification/deletePlanification',
  async (id: string, { rejectWithValue }) => {
    try {
      await databaseService.deletePlanification(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la suppression de la planification');
    }
  }
);

/**
 * Créer plusieurs planifications en batch (pour les saillies validées)
 */
export const createPlanificationsBatch = createAsyncThunk(
  'planification/createPlanificationsBatch',
  async (inputs: CreatePlanificationInput[], { rejectWithValue }) => {
    try {
      console.log(`📋 [BATCH] Création de ${inputs.length} tâches...`);
      
      const planifications: Planification[] = [];
      
      for (const input of inputs) {
        const planification = await databaseService.createPlanification({
          ...input,
          statut: 'a_faire',
        });
        planifications.push(planification);
      }
      
      console.log(`✅ [BATCH] ${planifications.length} tâches créées avec succès`);
      return planifications;
    } catch (error: any) {
      console.error('❌ [BATCH] Erreur:', error);
      return rejectWithValue(error.message || 'Erreur lors de la création des planifications');
    }
  }
);

const planificationSlice = createSlice({
  name: 'planification',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // createPlanification
      .addCase(createPlanification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPlanification.fulfilled, (state, action) => {
        state.loading = false;
        state.planifications.unshift(action.payload);
      })
      .addCase(createPlanification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadPlanifications
      .addCase(loadPlanifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadPlanifications.fulfilled, (state, action) => {
        state.loading = false;
        state.planifications = action.payload;
      })
      .addCase(loadPlanifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadPlanificationsParProjet
      .addCase(loadPlanificationsParProjet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadPlanificationsParProjet.fulfilled, (state, action) => {
        state.loading = false;
        state.planifications = action.payload;
      })
      .addCase(loadPlanificationsParProjet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadPlanificationsAVenir
      .addCase(loadPlanificationsAVenir.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadPlanificationsAVenir.fulfilled, (state, action) => {
        state.loading = false;
        state.planificationsAVenir = action.payload;
      })
      .addCase(loadPlanificationsAVenir.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updatePlanification
      .addCase(updatePlanification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePlanification.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.planifications.findIndex((p: Planification) => p.id === action.payload.id);
        if (index !== -1) {
          state.planifications[index] = action.payload;
        }
        const indexAVenir = state.planificationsAVenir.findIndex((p: Planification) => p.id === action.payload.id);
        if (indexAVenir !== -1) {
          state.planificationsAVenir[indexAVenir] = action.payload;
        }
      })
      .addCase(updatePlanification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deletePlanification
      .addCase(deletePlanification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePlanification.fulfilled, (state, action) => {
        state.loading = false;
        state.planifications = state.planifications.filter((p: Planification) => p.id !== action.payload);
        state.planificationsAVenir = state.planificationsAVenir.filter((p: Planification) => p.id !== action.payload);
      })
      .addCase(deletePlanification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createPlanificationsBatch
      .addCase(createPlanificationsBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPlanificationsBatch.fulfilled, (state, action) => {
        state.loading = false;
        // Ajouter toutes les nouvelles planifications au début
        state.planifications = [...action.payload, ...state.planifications];
      })
      .addCase(createPlanificationsBatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = planificationSlice.actions;
export default planificationSlice.reducer;

