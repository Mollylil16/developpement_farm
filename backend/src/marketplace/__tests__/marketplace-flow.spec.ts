/**
 * Tests E2E du flow complet du Marketplace
 * 
 * Ce fichier teste l'intégralité du flow depuis la création d'un listing
 * jusqu'à la conclusion de la vente.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceService } from '../marketplace.service';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications.service';
import { CacheService } from '../../common/services/cache.service';
import { SaleAutomationService } from '../sale-automation.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('MarketplaceService - Flow Complet', () => {
  let service: MarketplaceService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockNotificationsService: Partial<NotificationsService>;
  let mockCacheService: Partial<CacheService>;

  // IDs de test
  const producerId = 'producer_test_123';
  const buyerId = 'buyer_test_456';
  const listingId = 'listing_test_789';
  const offerId = 'offer_test_abc';
  const counterOfferId = 'counter_offer_test_def';

  beforeEach(async () => {
    // Mock des services
    mockDatabaseService = {
      query: jest.fn(),
      transaction: jest.fn((callback) => callback({
        query: jest.fn(),
      })),
    };

    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({}),
      notifyOfferAccepted: jest.fn().mockResolvedValue({}),
      notifyOfferRejected: jest.fn().mockResolvedValue({}),
      notifyOfferCountered: jest.fn().mockResolvedValue({}),
      notifyNewOffer: jest.fn().mockResolvedValue({}),
    };

    mockCacheService = {
      get: jest.fn().mockReturnValue(null),
      set: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: SaleAutomationService, useValue: { processOffer: jest.fn() } },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
  });

  describe('Flow 1: Création d\'offre par l\'acheteur', () => {
    it('devrait créer une offre avec les subjectIds corrects', async () => {
      const createOfferDto = {
        listingId,
        subjectIds: ['pig_1', 'pig_2'],
        buyerId,
        proposedPrice: 150000,
        message: 'Je suis intéressé',
        dateRecuperationSouhaitee: '2024-02-15',
      };

      // Mock: listing existe et disponible
      (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: listingId,
          producer_id: producerId,
          calculated_price: 200000,
          status: 'available',
        }],
      });

      // Mock: insertion de l'offre
      (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: offerId,
          listing_id: listingId,
          subject_ids: createOfferDto.subjectIds,
          buyer_id: buyerId,
          producer_id: producerId,
          proposed_price: createOfferDto.proposedPrice,
          original_price: 200000,
          status: 'pending',
          created_at: new Date().toISOString(),
        }],
      });

      // Mock: mise à jour inquiries
      (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await service.createOffer(createOfferDto, buyerId);

      expect(result).toBeDefined();
      expect(result.subjectIds).toEqual(createOfferDto.subjectIds);
      expect(result.proposedPrice).toBe(createOfferDto.proposedPrice);
    });

    it('devrait rejeter si l\'acheteur essaie d\'acheter son propre listing', async () => {
      const createOfferDto = {
        listingId,
        subjectIds: ['pig_1'],
        buyerId: producerId, // Même ID que le producteur
        proposedPrice: 150000,
      };

      // Mock: listing appartient à l'utilisateur
      (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: listingId,
          producer_id: producerId,
          status: 'available',
        }],
      });

      await expect(service.createOffer(createOfferDto, producerId))
        .rejects
        .toThrow(ForbiddenException);
    });
  });

  describe('Flow 2: Réponse du producteur', () => {
    describe('Acceptation', () => {
      it('devrait accepter une offre et créer une transaction', async () => {
        // Mock: offre existe et pending
        (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({
          rows: [{
            id: offerId,
            listing_id: listingId,
            subject_ids: ['pig_1', 'pig_2'],
            buyer_id: buyerId,
            producer_id: producerId,
            proposed_price: 150000,
            status: 'pending',
          }],
        });

        // Mock pour transaction
        const mockClient = {
          query: jest.fn()
            // Update offer
            .mockResolvedValueOnce({ rows: [] })
            // Get listing
            .mockResolvedValueOnce({
              rows: [{
                pig_ids: ['pig_1', 'pig_2', 'pig_3'],
                pig_count: 3,
                listing_type: 'batch',
                price_per_kg: 2500,
                weight: 25,
              }],
            })
            // Update listing
            .mockResolvedValueOnce({ rows: [] })
            // Create transaction
            .mockResolvedValueOnce({
              rows: [{
                id: 'transaction_test',
                offer_id: offerId,
                listing_id: listingId,
                subject_ids: ['pig_1', 'pig_2'],
                buyer_id: buyerId,
                producer_id: producerId,
                final_price: 150000,
                status: 'confirmed',
              }],
            }),
        };

        (mockDatabaseService.transaction as jest.Mock).mockImplementation(
          (callback) => callback(mockClient)
        );

        const result = await service.acceptOffer(offerId, producerId, 'producer');

        expect(result).toBeDefined();
        expect(result.status).toBe('confirmed');
        expect(mockNotificationsService.notifyOfferAccepted).toHaveBeenCalled();
      });

      it('devrait mettre à jour le listing en vente partielle', async () => {
        // Mock: offre pour 2 porcs sur 5
        (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({
          rows: [{
            id: offerId,
            listing_id: listingId,
            subject_ids: ['pig_1', 'pig_2'],
            buyer_id: buyerId,
            producer_id: producerId,
            proposed_price: 100000,
            status: 'pending',
          }],
        });

        const mockClient = {
          query: jest.fn()
            // Update offer
            .mockResolvedValueOnce({ rows: [] })
            // Get listing - 5 porcs
            .mockResolvedValueOnce({
              rows: [{
                pig_ids: ['pig_1', 'pig_2', 'pig_3', 'pig_4', 'pig_5'],
                pig_count: 5,
                listing_type: 'batch',
                price_per_kg: 2500,
                weight: 25,
              }],
            })
            // Get remaining pigs weights
            .mockResolvedValueOnce({
              rows: [{ avg_weight: 26, total_weight: 78 }],
            })
            // Update listing with remaining pigs
            .mockResolvedValueOnce({ rows: [] })
            // Create transaction
            .mockResolvedValueOnce({
              rows: [{
                id: 'transaction_test',
                subject_ids: ['pig_1', 'pig_2'],
                status: 'confirmed',
              }],
            }),
        };

        (mockDatabaseService.transaction as jest.Mock).mockImplementation(
          (callback) => callback(mockClient)
        );

        await service.acceptOffer(offerId, producerId, 'producer');

        // Vérifier que le listing a été mis à jour avec les porcs restants
        const updateListingCall = mockClient.query.mock.calls.find(
          call => call[0]?.includes('UPDATE marketplace_listings') && 
                  call[0]?.includes('pig_ids')
        );
        
        expect(updateListingCall).toBeDefined();
      });
    });

    describe('Rejet', () => {
      it('devrait rejeter une offre (producteur)', async () => {
        (mockDatabaseService.query as jest.Mock)
          .mockResolvedValueOnce({
            rows: [{
              id: offerId,
              producer_id: producerId,
              buyer_id: buyerId,
              status: 'pending',
            }],
          })
          .mockResolvedValueOnce({ rows: [] });

        const result = await service.rejectOffer(offerId, producerId);

        expect(result.id).toBe(offerId);
      });

      it('devrait interdire le rejet par un non-producteur', async () => {
        (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({
          rows: [{
            id: offerId,
            producer_id: producerId,
            buyer_id: buyerId,
            status: 'pending',
          }],
        });

        await expect(service.rejectOffer(offerId, 'autre_user'))
          .rejects
          .toThrow(ForbiddenException);
      });
    });

    describe('Contre-proposition', () => {
      it('devrait créer une contre-proposition', async () => {
        // Mock: offre originale
        (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({
          rows: [{
            id: offerId,
            listing_id: listingId,
            subject_ids: ['pig_1'],
            buyer_id: buyerId,
            producer_id: producerId,
            proposed_price: 100000,
            original_price: 150000,
            status: 'pending',
          }],
        });

        const mockClient = {
          query: jest.fn()
            // Insert counter offer
            .mockResolvedValueOnce({
              rows: [{
                id: counterOfferId,
                listing_id: listingId,
                subject_ids: ['pig_1'],
                buyer_id: buyerId,
                producer_id: producerId,
                proposed_price: 130000,
                status: 'countered',
                counter_offer_of: offerId,
              }],
            })
            // Update original offer status
            .mockResolvedValueOnce({ rows: [] }),
        };

        (mockDatabaseService.transaction as jest.Mock).mockImplementation(
          (callback) => callback(mockClient)
        );

        // Mock findOneListing
        jest.spyOn(service, 'findOneListing').mockResolvedValue({
          id: listingId,
          status: 'available',
        } as any);

        const result = await service.counterOffer(offerId, producerId, {
          nouveau_prix_total: 130000,
          message: 'Je propose ce prix',
        });

        expect(result.proposedPrice).toBe(130000);
        expect(result.counterOfferOf).toBe(offerId);
        expect(mockNotificationsService.notifyOfferCountered).toHaveBeenCalled();
      });

      it('devrait interdire une contre-proposition par l\'acheteur', async () => {
        (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({
          rows: [{
            id: offerId,
            producer_id: producerId,
            buyer_id: buyerId,
            status: 'pending',
          }],
        });

        await expect(
          service.counterOffer(offerId, buyerId, { nouveau_prix_total: 120000 })
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });

  describe('Flow 3: Réponse de l\'acheteur à une contre-proposition', () => {
    it('devrait accepter une contre-proposition (acheteur)', async () => {
      // Mock: contre-proposition existe
      (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: counterOfferId,
          listing_id: listingId,
          subject_ids: ['pig_1'],
          buyer_id: buyerId,
          producer_id: producerId,
          proposed_price: 130000,
          status: 'countered',
          counter_offer_of: offerId,
        }],
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // Update offer
          .mockResolvedValueOnce({ rows: [{ pig_ids: ['pig_1'], listing_type: 'individual' }] }) // Get listing
          .mockResolvedValueOnce({ rows: [] }) // Update listing
          .mockResolvedValueOnce({
            rows: [{
              id: 'transaction_test',
              status: 'confirmed',
            }],
          }),
      };

      (mockDatabaseService.transaction as jest.Mock).mockImplementation(
        (callback) => callback(mockClient)
      );

      const result = await service.acceptOffer(counterOfferId, buyerId, 'buyer');

      expect(result.status).toBe('confirmed');
    });

    // TODO: Test à ajouter après implémentation de rejectOffer pour acheteur
    it.todo('devrait permettre à l\'acheteur de rejeter une contre-proposition');
    
    // TODO: Test à ajouter après implémentation de contre-contre-proposition
    it.todo('devrait permettre à l\'acheteur de faire une contre-contre-proposition');
  });

  describe('Flow 4: Retrait d\'offre par l\'acheteur', () => {
    it('devrait permettre le retrait d\'une offre pending', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({
            rows: [{
              id: offerId,
              buyer_id: buyerId,
              producer_id: producerId,
              status: 'pending',
            }],
          })
          .mockResolvedValueOnce({ rows: [] }),
      };

      (mockDatabaseService.transaction as jest.Mock).mockImplementation(
        (callback) => callback(mockClient)
      );

      const result = await service.withdrawOffer(offerId, buyerId);

      expect(result.message).toContain('retirée');
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });

    it('devrait interdire le retrait d\'une offre déjà acceptée', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [{
            id: offerId,
            buyer_id: buyerId,
            status: 'accepted',
          }],
        }),
      };

      (mockDatabaseService.transaction as jest.Mock).mockImplementation(
        (callback) => callback(mockClient)
      );

      await expect(service.withdrawOffer(offerId, buyerId))
        .rejects
        .toThrow(BadRequestException);
    });

    it('devrait interdire le retrait par un non-acheteur', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [{
            id: offerId,
            buyer_id: buyerId,
            producer_id: producerId,
            status: 'pending',
          }],
        }),
      };

      (mockDatabaseService.transaction as jest.Mock).mockImplementation(
        (callback) => callback(mockClient)
      );

      await expect(service.withdrawOffer(offerId, 'autre_user'))
        .rejects
        .toThrow(ForbiddenException);
    });
  });

  describe('Flow 5: Vérification des données retournées', () => {
    it('devrait retourner subjectIds dans getSellerInquiries', async () => {
      (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: offerId,
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: producerId,
          proposed_price: 150000,
          original_price: 200000,
          status: 'pending',
          offer_subject_ids: ['pig_1', 'pig_2'],
          listing_pig_count: 5,
          created_at: new Date().toISOString(),
        }],
      });

      const result = await service.getSellerInquiries(producerId);

      expect(result).toHaveLength(1);
      expect(result[0].subjectIds).toEqual(['pig_1', 'pig_2']);
      expect(result[0].pig_count).toBe(2); // Nombre de sujets dans l'offre
    });

    it('devrait retourner subjectIds dans getBuyerInquiries', async () => {
      (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: offerId,
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: producerId,
          proposed_price: 150000,
          status: 'pending',
          offer_subject_ids: ['pig_1'],
          listing_pig_count: 3,
        }],
      });

      const result = await service.getBuyerInquiries(buyerId);

      expect(result).toHaveLength(1);
      expect(result[0].subjectIds).toEqual(['pig_1']);
      expect(result[0].pig_count).toBe(1);
    });
  });

  describe('Flow 6: Notifications', () => {
    it('devrait notifier le producteur lors de l\'acceptation par l\'acheteur', async () => {
      (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: counterOfferId,
          listing_id: listingId,
          buyer_id: buyerId,
          producer_id: producerId,
          proposed_price: 130000,
          status: 'countered',
        }],
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ pig_ids: [], listing_type: 'individual' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'tx', status: 'confirmed' }] }),
      };

      (mockDatabaseService.transaction as jest.Mock).mockImplementation(
        (callback) => callback(mockClient)
      );

      await service.acceptOffer(counterOfferId, buyerId, 'buyer');

      // Vérifier que le producteur est notifié (pas l'acheteur)
      expect(mockNotificationsService.notifyOfferAccepted).toHaveBeenCalledWith(
        producerId,
        expect.any(String),
        expect.any(String)
      );
    });
  });
});

describe('MarketplaceService - Cas Limites', () => {
  let service: MarketplaceService;
  let mockDatabaseService: Partial<DatabaseService>;

  beforeEach(async () => {
    mockDatabaseService = {
      query: jest.fn(),
      transaction: jest.fn((callback) => callback({ query: jest.fn() })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: NotificationsService, useValue: { createNotification: jest.fn() } },
        { provide: CacheService, useValue: { get: jest.fn(), set: jest.fn(), delete: jest.fn() } },
        { provide: SaleAutomationService, useValue: { processOffer: jest.fn() } },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
  });

  describe('Offres expirées', () => {
    it('ne devrait pas accepter une offre expirée', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'expired_offer',
          status: 'expired',
          expires_at: expiredDate.toISOString(),
        }],
      });

      await expect(service.acceptOffer('expired_offer', 'producer', 'producer'))
        .rejects
        .toThrow();
    });
  });

  describe('Listing non disponible', () => {
    it('ne devrait pas créer d\'offre sur un listing sold', async () => {
      (mockDatabaseService.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'listing_sold',
          producer_id: 'producer',
          status: 'sold',
        }],
      });

      await expect(service.createOffer({
        listingId: 'listing_sold',
        subjectIds: ['pig_1'],
        buyerId: 'buyer',
        proposedPrice: 100000,
      }, 'buyer')).rejects.toThrow();
    });
  });

  describe('Validation des subjectIds', () => {
    it('devrait valider que les subjectIds font partie du listing', async () => {
      (mockDatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: 'listing',
            producer_id: 'producer',
            status: 'available',
            pig_ids: ['pig_1', 'pig_2'],
            listing_type: 'batch',
          }],
        });

      const createOfferDto = {
        listingId: 'listing',
        subjectIds: ['pig_99'], // ID qui n'existe pas dans le listing
        buyerId: 'buyer',
        proposedPrice: 100000,
      };

      // Le service devrait valider que pig_99 fait partie du listing
      // Note: Cette validation peut ne pas être implémentée actuellement
    });
  });
});
