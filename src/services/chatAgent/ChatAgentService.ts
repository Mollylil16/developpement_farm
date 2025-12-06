/**
 * Service principal pour l'agent conversationnel
 * Gère les interactions avec l'IA et l'exécution des actions
 */

import { ChatMessage, AgentAction, AgentContext, AgentConfig, AgentActionResult } from '../../types/chatAgent';
import { AgentActionExecutor } from './AgentActionExecutor';
import { ChatAgentAPI } from './ChatAgentAPI';
import { IntentDetector } from './IntentDetector';

export class ChatAgentService {
  private actionExecutor: AgentActionExecutor;
  private api: ChatAgentAPI;
  private config: AgentConfig;
  private context: AgentContext | null = null;
  private conversationHistory: ChatMessage[] = [];

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
  }

  /**
   * Initialise le contexte de l'agent
   */
  async initializeContext(context: AgentContext): Promise<void> {
    this.context = context;
    await this.actionExecutor.initialize(context);
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
      const detectedIntent = IntentDetector.detectIntent(userMessage);
      if (detectedIntent && detectedIntent.confidence >= 0.7) {
        console.log('[ChatAgentService] Action détectée depuis IntentDetector:', detectedIntent.action, 'confiance:', detectedIntent.confidence);
        
        // Déterminer si confirmation nécessaire (uniquement pour cas critiques)
        const requiresConfirmation = this.requiresConfirmation(detectedIntent.action, detectedIntent.params);
        
        action = {
          type: detectedIntent.action,
          params: detectedIntent.params,
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

      let assistantMessage: ChatMessage;
      let actionResult: AgentActionResult | null = null;

      if (action && action.type !== 'other') {
        // Si confirmation requise (cas critiques uniquement), demander d'abord
        if (action.requiresConfirmation) {
          assistantMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: this.buildConfirmationMessage(action, userMessage),
            timestamp: new Date().toISOString(),
            metadata: {
              pendingAction: action,
              requiresConfirmation: true,
            },
          };
        } else {
          // MODE AUTONOME : Exécuter l'action directement sans demander confirmation
          actionResult = await this.actionExecutor.execute(action, this.context);

          // Créer le message de réponse avec le résultat de l'action
          assistantMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: actionResult.message,
            timestamp: new Date().toISOString(),
            metadata: {
              actionExecuted: action.type,
              actionResult: actionResult.data,
              requiresConfirmation: false,
            },
          };
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
   → Action: {"action": "create_revenu", "params": {"montant": 800000, "nombre": 5, "acheteur": "...", "categorie": "vente_porc"}}
   - Paramètres requis : montant (obligatoire), nombre (optionnel), acheteur (optionnel), poids_kg (optionnel)
   
   DÉPENSE - Exemples de requêtes :
   - "J'ai acheté 20 sacs de provende à 18 000 FCFA"
   - "Dépense de 50 000 FCFA pour médicaments"
   → Action: {"action": "create_depense", "params": {"montant": 50000, "categorie": "medicaments", "date": "2025-01-15"}}
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
    // Regex pour trouver un montant dans le texte
    // Patterns: "5000 FCFA", "5 000 francs", "5000", etc.
    const patterns = [
      /(\d[\d\s,]*)\s*(?:FCFA|CFA|francs?|F)/i, // Avec devise
      /(?:montant|prix|coût|cout)[\s:]*(\d[\d\s,]*)/i, // "montant: 5000"
      /(\d[\d\s,]+)/, // Juste un nombre avec espaces/virgules
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const montantStr = match[1].replace(/[\s,]/g, '');
        const montant = parseFloat(montantStr);
        if (!isNaN(montant) && montant > 0) {
          return montant;
        }
      }
    }

    return null;
  }
}

