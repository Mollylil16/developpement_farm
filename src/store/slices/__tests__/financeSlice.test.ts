/**
 * Tests pour financeSlice
 * Teste les thunks migrés vers les Repositories
 */

import { configureStore } from '@reduxjs/toolkit';
import financeReducer, {
  createRevenu,
  loadRevenus,
  updateRevenu,
  deleteRevenu,
  createDepensePonctuelle,
  loadDepensesPonctuelles,
  createChargeFixe,
  loadChargesFixes,
} from '../financeSlice';
import { getDatabase } from '../../../services/database';
import { RevenuRepository, DepensePonctuelleRepository, ChargeFixeRepository } from '../../../database/repositories';

// Mock des modules
jest.mock('../../../services/database');
jest.mock('../../../database/repositories');

describe('financeSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        finance: financeReducer,
      },
    });

    // Reset tous les mocks
    jest.clearAllMocks();
  });

  describe('Revenus', () => {
    it('devrait charger les revenus avec succès', async () => {
      const mockRevenus = [
        { id: '1', projet_id: 'proj-1', montant: 1000, type: 'vente', date: '2025-01-01' },
        { id: '2', projet_id: 'proj-1', montant: 2000, type: 'vente', date: '2025-01-02' },
      ];

      const mockRepo = {
        findByProjet: jest.fn().mockResolvedValue(mockRevenus),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (RevenuRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(loadRevenus('proj-1'));

      const state = store.getState().finance;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
      expect(mockRepo.findByProjet).toHaveBeenCalledWith('proj-1');
    });

    it('devrait créer un revenu avec succès', async () => {
      const newRevenu = {
        projet_id: 'proj-1',
        montant: 1000,
        type: 'vente',
        date: '2025-01-01',
      };

      const createdRevenu = { id: '1', ...newRevenu };

      const mockRepo = {
        create: jest.fn().mockResolvedValue(createdRevenu),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (RevenuRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(createRevenu(newRevenu));

      const state = store.getState().finance;
      expect(state.loading).toBe(false);
      expect(mockRepo.create).toHaveBeenCalledWith(newRevenu);
    });

    it('devrait gérer les erreurs lors du chargement', async () => {
      const mockRepo = {
        findByProjet: jest.fn().mockRejectedValue(new Error('Erreur DB')),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (RevenuRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(loadRevenus('proj-1'));

      const state = store.getState().finance;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Erreur DB');
    });
  });

  describe('Dépenses Ponctuelles', () => {
    it('devrait charger les dépenses avec succès', async () => {
      const mockDepenses = [
        { id: '1', projet_id: 'proj-1', montant: 500, type: 'achat', date: '2025-01-01' },
      ];

      const mockRepo = {
        findByProjet: jest.fn().mockResolvedValue(mockDepenses),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (DepensePonctuelleRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(loadDepensesPonctuelles('proj-1'));

      expect(mockRepo.findByProjet).toHaveBeenCalledWith('proj-1');
    });

    it('devrait créer une dépense avec succès', async () => {
      const newDepense = {
        projet_id: 'proj-1',
        montant: 500,
        type: 'achat',
        date: '2025-01-01',
      };

      const createdDepense = { id: '1', ...newDepense };

      const mockRepo = {
        create: jest.fn().mockResolvedValue(createdDepense),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (DepensePonctuelleRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(createDepensePonctuelle(newDepense));

      expect(mockRepo.create).toHaveBeenCalledWith(newDepense);
    });
  });

  describe('Charges Fixes', () => {
    it('devrait charger les charges fixes avec succès', async () => {
      const mockCharges = [
        { id: '1', projet_id: 'proj-1', montant: 100, nom: 'Loyer', statut: 'actif' },
      ];

      const mockRepo = {
        findByProjet: jest.fn().mockResolvedValue(mockCharges),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (ChargeFixeRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(loadChargesFixes('proj-1'));

      expect(mockRepo.findByProjet).toHaveBeenCalledWith('proj-1');
    });

    it('devrait créer une charge fixe avec succès', async () => {
      const newCharge = {
        projet_id: 'proj-1',
        montant: 100,
        nom: 'Loyer',
      };

      const createdCharge = { id: '1', ...newCharge, statut: 'actif' };

      const mockRepo = {
        create: jest.fn().mockResolvedValue(createdCharge),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (ChargeFixeRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(createChargeFixe(newCharge));

      expect(mockRepo.create).toHaveBeenCalledWith({ ...newCharge, statut: 'actif' });
    });
  });
});

