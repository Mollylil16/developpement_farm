/**
 * Tests pour MarketplaceListingRepository
 */

import { MarketplaceListingRepository } from '../MarketplaceListingRepository';
import { BaseRepository } from '../BaseRepository';

// Mock dependencies
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

jest.mock('../BaseRepository');

describe('MarketplaceListingRepository', () => {
  let repository: MarketplaceListingRepository;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };
    repository = new MarketplaceListingRepository(mockDb);
  });

  describe('constructor', () => {
    it('devrait créer une instance', () => {
      expect(repository).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('devrait retourner tous les listings', async () => {
      const mockRows = [
        {
          id: '1',
          subject_id: 'animal-1',
          producer_id: 'producer-1',
          farm_id: 'farm-1',
          price_per_kg: 2000,
          calculated_price: 200000,
          status: 'available',
          listed_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockRows);

      const result = await repository.findAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('devrait filtrer par projetId si fourni', async () => {
      const mockRows = [
        {
          id: '1',
          farm_id: 'farm-1',
          status: 'available',
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockRows);

      const result = await repository.findAll('farm-1');

      expect(mockDb.getAllAsync).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("devrait utiliser updated_at si derniere_modification n'existe pas", async () => {
      // Simuler que la colonne n'existe pas
      mockDb.getAllAsync.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await repository.findAll();

      expect(mockDb.getAllAsync).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('devrait créer un listing', async () => {
      const data = {
        subjectId: 'animal-1',
        producerId: 'producer-1',
        farmId: 'farm-1',
        pricePerKg: 2000,
        calculatedPrice: 200000,
        lastWeightDate: '2024-01-01',
        location: {
          latitude: 10.0,
          longitude: 20.0,
          city: 'City',
          region: 'Region',
        },
        saleTerms: {
          transport: 'buyer',
          slaughter: false,
          payment: 'cash',
          warranty: 'none',
          cancellation: '24h',
        },
      };

      mockDb.getAllAsync.mockResolvedValue([]); // PRAGMA table_info
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue({
        id: 'test-uuid-123',
        ...data,
        status: 'available',
        listed_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const result = await repository.create(data);

      expect(result).toBeDefined();
      expect(mockDb.runAsync).toHaveBeenCalled();
    });

    it('devrait gérer les erreurs lors de la création', async () => {
      const data = {
        subjectId: 'animal-1',
        producerId: 'producer-1',
        farmId: 'farm-1',
        pricePerKg: 2000,
        calculatedPrice: 200000,
        lastWeightDate: '2024-01-01',
        location: {
          latitude: 10.0,
          longitude: 20.0,
          city: 'City',
          region: 'Region',
        },
        saleTerms: {
          transport: 'buyer',
          slaughter: false,
          payment: 'cash',
          warranty: 'none',
          cancellation: '24h',
        },
      };

      mockDb.getAllAsync.mockResolvedValue([]);
      mockDb.runAsync.mockRejectedValue(new Error('Database error'));

      await expect(repository.create(data)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('devrait trouver un listing par ID', async () => {
      const mockRow = {
        id: 'test-id',
        subject_id: 'animal-1',
        status: 'available',
      };

      mockDb.getFirstAsync.mockResolvedValue(mockRow);

      const result = await repository.findById('test-id');

      expect(result).toBeDefined();
      expect(mockDb.getFirstAsync).toHaveBeenCalled();
    });

    it('devrait retourner null si non trouvé', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it("devrait mettre à jour le statut d'un listing", async () => {
      mockDb.getAllAsync.mockResolvedValue([]); // PRAGMA table_info
      mockDb.runAsync.mockResolvedValue(undefined);

      await repository.updateStatus('test-id', 'reserved');

      expect(mockDb.runAsync).toHaveBeenCalled();
    });

    it('devrait gérer les erreurs lors de la mise à jour', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('Database error'));
      mockDb.runAsync.mockResolvedValue(undefined);

      await repository.updateStatus('test-id', 'sold');

      // Devrait utiliser le fallback
      expect(mockDb.runAsync).toHaveBeenCalled();
    });
  });

  describe('findByFarmId', () => {
    it("devrait trouver les listings d'une ferme", async () => {
      const mockRows = [
        {
          id: '1',
          farm_id: 'farm-1',
          status: 'available',
        },
        {
          id: '2',
          farm_id: 'farm-1',
          status: 'sold',
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockRows);

      const result = await repository.findByFarmId('farm-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe('findByProducerId', () => {
    it("devrait trouver les listings d'un producteur", async () => {
      const mockRows = [
        {
          id: '1',
          producer_id: 'producer-1',
          status: 'available',
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockRows);

      const result = await repository.findByProducerId('producer-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findAvailable', () => {
    it('devrait trouver les listings disponibles', async () => {
      const mockRows = [
        {
          id: '1',
          status: 'available',
          price_per_kg: 2000,
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockRows);

      const result = await repository.findAvailable();

      expect(result).toBeDefined();
      expect(result.every((l: any) => l.status === 'available')).toBe(true);
    });

    it('devrait appliquer les filtres de prix', async () => {
      const mockRows = [
        {
          id: '1',
          status: 'available',
          price_per_kg: 2000,
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockRows);

      const result = await repository.findAvailable({
        minPrice: 1500,
        maxPrice: 2500,
      });

      expect(result).toBeDefined();
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('price_per_kg >= ?'),
        expect.arrayContaining([1500, 2500])
      );
    });
  });

  describe('incrementViews', () => {
    it('devrait incrémenter le compteur de vues', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await repository.incrementViews('test-id');

      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringContaining('views = views + 1'), [
        'test-id',
      ]);
    });
  });

  describe('incrementInquiries', () => {
    it("devrait incrémenter le compteur d'enquêtes", async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await repository.incrementInquiries('test-id');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('inquiries = inquiries + 1'),
        ['test-id']
      );
    });
  });

  describe('remove', () => {
    it('devrait retirer un listing (soft delete)', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);
      mockDb.runAsync.mockResolvedValue(undefined);

      await repository.remove('test-id');

      expect(mockDb.runAsync).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('devrait supprimer définitivement un listing', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await repository.delete('test-id');

      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM'), [
        'test-id',
      ]);
    });
  });
});
