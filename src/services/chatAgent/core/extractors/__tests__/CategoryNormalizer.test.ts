/**
 * Tests unitaires pour CategoryNormalizer
 */

import { CategoryNormalizer } from '../CategoryNormalizer';

describe('CategoryNormalizer', () => {
  let normalizer: CategoryNormalizer;

  beforeEach(() => {
    normalizer = new CategoryNormalizer();
  });

  describe('normalize', () => {
    test('devrait normaliser les catégories standard', () => {
      expect(normalizer.normalize('alimentation')).toBe('alimentation');
      expect(normalizer.normalize('medicaments')).toBe('medicaments');
      expect(normalizer.normalize('veterinaire')).toBe('veterinaire');
    });

    test('devrait normaliser les synonymes ivoiriens', () => {
      expect(normalizer.normalize('bouffe')).toBe('alimentation');
      expect(normalizer.normalize('manger')).toBe('alimentation');
      expect(normalizer.normalize('provende')).toBe('alimentation');
      expect(normalizer.normalize('véto')).toBe('veterinaire');
      expect(normalizer.normalize('médoc')).toBe('medicaments');
    });

    test('devrait retourner "autre" si catégorie inconnue', () => {
      expect(normalizer.normalize('inconnu')).toBe('autre');
      expect(normalizer.normalize('')).toBe('autre');
    });
  });

  describe('extractFromText', () => {
    test('devrait extraire la catégorie depuis un texte', () => {
      expect(normalizer.extractFromText('Dépense bouffe 100000')).toBe('alimentation');
      expect(normalizer.extractFromText('J\'ai acheté de la provende')).toBe('alimentation');
      expect(normalizer.extractFromText('Consultation véto')).toBe('veterinaire');
      expect(normalizer.extractFromText('Acheté des médicaments')).toBe('medicaments');
    });

    test('devrait retourner null si pas de catégorie trouvée', () => {
      expect(normalizer.extractFromText('Bonjour')).toBeNull();
      expect(normalizer.extractFromText('Combien de porcs')).toBeNull();
    });
  });

  describe('recordCorrection', () => {
    test('devrait enregistrer une correction', () => {
      normalizer.recordCorrection('bouffe', 'alimentation');
      const prefs = normalizer.getUserPreferences();
      expect(prefs?.corrections.length).toBeGreaterThan(0);
    });

    test('devrait ajouter une correction au mapping après 3 fois', () => {
      normalizer.recordCorrection('ma_catégorie', 'alimentation');
      normalizer.recordCorrection('ma_catégorie', 'alimentation');
      normalizer.recordCorrection('ma_catégorie', 'alimentation');
      
      const prefs = normalizer.getUserPreferences();
      expect(prefs?.customMappings['ma_catégorie']).toBe('alimentation');
    });
  });
});

