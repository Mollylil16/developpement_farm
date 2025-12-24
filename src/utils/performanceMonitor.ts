/**
 * Utilitaire simple de monitoring de performance
 * Permet de mesurer et logger les temps d'exécution de fonctions critiques
 */

import React from 'react';

type PerformanceMetric = {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
};

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Limiter le nombre de métriques en mémoire
  private enabled = __DEV__; // Activer seulement en développement par défaut

  /**
   * Active ou désactive le monitoring
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Mesure le temps d'exécution d'une fonction
   * @param name Nom de la métrique
   * @param fn Fonction à mesurer
   * @returns Résultat de la fonction
   */
  async measure<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(`${name} (error)`, duration, { error: String(error) });
      throw error;
    }
  }

  /**
   * Enregistre une métrique manuellement
   */
  recordMetric(name: string, duration: number, metadata?: Record<string, any>) {
    if (!this.enabled) return;

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Limiter le nombre de métriques en mémoire
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Logger si la durée est importante (>100ms)
    if (duration > 100) {
      console.warn(`[Performance] ⚠️ Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    } else if (__DEV__) {
      console.log(`[Performance] ✅ ${name}: ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Obtient toutes les métriques enregistrées
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Obtient les métriques filtrées par nom
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name);
  }

  /**
   * Calcule les statistiques pour une métrique donnée
   */
  getStats(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    total: number;
  } | null {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return null;

    const durations = metrics.map((m) => m.duration);
    const total = durations.reduce((sum, d) => sum + d, 0);
    const avg = total / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return { count: metrics.length, avg, min, max, total };
  }

  /**
   * Réinitialise toutes les métriques
   */
  clear() {
    this.metrics = [];
  }

  /**
   * Exporte les métriques au format JSON
   */
  export(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Affiche un rapport dans la console
   */
  printReport() {
    if (!this.enabled || this.metrics.length === 0) {
      console.log('[Performance] No metrics recorded');
      return;
    }

    console.group('[Performance Report]');
    console.log(`Total metrics: ${this.metrics.length}`);

    // Grouper par nom
    const grouped = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);

    Object.entries(grouped).forEach(([name, metrics]) => {
      const durations = metrics.map((m) => m.duration);
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      console.log(
        `${name}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms, count=${metrics.length}`
      );
    });

    console.groupEnd();
  }
}

// Instance singleton
export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook React pour mesurer le rendu d'un composant
 */
export function usePerformanceMeasure(componentName: string) {
  const renderStartRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    renderStartRef.current = performance.now();
    return () => {
      if (renderStartRef.current !== null) {
        const duration = performance.now() - renderStartRef.current;
        performanceMonitor.recordMetric(`${componentName} render`, duration);
      }
    };
  });
}

