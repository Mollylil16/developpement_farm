/**
 * Tests pour utils/formatters
 * Teste la robustesse de tous les formatters
 */

import {
  formatMontant,
  formatMontantAvecDevise,
  formatNombre,
  formatPoids,
  formatPourcentage,
  parseMontant,
  parseNombre,
  calculatePercentage,
  formatDate,
  formatDateCourt,
  roundTo,
  clamp,
  isValidNumber,
  toSafeNumber,
} from '../formatters';
import { calculateMargin } from '../margeCalculations';

describe('formatters', () => {
  describe('formatMontant', () => {
    it('formate les montants correctement', () => {
      expect(formatMontant(1000)).toBe('1 000');
      expect(formatMontant(1234567)).toBe('1 234 567');
      expect(formatMontant(100)).toBe('100');
      expect(formatMontant(0)).toBe('0');
    });

    it('gère les décimales en arrondissant', () => {
      expect(formatMontant(1234.56)).toBe('1 235');
      expect(formatMontant(999.99)).toBe('1 000');
      expect(formatMontant(1.4)).toBe('1');
    });

    it('gère les nombres négatifs', () => {
      expect(formatMontant(-1000)).toBe('-1 000');
      expect(formatMontant(-1234567)).toBe('-1 234 567');
    });

    it('gère undefined/null/NaN gracieusement', () => {
      expect(formatMontant(undefined)).toBe('0');
      expect(formatMontant(null)).toBe('0');
      expect(formatMontant(NaN)).toBe('0');
    });
  });

  describe('formatMontantAvecDevise', () => {
    it('ajoute FCFA au montant', () => {
      expect(formatMontantAvecDevise(1000)).toBe('1 000 FCFA');
      expect(formatMontantAvecDevise(0)).toBe('0 FCFA');
    });

    it('gère undefined/null gracieusement', () => {
      expect(formatMontantAvecDevise(undefined)).toBe('0 FCFA');
      expect(formatMontantAvecDevise(null)).toBe('0 FCFA');
    });
  });

  describe('formatNombre', () => {
    it('formate avec 2 décimales par défaut', () => {
      expect(formatNombre(123.456)).toBe('123,46');
      expect(formatNombre(100)).toBe('100,00');
    });

    it('formate avec décimales personnalisées', () => {
      expect(formatNombre(123.456, 1)).toBe('123,5');
      expect(formatNombre(123.456, 3)).toBe('123,456');
      expect(formatNombre(123.456, 0)).toBe('123');
    });

    it('gère undefined/null/NaN', () => {
      expect(formatNombre(undefined)).toBe('0');
      expect(formatNombre(null, 2)).toBe('0');
      expect(formatNombre(NaN, 1)).toBe('0');
    });
  });

  describe('formatPoids', () => {
    it('formate avec unité kg', () => {
      expect(formatPoids(120.5)).toBe('120,5 kg');
      expect(formatPoids(100)).toBe('100,0 kg');
    });

    it('gère undefined/null', () => {
      expect(formatPoids(undefined)).toBe('0 kg');
      expect(formatPoids(null)).toBe('0 kg');
    });
  });

  describe('formatPourcentage', () => {
    it('formate avec symbole %', () => {
      expect(formatPourcentage(25.5)).toBe('25,5%');
      expect(formatPourcentage(100)).toBe('100,0%');
      expect(formatPourcentage(0)).toBe('0,0%');
    });

    it('gère undefined/null', () => {
      expect(formatPourcentage(undefined)).toBe('0%');
      expect(formatPourcentage(null)).toBe('0%');
    });
  });

  describe('parseMontant', () => {
    it('parse les chaînes avec espaces', () => {
      expect(parseMontant('1 000')).toBe(1000);
      expect(parseMontant('1 234 567')).toBe(1234567);
    });

    it('gère les virgules comme séparateurs décimaux', () => {
      expect(parseMontant('123,45')).toBe(123.45);
      expect(parseMontant('1 234,56')).toBe(1234.56);
    });

    it('gère les chaînes invalides', () => {
      expect(parseMontant('abc')).toBe(0);
      expect(parseMontant('')).toBe(0);
      expect(parseMontant(undefined)).toBe(0);
      expect(parseMontant(null)).toBe(0);
    });
  });

  describe('parseNombre', () => {
    it('parse les nombres correctement', () => {
      expect(parseNombre('123')).toBe(123);
      expect(parseNombre('123.45')).toBe(123.45);
      expect(parseNombre('123,45')).toBe(123.45);
    });

    it('utilise la valeur par défaut si invalide', () => {
      expect(parseNombre('abc', 10)).toBe(10);
      expect(parseNombre(undefined, 5)).toBe(5);
      expect(parseNombre(null, -1)).toBe(-1);
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

    it('gère undefined/null', () => {
      expect(calculateMargin(undefined, 100)).toBe(-100);
      expect(calculateMargin(100, null)).toBe(100);
      expect(calculateMargin(null, undefined)).toBe(0);
    });
  });

  describe('calculatePercentage', () => {
    it('calcule les pourcentages correctement', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(1, 4)).toBe(25);
    });

    it('gère la division par zéro', () => {
      expect(calculatePercentage(100, 0)).toBe(0);
      expect(calculatePercentage(0, 0)).toBe(0);
    });

    it('gère undefined/null', () => {
      expect(calculatePercentage(undefined, 100)).toBe(0);
      expect(calculatePercentage(100, null)).toBe(0);
    });
  });

  describe('formatDate', () => {
    it('formate les dates ISO', () => {
      const result = formatDate('2024-11-26');
      expect(result).toMatch(/26.*nov.*2024/i);
    });

    it('formate les objets Date', () => {
      const date = new Date(2024, 10, 26); // 26 nov 2024
      const result = formatDate(date);
      expect(result).toMatch(/26.*nov.*2024/i);
    });

    it('gère les dates invalides', () => {
      expect(formatDate('invalid')).toBe('-');
      expect(formatDate(undefined)).toBe('-');
      expect(formatDate(null)).toBe('-');
    });
  });

  describe('formatDateCourt', () => {
    it('formate au format court', () => {
      expect(formatDateCourt('2024-11-26')).toBe('26/11/2024');
    });

    it('gère les dates invalides', () => {
      expect(formatDateCourt('invalid')).toBe('-');
      expect(formatDateCourt(undefined)).toBe('-');
    });
  });

  describe('roundTo', () => {
    it('arrondit correctement', () => {
      expect(roundTo(123.456, 2)).toBe(123.46);
      expect(roundTo(123.456, 1)).toBe(123.5);
      expect(roundTo(123.456, 0)).toBe(123);
    });

    it('gère undefined/null', () => {
      expect(roundTo(undefined, 2)).toBe(0);
      expect(roundTo(null, 1)).toBe(0);
      expect(roundTo(NaN, 2)).toBe(0);
    });
  });

  describe('clamp', () => {
    it('limite entre min et max', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('gère undefined/null', () => {
      expect(clamp(undefined, 0, 10)).toBe(0);
      expect(clamp(null, 5, 15)).toBe(5);
    });
  });

  describe('isValidNumber', () => {
    it('valide les nombres corrects', () => {
      expect(isValidNumber(123)).toBe(true);
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(-123.45)).toBe(true);
    });

    it('rejette les valeurs invalides', () => {
      expect(isValidNumber(NaN)).toBe(false);
      expect(isValidNumber(Infinity)).toBe(false);
      expect(isValidNumber(-Infinity)).toBe(false);
      expect(isValidNumber(undefined)).toBe(false);
      expect(isValidNumber(null)).toBe(false);
      expect(isValidNumber('123')).toBe(false);
    });
  });

  describe('toSafeNumber', () => {
    it('convertit les nombres valides', () => {
      expect(toSafeNumber(123)).toBe(123);
      expect(toSafeNumber(-45.6)).toBe(-45.6);
    });

    it('convertit les chaînes', () => {
      expect(toSafeNumber('123')).toBe(123);
      expect(toSafeNumber('123,45')).toBe(123.45);
      expect(toSafeNumber('1 000')).toBe(1000);
    });

    it('utilise la valeur par défaut', () => {
      expect(toSafeNumber(undefined, 10)).toBe(10);
      expect(toSafeNumber(null, 5)).toBe(5);
      expect(toSafeNumber(NaN, -1)).toBe(-1);
      expect(toSafeNumber('abc', 100)).toBe(100);
    });
  });
});

