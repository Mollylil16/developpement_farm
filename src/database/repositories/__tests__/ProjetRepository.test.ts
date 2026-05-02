/**
 * Tests pour ProjetRepository
 *
 * Repository critique pour la gestion des projets
 */

import { ProjetRepository } from '../ProjetRepository';
import type { Projet, CreateProjetInput } from '../../../types/projet';
import * as SQLite from 'expo-sqlite';

// Mocks
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

jest.mock('../../../services/ProjetInitializationService', () => ({
  ProjetInitializationService: jest.fn().mockImplementation(() => ({
    createAnimauxInitials: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('ProjetRepository', () => {
  let repository: ProjetRepository;
  let mockDb: jest.Mocked<SQLite.SQLiteDatabase>;

  const mockProjet: Projet = {
    id: 'projet-1',
    nom: 'Ferme Test',
    localisation: 'Test Location',
    nombre_truies: 10,
    nombre_verrats: 2,
    nombre_porcelets: 50,
    poids_moyen_actuel: 80,
    age_moyen_actuel: 120,
    prix_kg_vif: 2000,
    prix_kg_carcasse: 2500,
    notes: 'Test notes',
    statut: 'actif',
    proprietaire_id: 'user-1',
    duree_amortissement_par_defaut_mois: 60,
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

    repository = new ProjetRepository(mockDb);
  });

  describe('constructor', () => {
    it('devrait créer une instance', () => {
      expect(repository).toBeDefined();
    });
  });

  describe('create', () => {
    it('devrait créer un projet', async () => {
      // Créer un projet sans animaux initiaux pour éviter l'import dynamique
      const input: CreateProjetInput & { proprietaire_id: string } = {
        nom: 'Ferme Test',
        localisation: 'Test Location',
        nombre_truies: 0,
        nombre_verrats: 0,
        nombre_porcelets: 0,
        poids_moyen_actuel: 80,
        age_moyen_actuel: 120,
        proprietaire_id: 'user-1',
      };

      mockDb.getFirstAsync.mockImplementation((sql: string) => {
        if (sql.includes('WHERE id = ?')) {
          return Promise.resolve({
            ...mockProjet,
            id: 'projet_1234567890_abc123',
            nombre_truies: 0,
            nombre_verrats: 0,
            nombre_porcelets: 0,
          } as any);
        }
        return Promise.resolve(null);
      });

      const result = await repository.create(input);

      expect(mockDb.runAsync).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result).toHaveProperty('nom', 'Ferme Test');
      expect(result).toHaveProperty('statut', 'actif');
    });
  });

  describe('findById', () => {
    it('devrait trouver un projet par son ID', async () => {
      const id = 'projet-1';
      mockDb.getFirstAsync.mockResolvedValueOnce(mockProjet as any);

      const result = await repository.findById(id);

      expect(mockDb.getFirstAsync).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.id).toBe(id);
    });

    it("devrait retourner null si le projet n'existe pas", async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);

      const result = await repository.findById('projet-inexistant');

      expect(result).toBeNull();
    });
  });

  describe('getById', () => {
    it('devrait retourner un projet existant', async () => {
      const id = 'projet-1';
      mockDb.getFirstAsync.mockResolvedValueOnce(mockProjet as any);

      const result = await repository.getById(id);

      expect(result).toBeDefined();
      expect(result.id).toBe(id);
    });

    it("devrait lancer une erreur si le projet n'existe pas", async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);

      await expect(repository.getById('projet-inexistant')).rejects.toThrow();
    });
  });

  describe('findAllByUserId', () => {
    it("devrait trouver tous les projets d'un utilisateur", async () => {
      const userId = 'user-1';
      const mockProjets = [
        { ...mockProjet, id: 'projet-1' },
        { ...mockProjet, id: 'projet-2' },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockProjets as any);

      const result = await repository.findAllByUserId(userId);

      expect(mockDb.getAllAsync).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('devrait retourner un tableau vide si aucun projet trouvé', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await repository.findAllByUserId('user-inexistant');

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('devrait mettre à jour un projet', async () => {
      const id = 'projet-1';
      const updates: Partial<Projet> = {
        nom: 'Ferme Modifiée',
        nombre_truies: 15,
      };

      mockDb.getFirstAsync.mockImplementation((sql: string) => {
        if (sql.includes('WHERE id = ?')) {
          return Promise.resolve({
            ...mockProjet,
            nom: 'Ferme Modifiée',
            nombre_truies: 15,
          } as any);
        }
        return Promise.resolve(null);
      });

      const result = await repository.update(id, updates);

      expect(mockDb.runAsync).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.nom).toBe('Ferme Modifiée');
      expect(result.nombre_truies).toBe(15);
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs lors de la création', async () => {
      mockDb.runAsync.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        repository.create({
          nom: 'Ferme Test',
          localisation: 'Test',
          nombre_truies: 10,
          nombre_verrats: 2,
          nombre_porcelets: 50,
          proprietaire_id: 'user-1',
        })
      ).rejects.toThrow('Database error');
    });

    it('devrait gérer les erreurs lors de la recherche', async () => {
      mockDb.getAllAsync.mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.findAllByUserId('user-1')).rejects.toThrow('Database error');
    });
  });
});
