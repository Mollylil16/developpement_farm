/**
 * Service API pour communiquer avec le modèle d'IA
 * Supporte OpenAI, Anthropic, ou autres providers
 */

import { AgentConfig } from '../../types/chatAgent';
import { IntentDetector } from './IntentDetector';
import { logger } from '../../utils/logger';

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
   * Supporte OpenAI directement si apiUrl n'est pas fourni
   */
  private async callExternalAPI(messages: APIMessage[]): Promise<string> {
    try {
      // Si apiUrl n'est pas fourni mais apiKey oui, utiliser OpenAI directement
      const apiUrl = this.config.apiUrl || 'https://api.openai.com/v1/chat/completions';

      const response = await fetch(apiUrl, {
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
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `API error: ${response.status}`;
        logger.error('[ChatAgentAPI] Erreur API:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("Aucune réponse générée par l'API");
      }

      return content;
    } catch (error: unknown) {
      logger.error("[ChatAgentAPI] Erreur lors de l'appel API:", error);
      // Fallback vers simulation
      return this.simulateResponse(messages);
    }
  }

  /**
   * Simule une réponse (pour développement sans API)
   * Utilise le détecteur d'intention pour une meilleure reconnaissance
   */
  private simulateResponse(messages: APIMessage[]): string {
    const lastMessage = messages[messages.length - 1]?.content || '';

    // Utiliser le détecteur d'intention pour une détection plus robuste
    const detectedIntent = IntentDetector.detectIntent(lastMessage);

    if (detectedIntent && detectedIntent.confidence >= 0.75) {
      // Requêtes d'information - retourner directement l'action JSON
      if (
        [
          'get_statistics',
          'get_stock_status',
          'calculate_costs',
          'get_reminders',
          'analyze_data',
        ].includes(detectedIntent.action)
      ) {
        const actionJson = JSON.stringify({
          action: detectedIntent.action,
          params: detectedIntent.params,
        });

        const messages: Record<string, string> = {
          get_statistics: 'Je prépare vos statistiques du cheptel...',
          get_stock_status: 'Vérification des stocks en cours...',
          calculate_costs: 'Calcul des coûts en cours...',
          get_reminders: 'Récupération de vos rappels...',
          analyze_data: "Analyse de l'exploitation en cours...",
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

      // Enregistrements - exécuter directement (autonomie maximale)
      if (detectedIntent.action.startsWith('create_')) {
        // Retourner directement l'action JSON pour exécution immédiate
        const actionJson = JSON.stringify({
          action: detectedIntent.action,
          params: detectedIntent.params,
        });

        const messages: Record<string, string> = {
          create_revenu: "C'est noté patron ! Vente enregistrée.",
          create_depense: "C'est noté mon frère ! Dépense enregistrée.",
          create_vaccination: "C'est noté ! Vaccination enregistrée.",
          create_visite_veterinaire: "C'est noté ! Rendez-vous vétérinaire enregistré.",
          create_traitement: "C'est noté ! Traitement enregistré.",
          create_maladie: "C'est noté ! Maladie enregistrée.",
          create_charge_fixe: "C'est noté ! Charge fixe enregistrée.",
          create_pesee: "C'est noté ! Pesée enregistrée.",
          create_ingredient: "C'est noté ! Ingrédient créé.",
          create_planification: "C'est noté ! Rappel créé dans le planning.",
        };
        return `${actionJson}\n\n${messages[detectedIntent.action] || "C'est déjà enregistré !"}`;
      }
    }

    // Fallback pour les salutations
    const lowerMessage = lastMessage.toLowerCase();
    if (
      lowerMessage.includes('bonjour') ||
      lowerMessage.includes('salut') ||
      lowerMessage.includes('bonsoir')
    ) {
      return `Bonjour ! Comment puis-je vous aider avec votre élevage aujourd'hui ?`;
    }

    // Fallback générique
    return `Je comprends. Comment puis-je vous aider aujourd'hui ?`;
  }
}
