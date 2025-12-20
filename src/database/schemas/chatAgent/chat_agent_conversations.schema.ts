/**
 * Schéma pour les conversations avec l'assistant IA
 */

export interface ChatAgentConversation {
  id: string;
  projet_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChatAgentMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata_json?: string | null; // JSON string pour stocker les métadonnées
}
