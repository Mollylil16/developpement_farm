/**
 * Tests pour ChargeFixeEntity
 *
 * Tests de la logique métier de l'entité ChargeFixe
 */

import { ChargeFixeEntity, type ChargeFixe } from '../ChargeFixe';

describe('ChargeFixeEntity', () => {
  const createMockChargeFixe = (overrides?: Partial<ChargeFixe>): ChargeFixe => ({
    id: 'charge-1',
    projetId: 'projet-1',
    categorie: 'loyer',
    libelle: 'Loyer mensuel',
    montant: 50000,
    dateDebut: '2024-01-01',
    frequence: 'mensuel',
    jourPaiement: 1,
    notes: 'Loyer de la ferme',
    statut: 'actif',
    dateCreation: '2024-01-01T00:00:00Z',
    derniereModification: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  describe('isActive', () => {
    it('devrait retourner true si le statut est actif', () => {
      const chargeFixe = createMockChargeFixe({
        statut: 'actif',
      });
      const entity = new ChargeFixeEntity(chargeFixe);

      expect(entity.isActive()).toBe(true);
    });

    it("devrait retourner false si le statut n'est pas actif", () => {
      const chargeFixe = createMockChargeFixe({
        statut: 'suspendu',
      });
      const entity = new ChargeFixeEntity(chargeFixe);

      expect(entity.isActive()).toBe(false);
    });
  });

  describe('getMontantAnnuel', () => {
    it('devrait calculer le montant annuel pour une charge mensuelle', () => {
      const chargeFixe = createMockChargeFixe({
        montant: 50000,
        frequence: 'mensuel',
      });
      const entity = new ChargeFixeEntity(chargeFixe);

      expect(entity.getMontantAnnuel()).toBe(600000);
    });

    it('devrait calculer le montant annuel pour une charge trimestrielle', () => {
      const chargeFixe = createMockChargeFixe({
        montant: 150000,
        frequence: 'trimestriel',
      });
      const entity = new ChargeFixeEntity(chargeFixe);

      expect(entity.getMontantAnnuel()).toBe(600000);
    });

    it('devrait retourner le montant pour une charge annuelle', () => {
      const chargeFixe = createMockChargeFixe({
        montant: 600000,
        frequence: 'annuel',
      });
      const entity = new ChargeFixeEntity(chargeFixe);

      expect(entity.getMontantAnnuel()).toBe(600000);
    });
  });

  describe('isPaiementDu', () => {
    it('devrait retourner true si la charge est active et le jour correspond', () => {
      const chargeFixe = createMockChargeFixe({
        statut: 'actif',
        jourPaiement: 15,
      });
      const entity = new ChargeFixeEntity(chargeFixe);

      expect(entity.isPaiementDu('2024-01-15')).toBe(true);
    });

    it("devrait retourner false si la charge n'est pas active", () => {
      const chargeFixe = createMockChargeFixe({
        statut: 'suspendu',
        jourPaiement: 15,
      });
      const entity = new ChargeFixeEntity(chargeFixe);

      expect(entity.isPaiementDu('2024-01-15')).toBe(false);
    });

    it('devrait retourner false si le jour ne correspond pas', () => {
      const chargeFixe = createMockChargeFixe({
        statut: 'actif',
        jourPaiement: 15,
      });
      const entity = new ChargeFixeEntity(chargeFixe);

      expect(entity.isPaiementDu('2024-01-20')).toBe(false);
    });

    it("devrait retourner true si jourPaiement n'est pas défini", () => {
      const chargeFixe = createMockChargeFixe({
        statut: 'actif',
        jourPaiement: undefined,
      });
      const entity = new ChargeFixeEntity(chargeFixe);

      expect(entity.isPaiementDu('2024-01-15')).toBe(true);
    });
  });
});
