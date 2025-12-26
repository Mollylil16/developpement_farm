/**
 * Tests pour QueueManager
 */

import { QueueManager, QueuedAction } from '../../core/QueueManager';
import { AgentAction, AgentContext } from '../../../../types/chatAgent';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock networkService
jest.mock('../../../../services/network/networkService', () => ({
  checkNetworkConnectivity: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
}));

describe('QueueManager', () => {
  let queueManager: QueueManager;
  let mockContext: AgentContext;
  let mockAction: AgentAction;

  beforeEach(() => {
    queueManager = new QueueManager();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    mockContext = {
      projetId: 'test-projet',
      userId: 'test-user',
      currentDate: new Date().toISOString().split('T')[0],
    };

    mockAction = {
      type: 'create_depense',
      params: { montant: 100000, categorie: 'alimentation' },
      confidence: 0.95,
    };
  });

  describe('enqueue', () => {
    test('devrait ajouter une action à la queue', async () => {
      await queueManager.enqueue(mockAction, mockContext);
      
      const queue = queueManager.getQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].action.type).toBe('create_depense');
    });

    test('devrait sauvegarder dans AsyncStorage', async () => {
      await queueManager.enqueue(mockAction, mockContext);
      
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    test('devrait limiter à 100 actions maximum', async () => {
      // Créer 101 actions
      for (let i = 0; i < 101; i++) {
        await queueManager.enqueue(
          { ...mockAction, params: { ...mockAction.params, montant: i } },
          mockContext
        );
      }

      const queue = queueManager.getQueue();
      expect(queue.length).toBe(100); // Devrait être limité à 100
    });
  });

  describe('dequeue', () => {
    test('devrait retirer une action de la queue', async () => {
      await queueManager.enqueue(mockAction, mockContext);
      const queue = queueManager.getQueue();
      const actionId = queue[0].id;

      await queueManager.dequeue(actionId);

      const updatedQueue = queueManager.getQueue();
      expect(updatedQueue.length).toBe(0);
    });
  });

  describe('processQueue', () => {
    test('devrait traiter les actions en attente', async () => {
      await queueManager.enqueue(mockAction, mockContext);

      const mockExecutor = jest.fn(async () => ({
        success: true,
        message: 'Success',
        data: {},
      }));

      const result = await queueManager.processQueue(mockExecutor as any);

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockExecutor).toHaveBeenCalledTimes(1);
    });

    test('devrait incrémenter retryCount en cas d\'échec', async () => {
      await queueManager.enqueue(mockAction, mockContext);

      const mockExecutor = jest.fn(async () => ({
        success: false,
        message: 'Error',
      }));

      await queueManager.processQueue(mockExecutor as any);

      const queue = queueManager.getQueue();
      expect(queue[0].retryCount).toBe(1);
    });

    test('devrait abandonner après 3 tentatives', async () => {
      await queueManager.enqueue(mockAction, mockContext);

      const mockExecutor = jest.fn(async () => ({
        success: false,
        message: 'Error',
      }));

      // Simuler 3 échecs
      for (let i = 0; i < 3; i++) {
        await queueManager.processQueue(mockExecutor as any);
      }

      const queue = queueManager.getQueue();
      expect(queue.length).toBe(0); // Devrait être retirée après 3 échecs
    });
  });

  describe('clearQueue', () => {
    test('devrait vider complètement la queue', async () => {
      await queueManager.enqueue(mockAction, mockContext);
      await queueManager.enqueue(mockAction, mockContext);

      await queueManager.clearQueue();

      const queue = queueManager.getQueue();
      expect(queue.length).toBe(0);
    });
  });
});

