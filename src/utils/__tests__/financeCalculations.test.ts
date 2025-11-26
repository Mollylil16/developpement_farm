/**
 * Tests pour financeCalculations
 */

import { formatMontant, calculateMargin, calculatePercentage } from '../financeCalculations';

describe('financeCalculations', () => {
  describe('formatMontant', () => {
    it('formate les montants correctement en FCFA', () => {
      expect(formatMontant(1000)).toBe('1 000');
      expect(formatMontant(1234567)).toBe('1 234 567');
      expect(formatMontant(100)).toBe('100');
    });

    it('gère les décimales', () => {
      expect(formatMontant(1234.56)).toBe('1 235'); // Arrondi
      expect(formatMontant(999.99)).toBe('1 000');
    });

    it('gère zéro', () => {
      expect(formatMontant(0)).toBe('0');
    });

    it('gère les nombres négatifs', () => {
      expect(formatMontant(-1000)).toBe('-1 000');
      expect(formatMontant(-1234567)).toBe('-1 234 567');
    });

    it('gère undefined/null gracieusement', () => {
      expect(formatMontant(undefined as any)).toBe('0');
      expect(formatMontant(null as any)).toBe('0');
      expect(formatMontant(NaN)).toBe('0');
    });
  });

  describe('calculateMargin', () => {
    it('calcule la marge correctement', () => {
      expect(calculateMargin(1000, 800)).toBe(200);
      expect(calculateMargin(5000, 3500)).toBe(1500);
    });

    it('gère les marges négatives', () => {
      expect(calculateMargin(800, 1000)).toBe(-200);
    });

    it('gère zéro', () => {
      expect(calculateMargin(0, 0)).toBe(0);
      expect(calculateMargin(1000, 0)).toBe(1000);
      expect(calculateMargin(0, 1000)).toBe(-1000);
    });

    it('gère undefined/null', () => {
      expect(calculateMargin(undefined as any, 100)).toBe(-100);
      expect(calculateMargin(100, null as any)).toBe(100);
      expect(calculateMargin(NaN, 100)).toBe(NaN);
    });
  });

  describe('calculatePercentage', () => {
    it('calcule les pourcentages correctement', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(1, 4)).toBe(25);
    });

    it('gère les décimales', () => {
      expect(calculatePercentage(1, 3)).toBeCloseTo(33.33, 2);
      expect(calculatePercentage(2, 3)).toBeCloseTo(66.67, 2);
    });

    it('gère zéro au numérateur', () => {
      expect(calculatePercentage(0, 100)).toBe(0);
    });

    it('gère division par zéro', () => {
      expect(calculatePercentage(100, 0)).toBe(0); // Ou Infinity selon implémentation
    });

    it('gère undefined/null', () => {
      expect(calculatePercentage(undefined as any, 100)).toBe(0);
      expect(calculatePercentage(100, null as any)).toBe(0);
    });

    it('gère les pourcentages > 100%', () => {
      expect(calculatePercentage(150, 100)).toBe(150);
    });
  });
});

