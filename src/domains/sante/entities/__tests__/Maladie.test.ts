/**
 * Tests pour MaladieEntity
 * 
 * Tests de la logique métier de l'entité Maladie
 */

import { MaladieEntity, type Maladie } from '../Maladie';

describe('MaladieEntity', () => {
  const createMockMaladie = (overrides?: Partial<Maladie>): Maladie => ({
    id: 'maladie-1',
    projetId: 'projet-1',
    animalId: 'animal-1',
    type: 'respiratoire',
    nomMaladie: 'Grippe porcine',
    gravite: 'moderee',
    dateDebut: '2024-01-15',
    dateFin: undefined,
    symptomes: 'Toux, fièvre',
    diagnostic: 'Grippe',
    contagieux: false,
    nombreAnimauxAffectes: 1,
    nombreDeces: 0,
    veterinaire: 'Dr. Test',
    coutTraitement: 10000,
    gueri: false,
    notes: 'Traitement en cours',
    dateCreation: '2024-01-15T00:00:00Z',
    derniereModification: '2024-01-15T00:00:00Z',
    ...overrides,
  });

  describe('isEnCours', () => {
    it('devrait retourner true si la maladie est en cours', () => {
      const maladie = createMockMaladie({
        dateFin: undefined,
        gueri: false,
      });
      const entity = new MaladieEntity(maladie);

      expect(entity.isEnCours()).toBe(true);
    });

    it('devrait retourner false si la maladie est guérie', () => {
      const maladie = createMockMaladie({
        dateFin: '2024-01-20',
        gueri: true,
      });
      const entity = new MaladieEntity(maladie);

      expect(entity.isEnCours()).toBe(false);
    });

    it('devrait retourner false si dateFin est définie', () => {
      const maladie = createMockMaladie({
        dateFin: '2024-01-20',
        gueri: false,
      });
      const entity = new MaladieEntity(maladie);

      expect(entity.isEnCours()).toBe(false);
    });
  });

  describe('isGuerie', () => {
    it('devrait retourner true si la maladie est guérie', () => {
      const maladie = createMockMaladie({
        gueri: true,
      });
      const entity = new MaladieEntity(maladie);

      expect(entity.isGuerie()).toBe(true);
    });

    it('devrait retourner false si la maladie n\'est pas guérie', () => {
      const maladie = createMockMaladie({
        gueri: false,
      });
      const entity = new MaladieEntity(maladie);

      expect(entity.isGuerie()).toBe(false);
    });
  });

  describe('isCritique', () => {
    it('devrait retourner true si la gravité est critique', () => {
      const maladie = createMockMaladie({
        gravite: 'critique',
      });
      const entity = new MaladieEntity(maladie);

      expect(entity.isCritique()).toBe(true);
    });

    it('devrait retourner false si la gravité n\'est pas critique', () => {
      const maladie = createMockMaladie({
        gravite: 'moderee',
      });
      const entity = new MaladieEntity(maladie);

      expect(entity.isCritique()).toBe(false);
    });
  });

  describe('getDureeEnJours', () => {
    it('devrait calculer la durée en jours si dateFin est définie', () => {
      const maladie = createMockMaladie({
        dateDebut: '2024-01-01',
        dateFin: '2024-01-15',
      });
      const entity = new MaladieEntity(maladie);

      const duree = entity.getDureeEnJours();
      expect(duree).toBe(14);
    });

    it('devrait calculer la durée depuis dateDebut jusqu\'à maintenant si dateFin n\'est pas définie', () => {
      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - 10);

      const maladie = createMockMaladie({
        dateDebut: dateDebut.toISOString().split('T')[0],
        dateFin: undefined,
      });
      const entity = new MaladieEntity(maladie);

      const duree = entity.getDureeEnJours();
      expect(duree).toBeGreaterThanOrEqual(9);
      expect(duree).toBeLessThanOrEqual(11);
    });

    it('devrait retourner null si dateDebut n\'est pas définie', () => {
      const maladie = createMockMaladie({
        dateDebut: '',
      });
      const entity = new MaladieEntity(maladie);

      expect(entity.getDureeEnJours()).toBeNull();
    });
  });

  describe('necessiteInterventionUrgente', () => {
    it('devrait retourner true si la maladie est critique', () => {
      const maladie = createMockMaladie({
        gravite: 'critique',
      });
      const entity = new MaladieEntity(maladie);

      expect(entity.necessiteInterventionUrgente()).toBe(true);
    });

    it('devrait retourner true si la maladie est en cours et contagieuse', () => {
      const maladie = createMockMaladie({
        gravite: 'moderee',
        dateFin: undefined,
        gueri: false,
        contagieux: true,
      });
      const entity = new MaladieEntity(maladie);

      expect(entity.necessiteInterventionUrgente()).toBe(true);
    });

    it('devrait retourner false si la maladie n\'est ni critique ni contagieuse en cours', () => {
      const maladie = createMockMaladie({
        gravite: 'moderee',
        dateFin: undefined,
        gueri: false,
        contagieux: false,
      });
      const entity = new MaladieEntity(maladie);

      expect(entity.necessiteInterventionUrgente()).toBe(false);
    });
  });
});

