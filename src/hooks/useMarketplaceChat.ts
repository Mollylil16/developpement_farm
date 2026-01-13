/**
 * Hook pour gérer le chat d'une transaction
 * Avec support temps réel (polling ou WebSocket)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import apiClient from '../services/api/apiClient';
import type { ChatMessage, ChatConversation } from '../types/marketplace';
import { logger } from '../utils/logger';

export function useMarketplaceChat(transactionId: string) {
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charger la conversation et les messages
   */
  const loadMessages = useCallback(async () => {
    if (!transactionId || !currentUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Récupérer la transaction pour obtenir son offerId depuis l'API backend
      const transactions = await apiClient.get<any[]>('/marketplace/transactions');
      const transaction = transactions.find((t) => t.id === transactionId);

      if (!transaction) {
        setError('Transaction introuvable');
        setMessages([]);
        setLoading(false);
        return;
      }

      // Pour l'instant, le chat marketplace n'a pas d'endpoint backend dédié
      // On utilise les données de la transaction pour créer une conversation virtuelle
      // TODO: Implémenter les endpoints backend pour le chat marketplace
      const conv: ChatConversation | null = transaction.offerId
        ? {
            id: `conv-${transaction.offerId}`,
            participants: [transaction.buyerId, transaction.producerId],
            relatedListingId: transaction.offerId, // Utiliser relatedListingId au lieu de relatedOfferId
            relatedOfferId: transaction.offerId,
            lastMessage: '',
            lastMessageAt: transaction.updatedAt,
            unreadCount: {},
            status: 'active',
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
          }
        : null;

      setConversation(conv);

      if (!conv) {
        // Pas de conversation pour cette transaction
        setMessages([]);
        setLoading(false);
        return;
      }

      // Pour l'instant, pas de messages chargés depuis le backend
      // TODO: Implémenter l'endpoint GET /marketplace/chat/conversations/:id/messages
      const sortedMessages: ChatMessage[] = [];

      setMessages(sortedMessages);
    } catch (err: unknown) {
      logger.error('Erreur chargement messages:', err);
      const errorMessage = err instanceof Error ? err.message : String(err) || 'Impossible de charger les messages';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [transactionId, currentUserId]);

  /**
   * Envoyer un message
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversation || !currentUserId || !content.trim()) {
        throw new Error("Impossible d'envoyer le message");
      }

      try {
        // TODO: Implémenter l'endpoint POST /marketplace/chat/messages
        // Pour l'instant, on crée un message local
        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          conversationId: conversation.id,
          senderId: currentUserId,
          recipientId: conversation.participants.find((p) => p !== currentUserId) || '',
          content: content.trim(),
          type: 'text',
          read: false,
          createdAt: new Date().toISOString(),
          sentAt: new Date().toISOString(),
          readAt: undefined,
        };

        // Ajouter le message à l'état local
        setMessages((prev) => [...prev, newMessage]);

        // TODO: Envoyer le message au backend quand l'endpoint sera disponible
        // await apiClient.post('/marketplace/chat/messages', newMessage);
      } catch (err: unknown) {
        logger.error('Erreur envoi message:', err);
        throw err;
      }
    },
    [conversation, currentUserId]
  );

  /**
   * Envoyer une proposition de prix
   */
  const sendPriceProposal = useCallback(
    async (price: number) => {
      if (!conversation || !currentUserId) {
        throw new Error("Impossible d'envoyer la proposition");
      }

      try {
        // TODO: Implémenter l'endpoint POST /marketplace/chat/messages avec type price_proposal
        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          conversationId: conversation.id,
          senderId: currentUserId,
          recipientId: conversation.participants.find((p) => p !== currentUserId) || '',
          content: `Nouvelle proposition de prix : ${price.toLocaleString()} FCFA`,
          type: 'price_proposal',
          read: false,
          createdAt: new Date().toISOString(),
          sentAt: new Date().toISOString(),
          readAt: undefined,
          priceProposal: price,
        };

        // Ajouter le message à l'état local
        setMessages((prev) => [...prev, newMessage]);

        // TODO: Envoyer le message au backend quand l'endpoint sera disponible
        // await apiClient.post('/marketplace/chat/messages', newMessage);
      } catch (err: unknown) {
        logger.error('Erreur envoi proposition:', err);
        throw err;
      }
    },
    [conversation, currentUserId]
  );

  /**
   * Rafraîchir les messages
   */
  const refresh = useCallback(() => {
    loadMessages();
  }, [loadMessages]);

  // Charger au montage
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Polling toutes les 30 secondes pour le chat (à remplacer par WebSocket en production)
  // Réduit de 5s à 30s pour éviter les appels API excessifs
  useEffect(() => {
    if (!transactionId || !currentUserId) return;

    const interval = setInterval(() => {
      loadMessages();
    }, 30000); // 30 secondes (réduit de 5s)

    return () => clearInterval(interval);
  }, [transactionId, currentUserId, loadMessages]);

  return {
    messages,
    conversation,
    loading,
    error,
    sendMessage,
    sendPriceProposal,
    refresh,
  };
}
