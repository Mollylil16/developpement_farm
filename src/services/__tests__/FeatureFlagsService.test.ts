/**
 * Tests pour FeatureFlagsService
 */

import FeatureFlagsService, {
  getFeatureFlagsService,
  FeatureFlagConfig,
  ABTestConfig,
  UserContext,
} from '../FeatureFlagsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = getFeatureFlagsService();
    service.reset();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Singleton', () => {
    it('devrait retourner la même instance', () => {
      const instance1 = getFeatureFlagsService();
      const instance2 = getFeatureFlagsService();
      expect(instance1).toBe(instance2);
    });
  });

  describe('registerFlag', () => {
    it('devrait enregistrer un flag', () => {
      const config: FeatureFlagConfig = {
        key: 'test_flag',
        defaultValue: false,
        description: 'Test flag',
      };

      service.registerFlag(config);
      const flags = service.getAllFlags();
      expect(flags).toHaveLength(1);
      expect(flags[0].key).toBe('test_flag');
    });

    it('devrait enregistrer plusieurs flags', () => {
      const configs: FeatureFlagConfig[] = [
        { key: 'flag1', defaultValue: false },
        { key: 'flag2', defaultValue: true },
      ];

      service.registerFlags(configs);
      const flags = service.getAllFlags();
      expect(flags).toHaveLength(2);
    });
  });

  describe('isEnabled', () => {
    it('devrait retourner false par défaut si flag non enregistré', async () => {
      const result = await service.isEnabled('unknown_flag');
      expect(result).toBe(false);
    });

    it('devrait retourner la valeur par défaut du flag', async () => {
      service.registerFlag({
        key: 'test_flag',
        defaultValue: true,
      });

      const result = await service.isEnabled('test_flag');
      expect(result).toBe(true);
    });

    it('devrait respecter le targeting par rôle', async () => {
      service.registerFlag({
        key: 'producer_only',
        defaultValue: false,
        targetRoles: ['producer'],
      });

      const contextProducer: UserContext = { userId: 'user-1', role: 'producer' };
      const contextBuyer: UserContext = { userId: 'user-2', role: 'buyer' };

      const resultProducer = await service.isEnabled('producer_only', contextProducer);
      const resultBuyer = await service.isEnabled('producer_only', contextBuyer);

      expect(resultProducer).toBe(true);
      expect(resultBuyer).toBe(false);
    });

    it('devrait respecter le targeting par utilisateur', async () => {
      service.registerFlag({
        key: 'beta_user',
        defaultValue: false,
        targetUsers: ['user-1', 'user-2'],
      });

      const contextTargeted: UserContext = { userId: 'user-1' };
      const contextNotTargeted: UserContext = { userId: 'user-3' };

      const resultTargeted = await service.isEnabled('beta_user', contextTargeted);
      const resultNotTargeted = await service.isEnabled('beta_user', contextNotTargeted);

      expect(resultTargeted).toBe(true);
      expect(resultNotTargeted).toBe(false);
    });

    it('devrait respecter le rollout progressif', async () => {
      service.registerFlag({
        key: 'gradual_rollout',
        defaultValue: false,
        rolloutPercentage: 50, // 50% des utilisateurs
      });

      // Tester avec plusieurs utilisateurs
      const results: boolean[] = [];
      for (let i = 0; i < 100; i++) {
        const context: UserContext = { userId: `user-${i}` };
        const result = await service.isEnabled('gradual_rollout', context);
        results.push(result);
      }

      // Environ 50% devraient être activés (tolérance de ±10%)
      const enabledCount = results.filter(Boolean).length;
      expect(enabledCount).toBeGreaterThan(40);
      expect(enabledCount).toBeLessThan(60);
    });
  });

  describe('getFlagValue', () => {
    it('devrait retourner la valeur du flag', async () => {
      service.registerFlag({
        key: 'string_flag',
        defaultValue: 'test_value',
      });

      const value = await service.getFlagValue('string_flag');
      expect(value).toBe('test_value');
    });

    it('devrait prioriser les flags distants', async () => {
      service.registerFlag({
        key: 'local_flag',
        defaultValue: false,
      });

      await service.syncRemoteFlags({
        local_flag: true,
      });

      const value = await service.getFlagValue('local_flag');
      expect(value).toBe(true);
    });
  });

  describe('AB Testing', () => {
    it('devrait assigner une variante de manière déterministe', async () => {
      const abTest: ABTestConfig = {
        key: 'test_ab',
        variants: [
          { name: 'control', percentage: 50, value: 'control_value' },
          { name: 'variant_a', percentage: 50, value: 'variant_a_value' },
        ],
      };

      service.registerABTest(abTest);

      const context: UserContext = { userId: 'user-1' };
      const value1 = await service.getFlagValue('test_ab', context);
      const value2 = await service.getFlagValue('test_ab', context);

      // Même utilisateur = même variante
      expect(value1).toBe(value2);
    });

    it('devrait respecter les pourcentages des variantes', async () => {
      const abTest: ABTestConfig = {
        key: 'test_ab',
        variants: [
          { name: 'control', percentage: 50, value: 'control' },
          { name: 'variant_a', percentage: 50, value: 'variant_a' },
        ],
      };

      service.registerABTest(abTest);

      const results: string[] = [];
      for (let i = 0; i < 100; i++) {
        const context: UserContext = { userId: `user-${i}` };
        const value = await service.getFlagValue('test_ab', context);
        results.push(String(value));
      }

      const controlCount = results.filter((v) => v === 'control').length;
      const variantCount = results.filter((v) => v === 'variant_a').length;

      // Environ 50% pour chaque variante (tolérance de ±10%)
      expect(controlCount).toBeGreaterThan(40);
      expect(controlCount).toBeLessThan(60);
      expect(variantCount).toBeGreaterThan(40);
      expect(variantCount).toBeLessThan(60);
    });

    it('devrait utiliser la variante par défaut si pas d assignation', async () => {
      const abTest: ABTestConfig = {
        key: 'test_ab',
        variants: [
          { name: 'control', percentage: 50, value: 'control' },
          { name: 'variant_a', percentage: 50, value: 'variant_a' },
        ],
        defaultVariant: 'control',
      };

      service.registerABTest(abTest);

      const value = await service.getFlagValue('test_ab');
      expect(value).toBe('control');
    });
  });

  describe('syncRemoteFlags', () => {
    it('devrait synchroniser les flags distants', async () => {
      await service.syncRemoteFlags({
        remote_flag_1: true,
        remote_flag_2: 'test_value',
      });

      const value1 = await service.getFlagValue('remote_flag_1');
      const value2 = await service.getFlagValue('remote_flag_2');

      expect(value1).toBe(true);
      expect(value2).toBe('test_value');
    });

    it('devrait sauvegarder dans le cache', async () => {
      await service.syncRemoteFlags({
        cached_flag: true,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@feature_flags_cache',
        expect.stringContaining('cached_flag')
      );
    });
  });

  describe('reset', () => {
    it('devrait réinitialiser tous les flags', () => {
      service.registerFlag({ key: 'flag1', defaultValue: true });
      service.registerABTest({
        key: 'test1',
        variants: [{ name: 'v1', percentage: 100, value: true }],
      });

      service.reset();

      expect(service.getAllFlags()).toHaveLength(0);
      expect(service.getAllABTests()).toHaveLength(0);
    });
  });
});

