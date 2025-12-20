/**
 * Gestionnaire de contexte conversationnel
 * Maintient la mémoire des entités et références mentionnées
 */

import { ChatMessage } from '../../../types/chatAgent';

export interface ConversationEntity {
  type: 'acheteur' | 'animal' | 'montant' | 'date' | 'categorie';
  value: unknown;
  mentionedAt: string; // ISO timestamp
  context?: string; // Contexte de mention
}

export interface ConversationContext {
  // Entités mentionnées récemment
  entities: Map<string, ConversationEntity[]>;

  // Dernières valeurs mentionnées (pour résolution de références)
  lastAcheteur?: string;
  lastAnimal?: string;
  lastMontant?: number;
  lastDate?: string;
  lastCategorie?: string;

  // Historique structuré
  history: Array<{
    message: string;
    intent?: string;
    action?: string;
    params?: Record<string, unknown>;
    result?: unknown;
    timestamp: string;
  }>;

  // Action en attente de confirmation
  pendingAction?: {
    action: string;
    params: Record<string, unknown>;
    timestamp: string;
  };

  // Clarification en cours
  clarificationNeeded?: {
    question: string;
    missingParams: string[];
    timestamp: string;
  };
}

export class ConversationContextManager {
  private context: ConversationContext;

  constructor() {
    this.context = {
      entities: new Map(),
      history: [],
    };
  }

  /**
   * Met à jour le contexte avec un nouveau message
   */
  updateFromMessage(
    message: ChatMessage,
    intent?: string,
    action?: string,
    params?: Record<string, unknown>
  ): void {
    if (message.role === 'user') {
      // Extraire les entités du message utilisateur
      this.extractEntities(message.content);
    }

    // Ajouter à l'historique
    this.context.history.push({
      message: message.content,
      intent,
      action,
      params,
      timestamp: message.timestamp,
    });

    // Garder seulement les 50 derniers messages
    if (this.context.history.length > 50) {
      this.context.history.shift();
    }
  }

  /**
   * Extrait les entités d'un message
   */
  private extractEntities(text: string): void {
    // Extraire acheteur
    const acheteurMatch = text.match(
      /(?:a|pour|chez|vendu a)\s+([A-Za-zÀ-ÿ\s]+?)(?:\s+(?:pour|a|\d)|$)/i
    );
    if (acheteurMatch && acheteurMatch[1]) {
      const acheteur = acheteurMatch[1].trim();
      if (acheteur.length > 1) {
        this.context.lastAcheteur = acheteur;
        this.addEntity('acheteur', acheteur, text);
      }
    }

    // Extraire montant
    const montantMatch = text.match(/(\d[\d\s,]{3,})\s*(?:fcfa|francs?|f\s*)/i);
    if (montantMatch && montantMatch[1]) {
      const montant = parseInt(montantMatch[1].replace(/[\s,]/g, ''));
      if (montant > 100) {
        this.context.lastMontant = montant;
        this.addEntity('montant', montant, text);
      }
    }

    // Extraire animal
    const animalMatch = text.match(/(?:porc|animal)\s+([A-Z0-9]+)/i);
    if (animalMatch && animalMatch[1]) {
      this.context.lastAnimal = animalMatch[1];
      this.addEntity('animal', animalMatch[1], text);
    }
  }

  /**
   * Ajoute une entité au contexte
   */
  private addEntity(type: ConversationEntity['type'], value: unknown, context: string): void {
    if (!this.context.entities.has(type)) {
      this.context.entities.set(type, []);
    }

    const entities = this.context.entities.get(type)!;

    // Éviter les doublons récents
    const recentEntity = entities.find(
      (e) => e.value === value && new Date().getTime() - new Date(e.mentionedAt).getTime() < 60000 // Moins d'1 minute
    );

    if (!recentEntity) {
      entities.unshift({
        type,
        value,
        mentionedAt: new Date().toISOString(),
        context,
      });

      // Garder seulement les 10 dernières entités de chaque type
      if (entities.length > 10) {
        entities.pop();
      }
    }
  }

  /**
   * Résout une référence ("le même", "celui-là", etc.)
   */
  resolveReference(reference: string, type: ConversationEntity['type']): unknown {
    const normalized = reference.toLowerCase();

    // Références courantes
    if (normalized.match(/(?:le\s+meme|celui\s+la|le\s+meme\s+acheteur|le\s+meme\s+animal)/i)) {
      const entities = this.context.entities.get(type);
      if (entities && entities.length > 0) {
        return entities[0].value; // La plus récente
      }
    }

    // Références spécifiques
    if (type === 'acheteur' && this.context.lastAcheteur) {
      return this.context.lastAcheteur;
    }
    if (type === 'animal' && this.context.lastAnimal) {
      return this.context.lastAnimal;
    }
    if (type === 'montant' && this.context.lastMontant) {
      return this.context.lastMontant;
    }

    return undefined;
  }

  /**
   * Récupère le contexte pour l'extraction de paramètres
   */
  getExtractionContext(): {
    conversationHistory: Array<{ role: string; content: string }>;
    lastAcheteur?: string;
    lastAnimal?: string;
    lastMontant?: number;
    recentTransactions?: Array<{ acheteur?: string; montant?: number }>;
  } {
    return {
      conversationHistory: this.context.history
        .slice(-10)
        .map((h) => ({ role: 'user', content: h.message })),
      lastAcheteur: this.context.lastAcheteur,
      lastAnimal: this.context.lastAnimal,
      lastMontant: this.context.lastMontant,
      recentTransactions: this.context.history
        .filter((h) => h.action === 'create_revenu' && h.params)
        .slice(0, 5)
        .map((h) => ({
          acheteur:
            h.params?.acheteur && typeof h.params.acheteur === 'string'
              ? h.params.acheteur
              : undefined,
          montant:
            h.params?.montant && typeof h.params.montant === 'number'
              ? h.params.montant
              : undefined,
        })),
    };
  }

  /**
   * Définit une action en attente
   */
  setPendingAction(action: string, params: Record<string, unknown>): void {
    this.context.pendingAction = {
      action,
      params,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Récupère l'action en attente
   */
  getPendingAction(): { action: string; params: Record<string, unknown> } | undefined {
    return this.context.pendingAction;
  }

  /**
   * Définit une clarification nécessaire
   */
  setClarificationNeeded(question: string, missingParams: string[]): void {
    this.context.clarificationNeeded = {
      question,
      missingParams,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Récupère la clarification nécessaire
   */
  getClarificationNeeded(): { question: string; missingParams: string[] } | undefined {
    return this.context.clarificationNeeded;
  }

  /**
   * Réinitialise le contexte
   */
  reset(): void {
    this.context = {
      entities: new Map(),
      history: [],
    };
  }

  /**
   * Récupère le contexte complet
   */
  getContext(): ConversationContext {
    return { ...this.context };
  }
}
