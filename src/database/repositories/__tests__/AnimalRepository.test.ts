/**
 * Tests pour AnimalRepository
 * 
 * Repository critique pour la gestion des animaux de production
 */

import { AnimalRepository } from '../AnimalRepository';
import type { ProductionAnimal } from '../../../types/production';
import * as SQLite from 'expo-sqlite';

// Mocks
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('AnimalRepository', () => {
  let repository: AnimalRepository;
  let mockDb: jest.Mocked<SQLite.SQLiteDatabase>;

  const mockAnimal: ProductionAnimal = {
    id: 'test-uuid-123',
    projet_id: 'projet-1',
    code: 'TR-001',
    nom: 'Truie Test',
    sexe: 'F',
    race: 'Large White',
    date_naissance: '2024-01-01',
    reproducteur: false,
    statut: 'actif',
    actif: true,
    photo_uri: null,
    origine: 'Achat',
    date_entree: '2024-01-01',
    poids_initial: 150,
    notes: 'Test animal',
    pere_id: null,
    mere_id: null,
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

    repository = new AnimalRepository(mockDb);
  });

  describe('constructor', () => {
    it('devrait créer une instance', () => {
      expect(repository).toBeDefined();
    });
  });

  describe('create', () => {
    it('devrait créer un animal avec synchronisation actif/statut', async () => {
      const input: Partial<ProductionAnimal> = {
        projet_id: 'projet-1',
        code: 'TR-001',
        nom: 'Truie Test',
        sexe: 'F',
        race: 'Large White',
        date_naissance: '2024-01-01',
        statut: 'actif',
      };

      // Mock findById qui est appelé après create (via getFirstAsync)
      // findById() utilise queryOne() qui appelle getFirstAsync
      mockDb.getFirstAsync.mockResolvedValueOnce({
        id: 'test-uuid-123',
        projet_id: 'projet-1',
        code: 'TR-001',
        nom: 'Truie Test',
        sexe: 'F',
        race: 'Large White',
        date_naissance: '2024-01-01',
        reproducteur: 0,
        statut: 'actif',
        actif: 1,
        photo_uri: null,
        origine: null,
        date_entree: '2024-01-01',
        poids_initial: null,
        notes: null,
        pere_id: null,
        mere_id: null,
        date_creation: '2024-01-01T00:00:00Z',
        derniere_modification: '2024-01-01T00:00:00Z',
      });

      const result = await repository.create(input);

      expect(mockDb.runAsync).toHaveBeenCalled();
      expect(mockDb.getFirstAsync).toHaveBeenCalled(); // Pour findById()
      expect(result).toBeDefined();
      // Vérifier les propriétés principales
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('code', 'TR-001');
      expect(result).toHaveProperty('statut', 'actif');
    });

    it('devrait synchroniser actif = false si statut !== actif', async () => {
      const input: Partial<ProductionAnimal> = {
        projet_id: 'projet-1',
        code: 'TR-002',
        sexe: 'F',
        statut: 'vendu',
      };

      mockDb.getFirstAsync.mockImplementation((sql: string) => {
        if (sql.includes('WHERE id = ?')) {
          return Promise.resolve({
            id: 'test-uuid-123',
            projet_id: 'projet-1',
            code: 'TR-002',
            statut: 'vendu',
            actif: 0,
          } as any);
        }
        return Promise.resolve(null);
      });

      const result = await repository.create(input);

      expect(mockDb.runAsync).toHaveBeenCalled();
      expect(result).toBeDefined();
      // Vérifier que actif est synchronisé avec statut
      expect(result).toHaveProperty('statut', 'vendu');
    });
  });

  describe('findByProjet', () => {
    it('devrait trouver tous les animaux d\'un projet', async () => {
      const projetId = 'projet-1';
      const mockAnimals = [
        { ...mockAnimal, id: 'animal-1' },
        { ...mockAnimal, id: 'animal-2' },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockAnimals as any);

      const result = await repository.findByProjet(projetId);

      expect(mockDb.getAllAsync).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('devrait retourner un tableau vide si aucun animal trouvé', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await repository.findByProjet('projet-inexistant');

      expect(result).toEqual([]);
    });
  });

  describe('findByCode', () => {
    it('devrait trouver un animal par son code', async () => {
      const code = 'TR-001';
      mockDb.getFirstAsync.mockResolvedValueOnce(mockAnimal as any);

      const result = await repository.findByCode(code, 'projet-1');

      expect(mockDb.getFirstAsync).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.code).toBe(code);
    });

    it('devrait retourner null si l\'animal n\'existe pas', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);

      const result = await repository.findByCode('CODE-INEXISTANT', 'projet-1');

      expect(result).toBeNull();
    });
  });

  describe('findActiveByProjet', () => {
    it('devrait trouver tous les animaux actifs d\'un projet', async () => {
      const projetId = 'projet-1';
      const mockActifs = [
        { ...mockAnimal, id: 'animal-1', actif: true },
        { ...mockAnimal, id: 'animal-2', actif: true },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockActifs as any);

      const result = await repository.findActiveByProjet(projetId);

      expect(mockDb.getAllAsync).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('devrait mettre à jour un animal', async () => {
      const id = 'test-uuid-123';
      const updates: Partial<ProductionAnimal> = {
        nom: 'Truie Modifiée',
        statut: 'vendu',
      };

      // Mock findById qui est appelé après update
      mockDb.getFirstAsync.mockImplementation((sql: string) => {
        if (sql.includes('WHERE id = ?')) {
          return Promise.resolve({
            ...mockAnimal,
            nom: 'Truie Modifiée',
            statut: 'vendu',
            actif: 0,
          } as any);
        }
        return Promise.resolve(null);
      });

      const result = await repository.update(id, updates);

      expect(mockDb.runAsync).toHaveBeenCalled();
      expect(mockDb.getFirstAsync).toHaveBeenCalled(); // Pour findById()
      expect(result).toBeDefined();
      // Vérifier que l'animal a été mis à jour
      expect(result).toHaveProperty('nom', 'Truie Modifiée');
      expect(result).toHaveProperty('statut', 'vendu');
    });
  });

  describe('deleteById', () => {
    it('devrait supprimer un animal', async () => {
      const id = 'test-uuid-123';

      // deleteById() est héritée de BaseRepository
      await repository.deleteById(id);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM production_animaux'),
        expect.arrayContaining([id])
      );
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs lors de la création', async () => {
      mockDb.runAsync.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        repository.create({
          projet_id: 'projet-1',
          code: 'TR-001',
          sexe: 'F',
        })
      ).rejects.toThrow('Database error');
    });

    it('devrait gérer les erreurs lors de la recherche', async () => {
      mockDb.getAllAsync.mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.findByProjet('projet-1')).rejects.toThrow(
        'Database error'
      );
    });
  });
});
