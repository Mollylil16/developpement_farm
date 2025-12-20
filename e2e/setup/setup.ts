/**
 * Configuration pour les tests E2E
 *
 * Ce fichier configure l'environnement de test E2E
 */

import { beforeAll, afterAll } from '@jest/globals';

beforeAll(async () => {
  // Configuration initiale avant tous les tests E2E
  // Exemple: Réinitialiser la base de données de test
  // await resetTestDatabase();
});

afterAll(async () => {
  // Nettoyage après tous les tests E2E
  // Exemple: Fermer les connexions, nettoyer les données
  // await cleanup();
});

// Configuration spécifique pour React Native E2E
export const E2E_CONFIG = {
  // Timeout pour les opérations E2E (plus long que les tests unitaires)
  timeout: 30000,

  // Configuration de la base de données de test
  testDatabase: {
    name: 'fermier_pro_test.db',
    resetBeforeEach: true,
  },

  // Configuration des mocks
  mocks: {
    // Désactiver les appels réseau réels
    disableNetwork: true,
    // Utiliser des données de test
    useTestData: true,
  },
};
