/**
 * Tests pour useChatAgent
 */

import { renderHook, waitFor } from '@testing-library/react-hooks';
import { useChatAgent } from '../useChatAgent';
import apiClient from '../../services/api/apiClient';
import { invalidateProjetCache, getCachedResponse, setCachedResponse } from '../../services/chatAgent/kouakouCache';

// Mock des dépendances
jest.mock('../../services/api/apiClient');
jest.mock('../../services/chatAgent/kouakouCache');
jest.mock('../../services/chatAgent', () => ({
  ProactiveRemindersService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    generateProactiveReminders: jest.fn().mockResolvedValue([]),
    generateProactiveMessage: jest.fn().mockReturnValue(''),
  })),
  VoiceService: jest.fn().mockImplementation(() => ({
    isTextToSpeechAvailable: jest.fn().mockResolvedValue(false),
    isSpeechToTextAvailable: jest.fn().mockResolvedValue(false),
    requestPermissions: jest.fn().mockResolvedValue(true),
    speak: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('../../services/chatAgent/core/ConversationStorage', () => ({
  getOrCreateConversationId: jest.fn().mockResolvedValue('conv-123'),
  loadConversationHistory: jest.fn().mockResolvedValue([]),
  clearConversationId: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../store/hooks', () => ({
  useAppDispatch: jest.fn(() => jest.fn()),
  useAppSelector: jest.fn((selector) => {
    if (selector.toString().includes('projet')) {
      return { projetActif: { id: 'projet-1', nom: 'Test Projet' } };
    }
    if (selector.toString().includes('auth')) {
      return { user: { id: 'user-1', nom: 'Test User', email: 'test@example.com' } };
    }
    return {};
  }),
}));
jest.mock('../../store/slices/financeSlice', () => ({
  loadDepensesPonctuelles: jest.fn(),
  loadRevenus: jest.fn(),
  loadChargesFixes: jest.fn(),
}));
jest.mock('../../store/slices/productionSlice', () => ({
  loadProductionAnimaux: jest.fn(),
}));

describe('useChatAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCachedResponse as jest.Mock).mockResolvedValue(null);
  });

  describe('Cache des réponses', () => {
    it('devrait utiliser le cache si une réponse est disponible', async () => {
      const cachedResponse = 'Réponse en cache';
      (getCachedResponse as jest.Mock).mockResolvedValue(cachedResponse);

      const { result } = renderHook(() => useChatAgent());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await result.current.sendMessage('Bonjour');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Vérifier que le cache a été consulté
      expect(getCachedResponse).toHaveBeenCalledWith('Bonjour', 'projet-1');
      // Vérifier que l'API n'a pas été appelée
      expect(apiClient.post).not.toHaveBeenCalled();
      // Vérifier que la réponse du cache a été utilisée
      expect(result.current.messages.length).toBeGreaterThan(1);
      expect(result.current.messages[result.current.messages.length - 1].content).toBe(cachedResponse);
    });

    it('devrait appeler l\'API si aucune réponse n\'est en cache', async () => {
      (getCachedResponse as jest.Mock).mockResolvedValue(null);
      (apiClient.post as jest.Mock).mockResolvedValue({
        response: 'Réponse du backend',
        metadata: {},
      });

      const { result } = renderHook(() => useChatAgent());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await result.current.sendMessage('Bonjour');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Vérifier que l'API a été appelée
      expect(apiClient.post).toHaveBeenCalled();
      // Vérifier que la réponse a été mise en cache
      expect(setCachedResponse).toHaveBeenCalled();
    });

    it('devrait invalider le cache après une action exécutée', async () => {
      (getCachedResponse as jest.Mock).mockResolvedValue(null);
      (apiClient.post as jest.Mock).mockResolvedValue({
        response: 'Animal créé avec succès',
        metadata: {
          executedActions: [
            { name: 'create_animal', success: true, message: 'Animal créé', args: {} },
          ],
        },
      });

      const { result } = renderHook(() => useChatAgent());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await result.current.sendMessage('Créer un animal');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Vérifier que le cache a été invalidé après l'action
      expect(invalidateProjetCache).toHaveBeenCalledWith('projet-1');
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait afficher un message d\'erreur spécifique pour les erreurs réseau', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue({
        status: 0,
        message: 'Network request failed',
      });

      const { result } = renderHook(() => useChatAgent());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await result.current.sendMessage('Bonjour');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const lastMessage = result.current.messages[result.current.messages.length - 1];
      expect(lastMessage.content).toContain('connexion');
      expect(lastMessage.content).toContain('Internet');
    });

    it('devrait afficher un message d\'erreur spécifique pour les timeouts', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue({
        status: 408,
        message: 'Request timeout',
      });

      const { result } = renderHook(() => useChatAgent());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await result.current.sendMessage('Bonjour');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const lastMessage = result.current.messages[result.current.messages.length - 1];
      expect(lastMessage.content).toContain('trop de temps');
    });
  });

  describe('Limitation de l\'historique', () => {
    it('devrait limiter l\'historique à 50 messages', async () => {
      const { result } = renderHook(() => useChatAgent());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Créer plus de 50 messages
      for (let i = 0; i < 60; i++) {
        result.current.messages.push({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: new Date().toISOString(),
        });
      }

      (apiClient.post as jest.Mock).mockResolvedValue({
        response: 'Réponse',
        metadata: {},
      });

      await result.current.sendMessage('Test');

      // Vérifier que l'historique envoyé au backend est limité à 50 messages
      expect(apiClient.post).toHaveBeenCalled();
      const callArgs = (apiClient.post as jest.Mock).mock.calls[0];
      const history = callArgs[0].history || callArgs[1]?.history;
      expect(history.length).toBeLessThanOrEqual(50);
    });
  });
});
