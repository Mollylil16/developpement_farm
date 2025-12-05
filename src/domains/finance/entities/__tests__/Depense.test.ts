/**
 * Tests pour DepenseEntity
 * 
 * Tests de la logique métier de l'entité Depense
 */

import { DepenseEntity, type Depense } from '../Depense';

describe('DepenseEntity', () => {
  const createMockDepense = (overrides?: Partial<Depense>): Depense => ({
    id: 'depense-1',
    projetId: 'projet-1',
    montant: 50000,
    categorie: 'aliment',
    libelleCategorie: 'Aliments',
    date: '2024-01-15',
    commentaire: 'Achat d\'aliments',
    photos: [],
    dateCreation: '2024-01-15T00:00:00Z',
    derniereModification: '2024-01-15T00:00:00Z',
    ...overrides,
  });

  describe('isValid', () => {
    it('devrait retourner true si la dépense est valide', () => {
      const depense = createMockDepense({
        montant: 50000,
        date: '2024-01-15',
      });
      const entity = new DepenseEntity(depense);

      expect(entity.isValid()).toBe(true);
    });

    it('devrait retourner false si le montant est <= 0', () => {
      const depense = createMockDepense({
        montant: 0,
        date: '2024-01-15',
      });
      const entity = new DepenseEntity(depense);

      expect(entity.isValid()).toBe(false);
    });

    it('devrait retourner false si le montant est négatif', () => {
      const depense = createMockDepense({
        montant: -1000,
        date: '2024-01-15',
      });
      const entity = new DepenseEntity(depense);

      expect(entity.isValid()).toBe(false);
    });

    it('devrait retourner false si la date n\'est pas définie', () => {
      const depense = createMockDepense({
        montant: 50000,
        date: '',
      });
      const entity = new DepenseEntity(depense);

      expect(entity.isValid()).toBe(false);
    });
  });

  describe('isInPeriod', () => {
    it('devrait retourner true si la dépense est dans la période', () => {
      const depense = createMockDepense({
        date: '2024-01-15',
      });
      const entity = new DepenseEntity(depense);

      expect(entity.isInPeriod('2024-01-01', '2024-01-31')).toBe(true);
    });

    it('devrait retourner true si la dépense est à la date de début', () => {
      const depense = createMockDepense({
        date: '2024-01-01',
      });
      const entity = new DepenseEntity(depense);

      expect(entity.isInPeriod('2024-01-01', '2024-01-31')).toBe(true);
    });

    it('devrait retourner true si la dépense est à la date de fin', () => {
      const depense = createMockDepense({
        date: '2024-01-31',
      });
      const entity = new DepenseEntity(depense);

      expect(entity.isInPeriod('2024-01-01', '2024-01-31')).toBe(true);
    });

    it('devrait retourner false si la dépense est avant la période', () => {
      const depense = createMockDepense({
        date: '2023-12-31',
      });
      const entity = new DepenseEntity(depense);

      expect(entity.isInPeriod('2024-01-01', '2024-01-31')).toBe(false);
    });

    it('devrait retourner false si la dépense est après la période', () => {
      const depense = createMockDepense({
        date: '2024-02-01',
      });
      const entity = new DepenseEntity(depense);

      expect(entity.isInPeriod('2024-01-01', '2024-01-31')).toBe(false);
    });
  });

  describe('calculateTTC', () => {
    it('devrait calculer le montant TTC avec un taux de TVA', () => {
      const depense = createMockDepense({
        montant: 100000,
      });
      const entity = new DepenseEntity(depense);

      const ttc = entity.calculateTTC(18); // 18% de TVA
      expect(ttc).toBe(118000);
    });

    it('devrait retourner le montant HT si taux de TVA est 0', () => {
      const depense = createMockDepense({
        montant: 100000,
      });
      const entity = new DepenseEntity(depense);

      const ttc = entity.calculateTTC(0);
      expect(ttc).toBe(100000);
    });

    it('devrait utiliser 0% par défaut si aucun taux n\'est fourni', () => {
      const depense = createMockDepense({
        montant: 100000,
      });
      const entity = new DepenseEntity(depense);

      const ttc = entity.calculateTTC();
      expect(ttc).toBe(100000);
    });

    it('devrait gérer les taux de TVA décimaux', () => {
      const depense = createMockDepense({
        montant: 100000,
      });
      const entity = new DepenseEntity(depense);

      const ttc = entity.calculateTTC(5.5);
      expect(ttc).toBe(105500);
    });
  });
});

