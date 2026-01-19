/**
 * Service principal pour l'agent conversationnel
 * V4.1 - Sans appels directs à Gemini (tout passe par le backend)
 * 
 * ⚠️ DEPRECATED - NE PAS UTILISER EN PRODUCTION ⚠️
 * 
 * Ce service est utilisé UNIQUEMENT pour les tests et le développement.
 * En production, utilisez le hook `useChatAgent` qui communique directement avec le backend.
 * 
 * Raisons du dépôt :
 * - L'intelligence IA est maintenant gérée côté serveur
 * - Le hook `useChatAgent` est plus simple et mieux adapté à React
 * - Ce service est trop complexe (879 lignes) et difficile à maintenir
 * 
 * Migration :
 * - Remplacer `new ChatAgentService(config)` par `useChatAgent()` dans les composants React
 * - Pour les tests, ce service peut rester dans `src/services/chatAgent/tests/`
 * 
 * @deprecated Depuis V4.1 - Utiliser useChatAgent à la place
 */

import {
  ChatMessage,
  AgentAction,
  AgentActionType,
  AgentContext,
  AgentConfig,
  AgentActionResult,
} from '../../types/chatAgent';
import { AgentActionExecutor } from './AgentActionExecutor';
import { ChatAgentAPI } from './ChatAgentAPI';
import { buildOptimizedSystemPrompt } from './prompts/systemPrompt';
import {
  ConversationContextManager,
  DataValidator,
  ClarificationService,
} from './core';
import { ConfirmationManager } from './core/ConfirmationManager';
import { STANDARD_MISUNDERSTANDING_MESSAGE } from './core/constants';
import { ActionParser } from './core/ActionParser';
import { PerformanceMonitor } from './monitoring/PerformanceMonitor';
import { NaturalLanguageProcessor } from './core/NaturalLanguageProcessor';
import { createLoggerWithPrefix } from '../../utils/logger';
import { KnowledgeBaseAPI } from './knowledge/KnowledgeBaseAPI';
import apiClient from '../api/apiClient';

const logger = createLoggerWithPrefix('ChatAgentService');

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════
const GEMINI_CONFIDENCE = 0.95;    // Confiance attribuée aux réponses Gemini

/**
 * Interface pour la réponse du backend Gemini
 */
interface GeminiBackendResponse {
  success: boolean;
  data?: {
    response: string;
    timestamp?: string;
  };
  error?: string;
}

/**
 * Interface pour une action extraite de Gemini
 */
interface GeminiParsedAction {
  action: AgentActionType;
  params: Record<string, unknown>;
  explanation?: string;
}

export class ChatAgentService {
  private actionExecutor: AgentActionExecutor;
  private api: ChatAgentAPI;
  private config: AgentConfig;
  private context: AgentContext | null = null;
  private conversationHistory: ChatMessage[] = [];

  // Composants core
  private conversationContext: ConversationContextManager;
  private dataValidator: DataValidator;
  private confirmationManager: ConfirmationManager;
  private performanceMonitor: PerformanceMonitor;
  private clarificationService: ClarificationService;

  constructor(config: AgentConfig) {
    this.config = {
      model: 'local', // Détection locale uniquement
      temperature: 0.7,
      maxTokens: 1000,
      language: 'fr-CI',
      enableVoice: false,
      enableProactiveAlerts: true,
      ...config,
    };
    this.actionExecutor = new AgentActionExecutor();
    this.api = new ChatAgentAPI(this.config);

    // Initialiser les composants core
    this.conversationContext = new ConversationContextManager();
    this.dataValidator = new DataValidator();
    this.confirmationManager = new ConfirmationManager();
    this.performanceMonitor = new PerformanceMonitor();
    this.clarificationService = new ClarificationService(this.conversationContext);
  }

