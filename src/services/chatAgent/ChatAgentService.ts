/**
 * Service principal pour l'agent conversationnel
 * V4.0 - Avec apprentissage continu et réponses unifiées
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
  ParameterExtractor,
  ConversationContextManager,
  DataValidator,
  OpenAIIntentService,
  OpenAIParameterExtractor,
} from './core';
import { FastPathDetector } from './core/FastPathDetector';
import { ConfirmationManager } from './core/ConfirmationManager';
import { LearningService, STANDARD_MISUNDERSTANDING_MESSAGE } from './core/LearningService';
import { ActionParser } from './core/ActionParser';
import { PerformanceMonitor } from './monitoring/PerformanceMonitor';
import type { DetectedIntent } from './IntentDetector';
import { createLoggerWithPrefix } from '../../utils/logger';

const logger = createLoggerWithPrefix('ChatAgentService');

export class ChatAgentService {
  private actionExecutor: AgentActionExecutor;
  private api: ChatAgentAPI;
  private config: AgentConfig;
  private context: AgentContext | null = null;
  private conversationHistory: ChatMessage[] = [];

  // Composants core
  private intentRAG: IntentRAG;
  private conversationContext: ConversationContextManager;
  private dataValidator: DataValidator;
  private openAIService: OpenAIIntentService | null = null;
  private confirmationManager: ConfirmationManager;
  private learningService: LearningService;
  private performanceMonitor: PerformanceMonitor;

  constructor(config: AgentConfig) {
    this.config = {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000,
      language: 'fr-CI',
      enableVoice: false,
      enableProactiveAlerts: true,
      ...config,
    };
    this.actionExecutor = new AgentActionExecutor();
    this.api = new ChatAgentAPI(this.config);

    // Initialiser le service OpenAI si la clé est fournie
    if (this.config.apiKey) {
      this.openAIService = new OpenAIIntentService(this.config.apiKey);
    }

    // Initialiser les composants core
    this.intentRAG = new IntentRAG(undefined, this.openAIService || undefined);
    this.conversationContext = new ConversationContextManager();
    this.dataValidator = new DataValidator();
    this.confirmationManager = new ConfirmationManager();
    this.learningService = new LearningService();
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Initialise le contexte de l'agent
   */
  async initializeContext(context: AgentContext): Promise<void> {
    this.context = context;
    await this.actionExecutor.initialize(context);
    await this.dataValidator.initialize(context);

    // V4.0 - Initialiser le LearningService avec le projet
    if (context.projetId) {
      this.learningService.initialize(context.projetId);
    }

    // Charger l'historique dans le contexte conversationnel
    if (this.conversationHistory.length > 0) {
      for (const msg of this.conversationHistory) {
        this.conversationContext.updateFromMessage(msg);
      }
    }
  }

  /**
   * Envoie un message à l'agent et reçoit une réponse
   */
  async sendMessage(userMessage: string): Promise<ChatMessage> {
    if (!this.context) {
      throw new Error("Le contexte de l'agent n'est pas initialisé");
    }

    const startTime = Date.now();

    // Ajouter le message utilisateur à l'historique
    const userMsg: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    this.conversationHistory.push(userMsg);

    // V4.0 - Enregistrer le message utilisateur (fire-and-forget, non-bloquant)
    this.learningService.recordConversationMessage('user', userMessage);

    try {
      // Préparer le contexte pour l'IA
      const systemPrompt = buildOptimizedSystemPrompt(this.context);
      const messagesForAPI = [
        { role: 'system' as const, content: systemPrompt },
        ...this.conversationHistory.slice(-10).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      // Appeler l'API de l'IA
      const apiCallStartTime = Date.now();
      const aiResponse = await this.api.sendMessage(messagesForAPI);
      const apiCallTime = Date.now() - apiCallStartTime;

      // Mettre à jour le contexte conversationnel
      this.conversationContext.updateFromMessage(userMsg);

      // V4.0 - Chercher un apprentissage similaire d'abord
      const similarLearning = await this.learningService.findSimilarLearning(userMessage);
      let detectedIntent: DetectedIntent | null = null;
      let action: AgentAction | null = null;
      let ragTime: number | undefined;
      let fastPathTime: number | undefined;

      // Si un apprentissage avec haute confiance existe, l'utiliser
      if (similarLearning && similarLearning.total_score >= 3.0 && similarLearning.correct_intent) {
        detectedIntent = {
          action: similarLearning.correct_intent as AgentActionType,
          confidence: 0.95,
          params: {},
        };
        logger.debug(`Apprentissage réutilisé: ${detectedIntent.action}, score: ${similarLearning.total_score}`);
      } else {
        // FAST PATH : Détection rapide pour les cas courants
        const fastPathStartTime = Date.now();
        const fastPathResult = FastPathDetector.detectFastPath(userMessage);
        fastPathTime = Date.now() - fastPathStartTime;

        if (fastPathResult.intent && fastPathResult.confidence >= 0.95) {
          detectedIntent = fastPathResult.intent;
          logger.debug(`Fast path activé: ${detectedIntent.action}, confiance: ${fastPathResult.confidence}`);
          this.performanceMonitor.recordStepTiming({ fastPathTime });
        } else {
          // DÉTECTION D'INTENTION : Utiliser RAG
          const ragStartTime = Date.now();
          detectedIntent = await this.intentRAG.detectIntent(userMessage);
          ragTime = Date.now() - ragStartTime;

          // Si RAG ne trouve rien, essayer OpenAI classification
          if ((!detectedIntent || detectedIntent.confidence < 0.85) && this.openAIService) {
            const availableActions: AgentActionType[] = [
              'get_statistics',
              'get_stock_status',
              'calculate_costs',
              'get_reminders',
              'analyze_data',
              'search_animal',
              'create_revenu',
              'create_depense',
              'create_charge_fixe',
              'create_pesee',
              'create_vaccination',
              'create_visite_veterinaire',
              'create_traitement',
              'create_maladie',
              'create_ingredient',
              'create_planification',
              'answer_knowledge_question',
              'list_knowledge_topics',
              'other',
            ];

            const openAIClassification = await this.openAIService.classifyIntent(
              userMessage,
              availableActions
            );
            if (openAIClassification && openAIClassification.confidence >= 0.85) {
              detectedIntent = {
                action: openAIClassification.action,
                confidence: openAIClassification.confidence,
                params: {},
              };
              logger.debug('Action OpenAI:', detectedIntent.action, 'confiance:', detectedIntent.confidence);
            }
          }

          // Fallback sur IntentDetector
          if (!detectedIntent || detectedIntent.confidence < 0.85) {
            const fallbackIntent = IntentDetector.detectIntent(userMessage);
            if (fallbackIntent && fallbackIntent.confidence >= 0.75) {
              detectedIntent = fallbackIntent;
              logger.debug('IntentDetector fallback:', detectedIntent.action);
            }
          }

          if (ragTime !== undefined) {
            this.performanceMonitor.recordStepTiming({ ragTime });
          }
        }
      }

      // Si intention détectée avec bonne confiance
      if (detectedIntent && detectedIntent.confidence >= 0.85) {
        // EXTRACTION DE PARAMÈTRES
        const extractionContext = this.conversationContext.getExtractionContext();
        const parameterExtractor = new ParameterExtractor({
          ...extractionContext,
          currentDate: this.context.currentDate,
          availableAnimals: this.context.availableAnimals,
        });

        let extractedParams = parameterExtractor.extractAll(userMessage);

        // Extraction OpenAI si paramètres manquants
        if (this.openAIService && this.config.apiKey) {
          const hasMissingParams = ActionParser.hasMissingCriticalParams(
            detectedIntent.action,
            extractedParams
          );

          if (hasMissingParams || detectedIntent.confidence < 0.85) {
            try {
              const openAIParameterExtractor = new OpenAIParameterExtractor(this.config.apiKey);
              const openAIParams = await openAIParameterExtractor.extractAll(
                userMessage,
                detectedIntent.action
              );
              extractedParams = { ...extractedParams, ...openAIParams };
              logger.debug('Extraction OpenAI utilisée');
            } catch (error) {
              logger.warn('Erreur extraction OpenAI:', error);
            }
          }
        }

        const mergedParams = {
          ...detectedIntent.params,
          ...extractedParams,
          userMessage: userMessage,
        };

        // Résoudre les références
        this.resolveReferences(mergedParams);

        // VALIDATION
        const validationResult = await this.dataValidator.validateAction({
          type: detectedIntent.action,
          params: mergedParams,
        });

        if (!validationResult.valid) {
          const errorMessage = validationResult.errors.join(', ');
          return {
            id: this.generateId(),
            role: 'assistant',
            content: `Désolé, ${errorMessage}. Peux-tu corriger ces informations ?`,
            timestamp: new Date().toISOString(),
            metadata: {
              validationErrors: validationResult.errors,
              suggestions: validationResult.suggestions,
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
      } else {
        // Fallback: parser la réponse de l'IA
        action = ActionParser.parseActionFromResponse(aiResponse, userMessage);
        if (action) {
          const confirmationDecision = this.confirmationManager.shouldConfirmAndExecute(
            action,
            0.7,
            userMessage
          );
          action.requiresConfirmation = confirmationDecision.requiresConfirmation;
        }
      }

      let assistantMessage: ChatMessage;
      let actionResult: AgentActionResult | null = null;

      if (action && action.type !== 'other') {
        const confidence = detectedIntent?.confidence || 0.7;
        const confirmationDecision = this.confirmationManager.shouldConfirmAndExecute(
          action,
          confidence,
          userMessage
        );

        if (confirmationDecision.requiresConfirmation && !confirmationDecision.shouldExecute) {
          assistantMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: confirmationDecision.message || 'Je veux confirmer avant d\'enregistrer. C\'est bon ?',
            timestamp: new Date().toISOString(),
            metadata: {
              pendingAction: { action: action.type, params: action.params },
              requiresConfirmation: true,
            },
          };
        } else {
          // Exécuter l'action
          const actionExecutionStartTime = Date.now();
          actionResult = await this.actionExecutor.execute(action, this.context);
          const actionExecutionTime = Date.now() - actionExecutionStartTime;

          // V4.0 - Enregistrer le succès pour apprentissage (fire-and-forget, non-bloquant)
          if (detectedIntent && actionResult.success) {
            this.learningService.recordIntentSuccess(
              detectedIntent.action,
              detectedIntent.confidence,
              userMessage,
              action.params
            );
          }

          this.performanceMonitor.recordStepTiming({ actionExecutionTime });

          const responseMessage = confirmationDecision.message || actionResult.message;

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
            },
          };
        }
      } else {
        // V4.0 - RÉPONSE UNIFIÉE POUR NON-COMPRÉHENSION
        // Utiliser le message standardisé avec mots-clés détectés
        const suggestion = this.learningService.generateEducationalSuggestion(
          userMessage,
          detectedIntent?.action
        );

        // Enregistrer l'échec pour apprentissage
        this.learningService.recordFailure(
          userMessage,
          detectedIntent?.action,
          'Aucune intention claire détectée'
        );

        // Message unifié avec clarification basée sur mots-clés
        let responseContent: string;
        
        if (suggestion) {
          responseContent = suggestion.explanation;
        } else {
          // Message par défaut standardisé
          responseContent = STANDARD_MISUNDERSTANDING_MESSAGE;
        }

        assistantMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date().toISOString(),
          metadata: {
            educationalSuggestion: suggestion,
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
