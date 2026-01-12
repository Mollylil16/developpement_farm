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
  // Modifications
  | 'update_revenu'
  | 'update_depense'
  | 'update_vaccination'
  | 'update_pesee'
  | 'update_visite_veterinaire'
  | 'get_statistics'
  | 'get_cheptel_details'
  | 'get_weighing_details'
  | 'get_reminders'
  | 'schedule_reminder'
  | 'analyze_data'
  | 'search_animal'
  | 'list_animals'
  | 'search_lot'
  | 'get_stock_status'
  | 'calculate_costs'
  | 'answer_knowledge_question'
  | 'list_knowledge_topics'
  // Reproduction
  | 'get_gestations'
  | 'get_gestation_by_truie'
  | 'predict_mise_bas'
  | 'get_porcelets'
  | 'get_porcelets_transition'
  // Mortalités
  | 'get_mortalites'
  | 'get_taux_mortalite'
  | 'analyze_causes_mortalite'
  // Finances (graphes)
  | 'generate_graph_finances'
  | 'describe_graph_trends'
  // Nutrition (composition)
  | 'propose_composition_alimentaire'
  | 'calculate_consommation_moyenne'
  // Ventes
  | 'get_ventes'
  | 'analyze_ventes'
  // Bilan Financier
  | 'get_bilan_financier'
  | 'get_dettes_en_cours'
  // Gestion des loges (mode bande)
  | 'creer_loge'
  | 'deplacer_animaux'
  | 'get_animaux_par_loge'
  // Marketplace - Vente automatisée par Kouakou
  | 'marketplace_sell_animal'
  | 'marketplace_set_price'
  | 'marketplace_get_price_trends'
  | 'marketplace_check_offers'
  | 'marketplace_respond_offer'
  | 'marketplace_get_my_listings'
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
  // Champs pour les clarifications
  needsClarification?: boolean;
  clarificationType?: string;
  missingParams?: string[];
  actionType?: string; // Type d'action pour la boucle de clarification
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
  geminiApiKey?: string;
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
