/**
 * Export centralisé des services de l'agent conversationnel
 */

/**
 * ⚠️ DEPRECATED - NE PAS UTILISER EN PRODUCTION
 * ChatAgentService est déprécié et ne doit être utilisé que pour les tests.
 * En production, utilisez le hook useChatAgent.
 * 
 * @deprecated Utiliser useChatAgent à la place
 */
export { ChatAgentService } from './ChatAgentService';
export { AgentActionExecutor } from './AgentActionExecutor';
export { ChatAgentAPI } from './ChatAgentAPI';
export { VoiceService } from './VoiceService';
export { ProactiveRemindersService } from './ProactiveRemindersService';
export { IntentDetector } from './IntentDetector';
