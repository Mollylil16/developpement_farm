/**
 * Migration : Création des tables pour l'assistant conversationnel
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function createChatAgentTables(db: SQLiteDatabase): Promise<void> {
  console.log('💬 [Migration] Création des tables Chat Agent...');

  try {
    // Table des conversations
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS chat_agent_conversations (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_chat_agent_conversations_projet 
      ON chat_agent_conversations(projet_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_chat_agent_conversations_user 
      ON chat_agent_conversations(user_id);
    `);

    // Table des messages
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS chat_agent_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        metadata_json TEXT,
        FOREIGN KEY (conversation_id) REFERENCES chat_agent_conversations(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_chat_agent_messages_conversation 
      ON chat_agent_messages(conversation_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_chat_agent_messages_timestamp 
      ON chat_agent_messages(timestamp);
    `);

    console.log('  ✅ Tables chat_agent créées');
  } catch (error) {
    console.error('  ❌ Erreur lors de la création des tables chat_agent:', error);
    throw error;
  }
}

