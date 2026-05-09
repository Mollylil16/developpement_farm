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
    actionResult?: any;
    requiresConfirmation?: boolean;
    voiceTranscription?: string;
    // Gestion contextuelle : relier les messages entre eux
    contextId?: string; // ID du contexte conversationnel (pour relier les réponses aux questions)
    pendingAction?: AgentAction; // Action en attente de clarification
    isClarificationQuestion?: boolean; // Indique si ce message est une question de clarification
    isProactive?: boolean;
    isRecommendation?: boolean;
    confidence?: number;
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
  | 'create_mortalite'
  | 'diagnose_symptoms'
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
  | 'update_revenu'
  | 'update_depense'
  | 'update_pesee'
  | 'update_vaccination'
  | 'update_visite_veterinaire'
  | 'answer_knowledge_question'
  | 'describe_capabilities'
  | 'get_cheptel_details'
  | 'get_weighing_details'
  | 'list_knowledge_topics'
  | 'marketplace_check_offers'
  | 'marketplace_get_my_listings'
  | 'marketplace_get_price_trends'
  | 'marketplace_respond_offer'
  | 'marketplace_sell_animal'
  | 'marketplace_set_price'
  | 'get_gestations'
  | 'get_gestation_by_truie'
  | 'predict_mise_bas'
  | 'get_porcelets'
  | 'get_porcelets_transition'
  | 'get_mortalites'
  | 'get_taux_mortalite'
  | 'analyze_causes_mortalite'
  | 'get_ventes'
  | 'analyze_ventes'
  | 'get_stock_aliments'
  | 'calculate_consommation_moyenne'
  | 'propose_composition_alimentaire'
  | 'generate_graph_finances'
  | 'describe_graph_trends'
  | 'other';

export interface AgentAction {
  type: AgentActionType;
  params: Record<string, any>;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  confidence?: number;
}

export interface AgentActionResult {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
  needsClarification?: boolean;
  clarificationType?: string;
  missingParams?: string[];
  actionType?: string;
  refreshHint?: string;
  requiresConfirmation?: boolean;
}

export interface AgentContext {
  projetId: string;
  userId: string;
  userName?: string;
  currentDate: string;
  availableAnimals?: any[];
  availableLots?: any[];
  recentTransactions?: any[];
  activeRole?: string;
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
  geminiApiKey?: string;
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

// Compatibility type
export interface SujetDisponible {
  id: string;
  code?: string;
  race?: string;
  poids?: number;
  [key: string]: any;
}

