/**
 * Tests pour FinanceRepository
 * 
 * Repository critique pour la gestion des finances (revenus, dépenses, charges fixes)
 */

import { RevenuRepository, DepensePonctuelleRepository, ChargeFixeRepository } from '../FinanceRepository';
import type { Revenu, DepensePonctuelle, ChargeFixe } from '../../../types/finance';
import * as SQLite from 'expo-sqlite';

// Mocks
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('FinanceRepository', () => {
  let revenuRepo: RevenuRepository;
  let depenseRepo: DepensePonctuelleRepository;
  let chargeFixeRepo: ChargeFixeRepository;
  let mockDb: jest.Mocked<SQLite.SQLiteDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    } as any;

    revenuRepo = new RevenuRepository(mockDb);
    depenseRepo = new DepensePonctuelleRepository(mockDb);
    chargeFixeRepo = new ChargeFixeRepository(mockDb);
  });

  describe('RevenuRepository', () => {
    describe('constructor', () => {
      it('devrait créer une instance', () => {
        expect(revenuRepo).toBeDefined();
      });
    });

    describe('create', () => {
      it('devrait créer un revenu', async () => {
        const input: Partial<Revenu> = {
          projet_id: 'projet-1',
          montant: 150000,
          categorie: 'vente_animaux',
          date: '2024-01-01',
          poids_kg: 100,
        };

        mockDb.getFirstAsync.mockImplementation((sql: string) => {
          if (sql.includes('WHERE id = ?')) {
            return Promise.resolve({
              id: 'test-uuid-123',
              projet_id: 'projet-1',
              montant: 150000,
              categorie: 'vente_animaux',
              date: '2024-01-01',
              poids_kg: 100,
              photos: null,
            } as any);
          }
          return Promise.resolve(null);
        });

        const result = await revenuRepo.create(input);

        expect(mockDb.runAsync).toHaveBeenCalled();
        expect(result).toBeDefined();
        expect(result).toHaveProperty('montant', 150000);
      });
    });

    describe('findByProjet', () => {
      it('devrait trouver tous les revenus d\'un projet', async () => {
        const projetId = 'projet-1';
        const mockRevenus = [
          { id: 'rev-1', projet_id: projetId, montant: 100000 },
          { id: 'rev-2', projet_id: projetId, montant: 200000 },
        ];

        mockDb.getAllAsync.mockResolvedValue(mockRevenus as any);

        const result = await revenuRepo.findByProjet(projetId);

        expect(mockDb.getAllAsync).toHaveBeenCalled();
        expect(result).toHaveLength(2);
      });
    });
  });

  describe('DepensePonctuelleRepository', () => {
    describe('constructor', () => {
      it('devrait créer une instance', () => {
        expect(depenseRepo).toBeDefined();
      });
    });

    describe('create', () => {
      it('devrait créer une dépense', async () => {
        const input: Partial<DepensePonctuelle> = {
          projet_id: 'projet-1',
          montant: 50000,
          type: 'aliment',
          date: '2024-01-01',
          opex: true,
        };

        mockDb.getFirstAsync.mockImplementation((sql: string) => {
          if (sql.includes('WHERE id = ?')) {
            return Promise.resolve({
              id: 'test-uuid-123',
              projet_id: 'projet-1',
              montant: 50000,
              type: 'aliment',
              date: '2024-01-01',
              opex: 1,
            } as any);
          }
          return Promise.resolve(null);
        });

        const result = await depenseRepo.create(input);

        expect(mockDb.runAsync).toHaveBeenCalled();
        expect(result).toBeDefined();
        expect(result).toHaveProperty('montant', 50000);
      });
    });
  });

  describe('ChargeFixeRepository', () => {
    describe('constructor', () => {
      it('devrait créer une instance', () => {
        expect(chargeFixeRepo).toBeDefined();
      });
    });

    describe('create', () => {
      it('devrait créer une charge fixe', async () => {
        const input: Partial<ChargeFixe> = {
          projet_id: 'projet-1',
          nom: 'Loyer',
          montant_mensuel: 50000,
          statut: 'actif',
        };

        mockDb.getFirstAsync.mockImplementation((sql: string) => {
          if (sql.includes('WHERE id = ?')) {
            return Promise.resolve({
              id: 'test-uuid-123',
              projet_id: 'projet-1',
              nom: 'Loyer',
              montant_mensuel: 50000,
              statut: 'actif',
            } as any);
          }
          return Promise.resolve(null);
        });

        const result = await chargeFixeRepo.create(input);

        expect(mockDb.runAsync).toHaveBeenCalled();
        expect(result).toBeDefined();
        expect(result).toHaveProperty('nom', 'Loyer');
      });
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs lors de la création d\'un revenu', async () => {
      mockDb.runAsync.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        revenuRepo.create({
          projet_id: 'projet-1',
          montant: 100000,
        })
      ).rejects.toThrow('Database error');
    });

    it('devrait gérer les erreurs lors de la création d\'une dépense', async () => {
      mockDb.runAsync.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        depenseRepo.create({
          projet_id: 'projet-1',
          montant: 50000,
        })
      ).rejects.toThrow('Database error');
    });
  });
});

