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
import { getDatabase } from '../../services/database';
import { StockRepository } from '../../database/repositories';

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
      const db = await getDatabase();
      const stockRepo = new StockRepository(db);
      const stocks = await stockRepo.findByProjet(projetId);
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
      const db = await getDatabase();
      const stockRepo = new StockRepository(db);
      const stock = await stockRepo.create(input);
      return stock;
    } catch (error: any) {
      return rejectWithValue(error.message || "Erreur lors de la création de l'aliment");
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
      const db = await getDatabase();
      const stockRepo = new StockRepository(db);
      // Convertir null en undefined pour compatibilité avec StockAliment
      const updatesNormalized = {
        ...updates,
        seuil_alerte: updates.seuil_alerte === null ? undefined : updates.seuil_alerte,
        notes: updates.notes === null ? undefined : updates.notes,
      };
      const stock = await stockRepo.update(id, updatesNormalized);
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
      const db = await getDatabase();
      const stockRepo = new StockRepository(db);
      await stockRepo.delete(id);
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
      const db = await getDatabase();
      const stockRepo = new StockRepository(db);
      
      // Utiliser aliment_id au lieu de stock_id
      const stockId = input.aliment_id;
      
      // Récupérer le stock actuel pour vérifier qu'il existe
      const stockActuel = await stockRepo.findById(stockId);
      if (!stockActuel) {
        throw new Error('Stock introuvable');
      }
      
      // Utiliser ajouterStock, retirerStock ou update selon le type
      let stock: StockAliment;
      let quantiteMouvement = input.quantite;
      
      if (input.type === 'entree') {
        stock = await stockRepo.ajouterStock(stockId, input.quantite, input.commentaire);
      } else if (input.type === 'sortie') {
        stock = await stockRepo.retirerStock(stockId, input.quantite, input.commentaire);
      } else {
        // Ajustement : utiliser la méthode ajusterStock
        stock = await stockRepo.ajusterStock(
          stockId,
          input.quantite,
          input.commentaire,
          input.date
        );
        quantiteMouvement = input.quantite - stockActuel.quantite_actuelle;
      }
      
      // Récupérer le mouvement créé depuis la base de données
      const mouvements = await stockRepo.getMouvements(stockId, 1);
      const mouvementCree = mouvements[0];
      
      // Retourner dans le format attendu par le reducer
      return {
        mouvement: mouvementCree || {
          id: `${Date.now()}`,
          projet_id: input.projet_id,
          aliment_id: input.aliment_id,
          type: input.type,
          quantite: quantiteMouvement,
          unite: input.unite,
          date: input.date || new Date().toISOString(),
          commentaire: input.commentaire,
          date_creation: new Date().toISOString(),
        } as StockMouvement,
        stock,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création du mouvement');
    }
  }
);

export const loadMouvementsParAliment = createAsyncThunk(
  'stocks/loadMouvementsParAliment',
  async ({ alimentId, limit }: { alimentId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const stockRepo = new StockRepository(db);
      const mouvements = await stockRepo.getMouvements(alimentId, limit);
      return { alimentId, mouvements };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des mouvements');
    }
  }
);

// Thunks pour Statistiques
export const loadStockStats = createAsyncThunk(
  'stocks/loadStockStats',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const stockRepo = new StockRepository(db);
      const stats = await stockRepo.getStats(projetId);
      return stats;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des statistiques');
    }
  }
);

export const loadValeurTotaleStock = createAsyncThunk(
  'stocks/loadValeurTotaleStock',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const stockRepo = new StockRepository(db);
      const valeur = await stockRepo.getValeurTotaleStock(projetId);
      return valeur;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du calcul de la valeur');
    }
  }
);

export const loadStocksEnAlerte = createAsyncThunk(
  'stocks/loadStocksEnAlerte',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const stockRepo = new StockRepository(db);
      const stocks = await stockRepo.findEnAlerte(projetId);
      return stocks;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des stocks en alerte');
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
