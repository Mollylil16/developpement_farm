/**
 * Transport de chat basé sur WebSocket
 * À utiliser quand un backend WebSocket sera disponible
 */

import type {
  IChatTransport,
  ChatTransportConfig,
  ChatTransportCallbacks,
  ConnectionStatus,
} from './ChatTransport.interface';
import type { ChatMessage } from '../../types/marketplace';
import { createLoggerWithPrefix } from '../../utils/logger';

const logger = createLoggerWithPrefix('WebSocketTransport');

export class WebSocketChatTransport implements IChatTransport {
  private _status: ConnectionStatus = 'disconnected';
  private ws?: WebSocket;
  private conversationId?: string;
  private reconnectAttempts: number = 0;
  private reconnectTimeout?: NodeJS.Timeout;
  
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
      logger.debug('Déjà connecté');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this._status = 'connecting';
        this.callbacks.onStatusChange('connecting');

        this.conversationId = conversationId;

        // Créer la connexion WebSocket
        const wsUrl = `${this.config.endpoint}?conversationId=${conversationId}`;
        this.ws = new WebSocket(wsUrl);

        // Handlers WebSocket
        this.ws.onopen = () => {
          this._status = 'connected';
          this.callbacks.onStatusChange('connected');
          this.reconnectAttempts = 0;
          logger.info('Connecté');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: ChatMessage = JSON.parse(event.data);
            this.callbacks.onMessage(message);
          } catch (error: unknown) {
            logger.error('Erreur parsing message:', error);
            this.callbacks.onError(
              error instanceof Error ? error : new Error(String(error))
            );
          }
        };

        this.ws.onerror = (error) => {
          logger.error('Erreur WebSocket:', error);
          this._status = 'error';
          this.callbacks.onStatusChange('error');
          this.callbacks.onError(new Error('Erreur WebSocket'));
          reject(error);
        };

        this.ws.onclose = () => {
          logger.debug('Connexion fermée');
          this._status = 'disconnected';
          this.callbacks.onStatusChange('disconnected');

          // Tentative de reconnexion
          this.attemptReconnect();
        };
      } catch (error: unknown) {
        this._status = 'error';
        this.callbacks.onStatusChange('error');
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }

    this._status = 'disconnected';
    this.callbacks.onStatusChange('disconnected');
    logger.debug('Déconnecté');
  }

  async sendMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage> {
    if (!this.ws || this._status !== 'connected') {
      throw new Error('WebSocket non connecté');
    }

    return new Promise((resolve, reject) => {
      try {
        const messageWithId = {
          ...message,
          id: `temp-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };

        // Envoyer le message
        this.ws!.send(
          JSON.stringify({
            type: 'send_message',
            payload: messageWithId,
          })
        );

        // TODO: Attendre confirmation du serveur
        // Pour l'instant, on résout immédiatement
        resolve(messageWithId);
      } catch (error) {
        // Utiliser reject pour gérer les erreurs d'envoi
        reject(error instanceof Error ? error : new Error('Erreur lors de l\'envoi du message'));
      }
    });
  }

  async markAsRead(messageIds: string[]): Promise<void> {
    if (!this.ws || this._status !== 'connected') {
      throw new Error('WebSocket non connecté');
    }

    this.ws.send(
      JSON.stringify({
        type: 'mark_read',
        payload: { messageIds },
      })
    );
  }

  isConnected(): boolean {
    return this._status === 'connected' && this.ws !== undefined;
  }

  /**
   * Tentative de reconnexion avec backoff exponentiel
   */
  private attemptReconnect(): void {
    const maxAttempts = this.config.maxReconnectAttempts || 5;

    if (this.reconnectAttempts >= maxAttempts) {
      logger.error('Max reconnexions atteint');
      this.callbacks.onError(new Error('Impossible de se reconnecter au serveur'));
      return;
    }

    this.reconnectAttempts++;

    // Backoff exponentiel : 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      this.config.reconnectTimeout || 16000
    );

    logger.debug(
      `Reconnexion dans ${delay}ms (tentative ${this.reconnectAttempts}/${maxAttempts})`
    );

    this.reconnectTimeout = setTimeout(() => {
      if (this.conversationId) {
        this.connect(this.conversationId).catch((error) => {
          logger.error('Échec reconnexion:', error);
        });
      }
    }, delay);
  }
}
