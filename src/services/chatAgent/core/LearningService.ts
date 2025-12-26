/**
 * Service d'apprentissage pour améliorer la compréhension
 * V4.0 - Avec persistance API et mémoire améliorée
 */

import apiClient from '../../api/apiClient';

export interface LearningFailure {
  userMessage: string;
  detectedIntent?: string;
  errorMessage: string;
  timestamp: string;
  count: number;
}

export interface EducationalSuggestion {
  userMessage: string;
  suggestedFormat: string;
  explanation: string;
}

export interface StoredLearning {
  learning_id: string;
  user_message: string;
  detected_intent: string | null;
  correct_intent: string | null;
  total_score: number;
  usage_count: number;
  memorized_response?: string;
  keywords?: string[];
}

/**
 * Message standardisé pour les non-compréhensions
 */
export const STANDARD_MISUNDERSTANDING_MESSAGE = 
  "Je n'ai pas de réponse pour cette question. Peux-tu reformuler pour que je comprenne mieux ?";

/**
 * Service d'apprentissage pour l'assistant
 * V4.0 - Avec persistance API et apprentissage continu
 */
export class LearningService {
  private failures: LearningFailure[] = [];
  private readonly maxFailures = 100;
  private projetId: string | null = null;
  private conversationId: string | null = null;

  // V3.0 - Analytics locale : compteurs par type d'intention
  private intentStats: Map<string, { successes: number; failures: number; totalConfidence: number }> = new Map();

  // V4.0 - Cache local des apprentissages récents
  private learningsCache: Map<string, StoredLearning> = new Map();
  private readonly cacheMaxSize = 50;

  /**
   * Initialise le service avec le projet et conversation
   */
  initialize(projetId: string, conversationId?: string): void {
    this.projetId = projetId;
    this.conversationId = conversationId || `conv_${Date.now()}`;
  }

  /**
   * Extrait les mots-clés significatifs d'un message
   */
  extractKeywords(message: string): string[] {
    // Normaliser le message
    const normalized = message
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Retirer les accents
      .replace(/[^\w\s]/g, ' ') // Retirer la ponctuation
      .trim();

    // Liste de mots vides à ignorer
    const stopWords = new Set([
      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
      'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'a', 'au', 'aux',
      'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
      'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui', 'quoi',
      'pour', 'par', 'sur', 'sous', 'dans', 'avec', 'sans', 'chez',
      'est', 'sont', 'ai', 'as', 'avons', 'avez', 'ont', 'etre', 'avoir',
      'fait', 'faire', 'fais', 'peux', 'peut', 'veux', 'veut', 'vouloir',
      'bien', 'tres', 'plus', 'moins', 'aussi', 'encore', 'deja', 'toujours',
      'oui', 'non', 'ok', 'merci', 'sil', 'plait', 'bonjour', 'bonsoir',
      'combien', 'comment', 'quand', 'pourquoi', 'quoi', 'quel', 'quelle',
    ]);

    // Extraire les mots significatifs
    const words = normalized.split(/\s+/).filter(word => 
      word.length >= 3 && !stopWords.has(word)
    );

    // Retirer les doublons et limiter
    return [...new Set(words)].slice(0, 10);
  }

