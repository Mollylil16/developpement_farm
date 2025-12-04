/**
 * Tests E2E pour le flux de production
 * 
 * Couvre:
 * - Ajout d'un animal
 * - Enregistrement d'une pesée
 * - Enregistrement d'une gestation
 * - Enregistrement d'une mortalité
 */

import { describe, it, expect } from '@jest/globals';
import { TEST_ANIMAL } from '../setup/fixtures';

describe('E2E: Flux Production', () => {
  describe('Ajout d\'un animal', () => {
    it('devrait permettre d\'ajouter un nouvel animal', async () => {
      // TODO: Implémenter avec Detox ou Maestro
      // 1. Naviguer vers l'écran de production
      // 2. Cliquer sur "Ajouter un animal"
      // 3. Remplir le formulaire avec TEST_ANIMAL
      // 4. Soumettre
      // 5. Vérifier que l'animal apparaît dans la liste
    });

    it('devrait valider les champs requis', async () => {
      // TODO: Tester la validation
    });
  });

  describe('Enregistrement d\'une pesée', () => {
    it('devrait permettre d\'enregistrer une pesée', async () => {
      // TODO: Implémenter
      // 1. Sélectionner un animal existant
      // 2. Cliquer sur "Ajouter une pesée"
      // 3. Remplir le formulaire (poids, date)
      // 4. Soumettre
      // 5. Vérifier que la pesée est enregistrée
    });
  });

  describe('Enregistrement d\'une gestation', () => {
    it('devrait permettre d\'enregistrer une gestation', async () => {
      // TODO: Implémenter
    });
  });

  describe('Enregistrement d\'une mortalité', () => {
    it('devrait permettre d\'enregistrer une mortalité', async () => {
      // TODO: Implémenter
    });
  });
});

