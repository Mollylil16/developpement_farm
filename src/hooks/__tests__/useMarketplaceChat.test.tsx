/**
 * Tests pour useMarketplaceChat
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useMarketplaceChat } from '../useMarketplaceChat';
import { getDatabase } from '../../services/database';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) =>
    selector({
      auth: {
        user: { id: 'user-1', email: 'test@test.com' },
        isAuthenticated: true,
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

const mockChatRepo = {
  findUserConversations: jest.fn(),
  findConversationMessages: jest.fn(),
  markMessageAsRead: jest.fn(),
  createMessage: jest.fn(),
  updateConversationLastMessage: jest.fn(),
};

const mockTransactionRepo = {
  findById: jest.fn(),
};

(getDatabase as jest.Mock).mockResolvedValue(mockDb);

// Mock dynamic import
jest.mock('../../database/repositories', () => ({
  MarketplaceChatRepository: jest.fn(() => mockChatRepo),
  MarketplaceTransactionRepository: jest.fn(() => mockTransactionRepo),
}));

describe('useMarketplaceChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useMarketplaceChat('transaction-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.messages).toEqual([]);
    expect(result.current.conversation).toBeNull();
  });

  it('should load messages for a transaction', async () => {
    // Mock transaction
    mockTransactionRepo.findById.mockResolvedValue({
      id: 'transaction-1',
      offerId: 'offer-1',
      buyerId: 'buyer-1',
      producerId: 'producer-1',
    });

    // Mock conversation
    mockChatRepo.findUserConversations.mockResolvedValue([
      {
        id: 'conv-1',
        relatedOfferId: 'offer-1',
        participants: ['user-1', 'other-user'],
      },
    ]);

    // Mock messages
    mockChatRepo.findConversationMessages.mockResolvedValue([
      {
        id: 'msg-1',
        content: 'Hello',
        senderId: 'other-user',
        createdAt: '2025-01-01T10:00:00Z',
        read: false,
      },
      {
        id: 'msg-2',
        content: 'Hi',
        senderId: 'user-1',
        createdAt: '2025-01-01T10:01:00Z',
        read: true,
      },
    ]);

    const { result } = renderHook(() => useMarketplaceChat('transaction-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].id).toBe('msg-1');
    expect(result.current.conversation?.id).toBe('conv-1');
  });

  it('should handle transaction not found', async () => {
    mockTransactionRepo.findById.mockResolvedValue(null);

    const { result } = renderHook(() => useMarketplaceChat('invalid-transaction'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Transaction introuvable');
    expect(result.current.messages).toEqual([]);
  });

  it('should send a message', async () => {
    // Setup mocks
    mockTransactionRepo.findById.mockResolvedValue({
      id: 'transaction-1',
      offerId: 'offer-1',
    });

    mockChatRepo.findUserConversations.mockResolvedValue([
      {
        id: 'conv-1',
        relatedOfferId: 'offer-1',
        participants: ['user-1', 'other-user'],
      },
    ]);

    mockChatRepo.findConversationMessages.mockResolvedValue([]);

    mockChatRepo.createMessage.mockResolvedValue({
      id: 'new-msg',
      content: 'Test message',
      senderId: 'user-1',
      createdAt: '2025-01-01T12:00:00Z',
    });

    const { result } = renderHook(() => useMarketplaceChat('transaction-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Send message
    await result.current.sendMessage('Test message');

    expect(mockChatRepo.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Test message',
        type: 'text',
      })
    );
  });

  it('should mark unread messages as read', async () => {
    mockTransactionRepo.findById.mockResolvedValue({
      id: 'transaction-1',
      offerId: 'offer-1',
    });

    mockChatRepo.findUserConversations.mockResolvedValue([
      {
        id: 'conv-1',
        relatedOfferId: 'offer-1',
        participants: ['user-1', 'other-user'],
      },
    ]);

    mockChatRepo.findConversationMessages.mockResolvedValue([
      {
        id: 'msg-1',
        content: 'Unread message',
        senderId: 'other-user',
        read: false,
        createdAt: '2025-01-01T10:00:00Z',
      },
    ]);

    renderHook(() => useMarketplaceChat('transaction-1'));

    await waitFor(() => {
      expect(mockChatRepo.markMessageAsRead).toHaveBeenCalledWith('msg-1');
    });
  });
});

