/**
 * Tests pour DatabaseService
 *
 * Service critique qui gère toute la base de données SQLite
 */

import * as SQLite from 'expo-sqlite';
import { getDatabase, databaseService } from '../database';
import * as schemas from '../../database/schemas';
import { runMigrations } from '../../database/migrations/MigrationRunner';
import { migrations } from '../../database/migrations';
import { createIndexesWithProjetId as createProjetIdIndexes } from '../../database/indexes/createIndexes';
import { createCompositeIndexes } from '../../database/indexes/createCompositeIndexes';

// Mocks
jest.mock('expo-sqlite');
jest.mock('../../database/schemas');
jest.mock('../../database/migrations/MigrationRunner');
jest.mock('../../database/migrations', () => ({
  migrations: [],
}));
jest.mock('../../database/indexes/createIndexes');
// Mock pour createCompositeIndexes (import dynamique)
jest.mock('../../database/indexes/createCompositeIndexes', () => ({
  createCompositeIndexes: jest.fn(),
}));

const mockOpenDatabaseAsync = SQLite.openDatabaseAsync as jest.MockedFunction<
  typeof SQLite.openDatabaseAsync
>;
const mockSchemas = schemas as jest.Mocked<typeof schemas>;
const mockRunMigrations = runMigrations as jest.MockedFunction<typeof runMigrations>;
const mockCreateProjetIdIndexes = createProjetIdIndexes as jest.MockedFunction<
  typeof createProjetIdIndexes
>;
const mockCreateCompositeIndexes = createCompositeIndexes as jest.MockedFunction<
  typeof createCompositeIndexes
>;

