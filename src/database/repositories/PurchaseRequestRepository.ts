/**
 * Repository pour les demandes d'achat (Purchase Requests)
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import uuid from 'react-native-uuid';
import { BaseRepository } from './BaseRepository';
import type {
  PurchaseRequest,
  PurchaseRequestOffer,
  PurchaseRequestMatch,
  PurchaseRequestStatus,
  PurchaseRequestOfferStatus,
} from '../../types/marketplace';

export class PurchaseRequestRepository extends BaseRepository<PurchaseRequest> {
  constructor(db: SQLiteDatabase) {
    super(db, 'purchase_requests');
  }

  /**
   * Créer une nouvelle demande d'achat
   */
  async create(data: {
    buyerId: string;
    title: string; // Toujours requis, généré automatiquement si non fourni
    race: string; // Toujours requis, peut être 'Peu importe'
    minWeight: number;
    maxWeight: number;
    ageCategory?: string;
    minAgeMonths?: number;
    maxAgeMonths?: number;
    quantity: number;
    deliveryLocation?: {
      latitude?: number;
      longitude?: number;
      address?: string;
      city?: string;
      region?: string;
      department?: string;
      radiusKm?: number;
    };
    maxPricePerKg?: number;
    maxTotalPrice?: number;
    deliveryDate?: string;
    deliveryPeriodStart?: string;
    deliveryPeriodEnd?: string;
    message?: string;
    expiresAt?: string;
  }): Promise<PurchaseRequest> {
    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO purchase_requests (
        id, buyer_id, title, race, min_weight, max_weight,
        age_category, min_age_months, max_age_months, quantity,
        delivery_location_latitude, delivery_location_longitude,
        delivery_location_address, delivery_location_city,
        delivery_location_region, delivery_location_department,
        delivery_radius_km, max_price_per_kg, max_total_price,
        delivery_date, delivery_period_start, delivery_period_end,
        message, status, views, matched_producers_count, offers_count,
        expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.buyerId,
        data.title,
        data.race,
        data.minWeight,
        data.maxWeight,
        data.ageCategory || null,
        data.minAgeMonths || null,
        data.maxAgeMonths || null,
        data.quantity,
        data.deliveryLocation?.latitude || null,
        data.deliveryLocation?.longitude || null,
        data.deliveryLocation?.address || null,
        data.deliveryLocation?.city || null,
        data.deliveryLocation?.region || null,
        data.deliveryLocation?.department || null,
        data.deliveryLocation?.radiusKm || null,
        data.maxPricePerKg || null,
        data.maxTotalPrice || null,
        data.deliveryDate || null,
        data.deliveryPeriodStart || null,
        data.deliveryPeriodEnd || null,
        data.message || null,
        'published',
        0,
        0,
        0,
        data.expiresAt || null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create purchase request');
    return created;
  }

  /**
   * Mettre à jour une demande d'achat
   */
  async update(id: string, updates: Partial<PurchaseRequest>): Promise<PurchaseRequest> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.race !== undefined) {
      fields.push('race = ?');
      values.push(updates.race);
    }
    if (updates.minWeight !== undefined) {
      fields.push('min_weight = ?');
      values.push(updates.minWeight);
    }
    if (updates.maxWeight !== undefined) {
      fields.push('max_weight = ?');
      values.push(updates.maxWeight);
    }
    if (updates.ageCategory !== undefined) {
      fields.push('age_category = ?');
      values.push(updates.ageCategory);
    }
    if (updates.minAgeMonths !== undefined) {
      fields.push('min_age_months = ?');
      values.push(updates.minAgeMonths);
    }
    if (updates.maxAgeMonths !== undefined) {
      fields.push('max_age_months = ?');
      values.push(updates.maxAgeMonths);
    }
    if (updates.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(updates.quantity);
    }
    if (updates.deliveryLocation !== undefined) {
      fields.push(
        'delivery_location_latitude = ?, delivery_location_longitude = ?, delivery_location_address = ?, delivery_location_city = ?, delivery_location_region = ?, delivery_location_department = ?, delivery_radius_km = ?'
      );
      values.push(
        updates.deliveryLocation.latitude || null,
        updates.deliveryLocation.longitude || null,
        updates.deliveryLocation.address || null,
        updates.deliveryLocation.city || null,
        updates.deliveryLocation.region || null,
        updates.deliveryLocation.department || null,
        updates.deliveryLocation.radiusKm || null
      );
    }
    if (updates.maxPricePerKg !== undefined) {
      fields.push('max_price_per_kg = ?');
      values.push(updates.maxPricePerKg);
    }
    if (updates.maxTotalPrice !== undefined) {
      fields.push('max_total_price = ?');
      values.push(updates.maxTotalPrice);
    }
    if (updates.deliveryDate !== undefined) {
      fields.push('delivery_date = ?');
      values.push(updates.deliveryDate);
    }
    if (updates.deliveryPeriodStart !== undefined) {
      fields.push('delivery_period_start = ?');
      values.push(updates.deliveryPeriodStart);
    }
    if (updates.deliveryPeriodEnd !== undefined) {
      fields.push('delivery_period_end = ?');
      values.push(updates.deliveryPeriodEnd);
    }
    if (updates.message !== undefined) {
      fields.push('message = ?');
      values.push(updates.message);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.expiresAt !== undefined) {
      fields.push('expires_at = ?');
      values.push(updates.expiresAt);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    if (fields.length > 1) {
      await this.db.runAsync(
        `UPDATE purchase_requests SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    const updated = await this.findById(id);
    if (!updated) throw new Error('Failed to update purchase request');
    return updated;
  }

  /**
   * Trouver toutes les demandes d'un acheteur
   */
  async findByBuyerId(buyerId: string, includeArchived = false): Promise<PurchaseRequest[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE buyer_id = ?`;
    const params: any[] = [buyerId];

    if (!includeArchived) {
      query += ` AND status != 'archived' AND deleted_at IS NULL`;
    } else {
      query += ` AND deleted_at IS NULL`;
    }

    query += ` ORDER BY created_at DESC`;

    const rows = await this.db.getAllAsync<any>(query, params);
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Trouver les demandes publiées (pour les producteurs)
   */
  async findPublished(filters?: {
    race?: string;
    minWeight?: number;
    maxWeight?: number;
    region?: string;
    maxPricePerKg?: number;
  }): Promise<PurchaseRequest[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE status = 'published' AND deleted_at IS NULL`;
    const params: any[] = [];

    if (filters?.race) {
      query += ` AND race = ?`;
      params.push(filters.race);
    }
    if (filters?.minWeight !== undefined) {
      query += ` AND max_weight >= ?`;
      params.push(filters.minWeight);
    }
    if (filters?.maxWeight !== undefined) {
      query += ` AND min_weight <= ?`;
      params.push(filters.maxWeight);
    }
    if (filters?.region) {
      query += ` AND delivery_location_region = ?`;
      params.push(filters.region);
    }
    if (filters?.maxPricePerKg !== undefined) {
      query += ` AND (max_price_per_kg IS NULL OR max_price_per_kg >= ?)`;
      params.push(filters.maxPricePerKg);
    }

    query += ` ORDER BY created_at DESC`;

    const rows = await this.db.getAllAsync<any>(query, params);
    return rows.map((row) => this.mapRow(row));
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
   * Incrémenter le compteur de producteurs matchés
   */
  async incrementMatchedProducers(id: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET matched_producers_count = matched_producers_count + 1 WHERE id = ?`,
      [id]
    );
  }

  /**
   * Incrémenter le compteur d'offres
   */
  async incrementOffers(id: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET offers_count = offers_count + 1 WHERE id = ?`,
      [id]
    );
  }

  /**
   * Archiver une demande
   */
  async archive(id: string): Promise<void> {
    await this.update(id, { status: 'archived' });
  }

  /**
   * Restaurer une demande archivée
   */
  async restore(id: string): Promise<void> {
    await this.update(id, { status: 'published' });
  }

  /**
   * Marquer comme pourvu
   */
  async markAsFulfilled(id: string): Promise<void> {
    await this.update(id, { status: 'fulfilled' });
  }

  /**
   * Mapper une ligne de la base de données vers un objet PurchaseRequest
   */
  private mapRow(row: any): PurchaseRequest {
    return {
      id: row.id,
      buyerId: row.buyer_id,
      title: row.title,
      race: row.race,
      minWeight: row.min_weight,
      maxWeight: row.max_weight,
      ageCategory: row.age_category || undefined,
      minAgeMonths: row.min_age_months || undefined,
      maxAgeMonths: row.max_age_months || undefined,
      quantity: row.quantity,
      deliveryLocation:
        row.delivery_location_latitude || row.delivery_location_longitude
          ? {
              latitude: row.delivery_location_latitude || undefined,
              longitude: row.delivery_location_longitude || undefined,
              address: row.delivery_location_address || undefined,
              city: row.delivery_location_city || undefined,
              region: row.delivery_location_region || undefined,
              department: row.delivery_location_department || undefined,
              radiusKm: row.delivery_radius_km || undefined,
            }
          : undefined,
      maxPricePerKg: row.max_price_per_kg || undefined,
      maxTotalPrice: row.max_total_price || undefined,
      deliveryDate: row.delivery_date || undefined,
      deliveryPeriodStart: row.delivery_period_start || undefined,
      deliveryPeriodEnd: row.delivery_period_end || undefined,
      message: row.message || undefined,
      status: row.status as PurchaseRequestStatus,
      views: row.views || 0,
      matchedProducersCount: row.matched_producers_count || 0,
      offersCount: row.offers_count || 0,
      expiresAt: row.expires_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at || undefined,
    };
  }
}

/**
 * Repository pour les offres sur demandes d'achat
 */
export class PurchaseRequestOfferRepository extends BaseRepository<PurchaseRequestOffer> {
  constructor(db: SQLiteDatabase) {
    super(db, 'purchase_request_offers');
  }

  /**
   * Créer une nouvelle offre
   */
  async create(data: {
    purchaseRequestId: string;
    producerId: string;
    listingId?: string;
    subjectIds: string[];
    proposedPricePerKg: number;
    proposedTotalPrice: number;
    quantity: number;
    availableDate?: string;
    message?: string;
    expiresAt?: string;
  }): Promise<PurchaseRequestOffer> {
    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO purchase_request_offers (
        id, purchase_request_id, producer_id, listing_id, subject_ids,
        proposed_price_per_kg, proposed_total_price, quantity,
        available_date, message, status, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.purchaseRequestId,
        data.producerId,
        data.listingId || null,
        JSON.stringify(data.subjectIds),
        data.proposedPricePerKg,
        data.proposedTotalPrice,
        data.quantity,
        data.availableDate || null,
        data.message || null,
        'pending',
        now,
        data.expiresAt || null,
      ]
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create purchase request offer');
    return created;
  }

  /**
   * Trouver toutes les offres d'une demande d'achat
   */
  async findByPurchaseRequestId(
    purchaseRequestId: string,
    status?: PurchaseRequestOfferStatus
  ): Promise<PurchaseRequestOffer[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE purchase_request_id = ?`;
    const params: any[] = [purchaseRequestId];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const rows = await this.db.getAllAsync<any>(query, params);
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Trouver toutes les offres d'un producteur
   */
  async findByProducerId(producerId: string): Promise<PurchaseRequestOffer[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE producer_id = ? ORDER BY created_at DESC`,
      [producerId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Mettre à jour le statut d'une offre
   */
  async updateStatus(id: string, status: PurchaseRequestOfferStatus): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET status = ?, responded_at = ? WHERE id = ?`,
      [status, now, id]
    );
  }

  /**
   * Retirer une offre
   */
  async withdraw(id: string): Promise<void> {
    await this.updateStatus(id, 'withdrawn');
  }

  /**
   * Mapper une ligne de la base de données vers un objet PurchaseRequestOffer
   */
  private mapRow(row: any): PurchaseRequestOffer {
    return {
      id: row.id,
      purchaseRequestId: row.purchase_request_id,
      producerId: row.producer_id,
      listingId: row.listing_id || undefined,
      subjectIds: JSON.parse(row.subject_ids || '[]'),
      proposedPricePerKg: row.proposed_price_per_kg,
      proposedTotalPrice: row.proposed_total_price,
      quantity: row.quantity,
      availableDate: row.available_date || undefined,
      message: row.message || undefined,
      status: row.status as PurchaseRequestOfferStatus,
      createdAt: row.created_at,
      respondedAt: row.responded_at || undefined,
      expiresAt: row.expires_at || undefined,
    };
  }
}

/**
 * Repository pour les matches entre demandes d'achat et listings
 */
export class PurchaseRequestMatchRepository extends BaseRepository<PurchaseRequestMatch> {
  constructor(db: SQLiteDatabase) {
    super(db, 'purchase_request_matches');
  }

  /**
   * Créer un match
   */
  async create(data: {
    purchaseRequestId: string;
    producerId: string;
    listingId: string;
    matchScore?: number;
  }): Promise<PurchaseRequestMatch> {
    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO purchase_request_matches (
        id, purchase_request_id, producer_id, listing_id,
        match_score, notified, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [id, data.purchaseRequestId, data.producerId, data.listingId, data.matchScore || null, now]
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create purchase request match');
    return created;
  }

  /**
   * Trouver tous les matches d'une demande d'achat
   */
  async findByPurchaseRequestId(purchaseRequestId: string): Promise<PurchaseRequestMatch[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE purchase_request_id = ? ORDER BY match_score DESC, created_at DESC`,
      [purchaseRequestId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Trouver tous les matches d'un producteur
   */
  async findByProducerId(producerId: string): Promise<PurchaseRequestMatch[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE producer_id = ? ORDER BY created_at DESC`,
      [producerId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Marquer comme notifié
   */
  async markAsNotified(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET notified = 1, notification_sent_at = ? WHERE id = ?`,
      [now, id]
    );
  }

  /**
   * Vérifier si un match existe déjà
   */
  async exists(purchaseRequestId: string, listingId: string): Promise<boolean> {
    const row = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE purchase_request_id = ? AND listing_id = ?`,
      [purchaseRequestId, listingId]
    );
    return (row?.count || 0) > 0;
  }

  /**
   * Mapper une ligne de la base de données vers un objet PurchaseRequestMatch
   */
  private mapRow(row: any): PurchaseRequestMatch {
    return {
      id: row.id,
      purchaseRequestId: row.purchase_request_id,
      producerId: row.producer_id,
      listingId: row.listing_id,
      matchScore: row.match_score || undefined,
      notified: Boolean(row.notified),
      notificationSentAt: row.notification_sent_at || undefined,
      createdAt: row.created_at,
    };
  }
}

