/**
 * Tests pour financeCache
 * Teste le système de cache pour les calculs financiers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setCachedCoutsProduction,
  getCachedCoutsProduction,
  setCachedMargesVente,
  getCachedMargesVente,
  invalidateCoutsProductionCache,
  invalidateMargesVenteCache,
  clearExpiredFinanceCaches,
  clearAllFinanceCaches,
} from '../financeCache';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('financeCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
  });

  describe('setCachedCoutsProduction', () => {
    it('devrait mettre en cache les coûts de production', async () => {
      const couts = {
        total_opex: 1000000,
        total_amortissement_capex: 200000,
        total_kg_vendus: 5000,
        cout_kg_opex: 200,
        cout_kg_complet: 240,
      };

      await setCachedCoutsProduction('proj-1', '2025-01-01', '2025-01-31', couts);

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
      const [key, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      expect(key).toContain('cout_production');
      expect(key).toContain('proj-1');
      const parsedValue = JSON.parse(value);
      expect(parsedValue.data).toEqual(couts);
      expect(parsedValue.projetId).toBe('proj-1');
      expect(parsedValue.timestamp).toBeDefined();
    });
  });

  describe('getCachedCoutsProduction', () => {
    it('devrait récupérer les coûts de production depuis le cache', async () => {
      const couts = {
        total_opex: 1000000,
        total_amortissement_capex: 200000,
        total_kg_vendus: 5000,
        cout_kg_opex: 200,
        cout_kg_complet: 240,
      };

      const cacheEntry = {
        data: couts,
        timestamp: Date.now(),
        projetId: 'proj-1',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await getCachedCoutsProduction('proj-1', '2025-01-01', '2025-01-31');

      expect(result).toEqual(couts);
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner null si le cache est expiré', async () => {
      const cacheEntry = {
        data: { total_opex: 1000000 },
        timestamp: Date.now() - 11 * 60 * 1000, // Plus de 10 minutes
        projetId: 'proj-1',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await getCachedCoutsProduction('proj-1', '2025-01-01', '2025-01-31');

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalled(); // Devrait nettoyer le cache expiré
    });

    it('devrait retourner null si le cache n\'existe pas', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getCachedCoutsProduction('proj-1', '2025-01-01', '2025-01-31');

      expect(result).toBeNull();
    });
  });

  describe('setCachedMargesVente', () => {
    it('devrait mettre en cache les marges d\'une vente', async () => {
      const marges = {
        poids_kg: 120,
        cout_kg_opex: 800,
        cout_kg_complet: 900,
        cout_reel_opex: 96000,
        cout_reel_complet: 108000,
        marge_opex: 40000,
        marge_complete: 30000,
        marge_opex_pourcent: 25,
        marge_complete_pourcent: 18.75,
      };

      await setCachedMargesVente('vente-1', marges);

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
      const [key, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      expect(key).toContain('marges_vente');
      expect(key).toContain('vente-1');
      const parsedValue = JSON.parse(value);
      expect(parsedValue.data).toEqual(marges);
      expect(parsedValue.timestamp).toBeDefined();
    });
  });

  describe('getCachedMargesVente', () => {
    it('devrait récupérer les marges depuis le cache', async () => {
      const marges = {
        poids_kg: 120,
        cout_kg_opex: 800,
        cout_kg_complet: 900,
        cout_reel_opex: 96000,
        cout_reel_complet: 108000,
        marge_opex: 40000,
        marge_complete: 30000,
        marge_opex_pourcent: 25,
        marge_complete_pourcent: 18.75,
      };

      const cacheEntry = {
        data: marges,
        timestamp: Date.now(),
        projetId: '',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await getCachedMargesVente('vente-1');

      expect(result).toEqual(marges);
    });

    it('devrait retourner null si le cache est expiré', async () => {
      const cacheEntry = {
        data: { marge_opex: 40000 },
        timestamp: Date.now() - 11 * 60 * 1000, // Plus de 10 minutes
        projetId: '',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await getCachedMargesVente('vente-1');

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('invalidateCoutsProductionCache', () => {
    it('devrait invalider tous les caches de coûts pour un projet', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@fermier_pro:finance_cache:cout_production:proj-1:2025-01-01:2025-01-31',
        '@fermier_pro:finance_cache:cout_production:proj-1:2025-02-01:2025-02-28',
        '@fermier_pro:finance_cache:marges_vente:vente-1', // Ne devrait pas être supprimé
      ]);

      await invalidateCoutsProductionCache('proj-1');

      expect(AsyncStorage.multiRemove).toHaveBeenCalledTimes(1);
      const [keys] = (AsyncStorage.multiRemove as jest.Mock).mock.calls[0];
      expect(keys).toHaveLength(2); // Seulement les caches de coûts de production
      expect(keys[0]).toContain('cout_production');
      expect(keys[1]).toContain('cout_production');
    });
  });

  describe('invalidateMargesVenteCache', () => {
    it('devrait invalider le cache des marges pour une vente', async () => {
      await invalidateMargesVenteCache('vente-1');

      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
      const [key] = (AsyncStorage.removeItem as jest.Mock).mock.calls[0];
      expect(key).toContain('marges_vente');
      expect(key).toContain('vente-1');
    });
  });

  describe('clearExpiredFinanceCaches', () => {
    it('devrait nettoyer les caches expirés', async () => {
      const expiredEntry = {
        data: { total_opex: 1000000 },
        timestamp: Date.now() - 11 * 60 * 1000, // Expiré
        projetId: 'proj-1',
      };

      const validEntry = {
        data: { total_opex: 2000000 },
        timestamp: Date.now() - 5 * 60 * 1000, // Encore valide
        projetId: 'proj-1',
      };

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@fermier_pro:finance_cache:cout_production:proj-1:2025-01-01:2025-01-31',
        '@fermier_pro:finance_cache:cout_production:proj-1:2025-02-01:2025-02-28',
      ]);

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(expiredEntry))
        .mockResolvedValueOnce(JSON.stringify(validEntry));

      await clearExpiredFinanceCaches();

      // Devrait supprimer uniquement le cache expiré
      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearAllFinanceCaches', () => {
    it('devrait nettoyer tous les caches financiers', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@fermier_pro:finance_cache:cout_production:proj-1:2025-01-01:2025-01-31',
        '@fermier_pro:finance_cache:marges_vente:vente-1',
      ]);

      await clearAllFinanceCaches();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledTimes(1);
      const [keys] = (AsyncStorage.multiRemove as jest.Mock).mock.calls[0];
      expect(keys).toHaveLength(2);
    });

    it('devrait nettoyer uniquement les caches d\'un projet spécifique', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@fermier_pro:finance_cache:cout_production:proj-1:2025-01-01:2025-01-31',
        '@fermier_pro:finance_cache:cout_production:proj-2:2025-01-01:2025-01-31',
      ]);

      await clearAllFinanceCaches('proj-1');

      expect(AsyncStorage.multiRemove).toHaveBeenCalledTimes(1);
      const [keys] = (AsyncStorage.multiRemove as jest.Mock).mock.calls[0];
      expect(keys).toHaveLength(1);
      expect(keys[0]).toContain('proj-1');
    });
  });
});
