/**
 * Tests pour animalUtils
 */

import { getAnimalCurrentWeight } from '../animalUtils';
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

    it('devrait retourner le poids initial si aucune pesée n\'est disponible', () => {
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
});

