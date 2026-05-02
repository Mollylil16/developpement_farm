/**
 * Tests pour marketplaceFilters
 * Vérifie que le filtrage des annonces fonctionne correctement
 */

import {
  filterListingsForBuyView,
  canUserViewListingInBuyView,
} from '../../utils/marketplaceFilters';
import { MarketplaceListing } from '../../types/marketplace';

describe('marketplaceFilters', () => {
  const mockListings: MarketplaceListing[] = [
    {
      id: 'listing_1',
      subjectId: 'subject_1',
      producerId: 'producer_1',
      farmId: 'farm_1',
      pricePerKg: 450,
      calculatedPrice: 45000,
      weight: 100,
      lastWeightDate: '2024-01-01',
      status: 'available',
      location: {
        latitude: 0,
        longitude: 0,
        address: 'Test',
        city: 'Test',
        region: 'Test',
      },
      listedAt: '2024-01-01',
      updatedAt: '2024-01-01',
      views: 0,
      inquiries: 0,
      saleTerms: {
        transport: 'buyer_responsibility',
        slaughter: 'buyer_responsibility',
        paymentTerms: 'on_delivery',
        warranty: '',
        cancellationPolicy: '',
      },
    },
    {
      id: 'listing_2',
      subjectId: 'subject_2',
      producerId: 'producer_2',
      farmId: 'farm_2',
      pricePerKg: 500,
      calculatedPrice: 50000,
      weight: 100,
      lastWeightDate: '2024-01-01',
      status: 'available',
      location: {
        latitude: 0,
        longitude: 0,
        address: 'Test',
        city: 'Test',
        region: 'Test',
      },
      listedAt: '2024-01-01',
      updatedAt: '2024-01-01',
      views: 0,
      inquiries: 0,
      saleTerms: {
        transport: 'buyer_responsibility',
        slaughter: 'buyer_responsibility',
        paymentTerms: 'on_delivery',
        warranty: '',
        cancellationPolicy: '',
      },
    },
    {
      id: 'listing_3',
      subjectId: 'subject_3',
      producerId: 'producer_1', // Même producteur que listing_1
      farmId: 'farm_1',
      pricePerKg: 400,
      calculatedPrice: 40000,
      weight: 100,
      lastWeightDate: '2024-01-01',
      status: 'available',
      location: {
        latitude: 0,
        longitude: 0,
        address: 'Test',
        city: 'Test',
        region: 'Test',
      },
      listedAt: '2024-01-01',
      updatedAt: '2024-01-01',
      views: 0,
      inquiries: 0,
      saleTerms: {
        transport: 'buyer_responsibility',
        slaughter: 'buyer_responsibility',
        paymentTerms: 'on_delivery',
        warranty: '',
        cancellationPolicy: '',
      },
    },
  ];

  describe('filterListingsForBuyView', () => {
    it("devrait exclure les annonces de l'utilisateur", () => {
      const userId = 'producer_1';
      const filtered = filterListingsForBuyView(mockListings, userId);

      // Devrait exclure listing_1 et listing_3 (producer_1)
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('listing_2');
      expect(filtered[0].producerId).toBe('producer_2');
    });

    it("devrait retourner toutes les annonces si l'utilisateur n'est pas producteur", () => {
      const userId = 'user_other';
      const filtered = filterListingsForBuyView(mockListings, userId);

      expect(filtered).toHaveLength(3);
    });

    it("devrait retourner un tableau vide si toutes les annonces appartiennent à l'utilisateur", () => {
      const listings: MarketplaceListing[] = [
        { ...mockListings[0], producerId: 'user_1' },
        { ...mockListings[1], producerId: 'user_1' },
      ];
      const filtered = filterListingsForBuyView(listings, 'user_1');

      expect(filtered).toHaveLength(0);
    });
  });

  describe('canUserViewListingInBuyView', () => {
    it("devrait retourner false si l'annonce appartient à l'utilisateur", () => {
      const listing = mockListings[0];
      const userId = 'producer_1';

      expect(canUserViewListingInBuyView(listing, userId)).toBe(false);
    });

    it("devrait retourner true si l'annonce n'appartient pas à l'utilisateur", () => {
      const listing = mockListings[0];
      const userId = 'producer_2';

      expect(canUserViewListingInBuyView(listing, userId)).toBe(true);
    });
  });
});
