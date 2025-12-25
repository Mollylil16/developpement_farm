/**
 * Transport de chat basé sur Polling
 * Implémentation actuelle (temporaire)
 */

import type {
  IChatTransport,
  ChatTransportConfig,
  ChatTransportCallbacks,
  ConnectionStatus,
} from './ChatTransport.interface';
import type { ChatMessage } from '../../types/marketplace';
import apiClient from '../api/apiClient';
import { createLoggerWithPrefix } from '../../utils/logger';

const logger = createLoggerWithPrefix('PollingTransport');

export class PollingChatTransport implements IChatTransport {
  private _status: ConnectionStatus = 'disconnected';
  private pollingInterval?: NodeJS.Timeout;
  // Plus besoin de repository, on utilise directement l'API
  private conversationId?: string;
  private lastMessageTimestamp: string = new Date(0).toISOString();
  
  // Propriétés utilisées dans les méthodes de la classe
  private config: ChatTransportConfig;
  private callbacks: ChatTransportCallbacks;

  constructor(config: ChatTransportConfig, callbacks: ChatTransportCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  async connect(conversationId: string): Promise<void> {
    if (this._status === 'connected') {
      console.log('[PollingTransport] Déjà connecté');
      return;
    }

    try {
      this._status = 'connecting';
      this.callbacks.onStatusChange('connecting');

      this.conversationId = conversationId;

      // Charger les messages existants
      await this.pollMessages();

      // Démarrer le polling
      const interval = this.config.pollingInterval || 5000;
        this.pollingInterval = setInterval(() => {
        this.pollMessages().catch((error) => {
          console.error('[PollingTransport] Erreur polling:', error);
          this.callbacks.onError(
            error instanceof Error ? error : new Error(String(error))
          );
        });
      }, interval);

      this._status = 'connected';
      this.callbacks.onStatusChange('connected');

      console.log(`[PollingTransport] Connecté (polling ${interval}ms)`);
    } catch (error) {
      this._status = 'error';
      this.callbacks.onStatusChange('error');
      throw error;
    }
  }

  disconnect(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    this._status = 'disconnected';
    this.callbacks.onStatusChange('disconnected');
    console.log('[PollingTransport] Déconnecté');
  }

  async sendMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage> {
    if (!this.conversationId) {
      throw new Error('Transport non connecté');
    }

    // Créer le message via l'API backend
    const createdMessage = await apiClient.post<any>(`/marketplace/chat/messages`, {
      ...message,
      conversationId: this.conversationId,
    });

    // Mettre à jour le timestamp
    this.lastMessageTimestamp = createdMessage.createdAt;

    return createdMessage;
  }

  async markAsRead(messageIds: string[]): Promise<void> {
    if (!this.conversationId) {
      throw new Error('Transport non connecté');
    }

    for (const id of messageIds) {
      await apiClient.patch(`/marketplace/chat/messages/${id}/read`);
    }
  }

  isConnected(): boolean {
    return this._status === 'connected';
  }

  /**
   * Polling des nouveaux messages
   */
  private async pollMessages(): Promise<void> {
    if (!this.conversationId) {
      return;
    }

    try {
      // Récupérer tous les messages de la conversation depuis l'API backend
      const allMessages = await apiClient.get<any[]>(`/marketplace/chat/conversations/${this.conversationId}/messages`);

      // Filtrer les nouveaux messages (après le dernier timestamp)
      const newMessages = allMessages.filter((msg) => msg.createdAt > this.lastMessageTimestamp);

      // Notifier pour chaque nouveau message
      for (const message of newMessages) {
        this.callbacks.onMessage(message);
        this.lastMessageTimestamp = message.createdAt;
      }
    } catch (error: unknown) {
      console.error('[PollingTransport] Erreur récupération messages:', error);
      this.callbacks.onError(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
