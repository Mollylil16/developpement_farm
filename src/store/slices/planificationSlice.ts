import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  Planification,
  CreatePlanificationInput,
  UpdatePlanificationInput,
} from '../../types/planification';
import { PlanificationAccouplement, SailliePlanifiee, ObjectifReproduction } from '../../types';
import { CalculsAgricoles } from '../../utils/calculs';
import apiClient from '../../services/api/apiClient';
import { createLoggerWithPrefix } from '../../utils/logger';

const logger = createLoggerWithPrefix('PlanificationSlice');

interface PlanificationState {
  // Task management (Planification)
  planifications: Planification[];
  planificationsAVenir: Planification[];
  // Breeding schedule (PlanificationAccouplement)
  accouplements: PlanificationAccouplement[];
  planificationActive: PlanificationAccouplement | null;
  loading: boolean;
  error?: string;
}

const initialState: PlanificationState = {
  planifications: [],
  planificationsAVenir: [],
  accouplements: [],
  planificationActive: null,
  loading: false,
};

// ─── Task Management Thunks ────────────────────────────────────────────────

export const loadPlanificationsParProjet = createAsyncThunk(
  'planification/loadPlanificationsParProjet',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const data = await apiClient.get<Planification[]>('/planifications', {
        params: { projet_id: projetId },
      });
      return data;
    } catch (error) {
      logger.error('[loadPlanificationsParProjet]', error);
      return rejectWithValue('Erreur lors du chargement des planifications');
    }
  }
);

export const loadPlanificationsAVenir = createAsyncThunk(
  'planification/loadPlanificationsAVenir',
  async ({ projetId, jours = 7 }: { projetId: string; jours?: number }, { rejectWithValue }) => {
    try {
      const data = await apiClient.get<Planification[]>('/planifications', {
        params: { projet_id: projetId, a_venir: jours, statut: 'a_faire' },
      });
      return data;
    } catch (error) {
      logger.error('[loadPlanificationsAVenir]', error);
      return rejectWithValue('Erreur lors du chargement des planifications à venir');
    }
  }
);

export const createPlanification = createAsyncThunk(
  'planification/createPlanification',
  async (input: CreatePlanificationInput, { rejectWithValue }) => {
    try {
      const data = await apiClient.post<Planification>('/planifications', input);
      return data;
    } catch (error) {
      logger.error('[createPlanification]', error);
      return rejectWithValue('Erreur lors de la création de la planification');
    }
  }
);

export const updatePlanification = createAsyncThunk(
  'planification/updatePlanification',
  async ({ id, data }: { id: string; data: UpdatePlanificationInput }, { rejectWithValue }) => {
    try {
      const updated = await apiClient.patch<Planification>(`/planifications/${id}`, data);
      return updated;
    } catch (error) {
      logger.error('[updatePlanification]', error);
      return rejectWithValue('Erreur lors de la mise à jour de la planification');
    }
  }
);

