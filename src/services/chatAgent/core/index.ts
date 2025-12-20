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
export { OpenAIIntentService, type OpenAIEmbedding } from './OpenAIIntentService';
export { OpenAIParameterExtractor } from './OpenAIParameterExtractor';
