/**
 * Slice Redux pour la gestion des stocks d'aliments
 */

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  StockAliment,
  StockMouvement,
  CreateStockAlimentInput,
  UpdateStockAlimentInput,
  CreateStockMouvementInput,
} from '../../types';
import { databaseService } from '../../services/database';

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
      const stocks = await databaseService.getStocksParProjet(projetId);
      return stocks;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des stocks');
    }
  }
);

export const createStockAliment = createAsyncThunk(
  'stocks/createStockAliment',
  async (input: CreateStockAlimentInput, { rejectWithValue }) => {
    try {
      const stock = await databaseService.createStockAliment(input);
      return stock;
    } catch (error: any) {
      return rejectWithValue(error.message || "Erreur lors de la création de l'aliment");
    }
  }
);

export const updateStockAliment = createAsyncThunk(
  'stocks/updateStockAliment',
  async ({ id, updates }: { id: string; updates: UpdateStockAlimentInput }, { rejectWithValue }) => {
    try {
      const stock = await databaseService.updateStockAliment(id, updates);
      return stock;
    } catch (error: any) {
      return rejectWithValue(error.message || "Erreur lors de la mise à jour de l'aliment");
    }
  }
);

export const deleteStockAliment = createAsyncThunk(
  'stocks/deleteStockAliment',
  async (id: string, { rejectWithValue }) => {
    try {
      await databaseService.deleteStockAliment(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || "Erreur lors de la suppression de l'aliment");
    }
  }
);

export const createStockMouvement = createAsyncThunk(
  'stocks/createStockMouvement',
  async (input: CreateStockMouvementInput, { rejectWithValue }) => {
    try {
      const result = await databaseService.createStockMouvement(input);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création du mouvement');
    }
  }
);

export const loadMouvementsParAliment = createAsyncThunk(
  'stocks/loadMouvementsParAliment',
  async ({ alimentId, limit }: { alimentId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const mouvements = await databaseService.getMouvementsParAliment(alimentId, limit);
      return { alimentId, mouvements };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des mouvements');
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

