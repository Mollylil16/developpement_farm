// Configuration globale pour les tests Jest
// Mock des variables d'environnement
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Augmenter le timeout pour les tests d'intégration
// @ts-ignore - jest est disponible globalement dans l'environnement Jest
jest.setTimeout(30000);
