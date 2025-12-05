/**
 * Tests pour AnimalEntity
 * 
 * Tests de la logique métier de l'entité Animal
 */

import { AnimalEntity, type Animal } from '../Animal';

describe('AnimalEntity', () => {
  const createMockAnimal = (overrides?: Partial<Animal>): Animal => ({
    id: 'animal-1',
    code: 'TR-001',
    nom: 'Truie Test',
    projetId: 'projet-1',
    sexe: 'femelle',
    dateNaissance: '2024-01-01',
    poidsInitial: 150,
    dateEntree: '2024-01-01',
    actif: true,
    statut: 'actif',
    race: 'Large White',
    reproducteur: true,
    pereId: undefined,
    mereId: undefined,
    notes: 'Test animal',
    photoUri: undefined,
    dateCreation: '2024-01-01T00:00:00Z',
    derniereModification: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  describe('isReproducteurActif', () => {
    it('devrait retourner true si l\'animal est reproducteur, actif et statut actif', () => {
      const animal = createMockAnimal({
        reproducteur: true,
        actif: true,
        statut: 'actif',
      });
      const entity = new AnimalEntity(animal);

      expect(entity.isReproducteurActif()).toBe(true);
    });

    it('devrait retourner false si l\'animal n\'est pas reproducteur', () => {
      const animal = createMockAnimal({
        reproducteur: false,
        actif: true,
        statut: 'actif',
      });
      const entity = new AnimalEntity(animal);

      expect(entity.isReproducteurActif()).toBe(false);
    });

    it('devrait retourner false si l\'animal n\'est pas actif', () => {
      const animal = createMockAnimal({
        reproducteur: true,
        actif: false,
        statut: 'actif',
      });
      const entity = new AnimalEntity(animal);

      expect(entity.isReproducteurActif()).toBe(false);
    });

    it('devrait retourner false si le statut n\'est pas actif', () => {
      const animal = createMockAnimal({
        reproducteur: true,
        actif: true,
        statut: 'vendu',
      });
      const entity = new AnimalEntity(animal);

      expect(entity.isReproducteurActif()).toBe(false);
    });
  });

  describe('getAgeEnJours', () => {
    it('devrait calculer l\'âge en jours correctement', () => {
      const dateNaissance = new Date();
      dateNaissance.setDate(dateNaissance.getDate() - 100); // 100 jours

      const animal = createMockAnimal({
        dateNaissance: dateNaissance.toISOString().split('T')[0],
      });
      const entity = new AnimalEntity(animal);

      const age = entity.getAgeEnJours();
      expect(age).toBeGreaterThanOrEqual(99);
      expect(age).toBeLessThanOrEqual(101);
    });

    it('devrait retourner null si dateNaissance n\'est pas définie', () => {
      const animal = createMockAnimal({
        dateNaissance: undefined,
      });
      const entity = new AnimalEntity(animal);

      expect(entity.getAgeEnJours()).toBeNull();
    });
  });

  describe('peutReproduire', () => {
    it('devrait retourner true si l\'animal peut reproduire (âge >= 8 mois)', () => {
      const dateNaissance = new Date();
      dateNaissance.setDate(dateNaissance.getDate() - 250); // Plus de 8 mois

      const animal = createMockAnimal({
        reproducteur: true,
        actif: true,
        statut: 'actif',
        dateNaissance: dateNaissance.toISOString().split('T')[0],
      });
      const entity = new AnimalEntity(animal);

      expect(entity.peutReproduire()).toBe(true);
    });

    it('devrait retourner false si l\'animal est trop jeune (< 8 mois)', () => {
      const dateNaissance = new Date();
      dateNaissance.setDate(dateNaissance.getDate() - 200); // Moins de 8 mois

      const animal = createMockAnimal({
        reproducteur: true,
        actif: true,
        statut: 'actif',
        dateNaissance: dateNaissance.toISOString().split('T')[0],
      });
      const entity = new AnimalEntity(animal);

      expect(entity.peutReproduire()).toBe(false);
    });

    it('devrait retourner false si l\'animal n\'est pas reproducteur actif', () => {
      const dateNaissance = new Date();
      dateNaissance.setDate(dateNaissance.getDate() - 250);

      const animal = createMockAnimal({
        reproducteur: false,
        actif: true,
        statut: 'actif',
        dateNaissance: dateNaissance.toISOString().split('T')[0],
      });
      const entity = new AnimalEntity(animal);

      expect(entity.peutReproduire()).toBe(false);
    });

    it('devrait retourner false si dateNaissance n\'est pas définie', () => {
      const animal = createMockAnimal({
        reproducteur: true,
        actif: true,
        statut: 'actif',
        dateNaissance: undefined,
      });
      const entity = new AnimalEntity(animal);

      expect(entity.peutReproduire()).toBe(false);
    });
  });

  describe('estDisponiblePourVente', () => {
    it('devrait retourner true si l\'animal est disponible pour la vente', () => {
      const animal = createMockAnimal({
        actif: true,
        statut: 'actif',
        reproducteur: false,
      });
      const entity = new AnimalEntity(animal);

      expect(entity.estDisponiblePourVente()).toBe(true);
    });

    it('devrait retourner false si l\'animal est un reproducteur', () => {
      const animal = createMockAnimal({
        actif: true,
        statut: 'actif',
        reproducteur: true,
      });
      const entity = new AnimalEntity(animal);

      expect(entity.estDisponiblePourVente()).toBe(false);
    });

    it('devrait retourner false si l\'animal n\'est pas actif', () => {
      const animal = createMockAnimal({
        actif: false,
        statut: 'actif',
        reproducteur: false,
      });
      const entity = new AnimalEntity(animal);

      expect(entity.estDisponiblePourVente()).toBe(false);
    });

    it('devrait retourner false si le statut n\'est pas actif', () => {
      const animal = createMockAnimal({
        actif: true,
        statut: 'vendu',
        reproducteur: false,
      });
      const entity = new AnimalEntity(animal);

      expect(entity.estDisponiblePourVente()).toBe(false);
    });
  });
});

