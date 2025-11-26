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
        data.subjectId,
        data.producerId,
        data.farmId,
        data.pricePerKg,
        data.calculatedPrice,
        'available',
        now,
        now,
        data.lastWeightDate,
        data.location.latitude,
        data.location.longitude,
        data.location.address,
        data.location.city,
        data.location.region,
        data.saleTerms.transport,
        data.saleTerms.slaughter,
        data.saleTerms.paymentTerms || 'on_delivery',
        data.saleTerms.warranty,
        data.saleTerms.cancellationPolicy,
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
   * Mettre à jour le statut d'une annonce
   */
  async updateStatus(id: string, status: 'available' | 'reserved' | 'pending_delivery' | 'sold' | 'removed'): Promise<void> {
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET status = ?, updated_at = ? WHERE id = ?`,
      [status, new Date().toISOString(), id]
    );
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

