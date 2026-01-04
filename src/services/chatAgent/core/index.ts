/**
 * Exports des composants core de l'agent conversationnel
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
export { IntentRAG, type TrainingExample, INTENT_KNOWLEDGE_BASE } from './IntentRAG';
export { GeminiIntentService, type GeminiEmbedding } from './GeminiIntentService';
export { GeminiParameterExtractor } from './GeminiParameterExtractor';
export { FastPathDetector, type FastPathResult } from './FastPathDetector';
export { ConfirmationManager, type ConfirmationDecision, type UserPreferences } from './ConfirmationManager';
export { LearningService, type LearningFailure, type EducationalSuggestion } from './LearningService';
export { NaturalLanguageProcessor, type ProcessedMessage, type IntentHint } from './NaturalLanguageProcessor';
export { ClarificationService, type ClarificationRequest, type ClarificationResult } from './ClarificationService';
