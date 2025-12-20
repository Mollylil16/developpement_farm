/**
 * Slice Redux pour la gestion de la reproduction
 * Utilise normalizr pour stocker les données de manière normalisée
 * Utilise maintenant l'API backend au lieu de SQLite
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getErrorMessage } from '../../types/common';
import { normalize } from 'normalizr';
import { Gestation, Sevrage, CreateGestationInput, CreateSevrageInput } from '../../types';
import apiClient from '../../services/api/apiClient';
import {
  gestationsSchema,
  sevragesSchema,
  gestationSchema,
  sevrageSchema,
} from '../normalization/schemas';

// Structure normalisée de l'état
interface NormalizedEntities {
  gestations: Record<string, Gestation>;
  sevrages: Record<string, Sevrage>;
}

interface ReproductionState {
  entities: NormalizedEntities;
  ids: {
    gestations: string[];
    sevrages: string[];
  };
  sevragesParGestation: Record<string, string[]>; // IDs des sevrages par gestation
  loading: boolean;
  error: string | null;
}

const initialState: ReproductionState = {
  entities: {
    gestations: {},
    sevrages: {},
  },
  ids: {
    gestations: [],
    sevrages: [],
  },
  sevragesParGestation: {},
  loading: false,
  error: null,
};

// Helpers pour normaliser
const normalizeGestations = (gestations: Gestation[]) => normalize(gestations, gestationsSchema);
const normalizeSevrages = (sevrages: Sevrage[]) => normalize(sevrages, sevragesSchema);
const normalizeGestation = (gestation: Gestation) => normalize([gestation], gestationsSchema);
const normalizeSevrage = (sevrage: Sevrage) => normalize([sevrage], sevragesSchema);

// Thunks pour Gestations
export const createGestation = createAsyncThunk(
  'reproduction/createGestation',
  async (input: CreateGestationInput, { rejectWithValue }) => {
    try {
      // Le backend calcule automatiquement la date_mise_bas_prevue et définit statut='en_cours'
      const gestation = await apiClient.post<Gestation>('/reproduction/gestations', input);
      return gestation;
    } catch (error: unknown) {
      return rejectWithValue(
        getErrorMessage(error) || 'Erreur lors de la création de la gestation'
      );
    }
  }
);

export const loadGestations = createAsyncThunk(
  'reproduction/loadGestations',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const gestations = await apiClient.get<Gestation[]>('/reproduction/gestations', {
        params: { projet_id: projetId },
      });
      return gestations;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors du chargement des gestations');
    }
  }
);

export const loadGestationsEnCours = createAsyncThunk(
  'reproduction/loadGestationsEnCours',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const gestations = await apiClient.get<Gestation[]>('/reproduction/gestations', {
        params: { projet_id: projetId, en_cours: true },
      });
      return gestations;
    } catch (error: unknown) {
      return rejectWithValue(
        getErrorMessage(error) || 'Erreur lors du chargement des gestations en cours'
      );
    }
  }
);

export const updateGestation = createAsyncThunk(
  'reproduction/updateGestation',
  async ({ id, updates }: { id: string; updates: Partial<Gestation> }, { rejectWithValue }) => {
    try {
      // Le backend recalcule automatiquement date_mise_bas_prevue si date_sautage change
      // Note: La création automatique des porcelets sera implémentée côté backend plus tard si nécessaire
      const gestation = await apiClient.patch<Gestation>(`/reproduction/gestations/${id}`, updates);
      return gestation;
    } catch (error: unknown) {
      return rejectWithValue(
        getErrorMessage(error) || 'Erreur lors de la mise à jour de la gestation'
      );
    }
  }
);

export const deleteGestation = createAsyncThunk(
  'reproduction/deleteGestation',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/reproduction/gestations/${id}`);
      return id;
    } catch (error: unknown) {
      return rejectWithValue(
        getErrorMessage(error) || 'Erreur lors de la suppression de la gestation'
      );
    }
  }
);

// Thunks pour Sevrages
export const createSevrage = createAsyncThunk(
  'reproduction/createSevrage',
  async (input: CreateSevrageInput, { rejectWithValue }) => {
    try {
      // Le backend récupère automatiquement le projet_id depuis la gestation
      const sevrage = await apiClient.post<Sevrage>('/reproduction/sevrages', input);
      return sevrage;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors de la création du sevrage');
    }
  }
);

export const loadSevrages = createAsyncThunk(
  'reproduction/loadSevrages',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const sevrages = await apiClient.get<Sevrage[]>('/reproduction/sevrages', {
        params: { projet_id: projetId },
      });
      return sevrages;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors du chargement des sevrages');
    }
  }
);

export const loadSevragesParGestation = createAsyncThunk(
  'reproduction/loadSevragesParGestation',
  async (gestationId: string, { rejectWithValue }) => {
    try {
      const sevrages = await apiClient.get<Sevrage[]>('/reproduction/sevrages', {
        params: { gestation_id: gestationId },
      });
      // Retourner en array pour compatibilité avec l'ancien format
      return { gestationId, sevrages: Array.isArray(sevrages) ? sevrages : [] };
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors du chargement des sevrages');
    }
  }
);

// Thunks pour Statistiques
// Note: Les statistiques seront implémentées côté backend plus tard si nécessaire
// Pour l'instant, ces calculs peuvent être faits côté frontend avec les données disponibles
export const loadGestationStats = createAsyncThunk(
  'reproduction/loadGestationStats',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const stats = await apiClient.get('/reproduction/stats/gestations', {
        params: { projet_id: projetId },
      });
      return stats;
    } catch (error: unknown) {
      return rejectWithValue(
        getErrorMessage(error) || 'Erreur lors du chargement des statistiques'
      );
    }
  }
);

export const loadSevrageStats = createAsyncThunk(
  'reproduction/loadSevrageStats',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const stats = await apiClient.get('/reproduction/stats/sevrages', {
        params: { projet_id: projetId },
      });
      return stats;
    } catch (error: unknown) {
      return rejectWithValue(
        getErrorMessage(error) || 'Erreur lors du chargement des statistiques'
      );
    }
  }
);

export const loadTauxSurvie = createAsyncThunk(
  'reproduction/loadTauxSurvie',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const stats = await apiClient.get('/reproduction/stats/taux-survie', {
        params: { projet_id: projetId },
      });
      return stats;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors du calcul du taux de survie');
    }
  }
);

export const deleteSevrage = createAsyncThunk(
  'reproduction/deleteSevrage',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/reproduction/sevrages/${id}`);
      return id;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors de la suppression du sevrage');
    }
  }
);

const reproductionSlice = createSlice({
  name: 'reproduction',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Gestations
      .addCase(createGestation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGestation.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeGestation(action.payload);
        state.entities.gestations = {
          ...state.entities.gestations,
          ...normalized.entities.gestations,
        };
        state.ids.gestations = [normalized.result[0], ...state.ids.gestations];
      })
      .addCase(createGestation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadGestations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadGestations.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeGestations(action.payload);
        state.entities.gestations = {
          ...state.entities.gestations,
          ...normalized.entities.gestations,
        };
        state.ids.gestations = normalized.result;
      })
      .addCase(loadGestations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadGestationsEnCours.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadGestationsEnCours.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeGestations(action.payload);
        state.entities.gestations = {
          ...state.entities.gestations,
          ...normalized.entities.gestations,
        };
        // Mettre à jour uniquement les IDs des gestations en cours
        const enCoursIds = normalized.result;
        state.ids.gestations = [
          ...enCoursIds,
          ...state.ids.gestations.filter((id) => {
            const g = state.entities.gestations[id];
            return g && g.statut === 'en_cours' && !enCoursIds.includes(id);
          }),
        ];
      })
      .addCase(loadGestationsEnCours.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateGestation.fulfilled, (state, action) => {
        const normalized = normalizeGestation(action.payload);
        state.entities.gestations = {
          ...state.entities.gestations,
          ...normalized.entities.gestations,
        };
      })
      .addCase(updateGestation.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteGestation.fulfilled, (state, action) => {
        const gestationId = action.payload;
        state.ids.gestations = state.ids.gestations.filter((id) => id !== gestationId);
        delete state.entities.gestations[gestationId];
        delete state.sevragesParGestation[gestationId];
      })
      .addCase(deleteGestation.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Sevrages
      .addCase(createSevrage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSevrage.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeSevrage(action.payload);
        state.entities.sevrages = { ...state.entities.sevrages, ...normalized.entities.sevrages };
        const sevrageId = normalized.result[0];
        state.ids.sevrages = [sevrageId, ...state.ids.sevrages];

        // Ajouter le sevrage à la gestation
        if (action.payload.gestation_id) {
          if (!state.sevragesParGestation[action.payload.gestation_id]) {
            state.sevragesParGestation[action.payload.gestation_id] = [];
          }
          state.sevragesParGestation[action.payload.gestation_id] = [
            sevrageId,
            ...state.sevragesParGestation[action.payload.gestation_id],
          ];
        }
      })
      .addCase(createSevrage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadSevrages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadSevrages.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeSevrages(action.payload);
        state.entities.sevrages = { ...state.entities.sevrages, ...normalized.entities.sevrages };
        state.ids.sevrages = normalized.result;
        // Mettre à jour sevragesParGestation
        action.payload.forEach((sevrage) => {
          if (sevrage.gestation_id) {
            if (!state.sevragesParGestation[sevrage.gestation_id]) {
              state.sevragesParGestation[sevrage.gestation_id] = [];
            }
            if (!state.sevragesParGestation[sevrage.gestation_id].includes(sevrage.id)) {
              state.sevragesParGestation[sevrage.gestation_id].push(sevrage.id);
            }
          }
        });
      })
      .addCase(loadSevrages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadSevragesParGestation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadSevragesParGestation.fulfilled, (state, action) => {
        state.loading = false;
        const { gestationId, sevrages } = action.payload;
        const normalized = normalizeSevrages(sevrages);
        state.entities.sevrages = { ...state.entities.sevrages, ...normalized.entities.sevrages };
        state.sevragesParGestation[gestationId] = normalized.result;
        // Ajouter les IDs de sevrages à la liste globale si pas déjà présents
        normalized.result.forEach((sevrageId: string) => {
          if (!state.ids.sevrages.includes(sevrageId)) {
            state.ids.sevrages.push(sevrageId);
          }
        });
      })
      .addCase(loadSevragesParGestation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteSevrage.fulfilled, (state, action) => {
        const sevrageId = action.payload;
        state.ids.sevrages = state.ids.sevrages.filter((id) => id !== sevrageId);
        delete state.entities.sevrages[sevrageId];
        // Retirer de sevragesParGestation
        Object.keys(state.sevragesParGestation).forEach((gestationId) => {
          state.sevragesParGestation[gestationId] = state.sevragesParGestation[gestationId].filter(
            (id) => id !== sevrageId
          );
        });
      })
      .addCase(deleteSevrage.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = reproductionSlice.actions;
export default reproductionSlice.reducer;
