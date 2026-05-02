/**
 * Tests unitaires pour DateExtractor
 */

import { DateExtractor } from '../DateExtractor';

describe('DateExtractor', () => {
  const today = new Date('2025-01-15');

  describe('extract', () => {
    test('devrait extraire "aujourd\'hui"', () => {
      const result = DateExtractor.extract("aujourd'hui", { referenceDate: today });
      expect(result).toBe('2025-01-15');
    });

    test('devrait extraire "demain"', () => {
      const result = DateExtractor.extract('demain', { referenceDate: today });
      expect(result).toBe('2025-01-16');
    });

    test('devrait extraire "hier"', () => {
      const result = DateExtractor.extract('hier', { referenceDate: today });
      expect(result).toBe('2025-01-14');
    });

    test('devrait extraire une date absolue DD/MM/YYYY', () => {
      const result = DateExtractor.extract('Le 20/01/2025', { referenceDate: today });
      expect(result).toBe('2025-01-20');
    });

    test('devrait extraire une date absolue DD/MM (année actuelle)', () => {
      const result = DateExtractor.extract('Le 20/01', { referenceDate: today });
      expect(result).toBe('2025-01-20');
    });

    test('devrait retourner aujourd\'hui par défaut si pas de date', () => {
      const result = DateExtractor.extract('Bonjour', { referenceDate: today });
      expect(result).toBe('2025-01-15');
    });
  });

  describe('formatForDisplay', () => {
    test('devrait formater une date pour affichage', () => {
      expect(DateExtractor.formatForDisplay('2025-01-15')).toBe('15/01/2025');
    });
  });

  describe('isValidDate', () => {
    test('devrait valider une date valide', () => {
      expect(DateExtractor.isValidDate('2025-01-15')).toBe(true);
    });

    test('devrait rejeter une date invalide', () => {
      expect(DateExtractor.isValidDate('invalid')).toBe(false);
    });
  });
});

