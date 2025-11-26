/**
 * Tests d'intégration pour financeSlice
 * Teste l'interaction entre les thunks, reducers, et la base de données
 */

import { configureStore } from '@reduxjs/toolkit';
import financeReducer, {
  createRevenu,
  updateRevenu,
  deleteRevenu,
  createDepensePonctuelle,
  loadRevenus,
  loadDepensesPonctuelles,
} from '../financeSlice';

// Mock de la base de données
jest.mock('../../services/database');
jest.mock('../../database/repositories/FinanceRepository');

describe('financeSlice - Tests d'intégration', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    // Créer un store frais pour chaque test
    store = configureStore({
      reducer: {
        finance: financeReducer,
      },
    });
  });

  describe('Cycle de vie complet d\'un revenu', () => {
    it('devrait créer, charger, modifier et supprimer un revenu', async () => {
      const mockRevenu = {
        id: 'test-revenu-1',
        projet_id: 'test-projet',
        montant: 50000,
        categorie: 'vente_porc' as const,
        date: '2024-01-15',
        poids_kg: 100,
        commentaire: 'Test revenu',
        photos: [],
      };

      // Mocker les méthodes du repository
      const { RevenuRepository } = require('../../database/repositories/FinanceRepository');
      RevenuRepository.prototype.create = jest.fn().mockResolvedValue(mockRevenu);
      RevenuRepository.prototype.findByProjet = jest.fn().mockResolvedValue([mockRevenu]);
      RevenuRepository.prototype.update = jest.fn().mockResolvedValue({
        ...mockRevenu,
        montant: 60000,
      });
      RevenuRepository.prototype.delete = jest.fn().mockResolvedValue(undefined);

      // 1. Créer un revenu
      const createResult = await store.dispatch(
        createRevenu({
          projet_id: 'test-projet',
          montant: 50000,
          categorie: 'vente_porc',
          date: '2024-01-15',
        })
      );

      expect(createResult.type).toBe('finance/createRevenu/fulfilled');
      expect(createResult.payload).toEqual(mockRevenu);

      // Vérifier l'état
      let state = store.getState().finance;
      expect(state.entities.revenus[mockRevenu.id]).toEqual(mockRevenu);

      // 2. Charger les revenus
      const loadResult = await store.dispatch(loadRevenus('test-projet'));
      expect(loadResult.type).toBe('finance/loadRevenus/fulfilled');

      // 3. Modifier le revenu
      const updateResult = await store.dispatch(
        updateRevenu({
          id: mockRevenu.id,
          updates: {
            montant: 60000,
          },
        })
      );

      expect(updateResult.type).toBe('finance/updateRevenu/fulfilled');

      // 4. Supprimer le revenu
      const deleteResult = await store.dispatch(deleteRevenu(mockRevenu.id));
      expect(deleteResult.type).toBe('finance/deleteRevenu/fulfilled');

      // Vérifier que le revenu est supprimé
      state = store.getState().finance;
      expect(state.entities.revenus[mockRevenu.id]).toBeUndefined();
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs de création gracieusement', async () => {
      const { RevenuRepository } = require('../../database/repositories/FinanceRepository');
      RevenuRepository.prototype.create = jest
        .fn()
        .mockRejectedValue(new Error('Erreur DB'));

      const result = await store.dispatch(
        createRevenu({
          projet_id: 'test-projet',
          montant: 50000,
          categorie: 'vente_porc',
          date: '2024-01-15',
        })
      );

      expect(result.type).toBe('finance/createRevenu/rejected');
      expect(result.error.message).toContain('Erreur');

      // Vérifier que l'état n'a pas été corrompu
      const state = store.getState().finance;
      expect(state.error).toBeTruthy();
      expect(Object.keys(state.entities.revenus).length).toBe(0);
    });

    it('devrait gérer les erreurs de chargement', async () => {
      const { RevenuRepository } = require('../../database/repositories/FinanceRepository');
      RevenuRepository.prototype.findByProjet = jest
        .fn()
        .mockRejectedValue(new Error('DB inaccessible'));

      const result = await store.dispatch(loadRevenus('test-projet'));

      expect(result.type).toBe('finance/loadRevenus/rejected');
      expect(result.error.message).toContain('DB inaccessible');
    });
  });

  describe('Opérations concurrentes', () => {
    it('devrait gérer plusieurs créations simultanées', async () => {
      const mockRevenus = [
        {
          id: 'revenu-1',
          projet_id: 'test-projet',
          montant: 50000,
          categorie: 'vente_porc' as const,
          date: '2024-01-15',
        },
        {
          id: 'revenu-2',
          projet_id: 'test-projet',
          montant: 30000,
          categorie: 'vente_autre' as const,
          date: '2024-01-16',
        },
      ];

      const { RevenuRepository } = require('../../database/repositories/FinanceRepository');
      RevenuRepository.prototype.create = jest
        .fn()
        .mockImplementation((data: any) => {
          const revenu = mockRevenus.find((r) => r.montant === data.montant);
          return Promise.resolve(revenu);
        });

      // Créer plusieurs revenus en parallèle
      const results = await Promise.all([
        store.dispatch(
          createRevenu({
            projet_id: 'test-projet',
            montant: 50000,
            categorie: 'vente_porc',
            date: '2024-01-15',
          })
        ),
        store.dispatch(
          createRevenu({
            projet_id: 'test-projet',
            montant: 30000,
            categorie: 'vente_autre',
            date: '2024-01-16',
          })
        ),
      ]);

      // Vérifier que les deux ont réussi
      results.forEach((result) => {
        expect(result.type).toBe('finance/createRevenu/fulfilled');
      });

      // Vérifier l'état
      const state = store.getState().finance;
      expect(Object.keys(state.entities.revenus).length).toBe(2);
    });
  });

  describe('Normalisation des données', () => {
    it('devrait normaliser correctement les revenus chargés', async () => {
      const mockRevenus = [
        {
          id: 'revenu-1',
          projet_id: 'test-projet',
          montant: 50000,
          categorie: 'vente_porc' as const,
          date: '2024-01-15',
        },
        {
          id: 'revenu-2',
          projet_id: 'test-projet',
          montant: 30000,
          categorie: 'vente_autre' as const,
          date: '2024-01-16',
        },
      ];

      const { RevenuRepository } = require('../../database/repositories/FinanceRepository');
      RevenuRepository.prototype.findByProjet = jest.fn().mockResolvedValue(mockRevenus);

      await store.dispatch(loadRevenus('test-projet'));

      const state = store.getState().finance;

      // Vérifier la structure normalisée
      expect(state.ids.revenus).toEqual(['revenu-1', 'revenu-2']);
      expect(state.entities.revenus['revenu-1']).toEqual(mockRevenus[0]);
      expect(state.entities.revenus['revenu-2']).toEqual(mockRevenus[1]);
    });

    it('ne devrait pas dupliquer les données lors de chargements multiples', async () => {
      const mockRevenus = [
        {
          id: 'revenu-1',
          projet_id: 'test-projet',
          montant: 50000,
          categorie: 'vente_porc' as const,
          date: '2024-01-15',
        },
      ];

      const { RevenuRepository } = require('../../database/repositories/FinanceRepository');
      RevenuRepository.prototype.findByProjet = jest.fn().mockResolvedValue(mockRevenus);

      // Charger plusieurs fois
      await store.dispatch(loadRevenus('test-projet'));
      await store.dispatch(loadRevenus('test-projet'));
      await store.dispatch(loadRevenus('test-projet'));

      const state = store.getState().finance;

      // Vérifier qu'il n'y a pas de duplication
      expect(state.ids.revenus.length).toBe(1);
      expect(Object.keys(state.entities.revenus).length).toBe(1);
    });
  });

  describe('États de chargement', () => {
    it('devrait gérer correctement les états loading', async () => {
      const { RevenuRepository } = require('../../database/repositories/FinanceRepository');
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      RevenuRepository.prototype.findByProjet = jest.fn().mockReturnValue(promise);

      // Démarrer le chargement
      const loadPromise = store.dispatch(loadRevenus('test-projet'));

      // Vérifier que loading est true
      let state = store.getState().finance;
      expect(state.loading).toBe(true);

      // Résoudre la promesse
      resolvePromise!([]);
      await loadPromise;

      // Vérifier que loading est false
      state = store.getState().finance;
      expect(state.loading).toBe(false);
    });
  });
});

