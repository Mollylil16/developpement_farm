/**
 * Types pour le système d'agent conversationnel
 */

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: string;
  metadata?: {
    actionExecuted?: string;
    actionResult?: unknown;
    requiresConfirmation?: boolean;
    voiceTranscription?: string;
    validationErrors?: string[];
    suggestions?: string[];
    pendingAction?: {
      action: string;
      params: Record<string, unknown>;
    };
  };
}

export interface ChatConversation {
  id: string;
  projetId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export type AgentActionType =
  | 'create_revenu'
  | 'create_depense'
  | 'create_charge_fixe'
  | 'create_visite_veterinaire'
  | 'create_vaccination'
  | 'create_traitement'
  | 'create_maladie'
  | 'create_pesee'
  | 'create_ingredient'
  | 'create_planification'
  | 'get_statistics'
  | 'get_reminders'
  | 'schedule_reminder'
  | 'analyze_data'
  | 'search_animal'
  | 'search_lot'
  | 'get_stock_status'
  | 'calculate_costs'
  | 'answer_knowledge_question'
  | 'list_knowledge_topics'
  | 'other';

export interface AgentAction {
  type: AgentActionType;
  params: Record<string, unknown>;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface AgentActionResult {
  success: boolean;
  data?: unknown;
  message: string;
  error?: string;
}

export interface AgentContext {
  projetId: string;
  userId: string;
  userName?: string;
  currentDate: string;
  availableAnimals?: unknown[];
  availableLots?: unknown[];
  recentTransactions?: unknown[];
}

export interface AgentConfig {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  language?: 'fr-CI' | 'fr';
  enableVoice?: boolean;
  enableProactiveAlerts?: boolean;
}

export type TranscriptionProvider = 'assemblyai' | 'google' | 'openai' | 'none';

export interface VoiceConfig {
  language: string;
  enableSpeechToText: boolean;
  enableTextToSpeech: boolean;
  speechRate?: number;
  pitch?: number;
  // Configuration pour la transcription vocale
  transcriptionProvider?: TranscriptionProvider;
  transcriptionApiKey?: string;
}

export interface Reminder {
  id: string;
  type: 'vaccination' | 'traitement' | 'visite' | 'sevrage' | 'nettoyage' | 'verification';
  title: string;
  description: string;
  dueDate: string;
  animalId?: string;
  lotId?: string;
  projetId: string;
  isCompleted: boolean;
  createdAt: string;
}
