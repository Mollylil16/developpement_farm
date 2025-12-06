/**
 * Repository pour les annonces (Listings) du Marketplace
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import uuid from 'react-native-uuid';
import type { MarketplaceListing, Location, SaleTerms, MarketplaceFilters, MarketplaceSortOption } from '../../types/marketplace';
import { BaseRepository } from './BaseRepository';

export class MarketplaceListingRepository extends BaseRepository<MarketplaceListing> {
  constructor(db: SQLiteDatabase) {
    super(db, 'marketplace_listings');
  }

  /**
   * Créer une nouvelle annonce
   */
  async create(data: Partial<MarketplaceListing>): Promise<MarketplaceListing> {
    const createData = data as {
      subjectId: string;
      producerId: string;
      farmId: string;
      pricePerKg: number;
      calculatedPrice: number;
      lastWeightDate: string;
      location: Location;
      saleTerms: SaleTerms;
    };
    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO marketplace_listings (
        id, subject_id, producer_id, farm_id,
        price_per_kg, calculated_price, status,
        listed_at, updated_at, last_weight_date,
        location_latitude, location_longitude,
        location_address, location_city, location_region,
        sale_terms_transport, sale_terms_slaughter,
        sale_terms_payment, sale_terms_warranty, sale_terms_cancellation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        createData.subjectId,
        createData.producerId,
        createData.farmId,
        createData.pricePerKg,
        createData.calculatedPrice,
        'available',
        now,
        now,
        createData.lastWeightDate,
        createData.location.latitude,
        createData.location.longitude,
        createData.location.address,
        createData.location.city,
        createData.location.region,
        createData.saleTerms.transport,
        createData.saleTerms.slaughter,
        createData.saleTerms.paymentTerms || 'on_delivery',
        createData.saleTerms.warranty,
        createData.saleTerms.cancellationPolicy,
      ]
    );

    const listing = await this.findById(id);
    if (!listing) {
      throw new Error('Failed to create listing');
    }

    return listing;
  }

  /**
   * Récupérer une annonce par ID
   */
  async findById(id: string): Promise<MarketplaceListing | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );

    return row ? this.mapRowToListing(row) : null;
  }

  /**
   * Récupérer toutes les annonces d'un producteur
   */
  async findByProducerId(producerId: string): Promise<MarketplaceListing[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE producer_id = ? ORDER BY listed_at DESC`,
      [producerId]
    );

    return rows.map(row => this.mapRowToListing(row));
  }

  /**
   * Récupérer toutes les annonces d'une ferme
   */
  async findByFarmId(farmId: string): Promise<MarketplaceListing[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE farm_id = ? ORDER BY listed_at DESC`,
      [farmId]
    );

    return rows.map(row => this.mapRowToListing(row));
  }

  /**
   * Récupérer les annonces disponibles avec filtres
   */
  async findAvailable(filters?: MarketplaceFilters): Promise<MarketplaceListing[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE status = 'available'`;
    const params: any[] = [];

    // Filtres de prix
    if (filters?.minPrice !== undefined) {
      query += ' AND price_per_kg >= ?';
      params.push(filters.minPrice);
    }
    if (filters?.maxPrice !== undefined) {
      query += ' AND price_per_kg <= ?';
      params.push(filters.maxPrice);
    }

    // Note: Les filtres de localisation et autres nécessitent des JOINs
    // qui seront implémentés dans une méthode de recherche plus avancée

    query += ' ORDER BY listed_at DESC';

    const rows = await this.db.getAllAsync<any>(query, params);
    return rows.map(row => this.mapRowToListing(row));
  }

  /**
   * Mettre à jour une annonce
   */
  async update(id: string, data: Partial<MarketplaceListing>): Promise<MarketplaceListing> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.pricePerKg !== undefined) {
      updates.push('price_per_kg = ?');
      params.push(data.pricePerKg);
    }
    if (data.calculatedPrice !== undefined) {
      updates.push('calculated_price = ?');
      params.push(data.calculatedPrice);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.lastWeightDate !== undefined) {
      updates.push('last_weight_date = ?');
      params.push(data.lastWeightDate);
    }
    if (data.location !== undefined) {
      updates.push('location_latitude = ?', 'location_longitude = ?', 'location_address = ?', 'location_city = ?', 'location_region = ?');
      params.push(
        data.location.latitude,
        data.location.longitude,
        data.location.address,
        data.location.city,
        data.location.region
      );
    }
    if (data.saleTerms !== undefined) {
      updates.push('sale_terms_transport = ?', 'sale_terms_slaughter = ?', 'sale_terms_payment = ?', 'sale_terms_warranty = ?', 'sale_terms_cancellation = ?');
      params.push(
        data.saleTerms.transport,
        data.saleTerms.slaughter,
        data.saleTerms.paymentTerms || 'on_delivery',
        data.saleTerms.warranty,
        data.saleTerms.cancellationPolicy
      );
    }

    if (updates.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Listing not found');
      }
      return existing;
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await this.db.runAsync(
      `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to update listing');
    }
    return updated;
  }

  /**
   * Mettre à jour le statut d'une annonce
   */
  async updateStatus(id: string, status: 'available' | 'reserved' | 'pending_delivery' | 'sold' | 'removed'): Promise<void> {
    await this.update(id, { status });
  }

  /**
   * Incrémenter le compteur de vues
   */
  async incrementViews(id: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET views = views + 1 WHERE id = ?`,
      [id]
    );
  }

  /**
   * Incrémenter le compteur d'enquêtes (offres)
   */
  async incrementInquiries(id: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET inquiries = inquiries + 1 WHERE id = ?`,
      [id]
    );
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
    await this.db.runAsync(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  /**
   * Mapper une ligne DB vers un objet MarketplaceListing
   */
  private mapRowToListing(row: any): MarketplaceListing {
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
    let query = `SELECT * FROM ${this.tableName} WHERE status = 'available'`;
    const params: any[] = [];

    // Filtres
    if (filters?.minPrice !== undefined) {
      query += ' AND price_per_kg >= ?';
      params.push(filters.minPrice);
    }
    if (filters?.maxPrice !== undefined) {
      query += ' AND price_per_kg <= ?';
      params.push(filters.maxPrice);
    }

    // Tri
    switch (sort) {
      case 'price_asc':
        query += ' ORDER BY price_per_kg ASC';
        break;
      case 'price_desc':
        query += ' ORDER BY price_per_kg DESC';
        break;
      case 'recent':
        query += ' ORDER BY listed_at DESC';
        break;
      default:
        query += ' ORDER BY listed_at DESC';
    }

    // Compte total
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await this.db.getFirstAsync<{ count: number }>(countQuery, params);
    const total = countResult?.count || 0;

    // Pagination
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await this.db.getAllAsync<any>(query, params);
    const listings = rows.map(row => this.mapRowToListing(row));

    return { listings, total };
  }
}

