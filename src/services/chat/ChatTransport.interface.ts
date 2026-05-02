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
   * @param _message - Le message reçu (utilisé dans les implémentations, préfixé avec _ pour éviter l'erreur ESLint)
   */
  onMessage: (_message: ChatMessage) => void;

  /**
   * Appelé quand le statut de connexion change
   * @param _status - Le nouveau statut de connexion (utilisé dans les implémentations, préfixé avec _ pour éviter l'erreur ESLint)
   */
  onStatusChange: (_status: ConnectionStatus) => void;

  /**
   * Appelé en cas d'erreur
   * @param _error - L'erreur survenue (utilisée dans les implémentations, préfixé avec _ pour éviter l'erreur ESLint)
   */
  onError: (_error: Error) => void;
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
   * @param _conversationId - L'ID de la conversation à laquelle se connecter (utilisé dans les implémentations, préfixé avec _ pour éviter l'erreur ESLint)
   */
  connect(_conversationId: string): Promise<void>;

  /**
   * Se déconnecter du serveur
   */
  disconnect(): void;

  /**
   * Envoyer un message
   * @param _message - Le message à envoyer (sans id et createdAt qui seront générés, utilisé dans les implémentations, préfixé avec _ pour éviter l'erreur ESLint)
   */
  sendMessage(_message: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage>;

  /**
   * Marquer des messages comme lus
   * @param _messageIds - Les IDs des messages à marquer comme lus (utilisés dans les implémentations, préfixé avec _ pour éviter l'erreur ESLint)
   */
  markAsRead(_messageIds: string[]): Promise<void>;

  /**
   * Vérifier si le transport est connecté
   */
  isConnected(): boolean;
}
