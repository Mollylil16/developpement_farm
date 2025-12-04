/**
 * Transport de chat basé sur Polling
 * Implémentation actuelle (temporaire)
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  IChatTransport,
  ChatTransportConfig,
  ChatTransportCallbacks,
  ConnectionStatus,
} from './ChatTransport.interface';
import type { ChatMessage } from '../../types/marketplace';
import { MarketplaceChatRepository } from '../../database/repositories';

export class PollingChatTransport implements IChatTransport {
  private _status: ConnectionStatus = 'disconnected';
  private pollingInterval?: NodeJS.Timeout;
  private chatRepo?: MarketplaceChatRepository;
  private conversationId?: string;
  private lastMessageTimestamp: string = new Date(0).toISOString();

  constructor(
    private db: SQLiteDatabase,
    private config: ChatTransportConfig,
    private callbacks: ChatTransportCallbacks
  ) {}

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
      this.chatRepo = new MarketplaceChatRepository(this.db);

      // Charger les messages existants
      await this.pollMessages();

      // Démarrer le polling
      const interval = this.config.pollingInterval || 5000;
      this.pollingInterval = setInterval(() => {
        this.pollMessages().catch((error) => {
          console.error('[PollingTransport] Erreur polling:', error);
          this.callbacks.onError(error);
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

  async sendMessage(
    message: Omit<ChatMessage, 'id' | 'createdAt'>
  ): Promise<ChatMessage> {
    if (!this.chatRepo) {
      throw new Error('Transport non connecté');
    }

    const createdMessage = await this.chatRepo.createMessage(message);

    // Mettre à jour le timestamp
    this.lastMessageTimestamp = createdMessage.createdAt;

    return createdMessage;
  }

  async markAsRead(messageIds: string[]): Promise<void> {
    if (!this.chatRepo) {
      throw new Error('Transport non connecté');
    }

    for (const id of messageIds) {
      await this.chatRepo.markMessageAsRead(id);
    }
  }

  isConnected(): boolean {
    return this._status === 'connected';
  }

  /**
   * Polling des nouveaux messages
   */
  private async pollMessages(): Promise<void> {
    if (!this.chatRepo || !this.conversationId) {
      return;
    }

    try {
      // Récupérer tous les messages de la conversation
      const allMessages = await this.chatRepo.findConversationMessages(
        this.conversationId
      );

      // Filtrer les nouveaux messages (après le dernier timestamp)
      const newMessages = allMessages.filter(
        (msg) => msg.createdAt > this.lastMessageTimestamp
      );

      // Notifier pour chaque nouveau message
      for (const message of newMessages) {
        this.callbacks.onMessage(message);
        this.lastMessageTimestamp = message.createdAt;
      }
    } catch (error: unknown) {
      console.error('[PollingTransport] Erreur récupération messages:', error);
      this.callbacks.onError(error);
    }
  }
}

