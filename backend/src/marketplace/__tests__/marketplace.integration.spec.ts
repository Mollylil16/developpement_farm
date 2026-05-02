/**
 * Tests d'intégration pour MarketplaceService
 * Teste le flux complet : Création listing → Offre → Acceptation → Transaction
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceService } from '../marketplace.service';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../common/services/cache.service';
import { NotificationsService } from '../notifications.service';
import { SaleAutomationService } from '../sale-automation.service';
import { CreateBatchListingDto } from '../dto/create-batch-listing.dto';
import { CreateOfferDto } from '../dto/create-offer.dto';

describe('MarketplaceService - Tests d\'intégration', () => {
  let service: MarketplaceService;
  let databaseService: jest.Mocked<DatabaseService>;
  let cacheService: jest.Mocked<CacheService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let saleAutomationService: jest.Mocked<SaleAutomationService>;

  // Données de test
  const producerId = 'producer_123';
  const buyerId = 'buyer_123';
  const farmId = 'farm_123';
  const batchId = 'batch_123';
  const pigIds = ['pig_1', 'pig_2', 'pig_3'];

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
    {
      id: 'pig_3',
      code: 'PIG003',
      nom: 'Porc 3',
      race: null,
      sexe: 'male',
      date_naissance: '2024-01-03',
      poids_initial: 32,
      categorie_poids: null,
      statut: 'vivant',
      photo_uri: null,
      derniere_pesee_poids: 32,
      derniere_pesee_date: '2024-12-01',
    },
  ];

  beforeEach(async () => {
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
      notifyOfferAccepted: jest.fn(),
      notifyOfferReceived: jest.fn(),
    };

    const mockSaleAutomationService = {
      completeSale: jest.fn(),
      processSaleFromTransaction: jest.fn(),
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

  describe('Flux complet : Création listing batch → Offre → Acceptation', () => {
    it('devrait exécuter le flux complet avec succès', async () => {
      // ===== ÉTAPE 1 : Créer un listing batch =====
      const createBatchListingDto: CreateBatchListingDto = {
        batchId,
        farmId,
        pricePerKg: 1500,
        averageWeight: 30,
        lastWeightDate: '2024-12-01',
        location: {
          latitude: 14.7167,
          longitude: -17.4677,
          address: 'Dakar, Sénégal',
          city: 'Dakar',
          region: 'Dakar',
        },
        pigIds,
      };

      const mockListing = {
        id: 'listing_123',
        listing_type: 'batch',
        batch_id: batchId,
        pig_ids: pigIds,
        producer_id: producerId,
        farm_id: farmId,
        price_per_kg: 1500,
        calculated_price: 135000, // 3 porcs × 30kg × 1500
        weight: 30,
        pig_count: 3,
        status: 'available',
        listed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_weight_date: '2024-12-01',
        location_latitude: 14.7167,
        location_longitude: -17.4677,
        location_address: 'Dakar, Sénégal',
        location_city: 'Dakar',
        location_region: 'Dakar',
        views: 0,
        inquiries: 0,
        date_creation: new Date().toISOString(),
        derniere_modification: new Date().toISOString(),
      };

      // Mock pour createBatchListing
      // checkProjetOwnership fait un query
      // Vérification batch fait un query
      // Vérification pigs fait un query
      // Vérification listing existant fait un query
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ proprietaire_id: producerId }] }) // checkProjetOwnership
        .mockResolvedValueOnce({ rows: [{ id: batchId, total_count: 3, projet_id: farmId }] }) // Vérification batch
        .mockResolvedValueOnce({ rows: mockBatchPigs }) // Vérification pigs
        .mockResolvedValueOnce({ rows: [] }); // Pas de listing existant (ligne 246)

      // Mock transaction pour createBatchListing
      const mockClient = {
        query: jest.fn(),
      };
      (databaseService.transaction as any) = jest.fn(async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
        // Réinitialiser les mocks pour chaque appel
        mockClient.query.mockReset();
        mockClient.query
          .mockResolvedValueOnce({ rows: [{ column_name: 'weight' }] }) // Vérification colonne weight (ligne 312)
          .mockResolvedValueOnce({ rows: [mockListing] }) // INSERT listing (ligne 419)
          .mockResolvedValueOnce({ rowCount: 3 }); // UPDATE batch_pigs (ligne après INSERT)
        return callback(mockClient);
      });

      const listing = await service.createBatchListing(createBatchListingDto, producerId);

      expect(listing).toBeDefined();
      expect(listing.id).toBe('listing_123');
      expect(listing.listingType).toBe('batch');
      expect(listing.pigIds).toEqual(pigIds);

      // ===== ÉTAPE 2 : Récupérer les listings avec sujets (BUG CORRIGÉ) =====
      const listingIds = ['listing_123'];
      cacheService.get.mockReturnValue(null); // Pas de cache

      // getListingsWithSubjects appelle getListingSubjects qui fait :
      // 1. SELECT marketplace_listings
      // 2. SELECT batch_pigs
      databaseService.query
        .mockResolvedValueOnce({ rows: [mockListing] }) // getListingSubjects - SELECT marketplace_listings
        .mockResolvedValueOnce({ rows: mockBatchPigs }); // getListingSubjects - SELECT batch_pigs

      const listingsWithSubjects = await service.getListingsWithSubjects(listingIds);

      expect(listingsWithSubjects).toHaveLength(1);
      expect(listingsWithSubjects[0].listing.id).toBe('listing_123');
      expect(listingsWithSubjects[0].subjects).toHaveLength(3);
      expect(listingsWithSubjects[0].subjects[0].id).toBe('pig_1');
      expect(listingsWithSubjects[0].subjects[0].code).toBeDefined();
      // poids_initial est mappé depuis current_weight_kg (ligne 994 marketplace.service.ts)
      // Le mapping ligne 1022 fait : row.poids_initial ? parseFloat(row.poids_initial) : (row.derniere_pesee_poids ? parseFloat(row.derniere_pesee_poids) : null)
      // Donc si row.poids_initial existe (mappé depuis current_weight_kg), il sera utilisé
      expect(listingsWithSubjects[0].subjects[0].poids_initial).toBe(30); // current_weight_kg du mock

      // Vérifier que la requête utilise batch_pigs (bug corrigé)
      const batchPigsQuery = databaseService.query.mock.calls.find(
        (call) => call[0].includes('FROM batch_pigs')
      );
      expect(batchPigsQuery).toBeDefined();

      // ===== ÉTAPE 3 : Créer une offre =====
      const createOfferDto: CreateOfferDto = {
        listingId: 'listing_123',
        subjectIds: ['pig_1', 'pig_2'], // Sélection de 2 porcs sur 3
        buyerId: buyerId, // Requis par le DTO
        proposedPrice: 120000, // Prix négocié
        message: 'Offre pour 2 porcs',
      };

      // findOneListing fait 2 appels : SELECT puis UPDATE views
      databaseService.query
        .mockResolvedValueOnce({ rows: [mockListing] }) // findOneListing SELECT
        .mockResolvedValueOnce({ rowCount: 1 }) // findOneListing UPDATE views
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'offer_123',
              listing_id: 'listing_123',
              subject_ids: ['pig_1', 'pig_2'],
              buyer_id: buyerId,
              producer_id: producerId,
              proposed_price: 120000,
              original_price: 135000,
              status: 'pending',
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
        }) // INSERT offer
        .mockResolvedValueOnce({ rowCount: 1 }); // UPDATE inquiries

      const offer = await service.createOffer(createOfferDto, buyerId);

      expect(offer).toBeDefined();
      expect(offer.id).toBe('offer_123');
      expect(offer.buyerId).toBe(buyerId);
      expect(offer.proposedPrice).toBe(120000);
      expect(offer.status).toBe('pending');

      // Vérifier que les inquiries ont été incrémentés
      const updateInquiriesCall = databaseService.query.mock.calls.find(
        (call) => call[0].includes('UPDATE marketplace_listings SET inquiries')
      );
      expect(updateInquiriesCall).toBeDefined();

      // ===== ÉTAPE 4 : Accepter l'offre (créer transaction) =====
      const mockOffer = {
        id: 'offer_123',
        listing_id: 'listing_123',
        subject_ids: ['pig_1', 'pig_2'],
        buyer_id: buyerId,
        producer_id: producerId,
        proposed_price: 120000,
        original_price: 135000,
        status: 'pending',
      };

      const mockTransaction = {
        id: 'transaction_123',
        offer_id: 'offer_123',
        listing_id: 'listing_123',
        subject_ids: ['pig_1', 'pig_2'],
        buyer_id: buyerId,
        producer_id: producerId,
        final_price: 120000,
        status: 'confirmed',
        created_at: new Date().toISOString(),
      };

      // findOneListing fait 2 appels : SELECT puis UPDATE views
      databaseService.query
        .mockResolvedValueOnce({ rows: [mockOffer] }) // Récupération offre
        .mockResolvedValueOnce({ rows: [mockListing] }) // findOneListing SELECT pour notification
        .mockResolvedValueOnce({ rowCount: 1 }); // findOneListing UPDATE views

      // Mock transaction pour acceptOffer
      const acceptOfferClient = {
        query: jest.fn(),
      };
      (databaseService.transaction as any) = jest.fn(async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
        acceptOfferClient.query
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE offer status
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE listing status
          .mockResolvedValueOnce({ rows: [mockTransaction] }); // INSERT transaction
        return callback(acceptOfferClient);
      });

      notificationsService.notifyOfferAccepted = jest.fn().mockResolvedValue(undefined);

      const transaction = await service.acceptOffer('offer_123', producerId);

      expect(transaction).toBeDefined();
      expect(transaction.id).toBe('transaction_123');
      expect(transaction.finalPrice).toBe(120000);
      expect(transaction.status).toBe('confirmed');

      // Vérifier que l'offre a été mise à jour
      expect(acceptOfferClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE marketplace_offers SET status'),
        expect.arrayContaining(['accepted'])
      );

      // Vérifier que le listing a été mis à jour
      expect(acceptOfferClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE marketplace_listings SET status'),
        expect.arrayContaining(['reserved'])
      );

      // Vérifier que la notification a été envoyée
      expect(notificationsService.notifyOfferAccepted).toHaveBeenCalledWith(
        buyerId,
        'offer_123',
        expect.any(String)
      );
    });

    it('devrait gérer correctement les pig_ids JSONB dans getListingsWithSubjects', async () => {
      // Test spécifique pour le bug corrigé : pig_ids JSONB
      const listingId = 'listing_123';
      const mockListing = {
        id: listingId,
        listing_type: 'batch',
        batch_id: batchId,
        pig_ids: JSON.stringify(pigIds), // pig_ids comme string JSON (cas rare)
        producer_id: producerId,
        farm_id: farmId,
        status: 'available',
      };

      cacheService.get.mockReturnValue(null);

      // getListingSubjects fait :
      // 1. SELECT marketplace_listings (ligne 876)
      // 2. SELECT batch_pigs (ligne 986)
      databaseService.query
        .mockResolvedValueOnce({ rows: [mockListing] }) // getListingSubjects - SELECT marketplace_listings
        .mockResolvedValueOnce({ rows: mockBatchPigs }); // getListingSubjects - SELECT batch_pigs

      const result = await service.getListingSubjects(listingId);

      expect(result).toBeDefined();
      expect(result.subjects).toHaveLength(3);
      expect(result.subjects.map((s) => s.id)).toEqual(pigIds);
    });

    it('devrait filtrer les listings qui échouent dans getListingsWithSubjects', async () => {
      // Test que les listings qui échouent sont filtrés (pas d'exception globale)
      const listingIds = ['listing_123', 'listing_inexistant', 'listing_456'];

      // Mock pour getListingsWithSubjects
      jest.spyOn(service, 'getListingSubjects')
        .mockResolvedValueOnce({
          listing: { id: 'listing_123' } as any,
          subjects: mockBatchPigs.slice(0, 2),
        })
        .mockRejectedValueOnce(new Error('Listing non trouvé')) // listing_inexistant échoue
        .mockResolvedValueOnce({
          listing: { id: 'listing_456' } as any,
          subjects: mockBatchPigs.slice(2),
        });

      const results = await service.getListingsWithSubjects(listingIds);

      // Seuls les listings réussis doivent être retournés
      expect(results).toHaveLength(2);
      expect(results[0].listing.id).toBe('listing_123');
      expect(results[1].listing.id).toBe('listing_456');
    });
  });

  describe('Flux avec erreurs', () => {
    it('ne devrait pas permettre à un producteur de faire une offre sur ses propres sujets', async () => {
      const createOfferDto: CreateOfferDto = {
        listingId: 'listing_123',
        subjectIds: ['pig_1'],
        buyerId: buyerId,
        proposedPrice: 100000,
      };

      const mockListing = {
        id: 'listing_123',
        producer_id: producerId, // Même ID que le producteur
        status: 'available',
      };

      // findOneListing fait 2 appels : SELECT puis UPDATE views
      databaseService.query
        .mockResolvedValueOnce({ rows: [mockListing] }) // findOneListing SELECT
        .mockResolvedValueOnce({ rowCount: 1 }); // findOneListing UPDATE views

      await expect(service.createOffer(createOfferDto, producerId)).rejects.toThrow(
        "Vous ne pouvez pas faire d'offre sur vos propres sujets"
      );
    });

    it('ne devrait pas permettre de créer une offre sur un listing non disponible', async () => {
      const createOfferDto: CreateOfferDto = {
        listingId: 'listing_123',
        subjectIds: ['pig_1'],
        buyerId: buyerId,
        proposedPrice: 100000,
      };

      const mockListing = {
        id: 'listing_123',
        producer_id: 'other_producer',
        status: 'sold', // Listing déjà vendu
      };

      // findOneListing fait 2 appels : SELECT puis UPDATE views
      databaseService.query
        .mockResolvedValueOnce({ rows: [mockListing] }) // findOneListing SELECT
        .mockResolvedValueOnce({ rowCount: 1 }); // findOneListing UPDATE views

      await expect(service.createOffer(createOfferDto, buyerId)).rejects.toThrow(
        "Cette annonce n'est plus disponible"
      );
    });
  });
});