  /**
   * Initialise le contexte de l'agent
   */
  async initializeContext(context: AgentContext, conversationId?: string): Promise<void> {
    this.context = context;
    await this.actionExecutor.initialize(context);
    await this.dataValidator.initialize(context);

    // Charger l'historique dans le contexte conversationnel
    if (this.conversationHistory.length > 0) {
      for (const msg of this.conversationHistory) {
        this.conversationContext.updateFromMessage(msg);
      }
    }
  }

  /**
   * Charge l'historique de conversation existant
   */
  loadHistory(messages: ChatMessage[]): void {
    this.conversationHistory = messages;
    // Mettre à jour le contexte conversationnel avec l'historique
    for (const msg of messages) {
      this.conversationContext.updateFromMessage(msg);
    }
  }

  /**
   * Gère les réponses rapides (cache) pour les messages simples
   */
  private handleQuickResponses(message: string): string | null {
    const normalized = message.toLowerCase().trim();
    
    // Salutations simples
    if (/^(bonjour|salut|hello|hi|bonsoir)$/i.test(normalized)) {
      return "Bonjour ! Comment puis-je vous aider aujourd'hui ?";
    }
    
    // Remerciements simples
    if (/^(merci|ok|d'accord|parfait)$/i.test(normalized)) {
      return "De rien ! N'hésitez pas si vous avez d'autres questions.";
    }
    
    return null;
  }

  /**
   * Envoie un message à l'agent et reçoit une réponse
   * 
   * V6.0 - FLUX SIMPLIFIÉ avec Gemini en priorité
   * 
   * 1. Cache rapide (5% des cas) - Salutations/remerciements
   * 2. Gemini (95% des cas) - Appel direct avec recherche web
   * 3. Fallback Knowledge Base (si Gemini échoue)
   * 
   * @param userMessage - Le message de l'utilisateur
   * @param externalHistory - Historique externe optionnel (depuis useChatAgent). Si fourni, utilise cet historique au lieu de this.conversationHistory
   */
  async sendMessage(
    userMessage: string,
    externalHistory?: Array<{ role: string; content: string }>
  ): Promise<ChatMessage> {
    if (!this.context) {
      throw new Error("Le contexte de l'agent n'est pas initialisé");
    }

    const startTime = Date.now();
    logger.info(`[Kouakou] 📨 Message reçu: "${userMessage.substring(0, 50)}..."`);

    // Ajouter le message utilisateur à l'historique
    const userMsg: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    this.conversationHistory.push(userMsg);

    try {
      // Mettre à jour le contexte conversationnel
      this.conversationContext.updateFromMessage(userMsg);

      // Prétraitement NLP basique
      const nlpResult = NaturalLanguageProcessor.process(userMessage);
      const processedMessage = nlpResult.processed;

      // ═══════════════════════════════════════════════════════════
      // OPTION 1 : CACHE RAPIDE (salutations, remerciements simples)
      // ═══════════════════════════════════════════════════════════
      
      const quickResponse = this.handleQuickResponses(processedMessage);
      if (quickResponse) {
        logger.info('[Kouakou] ⚡ Réponse rapide (cache)');
        const assistantMessage: ChatMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: quickResponse,
          timestamp: new Date().toISOString(),
          metadata: {
            source: 'QuickResponse',
          },
        };
        this.conversationHistory.push(assistantMessage);
        const responseTime = Date.now() - startTime;
        this.performanceMonitor.recordInteraction(userMsg, assistantMessage, responseTime);
        return assistantMessage;
      }

      // ═══════════════════════════════════════════════════════════
      // OPTION 2 : GEMINI (95% des cas)
      // ═══════════════════════════════════════════════════════════
      
      logger.info('[Kouakou] 🤖 Appel Gemini...');
      
      try {
        const geminiStartTime = Date.now();
        
        // Construire le prompt optimisé pour Gemini
        const systemPrompt = this.buildGeminiSystemPrompt();
        
        // Utiliser l'historique externe si fourni (depuis useChatAgent), sinon utiliser l'historique interne
        // Limiter à 30 messages pour éviter de dépasser les limites de Gemini (~30K tokens)
        let conversationContext: Array<{ role: string; content: string }>;
        
        if (externalHistory && externalHistory.length > 0) {
          // Utiliser l'historique externe (source unique de vérité depuis useChatAgent)
          conversationContext = externalHistory
            .slice(-30) // Limiter à 30 messages pour conserver plus de contexte que .slice(-10)
            .map((entry) => ({
              role: entry.role === 'user' ? 'user' : 'model',
              content: entry.content || '',
            }));
          logger.debug(`[ChatAgentService] Utilisation de l'historique externe: ${conversationContext.length} messages`);
        } else {
          // Fallback sur l'historique interne (limité à 30 messages au lieu de 10)
          conversationContext = this.conversationHistory.slice(-30).map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            content: msg.content,
          }));
          logger.debug(`[ChatAgentService] Utilisation de l'historique interne: ${conversationContext.length} messages`);
        }
        
