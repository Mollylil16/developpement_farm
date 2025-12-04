/**
 * Tests pour PorkPriceTrendService
 */

import { PorkPriceTrendService, getPorkPriceTrendService } from '../PorkPriceTrendService';
import { getDatabase } from '../database';
import {
  WeeklyPorkPriceTrendRepository,
  type WeeklyPorkPriceTrend,
} from '../../database/repositories/WeeklyPorkPriceTrendRepository';
import {
  MarketplaceTransactionRepository,
  MarketplaceOfferRepository,
} from '../../database/repositories/MarketplaceRepositories';
import { MarketplaceListingRepository } from '../../database/repositories/MarketplaceListingRepository';
import { AnimalRepository } from '../../database/repositories/AnimalRepository';
import { PeseeRepository } from '../../database/repositories/PeseeRepository';

// Mock dependencies
jest.mock('../database');
jest.mock('../../database/repositories/WeeklyPorkPriceTrendRepository');
jest.mock('../../database/repositories/MarketplaceRepositories');
jest.mock('../../database/repositories/MarketplaceListingRepository');
jest.mock('../../database/repositories/AnimalRepository');
jest.mock('../../database/repositories/PeseeRepository');

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('PorkPriceTrendService', () => {
  let service: PorkPriceTrendService;
  let mockDb: any;
  let mockTrendRepo: jest.Mocked<WeeklyPorkPriceTrendRepository>;
  let mockTransactionRepo: jest.Mocked<MarketplaceTransactionRepository>;
  let mockOfferRepo: jest.Mocked<MarketplaceOfferRepository>;
  let mockListingRepo: jest.Mocked<MarketplaceListingRepository>;
  let mockAnimalRepo: jest.Mocked<AnimalRepository>;
  let mockPeseeRepo: jest.Mocked<PeseeRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };

    mockTrendRepo = {
      upsert: jest.fn(),
      findByYearAndWeek: jest.fn(),
      findLastWeeks: jest.fn(),
    } as any;

    mockTransactionRepo = {
      findByBuyerId: jest.fn(),
      findById: jest.fn(),
    } as any;

    mockOfferRepo = {
      findByBuyerId: jest.fn(),
      findById: jest.fn(),
    } as any;

    mockListingRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
    } as any;

    mockAnimalRepo = {
      findById: jest.fn(),
    } as any;

    mockPeseeRepo = {
      findRecentByAnimalId: jest.fn(),
    } as any;

    mockGetDatabase.mockResolvedValue(mockDb);
    (WeeklyPorkPriceTrendRepository as jest.Mock).mockImplementation(() => mockTrendRepo);
    (MarketplaceTransactionRepository as jest.Mock).mockImplementation(() => mockTransactionRepo);
    (MarketplaceOfferRepository as jest.Mock).mockImplementation(() => mockOfferRepo);
    (MarketplaceListingRepository as jest.Mock).mockImplementation(() => mockListingRepo);
    (AnimalRepository as jest.Mock).mockImplementation(() => mockAnimalRepo);
    (PeseeRepository as jest.Mock).mockImplementation(() => mockPeseeRepo);

    service = new PorkPriceTrendService(mockDb);
  });

  describe('constructor', () => {
    it('devrait créer une instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('calculateWeeklyTrend', () => {
    it('devrait calculer la tendance avec des transactions', async () => {
      const year = 2024;
      const weekNumber = 1;

      const mockTransactions = [
        {
          id: '1',
          listingId: 'listing-1',
          finalPrice: 20000,
          subjectIds: ['animal-1'],
          status: 'completed',
          completedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          listingId: 'listing-2',
          finalPrice: 30000,
          subjectIds: ['animal-2'],
          status: 'completed',
          completedAt: '2024-01-02T00:00:00Z',
        },
      ] as any;

      const mockListings = [
        { id: 'listing-1', weight: 100 },
        { id: 'listing-2', weight: 150 },
      ] as any;

      const mockTrend: WeeklyPorkPriceTrend = {
        id: 'trend-1',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 200,
        avgPriceRegional: 2300,
        transactionsCount: 2,
        offersCount: 0,
        listingsCount: 0,
        sourcePriority: 'platform',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      // Mock les méthodes privées via les repositories
      (service as any).getCompletedTransactionsForWeek = jest.fn().mockResolvedValue(mockTransactions);
      (service as any).getAcceptedOffersForWeek = jest.fn().mockResolvedValue([]);
      (service as any).getActiveListingsForWeek = jest.fn().mockResolvedValue([]);
      (service as any).calculateTotalWeightForSubjects = jest.fn().mockResolvedValue(100);
      mockListingRepo.findById.mockImplementation((id: string) => {
        return Promise.resolve(mockListings.find((l: any) => l.id === id));
      });
      mockTrendRepo.upsert.mockResolvedValue(mockTrend);

      const result = await service.calculateWeeklyTrend(year, weekNumber);

      expect(result).toBeDefined();
      expect(result.year).toBe(year);
      expect(result.weekNumber).toBe(weekNumber);
      expect(mockTrendRepo.upsert).toHaveBeenCalled();
    });

    it('devrait utiliser les offres si pas assez de transactions', async () => {
      const year = 2024;
      const weekNumber = 1;

      const mockTransactions = [
        {
          id: '1',
          listingId: 'listing-1',
          finalPrice: 20000,
          subjectIds: ['animal-1'],
          status: 'completed',
          completedAt: '2024-01-01T00:00:00Z',
        },
      ] as any;

      const mockOffers = [
        {
          id: '1',
          listingId: 'listing-2',
          proposedPrice: 25000,
          subjectIds: ['animal-2'],
          status: 'accepted',
          respondedAt: '2024-01-02T00:00:00Z',
        },
      ] as any;

      const mockTrend: WeeklyPorkPriceTrend = {
        id: 'trend-1',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 225,
        avgPriceRegional: 2300,
        transactionsCount: 1,
        offersCount: 1,
        listingsCount: 0,
        sourcePriority: 'platform',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (service as any).getCompletedTransactionsForWeek = jest.fn().mockResolvedValue(mockTransactions);
      (service as any).getAcceptedOffersForWeek = jest.fn().mockResolvedValue(mockOffers);
      (service as any).getActiveListingsForWeek = jest.fn().mockResolvedValue([]);
      (service as any).calculateTotalWeightForSubjects = jest.fn().mockResolvedValue(100);
      mockListingRepo.findById.mockResolvedValue({ id: 'listing-1', weight: 100 } as any);
      mockTrendRepo.upsert.mockResolvedValue(mockTrend);

      const result = await service.calculateWeeklyTrend(year, weekNumber);

      expect(result).toBeDefined();
      expect(result.offersCount).toBeGreaterThan(0);
    });

    it('devrait utiliser les listings si pas assez de transactions et offres', async () => {
      const year = 2024;
      const weekNumber = 1;

      const mockListings = [
        {
          id: 'listing-1',
          weight: 100,
          pricePerKg: 2000,
          status: 'available',
          listedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'listing-2',
          weight: 150,
          pricePerKg: 2100,
          status: 'available',
          listedAt: '2024-01-02T00:00:00Z',
        },
      ] as any;

      const mockTrend: WeeklyPorkPriceTrend = {
        id: 'trend-1',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2050,
        avgPriceRegional: 2300,
        transactionsCount: 0,
        offersCount: 0,
        listingsCount: 2,
        sourcePriority: 'listings',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (service as any).getCompletedTransactionsForWeek = jest.fn().mockResolvedValue([]);
      (service as any).getAcceptedOffersForWeek = jest.fn().mockResolvedValue([]);
      (service as any).getActiveListingsForWeek = jest.fn().mockResolvedValue(mockListings);
      mockTrendRepo.upsert.mockResolvedValue(mockTrend);

      const result = await service.calculateWeeklyTrend(year, weekNumber);

      expect(result).toBeDefined();
      expect(result.listingsCount).toBe(2);
      expect(result.sourcePriority).toBe('listings');
    });

    it('devrait utiliser le prix régional en fallback', async () => {
      const year = 2024;
      const weekNumber = 1;

      const mockTrend: WeeklyPorkPriceTrend = {
        id: 'trend-1',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2300, // Prix régional
        avgPriceRegional: 2300,
        transactionsCount: 0,
        offersCount: 0,
        listingsCount: 0,
        sourcePriority: 'regional',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (service as any).getCompletedTransactionsForWeek = jest.fn().mockResolvedValue([]);
      (service as any).getAcceptedOffersForWeek = jest.fn().mockResolvedValue([]);
      (service as any).getActiveListingsForWeek = jest.fn().mockResolvedValue([]);
      mockTrendRepo.upsert.mockResolvedValue(mockTrend);

      const result = await service.calculateWeeklyTrend(year, weekNumber);

      expect(result).toBeDefined();
      expect(result.sourcePriority).toBe('regional');
      expect(result.avgPricePlatform).toBe(2300);
    });
  });

  describe('getLast26WeeksTrends', () => {
    it('devrait retourner les tendances des 26 dernières semaines', async () => {
      const mockTrends: WeeklyPorkPriceTrend[] = Array.from({ length: 26 }, (_, i) => ({
        id: `trend-${i}`,
        year: 2024,
        weekNumber: i + 1,
        avgPricePlatform: 2000 + i * 10,
        avgPriceRegional: 2300,
        transactionsCount: 5,
        offersCount: 2,
        listingsCount: 10,
        sourcePriority: 'platform',
        updatedAt: '2024-01-01T00:00:00Z',
      }));

      mockTrendRepo.findLastWeeks.mockResolvedValue(mockTrends);

      const result = await service.getLast26WeeksTrends();

      expect(result).toHaveLength(26);
      // Le service appelle findLastWeeks avec 27 pour inclure la semaine en cours
      expect(mockTrendRepo.findLastWeeks).toHaveBeenCalledWith(27);
    });

    it('devrait retourner un tableau vide si aucune tendance', async () => {
      mockTrendRepo.findLastWeeks.mockResolvedValue([]);

      const result = await service.getLast26WeeksTrends();

      expect(result).toEqual([]);
    });
  });

  describe('calculateLast26Weeks', () => {
    it('devrait calculer les tendances pour les 26 dernières semaines', async () => {
      const mockTrend: WeeklyPorkPriceTrend = {
        id: 'trend-1',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2000,
        avgPriceRegional: 2300,
        transactionsCount: 5,
        offersCount: 2,
        listingsCount: 10,
        sourcePriority: 'platform',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (service as any).calculateWeeklyTrend = jest.fn().mockResolvedValue(mockTrend);

      const result = await service.calculateLast26Weeks();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect((service as any).calculateWeeklyTrend).toHaveBeenCalledTimes(27); // 26 + semaine en cours
    });

    it('devrait gérer les erreurs lors du calcul', async () => {
      (service as any).calculateWeeklyTrend = jest
        .fn()
        .mockRejectedValueOnce(new Error('Erreur'))
        .mockResolvedValue({
          id: 'trend-1',
          year: 2024,
          weekNumber: 1,
          avgPricePlatform: 2000,
          avgPriceRegional: 2300,
          transactionsCount: 5,
          offersCount: 2,
          listingsCount: 10,
          sourcePriority: 'platform',
          updatedAt: '2024-01-01T00:00:00Z',
        });

      const result = await service.calculateLast26Weeks();

      expect(result).toBeDefined();
      // Devrait continuer malgré les erreurs
    });
  });

  describe('getPorkPriceTrendService', () => {
    it('devrait retourner une instance du service', async () => {
      const result = await getPorkPriceTrendService(mockDb);

      expect(result).toBeInstanceOf(PorkPriceTrendService);
    });

    it('devrait utiliser la même instance si déjà créée', async () => {
      const instance1 = await getPorkPriceTrendService(mockDb);
      const instance2 = await getPorkPriceTrendService(mockDb);

      expect(instance1).toBe(instance2);
    });
  });
});

