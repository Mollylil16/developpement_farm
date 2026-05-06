import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Porc } from '../../types';
// Use new Mortalite type from mortalites.ts (snake_case)
import type { Mortalite, StatistiquesMortalite } from '../../types/mortalites';
import { DatabaseService } from '../../services/database';
import apiClient from '../../services/api/apiClient';

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
    await DatabaseService.saveMortalite(nouvelleMortalite as any);
    
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
  statistiques: StatistiquesMortalite | null;
  loading: boolean;
  error?: string;
}

const initialState: MortalitesState = {
  mortalites: [],
  statistiques: null,
  loading: false,
};

// New API-based thunks
export const loadMortalitesParProjet = createAsyncThunk(
  'mortalites/loadMortalitesParProjet',
  async (projetId: string, { rejectWithValue }) => {
    try {
      return await apiClient.get<Mortalite[]>(`/mortalites?projet_id=${projetId}`);
    } catch (error) {
      return rejectWithValue('Erreur lors du chargement des mortalités');
    }
  }
);

/** Alias for backward compatibility */
export const loadMortalites = loadMortalitesParProjet;

export const loadStatistiquesMortalite = createAsyncThunk(
  'mortalites/loadStatistiquesMortalite',
  async (projetId: string, { rejectWithValue }) => {
    try {
      return await apiClient.get<StatistiquesMortalite>(`/mortalites/statistiques?projet_id=${projetId}`);
    } catch (error) {
      return rejectWithValue('Erreur lors du chargement des statistiques de mortalité');
    }
  }
);

export const createMortalite = createAsyncThunk(
  'mortalites/createMortalite',
  async (data: Omit<Mortalite, 'id'>, { rejectWithValue }) => {
    try {
      return await apiClient.post<Mortalite>('/mortalites', data);
    } catch (error) {
      return rejectWithValue('Erreur lors de la création de la mortalité');
    }
  }
);

export const updateMortalite = createAsyncThunk(
  'mortalites/updateMortalite',
  async (params: { id: string; data: Partial<Mortalite> }, { rejectWithValue }) => {
    try {
      return await apiClient.patch<Mortalite>(`/mortalites/${params.id}`, params.data);
    } catch (error) {
      return rejectWithValue('Erreur lors de la mise à jour de la mortalité');
    }
  }
);

export const deleteMortalite = createAsyncThunk(
  'mortalites/deleteMortalite',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/mortalites/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue('Erreur lors de la suppression de la mortalité');
    }
  }
);

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
        state.mortalites = action.payload as any;
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
      })
      // New API-based thunks
      .addCase(loadMortalitesParProjet.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(loadMortalitesParProjet.fulfilled, (state, action) => {
        state.loading = false;
        state.mortalites = action.payload ?? [];
      })
      .addCase(loadMortalitesParProjet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadStatistiquesMortalite.fulfilled, (state, action) => {
        state.statistiques = action.payload;
      })
      .addCase(createMortalite.fulfilled, (state, action) => {
        state.mortalites.push(action.payload);
      })
      .addCase(updateMortalite.fulfilled, (state, action) => {
        const idx = state.mortalites.findIndex((m) => m.id === action.payload.id);
        if (idx !== -1) state.mortalites[idx] = action.payload;
      })
      .addCase(deleteMortalite.fulfilled, (state, action) => {
        state.mortalites = state.mortalites.filter((m) => m.id !== action.payload);
      });
  },
});

export const {
  setLoading,
  setError,
  clearError,
} = mortalitesSlice.actions;

export default mortalitesSlice.reducer;
