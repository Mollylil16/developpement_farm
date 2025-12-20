/**
 * Tests pour RevenuEntity
 *
 * Tests de la logique métier de l'entité Revenu
 */

import { RevenuEntity, type Revenu } from '../Revenu';

describe('RevenuEntity', () => {
  const createMockRevenu = (overrides?: Partial<Revenu>): Revenu => ({
    id: 'revenu-1',
    projetId: 'projet-1',
    montant: 200000,
    categorie: 'vente_porc',
    libelleCategorie: 'Vente de porc',
    date: '2024-01-15',
    description: 'Vente de porcs',
    commentaire: 'Vente réussie',
    photos: [],
    poidsKg: 100,
    animalId: 'animal-1',
    dateCreation: '2024-01-15T00:00:00Z',
    derniereModification: '2024-01-15T00:00:00Z',
    ...overrides,
  });

  describe('isValid', () => {
    it('devrait retourner true si le revenu est valide', () => {
      const revenu = createMockRevenu({
        montant: 200000,
        date: '2024-01-15',
      });
      const entity = new RevenuEntity(revenu);

      expect(entity.isValid()).toBe(true);
    });

    it('devrait retourner false si le montant est <= 0', () => {
      const revenu = createMockRevenu({
        montant: 0,
        date: '2024-01-15',
      });
      const entity = new RevenuEntity(revenu);

      expect(entity.isValid()).toBe(false);
    });

    it("devrait retourner false si la date n'est pas définie", () => {
      const revenu = createMockRevenu({
        montant: 200000,
        date: '',
      });
      const entity = new RevenuEntity(revenu);

      expect(entity.isValid()).toBe(false);
    });
  });

  describe('calculateMarge', () => {
    it('devrait calculer la marge OPEX', () => {
      const revenu = createMockRevenu({
        montant: 200000,
        coutReelOpex: 150000,
      });
      const entity = new RevenuEntity(revenu);

      const marge = entity.calculateMarge();
      expect(marge.opex).toBe(50000);
    });

    it('devrait calculer la marge complète', () => {
      const revenu = createMockRevenu({
        montant: 200000,
        coutReelComplet: 180000,
      });
      const entity = new RevenuEntity(revenu);

      const marge = entity.calculateMarge();
      expect(marge.complete).toBe(20000);
    });

    it('devrait calculer les deux marges si disponibles', () => {
      const revenu = createMockRevenu({
        montant: 200000,
        coutReelOpex: 150000,
        coutReelComplet: 180000,
      });
      const entity = new RevenuEntity(revenu);

      const marge = entity.calculateMarge();
      expect(marge.opex).toBe(50000);
      expect(marge.complete).toBe(20000);
    });

    it('devrait retourner un objet vide si aucun coût disponible', () => {
      const revenu = createMockRevenu({
        montant: 200000,
      });
      const entity = new RevenuEntity(revenu);

      const marge = entity.calculateMarge();
      expect(marge.opex).toBeUndefined();
      expect(marge.complete).toBeUndefined();
    });
  });

  describe('getPrixAuKg', () => {
    it('devrait calculer le prix au kg', () => {
      const revenu = createMockRevenu({
        montant: 200000,
        poidsKg: 100,
      });
      const entity = new RevenuEntity(revenu);

      const prixAuKg = entity.getPrixAuKg();
      expect(prixAuKg).toBe(2000);
    });

    it("devrait retourner null si poidsKg n'est pas défini", () => {
      const revenu = createMockRevenu({
        montant: 200000,
        poidsKg: undefined,
      });
      const entity = new RevenuEntity(revenu);

      expect(entity.getPrixAuKg()).toBeNull();
    });

    it('devrait retourner null si poidsKg est <= 0', () => {
      const revenu = createMockRevenu({
        montant: 200000,
        poidsKg: 0,
      });
      const entity = new RevenuEntity(revenu);

      expect(entity.getPrixAuKg()).toBeNull();
    });
  });

  describe('isVentePorc', () => {
    it('devrait retourner true si la catégorie est vente_porc', () => {
      const revenu = createMockRevenu({
        categorie: 'vente_porc',
      });
      const entity = new RevenuEntity(revenu);

      expect(entity.isVentePorc()).toBe(true);
    });

    it("devrait retourner false si la catégorie n'est pas vente_porc", () => {
      const revenu = createMockRevenu({
        categorie: 'subvention',
      });
      const entity = new RevenuEntity(revenu);

      expect(entity.isVentePorc()).toBe(false);
    });
  });
});