        // Appeler le backend Gemini
        const geminiResponse = await this.callBackendGemini(
          userMessage,
          systemPrompt,
          conversationContext
        );
        
        const geminiTime = Date.now() - geminiStartTime;
        logger.info(`[Gemini] ✅ Réponse reçue en ${geminiTime}ms`);
        
        // Vérifier que la réponse n'est pas vide
        if (!geminiResponse || typeof geminiResponse !== 'string' || geminiResponse.trim().length === 0) {
          throw new Error('Gemini a retourné une réponse vide');
        }
        
        // Essayer d'extraire une action structurée de la réponse Gemini
        const parsedAction = this.extractActionFromGeminiResponse(geminiResponse);
        
        if (parsedAction) {
          // Gemini a détecté une action → Exécuter
          logger.info(`[Kouakou] 🎯 Action détectée: ${parsedAction.action}`);
          
          const action: AgentAction = {
            type: parsedAction.action,
            params: parsedAction.params,
          };
          
          const actionResult = await this.actionExecutor.execute(action, this.context);
          
          const assistantMessage: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: actionResult.message,
            timestamp: new Date().toISOString(),
            metadata: {
              source: 'Gemini+Action',
              actionExecuted: parsedAction.action,
              actionResult: actionResult.data,
              refreshHint: actionResult.refreshHint,
            },
          };
          