export const deletePlanification = createAsyncThunk(
  'planification/deletePlanification',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/planifications/${id}`);
      return id;
    } catch (error) {
      logger.error('[deletePlanification]', error);
      return rejectWithValue('Erreur lors de la suppression de la planification');
    }
  }
);

export const createPlanificationsBatch = createAsyncThunk(
  'planification/createPlanificationsBatch',
  async (inputs: CreatePlanificationInput[], { rejectWithValue }) => {
    try {
      const data = await apiClient.post<Planification[]>('/planifications/batch', { planifications: inputs });
      return data;
    } catch (error) {
      logger.error('[createPlanificationsBatch]', error);
      return rejectWithValue('Erreur lors de la création en lot des planifications');
    }
  }
);

// ─── Breeding Schedule Thunks ─────────────────────────────────────────────

export const creerPlanification = createAsyncThunk(
  'planification/creerPlanification',
  async (
    { objectif, truies, verrats }: {
      objectif: ObjectifReproduction;
      truies: any[];
      verrats: any[];
    },
    { rejectWithValue }
  ) => {
    try {
      const planification = CalculsAgricoles.planifierAccouplements(objectif, truies, verrats);
      return planification;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erreur lors de la création de la planification');
    }
  }
);

export const mettreAJourSaillie = createAsyncThunk(
  'planification/mettreAJourSaillie',
  async (
    { planificationId, saillieId, statut }: {
      planificationId: string;
      saillieId: string;
      statut: 'planifie' | 'realise' | 'annule';
    },
    { rejectWithValue }
  ) => {
    try {
      return { planificationId, saillieId, statut };
    } catch (error) {
      return rejectWithValue('Erreur lors de la mise à jour de la saillie');
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────

const planificationSlice = createSlice({
  name: 'planification',
  initialState,
  reducers: {
    setPlanificationActive: (state, action: PayloadAction<PlanificationAccouplement | null>) => {
      state.planificationActive = action.payload;
    },
    ajouterPlanification: (state, action: PayloadAction<PlanificationAccouplement>) => {
      state.accouplements.push(action.payload);
    },
    mettreAJourPlanification: (state, action: PayloadAction<PlanificationAccouplement>) => {
      const index = state.accouplements.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.accouplements[index] = action.payload;
      }
    },
    supprimerPlanification: (state, action: PayloadAction<string>) => {
      state.accouplements = state.accouplements.filter(p => p.id !== action.payload);
      if (state.planificationActive?.id === action.payload) {
        state.planificationActive = null;
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
      // ── loadPlanificationsParProjet ──
      .addCase(loadPlanificationsParProjet.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(loadPlanificationsParProjet.fulfilled, (state, action) => {
        state.loading = false;
        state.planifications = action.payload;
      })
      .addCase(loadPlanificationsParProjet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── loadPlanificationsAVenir ──
      .addCase(loadPlanificationsAVenir.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadPlanificationsAVenir.fulfilled, (state, action) => {
        state.loading = false;
        state.planificationsAVenir = action.payload;
      })
      .addCase(loadPlanificationsAVenir.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── createPlanification ──
      .addCase(createPlanification.fulfilled, (state, action) => {
        state.planifications.push(action.payload);
        state.loading = false;
      })
      .addCase(createPlanification.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // ── updatePlanification ──
      .addCase(updatePlanification.fulfilled, (state, action) => {
        const idx = state.planifications.findIndex(p => p.id === action.payload.id);
        if (idx !== -1) state.planifications[idx] = action.payload;
        const idxAVenir = state.planificationsAVenir.findIndex(p => p.id === action.payload.id);
        if (idxAVenir !== -1) state.planificationsAVenir[idxAVenir] = action.payload;
      })
      .addCase(updatePlanification.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // ── deletePlanification ──
      .addCase(deletePlanification.fulfilled, (state, action) => {
        state.planifications = state.planifications.filter(p => p.id !== action.payload);
        state.planificationsAVenir = state.planificationsAVenir.filter(p => p.id !== action.payload);
      })
      .addCase(deletePlanification.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // ── createPlanificationsBatch ──
      .addCase(createPlanificationsBatch.fulfilled, (state, action) => {
        state.planifications.push(...action.payload);
      })

      // ── creerPlanification (breeding) ──
      .addCase(creerPlanification.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(creerPlanification.fulfilled, (state, action) => {
        state.loading = false;
        state.accouplements.push(action.payload);
        state.planificationActive = action.payload;
      })
      .addCase(creerPlanification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── mettreAJourSaillie (breeding) ──
      .addCase(mettreAJourSaillie.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(mettreAJourSaillie.fulfilled, (state, action) => {
        state.loading = false;
        const { planificationId, saillieId, statut } = action.payload;
        const planification = state.accouplements.find(p => p.id === planificationId);
        if (planification) {
          const saillie = planification.saillies.find((s: SailliePlanifiee) => s.id === saillieId);
          if (saillie) saillie.statut = statut;
        }
        if (state.planificationActive?.id === planificationId) {
          const saillie = state.planificationActive.saillies.find((s: SailliePlanifiee) => s.id === saillieId);
          if (saillie) saillie.statut = statut;
        }
      })
      .addCase(mettreAJourSaillie.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setPlanificationActive,
  ajouterPlanification,
  mettreAJourPlanification,
  supprimerPlanification,
  setLoading,
  setError,
  clearError,
} = planificationSlice.actions;

export default planificationSlice.reducer;
