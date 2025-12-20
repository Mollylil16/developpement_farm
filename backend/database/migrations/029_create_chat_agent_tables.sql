-- Migration: Création des tables chat_agent
-- Date: 2025-01-09
-- Description: Tables pour l'assistant conversationnel

CREATE TABLE IF NOT EXISTS chat_agent_conversations (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_agent_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_agent_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  metadata_json TEXT -- JSON string pour stocker les métadonnées
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_chat_agent_conversations_projet ON chat_agent_conversations(projet_id);
CREATE INDEX IF NOT EXISTS idx_chat_agent_conversations_user ON chat_agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_agent_messages_conversation ON chat_agent_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_agent_messages_timestamp ON chat_agent_messages(timestamp);

-- Commentaires pour documentation
COMMENT ON TABLE chat_agent_conversations IS 'Table pour stocker les conversations avec l''assistant IA';
COMMENT ON TABLE chat_agent_messages IS 'Table pour stocker les messages des conversations';
COMMENT ON COLUMN chat_agent_messages.metadata_json IS 'JSON string pour stocker les métadonnées';

