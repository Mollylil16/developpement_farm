/**
 * Service principal pour l'agent conversationnel
 * Gère les interactions avec l'IA et l'exécution des actions
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
  type ExtractedParams,
  ConversationContextManager,
  DataValidator,
  OpenAIIntentService,
  OpenAIParameterExtractor,
} from './core';
import { MontantExtractor } from './core/extractors/MontantExtractor';
import { CategoryNormalizer } from './core/extractors/CategoryNormalizer';
import { FastPathDetector } from './core/FastPathDetector';
import { ConfirmationManager } from './core/ConfirmationManager';
import { LearningService } from './core/LearningService';
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

  // Nouveaux composants pour un agent conversationnel professionnel
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

    // Initialiser les composants core avec OpenAI si disponible
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

    // Charger l'historique dans le contexte conversationnel si disponible
    if (this.conversationHistory.length > 0) {
      for (const msg of this.conversationHistory) {
        this.conversationContext.updateFromMessage(msg);
      }
    }
  }

  /**
   * Envoie un message à l'agent et reçoit une réponse
   * Retourne la réponse de l'assistant (le message utilisateur est géré par le hook)
   */
  async sendMessage(userMessage: string): Promise<ChatMessage> {
    if (!this.context) {
      throw new Error("Le contexte de l'agent n'est pas initialisé");
    }

    const startTime = Date.now(); // Pour monitoring

    // Ajouter le message de l'utilisateur à l'historique interne
    const userMsg: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    this.conversationHistory.push(userMsg);

    try {
      // Préparer le contexte pour l'IA (utiliser le prompt optimisé)
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

      // FAST PATH : Détection rapide pour les cas courants (bypass RAG/OpenAI si confiance > 0.95)
      const fastPathResult = FastPathDetector.detectFastPath(userMessage);
      let action: AgentAction | null = null;
      let detectedIntent: DetectedIntent | null = null;

      if (fastPathResult.intent && fastPathResult.confidence >= 0.95) {
        // Utiliser le fast path si confiance élevée
        detectedIntent = fastPathResult.intent;
        logger.debug(
          `Fast path activé: ${detectedIntent.action}, confiance: ${fastPathResult.confidence}`
        );
        this.performanceMonitor.recordStepTiming({ fastPathTime });
      } else {
        // DÉTECTION D'INTENTION : Utiliser RAG en priorité (plus précis)
        const ragStartTime = Date.now();
        detectedIntent = await this.intentRAG.detectIntent(userMessage);
        ragTime = Date.now() - ragStartTime;

        // Si RAG ne trouve rien ou confiance faible, essayer OpenAI classification directe (priorité pour 100%)
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
            logger.debug(
              'Action détectée depuis OpenAI classification:',
              detectedIntent.action,
              'confiance:',
              detectedIntent.confidence
            );
          }
        }

        // Fallback sur IntentDetector si RAG et OpenAI ne trouvent rien (dernier recours)
        if (!detectedIntent || detectedIntent.confidence < 0.85) {
          const fallbackIntent = IntentDetector.detectIntent(userMessage);
          if (fallbackIntent && fallbackIntent.confidence >= 0.75) {
            detectedIntent = fallbackIntent;
            logger.debug(
              'Action détectée depuis IntentDetector (fallback):',
              detectedIntent.action
            );
          }
        } else {
          const method = this.intentRAG.isUsingOpenAI() ? 'RAG (OpenAI embeddings)' : 'RAG (Jaccard)';
          logger.debug(
            `Action détectée depuis ${method}:`,
            detectedIntent.action,
            'confiance:',
            detectedIntent.confidence
          );
        }
        
        // Enregistrer temps RAG dans PerformanceMonitor
        if (ragTime !== undefined) {
          this.performanceMonitor.recordStepTiming({ ragTime });
        }
      }

      if (detectedIntent && detectedIntent.confidence >= 0.85) {
        // EXTRACTION DE PARAMÈTRES ROBUSTE - Système hybride pour 100% de précision
        const extractionContext = this.conversationContext.getExtractionContext();
        const parameterExtractor = new ParameterExtractor({
          ...extractionContext,
          currentDate: this.context.currentDate,
          availableAnimals: this.context.availableAnimals,
        });

        // Extraction classique (rapide et fiable pour cas standards)
        let extractedParams = parameterExtractor.extractAll(userMessage);

        // Si OpenAI disponible ET paramètres manquants ou confiance < 0.85 → extraction OpenAI
        if (this.openAIService && this.config.apiKey) {
          const hasMissingParams = ActionParser.hasMissingCriticalParams(
            detectedIntent.action,
            extractedParams
          );
          const needsOpenAIExtraction = hasMissingParams || detectedIntent.confidence < 0.85;

          if (needsOpenAIExtraction) {
            try {
              const openAIParameterExtractor = new OpenAIParameterExtractor(this.config.apiKey);
              const openAIParams = await openAIParameterExtractor.extractAll(
                userMessage,
                detectedIntent.action
              );

              // Fusionner : OpenAI en priorité (plus précis), classique en complément
              extractedParams = {
                ...extractedParams, // Base classique
                ...openAIParams, // OpenAI écrase/ajoute (plus précis)
              };

              logger.debug('Extraction OpenAI utilisée pour précision maximale');
            } catch (error) {
              logger.warn(
                'Erreur extraction OpenAI, utilisation extraction classique:',
                error
              );
              // Continuer avec extraction classique
            }
          }
        }

        // Enregistrer temps extraction dans PerformanceMonitor
        this.performanceMonitor.recordStepTiming({ extractionTime });

        // Fusionner avec les paramètres détectés par l'intention
        const mergedParams = {
          ...detectedIntent.params,
          ...extractedParams,
          userMessage: userMessage, // Pour extraction de montant en fallback
        };

        // Résoudre les références ("le même", "celui-là", etc.)
        this.resolveReferences(mergedParams);

        // VALIDATION avant exécution
        const validationResult = await this.dataValidator.validateAction({
          type: detectedIntent.action,
          params: mergedParams,
        });

        if (!validationResult.valid) {
          // Erreurs de validation → demander clarification
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

        // Avertissements (mais on continue)
        if (validationResult.warnings.length > 0) {
          logger.warn(
            'Avertissements de validation:',
            validationResult.warnings
          );
        }

        // Déterminer si confirmation nécessaire avec seuils adaptatifs
        const confirmationDecision = this.confirmationManager.shouldConfirmAndExecute(
          {
            type: detectedIntent.action,
            params: mergedParams,
          },
          detectedIntent.confidence,
          userMessage
        );

        action = {
          type: detectedIntent.action,
          params: mergedParams,
          requiresConfirmation: confirmationDecision.requiresConfirmation,
        };
        } else {
          // Fallback : parser la réponse de l'IA
          action = ActionParser.parseActionFromResponse(aiResponse, userMessage);
        if (action) {
          // Vérifier si confirmation nécessaire (confiance par défaut 0.7 pour fallback)
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
        // Déterminer la décision de confirmation avec le nouveau système
        const confidence = detectedIntent?.confidence || 0.7;
        const confirmationDecision = this.confirmationManager.shouldConfirmAndExecute(
          action,
          confidence,
          userMessage
        );

        if (confirmationDecision.requiresConfirmation && !confirmationDecision.shouldExecute) {
          // Demander confirmation avant d'exécuter
          assistantMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: confirmationDecision.message || 'Je veux juste confirmer avant d\'enregistrer. C\'est bon pour toi ?',
            timestamp: new Date().toISOString(),
            metadata: {
              pendingAction: {
                action: action.type,
                params: action.params,
              },
              requiresConfirmation: true,
            },
          };
        } else {
          // MODE AUTONOME : Exécuter l'action directement
          const actionExecutionStartTime = Date.now();
          actionResult = await this.actionExecutor.execute(action, this.context);
          const actionExecutionTime = Date.now() - actionExecutionStartTime;

          // Enregistrer succès d'intention dans LearningService analytics (V3.0)
          if (detectedIntent && actionResult.success) {
            this.learningService.recordIntentSuccess(detectedIntent.action, detectedIntent.confidence);
          }

          // Enregistrer temps d'exécution dans PerformanceMonitor (V3.0)
          this.performanceMonitor.recordStepTiming({ actionExecutionTime });

          // Utiliser le message du ConfirmationManager si disponible, sinon le message du résultat
          const responseMessage = confirmationDecision.message || actionResult.message;

          // Créer le message de réponse avec le résultat de l'action
          assistantMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: responseMessage,
            timestamp: new Date().toISOString(),
            metadata: {
              actionExecuted: action.type,
              actionResult: actionResult.data,
              requiresConfirmation: false,
              pendingAction: {
                action: action.type,
                params: action.params,
              },
            },
          };
        }
      } else {
        // Réponse simple sans action - Enregistrer comme échec de compréhension si pas d'intention détectée
        if (!detectedIntent || !action) {
          this.learningService.recordFailure(userMessage, undefined, 'Aucune intention détectée');
          const suggestion = this.learningService.generateEducationalSuggestion(userMessage);
          
          assistantMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: suggestion ? suggestion.explanation : aiResponse,
            timestamp: new Date().toISOString(),
            metadata: {
              educationalSuggestion: suggestion,
            },
          };
        } else {
          assistantMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date().toISOString(),
          };
        }
      }

      this.conversationHistory.push(assistantMessage);

      // Enregistrer dans le monitoring (V3.0 - métriques détaillées)
      const responseTime = Date.now() - startTime;
      this.performanceMonitor.recordInteraction(userMsg, assistantMessage, responseTime);
      this.performanceMonitor.recordStepTiming({ apiCallTime });

      return assistantMessage;
    } catch (error: unknown) {
      logger.error("Erreur lors de l'envoi du message:", error);

      // Enregistrer l'échec pour apprentissage
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      this.learningService.recordFailure(userMessage, undefined, errorMsg);

      // Générer une suggestion éducative
      const suggestion = this.learningService.generateEducationalSuggestion(userMessage);

      // Message d'erreur avec suggestion éducative
      let errorContent = suggestion
        ? suggestion.explanation
        : "Désolé, j'ai rencontré une erreur. Pouvez-vous reformuler votre demande ?";

      if (error instanceof Error && error.message) {
        // Si l'erreur vient de l'exécution d'une action, utiliser le message d'erreur
        if (error.message.includes('montant') || error.message.includes('Montant')) {
          errorContent = suggestion
            ? suggestion.explanation
            : `Désolé, ${error.message}. Peux-tu me donner le montant exact de la dépense ? Par exemple : "J'ai dépensé 5000 FCFA pour l'alimentation".`;
        } else if (error.message.includes('Contexte non initialisé')) {
          errorContent = 'Désolé, je ne suis pas encore prêt. Réessaie dans quelques instants.';
        } else if (!suggestion) {
          errorContent = `Désolé, ${error.message}. Peux-tu reformuler ta demande avec plus de détails ?`;
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
   * Confirme et exécute une action qui nécessite confirmation
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

    // L'action devrait déjà être exécutée, on confirme juste
    return {
      id: this.generateId(),
      role: 'assistant',
      content: "Parfait, l'action a été confirmée et exécutée.",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Résout les références dans les paramètres ("le même", "celui-là", etc.)
   * V3.0 - Simplifié, utilise ConversationContext
   */
  private resolveReferences(params: Record<string, unknown>): void {
    // Résoudre "le même acheteur"
    if (params.acheteur && typeof params.acheteur === 'string') {
      const resolved = this.conversationContext.resolveReference(params.acheteur, 'acheteur');
      if (resolved) {
        params.acheteur = resolved;
      }
    }

    // Résoudre "le même animal"
    if (params.animal_code && typeof params.animal_code === 'string') {
      const resolved = this.conversationContext.resolveReference(params.animal_code, 'animal');
      if (resolved) {
        params.animal_code = resolved;
      }
    }
  }

TON ET LANGUE:
- Professionnel mais chaleureux et accessible
- Tutoiement respectueux : "Comment allez-vous ?", "Bien reçu", "Parfait"
- Comprends et utilises parfois des expressions locales naturelles :
  * "les porcs-là", "la provende-là", "ça va aller", "on se comprend"
  * "d'accord", "bien reçu", "compris"
- Ton encourageant mais professionnel : "Excellent travail", "Bien noté", "Très bien"
- Unité monétaire : TOUJOURS FCFA ou F CFA (JAMAIS € ou $)
- Poids en kg, alimentation en sacs (ex: "10 sacs de 50 kg")

ACTIONS DISPONIBLES (TRÈS IMPORTANT - EXÉCUTE DIRECTEMENT) :

1. REQUÊTES D'INFORMATION (exécute immédiatement sans confirmation) :
   
   STATISTIQUES - Variantes acceptées :
   - "statistiques", "statistique", "bilan", "bilans"
   - "combien de porc actif", "nombre de porc", "nombre porcs", "combien porcs"
   - "porc actif", "porcs actifs", "actif", "actifs"
   - "cheptel", "élevage", "mes animaux", "mes porcs"
   - "état du cheptel", "situation du cheptel", "mon cheptel"
   - "données", "chiffres", "total", "compte", "résumé"
     → Action: {"action": "get_statistics", "params": {}}
   
   STOCKS - Variantes acceptées :
   - "stock", "stocks", "stock actuel", "stocks actuels"
   - "nourriture", "aliment", "aliments", "alimentation"
   - "provende", "provendes", "ration", "rations"
   - "quantité", "quantités", "reste", "restes"
   - "état des stocks", "statut des stocks", "niveau de stock"
   - "combien de nourriture", "combien d'aliment", "il reste"
     → Action: {"action": "get_stock_status", "params": {}}
   
   COÛTS - Variantes acceptées :
   - "coût", "coûts", "coût total", "coûts totaux"
   - "dépense totale", "dépenses totales", "mes dépenses"
   - "calculer", "calcul", "calcule", "budget"
   - "combien j'ai dépensé", "j'ai dépensé combien"
     → Action: {"action": "calculate_costs", "params": {}}
   
   RAPPELS - Variantes acceptées :
   - "rappels", "rappel", "à faire", "tâches", "tâche"
   - "programme", "programmes", "planifié", "planifiée"
   - "vaccination à venir", "traitement à venir", "visite prévue"
   - "prochaine", "prochaines", "calendrier", "agenda"
     → Action: {"action": "get_reminders", "params": {}}
   
   ANALYSE - Variantes acceptées :
   - "analyse", "analyses", "analyser", "analyser mes données"
   - "situation", "situations", "état", "états"
   - "évaluation", "diagnostic", "performance", "résultats"
   - "évolution", "tendance", "comment va", "mon exploitation"
     → Action: {"action": "analyze_data", "params": {}}
   
   RECHERCHE - Variantes acceptées :
   - "chercher un animal", "trouver un porc", "recherche"
   - "où est", "localiser", "montre moi", "affiche"
     → Action: {"action": "search_animal", "params": {"search": "terme de recherche"}}

2. ENREGISTREMENTS (demande confirmation avant) :
   
   VENTE - Exemples de requêtes :
   - "J'ai vendu 5 porcs à 800 000 FCFA"
   - "Vente de 3 porcs pour 500 000"
   - "J'ai vendu 2 porcs de 50kg aujourd'hui à 300000"
   → Action: {"action": "create_revenu", "params": {"montant": 800000, "nombre": 5, "acheteur": "...", "categorie": "vente_porc"}}
   - IMPORTANT: Le montant est TOUJOURS le nombre le plus grand dans la phrase (après "à", "pour", "montant", "prix")
   - Paramètres requis : montant (obligatoire), nombre (optionnel), acheteur (optionnel), poids_kg (optionnel)
   
   DÉPENSE - Exemples de requêtes :
   - "J'ai acheté 20 sacs de provende à 18 000 FCFA"
   - "Dépense de 50 000 FCFA pour médicaments"
   - "J'ai dépensé 15000 en médicament aujourd'hui"
   → Action: {"action": "create_depense", "params": {"montant": 50000, "categorie": "medicaments", "date": "2025-01-15"}}
   - IMPORTANT: Le montant est TOUJOURS le nombre le plus grand dans la phrase (après "de", "pour", "à", "montant", "prix", "coût")
   - Paramètres requis : montant (obligatoire), categorie (optionnel: "alimentation", "medicaments", "veterinaire", "entretien", "autre")
   
   CHARGE FIXE - Exemples de requêtes :
   - "Charge fixe de 100 000 FCFA mensuelle pour salaires"
   - "Abonnement eau 15 000 FCFA par mois"
   → Action: {"action": "create_charge_fixe", "params": {"montant": 100000, "libelle": "Salaires", "frequence": "mensuel", "categorie": "salaires"}}
   - Paramètres requis : montant (obligatoire), libelle (obligatoire), frequence ("mensuel", "trimestriel", "annuel")
   
   PESÉE - Exemples de requêtes :
   - "Peser le porc P001, il fait 45 kg"
   - "Ajouter une pesée de 50 kg pour l'animal P002"
   → Action: {"action": "create_pesee", "params": {"animal_code": "P001", "poids_kg": 45, "date": "2025-01-15"}}
   - Paramètres requis : animal_code OU animal_id (obligatoire), poids_kg (obligatoire)
   
   INGRÉDIENT - Exemples de requêtes :
   - "Créer un ingrédient maïs à 500 FCFA/kg"
   - "Ajouter ingrédient soja 800 FCFA par kg"
   → Action: {"action": "create_ingredient", "params": {"nom": "maïs", "prix_unitaire": 500, "unite": "kg"}}
   - Paramètres requis : nom (obligatoire), prix_unitaire (obligatoire), unite ("kg", "g", "sac", "tonne")
   
   AUTRES ENREGISTREMENTS :
   - Vaccination : {"action": "create_vaccination", "params": {...}}
   - Visite vétérinaire : {"action": "create_visite_veterinaire", "params": {...}}
   - Traitement : {"action": "create_traitement", "params": {...}}
   - Maladie : {"action": "create_maladie", "params": {...}}
   - Rappel personnalisé : {"action": "create_planification", "params": {"titre": "...", "date_prevue": "...", "type": "veterinaire|autre"}}
     → Utilise cette action quand l'utilisateur demande un rappel (ex: "rappelle-moi d'appeler le vétérinaire demain")
     → IMPORTANT: Ne confonds PAS avec "create_visite_veterinaire". Un rappel est une tâche dans le planning, pas une visite enregistrée.

RÈGLES CRITIQUES - AUTONOMIE MAXIMALE :

1. AUTONOMIE TOTALE - AGIS DIRECTEMENT :
   - Tu as un accès TOTAL à l'application : tu peux lire, créer, modifier TOUTES les données
   - Dès que l'intention de l'utilisateur est claire → EXÉCUTE IMMÉDIATEMENT sans demander confirmation
   - Exemple : "J'ai vendu 8 porcs à Traoré à 1 200 000 FCFA" → Enregistre DIRECTEMENT et réponds : "C'est noté patron ! 8 porcs vendus à Traoré pour 1 200 000 FCFA le [date]. Tu veux que je te génère la facture tout de suite ?"

2. CONFIRMATION UNIQUEMENT POUR CAS CRITIQUES :
   - Demande confirmation UNIQUEMENT pour :
     • Suppression de données (delete, supprimer, effacer)
     • Montants très élevés ou ambigus (> 5 000 000 FCFA)
     • Décisions sanitaires graves (abattage, quarantaine totale, euthanasie)
   - Pour TOUT LE RESTE → Agis directement et confirme après : "C'est déjà enregistré mon frère !"

3. ACTIONS AUTONOMES (exécute sans hésiter) :
   - Enregistrer une vente complète (acheteur, nombre, poids, prix, date) → EXÉCUTE DIRECTEMENT
   - Enregistrer une dépense (provende, médicaments, main-d'œuvre) → EXÉCUTE DIRECTEMENT
   - Créer un rendez-vous vétérinaire → EXÉCUTE DIRECTEMENT
   - Programmer un rappel automatique (vaccin, vermifugation, sevrage) → EXÉCUTE DIRECTEMENT
   - Calculer et afficher : bénéfice du mois, coût par porc, jours de nourriture restants → EXÉCUTE DIRECTEMENT
   - Analyser les tendances et alerter proactivement → EXÉCUTE DIRECTEMENT
   - Proposer des optimisations → EXÉCUTE DIRECTEMENT

4. POUR LES REQUÊTES D'INFORMATION :
   - Si l'utilisateur demande des statistiques, stocks, coûts, rappels, analyse → EXÉCUTE IMMÉDIATEMENT
   - Ne demande PAS de détails supplémentaires, exécute l'action directement
   - Réponds avec le JSON d'action immédiatement

5. POUR LES ENREGISTREMENTS (ventes, dépenses, pesées, etc.) :
   - Si les paramètres sont clairs → EXÉCUTE DIRECTEMENT sans demander confirmation
   - Si un paramètre manque mais peut être déduit → DÉDUIS-LE et EXÉCUTE
   - Si vraiment ambigu ou montant > 5 millions → Alors demande confirmation
   - Après exécution, confirme : "C'est noté patron ! [détails]. C'est déjà enregistré."

3. EXEMPLES DE RÉPONSES CORRECTES :

Utilisateur : "Combien de porc actif ai je dans mon cheptel aujourd'hui"
→ Réponse IMMÉDIATE : {"action": "get_statistics", "params": {}}\n\nJe prépare tes statistiques du cheptel...

Utilisateur : "Statistiques de porc actif"
→ Réponse IMMÉDIATE : {"action": "get_statistics", "params": {}}\n\nAnalyse en cours...

Utilisateur : "Quel est le stock actuel"
→ Réponse IMMÉDIATE : {"action": "get_stock_status", "params": {}}\n\nVérification des stocks en cours...

Utilisateur : "J'ai vendu 5 porcs à 800 000"
→ Réponse : "Bien reçu. J'enregistre la vente de 5 porcs pour 800 000 FCFA. C'est confirmé ?"
→ Après confirmation : {"action": "create_revenu", "params": {"montant": 800000, "categorie": "vente_porc", ...}}

4. SI INFORMATION MANQUANTE :
   - Pour les enregistrements : "Il me manque [info]. Pouvez-vous me donner [détail] ?"
   - Pour les requêtes d'info : N'arrive JAMAIS, exécute toujours directement

5. RÉPONSES :
   - Courtes et directes (2-3 lignes max)
   - Professionnelles mais chaleureuses
   - Pas de répétition de "Peux-tu me donner plus de détails" pour les requêtes d'information

FORMAT DE RÉPONSE:
- Pour TOUTES les actions, utilise le format JSON: {"action": "nom_action", "params": {...}}
- Pour les requêtes d'information, envoie le JSON immédiatement suivi d'un message court
- Pour les enregistrements, demande confirmation d'abord, puis envoie le JSON après confirmation
- IMPORTANT: Pour les dépenses/revenus, tu DOIS inclure le montant dans params.montant (formats: nombre, "5 000", "5000 FCFA")`;
  }

  /**
   * Réinitialise l'historique de conversation
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Récupère l'historique de conversation
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Restaure l'historique depuis la base de données
   */
  restoreHistory(messages: ChatMessage[]): void {
    this.conversationHistory = [...messages];

    // Restaurer le contexte conversationnel
    this.conversationContext.reset();
    for (const msg of messages) {
      this.conversationContext.updateFromMessage(msg);
    }
  }

  /**
   * Résout les références dans les paramètres ("le même", "celui-là", etc.)
   * V3.0 - Simplifié, utilise ConversationContext
   */
  private resolveReferences(params: Record<string, unknown>): void {
    // Résoudre "le même acheteur"
    if (params.acheteur && typeof params.acheteur === 'string') {
      const resolved = this.conversationContext.resolveReference(params.acheteur, 'acheteur');
      if (resolved) {
        params.acheteur = resolved;
      }
    }

    // Résoudre "le même animal"
    if (params.animal_code && typeof params.animal_code === 'string') {
      const resolved = this.conversationContext.resolveReference(params.animal_code, 'animal');
      if (resolved) {
        params.animal_code = resolved;
      }
    }
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
