/**
 * Repository pour les annonces (Listings) du Marketplace
 */

import type {
  MarketplaceListing,
  Location,
  SaleTerms,
  MarketplaceFilters,
  MarketplaceSortOption,
} from '../../types/marketplace';
import { BaseRepository } from './BaseRepository';

export class MarketplaceListingRepository extends BaseRepository<MarketplaceListing> {
  constructor() {
    super('marketplace_listings', '/marketplace/listings');
  }

  /**
   * Override findAll pour utiliser updated_at si derniere_modification n'existe pas
   */
  async findAll(projetId?: string): Promise<MarketplaceListing[]> {
    const params: Record<string, unknown> = {
      order_by: 'updated_at',
      order_direction: 'DESC',
    };
    if (projetId) {
      params.farm_id = projetId;
    }
    return this.query<MarketplaceListing>(this.apiBasePath, params);
  }

  /**
   * Créer une nouvelle annonce
   */
  async create(data: {
    subjectId: string;
    producerId: string;
    farmId: string;
    pricePerKg: number;
    calculatedPrice: number;
    lastWeightDate: string;
    location: Location;
    saleTerms: SaleTerms;
  }): Promise<MarketplaceListing> {
    const listingData = {
      subject_id: data.subjectId,
      producer_id: data.producerId,
      farm_id: data.farmId,
      price_per_kg: data.pricePerKg,
      calculated_price: data.calculatedPrice,
      status: 'available',
      last_weight_date: data.lastWeightDate,
      location: data.location,
      sale_terms: {
        ...data.saleTerms,
        payment_terms: data.saleTerms.paymentTerms || 'on_delivery',
      },
    };
    return this.executePost<MarketplaceListing>(this.apiBasePath, listingData);
  }

  /**
   * Récupérer une annonce par ID
   */
  async findById(id: string): Promise<MarketplaceListing | null> {
    const row = await this.queryOne<unknown>(`${this.apiBasePath}/${id}`);
    return row ? this.mapRowToListing(row) : null;
  }

  /**
   * Récupérer toutes les annonces d'un producteur
   */
  async findByProducerId(producerId: string): Promise<MarketplaceListing[]> {
    const rows = await this.query<unknown>(this.apiBasePath, {
      producer_id: producerId,
      order_by: 'listed_at',
      order_direction: 'DESC',
    });
    return rows.map((row) => this.mapRowToListing(row));
  }

  /**
   * Récupérer toutes les annonces d'une ferme
   */
  async findByFarmId(farmId: string): Promise<MarketplaceListing[]> {
    const rows = await this.query<unknown>(this.apiBasePath, {
      farm_id: farmId,
      order_by: 'listed_at',
      order_direction: 'DESC',
    });
    return rows.map((row) => this.mapRowToListing(row));
  }

  /**
   * Récupérer toutes les annonces d'un sujet (animal)
   */
  async findBySubjectId(subjectId: string): Promise<MarketplaceListing[]> {
    const rows = await this.query<unknown>(this.apiBasePath, {
      subject_id: subjectId,
      order_by: 'listed_at',
      order_direction: 'DESC',
    });
    return rows.map((row) => this.mapRowToListing(row));
  }

  /**
   * Récupérer les annonces disponibles avec filtres
   */
  async findAvailable(filters?: MarketplaceFilters): Promise<MarketplaceListing[]> {
    const params: Record<string, unknown> = {
      status: 'available',
      order_by: 'listed_at',
      order_direction: 'DESC',
    };
    if (filters?.minPrice !== undefined) {
      params.min_price = filters.minPrice;
    }
    if (filters?.maxPrice !== undefined) {
      params.max_price = filters.maxPrice;
    }
    const rows = await this.query<unknown>(this.apiBasePath, params);
    return rows.map((row) => this.mapRowToListing(row));
  }

  /**
   * Mettre à jour le statut d'une annonce
   */
  async updateStatus(
    id: string,
    status: 'available' | 'reserved' | 'pending_delivery' | 'sold' | 'removed'
  ): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/${id}`, { status });
  }

  /**
   * Incrémenter le compteur de vues
   */
  async incrementViews(id: string): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/${id}/views`, {});
  }

  /**
   * Incrémenter le compteur d'enquêtes (offres)
   */
  async incrementInquiries(id: string): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/${id}/inquiries`, {});
  }

  /**
   * Retirer une annonce (soft delete)
   */
  async remove(id: string): Promise<void> {
    await this.updateStatus(id, 'removed');
  }

  /**
   * Supprimer définitivement une annonce
   */
  async delete(id: string): Promise<void> {
    await this.executeDelete(`${this.apiBasePath}/${id}`);
  }

  /**
   * Mapper une ligne DB vers un objet MarketplaceListing
   */
  private mapRowToListing(row: unknown): MarketplaceListing {
    return {
      id: row.id,
      subjectId: row.subject_id,
      producerId: row.producer_id,
      farmId: row.farm_id,
      pricePerKg: row.price_per_kg,
      calculatedPrice: row.calculated_price,
      status: row.status,
      listedAt: row.listed_at,
      updatedAt: row.updated_at,
      lastWeightDate: row.last_weight_date,
      location: {
        latitude: row.location_latitude,
        longitude: row.location_longitude,
        address: row.location_address,
        city: row.location_city,
        region: row.location_region,
      },
      saleTerms: {
        transport: row.sale_terms_transport,
        slaughter: row.sale_terms_slaughter,
        paymentTerms: row.sale_terms_payment,
        warranty: row.sale_terms_warranty,
        cancellationPolicy: row.sale_terms_cancellation,
      },
      views: row.views || 0,
      inquiries: row.inquiries || 0,
    };
  }

  /**
   * Rechercher les annonces avec filtres avancés et pagination
   */
  async search(
    filters?: MarketplaceFilters,
    sort?: MarketplaceSortOption,
    page: number = 1,
    limit: number = 20
  ): Promise<{ listings: MarketplaceListing[]; total: number }> {
    const params: Record<string, unknown> = {
      status: 'available',
      limit,
      offset: (page - 1) * limit,
    };

    // Filtres
    if (filters?.minPrice !== undefined) {
      params.min_price = filters.minPrice;
    }
    if (filters?.maxPrice !== undefined) {
      params.max_price = filters.maxPrice;
    }

    // Tri
    switch (sort) {
      case 'price_asc':
        params.order_by = 'price_per_kg';
        params.order_direction = 'ASC';
        break;
      case 'price_desc':
        params.order_by = 'price_per_kg';
        params.order_direction = 'DESC';
        break;
      case 'recent':
        params.order_by = 'listed_at';
        params.order_direction = 'DESC';
        break;
      default:
        params.order_by = 'listed_at';
        params.order_direction = 'DESC';
    }

    const result = await this.findAllPaginated({
      limit,
      offset: (page - 1) * limit,
      orderBy: params.order_by as string,
      orderDirection: params.order_direction as 'ASC' | 'DESC',
    });

    // Filtrer par prix si nécessaire
    let listings = result.data;
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      listings = listings.filter((listing) => {
        if (filters.minPrice !== undefined && listing.pricePerKg < filters.minPrice) {
          return false;
        }
        if (filters.maxPrice !== undefined && listing.pricePerKg > filters.maxPrice) {
          return false;
        }
        return true;
      });
    }

    return { listings, total: result.total };
  }
}
