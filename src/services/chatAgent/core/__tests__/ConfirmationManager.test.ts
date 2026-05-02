/**
 * Tests unitaires pour ConfirmationManager
 */

import { ConfirmationManager } from '../ConfirmationManager';
import { AgentAction } from '../../../../types/chatAgent';

describe('ConfirmationManager', () => {
  let manager: ConfirmationManager;

  beforeEach(() => {
    manager = new ConfirmationManager();
  });

  describe('shouldConfirmAndExecute', () => {
    test('devrait exécuter automatiquement si confiance > 95%', () => {
      const action: AgentAction = {
        type: 'create_depense',
        params: { montant: 100000, categorie: 'alimentation' },
      };

      const decision = manager.shouldConfirmAndExecute(action, 0.98);
      expect(decision.requiresConfirmation).toBe(false);
      expect(decision.shouldExecute).toBe(true);
      expect(decision.message).toContain("C'est enregistré");
    });

    test('devrait exécuter avec correction légère si confiance 80-95%', () => {
      const action: AgentAction = {
        type: 'create_depense',
        params: { montant: 100000, categorie: 'alimentation' },
      };

      const decision = manager.shouldConfirmAndExecute(action, 0.85);
      expect(decision.requiresConfirmation).toBe(false);
      expect(decision.shouldExecute).toBe(true);
      expect(decision.message).toContain('Si c\'est pas ça');
    });

    test('devrait demander confirmation si confiance < 80%', () => {
      const action: AgentAction = {
        type: 'create_depense',
        params: { montant: 100000 },
      };

      const decision = manager.shouldConfirmAndExecute(action, 0.70);
      expect(decision.requiresConfirmation).toBe(true);
      expect(decision.shouldExecute).toBe(false);
    });

    test('devrait toujours demander confirmation pour cas critiques (montant > 5M)', () => {
      const action: AgentAction = {
        type: 'create_depense',
        params: { montant: 6000000 },
      };

      const decision = manager.shouldConfirmAndExecute(action, 0.98);
      expect(decision.requiresConfirmation).toBe(true);
      expect(decision.shouldExecute).toBe(false);
      expect(decision.message).toContain('Attention');
    });
  });

  describe('recordCorrection', () => {
    test('devrait enregistrer une correction', () => {
      manager.recordCorrection('bouffe', 'alimentation');
      const prefs = manager.getUserPreferences();
      expect(prefs.corrections.length).toBe(1);
    });

    test('devrait ajuster les seuils si beaucoup de corrections', () => {
      // Enregistrer 6 corrections récentes
      for (let i = 0; i < 6; i++) {
        manager.recordCorrection('test', 'corrigé');
      }

      const prefs = manager.getUserPreferences();
      expect(prefs.customThresholds?.highConfidence).toBe(0.97);
      expect(prefs.customThresholds?.mediumConfidence).toBe(0.85);
    });
  });
});

