/**
 * Service principal pour l'agent conversationnel
 * Gère les interactions avec l'IA et l'exécution des actions
 */

import { ChatMessage, AgentAction, AgentContext, AgentConfig, AgentActionResult, AgentActionType } from '../../types/chatAgent';
import { AgentActionExecutor } from './AgentActionExecutor';
import { ChatAgentAPI } from './ChatAgentAPI';
import { FULL_VETERINARY_PROMPT } from '../../config/aiPrompts';
import { IntentDetector } from './IntentDetector';
import { AdvancedReasoningService } from './AdvancedReasoningService';
import { ConversationHistoryService } from './ConversationHistoryService';

export class ChatAgentService {
  private actionExecutor: AgentActionExecutor;
  private api: ChatAgentAPI;
  private config: AgentConfig;
  private context: AgentContext | null = null;
  private conversationHistory: ChatMessage[] = [];
  private reasoningService: AdvancedReasoningService;
  private historyService: ConversationHistoryService;
  private proactiveCheckInterval: NodeJS.Timeout | null = null;

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
    this.reasoningService = new AdvancedReasoningService();
    this.historyService = new ConversationHistoryService();
  }

  /**
   * Initialise le contexte de l'agent
   */
  async initializeContext(context: AgentContext): Promise<void> {
    this.context = context;
    await this.actionExecutor.initialize(context);
    await this.reasoningService.initialize(context);
    await this.historyService.initialize(context.projetId);
    
    // Charger l'historique depuis AsyncStorage
    const savedHistory = await this.historyService.loadHistory();
    if (savedHistory.length > 0) {
      this.conversationHistory = savedHistory;
    }
    
    // Démarrer les vérifications proactives si activées
    if (this.config.enableProactiveAlerts) {
      this.startProactiveChecks();
    }
  }

  /**
   * Démarre les vérifications proactives périodiques
   */
  private startProactiveChecks(): void {
    // Vérifier toutes les 5 minutes
    this.proactiveCheckInterval = setInterval(async () => {
      await this.checkProactiveAlerts();
    }, 5 * 60 * 1000); // 5 minutes
    
    // Faire une première vérification immédiate
    this.checkProactiveAlerts();
  }

  /**
   * Arrête les vérifications proactives
   */
  private stopProactiveChecks(): void {
    if (this.proactiveCheckInterval) {
      clearInterval(this.proactiveCheckInterval);
      this.proactiveCheckInterval = null;
    }
  }

  /**
   * Vérifie les alertes proactives et génère des suggestions
   */
  private async checkProactiveAlerts(): Promise<void> {
    if (!this.context) {
      return;
    }

    try {
      const reasoning = await this.reasoningService.analyzeWithChainOfThought(
        '',
        this.conversationHistory
      );

      // Si des suggestions proactives existent, les ajouter à l'historique
      if (reasoning.proactiveSuggestions.length > 0) {
        const proactiveMessage: ChatMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: this.formatProactiveSuggestions(reasoning.proactiveSuggestions),
          timestamp: new Date().toISOString(),
          metadata: {
            isProactive: true,
          },
        };

        this.conversationHistory.push(proactiveMessage);
        await this.historyService.addMessage(proactiveMessage);
      }
    } catch (error) {
      console.error('[ChatAgentService] Erreur vérification proactive:', error);
    }
  }

  /**
   * Formate les suggestions proactives en message
   */
  private formatProactiveSuggestions(suggestions: string[]): string {
    if (suggestions.length === 0) {
      return '';
    }

    let message = '💡 **Suggestions proactives** :\n\n';
    suggestions.forEach((suggestion, index) => {
      message += `${index + 1}. ${suggestion}\n`;
    });

    return message;
  }

  /**
   * Envoie un message à l'agent et reçoit une réponse
   * Retourne la réponse de l'assistant (le message utilisateur est géré par le hook)
   */
  async sendMessage(userMessage: string): Promise<ChatMessage> {
    if (!this.context) {
      throw new Error('Le contexte de l\'agent n\'est pas initialisé');
    }

    // Ajouter le message de l'utilisateur à l'historique interne
    const userMsg: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    this.conversationHistory.push(userMsg);
    
    // Sauvegarder dans AsyncStorage
    await this.historyService.addMessage(userMsg);
    
    // Raisonnement avancé avec chain-of-thought
    let reasoning: any = null;
    try {
      reasoning = await this.reasoningService.analyzeWithChainOfThought(
        userMessage,
        this.conversationHistory
      );
      
      console.log('[ChatAgentService] Raisonnement avancé:', {
        intent: reasoning.userIntent,
        recommendations: reasoning.recommendations,
        proactiveSuggestions: reasoning.proactiveSuggestions,
      });
    } catch (reasoningError) {
      console.error('[ChatAgentService] Erreur raisonnement avancé:', reasoningError);
      // Continuer même si le raisonnement échoue
    }

    try {
      // Préparer le contexte pour l'IA
      const systemPrompt = this.buildSystemPrompt();
      const messagesForAPI = [
        { role: 'system' as const, content: systemPrompt },
        ...this.conversationHistory.slice(-10).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      // Appeler l'API de l'IA
      const aiResponse = await this.api.sendMessage(messagesForAPI);

      // Analyser la réponse pour détecter des actions
      // MODE AUTONOME : détection agressive et exécution directe
      let action: AgentAction | null = null;
      
      // Vérifier si c'est une réponse à une question précédente (contexte conversationnel)
      const contextualAction = this.detectContextualAction(userMessage);
      if (contextualAction) {
        action = contextualAction;
        console.log('[ChatAgentService] Action contextuelle détectée:', action.type);
      } else {
        const detectedIntent = IntentDetector.detectIntent(userMessage);
        if (detectedIntent && detectedIntent.confidence >= 0.7) {
          console.log('[ChatAgentService] Action détectée depuis IntentDetector:', detectedIntent.action, 'confiance:', detectedIntent.confidence);
          
          // Ajouter le message utilisateur aux params pour extraction de montant en fallback
          const paramsWithUserMessage = {
            ...detectedIntent.params,
            userMessage: userMessage, // Pour extraction de montant en fallback
          };
          
          // Déterminer si confirmation nécessaire (uniquement pour cas critiques)
          const requiresConfirmation = this.requiresConfirmation(detectedIntent.action, paramsWithUserMessage);
          
          action = {
            type: detectedIntent.action,
            params: paramsWithUserMessage,
            requiresConfirmation,
          };
        } else {
          // Fallback : parser la réponse de l'IA
          action = this.parseActionFromResponse(aiResponse, userMessage);
          if (action) {
            // Vérifier si confirmation nécessaire
            action.requiresConfirmation = this.requiresConfirmation(action.type, action.params);
          }
        }
      }

      let assistantMessage: ChatMessage;
      let actionResult: AgentActionResult | null = null;

      if (action && action.type !== 'other') {
        // Si confirmation requise (cas critiques uniquement), demander d'abord
        if (action.requiresConfirmation) {
          const contextId = this.generateContextId();
          assistantMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: this.buildConfirmationMessage(action, userMessage),
            timestamp: new Date().toISOString(),
            metadata: {
              pendingAction: action,
              requiresConfirmation: true,
              contextId: contextId,
              isClarificationQuestion: false,
            },
          };
        } else {
          // Vérifier si l'action nécessite des clarifications (infos manquantes)
          const missingInfo = this.checkMissingInfo(action);
          if (missingInfo.length > 0) {
            // Il manque des informations, poser une question de clarification
            const contextId = this.generateContextId();
            const clarificationQuestion = this.buildClarificationQuestion(action, missingInfo);
            
            assistantMessage = {
              id: this.generateId(),
              role: 'assistant',
              content: clarificationQuestion,
              timestamp: new Date().toISOString(),
              metadata: {
                pendingAction: action,
                requiresConfirmation: false,
                contextId: contextId,
                isClarificationQuestion: true,
              },
            };
          } else {
            // MODE AUTONOME : Exécuter l'action directement sans demander confirmation
            actionResult = await this.actionExecutor.execute(action, this.context);

            // Vérifier si c'était une réponse contextuelle pour personnaliser le message
            const isContextualResponse = contextualAction !== null;
            let responseMessage = actionResult.message;
            
            if (isContextualResponse && action.type === 'create_revenu') {
              // Personnaliser le message pour montrer qu'on se souvient du contexte
              responseMessage = this.buildContextualResponse(action, actionResult.message);
            }

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
              },
            };
          }
        }
      } else {
        // Réponse simple sans action
        assistantMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString(),
        };
      }

      this.conversationHistory.push(assistantMessage);
      
      // Sauvegarder dans AsyncStorage
      await this.historyService.addMessage(assistantMessage);
      
      // Ajouter les recommandations et suggestions proactives si disponibles
      if (reasoning && (reasoning.recommendations.length > 0 || reasoning.proactiveSuggestions.length > 0)) {
        const recommendationsMessage = this.buildRecommendationsMessage(reasoning);
        if (recommendationsMessage) {
          const recMsg: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: recommendationsMessage,
            timestamp: new Date().toISOString(),
            metadata: {
              isRecommendation: true,
            },
          };
          this.conversationHistory.push(recMsg);
          await this.historyService.addMessage(recMsg);
        }
      }
      
      return assistantMessage;
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      
      // Message d'erreur plus spécifique selon le type d'erreur
      let errorContent = 'Désolé, j\'ai rencontré une erreur. Pouvez-vous reformuler votre demande ?';
      
      if (error?.message) {
        // Si l'erreur vient de l'exécution d'une action, utiliser le message d'erreur
        if (error.message.includes('montant') || error.message.includes('Montant')) {
          errorContent = `Désolé, ${error.message}. Peux-tu me donner le montant exact de la dépense ? Par exemple : "J'ai dépensé 5000 FCFA pour l'alimentation".`;
        } else if (error.message.includes('Contexte non initialisé')) {
          errorContent = 'Désolé, je ne suis pas encore prêt. Réessaie dans quelques instants.';
        } else {
          errorContent = `Désolé, ${error.message}. Peux-tu reformuler ta demande avec plus de détails ?`;
        }
      }
      
      const errorMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString(),
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
        content: 'D\'accord, j\'annule cette action.',
        timestamp: new Date().toISOString(),
      };
    }

    // L'action devrait déjà être exécutée, on confirme juste
    return {
      id: this.generateId(),
      role: 'assistant',
      content: 'Parfait, l\'action a été confirmée et exécutée.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Construit le prompt système pour l'IA
   */
  private buildSystemPrompt(): string {
    if (!this.context) {
      return '';
    }

    return `Tu es Kouakou, un assistant professionnel et chaleureux pour éleveurs de porcs en Côte d'Ivoire.
Tu es compétent, efficace et tu comprends le langage terre-à-terre ivoirien tout en restant professionnel.

CONTEXTE:
- Projet: ${this.context.projetId}
- Date actuelle: ${this.context.currentDate}
- Utilisateur: ${this.context.userName || 'Éleveur'}

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
   - "J'ai vendu 8 porcs à Koné"
   → Action: {"action": "create_revenu", "params": {"montant": 800000, "nombre": 5, "acheteur": "...", "poids_kg": 425, "categorie": "vente_porc"}}
   - IMPORTANT: Le montant est TOUJOURS le nombre le plus grand dans la phrase (après "à", "pour", "montant", "prix")
   - Paramètres requis : nombre (obligatoire), poids_kg ou poids_moyen (obligatoire pour ventes), montant (optionnel mais préféré), acheteur (optionnel)
   - Si nombre ou poids manquant → Demander spécifiquement : "Combien de porcs exactement ?" ou "C'est quel poids moyen ou total ?"
   - Après enregistrement : Marquer automatiquement les animaux comme "vendu" et retirer de l'inventaire actif
   
   MORTALITÉ - Exemples de requêtes :
   - "Un porc est mort ce matin"
   - "J'ai eu 2 morts aujourd'hui"
   - "Un porc est crevé"
   → Action: {"action": "create_mortalite", "params": {"nombre_porcs": 1, "cause": "...", "categorie": "autre"}}
   - Paramètres requis : nombre_porcs (obligatoire), cause (optionnel mais recommandé), categorie (optionnel: "truie", "verrat", "porcelet", "autre")
   - Si nombre manquant → Demander : "Combien de porcs exactement sont morts ?"
   - Si cause manquante → Proposer : "Tu veux que je note la cause ?"
   - Après enregistrement : Marquer automatiquement les animaux comme "mort" et retirer de l'inventaire actif
   
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

6. POUR LES QUESTIONS - UNIQUEMENT SI L'INTENTION N'EST PAS CLAIRE :
   - IMPORTANT: Pose des questions UNIQUEMENT si l'intention n'est pas claire (confiance < 0.75) ou si des paramètres critiques manquent
   - Si l'intention est claire (confiance >= 0.75) → EXÉCUTE DIRECTEMENT sans poser de questions
   - Si l'intention n'est pas claire :
     * NE JAMAIS poser de questions génériques comme "Comment puis-je vous aider ?"
     * Analyser le message pour détecter des indices (mots-clés, nombres, dates, domaines)
     * Poser des questions SPÉCIFIQUES basées sur ce qui a été détecté :
       - Si des nombres + mots financiers → "Tu veux enregistrer une dépense ou une vente ? Peux-tu me donner plus de détails ?"
       - Si mention d'animaux → "Tu veux voir les statistiques de ton cheptel ou faire une action sur un animal ?"
       - Si mention de santé → "Tu veux enregistrer une vaccination, un traitement, ou une maladie ?"
       - Si mention de stocks → "Tu veux voir l'état de tes stocks ou enregistrer un achat d'aliments ?"
     * Toujours proposer des exemples concrets dans ta question
     * Utiliser le contexte de la conversation précédente si disponible

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
   * Parse la réponse de l'IA pour détecter des actions
   * Utilise d'abord le JSON de l'IA, puis le détecteur d'intention comme fallback
   */
  private parseActionFromResponse(response: string, userMessage?: string): AgentAction | null {
    try {
      // Chercher un JSON dans la réponse (peut être sur plusieurs lignes)
      // Essayer d'abord avec un match simple
      let jsonMatch = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      
      // Si pas trouvé, essayer avec un match multiligne plus permissif
      if (!jsonMatch) {
        jsonMatch = response.match(/\{[\s\S]*?\}/);
      }
      
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.action) {
            const params = parsed.params || {};
            
            // Si c'est une dépense et que le montant n'est pas dans params, essayer de l'extraire depuis la réponse
            if (parsed.action === 'create_depense' && (!params.montant || params.montant === null || params.montant === undefined)) {
              const montantExtrait = this.extractMontantFromText(response);
              if (montantExtrait) {
                params.montant = montantExtrait;
              }
            }
            
            console.log('[ChatAgentService] Action détectée depuis JSON:', parsed.action, params);
            
            return {
              type: parsed.action as AgentAction['type'],
              params,
              requiresConfirmation: parsed.requiresConfirmation || false,
              confirmationMessage: parsed.confirmationMessage,
            };
          }
        } catch (parseError) {
          console.error('[ChatAgentService] Erreur parsing JSON:', parseError, 'JSON:', jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error('[ChatAgentService] Erreur détection action:', error);
    }

    // Note: Le détecteur d'intention est maintenant appelé avant cette méthode dans sendMessage

    // Dernier fallback : détection basique sur la réponse
    const lowerResponse = response.toLowerCase();
    
    if (lowerResponse.includes('statistique') || lowerResponse.includes('bilan') || 
        lowerResponse.includes('combien de porc') || lowerResponse.includes('nombre de porc') ||
        lowerResponse.includes('porc actif') || lowerResponse.includes('cheptel')) {
      console.log('[ChatAgentService] Fallback basique: get_statistics');
      return { type: 'get_statistics', params: {} };
    }
    
    if (lowerResponse.includes('stock') && (lowerResponse.includes('actuel') || lowerResponse.includes('état'))) {
      console.log('[ChatAgentService] Fallback basique: get_stock_status');
      return { type: 'get_stock_status', params: {} };
    }

    return null;
  }

  /**
   * Réinitialise l'historique de conversation
   */
  async clearHistory(): Promise<void> {
    this.conversationHistory = [];
    await this.historyService.clearHistory();
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
  }

  /**
   * Détecte si le message est une réponse contextuelle à une question précédente
   * Par exemple : réponse avec poids après une question sur le poids d'une vente
   * Amélioré pour gérer tous les cas de clarifications (nombre, poids, acheteur, etc.)
   */
  private detectContextualAction(userMessage: string): AgentAction | null {
    // Vérifier les 10 derniers messages pour détecter un contexte
    const recentMessages = this.conversationHistory.slice(-10);
    
    // Chercher si le dernier message de Kouakou était une question de clarification
    const lastAssistantMessage = recentMessages
      .filter(msg => msg.role === 'assistant')
      .pop();
    
    // Vérifier si c'était une question de clarification (contient "?" ou metadata.isClarificationQuestion)
    const isClarificationQuestion = lastAssistantMessage && (
      lastAssistantMessage.content.includes('?') ||
      lastAssistantMessage.metadata?.isClarificationQuestion === true ||
      lastAssistantMessage.metadata?.pendingAction !== undefined
    );

    // Récupérer l'action en attente depuis les métadonnées
    const pendingAction = lastAssistantMessage?.metadata?.pendingAction;
    
    if (pendingAction && isClarificationQuestion) {
      // C'est une réponse à une question de clarification
      // Combiner les paramètres de l'action en attente avec les nouvelles informations
      return this.combineContextualParams(pendingAction, userMessage, recentMessages);
    }

    // Détecter si c'est une réponse avec des poids (ex: "82 kg et 90 kg", "85 kg chacun")
    const poidsMatches = userMessage.match(/(\d+[.,]?\d*)\s*(?:kg|kilogramme|kilo)/gi);
    const hasPoids = poidsMatches && poidsMatches.length > 0;
    
    // Détecter si le message précédent de Kouakou demandait le poids
    const demandePoids = lastAssistantMessage && (
      lastAssistantMessage.content.includes('poids moyen ou poids total') ||
      lastAssistantMessage.content.includes('quel poids') ||
      lastAssistantMessage.content.includes('poids moyen') ||
      lastAssistantMessage.content.includes('poids total')
    );
    
    if (hasPoids && demandePoids) {
      // C'est probablement une réponse à une question sur le poids d'une vente
      // Chercher le message utilisateur précédent qui mentionnait une vente
      const previousUserMessages = recentMessages
        .filter(msg => msg.role === 'user')
        .slice(-3);
      
      // Chercher le message qui mentionne une vente
      const venteMessage = previousUserMessages.find(msg => 
        msg.content.toLowerCase().includes('vendu') ||
        msg.content.toLowerCase().includes('vente')
      );
      
      if (venteMessage) {
        // Extraire les paramètres de la vente depuis le message précédent
        const venteParams = IntentDetector.extractVenteParams(venteMessage.content);
        
        // Extraire les poids depuis le message actuel (ex: "82 kg et 90 kg")
        if (poidsMatches && poidsMatches.length > 0) {
          // Calculer le poids moyen et total
          const poidsIndividuels = poidsMatches.map(match => {
            const poids = parseFloat(match.replace(/[^\d,.]/g, '').replace(',', '.'));
            return isNaN(poids) ? 0 : poids;
          }).filter(p => p > 0);
          
          if (poidsIndividuels.length > 0) {
            const poidsTotal = poidsIndividuels.reduce((sum, p) => sum + p, 0);
            const poidsMoyen = poidsTotal / poidsIndividuels.length;
            const nombre = venteParams.nombre || poidsIndividuels.length;
            
            console.log('[ChatAgentService] Détection contextuelle vente:', {
              nombre,
              poidsMoyen,
              poidsTotal,
              poidsIndividuels,
            });
            
            // Combiner les paramètres
            return {
              type: 'create_revenu' as AgentActionType,
              params: {
                ...venteParams,
                nombre: nombre,
                poids_moyen: poidsMoyen,
                poids_moyen_kg: poidsMoyen,
                poids_total: poidsTotal,
                poids_kg: poidsTotal,
                poids_individuels: poidsIndividuels,
                userMessage: userMessage,
              },
              requiresConfirmation: false,
            };
          }
        }
      }
    }
    
    // Chercher si le dernier message de Kouakou demandait la cause pour une mortalité
    if (lastAssistantMessage && lastAssistantMessage.content.includes('note la cause')) {
      const previousUserMessage = recentMessages
        .filter(msg => msg.role === 'user')
        .slice(-2, -1)[0];
      
      if (previousUserMessage && (
        previousUserMessage.content.toLowerCase().includes('mort') ||
        previousUserMessage.content.toLowerCase().includes('creve') ||
        previousUserMessage.content.toLowerCase().includes('decede')
      )) {
        // Extraire les paramètres de la mortalité depuis le message précédent
        const mortaliteParams = IntentDetector.extractMortaliteParams(previousUserMessage.content);
        
        // Extraire la cause depuis le message actuel
        const causeMatch = userMessage.match(/(?:cause|cause:|du a|du au|parce que|car)\s*[:\-]?\s*(.+)/i);
        if (causeMatch && causeMatch[1]) {
          return {
            type: 'create_mortalite' as AgentActionType,
            params: {
              ...mortaliteParams,
              cause: causeMatch[1].trim(),
              userMessage: userMessage,
            },
            requiresConfirmation: false,
          };
        }
      }
    }
    
    return null;
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Détermine si une action nécessite confirmation (uniquement pour cas critiques)
   */
  private requiresConfirmation(actionType: string, params: Record<string, any>): boolean {
    // Suppression de données → TOUJOURS demander confirmation
    if (actionType.includes('delete') || actionType.includes('supprimer') || actionType.includes('effacer')) {
      return true;
    }

    // Montants très élevés (> 5 millions FCFA) → demander confirmation
    const montant = params.montant || params.prix || params.cout || params.amount;
    if (montant && typeof montant === 'number' && montant > 5000000) {
      return true;
    }
    // Si montant est une string, essayer de parser
    if (montant && typeof montant === 'string') {
      const parsed = parseInt(montant.replace(/[\s,]/g, ''));
      if (!isNaN(parsed) && parsed > 5000000) {
        return true;
      }
    }

    // Décisions sanitaires graves → demander confirmation
    const lowerMessage = JSON.stringify(params).toLowerCase();
    if (lowerMessage.includes('abattage') || 
        lowerMessage.includes('euthanasie') || 
        lowerMessage.includes('quarantaine totale') ||
        lowerMessage.includes('abattre tous')) {
      return true;
    }

    // Pour tout le reste → pas de confirmation nécessaire (autonomie maximale)
    return false;
  }

  /**
   * Construit un message de confirmation pour les cas critiques
   */
  private buildConfirmationMessage(action: AgentAction, userMessage: string): string {
    const montant = action.params.montant || action.params.prix || action.params.cout;
    
    if (montant && typeof montant === 'number' && montant > 5000000) {
      return `Attention patron ! C'est un montant important : ${montant.toLocaleString('fr-FR')} FCFA. Tu confirmes que je peux enregistrer ça ?`;
    }

    if (action.type.includes('delete') || action.type.includes('supprimer')) {
      return `Attention ! Tu veux vraiment supprimer cette donnée ? C'est une action irréversible. Tu confirmes ?`;
    }

    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('abattage') || lowerMessage.includes('euthanasie')) {
      return `Yako ! C'est une décision sanitaire grave. Tu confirmes vraiment qu'il faut procéder à l'abattage ?`;
    }

    return `Je veux juste confirmer avant d'enregistrer. C'est bon pour toi ?`;
  }

  /**
   * Extrait un montant depuis un texte
   * Cherche des patterns comme "5000 FCFA", "5 000 francs", etc.
   */
  private extractMontantFromText(text: string): number | null {
    // Fonction helper pour parser un montant avec différents formats
    const parseMontantString = (montantStr: string): number => {
      // Gérer les formats : "50.000", "50 000", "50,000", "50000"
      // Le point peut être séparateur de milliers (format européen/ivoirien) ou décimal
      
      // Si le nombre contient un point et a plus de 3 chiffres après le point, c'est probablement un séparateur de milliers
      if (montantStr.includes('.') && montantStr.split('.')[1]?.length >= 3) {
        // Format "50.000" = 50000 (séparateur de milliers)
        return parseInt(montantStr.replace(/\./g, ''));
      }
      
      // Si le nombre contient une virgule, c'est probablement un séparateur décimal (format français)
      if (montantStr.includes(',')) {
        // Format "50,5" = 50.5 (décimal) ou "50,000" = 50000 (séparateur de milliers)
        const parts = montantStr.split(',');
        if (parts[1] && parts[1].length >= 3) {
          // Plus de 3 chiffres après la virgule = séparateur de milliers
          return parseInt(montantStr.replace(/,/g, ''));
        } else {
          // Format décimal
          return parseFloat(montantStr.replace(/,/g, '.'));
        }
      }
      
      // Sinon, retirer espaces et points (séparateurs de milliers)
      const cleaned = montantStr.replace(/[\s\.]/g, '');
      return parseInt(cleaned) || 0;
    };

    // Regex pour trouver un montant dans le texte
    // Patterns prioritaires (plus fiables)
    const priorityPatterns = [
      // Pattern 1: Montant après "à", "pour", "de", "montant", "prix", "coût" (gère points et espaces)
      /(?:a|pour|de|montant|prix|cout|vendu a|vendu pour|depense|achete|paye|j'ai depense|j'ai paye)[:\s]+(\d[\d\s,\.]+)(?:\s*(?:f\s*c\s*f\s*a|fcfa|francs?|f\s*))?/i,
      // Pattern 2: "50.000 FCFA", "50 000 FCFA", "50000 FCFA" (avec devise, gère points)
      /(\d[\d\s,\.]{3,})\s*(?:FCFA|CFA|francs?|F\s*)/i,
    ];

    for (const pattern of priorityPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const montant = parseMontantString(match[1]);
        if (!isNaN(montant) && montant >= 1000 && montant < 100000000) { 
          // Montants raisonnables entre 1000 et 100 millions
          return montant;
        }
      }
    }

    // Pattern 3: Chercher tous les nombres de 3+ chiffres et prendre le plus grand
    const allNumbers = text.match(/\b(\d[\d\s,\.]{3,})\b/g);
    if (allNumbers) {
      const validNumbers = allNumbers
        .map(n => parseMontantString(n))
        .filter(n => n >= 1000 && n < 100000000); // Montants raisonnables
      
      if (validNumbers.length > 0) {
        return Math.max(...validNumbers);
      }
    }

    return null;
  }

  /**
   * Combine les paramètres de l'action en attente avec les nouvelles informations du message
   */
  private combineContextualParams(pendingAction: AgentAction, userMessage: string, recentMessages: ChatMessage[]): AgentAction | null {
    const combinedParams = { ...pendingAction.params };
    const normalizedMessage = userMessage.toLowerCase();

    switch (pendingAction.type) {
      case 'create_revenu':
        // Extraire le nombre si mentionné
        const nombreMatch = userMessage.match(/(\d+)\s*(?:porc|porcs|tete|tetes)/i);
        if (nombreMatch) {
          combinedParams.nombre = parseInt(nombreMatch[1]);
          combinedParams.nombre_porcs = combinedParams.nombre;
        }

        // Extraire le poids
        const poidsMatches = userMessage.match(/(\d+[.,]?\d*)\s*(?:kg|kilogramme|kilo)/gi);
        if (poidsMatches && poidsMatches.length > 0) {
          const poidsIndividuels = poidsMatches.map(match => {
            const poids = parseFloat(match.replace(/[^\d,.]/g, '').replace(',', '.'));
            return isNaN(poids) ? 0 : poids;
          }).filter(p => p > 0);
          
          if (poidsIndividuels.length > 0) {
            const poidsTotal = poidsIndividuels.reduce((sum, p) => sum + p, 0);
            const poidsMoyen = poidsTotal / poidsIndividuels.length;
            combinedParams.poids_moyen = poidsMoyen;
            combinedParams.poids_moyen_kg = poidsMoyen;
            combinedParams.poids_total = poidsTotal;
            combinedParams.poids_kg = poidsTotal;
            combinedParams.poids_individuels = poidsIndividuels;
          }
        }

        // Extraire l'acheteur (ex: "à Koné", "pour Koné", "5 à Koné")
        const acheteurMatch = userMessage.match(/(?:a|pour|chez)\s+([A-Za-z\s]+?)(?:\s|$|,)/i) ||
                              userMessage.match(/(\d+)\s*(?:a|pour|chez)\s+([A-Za-z\s]+?)(?:\s|$|,)/i);
        if (acheteurMatch) {
          const acheteur = acheteurMatch[2] || acheteurMatch[1];
          if (acheteur && acheteur.trim().length > 0) {
            combinedParams.acheteur = acheteur.trim();
            combinedParams.client = combinedParams.acheteur;
          }
        }

        // Extraire le montant si mentionné
        const montantMatch = userMessage.match(/(\d[\d\s,\.]+)\s*(?:f\s*c\s*f\s*a|fcfa|francs?|f\s*)/i);
        if (montantMatch) {
          const montantStr = montantMatch[1].replace(/[\s,]/g, '');
          const montant = parseInt(montantStr);
          if (!isNaN(montant) && montant > 0) {
            combinedParams.montant = montant;
          }
        }

        combinedParams.userMessage = userMessage;
        return {
          ...pendingAction,
          params: combinedParams,
        };

      case 'create_mortalite':
        // Extraire le nombre
        const nombreMortMatch = userMessage.match(/(\d+)\s*(?:porc|porcs|mort|morts)/i);
        if (nombreMortMatch) {
          combinedParams.nombre_porcs = parseInt(nombreMortMatch[1]);
          combinedParams.nombre = combinedParams.nombre_porcs;
        }

        // Extraire la cause
        const causeMatch = userMessage.match(/(?:cause|cause:|du a|du au|parce que|car)\s*[:\-]?\s*(.+)/i);
        if (causeMatch && causeMatch[1]) {
          combinedParams.cause = causeMatch[1].trim();
        } else if (userMessage.length > 10 && !nombreMortMatch) {
          // Si le message est assez long et ne contient pas de nombre, c'est probablement la cause
          combinedParams.cause = userMessage.trim();
        }

        combinedParams.userMessage = userMessage;
        return {
          ...pendingAction,
          params: combinedParams,
        };

      case 'create_depense':
        // Extraire le montant
        const montantDepenseMatch = userMessage.match(/(\d[\d\s,\.]+)\s*(?:f\s*c\s*f\s*a|fcfa|francs?|f\s*)/i);
        if (montantDepenseMatch) {
          const montantStr = montantDepenseMatch[1].replace(/[\s,]/g, '');
          const montant = parseInt(montantStr);
          if (!isNaN(montant) && montant > 0) {
            combinedParams.montant = montant;
          }
        }

        // Extraire la catégorie si mentionnée
        const categorieKeywords: Record<string, string> = {
          'aliment': 'alimentation',
          'provende': 'alimentation',
          'nourriture': 'alimentation',
          'medicament': 'medicaments',
          'vaccin': 'medicaments',
          'veterinaire': 'veterinaire',
          'veto': 'veterinaire',
          'entretien': 'entretien',
          'equipement': 'equipements',
        };

        for (const [keyword, categorie] of Object.entries(categorieKeywords)) {
          if (normalizedMessage.includes(keyword)) {
            combinedParams.categorie = categorie;
            break;
          }
        }

        combinedParams.userMessage = userMessage;
        return {
          ...pendingAction,
          params: combinedParams,
        };
    }

    return null;
  }

  /**
   * Génère un ID de contexte pour relier les messages entre eux
   */
  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Vérifie si une action nécessite des clarifications (informations manquantes)
   */
  private checkMissingInfo(action: AgentAction): string[] {
    const missing: string[] = [];
    const params = action.params || {};

    switch (action.type) {
      case 'create_revenu':
        if (!params.nombre || params.nombre <= 0) {
          missing.push('nombre');
        }
        if (!params.poids_total && !params.poids_moyen && !params.poids_kg) {
          missing.push('poids');
        }
        break;
      case 'create_mortalite':
        if (!params.nombre_porcs || params.nombre_porcs <= 0) {
          missing.push('nombre');
        }
        break;
      case 'create_depense':
        if (!params.montant || params.montant <= 0) {
          missing.push('montant');
        }
        break;
    }

    return missing;
  }

  /**
   * Construit une question de clarification basée sur les informations manquantes
   */
  private buildClarificationQuestion(action: AgentAction, missingInfo: string[]): string {
    const params = action.params || {};

    switch (action.type) {
      case 'create_revenu':
        if (missingInfo.includes('nombre') && missingInfo.includes('poids')) {
          return 'Combien de porcs exactement tu as vendus et c\'est quel poids moyen ou poids total ? (ex: "5 porcs, 85 kg chacun" ou "5 porcs, 425 kg au total")';
        } else if (missingInfo.includes('nombre')) {
          return 'Combien de porcs exactement tu as vendus ? Donne-moi le nombre précis.';
        } else if (missingInfo.includes('poids')) {
          const nombre = params.nombre || 'X';
          return `Ok, tu as vendu ${nombre} porc${nombre > 1 ? 's' : ''}. C'est quel poids moyen ou poids total ? (ex: "85 kg chacun" ou "425 kg au total")`;
        }
        break;
      case 'create_mortalite':
        if (missingInfo.includes('nombre')) {
          return 'Combien de porcs exactement sont morts ? Donne-moi le nombre précis.';
        }
        break;
      case 'create_depense':
        if (missingInfo.includes('montant')) {
          return 'C\'est quel montant exactement ? Donne-moi le montant de la dépense (ex: "50 000 FCFA").';
        }
        break;
    }

    return 'Peux-tu me donner plus de détails pour que je puisse t\'aider ?';
  }

  /**
   * Construit une réponse contextuelle personnalisée pour montrer qu'on se souvient du contexte
   */
  private buildContextualResponse(action: AgentAction, defaultMessage: string): string {
    // Chercher dans l'historique le message précédent qui a déclenché cette action
    const recentMessages = this.conversationHistory.slice(-5);
    const previousUserMessage = recentMessages
      .filter(msg => msg.role === 'user')
      .slice(-2, -1)[0];

    if (previousUserMessage && action.type === 'create_revenu') {
      // Vérifier si le message précédent mentionnait une vente
      if (previousUserMessage.content.toLowerCase().includes('vendu') ||
          previousUserMessage.content.toLowerCase().includes('vente')) {
        // Personnaliser le message pour montrer qu'on se souvient
        const nombre = action.params.nombre || action.params.nombre_porcs || 'X';
        const acheteur = action.params.acheteur || action.params.client || 'client';
        
        return `Ah d'acc mon frère, je me souviens que tu parlais de la vente des porcs. Avec ${nombre} porc${nombre > 1 ? 's' : ''} à ${acheteur}, c'est noté ! ${defaultMessage}`;
      }
    }

    return defaultMessage;
  }

  /**
   * Construit un message avec les recommandations et suggestions proactives
   */
  private buildRecommendationsMessage(reasoning: any): string | null {
    const parts: string[] = [];

    if (reasoning.recommendations && reasoning.recommendations.length > 0) {
      parts.push('💡 **Recommandations** :');
      reasoning.recommendations.forEach((rec: string, index: number) => {
        parts.push(`${index + 1}. ${rec}`);
      });
    }

    if (reasoning.proactiveSuggestions && reasoning.proactiveSuggestions.length > 0) {
      if (parts.length > 0) parts.push('');
      parts.push('🚀 **Suggestions proactives** :');
      reasoning.proactiveSuggestions.forEach((suggestion: string, index: number) => {
        parts.push(`${index + 1}. ${suggestion}`);
      });
    }

    return parts.length > 0 ? parts.join('\n') : null;
  }

  /**
   * Nettoie les ressources lors de la destruction
   */
  destroy(): void {
    this.stopProactiveChecks();
  }
}

