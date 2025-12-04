/**
 * Interface pour les transports de chat
 * Permet de basculer facilement entre Polling et WebSocket
 */

import type { ChatMessage } from '../../types/marketplace';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ChatTransportConfig {
  /**
   * URL du serveur (pour WebSocket) ou endpoint API (pour Polling)
   */
  endpoint: string;

  /**
   * Intervalle de polling en ms (seulement pour PollingTransport)
   */
  pollingInterval?: number;

  /**
   * Timeout de reconnexion en ms
   */
  reconnectTimeout?: number;

  /**
   * Nombre max de tentatives de reconnexion
   */
  maxReconnectAttempts?: number;
}

export interface ChatTransportCallbacks {
  /**
   * Appelé quand un nouveau message arrive
   */
  onMessage: (message: ChatMessage) => void;

  /**
   * Appelé quand le statut de connexion change
   */
  onStatusChange: (status: ConnectionStatus) => void;

  /**
   * Appelé en cas d'erreur
   */
  onError: (error: Error) => void;
}

/**
 * Interface abstraite pour les transports de chat
 * Implémentée par PollingTransport et WebSocketTransport
 */
export interface IChatTransport {
  /**
   * Statut actuel de la connexion
   */
  readonly status: ConnectionStatus;

  /**
   * Se connecter au serveur
   */
  connect(conversationId: string): Promise<void>;

  /**
   * Se déconnecter du serveur
   */
  disconnect(): void;

  /**
   * Envoyer un message
   */
  sendMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage>;

  /**
   * Marquer des messages comme lus
   */
  markAsRead(messageIds: string[]): Promise<void>;

  /**
   * Vérifier si le transport est connecté
   */
  isConnected(): boolean;
}

