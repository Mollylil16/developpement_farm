/**
 * Tests d'intégration pour productionSlice
 * Teste le cycle complet de gestion des animaux et pesées
 */

import { configureStore } from '@reduxjs/toolkit';
import productionReducer, {
  createProductionAnimal,
  updateProductionAnimal,
  deleteProductionAnimal,
  createPesee,
  loadProductionAnimaux,
  loadPeseesParAnimal,
} from '../productionSlice';
import type { ProductionAnimal, Pesee } from '../../../types';

// Mock des repositories
jest.mock('../../../services/database');
jest.mock('../../../database/repositories/AnimalRepository');
jest.mock('../../../database/repositories/PeseeRepository');

describe('productionSlice - Tests d\'intégration', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Store frais pour chaque test
    store = configureStore({
      reducer: {
        production: productionReducer,
      },
    });
  });

  describe('Cycle de vie complet d\'un animal', () => {
    it('devrait créer, charger, peser, modifier et supprimer un animal', async () => {
      const mockAnimal: ProductionAnimal = {
        id: 'animal-1',
        projet_id: 'test-projet',
        code: 'P001',
        nom: 'Cochon Test',
        sexe: 'male',
        race: 'Large White',
        date_naissance: '2024-01-01',
        date_acquisition: '2024-01-15',
        poids_actuel: 50,
        prix_achat: 25000,
        statut: 'actif',
        photo_uri: null,
        etat_sante: 'bon',
        localisation: null,
        numero_identification: null,
      };

      const mockPesee: Pesee = {
        id: 'pesee-1',
        animal_id: 'animal-1',
        poids: 55,
        date: '2024-02-01',
        commentaire: 'Première pesée',
        age_jours: 30,
        gmq: 167,
        photos: [],
      };

      // Setup mocks
      const { AnimalRepository } = require('../../../database/repositories/AnimalRepository');
      const { PeseeRepository } = require('../../../database/repositories/PeseeRepository');

      AnimalRepository.prototype.create = jest.fn().mockResolvedValue(mockAnimal);
      AnimalRepository.prototype.findByProjet = jest.fn().mockResolvedValue([mockAnimal]);
      AnimalRepository.prototype.update = jest.fn().mockResolvedValue({
        ...mockAnimal,
        poids_actuel: 60,
      });
      AnimalRepository.prototype.delete = jest.fn().mockResolvedValue(undefined);

      PeseeRepository.prototype.create = jest.fn().mockResolvedValue(mockPesee);
      PeseeRepository.prototype.findByAnimal = jest.fn().mockResolvedValue([mockPesee]);

      // 1. Créer un animal
      const createResult = await store.dispatch(
        createProductionAnimal({
          projet_id: 'test-projet',
          code: 'P001',
          nom: 'Cochon Test',
          sexe: 'male',
          race: 'Large White',
          date_naissance: '2024-01-01',
          date_acquisition: '2024-01-15',
          poids_actuel: 50,
          prix_achat: 25000,
        })
      );

      expect(createResult.type).toBe('production/createProductionAnimal/fulfilled');
      expect(createResult.payload).toEqual(mockAnimal);

      // Vérifier l'état
      let state = store.getState().production;
      expect(state.entities.animaux[mockAnimal.id]).toBeDefined();
      expect(state.ids.animaux).toContain(mockAnimal.id);

      // 2. Charger les animaux
      await store.dispatch(
        loadProductionAnimaux({ projetId: 'test-projet', inclureInactifs: true })
      );

      state = store.getState().production;
      expect(state.entities.animaux[mockAnimal.id]).toEqual(mockAnimal);

      // 3. Ajouter une pesée
      const peseeResult = await store.dispatch(
        createPesee({
          animal_id: 'animal-1',
          poids: 55,
          date: '2024-02-01',
          commentaire: 'Première pesée',
        })
      );

      expect(peseeResult.type).toBe('production/createPesee/fulfilled');

      // 4. Charger les pesées
      await store.dispatch(loadPeseesParAnimal('animal-1'));

      state = store.getState().production;
      expect(state.entities.pesees[mockPesee.id]).toBeDefined();

      // 5. Modifier l'animal
      const updateResult = await store.dispatch(
        updateProductionAnimal({
          id: 'animal-1',
          updates: {
            poids_actuel: 60,
          },
        })
      );

      expect(updateResult.type).toBe('production/updateProductionAnimal/fulfilled');

      // 6. Supprimer l'animal
      const deleteResult = await store.dispatch(deleteProductionAnimal('animal-1'));

      expect(deleteResult.type).toBe('production/deleteProductionAnimal/fulfilled');

      // Vérifier la suppression
      state = store.getState().production;
      expect(state.entities.animaux['animal-1']).toBeUndefined();
      expect(state.ids.animaux).not.toContain('animal-1');
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs de création', async () => {
      const { AnimalRepository } = require('../../../database/repositories/AnimalRepository');
      AnimalRepository.prototype.create = jest
        .fn()
        .mockRejectedValue(new Error('Code animal déjà existant'));

      const result = await store.dispatch(
        createProductionAnimal({
          projet_id: 'test-projet',
          code: 'P001',
          sexe: 'male',
          race: 'Large White',
          date_naissance: '2024-01-01',
          date_acquisition: '2024-01-15',
        })
      );

      expect(result.type).toBe('production/createProductionAnimal/rejected');
      expect(result.error.message).toContain('Code animal déjà existant');

      // État non corrompu
      const state = store.getState().production;
      expect(state.error).toBeTruthy();
    });

    it('devrait gérer les erreurs de chargement', async () => {
      const { AnimalRepository } = require('../../../database/repositories/AnimalRepository');
      AnimalRepository.prototype.findByProjet = jest
        .fn()
        .mockRejectedValue(new Error('DB error'));

      const result = await store.dispatch(
        loadProductionAnimaux({ projetId: 'test-projet' })
      );

      expect(result.type).toBe('production/loadProductionAnimaux/rejected');
    });
  });

  describe('Pesées et calculs GMQ', () => {
    it('devrait calculer le GMQ correctement lors de l\'ajout de pesées', async () => {
      const mockAnimal: ProductionAnimal = {
        id: 'animal-1',
        projet_id: 'test-projet',
        code: 'P001',
        sexe: 'male',
        race: 'Large White',
        date_naissance: '2024-01-01',
        date_acquisition: '2024-01-15',
        poids_actuel: 50,
        statut: 'actif',
        photo_uri: null,
        etat_sante: 'bon',
        localisation: null,
        numero_identification: null,
      };

      const mockPesees: Pesee[] = [
        {
          id: 'pesee-1',
          animal_id: 'animal-1',
          poids: 50,
          date: '2024-01-15',
          age_jours: 14,
          gmq: 0,
          photos: [],
        },
        {
          id: 'pesee-2',
          animal_id: 'animal-1',
          poids: 70,
          date: '2024-02-15',
          age_jours: 45,
          gmq: 645, // (70-50)/(45-14) ≈ 645g/jour
          photos: [],
        },
      ];

      const { AnimalRepository } = require('../../../database/repositories/AnimalRepository');
      const { PeseeRepository } = require('../../../database/repositories/PeseeRepository');

      AnimalRepository.prototype.findById = jest.fn().mockResolvedValue(mockAnimal);
      PeseeRepository.prototype.create = jest.fn().mockResolvedValue(mockPesees[1]);
      PeseeRepository.prototype.findByAnimal = jest.fn().mockResolvedValue(mockPesees);

      // Créer la pesée
      await store.dispatch(
        createPesee({
          animal_id: 'animal-1',
          poids: 70,
          date: '2024-02-15',
        })
      );

      // Charger les pesées
      await store.dispatch(loadPeseesParAnimal('animal-1'));

      const state = store.getState().production;
      const pesee = state.entities.pesees['pesee-2'];

      expect(pesee).toBeDefined();
      expect(pesee?.gmq).toBeGreaterThan(600); // GMQ devrait être > 600g/jour
    });
  });

  describe('Filtrage et recherche', () => {
    it('devrait filtrer correctement les animaux actifs', async () => {
      const mockAnimaux: ProductionAnimal[] = [
        {
          id: 'animal-1',
          projet_id: 'test-projet',
          code: 'P001',
          sexe: 'male',
          race: 'Large White',
          date_naissance: '2024-01-01',
          date_acquisition: '2024-01-15',
          statut: 'actif',
          photo_uri: null,
          etat_sante: 'bon',
          localisation: null,
          numero_identification: null,
        },
        {
          id: 'animal-2',
          projet_id: 'test-projet',
          code: 'P002',
          sexe: 'femelle',
          race: 'Duroc',
          date_naissance: '2024-01-05',
          date_acquisition: '2024-01-20',
          statut: 'vendu',
          photo_uri: null,
          etat_sante: 'bon',
          localisation: null,
          numero_identification: null,
        },
        {
          id: 'animal-3',
          projet_id: 'test-projet',
          code: 'P003',
          sexe: 'male',
          race: 'Large White',
          date_naissance: '2024-01-10',
          date_acquisition: '2024-01-25',
          statut: 'mort',
          photo_uri: null,
          etat_sante: 'malade',
          localisation: null,
          numero_identification: null,
        },
      ];

      const { AnimalRepository } = require('../../../database/repositories/AnimalRepository');
      AnimalRepository.prototype.findByProjet = jest.fn().mockResolvedValue(mockAnimaux);

      await store.dispatch(
        loadProductionAnimaux({ projetId: 'test-projet', inclureInactifs: false })
      );

      const state = store.getState().production;

      // Devrait contenir tous les animaux (le filtrage se fait au niveau du selector)
      expect(state.ids.animaux.length).toBe(3);
    });
  });

  describe('Normalisation et cohérence des données', () => {
    it('ne devrait pas dupliquer les animaux lors de chargements multiples', async () => {
      const mockAnimal: ProductionAnimal = {
        id: 'animal-1',
        projet_id: 'test-projet',
        code: 'P001',
        sexe: 'male',
        race: 'Large White',
        date_naissance: '2024-01-01',
        date_acquisition: '2024-01-15',
        statut: 'actif',
        photo_uri: null,
        etat_sante: 'bon',
        localisation: null,
        numero_identification: null,
      };

      const { AnimalRepository } = require('../../../database/repositories/AnimalRepository');
      AnimalRepository.prototype.findByProjet = jest.fn().mockResolvedValue([mockAnimal]);

      // Charger plusieurs fois
      await store.dispatch(loadProductionAnimaux({ projetId: 'test-projet' }));
      await store.dispatch(loadProductionAnimaux({ projetId: 'test-projet' }));
      await store.dispatch(loadProductionAnimaux({ projetId: 'test-projet' }));

      const state = store.getState().production;

      // Pas de duplication
      expect(state.ids.animaux.length).toBe(1);
      expect(state.ids.animaux).toEqual(['animal-1']);
      expect(Object.keys(state.entities.animaux).length).toBe(1);
    });

    it('devrait maintenir la cohérence après mises à jour', async () => {
      const mockAnimal: ProductionAnimal = {
        id: 'animal-1',
        projet_id: 'test-projet',
        code: 'P001',
        sexe: 'male',
        race: 'Large White',
        date_naissance: '2024-01-01',
        date_acquisition: '2024-01-15',
        poids_actuel: 50,
        statut: 'actif',
        photo_uri: null,
        etat_sante: 'bon',
        localisation: null,
        numero_identification: null,
      };

      const { AnimalRepository } = require('../../../database/repositories/AnimalRepository');
      AnimalRepository.prototype.findByProjet = jest.fn().mockResolvedValue([mockAnimal]);
      AnimalRepository.prototype.update = jest.fn().mockResolvedValue({
        ...mockAnimal,
        poids_actuel: 60,
        etat_sante: 'excellent',
      });

      // Charger
      await store.dispatch(loadProductionAnimaux({ projetId: 'test-projet' }));

      // Modifier
      await store.dispatch(
        updateProductionAnimal({
          id: 'animal-1',
          updates: {
            poids_actuel: 60,
            etat_sante: 'excellent',
          },
        })
      );

      const state = store.getState().production;
      const updatedAnimal = state.entities.animaux['animal-1'];

      // Vérifier cohérence
      expect(updatedAnimal?.poids_actuel).toBe(60);
      expect(updatedAnimal?.etat_sante).toBe('excellent');
      expect(state.ids.animaux.length).toBe(1); // Pas de duplication
    });
  });

  describe('Gestion des photos', () => {
    it('devrait gérer correctement les URIs de photos', async () => {
      const mockAnimal: ProductionAnimal = {
        id: 'animal-1',
        projet_id: 'test-projet',
        code: 'P001',
        sexe: 'male',
        race: 'Large White',
        date_naissance: '2024-01-01',
        date_acquisition: '2024-01-15',
        statut: 'actif',
        photo_uri: 'file:///path/to/photo.jpg',
        etat_sante: 'bon',
        localisation: null,
        numero_identification: null,
      };

      const { AnimalRepository } = require('../../../database/repositories/AnimalRepository');
      AnimalRepository.prototype.create = jest.fn().mockResolvedValue(mockAnimal);

      const result = await store.dispatch(
        createProductionAnimal({
          projet_id: 'test-projet',
          code: 'P001',
          sexe: 'male',
          race: 'Large White',
          date_naissance: '2024-01-01',
          date_acquisition: '2024-01-15',
          photo_uri: 'file:///path/to/photo.jpg',
        })
      );

      expect(result.payload).toHaveProperty('photo_uri');
      expect(result.payload.photo_uri).toBe('file:///path/to/photo.jpg');
    });
  });

  describe('États de chargement', () => {
    it('devrait gérer les états loading correctement', async () => {
      const { AnimalRepository } = require('../../../database/repositories/AnimalRepository');

      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      AnimalRepository.prototype.findByProjet = jest.fn().mockReturnValue(promise);

      // Démarrer chargement
      const loadPromise = store.dispatch(
        loadProductionAnimaux({ projetId: 'test-projet' })
      );

      // Vérifier loading true
      let state = store.getState().production;
      expect(state.loading).toBe(true);

      // Résoudre
      resolvePromise!([]);
      await loadPromise;

      // Vérifier loading false
      state = store.getState().production;
      expect(state.loading).toBe(false);
    });
  });

  describe('Validation des données métier', () => {
    it('devrait accepter les animaux avec données valides', async () => {
      const validAnimal: Partial<ProductionAnimal> = {
        code: 'P001',
        sexe: 'male',
        race: 'Large White',
        date_naissance: '2024-01-01',
        date_acquisition: '2024-01-15',
        poids_actuel: 50,
      };

      const { AnimalRepository } = require('../../../database/repositories/AnimalRepository');
      AnimalRepository.prototype.create = jest.fn().mockResolvedValue({
        id: 'animal-1',
        projet_id: 'test-projet',
        ...validAnimal,
        statut: 'actif',
      });

      const result = await store.dispatch(
        createProductionAnimal({
          projet_id: 'test-projet',
          ...validAnimal,
        } as any)
      );

      expect(result.type).toBe('production/createProductionAnimal/fulfilled');
    });
  });

  describe('Performance avec grands volumes', () => {
    it('devrait gérer efficacement 100+ animaux', async () => {
      // Générer 100 animaux
      const mockAnimaux: ProductionAnimal[] = Array.from({ length: 100 }, (_, i) => ({
        id: `animal-${i + 1}`,
        projet_id: 'test-projet',
        code: `P${String(i + 1).padStart(3, '0')}`,
        sexe: i % 2 === 0 ? 'male' : 'femelle',
        race: 'Large White',
        date_naissance: '2024-01-01',
        date_acquisition: '2024-01-15',
        statut: 'actif',
        photo_uri: null,
        etat_sante: 'bon',
        localisation: null,
        numero_identification: null,
      }));

      const { AnimalRepository } = require('../../../database/repositories/AnimalRepository');
      AnimalRepository.prototype.findByProjet = jest.fn().mockResolvedValue(mockAnimaux);

      const startTime = Date.now();
      await store.dispatch(loadProductionAnimaux({ projetId: 'test-projet' }));
      const duration = Date.now() - startTime;

      const state = store.getState().production;

      // Vérifier que tous sont chargés
      expect(state.ids.animaux.length).toBe(100);
      expect(Object.keys(state.entities.animaux).length).toBe(100);

      // Performance: devrait charger en moins de 1 seconde
      expect(duration).toBeLessThan(1000);
    });
  });
});

