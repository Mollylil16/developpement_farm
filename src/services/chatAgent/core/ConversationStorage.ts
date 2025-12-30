/**
 * Service pour gérer la persistance des conversations
 * Stocke le conversationId par projet dans AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../../../types/chatAgent';
import apiClient from '../../api/apiClient';
import { logger } from '../../../utils/logger';

const CONVERSATION_ID_KEY_PREFIX = '@kouakou:conversation_id:';

/**
 * Récupère ou crée un conversationId persistant pour un projet
 */
export async function getOrCreateConversationId(projetId: string): Promise<string> {
  try {
    const key = `${CONVERSATION_ID_KEY_PREFIX}${projetId}`;
    const storedId = await AsyncStorage.getItem(key);
    
    if (storedId) {
      logger.debug(`[ConversationStorage] Conversation ID récupéré pour projet ${projetId}: ${storedId}`);
      return storedId;
    }
    
    // Créer un nouveau conversationId
    const newId = `conv_${projetId}_${Date.now()}`;
    await AsyncStorage.setItem(key, newId);
    logger.debug(`[ConversationStorage] Nouveau conversation ID créé pour projet ${projetId}: ${newId}`);
    return newId;
  } catch (error) {
    logger.error('[ConversationStorage] Erreur lors de la récupération/création du conversationId:', error);
    // Fallback: générer un ID local
    return `conv_${projetId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Charge l'historique d'une conversation depuis le backend
 */
export async function loadConversationHistory(
  projetId: string,
  conversationId: string,
  limit: number = 100
): Promise<ChatMessage[]> {
  try {
    const history = await apiClient.get<any[]>('/agent-learnings/conversation-history', {
      params: {
        projet_id: projetId,
        conversation_id: conversationId,
        limit,
      },
    });

    if (!history || history.length === 0) {
      return [];
    }

    // Convertir les messages du backend en format ChatMessage
    const messages: ChatMessage[] = history.map((msg: any) => ({
      id: msg.id || `msg_${msg.created_at}_${Math.random().toString(36).substr(2, 9)}`,
      role: msg.message_role === 'user' ? 'user' : 'assistant',
      content: msg.message_content || '',
      timestamp: msg.created_at || new Date().toISOString(),
    }));

    logger.debug(`[ConversationStorage] ${messages.length} messages chargés pour conversation ${conversationId}`);
    return messages;
  } catch (error) {
    logger.error('[ConversationStorage] Erreur lors du chargement de l\'historique:', error);
    // Si l'erreur est 500 (Internal Server Error), c'est probablement que la table n'existe pas encore
    // Dans ce cas, on retourne un tableau vide pour ne pas bloquer l'application
    // L'historique sera créé au fur et à mesure des conversations
    if ((error as any)?.status === 500) {
      logger.warn('[ConversationStorage] Erreur 500 - Table agent_conversation_memory peut-être non créée. Retour d\'un tableau vide.');
    }
    // En cas d'erreur, retourner un tableau vide pour ne pas bloquer l'application
    return [];
  }
}

/**
 * Supprime le conversationId pour un projet (lors de la suppression du projet ou reset)
 */
export async function clearConversationId(projetId: string): Promise<void> {
  try {
    const key = `${CONVERSATION_ID_KEY_PREFIX}${projetId}`;
    await AsyncStorage.removeItem(key);
    logger.debug(`[ConversationStorage] Conversation ID supprimé pour projet ${projetId}`);
  } catch (error) {
    logger.error('[ConversationStorage] Erreur lors de la suppression du conversationId:', error);
  }
}

