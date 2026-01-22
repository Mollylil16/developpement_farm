/**
 * Tests unitaires pour MarketplaceService
 * Priorité 1 : Tests critiques pour bugs corrigés et fonctionnalités à haut risque
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceService } from '../marketplace.service';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../common/services/cache.service';
import { NotificationsService } from '../notifications.service';
import { SaleAutomationService } from '../sale-automation.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateOfferDto } from '../dto/create-offer.dto';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let databaseService: jest.Mocked<DatabaseService>;
  let cacheService: jest.Mocked<CacheService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let saleAutomationService: jest.Mocked<SaleAutomationService>;

  // Mock data
  const mockListing = {
    id: 'listing_123',
    listing_type: 'batch',
    batch_id: 'batch_123',
    pig_ids: ['pig_1', 'pig_2', 'pig_3'],
    producer_id: 'producer_123',
    farm_id: 'farm_123',
    status: 'available',
    price_per_kg: 1500,
    calculated_price: 45000,
    weight: 30,
    pig_count: 3,
    listed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    views: 0,
    inquiries: 0,
    date_creation: new Date().toISOString(),
    derniere_modification: new Date().toISOString(),
  };

  // Les colonnes doivent correspondre aux alias SQL de la requête (ligne 990-999 marketplace.service.ts)
  const mockBatchPigs = [
    {
      id: 'pig_1',
      code: 'PIG001', // Alias SQL: bp.name as code
      nom: 'Porc 1', // Alias SQL: bp.name as nom
      race: null, // Alias SQL: NULL as race
      sexe: 'male', // Alias SQL: bp.sex as sexe
      date_naissance: '2024-01-01', // Alias SQL: bp.birth_date as date_naissance
      poids_initial: 30, // Alias SQL: bp.current_weight_kg as poids_initial
      categorie_poids: null, // Alias SQL: NULL as categorie_poids
      statut: 'vivant', // Alias SQL: 'vivant' as statut
      photo_uri: null, // Alias SQL: bp.photo_url as photo_uri
      derniere_pesee_poids: 30, // Alias SQL: bp.current_weight_kg as derniere_pesee_poids
      derniere_pesee_date: '2024-12-01', // Alias SQL: bp.last_weighing_date as derniere_pesee_date
    },
    {
      id: 'pig_2',
      code: 'PIG002',
      nom: 'Porc 2',
      race: null,
      sexe: 'female',
      date_naissance: '2024-01-02',
      poids_initial: 28,
      categorie_poids: null,
      statut: 'vivant',
      photo_uri: null,
      derniere_pesee_poids: 28,
      derniere_pesee_date: '2024-12-01',
    },
  ];

  beforeEach(async () => {
    // Créer les mocks
    const mockDatabaseService = {
      query: jest.fn(),
      transaction: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    const mockNotificationsService = {
      createNotification: jest.fn(),
    };

    const mockSaleAutomationService = {
      completeSale: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: SaleAutomationService,
          useValue: mockSaleAutomationService,
        },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
    databaseService = module.get(DatabaseService);
    cacheService = module.get(CacheService);
    notificationsService = module.get(NotificationsService);
    saleAutomationService = module.get(SaleAutomationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getListingSubjects', () => {
    it('devrait retourner les sujets pour un listing batch avec pig_ids JSONB', async () => {
      // Arrange : Simuler un listing batch avec pig_ids comme JSONB (array JavaScript)
      const listingId = 'listing_123';
      const mockListingData = {
        ...mockListing,
        pig_ids: ['pig_1', 'pig_2'], // Array JavaScript (comme retourné par pg)
      };

      databaseService.query
        .mockResolvedValueOnce({ rows: [mockListingData] }) // Listing trouvé
        .mockResolvedValueOnce({ rows: mockBatchPigs }); // Sujets trouvés dans batch_pigs

      cacheService.get.mockReturnValue(null); // Pas de cache

      // Act
      const result = await service.getListingSubjects(listingId);

      // Assert
      expect(result).toBeDefined();
      expect(result.listing).toBeDefined();
      expect(result.subjects).toHaveLength(2);
      expect(result.subjects[0].id).toBe('pig_1');
      expect(result.subjects[0].code).toBeDefined();
      expect(result.subjects[0].poids_initial).toBe(30);
      
      // Vérifier que la requête SQL utilise batch_pigs, pas production_animaux
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM batch_pigs'),
        expect.arrayContaining([['pig_1', 'pig_2']])
      );
    });

    it('devrait gérer pig_ids comme string JSON', async () => {
      // Arrange : pig_ids comme string JSON (cas rare mais possible)
      const listingId = 'listing_123';
      const mockListingData = {
        ...mockListing,
        pig_ids: JSON.stringify(['pig_1', 'pig_2']), // String JSON
      };

      databaseService.query
        .mockResolvedValueOnce({ rows: [mockListingData] })
        .mockResolvedValueOnce({ rows: mockBatchPigs });

      cacheService.get.mockReturnValue(null);

      // Act
      const result = await service.getListingSubjects(listingId);

      // Assert
      expect(result.subjects).toHaveLength(2);
    });

    it('devrait retourner un tableau vide si aucun pigId valide', async () => {
      // Arrange
      const listingId = 'listing_123';
      const mockListingData = {
        ...mockListing,
        pig_ids: [], // Array vide
      };

      databaseService.query.mockResolvedValueOnce({ rows: [mockListingData] });
      cacheService.get.mockReturnValue(null);

      // Act
      const result = await service.getListingSubjects(listingId);

      // Assert
      expect(result.subjects).toHaveLength(0);
    });

    it('devrait utiliser le cache si disponible', async () => {
      // Arrange
      const listingId = 'listing_123';
      const cachedData = {
        listing: mockListing,
        subjects: mockBatchPigs,
      };

      cacheService.get.mockReturnValue(cachedData);

      // Act
      const result = await service.getListingSubjects(listingId);

      // Assert
      expect(result.subjects).toHaveLength(2);
      expect(databaseService.query).not.toHaveBeenCalled(); // Cache utilisé
    });

    it('devrait lancer NotFoundException si listing non trouvé', async () => {
      // Arrange
      const listingId = 'listing_inexistant';
      // Le service fait 2 requêtes : une pour le listing, une pour vérifier si c'est un pigId
      databaseService.query
        .mockResolvedValueOnce({ rows: [] }) // Listing non trouvé
        .mockResolvedValueOnce({ rows: [] }); // pigId check (pas un pigId non plus)
      cacheService.get.mockReturnValue(null);

      // Act & Assert
      await expect(service.getListingSubjects(listingId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('devrait détecter si un pigId est passé au lieu d\'un listingId', async () => {
      // Arrange : Un pigId est passé par erreur
      const pigId = 'pig_123';
      databaseService.query
        .mockResolvedValueOnce({ rows: [] }) // Listing non trouvé
        .mockResolvedValueOnce({ rows: [{ id: pigId }] }); // Mais c'est un pigId

      cacheService.get.mockReturnValue(null);

      // Act & Assert
      await expect(service.getListingSubjects(pigId)).rejects.toThrow(
        NotFoundException
      );
      
      // Vérifier que la vérification pigId a été faite
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('production_animaux'),
        [pigId]
      );
    });
  });

  describe('getListingsWithSubjects', () => {
    it('devrait retourner plusieurs listings avec leurs sujets', async () => {
      // Arrange
      const listingIds = ['listing_1', 'listing_2'];
      const mockListing1 = { ...mockListing, id: 'listing_1' };
      const mockListing2 = { ...mockListing, id: 'listing_2', pig_ids: ['pig_3'] };

      // Mock getListingSubjects pour chaque listing
      jest.spyOn(service, 'getListingSubjects')
        .mockResolvedValueOnce({
          listing: mockListing1 as any,
          subjects: mockBatchPigs,
        })
        .mockResolvedValueOnce({
          listing: mockListing2 as any,
          subjects: [{ id: 'pig_3', name: 'Porc 3' }],
        });

      // Act
      const result = await service.getListingsWithSubjects(listingIds);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].subjects).toHaveLength(2);
      expect(result[1].subjects).toHaveLength(1);
    });

    it('devrait filtrer les listings qui échouent', async () => {
      // Arrange
      const listingIds = ['listing_1', 'listing_inexistant', 'listing_2'];

      jest.spyOn(service, 'getListingSubjects')
        .mockResolvedValueOnce({
          listing: mockListing as any,
          subjects: mockBatchPigs,
        })
        .mockRejectedValueOnce(new NotFoundException('Listing non trouvé'))
        .mockResolvedValueOnce({
          listing: mockListing as any,
          subjects: [],
        });

      // Act
      const result = await service.getListingsWithSubjects(listingIds);

      // Assert : Seuls les listings réussis sont retournés
      expect(result).toHaveLength(2);
    });
  });

  describe('createOffer', () => {
    const createOfferDto: CreateOfferDto = {
      listingId: 'listing_123',
      subjectIds: ['pig_1', 'pig_2'],
      buyerId: 'buyer_123', // Requis par le DTO
      proposedPrice: 40000,
      message: 'Offre test',
    };

    it('devrait créer une offre avec succès', async () => {
      // Arrange
      const userId = 'buyer_123';
      const mockOffer = {
        id: 'offer_123',
        listing_id: createOfferDto.listingId,
        subject_ids: createOfferDto.subjectIds,
        buyer_id: userId,
        producer_id: 'producer_123',
        proposed_price: createOfferDto.proposedPrice,
        original_price: 45000,
        status: 'pending',
      };

      // L'ordre des appels : 
      // 1. findOneListing SELECT (ligne 716)
      // 2. findOneListing UPDATE views (ligne 726)
      // 3. INSERT offer (ligne 1220)
      // 4. UPDATE inquiries (ligne 1248)
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ ...mockListing, calculated_price: 45000 }] }) // findOneListing SELECT
        .mockResolvedValueOnce({ rowCount: 1 }) // findOneListing UPDATE views
        .mockResolvedValueOnce({ rows: [mockOffer] }) // INSERT offer - RETURNS * donc rows[0]
        .mockResolvedValueOnce({ rowCount: 1 }); // UPDATE inquiries

      // Act
      const result = await service.createOffer(createOfferDto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('offer_123');
      expect(result.buyerId).toBe(userId);
      expect(databaseService.query).toHaveBeenCalledTimes(4); // findOneListing (2) + INSERT + UPDATE
    });

    it('devrait lancer ForbiddenException si l\'utilisateur est le producteur', async () => {
      // Arrange
      const userId = 'producer_123'; // Même ID que le producteur du listing

      // findOneListing fait 2 appels : SELECT puis UPDATE views
      // Le listing doit avoir calculated_price pour que mapRowToListing fonctionne
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ ...mockListing, producer_id: userId, calculated_price: 45000 }] }) // findOneListing SELECT
        .mockResolvedValueOnce({ rowCount: 1 }); // findOneListing UPDATE views

      // Act & Assert : Un seul appel pour vérifier à la fois le type et le message
      try {
        await service.createOffer(createOfferDto, userId);
        expect(true).toBe(false); // Ne devrait jamais arriver ici
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("Vous ne pouvez pas faire d'offre sur vos propres sujets");
      }
    });

    it('devrait lancer BadRequestException si le listing n\'est pas disponible', async () => {
      // Arrange
      const userId = 'buyer_123';
      const unavailableListing = {
        ...mockListing,
        status: 'sold', // Listing déjà vendu
      };

      // findOneListing fait 2 appels : SELECT puis UPDATE views
      // Le listing doit avoir calculated_price pour que mapRowToListing fonctionne
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ ...unavailableListing, calculated_price: 45000 }] }) // findOneListing SELECT
        .mockResolvedValueOnce({ rowCount: 1 }); // findOneListing UPDATE views

      // Act & Assert : Un seul appel pour vérifier à la fois le type et le message
      try {
        await service.createOffer(createOfferDto, userId);
        expect(true).toBe(false); // Ne devrait jamais arriver ici
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe("Cette annonce n'est plus disponible");
      }
    });

    it('devrait calculer expiresAt à 7 jours par défaut', async () => {
      // Arrange
      const userId = 'buyer_123';
      const mockOffer = {
        id: 'offer_123',
        listing_id: createOfferDto.listingId,
        buyer_id: userId,
        producer_id: 'producer_123',
        proposed_price: createOfferDto.proposedPrice,
        original_price: 45000,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // findOneListing fait 2 appels : SELECT puis UPDATE views
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ ...mockListing, calculated_price: 45000 }] }) // findOneListing SELECT
        .mockResolvedValueOnce({ rowCount: 1 }) // findOneListing UPDATE views
        .mockResolvedValueOnce({ rows: [mockOffer] }) // INSERT offer
        .mockResolvedValueOnce({ rowCount: 1 }); // UPDATE inquiries

      // Act
      await service.createOffer(createOfferDto, userId);

      // Assert : Vérifier que expiresAt est calculé à 7 jours
      // Le 3ème appel est INSERT offer (après findOneListing SELECT et UPDATE views)
      const insertCall = databaseService.query.mock.calls[2]; // Index 2 (0=SELECT, 1=UPDATE views, 2=INSERT)
      expect(insertCall[0]).toContain('INSERT INTO marketplace_offers');
      // Paramètres: id, listing_id, subject_ids, buyer_id, producer_id, proposed_price, original_price, message, status, terms_accepted, created_at, expires_at (index 11), date_recuperation_souhaitee, date_creation, derniere_modification
      const expiresAt = insertCall[1][11]; // expires_at est à l'index 11 (0-based)
      const expectedExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const expiresAtDate = new Date(expiresAt);
      expect(expiresAtDate.getTime()).toBeCloseTo(expectedExpiresAt.getTime(), -3); // Tolérance 1 seconde
    });
  });

  describe('acceptOffer', () => {
    it('devrait accepter une offre et créer une transaction', async () => {
      // Arrange
      const offerId = 'offer_123';
      const userId = 'producer_123';
      const mockOffer = {
        id: offerId,
        listing_id: 'listing_123',
        subject_ids: ['pig_1', 'pig_2'],
        buyer_id: 'buyer_123',
        producer_id: userId,
        proposed_price: 40000,
        original_price: 45000,
        status: 'pending',
      };

      const mockTransaction = {
        id: 'transaction_123',
        offer_id: offerId,
        listing_id: 'listing_123',
        buyer_id: 'buyer_123',
        producer_id: userId,
        final_price: 40000,
        status: 'confirmed',
      };

      // Mock transaction client
      const mockClient = {
        query: jest.fn(),
      };

      databaseService.query
        .mockResolvedValueOnce({ rows: [mockOffer] }) // Récupération offre
        .mockResolvedValueOnce({ rows: [mockListing] }); // findOneListing pour notification

      (databaseService.transaction as any) = jest.fn(async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
        return callback(mockClient);
      });

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE offre status
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE listing status
        .mockResolvedValueOnce({ rows: [mockTransaction] }); // INSERT transaction

      notificationsService.notifyOfferAccepted = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await service.acceptOffer(offerId, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('transaction_123');
      expect(databaseService.transaction).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledTimes(3);
    });

    it('devrait lancer ForbiddenException si l\'utilisateur n\'est pas le producteur', async () => {
      // Arrange
      const offerId = 'offer_123';
      const userId = 'buyer_123'; // Acheteur, pas producteur
      const mockOffer = {
        id: offerId,
        producer_id: 'producer_123', // Autre producteur
        status: 'pending',
      };

      databaseService.query.mockResolvedValueOnce({ rows: [mockOffer] });

      // Act & Assert
      await expect(service.acceptOffer(offerId, userId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('devrait lancer BadRequestException si l\'offre n\'est pas en attente', async () => {
      // Arrange
      const offerId = 'offer_123';
      const userId = 'producer_123';
      const mockOffer = {
        id: offerId,
        producer_id: userId,
        status: 'accepted', // Déjà acceptée
      };

      databaseService.query.mockResolvedValueOnce({ rows: [mockOffer] });

      // Act & Assert
      await expect(service.acceptOffer(offerId, userId)).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
