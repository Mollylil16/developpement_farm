/**
 * Slice Redux pour la gestion des stocks d'aliments
 * Utilise maintenant l'API backend au lieu de SQLite
 */

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  StockAliment,
  StockMouvement,
  CreateStockAlimentInput,
  UpdateStockAlimentInput,
  CreateStockMouvementInput,
} from '../../types';
import { getErrorMessage } from '../../types/common';
import apiClient from '../../services/api/apiClient';

interface StocksState {
  stocks: StockAliment[];
  mouvementsParAliment: Record<string, StockMouvement[]>;
  loading: boolean;
  error: string | null;
}

const initialState: StocksState = {
  stocks: [],
  mouvementsParAliment: {},
  loading: false,
  error: null,
};

export const loadStocks = createAsyncThunk(
  'stocks/loadStocks',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const stocks = await apiClient.get<StockAliment[]>('/nutrition/stocks-aliments', {
        params: { projet_id: projetId },
      });
      return stocks;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors du chargement des stocks');
    }
  }
);

export const createStockAliment = createAsyncThunk(
  'stocks/createStockAliment',
  async (input: CreateStockAlimentInput, { rejectWithValue }) => {
    try {
      const stock = await apiClient.post<StockAliment>('/nutrition/stocks-aliments', input);
      return stock;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || "Erreur lors de la création de l'aliment");
    }
  }
);

export const updateStockAliment = createAsyncThunk(
  'stocks/updateStockAliment',
  async (
    { id, updates }: { id: string; updates: UpdateStockAlimentInput },
    { rejectWithValue }
  ) => {
    try {
      // Le backend gère automatiquement null/undefined
      const stock = await apiClient.patch<StockAliment>(
        `/nutrition/stocks-aliments/${id}`,
        updates
      );
      return stock;
    } catch (error: unknown) {
      return rejectWithValue(
        getErrorMessage(error) || "Erreur lors de la mise à jour de l'aliment"
      );
    }
  }
);

export const deleteStockAliment = createAsyncThunk(
  'stocks/deleteStockAliment',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/nutrition/stocks-aliments/${id}`);
      return id;
    } catch (error: unknown) {
      return rejectWithValue(
        getErrorMessage(error) || "Erreur lors de la suppression de l'aliment"
      );
    }
  }
);

export const createStockMouvement = createAsyncThunk(
  'stocks/createStockMouvement',
  async (input: CreateStockMouvementInput, { rejectWithValue }) => {
    try {
      // Le backend gère automatiquement la mise à jour du stock et la création du mouvement
      const result = await apiClient.post<{ mouvement: StockMouvement; stock: StockAliment }>(
        '/nutrition/stocks-mouvements',
        input
      );
      return result;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors de la création du mouvement');
    }
  }
);

export const loadMouvementsParAliment = createAsyncThunk(
  'stocks/loadMouvementsParAliment',
  async ({ alimentId, limit }: { alimentId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const mouvements = await apiClient.get<StockMouvement[]>('/nutrition/stocks-mouvements', {
        params: { aliment_id: alimentId, ...(limit ? { limit } : {}) },
      });
      return { alimentId, mouvements };
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors du chargement des mouvements');
    }
  }
);

// Thunks pour Statistiques
// TODO: Implémenter endpoints backend pour les statistiques
export const loadStockStats = createAsyncThunk(
  'stocks/loadStockStats',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const stats = await apiClient.get(`/nutrition/stocks-aliments/stats/${projetId}`);
      return stats;
    } catch (error: unknown) {
      return rejectWithValue(
        getErrorMessage(error) || 'Erreur lors du chargement des statistiques'
      );
    }
  }
);

export const loadValeurTotaleStock = createAsyncThunk(
  'stocks/loadValeurTotaleStock',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const result = await apiClient.get(`/nutrition/stocks-aliments/valeur-totale/${projetId}`);
      return result;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors du calcul de la valeur');
    }
  }
);

export const loadStocksEnAlerte = createAsyncThunk(
  'stocks/loadStocksEnAlerte',
  async (projetId: string, { rejectWithValue }) => {
    try {
      // Filtrer côté frontend pour l'instant
      const stocks = await apiClient.get<StockAliment[]>('/nutrition/stocks-aliments', {
        params: { projet_id: projetId },
      });
      return stocks.filter((s) => s.alerte_active);
    } catch (error: unknown) {
      return rejectWithValue(
        getErrorMessage(error) || 'Erreur lors du chargement des stocks en alerte'
      );
    }
  }
);

const stocksSlice = createSlice({
  name: 'stocks',
  initialState,
  reducers: {
    clearStocksError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadStocks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadStocks.fulfilled, (state, action) => {
        state.loading = false;
        // Remplacer complètement la liste pour s'assurer que tous les stocks sont à jour
        state.stocks = action.payload;
      })
      .addCase(loadStocks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createStockAliment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createStockAliment.fulfilled, (state, action) => {
        state.loading = false;
        // Ajouter le stock créé à la liste
        // Le rechargement complet sera fait dans onSuccess du composant pour s'assurer de la cohérence
        const existingIndex = state.stocks.findIndex((s) => s.id === action.payload.id);
        if (existingIndex === -1) {
          state.stocks.unshift(action.payload);
        } else {
          // Mettre à jour si déjà présent
          state.stocks[existingIndex] = action.payload;
        }
      })
      .addCase(createStockAliment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateStockAliment.fulfilled, (state, action) => {
        const index = state.stocks.findIndex((stock) => stock.id === action.payload.id);
        if (index !== -1) {
          state.stocks[index] = action.payload;
        }
      })
      .addCase(updateStockAliment.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteStockAliment.fulfilled, (state, action) => {
        state.stocks = state.stocks.filter((stock) => stock.id !== action.payload);
        delete state.mouvementsParAliment[action.payload];
      })
      .addCase(deleteStockAliment.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(createStockMouvement.fulfilled, (state, action) => {
        const { mouvement, stock } = action.payload;
        const index = state.stocks.findIndex((s) => s.id === stock.id);
        console.log('[stocksSlice] createStockMouvement.fulfilled:', {
          stockId: stock.id,
          index,
          quantite_actuelle: stock.quantite_actuelle,
          ancienneQuantite: index !== -1 ? state.stocks[index].quantite_actuelle : 'non trouvé',
        });
        if (index !== -1) {
          state.stocks[index] = stock;
          console.log('[stocksSlice] Stock mis à jour dans Redux:', {
            stockId: stock.id,
            quantite_actuelle: state.stocks[index].quantite_actuelle,
          });
        } else {
          console.warn('[stocksSlice] Stock non trouvé dans state.stocks:', stock.id);
        }
        const mouvements = state.mouvementsParAliment[stock.id] || [];
        state.mouvementsParAliment[stock.id] = [mouvement, ...mouvements];
      })
      .addCase(createStockMouvement.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(loadMouvementsParAliment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadMouvementsParAliment.fulfilled, (state, action) => {
        state.loading = false;
        state.mouvementsParAliment[action.payload.alimentId] = action.payload.mouvements;
      })
      .addCase(loadMouvementsParAliment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearStocksError } = stocksSlice.actions;
export default stocksSlice.reducer;
