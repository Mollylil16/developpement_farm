/**
 * Service d'apprentissage pour améliorer la compréhension
 * Gère les suggestions éducatives et le tracking des échecs
 */

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

/**
 * Service d'apprentissage pour l'assistant
 * V3.0 - Avec analytics locale
 */
export class LearningService {
  private failures: LearningFailure[] = [];
  private readonly maxFailures = 100;

  // V3.0 - Analytics locale : compteurs par type d'intention
  private intentStats: Map<string, { successes: number; failures: number; totalConfidence: number }> = new Map();

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
  }

  /**
   * Enregistre un succès d'intention (V3.0 - Analytics)
   */
  recordIntentSuccess(intentType: string, confidence: number): void {
    if (!this.intentStats.has(intentType)) {
      this.intentStats.set(intentType, { successes: 0, failures: 0, totalConfidence: 0 });
    }

    const stats = this.intentStats.get(intentType)!;
    stats.successes++;
    stats.totalConfidence += confidence;
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
   * Génère une suggestion éducative en cas d'échec (V3.0 - Amélioré)
   * Plus précis selon le type d'intention détecté partiellement
   */
  generateEducationalSuggestion(userMessage: string, detectedIntent?: string): EducationalSuggestion | null {
    const normalized = userMessage.toLowerCase().trim();

    // Si une intention partielle est détectée, donner une suggestion plus précise
    if (detectedIntent) {
      return this.getSuggestionForIntent(detectedIntent, userMessage);
    }

    // Sinon, détecter le type d'action probable depuis le message
    if (normalized.match(/\b(?:depense|dep|achete|paye|claque|bouffe|manger|provende)\b/i)) {
      return {
        userMessage,
        suggestedFormat: 'Dépense [catégorie] [montant]',
        explanation:
          'Désolé patron, je n\'ai pas capté tous les détails. Tu voulais enregistrer une dépense ? Dis-moi : catégorie + montant\n' +
          'Exemples :\n' +
          '- "Dépense Aliment 100000"\n' +
          '- "Dépense bouffe 150k"\n' +
          '- "J\'ai claqué 200000 en provende"',
      };
    }

    if (normalized.match(/\b(?:vendu|vente|j'ai vendu|vendre)\b/i)) {
      return {
        userMessage,
        suggestedFormat: 'Vente [nombre] porcs [montant]',
        explanation:
          'Désolé, je n\'ai pas bien compris. Tu voulais enregistrer une vente ? Dis-moi : nombre de porcs + montant\n' +
          'Exemples :\n' +
          '- "Vendu 5 porcs 800000"\n' +
          '- "Vente 3 porcs 500k"\n' +
          '- "J\'ai vendu 2 porcs à 400000 FCFA"',
      };
    }

    if (normalized.match(/\b(?:peser|pesee|pese|fait|poids)\b/i)) {
      return {
        userMessage,
        suggestedFormat: 'Pesée [code animal] [poids] kg',
        explanation:
          'Je n\'ai pas capté. Tu voulais enregistrer une pesée ? Dis-moi : code animal + poids\n' +
          'Exemples :\n' +
          '- "Peser P001 45 kg"\n' +
          '- "P001 fait 50 kg"\n' +
          '- "Pesée P002 60"',
      };
    }

    if (normalized.match(/\b(?:vaccin|vacciner|vaccination|injecter)\b/i)) {
      return {
        userMessage,
        suggestedFormat: 'Vaccination [code animal ou lot]',
        explanation:
          'Je n\'ai pas compris. Tu voulais enregistrer une vaccination ? Dis-moi : code animal ou lot\n' +
          'Exemples :\n' +
          '- "Vacciner P001"\n' +
          '- "Vaccination P002"\n' +
          '- "Vaccin porcelets demain"',
      };
    }

    if (normalized.match(/\b(?:statistique|bilan|combien|nombre|cheptel)\b/i)) {
      return {
        userMessage,
        suggestedFormat: 'Statistiques',
        explanation:
          'Tu voulais voir des statistiques ? Dis-moi simplement :\n' +
          '- "Statistiques"\n' +
          '- "Bilan"\n' +
          '- "Combien de porcs ?"',
      };
    }

    if (normalized.match(/\b(?:stock|provende|aliment|nourriture)\b/i)) {
      return {
        userMessage,
        suggestedFormat: 'Stock',
        explanation:
          'Tu voulais voir les stocks ? Dis-moi simplement :\n' +
          '- "Stock"\n' +
          '- "Statut des stocks"\n' +
          '- "Combien de provende ?"',
      };
    }

    // Suggestion générique améliorée
    return {
      userMessage,
      suggestedFormat: '[Action] [Paramètres]',
      explanation:
        'Désolé patron, je n\'ai pas capté. Peux-tu reformuler avec plus de détails ?\n\n' +
        'Exemples de phrases que je comprends bien :\n' +
        '• Dépenses : "Dépense Aliment 100000" ou "J\'ai claqué 150k en bouffe"\n' +
        '• Ventes : "Vendu 5 porcs 800000" ou "Vente 3 porcs 500k"\n' +
        '• Pesées : "Peser P001 45 kg" ou "P001 fait 50 kg"\n' +
        '• Vaccinations : "Vaccin P001" ou "Vaccination porcelets"\n' +
        '• Statistiques : "Statistiques" ou "Bilan"\n' +
        '• Stocks : "Stock" ou "Statut des stocks"',
    };
  }

  /**
   * Génère une suggestion précise selon le type d'intention détecté (V3.0)
   */
  private getSuggestionForIntent(intentType: string, userMessage: string): EducationalSuggestion {
    switch (intentType) {
      case 'create_depense':
        return {
          userMessage,
          suggestedFormat: 'Dépense [catégorie] [montant]',
          explanation:
            'J\'ai détecté que tu voulais enregistrer une dépense, mais il manque des informations.\n' +
            'Dis-moi : catégorie + montant\n' +
            'Exemples : "Dépense Aliment 100000" ou "Dépense bouffe 150k"',
        };

      case 'create_revenu':
        return {
          userMessage,
          suggestedFormat: 'Vente [nombre] porcs [montant]',
          explanation:
            'J\'ai détecté que tu voulais enregistrer une vente, mais il manque des informations.\n' +
            'Dis-moi : nombre de porcs + montant\n' +
            'Exemples : "Vendu 5 porcs 800000" ou "Vente 3 porcs 500k"',
        };

      case 'create_pesee':
        return {
          userMessage,
          suggestedFormat: 'Pesée [code animal] [poids] kg',
          explanation:
            'J\'ai détecté que tu voulais enregistrer une pesée, mais il manque des informations.\n' +
            'Dis-moi : code animal + poids\n' +
            'Exemples : "Peser P001 45 kg" ou "P001 fait 50 kg"',
        };

      case 'create_vaccination':
        return {
          userMessage,
          suggestedFormat: 'Vaccination [code animal ou lot]',
          explanation:
            'J\'ai détecté que tu voulais enregistrer une vaccination, mais il manque des informations.\n' +
            'Dis-moi : code animal ou lot\n' +
            'Exemples : "Vacciner P001" ou "Vaccination porcelets"',
        };

      default:
        return {
          userMessage,
          suggestedFormat: '[Action] [Paramètres]',
          explanation:
            `J'ai détecté une intention "${intentType}" mais il manque des paramètres.\n` +
            'Peux-tu reformuler avec plus de détails ?',
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
}

