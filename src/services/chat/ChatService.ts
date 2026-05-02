/**
 * Service de chat avec abstraction de transport
 * Permet de basculer facilement entre Polling et WebSocket
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  IChatTransport,
  ChatTransportConfig,
  ChatTransportCallbacks,
  ConnectionStatus,
} from './ChatTransport.interface';
import type { ChatMessage } from '../../types/marketplace';
import { PollingChatTransport } from './PollingChatTransport';
import { WebSocketChatTransport } from './WebSocketChatTransport';

export type ChatTransportType = 'polling' | 'websocket';

export interface ChatServiceConfig extends ChatTransportConfig {
  /**
   * Type de transport à utiliser
   */
  transportType: ChatTransportType;

  /**
   * Database SQLite (requis pour PollingTransport)
   */
  database?: SQLiteDatabase;
}

/**
 * Service de chat unifié
 * Gère automatiquement le transport approprié
 */
export class ChatService {
  private transport?: IChatTransport;
  private config: ChatServiceConfig;
  private callbacks: ChatTransportCallbacks;

  constructor(config: ChatServiceConfig, callbacks: ChatTransportCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Créer le transport approprié
   */
  private createTransport(): IChatTransport {
    switch (this.config.transportType) {
      case 'polling':
        return new PollingChatTransport(this.config, this.callbacks);

      case 'websocket':
        return new WebSocketChatTransport(this.config, this.callbacks);

      default:
        throw new Error(`Transport non supporté: ${this.config.transportType}`);
    }
  }

  /**
   * Se connecter à une conversation
   */
  async connect(conversationId: string): Promise<void> {
    if (!this.transport) {
      this.transport = this.createTransport();
    }

    await this.transport.connect(conversationId);
  }

  /**
   * Se déconnecter
   */
  disconnect(): void {
    if (this.transport) {
      this.transport.disconnect();
      this.transport = undefined;
    }
  }

  /**
   * Envoyer un message
   */
  async sendMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage> {
    if (!this.transport) {
      throw new Error('Service non connecté');
    }

    return this.transport.sendMessage(message);
  }

  /**
   * Marquer des messages comme lus
   */
  async markAsRead(messageIds: string[]): Promise<void> {
    if (!this.transport) {
      throw new Error('Service non connecté');
    }

    return this.transport.markAsRead(messageIds);
  }

  /**
   * Obtenir le statut de connexion
   */
  getStatus(): ConnectionStatus {
    return this.transport?.status || 'disconnected';
  }

  /**
   * Vérifier si connecté
   */
  isConnected(): boolean {
    return this.transport?.isConnected() || false;
  }

  /**
   * Changer de transport à la volée
   * Utile pour passer de polling à WebSocket sans redémarrer l'app
   */
  async switchTransport(
    newTransportType: ChatTransportType,
    conversationId: string
  ): Promise<void> {
    // Déconnecter l'ancien transport
    if (this.transport) {
      this.transport.disconnect();
      this.transport = undefined;
    }

    // Créer et connecter le nouveau transport
    this.config.transportType = newTransportType;
    this.transport = this.createTransport();
    await this.transport.connect(conversationId);

    console.log(`[ChatService] Transport basculé vers ${newTransportType}`);
  }
}

/**
 * Factory pour créer un ChatService
 */
export function createChatService(
  config: ChatServiceConfig,
  callbacks: ChatTransportCallbacks
): ChatService {
  return new ChatService(config, callbacks);
}
