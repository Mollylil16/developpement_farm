/**
 * Slice Redux pour la gestion du module Production
 * Utilise normalizr pour stocker les données de manière normalisée
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { normalize, denormalize } from 'normalizr';
import {
  ProductionAnimal,
  CreateProductionAnimalInput,
  UpdateProductionAnimalInput,
  ProductionPesee,
  CreatePeseeInput,
} from '../../types';
import { databaseService } from '../../services/database';
import { animauxSchema, peseesSchema, animalSchema, peseeSchema } from '../normalization/schemas';

// Structure normalisée de l'état
interface NormalizedEntities {
  animaux: Record<string, ProductionAnimal>;
  pesees: Record<string, ProductionPesee>;
}

interface ProductionState {
  entities: NormalizedEntities;
  ids: {
    animaux: string[];
    pesees: string[];
  };
  peseesParAnimal: Record<string, string[]>; // IDs des pesées par animal
  peseesRecents: string[]; // IDs des pesées récentes
  loading: boolean;
  error: string | null;
}

const initialState: ProductionState = {
  entities: {
    animaux: {},
    pesees: {},
  },
  ids: {
    animaux: [],
    pesees: [],
  },
  peseesParAnimal: {},
  peseesRecents: [],
  loading: false,
  error: null,
};

// Helper pour normaliser une liste d'animaux
const normalizeAnimaux = (animaux: ProductionAnimal[]) => {
  return normalize(animaux, animauxSchema);
};

// Helper pour normaliser une liste de pesées
const normalizePesees = (pesees: ProductionPesee[]) => {
  return normalize(pesees, peseesSchema);
};

// Helper pour normaliser un seul animal
const normalizeAnimal = (animal: ProductionAnimal) => {
  return normalize([animal], animauxSchema);
};

// Helper pour normaliser une seule pesée
const normalizePesee = (pesee: ProductionPesee) => {
  return normalize([pesee], peseesSchema);
};

export const loadProductionAnimaux = createAsyncThunk(
  'production/loadAnimaux',
  async ({ projetId, inclureInactifs = true }: { projetId: string; inclureInactifs?: boolean }, { rejectWithValue }) => {
    try {
      const animaux = await databaseService.getProductionAnimaux(projetId, inclureInactifs);
      return animaux;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des animaux');
    }
  }
);

export const createProductionAnimal = createAsyncThunk(
  'production/createAnimal',
  async (input: CreateProductionAnimalInput, { rejectWithValue }) => {
    try {
      const animal = await databaseService.createProductionAnimal(input);
      return animal;
    } catch (error: any) {
      return rejectWithValue(error.message || "Erreur lors de la création de l'animal");
    }
  }
);

export const updateProductionAnimal = createAsyncThunk(
  'production/updateAnimal',
  async ({ id, updates }: { id: string; updates: UpdateProductionAnimalInput }, { rejectWithValue }) => {
    try {
      const animal = await databaseService.updateProductionAnimal(id, updates);
      return animal;
    } catch (error: any) {
      return rejectWithValue(error.message || "Erreur lors de la mise à jour de l'animal");
    }
  }
);

export const deleteProductionAnimal = createAsyncThunk(
  'production/deleteAnimal',
  async (id: string, { rejectWithValue }) => {
    try {
      await databaseService.deleteProductionAnimal(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || "Erreur lors de la suppression de l'animal");
    }
  }
);

export const createPesee = createAsyncThunk(
  'production/createPesee',
  async (input: CreatePeseeInput, { rejectWithValue }) => {
    try {
      const pesee = await databaseService.createPesee(input);
      return pesee;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création de la pesée');
    }
  }
);

export const updatePesee = createAsyncThunk(
  'production/updatePesee',
  async ({ id, updates }: { id: string; updates: Partial<CreatePeseeInput> }, { rejectWithValue }) => {
    try {
      const pesee = await databaseService.updatePesee(id, updates);
      return pesee;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la modification de la pesée');
    }
  }
);

export const deletePesee = createAsyncThunk(
  'production/deletePesee',
  async ({ id, animalId }: { id: string; animalId: string }, { rejectWithValue }) => {
    try {
      await databaseService.deletePesee(id);
      return { id, animalId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la suppression de la pesée');
    }
  }
);

export const loadPeseesParAnimal = createAsyncThunk(
  'production/loadPeseesParAnimal',
  async (animalId: string, { rejectWithValue }) => {
    try {
      const pesees = await databaseService.getPeseesParAnimal(animalId);
      return { animalId, pesees };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des pesées');
    }
  }
);

export const loadPeseesRecents = createAsyncThunk(
  'production/loadPeseesRecents',
  async ({ projetId, limit = 20 }: { projetId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const pesees = await databaseService.getPeseesRecents(projetId, limit);
      return pesees;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des pesées récentes');
    }
  }
);

const productionSlice = createSlice({
  name: 'production',
  initialState,
  reducers: {
    clearProductionError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProductionAnimaux.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProductionAnimaux.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeAnimaux(action.payload);
        state.entities.animaux = { ...state.entities.animaux, ...normalized.entities.animaux };
        state.ids.animaux = normalized.result;
      })
      .addCase(loadProductionAnimaux.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createProductionAnimal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProductionAnimal.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizeAnimal(action.payload);
        state.entities.animaux = { ...state.entities.animaux, ...normalized.entities.animaux };
        state.ids.animaux = [normalized.result[0], ...state.ids.animaux];
      })
      .addCase(createProductionAnimal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateProductionAnimal.fulfilled, (state, action) => {
        const normalized = normalizeAnimal(action.payload);
        state.entities.animaux = { ...state.entities.animaux, ...normalized.entities.animaux };
      })
      .addCase(updateProductionAnimal.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteProductionAnimal.fulfilled, (state, action) => {
        const animalId = action.payload;
        state.ids.animaux = state.ids.animaux.filter((id) => id !== animalId);
        delete state.entities.animaux[animalId];
        delete state.peseesParAnimal[animalId];
        // Supprimer les pesées orphelines de cet animal
        const peseeIdsToRemove = state.peseesParAnimal[animalId] || [];
        peseeIdsToRemove.forEach((peseeId) => {
          delete state.entities.pesees[peseeId];
          state.ids.pesees = state.ids.pesees.filter((id) => id !== peseeId);
        });
      })
      .addCase(deleteProductionAnimal.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(createPesee.fulfilled, (state, action) => {
        const pesee = action.payload;
        const normalized = normalizePesee(pesee);
        state.entities.pesees = { ...state.entities.pesees, ...normalized.entities.pesees };
        const peseeId = normalized.result[0];
        state.ids.pesees = [peseeId, ...state.ids.pesees];
        
        // Ajouter la pesée à l'animal
        if (!state.peseesParAnimal[pesee.animal_id]) {
          state.peseesParAnimal[pesee.animal_id] = [];
        }
        state.peseesParAnimal[pesee.animal_id] = [peseeId, ...state.peseesParAnimal[pesee.animal_id]];
        
        // Ajouter aux pesées récentes
        state.peseesRecents = [peseeId, ...state.peseesRecents].slice(0, 20);
      })
      .addCase(createPesee.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(updatePesee.fulfilled, (state, action) => {
        const pesee = action.payload;
        const normalized = normalizePesee(pesee);
        state.entities.pesees = { ...state.entities.pesees, ...normalized.entities.pesees };
        
        // Note : La pesée reste dans les mêmes listes, on met juste à jour ses données
      })
      .addCase(updatePesee.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deletePesee.fulfilled, (state, action) => {
        const { id, animalId } = action.payload;
        
        // Supprimer de l'entité globale
        delete state.entities.pesees[id];
        
        // Supprimer de la liste globale
        state.ids.pesees = state.ids.pesees.filter((peseeId) => peseeId !== id);
        
        // Supprimer de la liste de l'animal
        if (state.peseesParAnimal[animalId]) {
          state.peseesParAnimal[animalId] = state.peseesParAnimal[animalId].filter(
            (peseeId) => peseeId !== id
          );
        }
        
        // Supprimer des pesées récentes
        state.peseesRecents = state.peseesRecents.filter((peseeId) => peseeId !== id);
      })
      .addCase(deletePesee.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(loadPeseesParAnimal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadPeseesParAnimal.fulfilled, (state, action) => {
        state.loading = false;
        const { animalId, pesees } = action.payload;
        const normalized = normalizePesees(pesees);
        state.entities.pesees = { ...state.entities.pesees, ...normalized.entities.pesees };
        state.peseesParAnimal[animalId] = normalized.result;
        // Ajouter les IDs de pesées à la liste globale si pas déjà présents
        normalized.result.forEach((peseeId) => {
          if (!state.ids.pesees.includes(peseeId)) {
            state.ids.pesees.push(peseeId);
          }
        });
      })
      .addCase(loadPeseesParAnimal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadPeseesRecents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadPeseesRecents.fulfilled, (state, action) => {
        state.loading = false;
        const normalized = normalizePesees(action.payload);
        state.entities.pesees = { ...state.entities.pesees, ...normalized.entities.pesees };
        state.peseesRecents = normalized.result;
        // Ajouter les IDs de pesées à la liste globale si pas déjà présents
        normalized.result.forEach((peseeId) => {
          if (!state.ids.pesees.includes(peseeId)) {
            state.ids.pesees.push(peseeId);
          }
        });
      })
      .addCase(loadPeseesRecents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearProductionError } = productionSlice.actions;
export default productionSlice.reducer;
