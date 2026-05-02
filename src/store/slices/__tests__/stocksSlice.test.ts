/**
 * Tests pour stocksSlice
 * Teste les thunks migrés vers StockRepository
 */

import { configureStore } from '@reduxjs/toolkit';
import stocksReducer, {
  loadStocks,
  createStockAliment,
  createStockMouvement,
  loadMouvementsParAliment,
  loadStockStats,
  loadStocksEnAlerte,
} from '../stocksSlice';
import { getDatabase } from '../../database';
import { StockRepository } from '../../../database/repositories';

// Mock des modules
jest.mock('../../../services/database');
jest.mock('../../../database/repositories');

describe('stocksSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        stocks: stocksReducer,
      },
    });

    jest.clearAllMocks();
  });

  describe('Stocks', () => {
    it('devrait charger les stocks avec succès', async () => {
      const mockStocks = [
        {
          id: '1',
          projet_id: 'proj-1',
          nom: 'Maïs',
          quantite_actuelle: 100,
          seuil_alerte: 50,
          unite: 'kg',
        },
        {
          id: '2',
          projet_id: 'proj-1',
          nom: 'Soja',
          quantite_actuelle: 200,
          seuil_alerte: 100,
          unite: 'kg',
        },
      ];

      const mockRepo = {
        findByProjet: jest.fn().mockResolvedValue(mockStocks),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (StockRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(loadStocks('proj-1'));

      const state = store.getState().stocks;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.stocks).toEqual(mockStocks);
      expect(mockRepo.findByProjet).toHaveBeenCalledWith('proj-1');
    });

    it('devrait créer un stock avec succès', async () => {
      const newStock = {
        projet_id: 'proj-1',
        nom: 'Maïs',
        quantite_actuelle: 100,
        seuil_alerte: 50,
        unite: 'kg',
      };

      const createdStock = { id: '1', ...newStock, alerte_active: false };

      const mockRepo = {
        create: jest.fn().mockResolvedValue(createdStock),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (StockRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(createStockAliment(newStock));

      expect(mockRepo.create).toHaveBeenCalledWith(newStock);
    });
  });

  describe('Mouvements de Stock', () => {
    it("devrait créer un mouvement d'entrée", async () => {
      const input = {
        stock_id: 'stock-1',
        type: 'entree' as const,
        quantite: 50,
        notes: 'Livraison',
      };

      const updatedStock = {
        id: 'stock-1',
        projet_id: 'proj-1',
        nom: 'Maïs',
        quantite_actuelle: 150,
        seuil_alerte: 50,
        unite: 'kg',
      };

      const mockRepo = {
        ajouterStock: jest.fn().mockResolvedValue(updatedStock),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (StockRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(createStockMouvement(input));

      expect(mockRepo.ajouterStock).toHaveBeenCalledWith('stock-1', 50, 'Livraison');
    });

    it('devrait créer un mouvement de sortie', async () => {
      const input = {
        stock_id: 'stock-1',
        type: 'sortie' as const,
        quantite: 30,
        notes: 'Consommation',
      };

      const updatedStock = {
        id: 'stock-1',
        projet_id: 'proj-1',
        nom: 'Maïs',
        quantite_actuelle: 70,
        seuil_alerte: 50,
        unite: 'kg',
        alerte_active: false,
      };

      const mockRepo = {
        retirerStock: jest.fn().mockResolvedValue(updatedStock),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (StockRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(createStockMouvement(input));

      expect(mockRepo.retirerStock).toHaveBeenCalledWith('stock-1', 30, 'Consommation');
    });

    it('devrait charger les mouvements par aliment', async () => {
      const mockMouvements = [
        {
          id: '1',
          stock_id: 'stock-1',
          type: 'entree',
          quantite: 100,
          date: '2025-01-01',
        },
        {
          id: '2',
          stock_id: 'stock-1',
          type: 'sortie',
          quantite: 30,
          date: '2025-01-02',
        },
      ];

      const mockRepo = {
        getMouvements: jest.fn().mockResolvedValue(mockMouvements),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (StockRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(loadMouvementsParAliment({ alimentId: 'stock-1', limit: 10 }));

      expect(mockRepo.getMouvements).toHaveBeenCalledWith('stock-1', 10);
    });
  });

  describe('Statistiques et Alertes', () => {
    it('devrait charger les statistiques', async () => {
      const mockStats = {
        nombreStocks: 5,
        stocksEnAlerte: 2,
        valeurTotale: 50000,
      };

      const mockRepo = {
        getStats: jest.fn().mockResolvedValue(mockStats),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (StockRepository as jest.Mock).mockImplementation(() => mockRepo);

      const result = await store.dispatch(loadStockStats('proj-1'));

      expect(mockRepo.getStats).toHaveBeenCalledWith('proj-1');
      expect(result.payload).toEqual(mockStats);
    });

    it('devrait charger les stocks en alerte', async () => {
      const mockStocksEnAlerte = [
        {
          id: '1',
          projet_id: 'proj-1',
          nom: 'Maïs',
          quantite_actuelle: 30,
          seuil_alerte: 50,
          alerte_active: true,
        },
        {
          id: '2',
          projet_id: 'proj-1',
          nom: 'Soja',
          quantite_actuelle: 50,
          seuil_alerte: 100,
          alerte_active: true,
        },
      ];

      const mockRepo = {
        findEnAlerte: jest.fn().mockResolvedValue(mockStocksEnAlerte),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (StockRepository as jest.Mock).mockImplementation(() => mockRepo);

      const result = await store.dispatch(loadStocksEnAlerte('proj-1'));

      expect(mockRepo.findEnAlerte).toHaveBeenCalledWith('proj-1');
      expect(result.payload).toEqual(mockStocksEnAlerte);
    });
  });

  describe("Gestion d'erreurs", () => {
    it('devrait gérer les erreurs lors du chargement', async () => {
      const mockRepo = {
        findByProjet: jest.fn().mockRejectedValue(new Error('Erreur DB')),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (StockRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(loadStocks('proj-1'));

      const state = store.getState().stocks;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Erreur DB');
    });

    it("devrait gérer l'erreur de stock insuffisant", async () => {
      const mockRepo = {
        retirerStock: jest.fn().mockRejectedValue(new Error('Stock insuffisant')),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (StockRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(
        createStockMouvement({
          stock_id: 'stock-1',
          type: 'sortie',
          quantite: 1000,
        })
      );

      const state = store.getState().stocks;
      expect(state.error).toBe('Stock insuffisant');
    });
  });
});
