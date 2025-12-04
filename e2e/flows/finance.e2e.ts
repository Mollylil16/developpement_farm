/**
 * Tests E2E pour le flux financier
 * 
 * Couvre:
 * - Création d'une dépense
 * - Création d'un revenu
 * - Visualisation du bilan financier
 */

import { describe, it, expect } from '@jest/globals';
import { TEST_DEPENSE, TEST_REVENU } from '../setup/fixtures';

describe('E2E: Flux Finance', () => {
  describe('Création d\'une dépense', () => {
    it('devrait permettre de créer une dépense', async () => {
      // TODO: Implémenter avec Detox ou Maestro
      // 1. Naviguer vers l'écran Finance
      // 2. Cliquer sur "Ajouter une dépense"
      // 3. Remplir le formulaire avec TEST_DEPENSE
      // 4. Soumettre
      // 5. Vérifier que la dépense apparaît dans la liste
    });
  });

  describe('Création d\'un revenu', () => {
    it('devrait permettre de créer un revenu', async () => {
      // TODO: Implémenter
      // 1. Naviguer vers l'écran Finance
      // 2. Cliquer sur "Ajouter un revenu"
      // 3. Remplir le formulaire avec TEST_REVENU
      // 4. Soumettre
      // 5. Vérifier que le revenu apparaît dans la liste
    });
  });

  describe('Visualisation du bilan', () => {
    it('devrait afficher le bilan financier correctement', async () => {
      // TODO: Implémenter
      // 1. Naviguer vers l'écran Finance
      // 2. Vérifier que le bilan s'affiche
      // 3. Vérifier que les totaux sont corrects
    });
  });
});

