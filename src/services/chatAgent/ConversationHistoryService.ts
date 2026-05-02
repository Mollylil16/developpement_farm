/**
 * Service de gestion de l'historique de conversation persistant
 * Utilise AsyncStorage pour sauvegarder l'historique hors ligne
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../../types/chatAgent';

const HISTORY_STORAGE_KEY = '@kouakou:conversation_history';
const MAX_HISTORY_LENGTH = 100; // Limiter à 100 messages pour éviter la surcharge

export class ConversationHistoryService {
  private projetId: string | null = null;

  /**
   * Initialise le service avec l'ID du projet
   */
  async initialize(projetId: string): Promise<void> {
    this.projetId = projetId;
  }

  /**
   * Charge l'historique depuis AsyncStorage
   */
  async loadHistory(): Promise<ChatMessage[]> {
    if (!this.projetId) {
      return [];
    }

    try {
      const key = `${HISTORY_STORAGE_KEY}:${this.projetId}`;
      const stored = await AsyncStorage.getItem(key);
      
      if (stored) {
        const history = JSON.parse(stored) as ChatMessage[];
        // S'assurer que les dates sont des strings ISO
        return history.map(msg => ({
          ...msg,
          timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : new Date(msg.timestamp).toISOString(),
        }));
      }
      
      return [];
    } catch (error) {
      console.error('[ConversationHistoryService] Erreur chargement historique:', error);
      return [];
    }
  }

  /**
   * Sauvegarde l'historique dans AsyncStorage
   */
  async saveHistory(history: ChatMessage[]): Promise<void> {
    if (!this.projetId) {
      return;
    }

    try {
      // Limiter la taille de l'historique
      const limitedHistory = history.slice(-MAX_HISTORY_LENGTH);
      
      const key = `${HISTORY_STORAGE_KEY}:${this.projetId}`;
      await AsyncStorage.setItem(key, JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('[ConversationHistoryService] Erreur sauvegarde historique:', error);
    }
  }

  /**
   * Ajoute un message à l'historique et sauvegarde
   */
  async addMessage(message: ChatMessage): Promise<void> {
    if (!this.projetId) {
      return;
    }

    try {
      const history = await this.loadHistory();
      history.push(message);
      await this.saveHistory(history);
    } catch (error) {
      console.error('[ConversationHistoryService] Erreur ajout message:', error);
    }
  }

  /**
   * Efface l'historique pour ce projet
   */
  async clearHistory(): Promise<void> {
    if (!this.projetId) {
      return;
    }

    try {
      const key = `${HISTORY_STORAGE_KEY}:${this.projetId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('[ConversationHistoryService] Erreur effacement historique:', error);
    }
  }

  /**
   * Récupère les derniers messages (pour contexte)
   */
  async getRecentHistory(limit: number = 10): Promise<ChatMessage[]> {
    const history = await this.loadHistory();
    return history.slice(-limit);
  }
}

