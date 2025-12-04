/**
 * Tests pour marketplaceFilters
 */

import { filterListingsForBuyView, canUserViewListingInBuyView } from '../marketplaceFilters';
import type { MarketplaceListing } from '../../types/marketplace';

describe('marketplaceFilters', () => {
  const mockListings: MarketplaceListing[] = [
    {
      id: '1',
      subjectId: 'animal-1',
      producerId: 'producer-1',
      farmId: 'farm-1',
      pricePerKg: 2000,
      calculatedPrice: 200000,
      weight: 100,
      status: 'available',
      location: {
        latitude: 10.0,
        longitude: 20.0,
        city: 'City1',
        region: 'Region1',
      },
      listedAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      subjectId: 'animal-2',
      producerId: 'producer-2',
      farmId: 'farm-2',
      pricePerKg: 2500,
      calculatedPrice: 250000,
      weight: 100,
      status: 'available',
      location: {
        latitude: 10.1,
        longitude: 20.1,
        city: 'City2',
        region: 'Region2',
      },
      listedAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: '3',
      subjectId: 'animal-3',
      producerId: 'producer-1', // Même producteur que listing 1
      farmId: 'farm-3',
      pricePerKg: 1800,
      calculatedPrice: 180000,
      weight: 100,
      status: 'available',
      location: {
        latitude: 10.2,
        longitude: 20.2,
        city: 'City3',
        region: 'Region3',
      },
      listedAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
    },
  ];

  describe('filterListingsForBuyView', () => {
    it('devrait exclure les listings du producteur spécifié', () => {
      const userId = 'producer-1';
      const result = filterListingsForBuyView(mockListings, userId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
      expect(result.every((l) => l.producerId !== userId)).toBe(true);
    });

    it('devrait retourner tous les listings si aucun ne correspond au producteur', () => {
      const userId = 'producer-999';
      const result = filterListingsForBuyView(mockListings, userId);

      expect(result).toHaveLength(3);
    });

    it('devrait retourner un tableau vide si tous les listings appartiennent au producteur', () => {
      const listings = mockListings.map((l) => ({ ...l, producerId: 'producer-1' }));
      const result = filterListingsForBuyView(listings, 'producer-1');

      expect(result).toEqual([]);
    });

    it('devrait gérer un tableau vide', () => {
      const result = filterListingsForBuyView([], 'producer-1');

      expect(result).toEqual([]);
    });
  });

  describe('canUserViewListingInBuyView', () => {
    it('devrait retourner true si le listing n\'appartient pas à l\'utilisateur', () => {
      const listing = mockListings[0];
      const userId = 'producer-2';

      const result = canUserViewListingInBuyView(listing, userId);

      expect(result).toBe(true);
    });

    it('devrait retourner false si le listing appartient à l\'utilisateur', () => {
      const listing = mockListings[0];
      const userId = 'producer-1';

      const result = canUserViewListingInBuyView(listing, userId);

      expect(result).toBe(false);
    });

    it('devrait retourner true si les IDs ne correspondent pas exactement', () => {
      const listing = mockListings[0];
      const userId = 'producer-1-different';

      const result = canUserViewListingInBuyView(listing, userId);

      expect(result).toBe(true);
    });
  });
});

