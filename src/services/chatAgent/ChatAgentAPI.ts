/**
 * Service API pour communiquer avec le modèle d'IA
 * Supporte OpenAI, Anthropic, ou autres providers
 */

import { AgentConfig } from '../../types/chatAgent';
import { IntentDetector } from './IntentDetector';

interface APIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ChatAgentAPI {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Envoie un message à l'API d'IA
   */
  async sendMessage(messages: APIMessage[]): Promise<string> {
    // Pour l'instant, on utilise une réponse simulée
    // TODO: Intégrer avec une vraie API (OpenAI, Anthropic, etc.)
    
    if (this.config.apiKey && this.config.apiUrl) {
      return await this.callExternalAPI(messages);
    }

    // Mode simulation pour développement
    return this.simulateResponse(messages);
  }

  /**
   * Appelle une API externe (OpenAI, Anthropic, etc.)
   * Avec timeout explicite pour éviter les blocages en mode hors ligne
   */
  private async callExternalAPI(messages: APIMessage[]): Promise<string> {
    const controller = new AbortController();
    const timeoutMs = 10000; // 10 secondes max
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(this.config.apiUrl || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model || 'gpt-4o-mini',
          messages,
          temperature: this.config.temperature || 0.7,
          max_tokens: this.config.maxTokens || 1000,
        }),
        signal: controller.signal, // Permet d'annuler la requête si timeout
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Si timeout ou erreur réseau, utiliser le mode simulation (hors ligne)
      if (error.name === 'AbortError' || error.message?.includes('fetch')) {
        console.log('[ChatAgentAPI] Timeout ou erreur réseau, passage en mode simulation (hors ligne)');
      } else {
        console.error('[ChatAgentAPI] Erreur lors de l\'appel API:', error);
      }
      
