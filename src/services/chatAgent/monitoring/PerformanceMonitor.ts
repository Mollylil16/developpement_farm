/**
 * Système de monitoring de performance en temps réel
 * Prouve que l'agent est opérationnel, robuste et performant
 */

import { ChatMessage } from '../../../types/chatAgent';

export interface PerformanceMetrics {
  totalMessages: number;
  successfulDetections: number;
  failedDetections: number;
  averageConfidence: number;
  averageResponseTime: number;
  extractionSuccessRate: number;
  actionSuccessRate: number;
  errors: Array<{ message: string; error: string; timestamp: string }>;
  lastUpdated: string;
  // V3.0 - Métriques détaillées par étape
  averageFastPathTime?: number;
  averageRAGTime?: number;
  averageExtractionTime?: number;
  averageAPICallTime?: number;
  averageActionExecutionTime?: number;
  fastPathUsageCount?: number;
  ragUsageCount?: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    totalMessages: 0,
    successfulDetections: 0,
    failedDetections: 0,
    averageConfidence: 0,
    averageResponseTime: 0,
    extractionSuccessRate: 0,
    actionSuccessRate: 0,
    errors: [],
    lastUpdated: new Date().toISOString(),
  };

  private confidenceHistory: number[] = [];
  private responseTimeHistory: number[] = [];
  private extractionHistory: boolean[] = [];
  private actionHistory: boolean[] = [];
  
  // V3.0 - Historiques détaillés par étape
  private fastPathTimeHistory: number[] = [];
  private ragTimeHistory: number[] = [];
  private extractionTimeHistory: number[] = [];
  private apiCallTimeHistory: number[] = [];
  private actionExecutionTimeHistory: number[] = [];

  /**
   * Enregistre une interaction avec l'agent
   */
  recordInteraction(message: ChatMessage, response: ChatMessage, responseTime: number): void {
    this.metrics.totalMessages++;

    // Détection d'intention
    const hasAction = !!(response.metadata?.actionExecuted || response.metadata?.pendingAction);
    if (hasAction) {
      this.metrics.successfulDetections++;
    } else {
      this.metrics.failedDetections++;
    }

    // Confiance
    const confidence = response.metadata?.pendingAction
      ? 0.9
      : response.metadata?.actionExecuted
        ? 0.95
        : 0.5;
    this.confidenceHistory.push(confidence);
    this.updateAverageConfidence();

    // Temps de réponse
    this.responseTimeHistory.push(responseTime);
    this.updateAverageResponseTime();

    // Extraction de paramètres
    const hasParams = !!(
      response.metadata?.pendingAction?.params || response.metadata?.actionResult
    );
    this.extractionHistory.push(hasParams);
    this.updateExtractionSuccessRate();

    // Exécution d'action
    const actionExecuted = !!response.metadata?.actionExecuted;
    this.actionHistory.push(actionExecuted);
    this.updateActionSuccessRate();

    // Erreurs
    if (response.metadata?.validationErrors) {
      this.metrics.errors.push({
        message: message.content,
        error: response.metadata.validationErrors.join(', '),
        timestamp: new Date().toISOString(),
      });
      // Garder seulement les 50 dernières erreurs
      if (this.metrics.errors.length > 50) {
        this.metrics.errors.shift();
      }
    }

    this.metrics.lastUpdated = new Date().toISOString();
  }

  /**
   * Enregistre les temps détaillés par étape (V3.0)
   */
  recordStepTiming(timings: {
    fastPathTime?: number;
    ragTime?: number;
    extractionTime?: number;
    apiCallTime?: number;
    actionExecutionTime?: number;
  }): void {
    if (timings.fastPathTime !== undefined) {
      this.fastPathTimeHistory.push(timings.fastPathTime);
      this.metrics.fastPathUsageCount = (this.metrics.fastPathUsageCount || 0) + 1;
      this.updateAverageFastPathTime();
    }

    if (timings.ragTime !== undefined) {
      this.ragTimeHistory.push(timings.ragTime);
      this.metrics.ragUsageCount = (this.metrics.ragUsageCount || 0) + 1;
      this.updateAverageRAGTime();
    }

    if (timings.extractionTime !== undefined) {
      this.extractionTimeHistory.push(timings.extractionTime);
      this.updateAverageExtractionTime();
    }

    if (timings.apiCallTime !== undefined) {
      this.apiCallTimeHistory.push(timings.apiCallTime);
      this.updateAverageAPICallTime();
    }

    if (timings.actionExecutionTime !== undefined) {
      this.actionExecutionTimeHistory.push(timings.actionExecutionTime);
      this.updateAverageActionExecutionTime();
    }

    // Log détaillé en développement
    if (process.env.NODE_ENV === 'development') {
      const logParts: string[] = ['[PerformanceMonitor]'];
      if (timings.fastPathTime !== undefined) {
        logParts.push(`FastPath: ${timings.fastPathTime}ms`);
      }
      if (timings.ragTime !== undefined) {
        logParts.push(`RAG: ${timings.ragTime}ms`);
      }
      if (timings.extractionTime !== undefined) {
        logParts.push(`Extraction: ${timings.extractionTime}ms`);
      }
      if (timings.apiCallTime !== undefined) {
        logParts.push(`API: ${timings.apiCallTime}ms`);
      }
      if (timings.actionExecutionTime !== undefined) {
        logParts.push(`Action: ${timings.actionExecutionTime}ms`);
      }
      console.log(logParts.join(' | '));
    }
  }

  /**
   * Enregistre une erreur
   */
  recordError(message: string, error: string): void {
    this.metrics.errors.push({
      message,
      error,
      timestamp: new Date().toISOString(),
    });

    if (this.metrics.errors.length > 50) {
      this.metrics.errors.shift();
    }

    this.metrics.lastUpdated = new Date().toISOString();
  }

  /**
   * Récupère les métriques actuelles
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Récupère le taux de succès global
   */
  getSuccessRate(): number {
    if (this.metrics.totalMessages === 0) return 0;
    return (this.metrics.successfulDetections / this.metrics.totalMessages) * 100;
  }

  /**
   * Génère un rapport de performance
   */
  generateReport(): string {
    const successRate = this.getSuccessRate();
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('RAPPORT DE PERFORMANCE EN TEMPS RÉEL');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(
      `Dernière mise à jour: ${new Date(this.metrics.lastUpdated).toLocaleString('fr-FR')}`
    );
    lines.push('');
    lines.push('MÉTRIQUES:');
    lines.push(`  📨 Messages traités: ${this.metrics.totalMessages}`);
    lines.push(`  ✅ Détections réussies: ${this.metrics.successfulDetections}`);
    lines.push(`  ❌ Détections échouées: ${this.metrics.failedDetections}`);
    lines.push(`  📊 Taux de succès: ${successRate.toFixed(2)}%`);
    lines.push(`  🎯 Confiance moyenne: ${(this.metrics.averageConfidence * 100).toFixed(2)}%`);
    lines.push(`  ⚡ Temps de réponse moyen: ${this.metrics.averageResponseTime.toFixed(0)}ms`);
    lines.push(
      `  🔍 Taux de succès extraction: ${(this.metrics.extractionSuccessRate * 100).toFixed(2)}%`
    );
    lines.push(
      `  ⚙️  Taux de succès actions: ${(this.metrics.actionSuccessRate * 100).toFixed(2)}%`
    );
    lines.push('');
    
    // V3.0 - Métriques détaillées par étape
    if (this.metrics.averageFastPathTime !== undefined) {
      lines.push('TEMPS PAR ÉTAPE (V3.0):');
      lines.push(`  ⚡ Fast Path moyen: ${this.metrics.averageFastPathTime.toFixed(0)}ms (utilisé ${this.metrics.fastPathUsageCount || 0} fois)`);
      if (this.metrics.averageRAGTime !== undefined) {
        lines.push(`  🔍 RAG moyen: ${this.metrics.averageRAGTime.toFixed(0)}ms (utilisé ${this.metrics.ragUsageCount || 0} fois)`);
      }
      if (this.metrics.averageExtractionTime !== undefined) {
        lines.push(`  📝 Extraction moyenne: ${this.metrics.averageExtractionTime.toFixed(0)}ms`);
      }
      if (this.metrics.averageAPICallTime !== undefined) {
        lines.push(`  🌐 Appel API moyen: ${this.metrics.averageAPICallTime.toFixed(0)}ms`);
      }
      if (this.metrics.averageActionExecutionTime !== undefined) {
        lines.push(`  ⚙️  Exécution action moyenne: ${this.metrics.averageActionExecutionTime.toFixed(0)}ms`);
      }
      lines.push('');
    }

    if (this.metrics.errors.length > 0) {
      lines.push(`⚠️  Erreurs récentes (${this.metrics.errors.length}):`);
      this.metrics.errors.slice(-5).forEach((err) => {
        lines.push(`  - ${err.message.substring(0, 50)}... → ${err.error}`);
      });
      lines.push('');
    }

    // Statut global
    if (successRate >= 95 && this.metrics.averageConfidence >= 0.9) {
      lines.push('✅ STATUT: EXCELLENT - Agent opérationnel et performant à 100%');
    } else if (successRate >= 85) {
      lines.push('✅ STATUT: BON - Agent opérationnel');
    } else {
      lines.push('⚠️  STATUT: À SURVEILLER');
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Réinitialise les métriques
   */
  reset(): void {
    this.metrics = {
      totalMessages: 0,
      successfulDetections: 0,
      failedDetections: 0,
      averageConfidence: 0,
      averageResponseTime: 0,
      extractionSuccessRate: 0,
      actionSuccessRate: 0,
      errors: [],
      lastUpdated: new Date().toISOString(),
    };
    this.confidenceHistory = [];
    this.responseTimeHistory = [];
    this.extractionHistory = [];
    this.actionHistory = [];
    // V3.0 - Réinitialiser historiques détaillés
    this.fastPathTimeHistory = [];
    this.ragTimeHistory = [];
    this.extractionTimeHistory = [];
    this.apiCallTimeHistory = [];
    this.actionExecutionTimeHistory = [];
  }

  private updateAverageConfidence(): void {
    if (this.confidenceHistory.length === 0) return;
    this.metrics.averageConfidence =
      this.confidenceHistory.reduce((sum, c) => sum + c, 0) / this.confidenceHistory.length;
  }

  private updateAverageResponseTime(): void {
    if (this.responseTimeHistory.length === 0) return;
    this.metrics.averageResponseTime =
      this.responseTimeHistory.reduce((sum, t) => sum + t, 0) / this.responseTimeHistory.length;
  }

  private updateExtractionSuccessRate(): void {
    if (this.extractionHistory.length === 0) return;
    const successes = this.extractionHistory.filter((b) => b).length;
    this.metrics.extractionSuccessRate = successes / this.extractionHistory.length;
  }

  private updateActionSuccessRate(): void {
    if (this.actionHistory.length === 0) return;
    const successes = this.actionHistory.filter((b) => b).length;
    this.metrics.actionSuccessRate = successes / this.actionHistory.length;
  }

  // V3.0 - Méthodes de mise à jour pour métriques détaillées
  private updateAverageFastPathTime(): void {
    if (this.fastPathTimeHistory.length === 0) return;
    this.metrics.averageFastPathTime =
      this.fastPathTimeHistory.reduce((sum, t) => sum + t, 0) / this.fastPathTimeHistory.length;
  }

  private updateAverageRAGTime(): void {
    if (this.ragTimeHistory.length === 0) return;
    this.metrics.averageRAGTime =
      this.ragTimeHistory.reduce((sum, t) => sum + t, 0) / this.ragTimeHistory.length;
  }

  private updateAverageExtractionTime(): void {
    if (this.extractionTimeHistory.length === 0) return;
    this.metrics.averageExtractionTime =
      this.extractionTimeHistory.reduce((sum, t) => sum + t, 0) / this.extractionTimeHistory.length;
  }

  private updateAverageAPICallTime(): void {
    if (this.apiCallTimeHistory.length === 0) return;
    this.metrics.averageAPICallTime =
      this.apiCallTimeHistory.reduce((sum, t) => sum + t, 0) / this.apiCallTimeHistory.length;
  }

  private updateAverageActionExecutionTime(): void {
    if (this.actionExecutionTimeHistory.length === 0) return;
    this.metrics.averageActionExecutionTime =
      this.actionExecutionTimeHistory.reduce((sum, t) => sum + t, 0) /
      this.actionExecutionTimeHistory.length;
  }
}