          this.conversationHistory.push(assistantMessage);
          const responseTime = Date.now() - startTime;
          this.performanceMonitor.recordInteraction(userMsg, assistantMessage, responseTime);
          return assistantMessage;
        } else {
          // Gemini a répondu sans action (conversationnel ou recherche)
          logger.info('[Kouakou] 💬 Gemini réponse conversationnelle');
          
          const assistantMessage: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: geminiResponse,
            timestamp: new Date().toISOString(),
            metadata: {
              source: 'Gemini',
            },
          };
          
          this.conversationHistory.push(assistantMessage);
          const responseTime = Date.now() - startTime;
          this.performanceMonitor.recordInteraction(userMsg, assistantMessage, responseTime);
          return assistantMessage;
        }
      } catch (error: any) {
        // Log détaillé de l'erreur pour diagnostic
        const apiConfig = await import('../../config/api.config').then(m => m.API_CONFIG).catch(() => null);
        logger.error('[Kouakou] ❌ ERREUR GEMINI CRITIQUE:', {
          message: error?.message || 'Erreur inconnue',
          stack: error?.stack?.substring(0, 1000),
          endpoint: '/kouakou/chat',
          errorType: error?.constructor?.name,
          status: error?.response?.status || error?.status,
          responseData: error?.response?.data ? JSON.stringify(error.response.data).substring(0, 500) : undefined,
          apiBaseURL: apiConfig?.baseURL || 'non disponible',
          isNetworkError: error?.message?.includes('fetch') || error?.message?.includes('network'),
        });
        
        // Déterminer le type d'erreur et générer un message approprié
        let errorMessage = "Je rencontre un problème technique. ";
        
        const errorMsg = String(error?.message || '').toLowerCase();
        const statusCode = error?.response?.status || error?.status;
        
        if (statusCode === 403 || errorMsg.includes('403') || errorMsg.includes('forbidden') || errorMsg.includes('api key')) {
          errorMessage += "La clé API Gemini semble invalide ou expirée. Veuillez contacter le support.";
        } else if (statusCode === 429 || errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
          errorMessage += "Le quota API est dépassé. Veuillez réessayer plus tard.";
        } else if (statusCode === 500 || errorMsg.includes('500') || errorMsg.includes('internal server')) {
          errorMessage += "Le serveur rencontre un problème. Veuillez réessayer dans quelques instants.";
        } else if (statusCode === 503 || errorMsg.includes('503') || errorMsg.includes('service unavailable')) {
          errorMessage += "Le service est temporairement indisponible. Veuillez réessayer plus tard.";
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection') || errorMsg.includes('econnrefused')) {
          errorMessage += "Impossible de contacter le serveur. Vérifiez votre connexion internet.";
        } else if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
          errorMessage += "La requête a pris trop de temps. Veuillez réessayer.";
        } else if (errorMsg.includes('vide') || errorMsg.includes('empty')) {
          errorMessage += "Le serveur a retourné une réponse vide. Veuillez réessayer.";
        } else {
          errorMessage += "Veuillez réessayer dans quelques instants.";
        }
        
        // Retourner un message d'erreur clair au lieu de continuer vers fallback
        const errorResponse: ChatMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date().toISOString(),
          metadata: {
            source: 'Error',
            error: true,
            errorType: error?.constructor?.name || 'Unknown',
            statusCode: statusCode,
          },
        };
        
        this.conversationHistory.push(errorResponse);
        const responseTime = Date.now() - startTime;
        this.performanceMonitor.recordInteraction(userMsg, errorResponse, responseTime);
        return errorResponse;
      }

      // ═══════════════════════════════════════════════════════════
      // OPTION 3 : FALLBACK (si Gemini échoue - 5% des cas)
      // ═══════════════════════════════════════════════════════════
      
      logger.warn('[Kouakou] ⚠️ Gemini indisponible - Fallback Knowledge Base');
      
      try {
        const kbResults = await KnowledgeBaseAPI.search(userMessage, {
          projetId: this.context.projetId,
          limit: 1,
        });
        
        if (kbResults && kbResults[0]?.relevance_score >= 5) {
          logger.info(`[KB] ✅ Résultat pertinent trouvé: ${kbResults[0].title}`);
          const kbContent = `📚 ${kbResults[0].title}\n\n${kbResults[0].summary || kbResults[0].content}`;
          
          const assistantMessage: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: kbContent,
            timestamp: new Date().toISOString(),
            metadata: {
              source: 'KnowledgeBase',
            },
          };
          
          this.conversationHistory.push(assistantMessage);
          const responseTime = Date.now() - startTime;
          this.performanceMonitor.recordInteraction(userMsg, assistantMessage, responseTime);
          return assistantMessage;
        }
      } catch (kbError) {
        logger.error('[KB] Erreur recherche:', kbError);
      }
      
      // Dernier recours
      const errorMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: "Je rencontre un problème technique. Veuillez réessayer dans quelques instants.",
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'Error',
        },
      };
      
      this.conversationHistory.push(errorMessage);
      const responseTime = Date.now() - startTime;
      this.performanceMonitor.recordInteraction(userMsg, errorMessage, responseTime);
      return errorMessage;
    } catch (error: unknown) {
      // Log détaillé de l'erreur pour diagnostic
      logger.error("Erreur lors de l'envoi du message:", error);
      
      if (error instanceof Error) {
        logger.error(`[ChatAgentService] Type d'erreur: ${error.constructor.name}`);
        logger.error(`[ChatAgentService] Message: ${error.message}`);
        logger.error(`[ChatAgentService] Stack: ${error.stack?.substring(0, 500)}`);
        if ('status' in error) {
          logger.error(`[ChatAgentService] Status: ${(error as any).status}`);
        }
        if ('response' in error) {
          logger.error(`[ChatAgentService] Response: ${JSON.stringify((error as any).response)}`);
        }
      } else {
        logger.error(`[ChatAgentService] Erreur non-Error: ${JSON.stringify(error)}`);
        logger.error(`[ChatAgentService] Type: ${typeof error}`);
      }

      const errorMsg = error instanceof Error ? error.message : String(error) || 'Erreur inconnue';
      
      // Message d'erreur standard
      let errorContent = STANDARD_MISUNDERSTANDING_MESSAGE;

      if (error instanceof Error && error.message) {
        if (error.message.includes('montant') || error.message.includes('Montant')) {
          errorContent = `Désolé, ${error.message}. Peux-tu me donner le montant exact ?`;
        } else if (error.message.includes('Contexte non initialisé')) {
          errorContent = 'Désolé, je ne suis pas encore prêt. Réessaie dans quelques instants.';
        }
      }

      const errorMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString(),
        metadata: {
          error: errorMsg,
          educationalSuggestion: suggestion,
        },
      };
      this.conversationHistory.push(errorMessage);
      return errorMessage;
    }
  }

  /**
   * Confirme et exécute une action
   */
  async confirmAction(actionId: string, confirmed: boolean): Promise<ChatMessage> {
    if (!confirmed) {
      return {
        id: this.generateId(),
        role: 'assistant',
        content: "D'accord, j'annule cette action.",
        timestamp: new Date().toISOString(),
      };
    }

    return {
      id: this.generateId(),
      role: 'assistant',
      content: "Parfait, l'action a été confirmée et exécutée.",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Appelle le backend Gemini pour obtenir une réponse IA
   * Maintenant en POSITION 2 dans le pipeline (après détection rapide)
   * 
   * @param message - Le message utilisateur
   * @param systemPrompt - Le prompt système pour Gemini
   * @param conversationHistory - L'historique de conversation
   * @returns La réponse de Gemini ou null en cas d'erreur
   */
  private async callBackendGemini(
    message: string,
    systemPrompt: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<string> {
    // projetId peut être null pour les profils sans projet (buyer, veterinarian, technician)
    if (!this.context?.userId) {
      const error = new Error('Contexte userId manquant - impossible d\'appeler Gemini');
      logger.error('[Gemini] ❌', error.message);
      throw error;
    }

    logger.debug(`[Gemini] Appel backend /kouakou/chat avec message: "${message.substring(0, 50)}..."`);
    logger.debug(`[Gemini] Contexte: projetId=${this.context.projetId || 'null'}, userId=${this.context.userId}`);
    
    try {
      const response = await apiClient.post<GeminiBackendResponse | { response: string }>('/kouakou/chat', {
        message,
        userId: this.context.userId,
        projectId: this.context.projetId || null, // Peut être null pour profils sans projet
        projetId: this.context.projetId || null,   // Et aussi projetId pour compatibilité
        context: {
          farmId: this.context.projetId || null,
          projectId: this.context.projetId || null, // Dans le contexte aussi
          systemPrompt,
          conversationHistory,
          recentTransactions: this.context.recentTransactions,
        },
      });

      // Gérer les différents formats de réponse possibles
      let geminiResponse: string | null = null;
      
      // Format 1: { success: true, data: { response: string } }
      if (response && typeof response === 'object' && 'success' in response) {
        const geminiBackendResp = response as GeminiBackendResponse;
        if (geminiBackendResp.success && geminiBackendResp.data?.response) {
          geminiResponse = geminiBackendResp.data.response;
        } else if (geminiBackendResp.error) {
          const error = new Error(`Erreur backend: ${geminiBackendResp.error}`);
          logger.error('[Gemini]', error.message);
          throw error;
        }
      }
      
      // Format 2: { response: string } (format direct)
      if (!geminiResponse && response && typeof response === 'object' && 'response' in response) {
        const directResp = response as { response: string };
        if (directResp.response && typeof directResp.response === 'string') {
          geminiResponse = directResp.response;
        }
      }
      
      // Format 3: La réponse est directement une string (cas improbable mais possible)
      if (!geminiResponse && typeof response === 'string' && response.trim().length > 0) {
        geminiResponse = response;
      }

      if (geminiResponse && geminiResponse.trim().length > 0) {
        logger.debug(`[Gemini] Réponse backend: "${geminiResponse.substring(0, 100)}..."`);
        return geminiResponse;
      }

      const error = new Error(`Format de réponse inattendu du backend Gemini: ${JSON.stringify(response).substring(0, 200)}`);
      logger.error('[Gemini]', error.message);
      throw error;
    } catch (error: any) {
      logger.error('[Gemini] Erreur lors de l\'appel backend:', error);
      
      // Log plus détaillé pour le debug
      if (error instanceof Error) {
        logger.error(`[Gemini] Message: ${error.message}`);
        logger.error(`[Gemini] Stack: ${error.stack?.substring(0, 500)}`);
      }
      
      // Log de l'API config pour diagnostic
      try {
        const { API_CONFIG } = await import('../../config/api.config');
        logger.error(`[Gemini] API Config: baseURL=${API_CONFIG.baseURL}`);
      } catch (configError) {
        logger.error(`[Gemini] Erreur lors de la récupération de la config API:`, configError);
      }
      
      // Log de l'erreur complète pour diagnostic en production
      if (error?.response) {
        logger.error(`[Gemini] Response status: ${error.response.status}`);
        logger.error(`[Gemini] Response data:`, JSON.stringify(error.response.data).substring(0, 500));
      }
      
      // Propager l'erreur pour qu'elle soit gérée par le catch block de sendMessage
      throw error;
    }
  }

  /**
   * Extrait une action structurée de la réponse Gemini
   * Gemini peut retourner des JSON entre balises ```json ... ```
   * ou des patterns comme ACTION: ... PARAMS: ...
   */
  private extractActionFromGeminiResponse(geminiResponse: string): GeminiParsedAction | null {
    try {
      // Méthode 1: Chercher un bloc JSON entre balises ```json
      const jsonBlockMatch = geminiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        const parsed = JSON.parse(jsonBlockMatch[1]);
        if (parsed.action) {
          logger.debug(`[Gemini] Action extraite (JSON block): ${parsed.action}`);
          return {
            action: parsed.action as AgentActionType,
            params: parsed.params || {},
            explanation: parsed.explanation,
          };
        }
      }

      // Méthode 2: Chercher un objet JSON simple dans la réponse
      const jsonMatch = geminiResponse.match(/\{[^{}]*"action"\s*:\s*"([^"]+)"[^{}]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.action) {
            logger.debug(`[Gemini] Action extraite (JSON inline): ${parsed.action}`);
            return {
              action: parsed.action as AgentActionType,
              params: parsed.params || {},
              explanation: parsed.explanation,
            };
          }
        } catch {
          // JSON mal formé, essayer de parser manuellement
        }
      }

      // Méthode 3: Chercher pattern ACTION: ... PARAMS: ...
      const actionPatternMatch = geminiResponse.match(/ACTION:\s*(\w+)/i);
      if (actionPatternMatch) {
        const actionName = actionPatternMatch[1];
        let params: Record<string, unknown> = {};
        
        const paramsMatch = geminiResponse.match(/PARAMS:\s*(\{[\s\S]*?\})/i);
        if (paramsMatch) {
          try {
            params = JSON.parse(paramsMatch[1]);
          } catch {
            // Ignorer si le JSON params est mal formé
          }
        }
        
        logger.debug(`[Gemini] Action extraite (pattern): ${actionName}`);
        return {
          action: actionName as AgentActionType,
          params,
        };
      }

      // Aucune action trouvée - c'est une réponse conversationnelle
      return null;
    } catch (error) {
      logger.error('[Gemini] Erreur parsing réponse:', error);
      return null;
    }
  }

  /**
   * Construit le prompt système optimisé pour Gemini
   * Ce prompt guide Gemini à retourner des actions structurées
   */
  private buildGeminiSystemPrompt(): string {
    const basePrompt = buildOptimizedSystemPrompt(this.context!);
    
    const structuredPrompt = `${basePrompt}

═══════════════════════════════════════════════════════════════
INSTRUCTIONS IMPORTANTES POUR LE FORMAT DE RÉPONSE
═══════════════════════════════════════════════════════════════

Si l'utilisateur demande une ACTION (créer, enregistrer, calculer, etc.), réponds avec cette structure JSON :

\`\`\`json
{
  "action": "nom_action",
  "params": { ... },
  "explanation": "Explication courte de ce que tu vas faire"
}
\`\`\`

ACTIONS DISPONIBLES:
- create_depense : Enregistrer une dépense (params: montant, categorie, description, date)
- create_revenu : Enregistrer un revenu/vente (params: montant, source, description, date)
- create_charge_fixe : Enregistrer une charge fixe (params: montant, categorie, frequence)
- marketplace_get_price_trends : Consulter les prix du marché
- marketplace_sell_animal : Mettre un animal en vente (params: animal_id ou animal_code, price_per_kg)
- get_statistics : Obtenir des statistiques
- get_bilan_financier : Voir le bilan financier
- get_reminders : Voir les rappels/vaccins en retard
- create_vaccination : Enregistrer une vaccination (params: animal_id, vaccin, date)
- create_pesee : Enregistrer une pesée (params: animal_id, poids_kg, date)
- list_animals : Lister les animaux du cheptel
- search_animal : Rechercher un animal (params: code ou critères)

EXEMPLES:

User: "J'ai dépensé 50000 FCFA pour l'aliment"
\`\`\`json
{
  "action": "create_depense",
  "params": {
    "montant": 50000,
    "categorie": "aliment",
    "description": "Achat d'aliment"
  },
  "explanation": "J'enregistre ta dépense de 50 000 FCFA pour l'aliment."
}
\`\`\`

User: "Quel est le prix du marché ?"
\`\`\`json
{
  "action": "marketplace_get_price_trends",
  "params": {},
  "explanation": "Je consulte les tendances de prix du marché pour toi."
}
\`\`\`

User: "J'ai vendu un porc à 300000"
\`\`\`json
{
  "action": "create_revenu",
  "params": {
    "montant": 300000,
    "source": "vente_porc",
    "description": "Vente d'un porc"
  },
  "explanation": "J'enregistre ta vente de 300 000 FCFA."
}
\`\`\`

SI L'UTILISATEUR POSE UNE QUESTION ou fait la CONVERSATION (salutation, remerciement, conseil général), réponds NATURELLEMENT en français, SANS JSON.

User: "Bonjour Kouakou"
→ Bonjour ! Comment puis-je t'aider avec ton élevage aujourd'hui ?

User: "Merci"
→ De rien ! N'hésite pas si tu as d'autres questions.

User: "Donne-moi des conseils sur l'alimentation des porcelets"
→ [Réponds avec tes connaissances sur l'alimentation des porcelets, sans JSON]
`;

    return structuredPrompt;
  }

  /**
   * Enregistre une correction utilisateur (V4.0)
   * @deprecated Cette méthode n'est plus utilisée - l'apprentissage est géré par Gemini
   */
  async recordUserCorrection(
    originalMessage: string,
    detectedIntent: string | null,
    correctIntent: string,
    correctParams?: Record<string, any>
  ): Promise<void> {
    // Désactivé - l'apprentissage est maintenant géré par Gemini
    logger.warn('[recordUserCorrection] Méthode désactivée - apprentissage géré par Gemini');
  }

  /**
   * Résout les références dans les paramètres
   * Amélioré pour résoudre plus de types de références
   */
  private resolveReferences(params: Record<string, unknown>): void {
    if (params.acheteur && typeof params.acheteur === 'string') {
      const resolved = this.conversationContext.resolveReference(params.acheteur, 'acheteur');
      if (resolved) {
        params.acheteur = resolved;
      }
    }

    if (params.animal_code && typeof params.animal_code === 'string') {
      const resolved = this.conversationContext.resolveReference(params.animal_code, 'animal');
      if (resolved) {
        params.animal_code = resolved;
      }
    }

    if (params.montant && typeof params.montant === 'string') {
      const resolved = this.conversationContext.resolveReference(params.montant, 'montant');
      if (resolved) {
        params.montant = resolved;
      }
    }

    if (params.date && typeof params.date === 'string') {
      const resolved = this.conversationContext.resolveReference(params.date, 'date');
      if (resolved) {
        params.date = resolved;
      }
    }

    if (params.categorie && typeof params.categorie === 'string') {
      const resolved = this.conversationContext.resolveReference(params.categorie, 'categorie');
      if (resolved) {
        params.categorie = resolved;
      }
    }
  }

  /**
   * Enrichit les paramètres depuis l'historique conversationnel
   * Utilise les dernières valeurs mentionnées pour compléter les paramètres manquants
   */
  private enrichParamsFromHistory(
    params: Record<string, unknown>,
    actionType: AgentActionType
  ): Record<string, unknown> {
    const enriched = { ...params };
    const normalizedMessage = (params.userMessage as string || '').toLowerCase();

    // Utiliser le contexte pour enrichir seulement si des références implicites sont détectées
    const hasImplicitReference = normalizedMessage.match(
      /\b(?:pour\s+ca|pour\s+cela|meme|le\s+meme|la\s+meme|au\s+meme|avec\s+ca|avec\s+cela)\b/i
    );

    if (!hasImplicitReference) {
      return enriched; // Pas de référence implicite, ne pas enrichir
    }

    const context = this.conversationContext.getExtractionContext();

    // Actions de création de revenu/vente
    if (actionType === 'create_revenu') {
      if (!enriched.acheteur && context.lastAcheteur) {
        enriched.acheteur = context.lastAcheteur;
      }
      if (!enriched.montant && context.lastMontant) {
        enriched.montant = context.lastMontant;
      }
      if (!enriched.date && context.lastDate) {
        enriched.date = context.lastDate;
      }
    }

    // Actions de création de dépense
    if (actionType === 'create_depense') {
      if (!enriched.montant && context.lastMontant) {
        enriched.montant = context.lastMontant;
      }
      if (!enriched.categorie && context.lastCategorie) {
        enriched.categorie = context.lastCategorie;
      }
      if (!enriched.date && context.lastDate) {
        enriched.date = context.lastDate;
      }
    }

    // Actions de création de pesée
    if (actionType === 'create_pesee') {
      if (!enriched.animal_code && context.lastAnimal) {
        enriched.animal_code = context.lastAnimal;
      }
      if (!enriched.date && context.lastDate) {
        enriched.date = context.lastDate;
      }
    }

    // Actions de création de vaccination
    if (actionType === 'create_vaccination') {
      if (!enriched.animal_code && context.lastAnimal) {
        enriched.animal_code = context.lastAnimal;
      }
      if (!enriched.date && context.lastDate) {
        enriched.date = context.lastDate;
      }
    }

    return enriched;
  }

  /**
   * Réinitialise l'historique
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Récupère l'historique
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Restaure l'historique
   */
  restoreHistory(messages: ChatMessage[]): void {
    this.conversationHistory = [...messages];
    this.conversationContext.reset();
    for (const msg of messages) {
      this.conversationContext.updateFromMessage(msg);
    }
  }


  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
