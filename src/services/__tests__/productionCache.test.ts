/**
 * Tests pour productionCache
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCachedAnimaux,
  setCachedAnimaux,
  getCachedPesees,
  setCachedPesees,
  invalidateAnimalCache,
  invalidateProjetCache,
  clearProductionCache,
} from '../productionCache';
import type { ProductionAnimal, ProductionPesee } from '../../types/production';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
  getAllKeys: jest.fn(),
}));

describe('productionCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCachedAnimaux', () => {
    it('devrait retourner les animaux du cache s\'ils sont valides', async () => {
      const projetId = 'projet-1';
      const animaux: ProductionAnimal[] = [
        {
          id: 'animal-1',
          code: 'A001',
          projet_id: projetId,
          statut: 'actif',
          date_entree: '2024-01-01',
          sexe: 'M',
        },
      ];

      const cachedData = {
        animaux,
        projetId,
        timestamp: Date.now() - 1000, // Il y a 1 seconde
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const result = await getCachedAnimaux(projetId);

      expect(result).toEqual(animaux);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@production_animaux_cache_projet-1');
    });

    it('devrait retourner null si le cache est expiré', async () => {
      const projetId = 'projet-1';
      const cachedData = {
        animaux: [],
        projetId,
        timestamp: Date.now() - 11 * 60 * 1000, // Il y a 11 minutes (expiré)
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await getCachedAnimaux(projetId);

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('devrait retourner null si le cache n\'existe pas', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getCachedAnimaux('projet-1');

      expect(result).toBeNull();
    });
  });

  describe('setCachedAnimaux', () => {
    it('devrait stocker les animaux dans le cache', async () => {
      const projetId = 'projet-1';
      const animaux: ProductionAnimal[] = [
        {
          id: 'animal-1',
          code: 'A001',
          projet_id: projetId,
          statut: 'actif',
          date_entree: '2024-01-01',
          sexe: 'M',
        },
      ];

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);

      await setCachedAnimaux(animaux, projetId);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@production_animaux_cache_projet-1',
        expect.stringContaining('"animaux"')
      );
    });
  });

  describe('getCachedPesees', () => {
    it('devrait retourner les pesées du cache par animal', async () => {
      const animalId = 'animal-1';
      const pesees: ProductionPesee[] = [
        {
          id: 'pesee-1',
          animal_id: animalId,
          poids_kg: 50,
          date: '2024-01-15',
        },
      ];

      const cachedData = {
        pesees,
        animalId,
        timestamp: Date.now() - 1000,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const result = await getCachedPesees(animalId);

      expect(result).toEqual(pesees);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@production_pesees_cache_animal_animal-1');
    });

    it('devrait retourner les pesées du cache par projet', async () => {
      const projetId = 'projet-1';
      const pesees: ProductionPesee[] = [
        {
          id: 'pesee-1',
          animal_id: 'animal-1',
          poids_kg: 50,
          date: '2024-01-15',
        },
      ];

      const cachedData = {
        pesees,
        projetId,
        timestamp: Date.now() - 1000,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const result = await getCachedPesees(undefined, projetId);

      expect(result).toEqual(pesees);
    });

    it('devrait retourner null si le cache est expiré', async () => {
      const animalId = 'animal-1';
      const cachedData = {
        pesees: [],
        animalId,
        timestamp: Date.now() - 11 * 60 * 1000, // Expiré
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await getCachedPesees(animalId);

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('setCachedPesees', () => {
    it('devrait stocker les pesées dans le cache', async () => {
      const animalId = 'animal-1';
      const pesees: ProductionPesee[] = [
        {
          id: 'pesee-1',
          animal_id: animalId,
          poids_kg: 50,
          date: '2024-01-15',
        },
      ];

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await setCachedPesees(pesees, animalId);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@production_pesees_cache_animal_animal-1',
        expect.stringContaining('"pesees"')
      );
    });
  });

  describe('invalidateAnimalCache', () => {
    it('devrait supprimer le cache d\'un animal', async () => {
      const animalId = 'animal-1';
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await invalidateAnimalCache(animalId);

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@production_pesees_cache_animal_animal-1');
    });
  });

  describe('invalidateProjetCache', () => {
    it('devrait supprimer le cache d\'un projet', async () => {
      const projetId = 'projet-1';
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      await invalidateProjetCache(projetId);

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@production_animaux_cache_projet-1',
        '@production_pesees_cache_projet_projet-1',
      ]);
    });
  });

  describe('clearProductionCache', () => {
    it('devrait supprimer tout le cache de production', async () => {
      const keys = [
        '@production_animaux_cache_projet-1',
        '@production_pesees_cache_animal_animal-1',
        '@other_key',
      ];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(keys);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      await clearProductionCache();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@production_animaux_cache_projet-1',
        '@production_pesees_cache_animal_animal-1',
      ]);
    });
  });
});