      // Fallback vers simulation - FONCTIONNE HORS LIGNE
      return this.simulateResponse(messages);
    }
  }

  /**
   * Simule une réponse (pour développement sans API)
   * Utilise le détecteur d'intention pour une meilleure reconnaissance
   * 
   * IMPORTANT: Pose des questions UNIQUEMENT si l'intention n'est pas claire (confiance < 0.75)
   * Si l'intention est claire, exécute directement sans poser de questions
   */
  private simulateResponse(messages: APIMessage[]): string {
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    // Utiliser le détecteur d'intention pour une détection plus robuste
    const detectedIntent = IntentDetector.detectIntent(lastMessage);
    
    // Si l'intention est claire (confiance >= 0.75), exécuter directement SANS poser de questions
    if (detectedIntent && detectedIntent.confidence >= 0.75) {
      // Requêtes d'information - retourner directement l'action JSON
      if (['get_statistics', 'get_stock_status', 'calculate_costs', 'get_reminders', 'analyze_data'].includes(detectedIntent.action)) {
        const actionJson = JSON.stringify({
          action: detectedIntent.action,
          params: detectedIntent.params,
        });
        
        const messages: Record<string, string> = {
          get_statistics: 'Je prépare vos statistiques du cheptel...',
          get_stock_status: 'Vérification des stocks en cours...',
          calculate_costs: 'Calcul des coûts en cours...',
          get_reminders: 'Récupération de vos rappels...',
          analyze_data: 'Analyse de l\'exploitation en cours...',
        };
        
        return `${actionJson}\n\n${messages[detectedIntent.action] || 'Traitement en cours...'}`;
      }
      
      // Recherche
      if (detectedIntent.action === 'search_animal') {
        const actionJson = JSON.stringify({
          action: 'search_animal',
          params: detectedIntent.params,
        });
        return `${actionJson}\n\nRecherche en cours...`;
      }
      
      // Diagnostic de symptômes - PRIORITÉ ABSOLUE
      if (detectedIntent.action === 'diagnose_symptoms') {
        const actionJson = JSON.stringify({
          action: 'diagnose_symptoms',
          params: detectedIntent.params,
        });
        return `${actionJson}\n\nAnalyse des symptômes en cours...`;
      }

      // Enregistrements - exécuter directement (autonomie maximale)
      if (detectedIntent.action.startsWith('create_')) {
        // Retourner directement l'action JSON pour exécution immédiate
        const actionJson = JSON.stringify({
          action: detectedIntent.action,
          params: detectedIntent.params,
        });
        
        const messages: Record<string, string> = {
          create_revenu: 'C\'est noté patron ! Vente enregistrée.',
          create_depense: 'C\'est noté mon frère ! Dépense enregistrée.',
          create_vaccination: 'C\'est noté ! Vaccination enregistrée.',
          create_visite_veterinaire: 'C\'est noté ! Rendez-vous vétérinaire enregistré.',
          create_traitement: 'C\'est noté ! Traitement enregistré.',
          create_maladie: 'C\'est noté ! Maladie enregistrée.',
          create_mortalite: 'C\'est noté ! Mortalité enregistrée.',
          create_charge_fixe: 'C\'est noté ! Charge fixe enregistrée.',
          create_pesee: 'C\'est noté ! Pesée enregistrée.',
          create_ingredient: 'C\'est noté ! Ingrédient créé.',
          create_planification: 'C\'est noté ! Rappel créé dans le planning.',
        };
        return `${actionJson}\n\n${messages[detectedIntent.action] || 'C\'est déjà enregistré !'}`;
      }
    }

    // Fallback pour les salutations
    const lowerMessage = lastMessage.toLowerCase();
    if (lowerMessage.includes('bonjour') || lowerMessage.includes('salut') || lowerMessage.includes('bonsoir')) {
      return `Bonjour ! Comment puis-je vous aider avec votre élevage aujourd'hui ?`;
    }

    // Si on arrive ici, c'est que l'intention n'est PAS claire (confiance < 0.75 ou null)
    // Dans ce cas uniquement, on pose des questions contextuelles pour clarifier
    return this.generateContextualQuestion(lastMessage, detectedIntent);
  }

  /**
   * Génère une question contextuelle basée sur l'analyse du message
   * pour mieux comprendre l'intention de l'utilisateur
   * 
   * Cette fonction est appelée UNIQUEMENT quand :
   * - L'intention n'a pas été détectée (detectedIntent === null)
   * - OU la confiance est faible (detectedIntent.confidence < 0.75)
   * 
   * Elle analyse le message pour détecter des indices et pose des questions spécifiques
   * au lieu de questions génériques
   */
  private generateContextualQuestion(message: string, detectedIntent: any): string {
    const lowerMessage = message.toLowerCase();
    const normalized = lowerMessage.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Détecter des indices dans le message même si l'intention n'est pas claire
    const keywords = {
      finance: ['argent', 'argent', 'prix', 'cout', 'cout', 'depense', 'depense', 'revenu', 'vente', 'acheter', 'payer', 'budget'],
      animaux: ['porc', 'porcs', 'animal', 'animaux', 'truie', 'verrat', 'porcelet', 'cheptel', 'elevage'],
      sante: ['malade', 'maladie', 'vaccin', 'vaccination', 'traitement', 'medicament', 'veterinaire', 'veto', 'sante'],
      alimentation: ['nourriture', 'aliment', 'provende', 'ration', 'manger', 'mange', 'stock', 'stocks'],
      production: ['pesee', 'peser', 'poids', 'reproduction', 'saillie', 'gestation', 'mise bas', 'sevrage'],
      planning: ['rappel', 'rappels', 'planifier', 'planifie', 'programme', 'calendrier', 'agenda', 'a faire'],
    };

    // Analyser quels domaines sont mentionnés
    const detectedDomains: string[] = [];
    for (const [domain, words] of Object.entries(keywords)) {
      if (words.some(word => normalized.includes(word))) {
        detectedDomains.push(domain);
      }
    }

    // Générer des questions spécifiques selon les domaines détectés
    if (detectedDomains.length > 0) {
      const questions: Record<string, string[]> = {
        finance: [
          'Tu veux enregistrer une dépense ou voir un récapitulatif de tes dépenses ?',
          'Tu veux que je calcule tes coûts ou enregistrer une nouvelle dépense ?',
          'Tu veux voir tes revenus ou enregistrer une vente ?',
        ],
        animaux: [
          'Tu veux voir les statistiques de ton cheptel ou chercher un animal spécifique ?',
          'Tu veux enregistrer quelque chose pour un animal ou voir des informations ?',
          'Tu veux que je te montre combien d\'animaux tu as ou faire une action sur un animal ?',
        ],
        sante: [
          'Tu veux enregistrer une vaccination, un traitement, ou une maladie ?',
          'Tu veux que je programme un rappel vétérinaire ou enregistrer une visite ?',
          'Tu veux voir l\'historique de santé ou enregistrer un nouveau soin ?',
        ],
        alimentation: [
          'Tu veux voir l\'état de tes stocks ou enregistrer un achat d\'aliments ?',
          'Tu veux que je calcule tes besoins en alimentation ou voir ce qui reste ?',
          'Tu veux créer un ingrédient ou voir tes stocks actuels ?',
        ],
        production: [
          'Tu veux enregistrer une pesée, une saillie, ou voir des statistiques de production ?',
          'Tu veux que je programme une tâche de production ou voir le planning ?',
        ],
        planning: [
          'Tu veux voir tes rappels à venir ou créer un nouveau rappel ?',
          'Tu veux que je programme une tâche ou voir ton planning ?',
        ],
      };

      // Sélectionner des questions pertinentes selon les domaines détectés
      const relevantQuestions: string[] = [];
      for (const domain of detectedDomains) {
        if (questions[domain]) {
          relevantQuestions.push(...questions[domain]);
        }
      }

      if (relevantQuestions.length > 0) {
        // Prendre une question aléatoire parmi les pertinentes
        const randomQuestion = relevantQuestions[Math.floor(Math.random() * relevantQuestions.length)];
        return `Je vois que tu parles de ${detectedDomains.join(' ou ')}. ${randomQuestion}`;
      }
    }

    // Si des nombres sont détectés, peut-être une dépense ou vente
    const numbers = message.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      const hasMoneyKeywords = normalized.match(/(?:fcfa|franc|f\s*c\s*f\s*a|prix|montant|cout|depense|vente|achete)/);
      if (hasMoneyKeywords) {
        return 'Je vois un montant dans ton message. Tu veux enregistrer une dépense ou une vente ? Peux-tu me donner plus de détails ? Par exemple : "J\'ai dépensé 5000 FCFA pour l\'alimentation" ou "J\'ai vendu 3 porcs à 800000 FCFA".';
      }
    }

    // Si des dates sont mentionnées
    const dateKeywords = ['aujourd\'hui', 'aujourd hui', 'demain', 'hier', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    if (dateKeywords.some(keyword => normalized.includes(keyword))) {
      return 'Je vois que tu mentionnes une date. Tu veux programmer quelque chose ou voir ce qui est prévu ?';
    }

    // Si l'intention a été détectée mais avec faible confiance
    if (detectedIntent && detectedIntent.confidence < 0.75 && detectedIntent.confidence >= 0.5) {
      const action = detectedIntent.action;
      const actionQuestions: Record<string, string> = {
        'create_depense': 'Je pense que tu veux enregistrer une dépense. Peux-tu me donner le montant et la catégorie ? Par exemple : "J\'ai dépensé 5000 FCFA pour les médicaments".',
        'create_revenu': 'Je pense que tu veux enregistrer une vente. Peux-tu me donner le nombre de porcs, le poids (moyen ou total) et l\'acheteur ? Par exemple : "J\'ai vendu 3 porcs de 85 kg chacun à Traoré pour 800000 FCFA".',
        'create_mortalite': 'Je pense qu\'un porc est mort. Peux-tu me donner le nombre exact et la cause si tu la connais ? Par exemple : "2 porcs sont morts, cause : maladie".',
        'get_statistics': 'Tu veux voir les statistiques de ton cheptel ? Je peux te montrer le nombre d\'animaux, les finances, etc.',
        'calculate_costs': 'Tu veux que je calcule tes coûts ? Je peux te faire un récapitulatif de toutes tes dépenses.',
      };

      if (actionQuestions[action]) {
        return actionQuestions[action];
      }
    }

    // Fallback avec suggestions contextuelles
    return `Je veux bien t'aider, mais je n'ai pas bien compris ta demande. Peux-tu être plus précis ? Par exemple :
• "Combien de porcs j'ai ?" pour voir tes statistiques
• "J'ai dépensé 5000 FCFA" pour enregistrer une dépense
• "J'ai vendu 3 porcs à 800000 FCFA" pour enregistrer une vente
• "Mes stocks" pour voir l'état de tes stocks
• "Mes rappels" pour voir tes tâches à venir`;
  }
}

