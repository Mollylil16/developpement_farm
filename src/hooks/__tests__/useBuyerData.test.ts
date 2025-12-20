/**
 * Tests pour useBuyerData
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useBuyerData } from '../useBuyerData';
import { useAppSelector } from '../store/hooks';
import { getDatabase } from '../services/database';
import { getMarketplaceService } from '../services/MarketplaceService';
import {
  MarketplaceOfferRepository,
  MarketplaceTransactionRepository,
  MarketplaceListingRepository,
} from '../database/repositories';

// Mock dependencies
jest.mock('../store/hooks');
jest.mock('../services/database');
jest.mock('../services/MarketplaceService');
jest.mock('../database/repositories');

const mockUseAppSelector = useAppSelector;
const mockGetDatabase = getDatabase;
const mockGetMarketplaceService = getMarketplaceService;

describe('useBuyerData', () => {
  const mockDb = {
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
  } as any;

  const mockOfferRepo = {
    findByBuyerId: jest.fn(),
  };

  const mockTransactionRepo = {
    findByBuyerId: jest.fn(),
  };

  const mockListingRepo = {
    findRecent: jest.fn(),
  };

  const mockMarketplaceService = {
    searchListings: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabase.mockResolvedValue(mockDb);
    (MarketplaceOfferRepository as jest.Mock).mockImplementation(() => mockOfferRepo);
    (MarketplaceTransactionRepository as jest.Mock).mockImplementation(() => mockTransactionRepo);
    (MarketplaceListingRepository as jest.Mock).mockImplementation(() => mockListingRepo);
    mockGetMarketplaceService.mockReturnValue(mockMarketplaceService as any);
  });

  it('devrait retourner les données initiales', () => {
    mockUseAppSelector.mockReturnValue({
      auth: {
        user: null,
      },
    } as any);

    const { result } = renderHook(() => useBuyerData());

    expect(result.current.loading).toBe(true);
    expect(result.current.activeOffers).toEqual([]);
    expect(result.current.completedTransactions).toEqual([]);
    expect(result.current.recentListings).toEqual([]);
  });

  it('devrait charger les données si user existe', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
    };

    const mockOffers = [
      { id: '1', status: 'pending', buyerId: 'user-1' },
      { id: '2', status: 'countered', buyerId: 'user-1' },
      { id: '3', status: 'accepted', buyerId: 'user-1' },
    ] as any;

    const mockTransactions = [
      { id: '1', status: 'completed', buyerId: 'user-1', finalPrice: 10000 },
      { id: '2', status: 'completed', buyerId: 'user-1', finalPrice: 20000 },
    ] as any;

    const mockListings = [
      { id: '1', status: 'available', pricePerKg: 2000 },
      { id: '2', status: 'available', pricePerKg: 2100 },
    ] as any;

    mockUseAppSelector.mockReturnValue({
      auth: {
        user: mockUser,
      },
    } as any);

    mockOfferRepo.findByBuyerId.mockResolvedValue(mockOffers);
    mockTransactionRepo.findByBuyerId.mockResolvedValue(mockTransactions);
    mockMarketplaceService.searchListings.mockResolvedValue({ listings: mockListings });

    const { result } = renderHook(() => useBuyerData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activeOffers).toHaveLength(2); // pending + countered
    expect(result.current.completedTransactions).toHaveLength(2);
    expect(result.current.recentListings).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('devrait filtrer correctement les offres actives', async () => {
    const mockUser = {
      id: 'user-1',
    };

    const mockOffers = [
      { id: '1', status: 'pending', buyerId: 'user-1' },
      { id: '2', status: 'countered', buyerId: 'user-1' },
      { id: '3', status: 'accepted', buyerId: 'user-1' },
      { id: '4', status: 'rejected', buyerId: 'user-1' },
      { id: '5', status: 'expired', buyerId: 'user-1' },
    ] as any;

    mockUseAppSelector.mockReturnValue({
      auth: {
        user: mockUser,
      },
    } as any);

    mockOfferRepo.findByBuyerId.mockResolvedValue(mockOffers);
    mockTransactionRepo.findByBuyerId.mockResolvedValue([]);
    mockMarketplaceService.searchListings.mockResolvedValue({ listings: [] });

    const { result } = renderHook(() => useBuyerData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activeOffers).toHaveLength(2); // Seulement pending et countered
    expect(
      result.current.activeOffers.every(
        (o: any) => o.status === 'pending' || o.status === 'countered'
      )
    ).toBe(true);
  });

  it('devrait filtrer correctement les transactions complétées', async () => {
    const mockUser = {
      id: 'user-1',
    };

    const mockTransactions = [
      { id: '1', status: 'completed', buyerId: 'user-1', finalPrice: 10000 },
      { id: '2', status: 'pending', buyerId: 'user-1', finalPrice: 20000 },
      { id: '3', status: 'cancelled', buyerId: 'user-1', finalPrice: 30000 },
    ] as any;

    mockUseAppSelector.mockReturnValue({
      auth: {
        user: mockUser,
      },
    } as any);

    mockOfferRepo.findByBuyerId.mockResolvedValue([]);
    mockTransactionRepo.findByBuyerId.mockResolvedValue(mockTransactions);
    mockMarketplaceService.searchListings.mockResolvedValue({ listings: [] });

    const { result } = renderHook(() => useBuyerData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.completedTransactions).toHaveLength(1); // Seulement completed
    expect(result.current.completedTransactions[0].status).toBe('completed');
  });

  it('devrait gérer les erreurs correctement', async () => {
    const mockUser = {
      id: 'user-1',
    };

    const errorMessage = 'Erreur de chargement';

    mockUseAppSelector.mockReturnValue({
      auth: {
        user: mockUser,
      },
    } as any);

    mockOfferRepo.findByBuyerId.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useBuyerData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.activeOffers).toEqual([]);
  });

  it('devrait ne pas charger si user est null', async () => {
    mockUseAppSelector.mockReturnValue({
      auth: {
        user: null,
      },
    } as any);

    const { result } = renderHook(() => useBuyerData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockOfferRepo.findByBuyerId).not.toHaveBeenCalled();
    expect(mockTransactionRepo.findByBuyerId).not.toHaveBeenCalled();
  });

  it('devrait exposer une fonction refresh', async () => {
    const mockUser = {
      id: 'user-1',
    };

    mockUseAppSelector.mockReturnValue({
      auth: {
        user: mockUser,
      },
    } as any);

    mockOfferRepo.findByBuyerId.mockResolvedValue([]);
    mockTransactionRepo.findByBuyerId.mockResolvedValue([]);
    mockMarketplaceService.searchListings.mockResolvedValue({ listings: [] });

    const { result } = renderHook(() => useBuyerData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refresh).toBe('function');

    // Appeler refresh
    const newOffers = [{ id: '1', status: 'pending', buyerId: 'user-1' }] as any;
    mockOfferRepo.findByBuyerId.mockResolvedValue(newOffers);

    result.current.refresh();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activeOffers).toHaveLength(1);
  });

  it('devrait trier les transactions par date décroissante', async () => {
    const mockUser = {
      id: 'user-1',
    };

    const mockTransactions = [
      {
        id: '1',
        status: 'completed',
        buyerId: 'user-1',
        finalPrice: 10000,
        completedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        status: 'completed',
        buyerId: 'user-1',
        finalPrice: 20000,
        completedAt: '2024-01-03T00:00:00Z',
      },
      {
        id: '3',
        status: 'completed',
        buyerId: 'user-1',
        finalPrice: 30000,
        completedAt: '2024-01-02T00:00:00Z',
      },
    ] as any;

    mockUseAppSelector.mockReturnValue({
      auth: {
        user: mockUser,
      },
    } as any);

    mockOfferRepo.findByBuyerId.mockResolvedValue([]);
    mockTransactionRepo.findByBuyerId.mockResolvedValue(mockTransactions);
    mockMarketplaceService.searchListings.mockResolvedValue({ listings: [] });

    const { result } = renderHook(() => useBuyerData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Les transactions devraient être triées par date décroissante
    expect(result.current.completedTransactions[0].id).toBe('2'); // Plus récente
    expect(result.current.completedTransactions[1].id).toBe('3');
    expect(result.current.completedTransactions[2].id).toBe('1'); // Plus ancienne
  });
});
