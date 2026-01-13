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
import { IntentDetector } from './IntentDetector';
import { buildOptimizedSystemPrompt } from './prompts/systemPrompt';
import {
  IntentRAG,
  ConversationContextManager,
  DataValidator,
  ClarificationService,
} from './core';
import { EnhancedParameterExtractor } from './core/EnhancedParameterExtractor';
import { FastPathDetector } from './core/FastPathDetector';
import { ConfirmationManager } from './core/ConfirmationManager';
import { LearningService, STANDARD_MISUNDERSTANDING_MESSAGE } from './core/LearningService';
import { ActionParser } from './core/ActionParser';
import { PerformanceMonitor } from './monitoring/PerformanceMonitor';
import { NaturalLanguageProcessor } from './core/NaturalLanguageProcessor';
import type { DetectedIntent } from './IntentDetector';
import { createLoggerWithPrefix } from '../../utils/logger';
import { KnowledgeBaseAPI } from './knowledge/KnowledgeBaseAPI';
import apiClient from '../api/apiClient';

const logger = createLoggerWithPrefix('ChatAgentService');

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES DE SEUILS - V5.1 Optimisé
// ═══════════════════════════════════════════════════════════════════════════
const FASTPATH_THRESHOLD = 0.95;   // Seuil strict pour FastPath (cas évidents)
const INTENTRAG_THRESHOLD = 0.90;  // Seuil strict pour IntentRAG (patterns connus)
const GEMINI_CONFIDENCE = 0.95;    // Confiance attribuée aux réponses Gemini
const MINIMUM_EXECUTION_CONFIDENCE = 0.85; // Confiance minimale pour exécuter une action

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

  // Composants core (sans Gemini - tout passe par le backend)
  private intentRAG: IntentRAG;
  private conversationContext: ConversationContextManager;
  private dataValidator: DataValidator;
  private confirmationManager: ConfirmationManager;
  private learningService: LearningService;
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

    // Initialiser les composants core (sans Gemini)
    this.intentRAG = new IntentRAG();
    this.conversationContext = new ConversationContextManager();
    this.dataValidator = new DataValidator();
    this.confirmationManager = new ConfirmationManager();
    this.learningService = new LearningService();
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

    // V4.0 - Initialiser le LearningService avec le projet et conversationId
    if (context.projetId) {
      this.learningService.initialize(context.projetId, conversationId);
    }

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
   * Envoie un message à l'agent et reçoit une réponse
   * 
   * V5.1 - FLUX OPTIMISÉ avec Gemini en position 2
   * 
   * NIVEAU 1: Détection rapide (< 100ms)
   *   - FastPath (seuil >= 0.95)
   *   - IntentRAG (seuil >= 0.90)
   * 
   * NIVEAU 2: Gemini (si confiance < 0.90)
   *   - Appel backend Gemini
   *   - Extraction action structurée ou réponse conversationnelle
   * 
   * NIVEAU 3: Fallback
   *   - Knowledge Base
   *   - Message par défaut
   */
  async sendMessage(userMessage: string): Promise<ChatMessage> {
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

    // Enregistrer le message utilisateur pour l'apprentissage (fire-and-forget)
    this.learningService.recordConversationMessage('user', userMessage);

    try {
      // Mettre à jour le contexte conversationnel
      this.conversationContext.updateFromMessage(userMsg);

      // Prétraitement NLP
      const nlpResult = NaturalLanguageProcessor.process(userMessage);
      const processedMessage = nlpResult.processed;
      logger.debug(`[NLP] "${userMessage}" → "${processedMessage}"`);

      // Variables de suivi
      let detectedIntent: DetectedIntent | null = null;
      let detectionSource = '';
      let aiResponse: string | null = null;
      let action: AgentAction | null = null;

      // Vérifier s'il y a une clarification en cours
      const pendingClarification = this.conversationContext.getClarificationNeeded();
      const pendingAction = this.conversationContext.getPendingAction();
      let isClarificationResponse = false;

      if (pendingClarification && pendingAction) {
        const extractionContext = this.conversationContext.getExtractionContext();
        const parameterExtractor = new EnhancedParameterExtractor({
          ...extractionContext,
          currentDate: this.context.currentDate,
          availableAnimals: this.context.availableAnimals,
        });
        
        const extractedParams = parameterExtractor.extractAllEnhanced(processedMessage, pendingAction.action);
        
        // Vérifier si les paramètres manquants sont maintenant présents
        const hasMissingParams = pendingClarification.missingParams.every(
          (param) => extractedParams[param] !== undefined && extractedParams[param] !== null
        );
        
        if (hasMissingParams) {
          isClarificationResponse = true;
          logger.debug('[Kouakou] Réponse à clarification détectée');
        }
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // NIVEAU 1 : DÉTECTION RAPIDE (< 100ms)
      // ═══════════════════════════════════════════════════════════════════════════
      
      // 1.1 FastPath - Seuil strict >= 0.95 pour les cas ÉVIDENTS
      const fastPathStartTime = Date.now();
      const fastPathResult = FastPathDetector.detectFastPath(processedMessage);
      const fastPathTime = Date.now() - fastPathStartTime;
      
      logger.debug(`[FastPath] action=${fastPathResult.intent?.action}, confiance=${fastPathResult.confidence}, temps=${fastPathTime}ms`);

      if (fastPathResult.intent && fastPathResult.confidence >= FASTPATH_THRESHOLD) {
        detectedIntent = fastPathResult.intent;
        detectionSource = 'FastPath';
        logger.info(`[Kouakou] ✅ FastPath HAUTE CONFIANCE: ${detectedIntent.action} (${fastPathResult.confidence})`);
        this.performanceMonitor.recordStepTiming({ fastPathTime });
      }
      
      // 1.2 IntentRAG - Seuil strict >= 0.90 pour les patterns connus
      if (!detectedIntent) {
        const ragStartTime = Date.now();
        const ragResult = await this.intentRAG.detectIntent(processedMessage);
        const ragTime = Date.now() - ragStartTime;
        
        logger.debug(`[IntentRAG] action=${ragResult?.action}, confiance=${ragResult?.confidence}, temps=${ragTime}ms`);

        if (ragResult && ragResult.confidence >= INTENTRAG_THRESHOLD) {
          detectedIntent = ragResult;
          detectionSource = 'IntentRAG';
          logger.info(`[Kouakou] ✅ IntentRAG HAUTE CONFIANCE: ${detectedIntent.action} (${ragResult.confidence})`);
          this.performanceMonitor.recordStepTiming({ ragTime });
        }
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // NIVEAU 2 : GEMINI (si confiance < 0.90)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (!detectedIntent || detectedIntent.confidence < INTENTRAG_THRESHOLD) {
        logger.info(`[Kouakou] 🤖 Confiance insuffisante (${detectedIntent?.confidence || 0}) - Appel GEMINI`);
        
        try {
          const geminiStartTime = Date.now();
          
          // Construire le prompt optimisé pour Gemini
          const systemPrompt = this.buildGeminiSystemPrompt();
          const conversationContext = this.conversationHistory.slice(-10).map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));
          
          // Appeler le backend Gemini
          const geminiResponse = await this.callBackendGemini(
            userMessage,
            systemPrompt,
            conversationContext
          );
          
          const geminiTime = Date.now() - geminiStartTime;
          logger.info(`[Gemini] ✅ Réponse reçue en ${geminiTime}ms`);
          
          if (geminiResponse) {
            aiResponse = geminiResponse;
            
            // Essayer d'extraire une action structurée de la réponse Gemini
            const parsedAction = this.extractActionFromGeminiResponse(geminiResponse);
            
            if (parsedAction) {
              // Gemini a détecté une action
              detectedIntent = {
                action: parsedAction.action,
                confidence: GEMINI_CONFIDENCE,
                params: parsedAction.params,
              };
              detectionSource = 'Gemini';
              logger.info(`[Kouakou] ✅ Gemini ACTION: ${parsedAction.action}`);
            } else {
              // Gemini a répondu de manière conversationnelle (pas d'action)
              logger.info('[Kouakou] 💬 Gemini réponse conversationnelle (pas d\'action)');
              
              const assistantMessage: ChatMessage = {
                id: this.generateId(),
                role: 'assistant',
                content: geminiResponse,
                timestamp: new Date().toISOString(),
                metadata: {
                  source: 'Gemini',
                  conversational: true,
                },
              };
              
              this.conversationHistory.push(assistantMessage);
              this.learningService.recordConversationMessage('assistant', geminiResponse);
              
              const responseTime = Date.now() - startTime;
              this.performanceMonitor.recordInteraction(userMsg, assistantMessage, responseTime);
              
              return assistantMessage;
            }
          }
        } catch (geminiError) {
          logger.error('[Gemini] ❌ Erreur:', geminiError);
          // Continuer vers le fallback
        }
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // NIVEAU 3 : FALLBACK (si Gemini échoue ou pas d'intention)
      // ═══════════════════════════════════════════════════════════════════════════
      
      if (!detectedIntent) {
        logger.warn(`[Kouakou] ⚠️ Aucune intention détectée - Recherche Knowledge Base`);
        
        // Chercher dans la base de connaissances
        try {
          const kbResults = await KnowledgeBaseAPI.search(userMessage, {
            projetId: this.context.projetId,
            limit: 1,
          });
          
          if (kbResults && kbResults[0]?.relevance_score >= 3) {
            const kbContent = `📚 **${kbResults[0].title}**\n\n${kbResults[0].summary || kbResults[0].content}`;
            
            const assistantMessage: ChatMessage = {
              id: this.generateId(),
              role: 'assistant',
              content: kbContent,
              timestamp: new Date().toISOString(),
              metadata: {
                source: 'KnowledgeBase',
                knowledgeResult: kbResults[0],
              },
            };
            
            this.conversationHistory.push(assistantMessage);
            return assistantMessage;
          }
        } catch {
          // Ignorer les erreurs KB
        }
        
        // Message par défaut
        const defaultMessage: ChatMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: `${STANDARD_MISUNDERSTANDING_MESSAGE}\n\n💡 Tu peux me demander:\n• Des statistiques sur ton élevage\n• D'enregistrer une vente ou dépense\n• Les prix du marché\n• Des conseils sur l'élevage porcin`,
          timestamp: new Date().toISOString(),
          metadata: {
            source: 'Default',
            misunderstanding: true,
          },
        };
        
        this.conversationHistory.push(defaultMessage);
        this.learningService.recordFailure(userMessage, undefined, 'Aucune intention détectée');
        return defaultMessage;
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // EXÉCUTION DE L'ACTION
      // ═══════════════════════════════════════════════════════════════════════════
      
      logger.info(`[Kouakou] 🎯 Intention finale: ${detectedIntent.action} (confiance: ${detectedIntent.confidence}, source: ${detectionSource})`);

      // Vérifier que la confiance est suffisante pour exécuter
      if (detectedIntent.confidence >= MINIMUM_EXECUTION_CONFIDENCE) {
        // EXTRACTION DE PARAMÈTRES (avec extracteur amélioré)
        const extractionContext = this.conversationContext.getExtractionContext();
        const parameterExtractor = new EnhancedParameterExtractor({
          ...extractionContext,
          currentDate: this.context.currentDate,
          availableAnimals: this.context.availableAnimals,
        });

        let extractedParams = parameterExtractor.extractAllEnhanced(processedMessage, detectedIntent.action);
        
        // Si réponse à clarification, fusionner avec les paramètres de l'action en attente
        if (isClarificationResponse && pendingAction) {
          extractedParams = {
            ...pendingAction.params,
            ...extractedParams,
          };
          logger.debug('[ChatAgentService] Paramètres fusionnés pour clarification:', extractedParams);
        }

        // Note: L'extraction Gemini a été supprimée - tout passe par le backend

        let mergedParams = {
          ...detectedIntent.params,
          ...extractedParams,
          userMessage: userMessage,
        };

        // Résoudre les références avant validation
        this.resolveReferences(mergedParams);
        
        // Améliorer le contexte: utiliser l'historique pour enrichir les paramètres manquants
        mergedParams = this.enrichParamsFromHistory(mergedParams, detectedIntent.action);

        // ANALYSE DE CLARIFICATION INTELLIGENTE
        const clarificationResult = this.clarificationService.analyzeAction(
          { type: detectedIntent.action, params: mergedParams },
          extractionContext
        );

        // Si clarification nécessaire et qu'on peut utiliser le contexte, l'utiliser
        if (clarificationResult.needsClarification && clarificationResult.canUseContext && clarificationResult.contextSuggestions) {
          const resolvedAction = this.clarificationService.resolveWithContext(
            { type: detectedIntent.action, params: mergedParams },
            clarificationResult.contextSuggestions
          );
          mergedParams = resolvedAction.params;
          
          // Enregistrer la clarification résolue
          if (clarificationResult.clarification) {
            this.clarificationService.recordClarification(
              detectedIntent.action,
              clarificationResult.clarification.missingParams,
              true
            );
          }
        }

        // Si clarification nécessaire sans contexte utilisable, demander
        if (clarificationResult.needsClarification && !clarificationResult.canUseContext && clarificationResult.clarification) {
          this.clarificationService.recordClarification(
            detectedIntent.action,
            clarificationResult.clarification.missingParams,
            false
          );

          // Construire le message de clarification
          let clarificationMessage = clarificationResult.clarification.question;
          
          if (clarificationResult.clarification.suggestions && clarificationResult.clarification.suggestions.length > 0) {
            clarificationMessage += '\n\n💡 Suggestions :';
            clarificationResult.clarification.suggestions.forEach(sugg => {
              clarificationMessage += `\n• ${sugg.label}: ${sugg.value}`;
            });
          }
          
          if (clarificationResult.clarification.examples && clarificationResult.clarification.examples.length > 0) {
            clarificationMessage += '\n\n📝 Exemples :';
            clarificationResult.clarification.examples.forEach(example => {
              clarificationMessage += `\n• ${example}`;
            });
          }

          // Enregistrer dans le contexte
          this.conversationContext.setClarificationNeeded(
            clarificationMessage,
            clarificationResult.clarification.missingParams,
            undefined // clarificationType sera défini via metadata si nécessaire
          );

          return {
            id: this.generateId(),
            role: 'assistant',
            content: clarificationMessage,
            timestamp: new Date().toISOString(),
            metadata: {
              requiresClarification: true,
              missingParams: clarificationResult.clarification.missingParams,
              clarification: clarificationResult.clarification,
              pendingAction: { action: detectedIntent.action, params: mergedParams },
            },
          };
        }

        // VALIDATION
        const validationResult = await this.dataValidator.validateAction({
          type: detectedIntent.action,
          params: mergedParams,
        });

        if (!validationResult.valid) {
          // Utiliser le service de clarification pour améliorer le message d'erreur
          const clarificationAnalysis = this.clarificationService.analyzeAction(
            { type: detectedIntent.action, params: mergedParams },
            extractionContext
          );
          
          let errorMessage = validationResult.errors.join(', ');
          if (clarificationAnalysis.clarification) {
            errorMessage = clarificationAnalysis.clarification.question;
          }

          return {
            id: this.generateId(),
            role: 'assistant',
            content: `Désolé, ${errorMessage}. Peux-tu corriger ces informations ?`,
            timestamp: new Date().toISOString(),
            metadata: {
              validationErrors: validationResult.errors,
              suggestions: validationResult.suggestions,
              clarification: clarificationAnalysis.clarification,
            },
          };
        }

        // Déterminer si confirmation nécessaire
        const confirmationDecision = this.confirmationManager.shouldConfirmAndExecute(
          { type: detectedIntent.action, params: mergedParams },
          detectedIntent.confidence,
          userMessage
        );

        action = {
          type: detectedIntent.action,
          params: mergedParams,
          requiresConfirmation: confirmationDecision.requiresConfirmation,
        };
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // EXÉCUTION DE L'ACTION (si détectée)
      // ═══════════════════════════════════════════════════════════════════════════
      
      let assistantMessage: ChatMessage;
      let actionResult: AgentActionResult | null = null;

      if (action) {
        const confidence = detectedIntent?.confidence || GEMINI_CONFIDENCE;
        const confirmationDecisionFinal = this.confirmationManager.shouldConfirmAndExecute(
          action,
          confidence,
          userMessage
        );

        if (confirmationDecisionFinal.requiresConfirmation && !confirmationDecisionFinal.shouldExecute) {
          assistantMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: confirmationDecisionFinal.message || 'Je veux confirmer avant d\'enregistrer. C\'est bon ?',
            timestamp: new Date().toISOString(),
            metadata: {
              pendingAction: { action: action.type, params: action.params },
              requiresConfirmation: true,
              source: detectionSource,
            },
          };
        } else {
          // Exécuter l'action
          const actionExecutionStartTime = Date.now();
          actionResult = await this.actionExecutor.execute(action, this.context);
          const actionExecutionTime = Date.now() - actionExecutionStartTime;

          // Gérer les clarifications nécessaires
          if (actionResult.needsClarification) {
            this.conversationContext.setClarificationNeeded(
              actionResult.message,
              actionResult.missingParams || [],
              actionResult.clarificationType
            );

            assistantMessage = {
              id: this.generateId(),
              role: 'assistant',
              content: actionResult.message,
              timestamp: new Date().toISOString(),
              metadata: {
                actionExecuted: action.type,
                requiresClarification: true,
                missingParams: actionResult.missingParams,
                clarificationType: actionResult.clarificationType,
                pendingAction: {
                  action: actionResult.actionType || action.type,
                  params: action.params,
                },
                source: detectionSource,
              },
            };
            
            this.conversationContext.setPendingAction(actionResult.actionType || action.type, action.params);
          } else {
            // Enregistrer le succès pour apprentissage
            if (detectedIntent && actionResult.success) {
              this.learningService.recordIntentSuccess(
                detectedIntent.action,
                detectedIntent.confidence,
                userMessage,
                action.params
              );
            }

            this.performanceMonitor.recordStepTiming({ actionExecutionTime });

            const responseMessage = confirmationDecisionFinal.message || actionResult.message;

            assistantMessage = {
              id: this.generateId(),
              role: 'assistant',
              content: responseMessage,
              timestamp: new Date().toISOString(),
              metadata: {
                actionExecuted: action.type,
                actionResult: actionResult.data,
                requiresConfirmation: false,
                pendingAction: { action: action.type, params: action.params },
                refreshHint: actionResult.refreshHint,
                source: detectionSource,
              },
            };
            
            // Si succès après clarification, nettoyer le contexte
            if (isClarificationResponse) {
              this.conversationContext.clearClarificationNeeded();
              this.conversationContext.clearPendingAction();
              this.conversationContext.clearVenteState();
              logger.debug('[Kouakou] Clarification résolue avec succès');
            }
          }
        }
      } else {
        // Ce cas ne devrait plus arriver avec le nouveau flux
        // car on retourne déjà dans les fallbacks KB/default plus haut
        logger.error('[Kouakou] ❌ Cas inattendu: action null après tous les checks');
        
        assistantMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: `${STANDARD_MISUNDERSTANDING_MESSAGE}\n\n💡 Tu peux me demander:\n• Des statistiques sur ton élevage\n• D'enregistrer une vente ou dépense\n• Les prix du marché`,
          timestamp: new Date().toISOString(),
          metadata: {
            source: 'Error',
            misunderstanding: true,
          },
        };
      }

      this.conversationHistory.push(assistantMessage);

      // V4.0 - Enregistrer la réponse assistant (fire-and-forget, non-bloquant)
      this.learningService.recordConversationMessage(
        'assistant',
        assistantMessage.content,
        detectedIntent?.action,
        action?.type,
        actionResult?.success
      );

      // Monitoring
      const responseTime = Date.now() - startTime;
      // Extraire l'intention réelle pour les métriques de précision
      const actualIntent = assistantMessage.metadata?.actionExecuted || 
                          assistantMessage.metadata?.pendingAction?.action || 
                          undefined;
      
      this.performanceMonitor.recordInteraction(userMsg, assistantMessage, responseTime, actualIntent);
      this.performanceMonitor.recordStepTiming({ apiCallTime });

      return assistantMessage;
    } catch (error: unknown) {
      logger.error("Erreur lors de l'envoi du message:", error);

      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      this.learningService.recordFailure(userMessage, undefined, errorMsg);

      // V4.0 - Utiliser la clarification avec mots-clés même en cas d'erreur
      const suggestion = this.learningService.generateEducationalSuggestion(userMessage);
      let errorContent = suggestion?.explanation || STANDARD_MISUNDERSTANDING_MESSAGE;

      if (error instanceof Error && error.message) {
        if (error.message.includes('montant') || error.message.includes('Montant')) {
          errorContent = suggestion?.explanation ||
            `Désolé, ${error.message}. Peux-tu me donner le montant exact ?`;
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
  ): Promise<string | null> {
    try {
      logger.debug(`[Gemini] Appel backend /api/kouakou/chat avec message: "${message.substring(0, 50)}..."`);
      
      const response = await apiClient.post<GeminiBackendResponse>('/kouakou/chat', {
        message,
        userId: this.context?.userId,
        context: {
          farmId: this.context?.projetId,
          systemPrompt,
          conversationHistory,
          recentTransactions: this.context?.recentTransactions,
        },
      });

      if (response.success && response.data?.response) {
        logger.debug(`[Gemini] Réponse backend: "${response.data.response.substring(0, 100)}..."`);
        return response.data.response;
      }

      if (response.error) {
        logger.error(`[Gemini] Erreur backend: ${response.error}`);
        return null;
      }

      // Si la réponse n'a pas le format attendu, essayer d'extraire directement
      if (typeof response === 'object' && 'response' in response) {
        return (response as unknown as { response: string }).response;
      }

      logger.warn('[Gemini] Format de réponse inattendu:', response);
      return null;
    } catch (error) {
      logger.error('[Gemini] Erreur lors de l\'appel backend:', error);
      
      // Log plus détaillé pour le debug
      if (error instanceof Error) {
        logger.error(`[Gemini] Message: ${error.message}`);
        logger.error(`[Gemini] Stack: ${error.stack?.substring(0, 500)}`);
      }
      
      return null;
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
   */
  async recordUserCorrection(
    originalMessage: string,
    detectedIntent: string | null,
    correctIntent: string,
    correctParams?: Record<string, any>
  ): Promise<void> {
    await this.learningService.recordUserCorrection(
      originalMessage,
      detectedIntent,
      correctIntent,
      correctParams
    );
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
    this.learningService.clearCache();
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

  /**
   * Récupère le service d'apprentissage
   */
  getLearningService(): LearningService {
    return this.learningService;
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
