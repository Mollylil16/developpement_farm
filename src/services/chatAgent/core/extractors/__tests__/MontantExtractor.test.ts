/**
 * Tests unitaires pour MontantExtractor
 */

import { MontantExtractor } from '../MontantExtractor';

describe('MontantExtractor', () => {
  describe('extract', () => {
    test('devrait extraire un montant standard', () => {
      expect(MontantExtractor.extract('J\'ai dépensé 100000 FCFA')).toBe(100000);
      expect(MontantExtractor.extract('Dépense de 800 000')).toBe(800000);
      expect(MontantExtractor.extract('Vente de 500000')).toBe(500000);
    });

    test('devrait extraire un montant avec abréviation k', () => {
      expect(MontantExtractor.extract('J\'ai claqué 150k')).toBe(150000);
      expect(MontantExtractor.extract('Dépense 80k en bouffe')).toBe(80000);
    });

    test('devrait extraire un montant avec million', () => {
      expect(MontantExtractor.extract('Vente de 1 million')).toBe(1000000);
      expect(MontantExtractor.extract('Dépense 1.5 million')).toBe(1500000);
    });

    test('devrait extraire un montant avec argot ivoirien "balles"', () => {
      expect(MontantExtractor.extract('J\'ai dépensé 150 balles')).toBe(150000);
      expect(MontantExtractor.extract('150 balles en bouffe')).toBe(150000);
    });

    test('devrait extraire un montant après préposition', () => {
      expect(MontantExtractor.extract('Dépense pour 50000')).toBe(50000);
      expect(MontantExtractor.extract('Vendu à 800000')).toBe(800000);
      expect(MontantExtractor.extract('Payé de 25000')).toBe(25000);
    });

    test('devrait exclure les quantités', () => {
      expect(MontantExtractor.extract('J\'ai vendu 5 porcs à 800000')).toBe(800000);
      expect(MontantExtractor.extract('Acheté 20 sacs à 18000')).toBe(18000);
    });

    test('devrait retourner null si pas de montant valide', () => {
      expect(MontantExtractor.extract('Bonjour')).toBeNull();
      expect(MontantExtractor.extract('J\'ai 5 porcs')).toBeNull();
      expect(MontantExtractor.extract('')).toBeNull();
    });

    test('devrait exclure les nombres explicitement exclus', () => {
      expect(
        MontantExtractor.extract('J\'ai vendu 5 porcs à 800000', {
          excludeNumbers: [5],
        })
      ).toBe(800000);
    });
  });
});

