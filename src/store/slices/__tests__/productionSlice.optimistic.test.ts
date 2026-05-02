/**
 * Tests pour les optimistic updates dans productionSlice
 */

import { configureStore } from '@reduxjs/toolkit';
import productionReducer, {
  createProductionAnimal,
  updateProductionAnimal,
  deleteProductionAnimal,
} from '../productionSlice';
import apiClient from '../../../services/api/apiClient';
import type { ProductionAnimal } from '../../../types/production';

// Mock apiClient
jest.mock('../../../services/api/apiClient');

describe('productionSlice - Optimistic Updates', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        production: productionReducer,
      },
    });

    jest.clearAllMocks();
  });

  describe('createProductionAnimal - Optimistic Update', () => {
    it('devrait créer un animal temporaire immédiatement (optimistic)', async () => {
      const newAnimalInput = {
        projet_id: 'proj-1',
        code: 'A003',
        sexe: 'male' as const,
        race: 'Large White',
        statut: 'actif' as const,
      };

      const createdAnimal: ProductionAnimal = {
        id: 'animal-3',
        ...newAnimalInput,
        date_entree: '2024-01-01',
      };

      // Simuler un délai pour la réponse API
      (apiClient.post as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(createdAnimal), 100))
      );

      const dispatchPromise = store.dispatch(
        createProductionAnimal(newAnimalInput)
      );

      // Vérifier immédiatement que l'animal temporaire est présent
      const statePending = store.getState().production;
      const tempAnimalId = Object.keys(statePending.optimisticUpdates.animaux).find((id) =>
        id.startsWith('temp-')
      );
      expect(tempAnimalId).toBeDefined();
      expect(statePending.ids.animaux).toContain(tempAnimalId);

      // Attendre la réponse
      await dispatchPromise;

      // Vérifier que l'animal temporaire est remplacé par le vrai
      const stateFinal = store.getState().production;
      expect(stateFinal.ids.animaux).toContain('animal-3');
      expect(stateFinal.ids.animaux).not.toContain(tempAnimalId);
      expect(stateFinal.optimisticUpdates.animaux[tempAnimalId]).toBeUndefined();
    });

    it('devrait faire un rollback en cas d\'erreur lors de la création', async () => {
      const newAnimalInput = {
        projet_id: 'proj-1',
        code: 'A003',
        sexe: 'male' as const,
        statut: 'actif' as const,
      };

      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Erreur réseau'));

      await store.dispatch(createProductionAnimal(newAnimalInput));

      const state = store.getState().production;
      
      // Vérifier que l'animal temporaire a été supprimé
      const tempAnimalIds = Object.keys(state.optimisticUpdates.animaux).filter((id) =>
        id.startsWith('temp-')
      );
      expect(tempAnimalIds).toHaveLength(0);
      expect(state.error).toBeTruthy();
    });
  });

  describe('updateProductionAnimal - Optimistic Update', () => {
    it('devrait mettre à jour l\'animal immédiatement (optimistic)', async () => {
      // Créer un animal dans le state
      const existingAnimal: ProductionAnimal = {
        id: 'animal-1',
        projet_id: 'proj-1',
        code: 'A001',
        sexe: 'male',
        statut: 'actif',
        date_entree: '2024-01-01',
        nom: 'Ancien nom',
      };

      // Ajouter l'animal au state manuellement
      store.dispatch({
        type: 'production/loadAnimaux/fulfilled',
        payload: [existingAnimal],
      });

      const updates = { nom: 'Nouveau nom' };
      const updatedAnimal = { ...existingAnimal, ...updates };

      (apiClient.patch as jest.Mock).mockResolvedValue(updatedAnimal);

      const dispatchPromise = store.dispatch(
        updateProductionAnimal({ id: 'animal-1', updates })
      );

      // Vérifier immédiatement que l'animal est mis à jour
      const statePending = store.getState().production;
      expect(statePending.entities.animaux['animal-1'].nom).toBe('Nouveau nom');
      
      // Vérifier qu'une sauvegarde est créée
      expect(statePending.optimisticUpdates.animaux['animal-1']).toBeDefined();
      expect(statePending.optimisticUpdates.animaux['animal-1'].nom).toBe('Ancien nom');

      // Attendre la réponse
      await dispatchPromise;

      // Vérifier que la sauvegarde est supprimée après succès
      const stateFinal = store.getState().production;
      expect(stateFinal.optimisticUpdates.animaux['animal-1']).toBeUndefined();
      expect(stateFinal.entities.animaux['animal-1'].nom).toBe('Nouveau nom');
    });

    it('devrait faire un rollback en cas d\'erreur lors de la mise à jour', async () => {
      const existingAnimal: ProductionAnimal = {
        id: 'animal-1',
        projet_id: 'proj-1',
        code: 'A001',
        sexe: 'male',
        statut: 'actif',
        date_entree: '2024-01-01',
        nom: 'Ancien nom',
      };

      store.dispatch({
        type: 'production/loadAnimaux/fulfilled',
        payload: [existingAnimal],
      });

      const updates = { nom: 'Nouveau nom' };

      (apiClient.patch as jest.Mock).mockRejectedValue(new Error('Erreur réseau'));

      await store.dispatch(updateProductionAnimal({ id: 'animal-1', updates }));

      const state = store.getState().production;
      
      // Vérifier que l'animal est restauré
      expect(state.entities.animaux['animal-1'].nom).toBe('Ancien nom');
      expect(state.optimisticUpdates.animaux['animal-1']).toBeUndefined();
      expect(state.error).toBeTruthy();
    });
  });

  describe('deleteProductionAnimal - Optimistic Update', () => {
    it('devrait supprimer l\'animal immédiatement (optimistic)', async () => {
      const existingAnimal: ProductionAnimal = {
        id: 'animal-1',
        projet_id: 'proj-1',
        code: 'A001',
        sexe: 'male',
        statut: 'actif',
        date_entree: '2024-01-01',
      };

      // Ajouter l'animal et des pesées
      store.dispatch({
        type: 'production/loadAnimaux/fulfilled',
        payload: [existingAnimal],
      });

      store.dispatch({
        type: 'production/loadPeseesParAnimal/fulfilled',
        payload: {
          animalId: 'animal-1',
          pesees: [
            {
              id: 'pesee-1',
              animal_id: 'animal-1',
              poids_kg: 50,
              date: '2024-01-15',
            },
          ],
        },
      });

      (apiClient.delete as jest.Mock).mockResolvedValue({});

      const dispatchPromise = store.dispatch(deleteProductionAnimal('animal-1'));

      // Attendre la réponse
      await dispatchPromise;

      const state = store.getState().production;

      // Vérifier que l'animal et ses pesées sont supprimés
      expect(state.ids.animaux).not.toContain('animal-1');
      expect(state.entities.animaux['animal-1']).toBeUndefined();
      expect(state.entities.pesees['pesee-1']).toBeUndefined();
      expect(state.ids.pesees).not.toContain('pesee-1');
      expect(state.optimisticUpdates.animaux['animal-1']).toBeUndefined();
    });

    it('devrait faire un rollback en cas d\'erreur lors de la suppression', async () => {
      const existingAnimal: ProductionAnimal = {
        id: 'animal-1',
        projet_id: 'proj-1',
        code: 'A001',
        sexe: 'male',
        statut: 'actif',
        date_entree: '2024-01-01',
      };

      store.dispatch({
        type: 'production/loadAnimaux/fulfilled',
        payload: [existingAnimal],
      });

      (apiClient.delete as jest.Mock).mockRejectedValue(new Error('Erreur réseau'));

      await store.dispatch(deleteProductionAnimal('animal-1'));

      const state = store.getState().production;

      // Vérifier que l'animal est restauré
      expect(state.ids.animaux).toContain('animal-1');
      expect(state.entities.animaux['animal-1']).toBeDefined();
      expect(state.error).toBeTruthy();
    });
  });
});
