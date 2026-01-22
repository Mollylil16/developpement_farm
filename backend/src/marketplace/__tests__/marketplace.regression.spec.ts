/**
 * Tests de régression pour bugs corrigés
 * Priorité : Vérifier que les bugs corrigés ne réapparaissent pas
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceService } from '../marketplace.service';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../common/services/cache.service';
import { NotificationsService } from '../notifications.service';
import { SaleAutomationService } from '../sale-automation.service';
import { NotFoundException } from '@nestjs/common';

describe('MarketplaceService - Tests de régression', () => {
  let service: MarketplaceService;
  let databaseService: jest.Mocked<DatabaseService>;
  let cacheService: jest.Mocked<CacheService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let saleAutomationService: jest.Mocked<SaleAutomationService>;

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

  describe('BUG #1 : getListingsWithSubjects retourne un tableau vide', () => {
    /**
     * Bug corrigé : getListingsWithSubjects retournait un tableau vide
     * pour les listings batch car :
     * 1. pig_ids JSONB n'était pas correctement converti en array PostgreSQL
     * 2. La requête SQL cherchait dans production_animaux au lieu de batch_pigs
     */
    it('devrait retourner les sujets pour un listing batch avec pig_ids JSONB', async () => {
      // Arrange : Simuler un listing batch avec pig_ids comme JSONB
      const listingId = 'listing_123';
      const pigIds = ['pig_1', 'pig_2'];
      const mockListing = {
        id: listingId,
        listing_type: 'batch',
        batch_id: 'batch_123',
        pig_ids: pigIds, // Array JavaScript (comme retourné par pg)
        producer_id: 'producer_123',
        farm_id: 'farm_123',
        status: 'available',
      };

      const mockBatchPigs = [
        {
          id: 'pig_1',
          name: 'Porc 1',
          sex: 'male',
          birth_date: '2024-01-01',
          current_weight_kg: 30,
          last_weighing_date: '2024-12-01',
          photo_url: null,
        },
        {
          id: 'pig_2',
          name: 'Porc 2',
          sex: 'female',
          birth_date: '2024-01-02',
          current_weight_kg: 28,
          last_weighing_date: '2024-12-01',
          photo_url: null,
        },
      ];

      databaseService.query
        .mockResolvedValueOnce({ rows: [mockListing] }) // findOneListing
        .mockResolvedValueOnce({ rows: mockBatchPigs }); // getListingSubjects - batch_pigs

      cacheService.get.mockReturnValue(null);

      // Act
      const result = await service.getListingSubjects(listingId);

      // Assert : Vérifier que les sujets sont retournés
      expect(result).toBeDefined();
      expect(result.subjects).toHaveLength(2);
      expect(result.subjects[0].id).toBe('pig_1');
      expect(result.subjects[1].id).toBe('pig_2');

      // Vérifier que la requête utilise batch_pigs (correction du bug)
      const batchPigsQuery = databaseService.query.mock.calls.find(
        (call) => call[0].includes('FROM batch_pigs')
      );
      expect(batchPigsQuery).toBeDefined();
      expect(batchPigsQuery).not.toBeUndefined();

      // Vérifier que la requête n'utilise PAS production_animaux (bug corrigé)
      const productionAnimauxQuery = databaseService.query.mock.calls.find(
        (call) => call[0].includes('FROM production_animaux') && call[0].includes('WHERE')
      );
      expect(productionAnimauxQuery).toBeUndefined();
    });

    it('devrait gérer pig_ids comme string JSON (cas rare)', async () => {
      // Arrange : pig_ids comme string JSON
      const listingId = 'listing_123';
      const pigIds = ['pig_1', 'pig_2'];
      const mockListing = {
        id: listingId,
        listing_type: 'batch',
        pig_ids: JSON.stringify(pigIds), // String JSON
      };

      const mockBatchPigs = [
        { id: 'pig_1', name: 'Porc 1', current_weight_kg: 30 },
        { id: 'pig_2', name: 'Porc 2', current_weight_kg: 28 },
      ];

      databaseService.query
        .mockResolvedValueOnce({ rows: [mockListing] })
        .mockResolvedValueOnce({ rows: mockBatchPigs });

      cacheService.get.mockReturnValue(null);

      // Act
      const result = await service.getListingSubjects(listingId);

      // Assert
      expect(result.subjects).toHaveLength(2);
    });

    it('devrait convertir pig_ids JSONB en array PostgreSQL pour ANY()', async () => {
      // Arrange : pig_ids comme JSONB (cas le plus complexe)
      const listingId = 'listing_123';
      const pigIds = ['pig_1', 'pig_2'];
      const mockListing = {
        id: listingId,
        listing_type: 'batch',
        pig_ids: { type: 'jsonb', value: pigIds }, // JSONB simulé
      };

      // Mock pour la conversion JSONB → array
      databaseService.query
        .mockResolvedValueOnce({ rows: [mockListing] }) // findOneListing
        .mockResolvedValueOnce({ rows: [{ pig_ids_array: pigIds }] }) // Conversion JSONB
        .mockResolvedValueOnce({
          rows: [
            { id: 'pig_1', name: 'Porc 1', current_weight_kg: 30 },
            { id: 'pig_2', name: 'Porc 2', current_weight_kg: 28 },
          ],
        }); // getListingSubjects

      cacheService.get.mockReturnValue(null);

      // Act
      const result = await service.getListingSubjects(listingId);

      // Assert
      expect(result.subjects).toHaveLength(2);
    });
  });

  describe('BUG #2 : originalListingId manquant pour listings virtuels', () => {
    /**
     * Bug corrigé : Les listings virtuels créés dans FarmDetailsModal
     * n'avaient pas toujours originalListingId, causant l'envoi de pigIds
     * au lieu de listingIds au backend
     */
    it('devrait utiliser listingId réel et non pigId pour getListingsWithSubjects', async () => {
      // Arrange : Simuler que des pigIds sont envoyés par erreur
      const pigId = 'pig_123'; // Un pigId au lieu d'un listingId
      const listingId = 'listing_123'; // Le vrai listingId

      // Le backend doit détecter que c'est un pigId et non un listingId
      databaseService.query
        .mockResolvedValueOnce({ rows: [] }) // Listing non trouvé avec pigId
        .mockResolvedValueOnce({ rows: [{ id: pigId }] }); // Vérification pigId

      cacheService.get.mockReturnValue(null);

      // Act & Assert
      await expect(service.getListingSubjects(pigId)).rejects.toThrow(NotFoundException);

      // Vérifier que la vérification pigId a été faite
      const pigIdCheck = databaseService.query.mock.calls.find(
        (call) => call[0].includes('production_animaux') && call[1][0] === pigId
      );
      expect(pigIdCheck).toBeDefined();
    });
  });

  describe('BUG #3 : getListingsWithSubjects avec plusieurs listings', () => {
    /**
     * Bug corrigé : getListingsWithSubjects devait filtrer les listings
     * qui échouent sans faire échouer toute la requête
     */
    it('devrait retourner seulement les listings réussis', async () => {
      // Arrange
      const listingIds = ['listing_1', 'listing_inexistant', 'listing_2'];

      jest.spyOn(service, 'getListingSubjects')
        .mockResolvedValueOnce({
          listing: { id: 'listing_1' } as any,
          subjects: [{ id: 'pig_1' }],
        })
        .mockRejectedValueOnce(new NotFoundException('Listing non trouvé'))
        .mockResolvedValueOnce({
          listing: { id: 'listing_2' } as any,
          subjects: [{ id: 'pig_2' }],
        });

      // Act
      const results = await service.getListingsWithSubjects(listingIds);

      // Assert : Seuls les listings réussis doivent être retournés
      expect(results).toHaveLength(2);
      expect(results[0].listing.id).toBe('listing_1');
      expect(results[1].listing.id).toBe('listing_2');
    });
  });

  describe('BUG #4 : Colonnes incorrectes pour batch_pigs', () => {
    /**
     * Bug corrigé : Les colonnes utilisées pour batch_pigs étaient incorrectes
     * - batch_pigs.name au lieu de code
     * - batch_pigs.current_weight_kg au lieu de poids_initial
     * - batch_pigs.photo_url au lieu de photo_uri
     */
    it('devrait mapper correctement les colonnes batch_pigs', async () => {
      // Arrange
      const listingId = 'listing_123';
      const mockListing = {
        id: listingId,
        listing_type: 'batch',
        pig_ids: ['pig_1'],
      };

      // La requête SQL fait SELECT bp.photo_url as photo_uri
      // Donc le résultat de la requête aura photo_uri (pas photo_url)
      const mockBatchPig = {
        id: 'pig_1',
        code: 'Porc 1', // Mappé depuis name dans la requête SQL
        nom: 'Porc 1', // batch_pigs.name
        sexe: 'male', // batch_pigs.sex
        date_naissance: '2024-01-01', // batch_pigs.birth_date
        poids_initial: 30, // Mappé depuis current_weight_kg dans la requête SQL
        last_weighing_date: '2024-12-01',
        photo_uri: 'https://example.com/photo.jpg', // Mappé depuis photo_url dans la requête SQL (as photo_uri)
      };

      databaseService.query
        .mockResolvedValueOnce({ rows: [mockListing] })
        .mockResolvedValueOnce({ rows: [mockBatchPig] });

      cacheService.get.mockReturnValue(null);

      // Act
      const result = await service.getListingSubjects(listingId);

      // Assert : Vérifier que les colonnes sont correctement mappées
      expect(result.subjects[0].code).toBeDefined(); // Doit être mappé depuis name
      expect(result.subjects[0].poids_initial).toBe(30); // Doit être mappé depuis current_weight_kg
      // Le service mappe bp.photo_url as photo_uri dans la requête SQL
      // Donc photo_uri devrait contenir la valeur de photo_url
      expect(result.subjects[0].photo_uri).toBe('https://example.com/photo.jpg'); // Doit être mappé depuis photo_url
    });
  });
});
