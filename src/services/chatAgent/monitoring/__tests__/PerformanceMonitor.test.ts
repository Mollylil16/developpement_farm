/**
 * Tests pour PerformanceMonitor
 * Vérifie les métriques de précision (precision, recall, F1-score)
 */

import { PerformanceMonitor } from '../PerformanceMonitor';
import { ChatMessage } from '../../../../types/chatAgent';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe('Métriques de précision', () => {
    it('devrait calculer correctement la précision avec des vrais positifs', () => {
      // Simuler des interactions avec prédictions correctes
      const message1: ChatMessage = {
        id: '1',
        role: 'user',
        content: 'J\'ai vendu 3 porcs à 750000 FCFA',
        timestamp: new Date().toISOString(),
      };

      const response1: ChatMessage = {
        id: '2',
        role: 'assistant',
        content: 'Vente enregistrée',
        timestamp: new Date().toISOString(),
        metadata: {
          actionExecuted: 'create_revenu',
          confidence: 0.95,
        },
      };

      monitor.recordInteraction(message1, response1, 100, 'create_revenu');

      const metrics = monitor.getPrecisionMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics!.precision).toBeGreaterThan(0);
      expect(metrics!.recall).toBeGreaterThan(0);
      expect(metrics!.f1Score).toBeGreaterThan(0);
    });

    it('devrait détecter les faux positifs', () => {
      const message: ChatMessage = {
        id: '1',
        role: 'user',
        content: 'Bonjour',
        timestamp: new Date().toISOString(),
      };

      const response: ChatMessage = {
        id: '2',
        role: 'assistant',
        content: 'Réponse',
        timestamp: new Date().toISOString(),
        metadata: {
          actionExecuted: 'create_revenu', // Fausse prédiction
          confidence: 0.8,
        },
      };

      // Pas d'intention réelle (null)
      monitor.recordInteraction(message, response, 100, undefined);

      const metrics = monitor.getPrecisionMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics!.falsePositives).toBeGreaterThan(0);
    });

    it('devrait détecter les faux négatifs', () => {
      const message: ChatMessage = {
        id: '1',
        role: 'user',
        content: 'J\'ai vendu 3 porcs',
        timestamp: new Date().toISOString(),
      };

      const response: ChatMessage = {
        id: '2',
        role: 'assistant',
        content: 'Je ne comprends pas',
        timestamp: new Date().toISOString(),
        // Pas de prédiction (null)
      };

      // Intention réelle présente
      monitor.recordInteraction(message, response, 100, 'create_revenu');

      const metrics = monitor.getPrecisionMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics!.falseNegatives).toBeGreaterThan(0);
    });

    it('devrait calculer correctement le F1-score', () => {
      // Simuler plusieurs interactions
      for (let i = 0; i < 10; i++) {
        const message: ChatMessage = {
          id: `msg-${i}`,
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date().toISOString(),
        };

        const response: ChatMessage = {
          id: `resp-${i}`,
          role: 'assistant',
          content: 'Réponse',
          timestamp: new Date().toISOString(),
          metadata: {
            actionExecuted: 'create_revenu',
            confidence: 0.9,
          },
        };

        monitor.recordInteraction(message, response, 100, 'create_revenu');
      }

      const metrics = monitor.getPrecisionMetrics();
      expect(metrics).not.toBeNull();
      
      if (metrics) {
        // F1-score devrait être entre 0 et 1
        expect(metrics.f1Score).toBeGreaterThanOrEqual(0);
        expect(metrics.f1Score).toBeLessThanOrEqual(1);
        
        // Si precision et recall sont élevés, F1 devrait être élevé aussi
        if (metrics.precision > 0.8 && metrics.recall > 0.8) {
          expect(metrics.f1Score).toBeGreaterThan(0.7);
        }
      }
    });

    it('devrait gérer les cas où il n\'y a pas de prédictions', () => {
      const metrics = monitor.getPrecisionMetrics();
      // Au début, pas de métriques
      expect(metrics).toBeNull();
    });

    it('devrait inclure les métriques de précision dans le rapport', () => {
      // Ajouter quelques interactions
      for (let i = 0; i < 5; i++) {
        const message: ChatMessage = {
          id: `msg-${i}`,
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date().toISOString(),
        };

        const response: ChatMessage = {
          id: `resp-${i}`,
          role: 'assistant',
          content: 'Réponse',
          timestamp: new Date().toISOString(),
          metadata: {
            actionExecuted: 'create_revenu',
            confidence: 0.9,
          },
        };

        monitor.recordInteraction(message, response, 100, 'create_revenu');
      }

      const report = monitor.generateReport();
      expect(report).toContain('MÉTRIQUES DE PRÉCISION');
      expect(report).toContain('Précision');
      expect(report).toContain('Rappel');
      expect(report).toContain('Score F1');
    });
  });

  describe('Résolution d\'anaphores', () => {
    // Note: Les tests d'anaphores sont dans ConversationContext, mais on peut vérifier
    // que les métriques sont bien enregistrées même avec des anaphores
    it('devrait enregistrer les interactions même avec des références', () => {
      const message: ChatMessage = {
        id: '1',
        role: 'user',
        content: 'Il a vendu 3 porcs', // Anaphore "il"
        timestamp: new Date().toISOString(),
      };

      const response: ChatMessage = {
        id: '2',
        role: 'assistant',
        content: 'Vente enregistrée',
        timestamp: new Date().toISOString(),
        metadata: {
          actionExecuted: 'create_revenu',
          confidence: 0.9,
        },
      };

      monitor.recordInteraction(message, response, 100, 'create_revenu');

      const metrics = monitor.getMetrics();
      expect(metrics.totalMessages).toBe(1);
      expect(metrics.successfulDetections).toBe(1);
    });
  });
});