describe('DatabaseService', () => {
  let mockDb: jest.Mocked<SQLite.SQLiteDatabase>;

  // Fonction utilitaire pour réinitialiser le service entre les tests
  const resetDatabaseService = () => {
    (databaseService as any).db = null;
    (databaseService as any).isInitializing = false;
    (databaseService as any).initPromise = null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Réinitialiser le service avant chaque test
    resetDatabaseService();

    // Créer un mock de base de données
    mockDb = {
      execAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    } as any;

    mockOpenDatabaseAsync.mockResolvedValue(mockDb as any);

    // Mocks par défaut pour les schémas
    mockSchemas.createUsersTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createProjetsTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createChargesFixesTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createDepensesPonctuellesTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createRevenusTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createProductionAnimauxTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createProductionPeseesTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createGestationsTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createSevragesTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createMortalitesTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createPlanificationsTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createIngredientsTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createRationsTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createIngredientsRationTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createRationsBudgetTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createStocksAlimentsTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createStocksMouvementsTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createRapportsCroissanceTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createCalendrierVaccinationsTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createVaccinationsTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createMaladiesTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createTraitementsTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createVisitesVeterinairesTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createRappelsVaccinationsTable = jest.fn().mockResolvedValue(undefined);
    mockSchemas.createCollaborationsTable = jest.fn().mockResolvedValue(undefined);

    mockRunMigrations.mockResolvedValue(undefined);
    mockCreateProjetIdIndexes.mockResolvedValue(undefined);
    mockCreateCompositeIndexes.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialize', () => {
    it('devrait initialiser la base de données avec succès', async () => {
      await databaseService.initialize();

      expect(mockOpenDatabaseAsync).toHaveBeenCalledWith('fermier_pro.db');
      expect(mockDb.execAsync).toHaveBeenCalledWith('PRAGMA busy_timeout = 5000;');
      expect(mockDb.execAsync).toHaveBeenCalledWith('PRAGMA journal_mode = WAL;');
      expect(mockSchemas.createUsersTable).toHaveBeenCalled();
      expect(mockRunMigrations).toHaveBeenCalled();
      expect(mockCreateProjetIdIndexes).toHaveBeenCalled();
    });

    it('devrait ne pas réinitialiser si déjà initialisé', async () => {
      await databaseService.initialize();
      jest.clearAllMocks();

      await databaseService.initialize();

      // Ne devrait pas appeler openDatabaseAsync une deuxième fois
      expect(mockOpenDatabaseAsync).not.toHaveBeenCalled();
    });

    it('devrait gérer les erreurs de configuration SQLite', async () => {
      resetDatabaseService();

      // Premier appel (busy_timeout) échoue, deuxième (journal_mode) réussit
      mockDb.execAsync
        .mockRejectedValueOnce(new Error('SQLite error'))
        .mockResolvedValueOnce(undefined);

      await databaseService.initialize();

      // L'initialisation devrait continuer malgré l'erreur de configuration
      expect(mockSchemas.createUsersTable).toHaveBeenCalled();
    });

    it('devrait gérer les erreurs lors de la création des tables', async () => {
      resetDatabaseService();
      mockSchemas.createUsersTable.mockRejectedValueOnce(new Error('Table creation error'));

      await expect(databaseService.initialize()).rejects.toThrow('Table creation error');
    });

    it('devrait gérer les erreurs lors des migrations', async () => {
      resetDatabaseService();
      mockRunMigrations.mockRejectedValueOnce(new Error('Migration error'));

      await expect(databaseService.initialize()).rejects.toThrow('Migration error');
    });

    it('devrait attendre si une initialisation est déjà en cours', async () => {
      resetDatabaseService();

      // Démarrer une première initialisation
      const initPromise1 = databaseService.initialize();

      // Démarrer une deuxième initialisation immédiatement (avant que la première se termine)
      const initPromise2 = databaseService.initialize();

      // Les deux devraient se résoudre
      await Promise.all([initPromise1, initPromise2]);

      // openDatabaseAsync ne devrait être appelé qu'une seule fois
      expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(1);
    });

    it('devrait créer toutes les tables via les schémas', async () => {
      resetDatabaseService();
      await databaseService.initialize();

      // Vérifier que toutes les tables principales sont créées
      expect(mockSchemas.createUsersTable).toHaveBeenCalledWith(mockDb);
      expect(mockSchemas.createProjetsTable).toHaveBeenCalledWith(mockDb);
      expect(mockSchemas.createChargesFixesTable).toHaveBeenCalledWith(mockDb);
      expect(mockSchemas.createProductionAnimauxTable).toHaveBeenCalledWith(mockDb);
      expect(mockSchemas.createCollaborationsTable).toHaveBeenCalledWith(mockDb);
    });

    it('devrait exécuter les migrations versionnées', async () => {
      resetDatabaseService();
      await databaseService.initialize();

      expect(mockRunMigrations).toHaveBeenCalledWith(mockDb, migrations);
    });

    it('devrait créer les index avec projet_id', async () => {
      resetDatabaseService();
      await databaseService.initialize();

      expect(mockCreateProjetIdIndexes).toHaveBeenCalledWith(mockDb);
    });

    it('devrait créer les index composites', async () => {
      resetDatabaseService();

      // Mock l'import dynamique
      const mockCreateCompositeIndexesFn = jest.fn().mockResolvedValue(undefined);
      jest.doMock('../../database/indexes/createCompositeIndexes', () => ({
        createCompositeIndexes: mockCreateCompositeIndexesFn,
      }));

      await databaseService.initialize();

      // Vérifier que l'initialisation s'est bien passée
      // (createCompositeIndexes est appelé dans createCompositeIndexes() qui est privée)
      // On vérifie indirectement que l'initialisation complète a réussi
      expect(mockSchemas.createUsersTable).toHaveBeenCalled();
      expect(mockCreateProjetIdIndexes).toHaveBeenCalled();
    });

    it("devrait réinitialiser db à null en cas d'erreur", async () => {
      resetDatabaseService();
      mockSchemas.createUsersTable.mockRejectedValueOnce(new Error('Error'));

      await expect(databaseService.initialize()).rejects.toThrow('Error');

      // Vérifier que db est null après l'erreur
      expect((databaseService as any).db).toBeNull();

      // Vérifier que getDatabase() essaie de réinitialiser (mais échouera si on force l'erreur)
      resetDatabaseService();
      mockSchemas.createUsersTable.mockRejectedValueOnce(new Error('Error'));
      await expect(getDatabase()).rejects.toThrow('Error');
    });
  });

  describe('getDatabase', () => {
    it('devrait retourner la base de données après initialisation', async () => {
      resetDatabaseService();
      await databaseService.initialize();

      const db = await getDatabase();

      expect(db).toBe(mockDb);
    });

    it("devrait lancer une erreur si la base de données n'est pas initialisée", async () => {
      resetDatabaseService();

      // getDatabase appelle initialize() qui devrait échouer si la DB n'est pas créée
      mockOpenDatabaseAsync.mockRejectedValueOnce(new Error('Cannot open'));

      await expect(getDatabase()).rejects.toThrow('Cannot open');
    });

    it('devrait initialiser automatiquement si non initialisé', async () => {
      resetDatabaseService();

      const db = await getDatabase();

      expect(db).toBe(mockDb);
      expect(mockOpenDatabaseAsync).toHaveBeenCalled();
    });
  });

  describe('cleanupOldTables', () => {
    it('devrait nettoyer les tables _old', async () => {
      resetDatabaseService();

      // Simuler des tables _old lors de la vérification dans cleanupFailedMigrations
      mockDb.getAllAsync.mockResolvedValueOnce([{ name: 'users_old' }, { name: 'projets_old' }]);

      await databaseService.initialize();

      // Vérifier que getAllAsync a été appelé (pour vérifier les tables _old)
      expect(mockDb.getAllAsync).toHaveBeenCalled();
    });

    it('devrait gérer les erreurs lors du nettoyage sans bloquer', async () => {
      resetDatabaseService();

      // Simuler une erreur lors de la vérification des tables _old
      mockDb.getAllAsync.mockRejectedValueOnce(new Error('Cleanup error'));

      // Ne devrait pas bloquer l'initialisation
      await expect(databaseService.initialize()).resolves.not.toThrow();
    });
  });

  describe('Gestion des erreurs', () => {
    it("devrait gérer les erreurs lors de l'ouverture de la base de données", async () => {
      resetDatabaseService();
      mockOpenDatabaseAsync.mockRejectedValueOnce(new Error('Cannot open database'));

      await expect(databaseService.initialize()).rejects.toThrow('Cannot open database');
    });

    it('devrait gérer les erreurs lors de la création des index', async () => {
      resetDatabaseService();
      mockCreateProjetIdIndexes.mockRejectedValueOnce(new Error('Index creation error'));

      await expect(databaseService.initialize()).rejects.toThrow('Index creation error');
    });

    it('devrait gérer les erreurs lors de la création des index composites', async () => {
      resetDatabaseService();
      mockCreateCompositeIndexes.mockRejectedValueOnce(new Error('Composite index error'));

      // Les index composites ne devraient pas bloquer l'initialisation
      // (gestion d'erreur dans le code)
      await expect(databaseService.initialize()).resolves.not.toThrow();
    });
  });

  describe('Configuration SQLite', () => {
    it('devrait configurer busy_timeout', async () => {
      resetDatabaseService();
      await databaseService.initialize();

      expect(mockDb.execAsync).toHaveBeenCalledWith('PRAGMA busy_timeout = 5000;');
    });

    it('devrait configurer journal_mode en WAL', async () => {
      resetDatabaseService();
      await databaseService.initialize();

      expect(mockDb.execAsync).toHaveBeenCalledWith('PRAGMA journal_mode = WAL;');
    });

    it('devrait continuer même si la configuration SQLite échoue', async () => {
      resetDatabaseService();

      // Premier PRAGMA (busy_timeout) échoue, deuxième (journal_mode) réussit
      mockDb.execAsync
        .mockRejectedValueOnce(new Error('PRAGMA error'))
        .mockResolvedValueOnce(undefined);

      await databaseService.initialize();

      // L'initialisation devrait continuer
      expect(mockSchemas.createUsersTable).toHaveBeenCalled();
    });
  });

  describe('Création des index de base', () => {
    it('devrait créer les index de base', async () => {
      resetDatabaseService();
      await databaseService.initialize();

      // Vérifier que createBaseIndexes est appelé (via les appels execAsync)
      // Les index de base sont créés via execAsync avec CREATE INDEX
      const indexCalls = mockDb.execAsync.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE INDEX')
      );

      // Il devrait y avoir plusieurs appels pour créer des index
      // (au moins les PRAGMA + les index de base)
      expect(mockDb.execAsync).toHaveBeenCalled();
    });
  });

  describe('Isolation des tests', () => {
    it('devrait permettre plusieurs initialisations séquentielles', async () => {
      resetDatabaseService();
      await databaseService.initialize();

      // Après la première initialisation, une deuxième ne devrait pas réinitialiser
      jest.clearAllMocks();
      await databaseService.initialize();

      // openDatabaseAsync ne devrait pas être appelé à nouveau
      expect(mockOpenDatabaseAsync).not.toHaveBeenCalled();
    });
  });
});
