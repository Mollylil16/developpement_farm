/**
 * Service principal pour l'agent conversationnel
 * V4.1 - Sans appels directs à Gemini (tout passe par le backend)
 * 
 * @deprecated Ce service est utilisé uniquement pour les tests.
 * En production, utilisez le hook useChatAgent qui appelle le backend.
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

const logger = createLoggerWithPrefix('ChatAgentService');

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
      // Appel LLM (ChatAgentAPI) uniquement si nécessaire (fallback). On évite les appels inutiles.
      let aiResponse: string | null = null;
      let apiCallTime = 0;

      // Mettre à jour le contexte conversationnel
      this.conversationContext.updateFromMessage(userMsg);

      // V4.1 - Prétraitement NLP pour améliorer la compréhension
      const nlpResult = NaturalLanguageProcessor.process(userMessage);
      const processedMessage = nlpResult.processed; // Message nettoyé et corrigé
      logger.debug(`NLP: "${userMessage}" → "${processedMessage}", hints: ${nlpResult.intentHints.map(h => h.intent).join(', ')}`);

      // Vérifier s'il y a une clarification en cours et si ce message y répond
      const pendingClarification = this.conversationContext.getClarificationNeeded();
      const pendingAction = this.conversationContext.getPendingAction();
      const venteState = this.conversationContext.getVenteState();
      
      let isClarificationResponse = false;
      if (pendingClarification && pendingAction) {
        // Extraire les paramètres manquants du message utilisateur
        const extractionContext = this.conversationContext.getExtractionContext();
        const parameterExtractor = new EnhancedParameterExtractor({
          ...extractionContext,
          currentDate: this.context.currentDate,
          availableAnimals: this.context.availableAnimals,
        });
        
        const extractedParams = parameterExtractor.extractAllEnhanced(processedMessage, pendingAction.action);
        
        // Gestion spéciale pour les ventes : détecter les loges et les IDs
        if (pendingAction.action === 'create_revenu' && pendingClarification.clarificationType) {
          // Si clarificationType = demande_loges, extraire les noms de loges
          if (pendingClarification.clarificationType === 'demande_loges') {
            // Extraire les noms de loges du message (ex: "Loge A", "Loge B et C", "A1, A2")
            const logesMatch = processedMessage.match(/(?:loge|bande|enclos)\s*([A-Z0-9]+(?:\s*et\s*[A-Z0-9]+)*)/gi);
            if (logesMatch) {
              const loges: string[] = [];
              logesMatch.forEach((match) => {
                const parts = match.replace(/loge|bande|enclos/gi, '').trim().split(/\s*et\s*|\s*,\s*/);
                loges.push(...parts.map((p) => p.trim()).filter((p) => p.length > 0));
              });
              if (loges.length > 0) {
                extractedParams.loges = loges;
                isClarificationResponse = true;
              }
            } else {
              // Essayer de détecter des codes de loges simples (A1, B2, etc.)
              const simpleLogesMatch = processedMessage.match(/\b([A-Z]\d+)\b/g);
              if (simpleLogesMatch) {
                extractedParams.loges = simpleLogesMatch;
                isClarificationResponse = true;
              }
            }
          }
          
          // Si clarificationType = selection_sujets, extraire les IDs sélectionnés
          if (pendingClarification.clarificationType === 'selection_sujets') {
            // Les IDs peuvent être dans le message (ex: "1024, 1027" ou "ID: 1024 et 1027")
            const idsMatch = processedMessage.match(/(?:id|code)[\s:]*(\d+)/gi);
            if (idsMatch) {
              const ids = idsMatch.map((m) => m.replace(/id|code/gi, '').replace(':', '').trim());
              extractedParams.animal_ids = ids;
              isClarificationResponse = true;
            } else {
              // Essayer de détecter des nombres qui pourraient être des IDs
              const numbersMatch = processedMessage.match(/\b(\d{4,})\b/g);
              if (numbersMatch && numbersMatch.length <= 10) {
                // Limiter à 10 IDs pour éviter les faux positifs
                extractedParams.animal_ids = numbersMatch;
                isClarificationResponse = true;
              }
            }
          }
        }
        
        // Vérifier si les paramètres manquants sont maintenant présents
        const hasMissingParams = pendingClarification.missingParams.every(
          (param) => extractedParams[param] !== undefined && extractedParams[param] !== null
        );
        
        if (hasMissingParams || isClarificationResponse) {
          isClarificationResponse = true;
          logger.debug('[ChatAgentService] Détection réponse à clarification:', {
            action: pendingAction.action,
            missingParams: pendingClarification.missingParams,
            extractedParams,
            clarificationType: pendingClarification.clarificationType,
          });
        }
      }

      // V4.0 - Chercher un apprentissage similaire d'abord
      const similarLearning = await this.learningService.findSimilarLearning(processedMessage);
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
        // V4.1 - Utiliser les indices NLP si haute confiance
        if (nlpResult.intentHints.length > 0 && nlpResult.intentHints[0].confidence >= 0.85) {
          const topHint = nlpResult.intentHints[0];
          detectedIntent = {
            action: topHint.intent as AgentActionType,
            confidence: topHint.confidence,
            params: {},
          };
          logger.debug(`NLP hint utilisé: ${topHint.intent}, confiance: ${topHint.confidence}`);
        }
        
        // FAST PATH : Détection rapide pour les cas courants (sur message traité)
        const fastPathStartTime = Date.now();
        const fastPathResult = FastPathDetector.detectFastPath(processedMessage);
        fastPathTime = Date.now() - fastPathStartTime;

        if (fastPathResult.intent && fastPathResult.confidence >= 0.95) {
          detectedIntent = fastPathResult.intent;
          logger.debug(`Fast path activé: ${detectedIntent.action}, confiance: ${fastPathResult.confidence}`);
          this.performanceMonitor.recordStepTiming({ fastPathTime });
        } else {
          // DÉTECTION D'INTENTION : Utiliser RAG (intent) sur le message traité
          const ragStartTime = Date.now();
          detectedIntent = await this.intentRAG.detectIntent(processedMessage);
          ragTime = Date.now() - ragStartTime;

          // Fallback sur IntentDetector (sans Gemini - tout passe par le backend)
          if (!detectedIntent || detectedIntent.confidence < 0.85) {
            const fallbackIntent = IntentDetector.detectIntent(processedMessage);
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
      } else {
        // Fallback: appel LLM puis parser une action depuis la réponse
        const systemPrompt = buildOptimizedSystemPrompt(this.context);
        const messagesForAPI = [
          { role: 'system' as const, content: systemPrompt },
          ...this.conversationHistory.slice(-10).map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        ];

        const apiCallStartTime = Date.now();
        aiResponse = await this.api.sendMessage(messagesForAPI);
        apiCallTime = Date.now() - apiCallStartTime;

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

      // IMPORTANT: we must execute "other" too (identity questions, small talk, etc.)
      // Previously, "other" fell into the misunderstanding fallback, causing Kouakou to "forget" his name.
      if (action) {
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
          // RAG enrichissement (optionnel, non bloquant) : récupérer contexte depuis la base de connaissances
          // pour enrichir la réponse mais NE PAS bloquer l'exécution si rien n'est trouvé
          const isMutatingAction =
            action.type.startsWith('create_') ||
            action.type.startsWith('update_') ||
            action.type.startsWith('delete_') ||
            action.type === 'creer_loge' ||
            action.type === 'deplacer_animaux';

          if (isMutatingAction) {
            try {
              const ragQuery = `${action.type} ${userMessage}`;
              const ragResults = await KnowledgeBaseAPI.search(ragQuery, {
                projetId: this.context.projetId,
                limit: 3,
              });

              // Ajouter les preuves RAG à l'action pour audit/UX (si trouvé)
              if (ragResults && ragResults.length > 0) {
                (action.params as any).__ragEvidence = {
                  query: ragQuery,
                  top: ragResults[0],
                };
              }
              // NE PLUS BLOQUER si pas de résultat RAG - exécuter directement l'action
            } catch (ragError) {
              // Ignorer les erreurs RAG - ne pas bloquer l'action principale
              logger.warn('Erreur RAG (ignorée):', ragError);
            }
          }

          // Exécuter l'action
          const actionExecutionStartTime = Date.now();
          actionResult = await this.actionExecutor.execute(action, this.context);
          const actionExecutionTime = Date.now() - actionExecutionStartTime;

          // Gérer les clarifications nécessaires
          if (actionResult.needsClarification) {
            // Enregistrer la clarification dans le contexte
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
              },
            };
            
            // Enregistrer l'action en attente dans le contexte pour la prochaine réponse
            this.conversationContext.setPendingAction(actionResult.actionType || action.type, action.params);
          } else {
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
            
            // Si succès après clarification, nettoyer le contexte de clarification
            if (isClarificationResponse) {
              this.conversationContext.clearClarificationNeeded();
              this.conversationContext.clearPendingAction();
              this.conversationContext.clearVenteState();
              logger.debug('[ChatAgentService] Clarification résolue avec succès');
            }
          }
        }
      } else {
        // V4.1 - AMÉLIORATION: Chercher dans la base de connaissances avant de déclarer incompréhension
        let responseContent: string | null = null;
        let knowledgeResult = null;
        
        // Essayer de répondre via la base de connaissances
        try {
          const knowledgeResults = await KnowledgeBaseAPI.search(userMessage, {
            projetId: this.context.projetId,
            limit: 1,
          });
          
          if (knowledgeResults && knowledgeResults.length > 0) {
            const bestMatch = knowledgeResults[0];
            // Si pertinence suffisante, utiliser la base de connaissances
            if (bestMatch.relevance_score >= 3) {
              const intros = [
                "📚 Voici ce que je sais sur ce sujet:",
                "💡 Bonne question! Voici ma réponse:",
                "🎓 Je peux t'expliquer ça:",
              ];
              const intro = intros[Math.floor(Math.random() * intros.length)];
              responseContent = `${intro}\n\n**${bestMatch.title}**\n\n${bestMatch.summary || bestMatch.content}`;
              knowledgeResult = bestMatch;
            }
          }
        } catch {
          // Ignorer les erreurs de recherche
        }
        
        // Si pas de résultat de la base de connaissances, utiliser le fallback
        if (!responseContent) {
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
          if (suggestion) {
            responseContent = suggestion.explanation;
          } else {
            // Message par défaut amélioré avec suggestions
            responseContent = `${STANDARD_MISUNDERSTANDING_MESSAGE}\n\n💡 Tu peux me demander:\n• Des statistiques sur ton élevage\n• D'enregistrer une vente ou dépense\n• Des conseils sur l'élevage porcin\n• D'expliquer un terme (ex: "c'est quoi un naisseur?")`;
          }
        }

        assistantMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date().toISOString(),
          metadata: {
            knowledgeResult: knowledgeResult,
            misunderstanding: !knowledgeResult,
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
