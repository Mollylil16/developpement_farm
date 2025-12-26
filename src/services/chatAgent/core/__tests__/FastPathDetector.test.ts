/**
 * Tests unitaires pour FastPathDetector
 */

import { FastPathDetector } from '../FastPathDetector';

describe('FastPathDetector', () => {
  describe('detectFastPath', () => {
    test('devrait détecter une dépense avec montant', () => {
      const result = FastPathDetector.detectFastPath('Dépense Aliment 100000');
      expect(result.intent?.action).toBe('create_depense');
      expect(result.intent?.params.montant).toBe(100000);
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });

    test('devrait détecter une dépense avec argot', () => {
      const result = FastPathDetector.detectFastPath('J\'ai claqué 150k en bouffe');
      expect(result.intent?.action).toBe('create_depense');
      expect(result.intent?.params.montant).toBe(150000);
    });

    test('devrait détecter une vente', () => {
      const result = FastPathDetector.detectFastPath('J\'ai vendu 5 porcs à 800000');
      expect(result.intent?.action).toBe('create_revenu');
      expect(result.intent?.params.montant).toBe(800000);
      expect(result.intent?.params.nombre).toBe(5);
    });

    test('devrait détecter une pesée', () => {
      const result = FastPathDetector.detectFastPath('Peser P001 il fait 45 kg');
      expect(result.intent?.action).toBe('create_pesee');
      expect(result.intent?.params.poids_kg).toBe(45);
      expect(result.intent?.params.animal_code).toBe('P001');
    });

    test('devrait détecter une vaccination', () => {
      const result = FastPathDetector.detectFastPath('Vaccin P002');
      expect(result.intent?.action).toBe('create_vaccination');
      expect(result.intent?.params.animal_code).toBe('P002');
    });

    test('devrait détecter les statistiques', () => {
      const result = FastPathDetector.detectFastPath('Combien de porc actif');
      expect(result.intent?.action).toBe('get_statistics');
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });

    test('devrait détecter les stocks', () => {
      const result = FastPathDetector.detectFastPath('Quel est le stock actuel');
      expect(result.intent?.action).toBe('get_stock_status');
    });

    test('devrait retourner null si pas de détection rapide', () => {
      const result = FastPathDetector.detectFastPath('Bonjour comment ça va');
      expect(result.intent).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });
});

