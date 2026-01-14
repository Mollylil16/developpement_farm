/**
 * Exports des composants core de l'agent conversationnel
 * 
 * Note: Les services Gemini frontend ont été supprimés.
 * Toutes les interactions IA passent maintenant par le backend.
 */

export {
  ParameterExtractor,
  type ExtractedParams,
  type ExtractionContext,
} from './ParameterExtractor';
export {
  ConversationContextManager,
  type ConversationContext,
  type ConversationEntity,
} from './ConversationContext';
export { DataValidator, type ValidationResult } from './DataValidator';
export { ConfirmationManager, type ConfirmationDecision, type UserPreferences } from './ConfirmationManager';
export { NaturalLanguageProcessor, type ProcessedMessage, type IntentHint } from './NaturalLanguageProcessor';
export { ClarificationService, type ClarificationRequest, type ClarificationResult } from './ClarificationService';
