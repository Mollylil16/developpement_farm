import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { PlanificationAccouplement, SailliePlanifiee, ObjectifReproduction } from '../../types';
import { CalculsAgricoles } from '../../utils/calculs';

interface PlanificationState {
  planifications: PlanificationAccouplement[];
  planificationActive: PlanificationAccouplement | null;
  loading: boolean;
  error?: string;
}

const initialState: PlanificationState = {
  planifications: [],
  planificationActive: null,
  loading: false,
};

// Actions asynchrones
export const creerPlanification = createAsyncThunk(
  'planification/creerPlanification',
  async (
    { objectif, truies, verrats }: { 
      objectif: ObjectifReproduction; 
      truies: any[]; 
      verrats: any[] 
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

const planificationSlice = createSlice({
  name: 'planification',
  initialState,
  reducers: {
    setPlanificationActive: (state, action: PayloadAction<PlanificationAccouplement | null>) => {
      state.planificationActive = action.payload;
    },
    ajouterPlanification: (state, action: PayloadAction<PlanificationAccouplement>) => {
      state.planifications.push(action.payload);
    },
    mettreAJourPlanification: (state, action: PayloadAction<PlanificationAccouplement>) => {
      const index = state.planifications.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.planifications[index] = action.payload;
      }
    },
    supprimerPlanification: (state, action: PayloadAction<string>) => {
      state.planifications = state.planifications.filter(p => p.id !== action.payload);
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
      // Créer Planification
      .addCase(creerPlanification.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(creerPlanification.fulfilled, (state, action) => {
        state.loading = false;
        state.planifications.push(action.payload);
        state.planificationActive = action.payload;
      })
      .addCase(creerPlanification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Mettre à jour Saillie
      .addCase(mettreAJourSaillie.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(mettreAJourSaillie.fulfilled, (state, action) => {
        state.loading = false;
        const { planificationId, saillieId, statut } = action.payload;
        
        const planification = state.planifications.find(p => p.id === planificationId);
        if (planification) {
          const saillie = planification.saillies.find(s => s.id === saillieId);
          if (saillie) {
            saillie.statut = statut;
          }
        }
        
        if (state.planificationActive?.id === planificationId) {
          const saillie = state.planificationActive.saillies.find(s => s.id === saillieId);
          if (saillie) {
            saillie.statut = statut;
          }
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
