/**
 * Tests pour useMarketplace
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useMarketplace } from '../useMarketplace';
import { getDatabase } from '../../services/database';

// Mock services
jest.mock('../../services/database');
jest.mock('../../services/MarketplaceService');

const mockDb = {};
(getDatabase as jest.Mock).mockResolvedValue(mockDb);

const mockSearchListings = jest.fn();
jest.mock('../../services/MarketplaceService', () => ({
  getMarketplaceService: jest.fn(() => ({
    searchListings: mockSearchListings,
  })),
}));

describe('useMarketplace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useMarketplace());

    expect(result.current.listings).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(true);
    expect(result.current.currentPage).toBe(1);
  });

  it('should search listings', async () => {
    mockSearchListings.mockResolvedValue({
      listings: [
        { id: 'listing-1', subjectId: 'subject-1', pricePerKg: 5000 },
        { id: 'listing-2', subjectId: 'subject-2', pricePerKg: 5500 },
      ],
      total: 2,
      page: 1,
      totalPages: 1,
      hasMore: false,
    });

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.searchListings();
    });

    expect(result.current.listings).toHaveLength(2);
    expect(result.current.totalResults).toBe(2);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('should handle search errors', async () => {
    mockSearchListings.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.searchListings();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.listings).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should load more listings', async () => {
    // First page
    mockSearchListings.mockResolvedValueOnce({
      listings: [{ id: 'listing-1' }],
      total: 3,
      page: 1,
      totalPages: 2,
      hasMore: true,
    });

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.searchListings();
    });

    expect(result.current.listings).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);

    // Second page
    mockSearchListings.mockResolvedValueOnce({
      listings: [{ id: 'listing-2' }, { id: 'listing-3' }],
      total: 3,
      page: 2,
      totalPages: 2,
      hasMore: false,
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.listings).toHaveLength(3);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.currentPage).toBe(2);
  });

  it('should refresh listings', async () => {
    mockSearchListings.mockResolvedValue({
      listings: [{ id: 'new-listing-1' }],
      total: 1,
      page: 1,
      totalPages: 1,
      hasMore: false,
    });

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.listings).toHaveLength(1);
    expect(result.current.currentPage).toBe(1);
  });

  it('should not load more when already loading', async () => {
    mockSearchListings.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    const { result } = renderHook(() => useMarketplace());

    // Start first load
    act(() => {
      result.current.loadMore();
    });

    expect(result.current.loading).toBe(true);

    // Try to load more while loading
    await act(async () => {
      await result.current.loadMore();
    });

    // Should only call once
    expect(mockSearchListings).toHaveBeenCalledTimes(1);
  });

  it('should not load more when no more results', async () => {
    mockSearchListings.mockResolvedValue({
      listings: [],
      total: 0,
      page: 1,
      totalPages: 1,
      hasMore: false,
    });

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.searchListings();
    });

    expect(result.current.hasMore).toBe(false);

    // Try to load more
    await act(async () => {
      await result.current.loadMore();
    });

    // Should only call once (initial search)
    expect(mockSearchListings).toHaveBeenCalledTimes(1);
  });
});
