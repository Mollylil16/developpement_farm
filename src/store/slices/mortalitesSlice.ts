import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Mortalite, Porc } from '../../types';
import { DatabaseService } from '../../services/database';

// Actions asynchrones pour la gestion des mortalités
export const enregistrerMortalite = createAsyncThunk(
  'mortalites/enregistrerMortalite',
  async (donneesMortalite: Omit<Mortalite, 'id'>) => {
    // Simulation d'un appel API
    const nouvelleMortalite: Mortalite = {
      ...donneesMortalite,
      id: `mortalite_${Date.now()}`,
    };
    
    // Sauvegarder en base de données
    await DatabaseService.saveMortalite(nouvelleMortalite);
    
    return nouvelleMortalite;
  }
);

export const chargerMortalites = createAsyncThunk(
  'mortalites/chargerMortalites',
  async () => {
    // Charger depuis la base de données
    const mortalites = await DatabaseService.loadMortalites();
    return mortalites;
  }
);

export const supprimerMortalite = createAsyncThunk(
  'mortalites/supprimerMortalite',
  async (mortaliteId: string) => {
    await DatabaseService.deleteMortalite(mortaliteId);
    return mortaliteId;
  }
);

export const mettreAJourStatutPorc = createAsyncThunk(
  'mortalites/mettreAJourStatutPorc',
  async ({ porcId, nouveauStatut }: { porcId: string; nouveauStatut: Porc['statut'] }) => {
    await DatabaseService.updatePorcStatut(porcId, nouveauStatut);
    return { porcId, nouveauStatut };
  }
);

interface MortalitesState {
  mortalites: Mortalite[];
  loading: boolean;
  error?: string;
  entities: any;
  ids: any[];
}

const initialState: MortalitesState = {
  mortalites: [],
  loading: false,
  entities: {},
  ids: [],
};

const mortalitesSlice = createSlice({
  name: 'mortalites',
  initialState,
  reducers: {
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
      // Enregistrer une mortalité
      .addCase(enregistrerMortalite.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(enregistrerMortalite.fulfilled, (state, action) => {
        state.loading = false;
        state.mortalites.push(action.payload);
      })
      .addCase(enregistrerMortalite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de l\'enregistrement de la mortalité';
      })
      
      // Charger les mortalités
      .addCase(chargerMortalites.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(chargerMortalites.fulfilled, (state, action) => {
        state.loading = false;
        state.mortalites = action.payload;
      })
      .addCase(chargerMortalites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors du chargement des mortalités';
      })
      
      // Supprimer une mortalité
      .addCase(supprimerMortalite.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(supprimerMortalite.fulfilled, (state, action) => {
        state.loading = false;
        state.mortalites = state.mortalites.filter(m => m.id !== action.payload);
      })
      .addCase(supprimerMortalite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la suppression de la mortalité';
      })
      
      // Mettre à jour le statut du porc
      .addCase(mettreAJourStatutPorc.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(mettreAJourStatutPorc.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(mettreAJourStatutPorc.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la mise à jour du statut';
      });
  },
});

export const {
  setLoading,
  setError,
  clearError,
} = mortalitesSlice.actions;

export default mortalitesSlice.reducer;

// Compatibility exports for components expecting these named exports
export const loadMortalitesParProjet: any = () => async () => {};
export const loadMortalites: any = () => async () => {};
export const loadStatistiquesMortalite: any = () => async () => {};
export const createMortalite: any = () => async () => {};
export const updateMortalite: any = () => async () => {};
export const deleteMortalite: any = () => async () => {};
