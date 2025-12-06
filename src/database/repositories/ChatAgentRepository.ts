/**
 * Repository pour gérer les conversations avec l'assistant IA
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import type { ChatMessage } from '../../types/chatAgent';
import type { ChatAgentConversation, ChatAgentMessage } from '../schemas/chatAgent/chat_agent_conversations.schema';

export class ChatAgentRepository {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Trouve ou crée une conversation pour un projet et un utilisateur
   */
  async findOrCreateConversation(projetId: string, userId: string): Promise<ChatAgentConversation> {
    // Chercher une conversation existante
    const existing = await this.db.getFirstAsync<ChatAgentConversation>(
      `SELECT * FROM chat_agent_conversations 
       WHERE projet_id = ? AND user_id = ? 
       ORDER BY updated_at DESC LIMIT 1`,
      [projetId, userId]
    );

    if (existing) {
      return existing;
    }

    // Créer une nouvelle conversation
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO chat_agent_conversations (id, projet_id, user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, projetId, userId, now, now]
    );

    const conversation = await this.db.getFirstAsync<ChatAgentConversation>(
      `SELECT * FROM chat_agent_conversations WHERE id = ?`,
      [id]
    );

    if (!conversation) {
      throw new Error('Erreur lors de la création de la conversation');
    }

    return conversation;
  }

  /**
   * Charge tous les messages d'une conversation
   */
  async loadMessages(conversationId: string): Promise<ChatMessage[]> {
    const rows = await this.db.getAllAsync<ChatAgentMessage>(
      `SELECT * FROM chat_agent_messages 
       WHERE conversation_id = ? 
       ORDER BY timestamp ASC`,
      [conversationId]
    );

    return rows.map((row) => this.mapMessageRow(row));
  }

  /**
   * Sauvegarde un message
   */
  async saveMessage(conversationId: string, message: ChatMessage): Promise<void> {
    const metadataJson = message.metadata ? JSON.stringify(message.metadata) : null;

    await this.db.runAsync(
      `INSERT INTO chat_agent_messages 
       (id, conversation_id, role, content, timestamp, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        conversationId,
        message.role,
        message.content,
        message.timestamp,
        metadataJson,
      ]
    );

    // Mettre à jour la date de mise à jour de la conversation
    await this.db.runAsync(
      `UPDATE chat_agent_conversations 
       SET updated_at = ? 
       WHERE id = ?`,
      [new Date().toISOString(), conversationId]
    );
  }

  /**
   * Supprime tous les messages d'une conversation (pour réinitialiser)
   */
  async clearConversation(conversationId: string): Promise<void> {
    await this.db.runAsync(
      `DELETE FROM chat_agent_messages WHERE conversation_id = ?`,
      [conversationId]
    );
  }

  /**
   * Mappe une ligne de la base de données vers un ChatMessage
   */
  private mapMessageRow(row: ChatAgentMessage): ChatMessage {
    let metadata = undefined;
    if (row.metadata_json) {
      try {
        metadata = JSON.parse(row.metadata_json);
      } catch (error) {
        console.error('Erreur lors du parsing des métadonnées:', error);
      }
    }

    return {
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      metadata,
    };
  }
}

