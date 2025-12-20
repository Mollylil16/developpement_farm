/**
 * Tests pour PricingService
 */

// Ne pas utiliser le mock global de PricingService pour ces tests
jest.unmock('../PricingService');

import {
  calculateTotalPrice,
  calculatePricePerKg,
  suggestMarketPrice,
  calculateProfitMargin,
  validatePrice,
} from '../PricingService';

describe('PricingService', () => {
  describe('calculateTotalPrice', () => {
    it('devrait calculer le prix total correctement', () => {
      expect(calculateTotalPrice(2000, 100)).toBe(200000);
      expect(calculateTotalPrice(2500, 50)).toBe(125000);
      expect(calculateTotalPrice(1800, 75)).toBe(135000);
    });

    it('devrait arrondir le résultat', () => {
      expect(calculateTotalPrice(2000.5, 100)).toBe(200050);
      expect(calculateTotalPrice(1999.9, 100)).toBe(199990);
    });

    it('devrait gérer les valeurs nulles', () => {
      expect(calculateTotalPrice(0, 100)).toBe(0);
      expect(calculateTotalPrice(2000, 0)).toBe(0);
    });
  });

  describe('calculatePricePerKg', () => {
    it('devrait calculer le prix par kg correctement', () => {
      expect(calculatePricePerKg(200000, 100)).toBe(2000);
      expect(calculatePricePerKg(125000, 50)).toBe(2500);
    });

    it('devrait arrondir à 2 décimales', () => {
      expect(calculatePricePerKg(200050, 100)).toBe(2000.5);
      expect(calculatePricePerKg(33333, 100)).toBe(333.33);
    });

    it('devrait retourner 0 si le poids est 0', () => {
      expect(calculatePricePerKg(200000, 0)).toBe(0);
    });

    it('devrait gérer les valeurs nulles', () => {
      expect(calculatePricePerKg(0, 100)).toBe(0);
    });
  });

  describe('suggestMarketPrice', () => {
    it('devrait suggérer un prix basé sur le prix du marché', () => {
      const result = suggestMarketPrice(2300, 100, 1.0);
      expect(result.pricePerKg).toBe(2300);
      expect(result.suggested).toBe(230000);
      expect(result.min).toBeLessThan(result.suggested);
      expect(result.max).toBeGreaterThan(result.suggested);
    });

    it('devrait ajuster le prix pour les gros porcs (-2%)', () => {
      const result = suggestMarketPrice(2300, 150, 1.0);
      expect(result.pricePerKg).toBe(2254); // 2300 * 0.98
      expect(result.suggested).toBe(338100);
    });

    it('devrait ajuster le prix pour les petits porcs (+5%)', () => {
      const result = suggestMarketPrice(2300, 30, 1.0);
      expect(result.pricePerKg).toBe(2415); // 2300 * 1.05
      expect(result.suggested).toBe(72450);
    });

    it("devrait appliquer le facteur d'ajustement personnalisé", () => {
      const result = suggestMarketPrice(2300, 100, 1.1);
      expect(result.pricePerKg).toBe(2530); // 2300 * 1.1
    });

    it('devrait calculer les limites min et max (±10%)', () => {
      const result = suggestMarketPrice(2300, 100, 1.0);
      expect(result.min).toBe(Math.round(result.suggested * 0.9));
      expect(result.max).toBe(Math.round(result.suggested * 1.1));
    });

    it('devrait utiliser les valeurs par défaut', () => {
      const result = suggestMarketPrice();
      expect(result).toBeDefined();
      expect(result.pricePerKg).toBeGreaterThan(0);
    });
  });

  describe('calculateProfitMargin', () => {
    it('devrait calculer le profit correctement', () => {
      const result = calculateProfitMargin(200000, 150000);
      expect(result.profit).toBe(50000);
      expect(result.marginPercent).toBeCloseTo(33.3, 1);
      expect(result.isProfit).toBe(true);
    });

    it('devrait calculer la perte correctement', () => {
      const result = calculateProfitMargin(100000, 150000);
      expect(result.profit).toBe(-50000);
      expect(result.marginPercent).toBeCloseTo(-33.3, 1);
      expect(result.isProfit).toBe(false);
    });

    it('devrait retourner 0% de marge si le coût est 0', () => {
      const result = calculateProfitMargin(200000, 0);
      expect(result.marginPercent).toBe(0);
    });

    it('devrait arrondir le profit et la marge', () => {
      const result = calculateProfitMargin(200123, 150456);
      expect(result.profit).toBe(49667);
      expect(result.marginPercent).toBeCloseTo(33.0, 1);
    });
  });

  describe('validatePrice', () => {
    it('devrait valider un prix dans la tolérance', () => {
      const result = validatePrice(2300, 2000, 0.3);
      expect(result.isValid).toBe(true);
      expect(result.deviation).toBeCloseTo(15, 1);
    });

    it('devrait rejeter un prix trop élevé', () => {
      const result = validatePrice(3000, 2000, 0.3);
      expect(result.isValid).toBe(false);
      expect(result.deviation).toBe(50);
      expect(result.reason).toBeDefined();
    });

    it('devrait rejeter un prix trop bas', () => {
      const result = validatePrice(1000, 2000, 0.3);
      expect(result.isValid).toBe(false);
      expect(result.deviation).toBe(-50);
      expect(result.reason).toBeDefined();
    });

    it('devrait utiliser la tolérance par défaut (30%)', () => {
      const result = validatePrice(2300, 2000);
      expect(result.isValid).toBe(true);
    });

    it('devrait calculer la déviation correctement', () => {
      const result = validatePrice(2500, 2000, 0.3);
      expect(result.deviation).toBe(25);
    });

    it('devrait accepter un prix exactement égal', () => {
      const result = validatePrice(2000, 2000, 0.3);
      expect(result.isValid).toBe(true);
      expect(result.deviation).toBe(0);
    });
  });
});
