/**
 * Tests pour productionSlice
 * Teste les thunks migrés vers AnimalRepository et PeseeRepository
 */

import { configureStore } from '@reduxjs/toolkit';
import productionReducer, {
  loadProductionAnimaux,
  createProductionAnimal,
  createPesee,
  loadPeseesParAnimal,
  calculateGMQ,
  getPoidsActuelEstime,
} from '../productionSlice';
import { getDatabase } from '../../database';
import { AnimalRepository, PeseeRepository } from '../../../database/repositories';

// Mock des modules
jest.mock('../../../services/database');
jest.mock('../../../database/repositories');

describe('productionSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        production: productionReducer,
      },
    });

    jest.clearAllMocks();
  });

  describe('Animaux', () => {
    it('devrait charger les animaux avec succès', async () => {
      const mockAnimaux = [
        {
          id: '1',
          projet_id: 'proj-1',
          code: 'A001',
          sexe: 'male',
          race: 'Large White',
          statut: 'actif',
        },
        {
          id: '2',
          projet_id: 'proj-1',
          code: 'A002',
          sexe: 'femelle',
          race: 'Large White',
          statut: 'actif',
        },
      ];

      const mockRepo = {
        findByProjet: jest.fn().mockResolvedValue(mockAnimaux),
        findActifs: jest.fn().mockResolvedValue(mockAnimaux),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (AnimalRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(loadProductionAnimaux({ projetId: 'proj-1', inclureInactifs: true }));

      const state = store.getState().production;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
      expect(mockRepo.findByProjet).toHaveBeenCalledWith('proj-1');
    });

    it('devrait filtrer les animaux actifs seulement', async () => {
      const mockAnimaux = [{ id: '1', projet_id: 'proj-1', code: 'A001', statut: 'actif' }];

      const mockRepo = {
        findByProjet: jest.fn(),
        findActifs: jest.fn().mockResolvedValue(mockAnimaux),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (AnimalRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(loadProductionAnimaux({ projetId: 'proj-1', inclureInactifs: false }));

      expect(mockRepo.findActifs).toHaveBeenCalledWith('proj-1');
      expect(mockRepo.findByProjet).not.toHaveBeenCalled();
    });

    it('devrait créer un animal avec succès', async () => {
      const newAnimal = {
        projet_id: 'proj-1',
        code: 'A003',
        sexe: 'male',
        race: 'Large White',
      };

      const createdAnimal = { id: '3', ...newAnimal, statut: 'actif' };

      const mockRepo = {
        create: jest.fn().mockResolvedValue(createdAnimal),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (AnimalRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(createProductionAnimal(newAnimal));

      expect(mockRepo.create).toHaveBeenCalledWith(newAnimal);
    });
  });

  describe('Pesées', () => {
    it('devrait créer une pesée avec succès', async () => {
      const newPesee = {
        animal_id: 'animal-1',
        date: '2025-01-01',
        poids_kg: 25.5,
      };

      const createdPesee = { id: '1', ...newPesee };

      const mockRepo = {
        create: jest.fn().mockResolvedValue(createdPesee),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (PeseeRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(createPesee(newPesee));

      expect(mockRepo.create).toHaveBeenCalledWith(newPesee);
    });

    it('devrait charger les pesées par animal', async () => {
      const mockPesees = [
        { id: '1', animal_id: 'animal-1', date: '2025-01-01', poids_kg: 20 },
        { id: '2', animal_id: 'animal-1', date: '2025-02-01', poids_kg: 50 },
      ];

      const mockRepo = {
        findByAnimal: jest.fn().mockResolvedValue(mockPesees),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (PeseeRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(loadPeseesParAnimal('animal-1'));

      expect(mockRepo.findByAnimal).toHaveBeenCalledWith('animal-1');
    });
  });

  describe('Calculs GMQ', () => {
    it('devrait calculer le GMQ avec succès', async () => {
      const mockGMQ = 970; // g/jour

      const mockRepo = {
        calculateGMQ: jest.fn().mockResolvedValue(mockGMQ),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (PeseeRepository as jest.Mock).mockImplementation(() => mockRepo);

      const result = await store.dispatch(calculateGMQ('animal-1'));

      expect(mockRepo.calculateGMQ).toHaveBeenCalledWith('animal-1');
      expect(result.payload).toEqual({ animalId: 'animal-1', gmq: 970 });
    });

    it('devrait estimer le poids actuel', async () => {
      const mockPoids = 55.5; // kg

      const mockRepo = {
        getPoidsActuelEstime: jest.fn().mockResolvedValue(mockPoids),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (PeseeRepository as jest.Mock).mockImplementation(() => mockRepo);

      const result = await store.dispatch(getPoidsActuelEstime('animal-1'));

      expect(mockRepo.getPoidsActuelEstime).toHaveBeenCalledWith('animal-1');
      expect(result.payload).toEqual({ animalId: 'animal-1', poids: 55.5 });
    });

    it('devrait gérer le cas où le GMQ est null', async () => {
      const mockRepo = {
        calculateGMQ: jest.fn().mockResolvedValue(null),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (PeseeRepository as jest.Mock).mockImplementation(() => mockRepo);

      const result = await store.dispatch(calculateGMQ('animal-1'));

      expect(result.payload).toEqual({ animalId: 'animal-1', gmq: null });
    });
  });

  describe("Gestion d'erreurs", () => {
    it('devrait gérer les erreurs lors du chargement des animaux', async () => {
      const mockRepo = {
        findByProjet: jest.fn().mockRejectedValue(new Error('Erreur DB')),
      };

      (getDatabase as jest.Mock).mockResolvedValue({});
      (AnimalRepository as jest.Mock).mockImplementation(() => mockRepo);

      await store.dispatch(loadProductionAnimaux({ projetId: 'proj-1', inclureInactifs: true }));

      const state = store.getState().production;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Erreur DB');
    });
  });
});
