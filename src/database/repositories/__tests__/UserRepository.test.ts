/**
 * Tests pour UserRepository
 *
 * Repository critique pour la gestion des utilisateurs
 */

import { UserRepository } from '../UserRepository';
import type { User } from '../../../types/auth';
import * as SQLite from 'expo-sqlite';

// Mocks
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockDb: jest.Mocked<SQLite.SQLiteDatabase>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    telephone: '+1234567890',
    nom: 'Doe',
    prenom: 'John',
    photo: null,
    roles: {
      producer: true,
      buyer: false,
      vet: false,
      tech: false,
    },
    activeRole: 'producer',
    isOnboarded: true,
    onboardingCompletedAt: '2024-01-01T00:00:00Z',
    date_creation: '2024-01-01T00:00:00Z',
    derniere_modification: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    } as any;

    repository = new UserRepository(mockDb);
  });

  describe('constructor', () => {
    it('devrait créer une instance', () => {
      expect(repository).toBeDefined();
    });
  });

  describe('create', () => {
    it('devrait créer un utilisateur avec email', async () => {
      const input = {
        email: 'test@example.com',
        nom: 'Doe',
        prenom: 'John',
      };

      // Mock pour vérifier l'email existant (retourne null = n'existe pas)
      mockDb.getFirstAsync.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('email = ?')) {
          return Promise.resolve(null);
        }
        if (sql.includes('WHERE id = ?')) {
          return Promise.resolve({
            ...mockUser,
            email: 'test@example.com',
          } as any);
        }
        return Promise.resolve(null);
      });

      const result = await repository.create(input);

      expect(mockDb.runAsync).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('devrait créer un utilisateur avec téléphone', async () => {
      const input = {
        telephone: '+1234567890',
        nom: 'Doe',
        prenom: 'John',
      };

      mockDb.getFirstAsync.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('telephone = ?')) {
          return Promise.resolve(null);
        }
        if (sql.includes('WHERE id = ?')) {
          return Promise.resolve({
            ...mockUser,
            telephone: '+1234567890',
          } as any);
        }
        return Promise.resolve(null);
      });

      const result = await repository.create(input);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('telephone', '+1234567890');
    });

    it('devrait rejeter si ni email ni téléphone fourni', async () => {
      const input = {
        nom: 'Doe',
        prenom: 'John',
      };

      await expect(repository.create(input as any)).rejects.toThrow(
        'Email ou numéro de téléphone requis'
      );
    });

    it("devrait rejeter si l'email existe déjà", async () => {
      const input = {
        email: 'existing@example.com',
        nom: 'Doe',
        prenom: 'John',
      };

      mockDb.getFirstAsync.mockResolvedValueOnce({ id: 'existing-user' } as any);

      await expect(repository.create(input)).rejects.toThrow(
        'Un compte existe déjà avec cet email'
      );
    });
  });

  describe('findByEmail', () => {
    it('devrait trouver un utilisateur par email', async () => {
      const email = 'test@example.com';
      mockDb.getFirstAsync.mockResolvedValueOnce(mockUser as any);

      const result = await repository.findByEmail(email);

      expect(mockDb.getFirstAsync).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.email).toBe(email);
    });

    it("devrait retourner null si l'utilisateur n'existe pas", async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByTelephone', () => {
    it('devrait trouver un utilisateur par téléphone', async () => {
      const telephone = '+1234567890';
      mockDb.getFirstAsync.mockResolvedValueOnce(mockUser as any);

      const result = await repository.findByTelephone(telephone);

      expect(mockDb.getFirstAsync).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.telephone).toBe(telephone);
    });
  });

  describe('update', () => {
    it('devrait mettre à jour un utilisateur', async () => {
      const id = 'user-1';
      const updates = {
        nom: 'Smith',
        prenom: 'Jane',
      };

      mockDb.getFirstAsync.mockImplementation((sql: string) => {
        if (sql.includes('WHERE id = ?')) {
          return Promise.resolve({
            ...mockUser,
            nom: 'Smith',
            prenom: 'Jane',
          } as any);
        }
        return Promise.resolve(null);
      });

      const result = await repository.update(id, updates);

      expect(mockDb.runAsync).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.nom).toBe('Smith');
      expect(result.prenom).toBe('Jane');
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs lors de la création', async () => {
      mockDb.runAsync.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        repository.create({
          email: 'test@example.com',
          nom: 'Doe',
          prenom: 'John',
        })
      ).rejects.toThrow('Database error');
    });

    it('devrait gérer les erreurs lors de la recherche', async () => {
      mockDb.getFirstAsync.mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.findByEmail('test@example.com')).rejects.toThrow('Database error');
    });
  });
});
