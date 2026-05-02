/**
 * Tests pour usePorkPriceTrend
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { usePorkPriceTrend } from '../usePorkPriceTrend';
import { getDatabase } from '../../services/database';
import { getPorkPriceTrendService } from '../../services/PorkPriceTrendService';

// Mock dependencies
jest.mock('../../services/database');
jest.mock('../../services/PorkPriceTrendService');

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockGetPorkPriceTrendService = getPorkPriceTrendService as jest.MockedFunction<
  typeof getPorkPriceTrendService
>;

describe('usePorkPriceTrend', () => {
  const mockDb = {
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
  } as any;

  const mockTrendService = {
    getLast26WeeksTrends: jest.fn(),
    calculateLast26Weeks: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabase.mockResolvedValue(mockDb);
    mockGetPorkPriceTrendService.mockReturnValue(mockTrendService as any);
  });

  it('devrait charger les tendances au montage', async () => {
    const mockTrends = [
      {
        id: '1',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2000,
        avgPriceRegional: 2300,
        transactionsCount: 5,
        offersCount: 0,
        listingsCount: 0,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        year: 2024,
        weekNumber: 2,
        avgPricePlatform: 2100,
        avgPriceRegional: 2300,
        transactionsCount: 3,
        offersCount: 0,
        listingsCount: 0,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-08T00:00:00Z',
      },
    ];

    mockTrendService.getLast26WeeksTrends.mockResolvedValue(mockTrends);

    const { result } = renderHook(() => usePorkPriceTrend());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.trends).toEqual(mockTrends);
    expect(result.current.currentWeekPrice).toBe(2100);
    expect(result.current.previousWeekPrice).toBe(2000);
    expect(result.current.priceChange).toBe(100);
    expect(result.current.priceChangePercent).toBeCloseTo(5.0); // (2100 - 2000) / 2000 * 100
  });

  it('devrait calculer les tendances manquantes si moins de 27 semaines', async () => {
    const mockTrends = [
      {
        id: '1',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2000,
        avgPriceRegional: 2300,
        transactionsCount: 5,
        offersCount: 0,
        listingsCount: 0,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    const mockUpdatedTrends = [
      ...mockTrends,
      {
        id: '2',
        year: 2024,
        weekNumber: 2,
        avgPricePlatform: 2100,
        avgPriceRegional: 2300,
        transactionsCount: 3,
        offersCount: 0,
        listingsCount: 0,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-08T00:00:00Z',
      },
    ];

    mockTrendService.getLast26WeeksTrends
      .mockResolvedValueOnce(mockTrends)
      .mockResolvedValueOnce(mockUpdatedTrends);
    mockTrendService.calculateLast26Weeks.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePorkPriceTrend());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockTrendService.calculateLast26Weeks).toHaveBeenCalled();
    expect(result.current.trends.length).toBeGreaterThan(mockTrends.length);
  });

  it('devrait gérer les erreurs correctement', async () => {
    const errorMessage = 'Erreur de chargement';
    mockTrendService.getLast26WeeksTrends.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => usePorkPriceTrend());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.trends).toEqual([]);
  });

  it('devrait calculer correctement le changement de prix en pourcentage', async () => {
    const mockTrends = [
      {
        id: '1',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2000,
        avgPriceRegional: 2300,
        transactionsCount: 5,
        offersCount: 0,
        listingsCount: 0,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        year: 2024,
        weekNumber: 2,
        avgPricePlatform: 2200,
        avgPriceRegional: 2300,
        transactionsCount: 3,
        offersCount: 0,
        listingsCount: 0,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-08T00:00:00Z',
      },
    ];

    mockTrendService.getLast26WeeksTrends.mockResolvedValue(mockTrends);

    const { result } = renderHook(() => usePorkPriceTrend());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.priceChange).toBe(200);
    expect(result.current.priceChangePercent).toBeCloseTo(10.0); // (2200 - 2000) / 2000 * 100
  });

  it('devrait gérer les cas où avgPricePlatform est undefined', async () => {
    const mockTrends = [
      {
        id: '1',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: undefined,
        avgPriceRegional: 2300,
        transactionsCount: 0,
        offersCount: 0,
        listingsCount: 0,
        sourcePriority: 'regional' as const,
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        year: 2024,
        weekNumber: 2,
        avgPricePlatform: 2100,
        avgPriceRegional: 2300,
        transactionsCount: 3,
        offersCount: 0,
        listingsCount: 0,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-08T00:00:00Z',
      },
    ];

    mockTrendService.getLast26WeeksTrends.mockResolvedValue(mockTrends);

    const { result } = renderHook(() => usePorkPriceTrend());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentWeekPrice).toBe(2100);
    expect(result.current.previousWeekPrice).toBeUndefined();
    expect(result.current.priceChange).toBeUndefined();
    expect(result.current.priceChangePercent).toBeUndefined();
  });

  it('devrait exposer une fonction refresh', async () => {
    const mockTrends = [
      {
        id: '1',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2000,
        avgPriceRegional: 2300,
        transactionsCount: 5,
        offersCount: 0,
        listingsCount: 0,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    mockTrendService.getLast26WeeksTrends.mockResolvedValue(mockTrends);

    const { result } = renderHook(() => usePorkPriceTrend());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refresh).toBe('function');

    // Appeler refresh
    const updatedTrends = [
      ...mockTrends,
      {
        id: '2',
        year: 2024,
        weekNumber: 2,
        avgPricePlatform: 2100,
        avgPriceRegional: 2300,
        transactionsCount: 3,
        offersCount: 0,
        listingsCount: 0,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-08T00:00:00Z',
      },
    ];

    mockTrendService.getLast26WeeksTrends.mockResolvedValue(updatedTrends);

    result.current.refresh();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.trends.length).toBe(2);
  });
});
