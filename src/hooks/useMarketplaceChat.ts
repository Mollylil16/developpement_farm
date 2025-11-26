/**
 * Hook pour gérer le chat d'une transaction
 * Avec support temps réel (polling ou WebSocket)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { getDatabase } from '../services/database';
import { MarketplaceChatRepository } from '../database/repositories';
import type { ChatMessage, ChatConversation } from '../types/marketplace';

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

      const db = await getDatabase();
      const repo = new MarketplaceChatRepository(db);

      // Charger la conversation
      const conv = await repo.findConversationByTransaction(transactionId);
      setConversation(conv);

      if (!conv) {
        // Créer une nouvelle conversation si elle n'existe pas
        // (normalement créée lors de l'acceptation de l'offre)
        setMessages([]);
        setLoading(false);
        return;
      }

      // Charger les messages
      const chatMessages = await repo.findMessagesByConversation(conv.id);

      // Trier par date (plus ancien en premier)
      const sortedMessages = chatMessages.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setMessages(sortedMessages);

      // Marquer les messages de l'autre utilisateur comme lus
      const unreadMessages = sortedMessages.filter(
        (m) => m.senderId !== currentUserId && !m.read
      );

      for (const message of unreadMessages) {
        await repo.markMessageAsRead(message.id);
      }
    } catch (err: any) {
      console.error('Erreur chargement messages:', err);
      setError(err.message || 'Impossible de charger les messages');
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
        throw new Error('Impossible d\'envoyer le message');
      }

      try {
        const db = await getDatabase();
        const repo = new MarketplaceChatRepository(db);

        const newMessage: Omit<ChatMessage, 'id' | 'createdAt'> = {
          conversationId: conversation.id,
          senderId: currentUserId,
          recipientId: conversation.participants.find(p => p !== currentUserId) || '',
          content: content.trim(),
          type: 'text',
          read: false,
          sentAt: new Date().toISOString(),
          readAt: undefined,
        };

        const createdMessage = await repo.createMessage(newMessage);

        // Ajouter le message à l'état local
        setMessages((prev) => [...prev, createdMessage]);

        // Mettre à jour la conversation
        await repo.updateConversationLastMessage(conversation.id, createdMessage);
      } catch (err: any) {
        console.error('Erreur envoi message:', err);
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
        throw new Error('Impossible d\'envoyer la proposition');
      }

      try {
        const db = await getDatabase();
        const repo = new MarketplaceChatRepository(db);

        const newMessage: Omit<ChatMessage, 'id' | 'createdAt'> = {
          conversationId: conversation.id,
          senderId: currentUserId,
          recipientId: conversation.participants.find(p => p !== currentUserId) || '',
          content: `Nouvelle proposition de prix : ${price.toLocaleString()} FCFA`,
          type: 'price_proposal',
          read: false,
          sentAt: new Date().toISOString(),
          readAt: undefined,
          priceProposal: price,
        };

        const createdMessage = await repo.createMessage(newMessage);

        // Ajouter le message à l'état local
        setMessages((prev) => [...prev, createdMessage]);

        // Mettre à jour la conversation
        await repo.updateConversationLastMessage(conversation.id, createdMessage);
      } catch (err: any) {
        console.error('Erreur envoi proposition:', err);
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

  // Polling toutes les 5 secondes pour le chat (à remplacer par WebSocket en production)
  useEffect(() => {
    if (!transactionId || !currentUserId) return;

    const interval = setInterval(() => {
      loadMessages();
    }, 5000); // 5 secondes

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
