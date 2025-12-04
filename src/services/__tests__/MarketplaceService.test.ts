/**
 * Tests pour MarketplaceService
 */

import { MarketplaceService, getMarketplaceService } from '../MarketplaceService';
import {
  MarketplaceListingRepository,
  MarketplaceOfferRepository,
  MarketplaceTransactionRepository,
  MarketplaceRatingRepository,
  MarketplaceNotificationRepository,
} from '../../database/repositories';
import { getDatabase } from '../database';

jest.mock('../../database/repositories');
jest.mock('../database');

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };
    mockGetDatabase.mockResolvedValue(mockDb);

    // Mock repositories
    (MarketplaceListingRepository as jest.Mock).mockImplementation(() => ({
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByFarmId: jest.fn(),
      findByProducerId: jest.fn(),
      findBySubjectId: jest.fn(),
      findAvailable: jest.fn(),
      updateStatus: jest.fn(),
    }));

    (MarketplaceOfferRepository as jest.Mock).mockImplementation(() => ({
      create: jest.fn(),
      findById: jest.fn(),
      findByListingId: jest.fn(),
      findByBuyerId: jest.fn(),
      update: jest.fn(),
    }));

    (MarketplaceTransactionRepository as jest.Mock).mockImplementation(() => ({
      create: jest.fn(),
      findById: jest.fn(),
      findByBuyerId: jest.fn(),
      findByProducerId: jest.fn(),
      update: jest.fn(),
    }));

    (MarketplaceRatingRepository as jest.Mock).mockImplementation(() => ({
      create: jest.fn(),
      findByTransactionId: jest.fn(),
    }));

    (MarketplaceNotificationRepository as jest.Mock).mockImplementation(() => ({
      create: jest.fn(),
      findByUserId: jest.fn(),
    }));

    service = new MarketplaceService(mockDb);
  });

  describe('constructor', () => {
    it('devrait créer une instance avec les repositories', () => {
      expect(service).toBeInstanceOf(MarketplaceService);
      expect(MarketplaceListingRepository).toHaveBeenCalledWith(mockDb);
      expect(MarketplaceOfferRepository).toHaveBeenCalledWith(mockDb);
      expect(MarketplaceTransactionRepository).toHaveBeenCalledWith(mockDb);
    });
  });

  describe('createListing', () => {
    const mockListingData = {
      subjectId: 'animal-1',
      producerId: 'producer-1',
      farmId: 'farm-1',
      pricePerKg: 2000,
      weight: 100,
      lastWeightDate: '2024-01-01',
      location: {
        latitude: 10.0,
        longitude: 20.0,
        city: 'City',
        region: 'Region',
      },
    };

    it('devrait créer un listing avec succès', async () => {
      const mockListing = {
        id: 'listing-1',
        ...mockListingData,
        calculatedPrice: 200000,
        status: 'available',
        listedAt: '2024-01-01T00:00:00Z',
      };

      const listingRepo = (MarketplaceListingRepository as jest.Mock).mock.results[0].value;
      listingRepo.findByFarmId.mockResolvedValue([]);
      listingRepo.create.mockResolvedValue(mockListing);
      mockDb.runAsync.mockResolvedValue(undefined);

      const result = await service.createListing(mockListingData);

      expect(result).toEqual(mockListing);
      expect(listingRepo.create).toHaveBeenCalled();
    });

    it('devrait rejeter si le poids est nul ou négatif', async () => {
      const listingRepo = (MarketplaceListingRepository as jest.Mock).mock.results[0].value;
      listingRepo.findByFarmId.mockResolvedValue([]);

      await expect(service.createListing({ ...mockListingData, weight: 0 })).rejects.toThrow(
        'Impossible de mettre en vente un sujet dont le poids est nul ou négatif'
      );
    });

    it('devrait rejeter si le sujet est déjà en vente', async () => {
      const existingListing = {
        id: 'existing-1',
        subjectId: 'animal-1',
        status: 'available',
      };

      const listingRepo = (MarketplaceListingRepository as jest.Mock).mock.results[0].value;
      listingRepo.findByFarmId.mockResolvedValue([existingListing]);

      await expect(service.createListing(mockListingData)).rejects.toThrow('déjà en vente');
    });

    it('devrait calculer le prix total correctement', async () => {
      const mockListing = {
        id: 'listing-1',
        ...mockListingData,
        calculatedPrice: 200000,
        status: 'available',
      };

      const listingRepo = (MarketplaceListingRepository as jest.Mock).mock.results[0].value;
      listingRepo.findByFarmId.mockResolvedValue([]);
      listingRepo.create.mockResolvedValue(mockListing);
      mockDb.runAsync.mockResolvedValue(undefined);

      await service.createListing(mockListingData);

      expect(listingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          calculatedPrice: 200000, // 2000 * 100
        })
      );
    });
  });

  describe('getListingById', () => {
    it('devrait retourner un listing par ID', async () => {
      const mockListing = {
        id: 'listing-1',
        subjectId: 'animal-1',
        status: 'available',
      };

      const listingRepo = (MarketplaceListingRepository as jest.Mock).mock.results[0].value;
      listingRepo.findById.mockResolvedValue(mockListing);

      const result = await service.getListingById('listing-1');

      expect(result).toEqual(mockListing);
      expect(listingRepo.findById).toHaveBeenCalledWith('listing-1');
    });

    it('devrait lancer une erreur si le listing n\'existe pas', async () => {
      const listingRepo = (MarketplaceListingRepository as jest.Mock).mock.results[0].value;
      listingRepo.findById.mockResolvedValue(null);

      await expect(service.getListingById('non-existent')).rejects.toThrow('Listing introuvable');
    });
  });

  // Note: searchListings nécessite des imports dynamiques complexes
  // Les tests pour cette méthode nécessiteraient un setup plus complexe
  // Pour l'instant, on se concentre sur les méthodes de base

  describe('getMarketplaceService', () => {
    it('devrait retourner une instance singleton', async () => {
      const db = await getDatabase();
      const instance1 = getMarketplaceService(db);
      const instance2 = getMarketplaceService(db);

      expect(instance1).toBe(instance2);
    });
  });
});

