/**
 * Tests pour vaccinationUtils
 */

import { parseAnimalIds, animalIncludedInVaccination } from '../vaccinationUtils';

describe('vaccinationUtils', () => {
  describe('parseAnimalIds', () => {
    it('devrait retourner un tableau vide si animal_ids est null', () => {
      const result = parseAnimalIds(null);
      expect(result).toEqual([]);
    });

    it('devrait retourner un tableau vide si animal_ids est undefined', () => {
      const result = parseAnimalIds(undefined);
      expect(result).toEqual([]);
    });

    it("devrait retourner le tableau tel quel si c'est déjà un tableau", () => {
      const animalIds = ['animal-1', 'animal-2', 'animal-3'];
      const result = parseAnimalIds(animalIds);
      expect(result).toEqual(animalIds);
    });

    it('devrait parser une string JSON valide', () => {
      const animalIdsJson = '["animal-1", "animal-2", "animal-3"]';
      const result = parseAnimalIds(animalIdsJson);
      expect(result).toEqual(['animal-1', 'animal-2', 'animal-3']);
    });

    it("devrait retourner un tableau vide si la string JSON n'est pas un tableau", () => {
      const animalIdsJson = '{"animal": "animal-1"}';
      const result = parseAnimalIds(animalIdsJson);
      expect(result).toEqual([]);
    });

    it('devrait retourner un tableau vide si la string JSON est invalide', () => {
      const animalIdsJson = 'invalid json';
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = parseAnimalIds(animalIdsJson);
      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalled();
      (console.warn as jest.Mock).mockRestore();
    });

    it('devrait retourner un tableau vide pour un type non supporté', () => {
      const result = parseAnimalIds(123);
      expect(result).toEqual([]);
    });
  });

  describe('animalIncludedInVaccination', () => {
    it("devrait retourner true si l'animal est dans la liste (tableau)", () => {
      const animalIds = ['animal-1', 'animal-2', 'animal-3'];
      const result = animalIncludedInVaccination(animalIds, 'animal-2');
      expect(result).toBe(true);
    });

    it("devrait retourner false si l'animal n'est pas dans la liste (tableau)", () => {
      const animalIds = ['animal-1', 'animal-2', 'animal-3'];
      const result = animalIncludedInVaccination(animalIds, 'animal-4');
      expect(result).toBe(false);
    });

    it("devrait retourner true si l'animal est dans la liste (JSON string)", () => {
      const animalIdsJson = '["animal-1", "animal-2", "animal-3"]';
      const result = animalIncludedInVaccination(animalIdsJson, 'animal-2');
      expect(result).toBe(true);
    });

    it("devrait retourner false si l'animal n'est pas dans la liste (JSON string)", () => {
      const animalIdsJson = '["animal-1", "animal-2", "animal-3"]';
      const result = animalIncludedInVaccination(animalIdsJson, 'animal-4');
      expect(result).toBe(false);
    });

    it('devrait retourner false si animal_ids est null', () => {
      const result = animalIncludedInVaccination(null, 'animal-1');
      expect(result).toBe(false);
    });

    it('devrait retourner false si animal_ids est undefined', () => {
      const result = animalIncludedInVaccination(undefined, 'animal-1');
      expect(result).toBe(false);
    });

    it('devrait gérer les erreurs de parsing gracieusement', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = animalIncludedInVaccination('invalid json', 'animal-1');
      expect(result).toBe(false);
      (console.warn as jest.Mock).mockRestore();
    });
  });
});
