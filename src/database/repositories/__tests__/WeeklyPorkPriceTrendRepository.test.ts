/**
 * Tests pour WeeklyPorkPriceTrendRepository
 */

import { WeeklyPorkPriceTrendRepository, type WeeklyPorkPriceTrend, type CreateWeeklyPorkPriceTrendInput } from '../WeeklyPorkPriceTrendRepository';
import { BaseRepository } from '../BaseRepository';

// Mock dependencies
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

jest.mock('../BaseRepository');

describe('WeeklyPorkPriceTrendRepository', () => {
  let repository: WeeklyPorkPriceTrendRepository;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };
    repository = new WeeklyPorkPriceTrendRepository(mockDb);
  });

  describe('constructor', () => {
    it('devrait créer une instance', () => {
      expect(repository).toBeDefined();
    });
  });

  describe('create', () => {
    it('devrait créer une tendance avec toutes les données', async () => {
      const input: CreateWeeklyPorkPriceTrendInput = {
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2000,
        avgPriceRegional: 2300,
        transactionsCount: 5,
        offersCount: 2,
        listingsCount: 10,
        sourcePriority: 'platform',
        totalWeightKg: 100.5,
        totalPriceFcfa: 200000,
      };

      const mockTrend: WeeklyPorkPriceTrend = {
        id: 'test-uuid-123',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2000,
        avgPriceRegional: 2300,
        transactionsCount: 5,
        offersCount: 2,
        listingsCount: 10,
        sourcePriority: 'platform',
        totalWeightKg: 100.5,
        totalPriceFcfa: 200000,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue({
        id: 'test-uuid-123',
        year: 2024,
        week_number: 1,
        avg_price_platform: 2000,
        avg_price_regional: 2300,
        transactions_count: 5,
        offers_count: 2,
        listings_count: 10,
        source_priority: 'platform',
        total_weight_kg: 100.5,
        total_price_fcfa: 200000,
        updated_at: '2024-01-01T00:00:00Z',
      });

      const result = await repository.create(input);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.arrayContaining([
          'test-uuid-123',
          2024,
          1,
          2000,
          2300,
          5,
          2,
          10,
          'platform',
          100.5,
          200000,
          expect.any(String),
        ])
      );
      expect(result.year).toBe(2024);
      expect(result.weekNumber).toBe(1);
    });

    it('devrait créer une tendance avec des valeurs par défaut', async () => {
      const input: CreateWeeklyPorkPriceTrendInput = {
        year: 2024,
        weekNumber: 1,
      };

      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue({
        id: 'test-uuid-123',
        year: 2024,
        week_number: 1,
        avg_price_platform: null,
        avg_price_regional: null,
        transactions_count: 0,
        offers_count: 0,
        listings_count: 0,
        source_priority: 'platform',
        total_weight_kg: null,
        total_price_fcfa: null,
        updated_at: '2024-01-01T00:00:00Z',
      });

      const result = await repository.create(input);

      expect(result.transactionsCount).toBe(0);
      expect(result.offersCount).toBe(0);
      expect(result.listingsCount).toBe(0);
      expect(result.sourcePriority).toBe('platform');
    });

    it('devrait lancer une erreur si la création échoue', async () => {
      const input: CreateWeeklyPorkPriceTrendInput = {
        year: 2024,
        weekNumber: 1,
      };

      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(null);

      await expect(repository.create(input)).rejects.toThrow('Failed to create weekly pork price trend');
    });
  });

  describe('findByYearAndWeek', () => {
    it('devrait trouver une tendance par année et semaine', async () => {
      const mockRow = {
        id: 'test-id',
        year: 2024,
        week_number: 1,
        avg_price_platform: 2000,
        avg_price_regional: 2300,
        transactions_count: 5,
        offers_count: 2,
        listings_count: 10,
        source_priority: 'platform',
        total_weight_kg: 100.5,
        total_price_fcfa: 200000,
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockDb.getFirstAsync.mockResolvedValue(mockRow);

      const result = await repository.findByYearAndWeek(2024, 1);

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT *'),
        [2024, 1]
      );
      expect(result).toBeDefined();
      expect(result?.year).toBe(2024);
      expect(result?.weekNumber).toBe(1);
    });

    it('devrait retourner null si non trouvé', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await repository.findByYearAndWeek(2024, 1);

      expect(result).toBeNull();
    });
  });

  describe('updateByYearAndWeek', () => {
    it('devrait mettre à jour une tendance existante', async () => {
      const updates = {
        avgPricePlatform: 2100,
        transactionsCount: 6,
      };

      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'test-id',
        year: 2024,
        week_number: 1,
        avg_price_platform: 2100,
        avg_price_regional: 2300,
        transactions_count: 6,
        offers_count: 2,
        listings_count: 10,
        source_priority: 'platform',
        total_weight_kg: 100.5,
        total_price_fcfa: 200000,
        updated_at: '2024-01-01T00:00:00Z',
      });

      const result = await repository.updateByYearAndWeek(2024, 1, updates);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining([2100, 6, expect.any(String), 2024, 1])
      );
      expect(result.avgPricePlatform).toBe(2100);
      expect(result.transactionsCount).toBe(6);
    });

    it('devrait mettre à jour tous les champs', async () => {
      const updates = {
        avgPricePlatform: 2100,
        avgPriceRegional: 2400,
        transactionsCount: 6,
        offersCount: 3,
        listingsCount: 11,
        sourcePriority: 'offers' as const,
        totalWeightKg: 110.5,
        totalPriceFcfa: 210000,
      };

      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'test-id',
        year: 2024,
        week_number: 1,
        ...updates,
        updated_at: '2024-01-01T00:00:00Z',
      });

      const result = await repository.updateByYearAndWeek(2024, 1, updates);

      expect(result.avgPricePlatform).toBe(2100);
      expect(result.sourcePriority).toBe('offers');
    });

    it('devrait lancer une erreur si la mise à jour échoue', async () => {
      const updates = {
        avgPricePlatform: 2100,
      };

      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(null);

      await expect(repository.updateByYearAndWeek(2024, 1, updates)).rejects.toThrow(
        'Failed to update weekly pork price trend'
      );
    });
  });

  describe('upsert', () => {
    it('devrait créer si non existant', async () => {
      const input: CreateWeeklyPorkPriceTrendInput = {
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2000,
      };

      mockDb.getFirstAsync.mockResolvedValueOnce(null); // findByYearAndWeek
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValueOnce({
        id: 'test-uuid-123',
        year: 2024,
        week_number: 1,
        avg_price_platform: 2000,
        avg_price_regional: null,
        transactions_count: 0,
        offers_count: 0,
        listings_count: 0,
        source_priority: 'platform',
        total_weight_kg: null,
        total_price_fcfa: null,
        updated_at: '2024-01-01T00:00:00Z',
      });

      const result = await repository.upsert(input);

      expect(mockDb.runAsync).toHaveBeenCalled(); // create called
      expect(result.year).toBe(2024);
    });

    it('devrait mettre à jour si existant', async () => {
      const input: CreateWeeklyPorkPriceTrendInput = {
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2100,
      };

      const existing = {
        id: 'test-id',
        year: 2024,
        week_number: 1,
        avg_price_platform: 2000,
        avg_price_regional: null,
        transactions_count: 0,
        offers_count: 0,
        listings_count: 0,
        source_priority: 'platform',
        total_weight_kg: null,
        total_price_fcfa: null,
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockDb.getFirstAsync.mockResolvedValueOnce(existing); // findByYearAndWeek
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValueOnce({
        ...existing,
        avg_price_platform: 2100,
      });

      const result = await repository.upsert(input);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
      expect(result.avgPricePlatform).toBe(2100);
    });
  });

  describe('findLastWeeks', () => {
    it('devrait trouver les dernières semaines', async () => {
      const mockRows = [
        {
          id: '1',
          year: 2024,
          week_number: 1,
          avg_price_platform: 2000,
          avg_price_regional: 2300,
          transactions_count: 5,
          offers_count: 2,
          listings_count: 10,
          source_priority: 'platform',
          total_weight_kg: 100.5,
          total_price_fcfa: 200000,
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          year: 2024,
          week_number: 2,
          avg_price_platform: 2100,
          avg_price_regional: 2300,
          transactions_count: 6,
          offers_count: 2,
          listings_count: 10,
          source_priority: 'platform',
          total_weight_kg: 110.5,
          total_price_fcfa: 210000,
          updated_at: '2024-01-08T00:00:00Z',
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockRows);

      const result = await repository.findLastWeeks(2);

      expect(result).toHaveLength(2);
      expect(result[0].weekNumber).toBe(1);
      expect(result[1].weekNumber).toBe(2);
    });

    it('devrait utiliser 26 semaines par défaut', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await repository.findLastWeeks();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), 26])
      );
    });
  });

  describe('findCurrentWeek', () => {
    it('devrait trouver la tendance de la semaine en cours', async () => {
      const now = new Date();
      const year = now.getFullYear();
      const mockRow = {
        id: 'test-id',
        year,
        week_number: expect.any(Number),
        avg_price_platform: 2000,
        avg_price_regional: 2300,
        transactions_count: 5,
        offers_count: 2,
        listings_count: 10,
        source_priority: 'platform',
        total_weight_kg: 100.5,
        total_price_fcfa: 200000,
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockDb.getFirstAsync.mockResolvedValue(mockRow);

      const result = await repository.findCurrentWeek();

      expect(result).toBeDefined();
      expect(mockDb.getFirstAsync).toHaveBeenCalled();
    });
  });

  describe('mapRow', () => {
    it('devrait mapper correctement les données de la base', async () => {
      const row = {
        id: 'test-id',
        year: 2024,
        week_number: 1,
        avg_price_platform: 2000,
        avg_price_regional: 2300,
        transactions_count: 5,
        offers_count: 2,
        listings_count: 10,
        source_priority: 'platform',
        total_weight_kg: 100.5,
        total_price_fcfa: 200000,
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Accéder à mapRow via findByYearAndWeek
      mockDb.getFirstAsync.mockResolvedValue(row);

      const result = await repository.findByYearAndWeek(2024, 1);
      
      expect(result).toBeDefined();
      if (result) {
        expect(result.id).toBe('test-id');
        expect(result.year).toBe(2024);
        expect(result.weekNumber).toBe(1);
        expect(result.avgPricePlatform).toBe(2000);
        expect(result.sourcePriority).toBe('platform');
      }
    });

    it('devrait gérer les valeurs null/undefined', async () => {
      const row = {
        id: 'test-id',
        year: 2024,
        week_number: 1,
        avg_price_platform: null,
        avg_price_regional: null,
        transactions_count: 0,
        offers_count: 0,
        listings_count: 0,
        source_priority: 'platform',
        total_weight_kg: null,
        total_price_fcfa: null,
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockDb.getFirstAsync.mockResolvedValue(row);

      const result = await repository.findByYearAndWeek(2024, 1);
      
      expect(result).toBeDefined();
      if (result) {
        expect(result.avgPricePlatform).toBeUndefined();
        expect(result.avgPriceRegional).toBeUndefined();
        expect(result.totalWeightKg).toBeUndefined();
      }
    });
  });
});