  /**
   * Recherche un apprentissage similaire dans le cache ou l'API
   */
  async findSimilarLearning(userMessage: string): Promise<StoredLearning | null> {
    if (!this.projetId) return null;

    // D'abord chercher dans le cache local
    const keywords = this.extractKeywords(userMessage);
    const cacheKey = keywords.slice(0, 3).join('_');
    
    if (this.learningsCache.has(cacheKey)) {
      const cached = this.learningsCache.get(cacheKey)!;
      // Incrémenter le compteur d'utilisation en arrière-plan
      this.incrementUsageCount(cached.learning_id);
      return cached;
    }

    // Sinon, chercher via l'API
    try {
      const result = await apiClient.get<StoredLearning | null>('/agent-learnings/similar', {
        params: {
          projet_id: this.projetId,
          message: userMessage,
        },
      });

      if (result) {
        // Mettre en cache
        this.addToCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.warn('[LearningService] Erreur recherche apprentissage:', error);
      return null;
    }
  }

  /**
   * Ajoute un apprentissage au cache
   */
  private addToCache(key: string, learning: StoredLearning): void {
    // Vider le cache si trop grand
    if (this.learningsCache.size >= this.cacheMaxSize) {
      const firstKey = this.learningsCache.keys().next().value;
      if (firstKey) {
        this.learningsCache.delete(firstKey);
      }
    }
    this.learningsCache.set(key, learning);
  }

  /**
   * Incrémente le compteur d'utilisation (en arrière-plan)
   */
  private async incrementUsageCount(learningId: string): Promise<void> {
    // Fire and forget
    apiClient.post('/agent-learnings/success', {
      projet_id: this.projetId,
      user_message: '',
      intent: '',
    }).catch(() => { /* ignorer les erreurs */ });
  }

  /**
   * Enregistre un échec de compréhension
   */
  recordFailure(
    userMessage: string,
    detectedIntent?: string,
    errorMessage?: string
  ): void {
    // Chercher si ce type d'échec existe déjà
    const existingFailure = this.failures.find(
      (f) => f.userMessage.toLowerCase().trim() === userMessage.toLowerCase().trim()
    );

    if (existingFailure) {
      existingFailure.count++;
      existingFailure.timestamp = new Date().toISOString();
      if (errorMessage) {
        existingFailure.errorMessage = errorMessage;
      }
    } else {
      this.failures.push({
        userMessage,
        detectedIntent,
        errorMessage: errorMessage || 'Compréhension échouée',
        timestamp: new Date().toISOString(),
        count: 1,
      });

      // Garder seulement les N dernières erreurs
      if (this.failures.length > this.maxFailures) {
        this.failures.shift();
      }
    }

    // V3.0 - Enregistrer dans analytics
    if (detectedIntent) {
      this.recordIntentFailure(detectedIntent);
    }

    // V4.0 - Enregistrer dans l'API (en arrière-plan)
    if (this.projetId) {
      this.recordFailureToAPI(userMessage, detectedIntent);
    }
  }

  /**
   * Enregistre un échec dans l'API (V4.0)
   */
  private async recordFailureToAPI(userMessage: string, detectedIntent?: string): Promise<void> {
    if (!this.projetId) return;

    try {
      await apiClient.post('/agent-learnings/failure', {
        projet_id: this.projetId,
        user_message: userMessage,
        detected_intent: detectedIntent,
      });
    } catch (error) {
      // Ignorer silencieusement - c'est non critique
      console.warn('[LearningService] Erreur enregistrement échec:', error);
    }
  }

  /**
   * Enregistre un succès d'intention (V4.0 - Avec persistance API)
   */
  async recordIntentSuccess(
    intentType: string, 
    confidence: number, 
    userMessage?: string,
    params?: Record<string, any>
  ): Promise<void> {
    // Enregistrer localement
    if (!this.intentStats.has(intentType)) {
      this.intentStats.set(intentType, { successes: 0, failures: 0, totalConfidence: 0 });
    }

    const stats = this.intentStats.get(intentType)!;
    stats.successes++;
    stats.totalConfidence += confidence;

    // V4.0 - Enregistrer dans l'API (en arrière-plan)
    if (this.projetId && userMessage) {
      this.recordSuccessToAPI(userMessage, intentType, params, confidence);
    }
  }

  /**
   * Enregistre un succès dans l'API (V4.0)
   */
  private async recordSuccessToAPI(
    userMessage: string, 
    intent: string, 
    params?: Record<string, any>,
    confidence?: number
  ): Promise<void> {
    if (!this.projetId) return;

    try {
      await apiClient.post('/agent-learnings/success', {
        projet_id: this.projetId,
        user_message: userMessage,
        intent,
        params,
        confidence,
      });
    } catch (error) {
      // Ignorer silencieusement
      console.warn('[LearningService] Erreur enregistrement succès:', error);
    }
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
    if (!this.projetId) return;

    try {
      await apiClient.post('/agent-learnings/correction', {
        projet_id: this.projetId,
        original_message: originalMessage,
        detected_intent: detectedIntent,
        correct_intent: correctIntent,
        correct_params: correctParams,
      });

      // Vider le cache pour forcer un rechargement
      this.learningsCache.clear();
    } catch (error) {
      console.warn('[LearningService] Erreur enregistrement correction:', error);
    }
  }

  /**
   * Enregistre un message de conversation (V4.0)
   */
  async recordConversationMessage(
    role: 'user' | 'assistant',
    content: string,
    intent?: string,
    actionExecuted?: string,
    actionSuccess?: boolean
  ): Promise<void> {
    if (!this.projetId || !this.conversationId) return;

    try {
      await apiClient.post('/agent-learnings/conversation', {
        projet_id: this.projetId,
        conversation_id: this.conversationId,
        message_role: role,
        message_content: content,
        intent,
        action_executed: actionExecuted,
        action_success: actionSuccess,
      });
    } catch (error) {
      // Ignorer silencieusement
    }
  }

  /**
   * Enregistre un échec d'intention (V3.0 - Analytics)
   */
  private recordIntentFailure(intentType: string): void {
    if (!this.intentStats.has(intentType)) {
      this.intentStats.set(intentType, { successes: 0, failures: 0, totalConfidence: 0 });
    }

    const stats = this.intentStats.get(intentType)!;
    stats.failures++;
  }

  /**
   * Génère un message de clarification avec les mots-clés détectés (V4.0)
   */
  generateClarificationWithKeywords(userMessage: string, detectedIntent?: string): string {
    const keywords = this.extractKeywords(userMessage);
    
    if (keywords.length === 0) {
      return STANDARD_MISUNDERSTANDING_MESSAGE;
    }

    // Si des mots-clés sont détectés, les utiliser pour une clarification plus précise
    const keywordsList = keywords.slice(0, 4).join(', ');
    
    if (detectedIntent) {
      // On a une intention partielle
      return `J'ai compris que tu parles de "${keywordsList}", mais je ne suis pas sûr de ce que tu veux faire. Peux-tu préciser ?`;
    }

    // Pas d'intention détectée mais des mots-clés
    return `J'ai repéré les mots "${keywordsList}" mais je n'ai pas compris ta demande. Peux-tu reformuler ?`;
  }

  /**
   * Génère une suggestion éducative en cas d'échec (V4.0 - Amélioré)
   * Plus précis avec message standardisé et mots-clés
   */
  generateEducationalSuggestion(userMessage: string, detectedIntent?: string): EducationalSuggestion | null {
    const normalized = userMessage.toLowerCase().trim();
    const keywords = this.extractKeywords(userMessage);

    // V4.0 - Si une intention partielle est détectée, utiliser les mots-clés
    if (detectedIntent) {
      return this.getSuggestionForIntent(detectedIntent, userMessage, keywords);
    }

    // Détecter le type d'action probable depuis le message
    if (normalized.match(/\b(?:depense|dep|achete|paye|claque|bouffe|manger|provende)\b/i)) {
      return {
        userMessage,
        suggestedFormat: 'Dépense [catégorie] [montant]',
        explanation:
          this.generateClarificationWithKeywords(userMessage) + '\n\n' +
          'Si tu veux enregistrer une dépense, dis-moi : catégorie + montant\n' +
          'Exemples :\n' +
          '- "Dépense Aliment 100000"\n' +
          '- "Dépense bouffe 150k"',
      };
    }

    if (normalized.match(/\b(?:vendu|vente|j'ai vendu|vendre)\b/i)) {
      return {
        userMessage,
        suggestedFormat: 'Vente [nombre] porcs [montant]',
        explanation:
          this.generateClarificationWithKeywords(userMessage) + '\n\n' +
          'Si tu veux enregistrer une vente, dis-moi : nombre de porcs + montant\n' +
          'Exemples :\n' +
          '- "Vendu 5 porcs 800000"\n' +
          '- "Vente 3 porcs 500k"',
      };
    }

    if (normalized.match(/\b(?:peser|pesee|pese|fait|poids)\b/i)) {
      return {
        userMessage,
        suggestedFormat: 'Pesée [code animal] [poids] kg',
        explanation:
          this.generateClarificationWithKeywords(userMessage) + '\n\n' +
          'Si tu veux enregistrer une pesée, dis-moi : code animal + poids\n' +
          'Exemples :\n' +
          '- "Peser P001 45 kg"\n' +
          '- "P001 fait 50 kg"',
      };
    }

    if (normalized.match(/\b(?:vaccin|vacciner|vaccination|injecter)\b/i)) {
      return {
        userMessage,
        suggestedFormat: 'Vaccination [code animal ou lot]',
        explanation:
          this.generateClarificationWithKeywords(userMessage) + '\n\n' +
          'Si tu veux enregistrer une vaccination, dis-moi : code animal ou lot\n' +
          'Exemples :\n' +
          '- "Vacciner P001"\n' +
          '- "Vaccination porcelets"',
      };
    }

    if (normalized.match(/\b(?:statistique|bilan|combien|nombre|cheptel)\b/i)) {
      return {
        userMessage,
        suggestedFormat: 'Statistiques',
        explanation:
          this.generateClarificationWithKeywords(userMessage) + '\n\n' +
          'Pour voir des statistiques, dis simplement :\n' +
          '- "Statistiques"\n' +
          '- "Bilan"',
      };
    }

    if (normalized.match(/\b(?:stock|provende|aliment|nourriture)\b/i)) {
      return {
        userMessage,
        suggestedFormat: 'Stock',
        explanation:
          this.generateClarificationWithKeywords(userMessage) + '\n\n' +
          'Pour voir les stocks, dis simplement :\n' +
          '- "Stock"\n' +
          '- "Statut des stocks"',
      };
    }

    // V4.0 - Message standardisé avec mots-clés si disponibles
    if (keywords.length > 0) {
      return {
        userMessage,
        suggestedFormat: '[Action] [Paramètres]',
        explanation: this.generateClarificationWithKeywords(userMessage),
      };
    }

    // Message par défaut standardisé
    return {
      userMessage,
      suggestedFormat: '[Action] [Paramètres]',
      explanation: STANDARD_MISUNDERSTANDING_MESSAGE,
    };
  }

  /**
   * Génère une suggestion précise selon le type d'intention détecté (V4.0)
   */
  private getSuggestionForIntent(intentType: string, userMessage: string, keywords: string[]): EducationalSuggestion {
    const clarification = this.generateClarificationWithKeywords(userMessage, intentType);

    switch (intentType) {
      case 'create_depense':
        return {
          userMessage,
          suggestedFormat: 'Dépense [catégorie] [montant]',
          explanation:
            clarification + '\n\n' +
            'Pour une dépense, il me faut : catégorie + montant\n' +
            'Exemples : "Dépense Aliment 100000" ou "Dépense bouffe 150k"',
        };

      case 'create_revenu':
        return {
          userMessage,
          suggestedFormat: 'Vente [nombre] porcs [montant]',
          explanation:
            clarification + '\n\n' +
            'Pour une vente, il me faut : nombre de porcs + montant\n' +
            'Exemples : "Vendu 5 porcs 800000" ou "Vente 3 porcs 500k"',
        };

      case 'create_pesee':
        return {
          userMessage,
          suggestedFormat: 'Pesée [code animal] [poids] kg',
          explanation:
            clarification + '\n\n' +
            'Pour une pesée, il me faut : code animal + poids\n' +
            'Exemples : "Peser P001 45 kg" ou "P001 fait 50 kg"',
        };

      case 'create_vaccination':
        return {
          userMessage,
          suggestedFormat: 'Vaccination [code animal ou lot]',
          explanation:
            clarification + '\n\n' +
            'Pour une vaccination, il me faut : code animal ou lot\n' +
            'Exemples : "Vacciner P001" ou "Vaccination porcelets"',
        };

      case 'answer_knowledge_question':
        return {
          userMessage,
          suggestedFormat: 'Question sur [thème]',
          explanation:
            clarification + '\n\n' +
            'Pour des questions de formation, précise le sujet :\n' +
            '- "Comment vacciner mes porcs ?"\n' +
            '- "Quels types d\'élevage existent ?"',
        };

      default:
        return {
          userMessage,
          suggestedFormat: '[Action] [Paramètres]',
          explanation:
            clarification + '\n\n' +
            'Actions possibles :\n' +
            '• Dépenses : "Dépense Aliment 100000"\n' +
            '• Ventes : "Vendu 5 porcs 800000"\n' +
            '• Pesées : "Peser P001 45 kg"\n' +
            '• Statistiques : "Statistiques"',
        };
    }
  }

  /**
   * Retourne les patterns d'échecs fréquents
   */
  getFailurePatterns(): Array<{
    pattern: string;
    count: number;
    lastOccurrence: string;
  }> {
    // Grouper par pattern similaire (premiers mots)
    const patterns = new Map<string, { count: number; lastOccurrence: string }>();

    this.failures.forEach((failure) => {
      const words = failure.userMessage.toLowerCase().split(/\s+/).slice(0, 3); // 3 premiers mots
      const pattern = words.join(' ');

      const existing = patterns.get(pattern);
      if (existing) {
        existing.count += failure.count;
        if (new Date(failure.timestamp) > new Date(existing.lastOccurrence)) {
          existing.lastOccurrence = failure.timestamp;
        }
      } else {
        patterns.set(pattern, {
          count: failure.count,
          lastOccurrence: failure.timestamp,
        });
      }
    });

    return Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        lastOccurrence: data.lastOccurrence,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20
  }

  /**
   * Retourne tous les échecs enregistrés
   */
  getFailures(): LearningFailure[] {
    return [...this.failures];
  }

  /**
   * Réinitialise les échecs
   */
  resetFailures(): void {
    this.failures = [];
  }

  // ============================================
  // V3.0 - ANALYTICS LOCALE
  // ============================================

  /**
   * Récupère les statistiques d'intentions réussies/échouées par type
   */
  getIntentAnalytics(): Array<{
    intentType: string;
    successes: number;
    failures: number;
    successRate: number;
    averageConfidence: number;
  }> {
    return Array.from(this.intentStats.entries()).map(([intentType, stats]) => {
      const total = stats.successes + stats.failures;
      const successRate = total > 0 ? (stats.successes / total) * 100 : 0;
      const averageConfidence = stats.successes > 0 ? stats.totalConfidence / stats.successes : 0;

      return {
        intentType,
        successes: stats.successes,
        failures: stats.failures,
        successRate,
        averageConfidence,
      };
    });
  }

  /**
   * Récupère le rapport d'analytics
   */
  getAnalyticsReport(): string {
    const analytics = this.getIntentAnalytics().sort((a, b) => b.successes + b.failures - (a.successes + a.failures));

    if (analytics.length === 0) {
      return 'Aucune donnée d\'analytics disponible.';
    }

    const lines: string[] = [];
    lines.push('='.repeat(80));
    lines.push('RAPPORT D\'ANALYTICS DES INTENTIONS');
    lines.push('='.repeat(80));
    lines.push('');

    analytics.forEach((stat) => {
      lines.push(`📊 ${stat.intentType}:`);
      lines.push(`  ✅ Succès: ${stat.successes} | ❌ Échecs: ${stat.failures}`);
      lines.push(`  📈 Taux de succès: ${stat.successRate.toFixed(2)}%`);
      if (stat.averageConfidence > 0) {
        lines.push(`  🎯 Confiance moyenne: ${(stat.averageConfidence * 100).toFixed(2)}%`);
      }
      lines.push('');
    });

    lines.push('='.repeat(80));
    return lines.join('\n');
  }

  /**
   * Réinitialise les analytics
   */
  resetAnalytics(): void {
    this.intentStats.clear();
  }

  /**
   * Vide le cache des apprentissages
   */
  clearCache(): void {
    this.learningsCache.clear();
  }
}
