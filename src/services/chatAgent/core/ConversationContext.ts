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

  // Mémorisation des corrections utilisateur (pour apprentissage)
  userCorrections?: Array<{
    originalCategory?: string;
    correctedCategory?: string;
    originalValue?: string;
    correctedValue?: string;
    timestamp: string;
    count: number;
  }>;
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

  /**
   * Enregistre une correction utilisateur (pour apprentissage)
   */
  recordCorrection(
    originalCategory?: string,
    correctedCategory?: string,
    originalValue?: string,
    correctedValue?: string
  ): void {
    if (!this.context.userCorrections) {
      this.context.userCorrections = [];
    }

    // Chercher si cette correction existe déjà
    const existingCorrection = this.context.userCorrections.find(
      (c) =>
        c.originalCategory === originalCategory &&
        c.correctedCategory === correctedCategory &&
        c.originalValue === originalValue &&
        c.correctedValue === correctedValue
    );

    if (existingCorrection) {
      existingCorrection.count++;
      existingCorrection.timestamp = new Date().toISOString();
    } else {
      this.context.userCorrections.push({
        originalCategory,
        correctedCategory,
        originalValue,
        correctedValue,
        timestamp: new Date().toISOString(),
        count: 1,
      });
    }

    // Garder seulement les 100 dernières corrections
    if (this.context.userCorrections.length > 100) {
      this.context.userCorrections.shift();
    }
  }

  /**
   * Récupère les corrections utilisateur (pour apprentissage)
   */
  getUserCorrections(): Array<{
    originalCategory?: string;
    correctedCategory?: string;
    originalValue?: string;
    correctedValue?: string;
    timestamp: string;
    count: number;
  }> {
    return this.context.userCorrections || [];
  }

  /**
   * Récupère les préférences utilisateur basées sur les corrections
   */
  getUserPreferences(): {
    categoryMappings: Record<string, string>;
    commonCorrections: Array<{
      original: string;
      corrected: string;
      count: number;
    }>;
  } {
    const categoryMappings: Record<string, string> = {};
    const commonCorrections: Array<{ original: string; corrected: string; count: number }> = [];

    if (this.context.userCorrections) {
      // Mapper les corrections fréquentes (>= 3 fois)
      this.context.userCorrections.forEach((correction) => {
        if (correction.count >= 3) {
          if (correction.originalCategory && correction.correctedCategory) {
            categoryMappings[correction.originalCategory] = correction.correctedCategory;
          }
          if (correction.originalValue && correction.correctedValue) {
            commonCorrections.push({
              original: correction.originalValue,
              corrected: correction.correctedValue,
              count: correction.count,
            });
          }
        }
      });
    }

    return {
      categoryMappings,
      commonCorrections: commonCorrections.sort((a, b) => b.count - a.count).slice(0, 20),
    };
  }
}
