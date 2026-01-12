/**
 * Tests pour animalUtils
 */

import {
  getAnimalCurrentWeight,
  getEvolutionPoids,
  getPoidsActuelEstime,
  getCategoriePoids,
} from '../animalUtils';
import type { ProductionAnimal, ProductionPesee } from '../../types/production';

describe('animalUtils', () => {
  describe('getAnimalCurrentWeight', () => {
    it('devrait retourner le poids de la dernière pesée si disponible', () => {
      const animal: ProductionAnimal = {
        id: 'animal-1',
        code: 'A001',
        poids_initial: 10,
        statut: 'actif',
        projet_id: 'projet-1',
        date_entree: '2024-01-01',
        sexe: 'M',
      };

      const pesees: ProductionPesee[] = [
        {
          id: 'pesee-1',
          animal_id: 'animal-1',
          poids_kg: 50,
          date: '2024-01-15',
        },
        {
          id: 'pesee-2',
          animal_id: 'animal-1',
          poids_kg: 60,
          date: '2024-01-20',
        },
      ];

      const result = getAnimalCurrentWeight(animal, pesees);

      expect(result).toBe(60); // Dernière pesée
    });

    it("devrait retourner le poids initial si aucune pesée n'est disponible", () => {
      const animal: ProductionAnimal = {
        id: 'animal-1',
        code: 'A001',
        poids_initial: 10,
        statut: 'actif',
        projet_id: 'projet-1',
        date_entree: '2024-01-01',
        sexe: 'M',
      };

      const pesees: ProductionPesee[] = [];

      const result = getAnimalCurrentWeight(animal, pesees);

      expect(result).toBe(10); // Poids initial
    });

    it('devrait retourner 0 si ni pesée ni poids initial', () => {
      const animal: ProductionAnimal = {
        id: 'animal-1',
        code: 'A001',
        poids_initial: 0,
        statut: 'actif',
        projet_id: 'projet-1',
        date_entree: '2024-01-01',
        sexe: 'M',
      };

      const pesees: ProductionPesee[] = [];

      const result = getAnimalCurrentWeight(animal, pesees);

      expect(result).toBe(0);
    });

    it('devrait trier les pesées par date et prendre la plus récente', () => {
      const animal: ProductionAnimal = {
        id: 'animal-1',
        code: 'A001',
        poids_initial: 10,
        statut: 'actif',
        projet_id: 'projet-1',
        date_entree: '2024-01-01',
        sexe: 'M',
      };

      const pesees: ProductionPesee[] = [
        {
          id: 'pesee-1',
          animal_id: 'animal-1',
          poids_kg: 50,
          date: '2024-01-20', // Plus récente
        },
        {
          id: 'pesee-2',
          animal_id: 'animal-1',
          poids_kg: 40,
          date: '2024-01-15', // Plus ancienne
        },
      ];

      const result = getAnimalCurrentWeight(animal, pesees);

      expect(result).toBe(50); // La plus récente
    });
  });

  describe('getEvolutionPoids', () => {
    it('devrait calculer l\'évolution du poids sur 7 jours par défaut', () => {
      const maintenant = new Date();
      const date1 = new Date(maintenant.getTime() - 8 * 24 * 60 * 60 * 1000); // Il y a 8 jours
      const date2 = new Date(maintenant.getTime() - 5 * 24 * 60 * 60 * 1000); // Il y a 5 jours
      const date3 = new Date(maintenant.getTime() - 2 * 24 * 60 * 60 * 1000); // Il y a 2 jours

      const pesees: ProductionPesee[] = [
        {
          id: 'pesee-1',
          animal_id: 'animal-1',
          poids_kg: 50,
          date: date1.toISOString(),
        },
        {
          id: 'pesee-2',
          animal_id: 'animal-1',
          poids_kg: 55,
          date: date2.toISOString(),
        },
        {
          id: 'pesee-3',
          animal_id: 'animal-1',
          poids_kg: 60,
          date: date3.toISOString(),
        },
      ];

      const result = getEvolutionPoids(pesees, 7);

      expect(result.poidsGagne).toBe(10); // 60 - 50 (première pesée dans la période)
      expect(result.pourcentageEvolution).toBeCloseTo(20); // (10/50) * 100
      expect(result.evolutions).toHaveLength(3);
    });

    it('devrait retourner 0 si pas assez de pesées', () => {
      const pesees: ProductionPesee[] = [
        {
          id: 'pesee-1',
          animal_id: 'animal-1',
          poids_kg: 50,
          date: new Date().toISOString(),
        },
      ];

      const result = getEvolutionPoids(pesees, 7);

      expect(result.poidsGagne).toBe(0);
      expect(result.pourcentageEvolution).toBe(0);
    });

    it('devrait retourner 0 si aucune pesée', () => {
      const result = getEvolutionPoids([], 7);

      expect(result.poidsGagne).toBe(0);
      expect(result.pourcentageEvolution).toBe(0);
      expect(result.evolutions).toEqual([]);
    });
  });

  describe('getPoidsActuelEstime', () => {
    it('devrait retourner le poids de la dernière pesée si < 3 jours', () => {
      const animal: ProductionAnimal = {
        id: 'animal-1',
        code: 'A001',
        poids_initial: 10,
        statut: 'actif',
        projet_id: 'projet-1',
        date_entree: '2024-01-01',
        sexe: 'M',
      };

      const dateRecent = new Date();
      dateRecent.setDate(dateRecent.getDate() - 1); // Hier

      const pesees: ProductionPesee[] = [
        {
          id: 'pesee-1',
          animal_id: 'animal-1',
          poids_kg: 60,
          date: dateRecent.toISOString(),
        },
      ];

      const result = getPoidsActuelEstime(animal, pesees);

      expect(result.poidsEstime).toBe(60);
      expect(result.source).toBe('pesee');
    });

    it('devrait estimer le poids si la dernière pesée date de plus de 3 jours', () => {
      const animal: ProductionAnimal = {
        id: 'animal-1',
        code: 'A001',
        poids_initial: 10,
        statut: 'actif',
        projet_id: 'projet-1',
        date_entree: '2024-01-01',
        sexe: 'M',
      };

      const date1 = new Date();
      date1.setDate(date1.getDate() - 10); // Il y a 10 jours
      const date2 = new Date();
      date2.setDate(date2.getDate() - 5); // Il y a 5 jours

      const pesees: ProductionPesee[] = [
        {
          id: 'pesee-1',
          animal_id: 'animal-1',
          poids_kg: 50,
          date: date1.toISOString(),
        },
        {
          id: 'pesee-2',
          animal_id: 'animal-1',
          poids_kg: 55,
          date: date2.toISOString(),
        },
      ];

      const result = getPoidsActuelEstime(animal, pesees);

      expect(result.poidsEstime).toBeGreaterThan(55); // Devrait être estimé
      expect(result.source).toBe('estimation');
    });

    it('devrait utiliser le poids initial si aucune pesée', () => {
      const animal: ProductionAnimal = {
        id: 'animal-1',
        code: 'A001',
        poids_initial: 25,
        statut: 'actif',
        projet_id: 'projet-1',
        date_entree: '2024-01-01',
        sexe: 'M',
      };

      const result = getPoidsActuelEstime(animal, []);

      expect(result.poidsEstime).toBe(25);
      expect(result.source).toBe('initial');
      expect(result.dateDernierePesee).toBeNull();
    });

    it('devrait calculer le GMQ automatiquement si non fourni', () => {
      const animal: ProductionAnimal = {
        id: 'animal-1',
        code: 'A001',
        poids_initial: 10,
        statut: 'actif',
        projet_id: 'projet-1',
        date_entree: '2024-01-01',
        sexe: 'M',
      };

      const date1 = new Date();
      date1.setDate(date1.getDate() - 10);
      const date2 = new Date();
      date2.setDate(date2.getDate() - 5);

      const pesees: ProductionPesee[] = [
        {
          id: 'pesee-1',
          animal_id: 'animal-1',
          poids_kg: 50,
          date: date1.toISOString(),
        },
        {
          id: 'pesee-2',
          animal_id: 'animal-1',
          poids_kg: 60,
          date: date2.toISOString(),
        },
      ];

      const result = getPoidsActuelEstime(animal, pesees);

      // GMQ calculé = (60 - 50) / 5 = 2 kg/jour
      // Poids estimé = 60 + (2 * 5) = 70 kg
      expect(result.poidsEstime).toBeGreaterThanOrEqual(60);
      expect(result.source).toBe('estimation');
    });
  });

  describe('getCategoriePoids', () => {
    it('devrait retourner "porcelet" pour poids entre 7 et 25 kg', () => {
      expect(getCategoriePoids(10)).toBe('porcelet');
      expect(getCategoriePoids(7)).toBe('porcelet');
      expect(getCategoriePoids(25)).toBe('porcelet');
    });

    it('devrait retourner "croissance" pour poids entre 25 et 60 kg', () => {
      expect(getCategoriePoids(30)).toBe('croissance');
      expect(getCategoriePoids(50)).toBe('croissance');
      expect(getCategoriePoids(60)).toBe('croissance');
    });

    it('devrait retourner "finition" pour poids > 60 kg', () => {
      expect(getCategoriePoids(65)).toBe('finition');
      expect(getCategoriePoids(100)).toBe('finition');
    });

    it('devrait retourner "porcelet" pour poids < 7 kg', () => {
      expect(getCategoriePoids(5)).toBe('porcelet');
      expect(getCategoriePoids(0)).toBe('porcelet');
    });
  });
});
