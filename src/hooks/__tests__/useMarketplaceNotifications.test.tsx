/**
 * Tests pour useMarketplaceNotifications
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useMarketplaceNotifications } from '../useMarketplaceNotifications';
import { getDatabase } from '../../services/database';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) =>
    selector({
      auth: {
        user: { id: 'user-1', email: 'test@test.com' },
        isAuthenticated: true,
      },
      projet: {
        projetActif: { id: 'projet-1', nom: 'Test Project' },
      },
    })
  ),
}));

// Mock database
jest.mock('../../services/database');
jest.mock('../../database/repositories');

const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  execAsync: jest.fn(),
  runAsync: jest.fn(),
};

const mockNotificationRepo = {
  findByUserId: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  delete: jest.fn(),
};

(getDatabase as jest.Mock).mockResolvedValue(mockDb);

jest.mock('../../database/repositories', () => ({
  MarketplaceNotificationRepository: jest.fn(() => mockNotificationRepo),
}));

describe('useMarketplaceNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load notifications on mount', async () => {
    mockNotificationRepo.findByUserId.mockResolvedValue([
      {
        id: 'notif-1',
        userId: 'user-1',
        title: 'New Offer',
        body: 'You received a new offer',
        read: false,
        createdAt: '2025-01-01T10:00:00Z',
      },
      {
        id: 'notif-2',
        userId: 'user-1',
        title: 'Message',
        body: 'New message',
        read: true,
        createdAt: '2025-01-01T11:00:00Z',
      },
    ]);

    const { result } = renderHook(() => useMarketplaceNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
  });

  it('should mark notification as read', async () => {
    mockNotificationRepo.findByUserId.mockResolvedValue([
      {
        id: 'notif-1',
        userId: 'user-1',
        title: 'Test',
        body: 'Test notification',
        read: false,
        createdAt: '2025-01-01T10:00:00Z',
      },
    ]);

    const { result } = renderHook(() => useMarketplaceNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.unreadCount).toBe(1);

    // Mark as read
    await act(async () => {
      await result.current.markAsRead('notif-1');
    });

    expect(mockNotificationRepo.markAsRead).toHaveBeenCalledWith('notif-1');
    expect(result.current.unreadCount).toBe(0);
  });

  it('should delete notification without stale closure', async () => {
    mockNotificationRepo.findByUserId.mockResolvedValue([
      {
        id: 'notif-1',
        userId: 'user-1',
        title: 'Test',
        body: 'Test notification',
        read: false,
        createdAt: '2025-01-01T10:00:00Z',
      },
    ]);

    const { result } = renderHook(() => useMarketplaceNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);

    // Delete notification
    await act(async () => {
      await result.current.deleteNotification('notif-1');
    });

    expect(mockNotificationRepo.delete).toHaveBeenCalledWith('notif-1');
    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should mark all as read', async () => {
    mockNotificationRepo.findByUserId.mockResolvedValue([
      {
        id: 'notif-1',
        userId: 'user-1',
        title: 'Test 1',
        body: 'Test',
        read: false,
        createdAt: '2025-01-01T10:00:00Z',
      },
      {
        id: 'notif-2',
        userId: 'user-1',
        title: 'Test 2',
        body: 'Test',
        read: false,
        createdAt: '2025-01-01T11:00:00Z',
      },
    ]);

    const { result } = renderHook(() => useMarketplaceNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.unreadCount).toBe(2);

    // Mark all as read
    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(mockNotificationRepo.markAllAsRead).toHaveBeenCalledWith('user-1');
    expect(result.current.unreadCount).toBe(0);
  });
});

