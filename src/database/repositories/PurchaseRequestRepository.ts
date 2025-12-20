/**
 * Repository pour les demandes d'achat (Purchase Requests)
 */

import { BaseRepository } from './BaseRepository';
import type {
  PurchaseRequest,
  PurchaseRequestOffer,
  PurchaseRequestMatch,
  PurchaseRequestStatus,
  PurchaseRequestOfferStatus,
} from '../../types/marketplace';

export class PurchaseRequestRepository extends BaseRepository<PurchaseRequest> {
  constructor() {
    super('purchase_requests', '/marketplace/purchase-requests');
  }

  /**
   * Créer une nouvelle demande d'achat
   */
  async create(data: {
    buyerId: string;
    title: string;
    race: string;
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
    const requestData = {
      buyer_id: data.buyerId,
      title: data.title,
      race: data.race,
      min_weight: data.minWeight,
      max_weight: data.maxWeight,
      age_category: data.ageCategory || null,
      min_age_months: data.minAgeMonths || null,
      max_age_months: data.maxAgeMonths || null,
      quantity: data.quantity,
      delivery_location: data.deliveryLocation || null,
      max_price_per_kg: data.maxPricePerKg || null,
      max_total_price: data.maxTotalPrice || null,
      delivery_date: data.deliveryDate || null,
      delivery_period_start: data.deliveryPeriodStart || null,
      delivery_period_end: data.deliveryPeriodEnd || null,
      message: data.message || null,
      expires_at: data.expiresAt || null,
    };

    return this.executePost<PurchaseRequest>(this.apiBasePath, requestData);
  }

  /**
   * Mettre à jour une demande d'achat
   */
  async update(id: string, updates: Partial<PurchaseRequest>): Promise<PurchaseRequest> {
    const updateData: Record<string, unknown> = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.race !== undefined) updateData.race = updates.race;
    if (updates.minWeight !== undefined) updateData.min_weight = updates.minWeight;
    if (updates.maxWeight !== undefined) updateData.max_weight = updates.maxWeight;
    if (updates.ageCategory !== undefined) updateData.age_category = updates.ageCategory;
    if (updates.minAgeMonths !== undefined) updateData.min_age_months = updates.minAgeMonths;
    if (updates.maxAgeMonths !== undefined) updateData.max_age_months = updates.maxAgeMonths;
    if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
    if (updates.deliveryLocation !== undefined) updateData.delivery_location = updates.deliveryLocation;
    if (updates.maxPricePerKg !== undefined) updateData.max_price_per_kg = updates.maxPricePerKg;
    if (updates.maxTotalPrice !== undefined) updateData.max_total_price = updates.maxTotalPrice;
    if (updates.deliveryDate !== undefined) updateData.delivery_date = updates.deliveryDate;
    if (updates.deliveryPeriodStart !== undefined) updateData.delivery_period_start = updates.deliveryPeriodStart;
    if (updates.deliveryPeriodEnd !== undefined) updateData.delivery_period_end = updates.deliveryPeriodEnd;
    if (updates.message !== undefined) updateData.message = updates.message;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt;

    return this.executePatch<PurchaseRequest>(`${this.apiBasePath}/${id}`, updateData);
  }

  /**
   * Trouver toutes les demandes d'un acheteur
   */
  async findByBuyerId(buyerId: string, includeArchived = false): Promise<PurchaseRequest[]> {
    const params: Record<string, unknown> = {
      buyer_id: buyerId,
    };

    if (!includeArchived) {
      params.exclude_archived = true;
    }

    return this.query<PurchaseRequest>(this.apiBasePath, params);
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
    const params: Record<string, unknown> = {
      status: 'published',
    };

    if (filters?.race) {
      params.race = filters.race;
    }
    if (filters?.minWeight !== undefined) {
      params.min_weight = filters.minWeight;
    }
    if (filters?.maxWeight !== undefined) {
      params.max_weight = filters.maxWeight;
    }
    if (filters?.region) {
      params.region = filters.region;
    }
    if (filters?.maxPricePerKg !== undefined) {
      params.max_price_per_kg = filters.maxPricePerKg;
    }

    return this.query<PurchaseRequest>(this.apiBasePath, params);
  }

  /**
   * Incrémenter le compteur de vues
   */
  async incrementViews(id: string): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/${id}/increment-views`, {});
  }

  /**
   * Incrémenter le compteur de producteurs matchés
   */
  async incrementMatchedProducers(id: string): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/${id}/increment-matched-producers`, {});
  }

  /**
   * Incrémenter le compteur d'offres
   */
  async incrementOffers(id: string): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/${id}/increment-offers`, {});
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
}

/**
 * Repository pour les offres sur demandes d'achat
 */
export class PurchaseRequestOfferRepository extends BaseRepository<PurchaseRequestOffer> {
  constructor() {
    super('purchase_request_offers', '/marketplace/purchase-request-offers');
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
    const offerData = {
      purchase_request_id: data.purchaseRequestId,
      producer_id: data.producerId,
      listing_id: data.listingId || null,
      subject_ids: data.subjectIds,
      proposed_price_per_kg: data.proposedPricePerKg,
      proposed_total_price: data.proposedTotalPrice,
      quantity: data.quantity,
      available_date: data.availableDate || null,
      message: data.message || null,
      expires_at: data.expiresAt || null,
    };

    return this.executePost<PurchaseRequestOffer>(this.apiBasePath, offerData);
  }

  /**
   * Trouver toutes les offres d'une demande d'achat
   */
  async findByPurchaseRequestId(
    purchaseRequestId: string,
    status?: PurchaseRequestOfferStatus
  ): Promise<PurchaseRequestOffer[]> {
    const params: Record<string, unknown> = {
      purchase_request_id: purchaseRequestId,
    };

    if (status) {
      params.status = status;
    }

    return this.query<PurchaseRequestOffer>(this.apiBasePath, params);
  }

  /**
   * Trouver toutes les offres d'un producteur
   */
  async findByProducerId(producerId: string): Promise<PurchaseRequestOffer[]> {
    const params: Record<string, unknown> = {
      producer_id: producerId,
    };

    return this.query<PurchaseRequestOffer>(this.apiBasePath, params);
  }

  /**
   * Mettre à jour le statut d'une offre
   */
  async updateStatus(id: string, status: PurchaseRequestOfferStatus): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/${id}`, { status });
  }

  /**
   * Retirer une offre
   */
  async withdraw(id: string): Promise<void> {
    await this.updateStatus(id, 'withdrawn');
  }

  /**
   * Mettre à jour une offre (override de BaseRepository)
   */
  async update(id: string, data: Partial<PurchaseRequestOffer>): Promise<PurchaseRequestOffer> {
    return this.executePatch<PurchaseRequestOffer>(`${this.apiBasePath}/${id}`, data);
  }
}

/**
 * Repository pour les matches entre demandes d'achat et listings
 */
export class PurchaseRequestMatchRepository extends BaseRepository<PurchaseRequestMatch> {
  constructor() {
    super('purchase_request_matches', '/marketplace/purchase-request-matches');
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
    const matchData = {
      purchase_request_id: data.purchaseRequestId,
      producer_id: data.producerId,
      listing_id: data.listingId,
      match_score: data.matchScore || null,
    };

    return this.executePost<PurchaseRequestMatch>(this.apiBasePath, matchData);
  }

  /**
   * Trouver tous les matches d'une demande d'achat
   */
  async findByPurchaseRequestId(purchaseRequestId: string): Promise<PurchaseRequestMatch[]> {
    const params: Record<string, unknown> = {
      purchase_request_id: purchaseRequestId,
    };

    return this.query<PurchaseRequestMatch>(this.apiBasePath, params);
  }

  /**
   * Trouver tous les matches d'un producteur
   */
  async findByProducerId(producerId: string): Promise<PurchaseRequestMatch[]> {
    const params: Record<string, unknown> = {
      producer_id: producerId,
    };

    return this.query<PurchaseRequestMatch>(this.apiBasePath, params);
  }

  /**
   * Marquer comme notifié
   */
  async markAsNotified(id: string): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/${id}`, { notified: true });
  }

  /**
   * Vérifier si un match existe déjà
   */
  async exists(purchaseRequestId: string, listingId: string): Promise<boolean> {
    const params: Record<string, unknown> = {
      purchase_request_id: purchaseRequestId,
      listing_id: listingId,
    };

    const result = await this.queryOne<{ exists: boolean }>(`${this.apiBasePath}/exists`, params);
    return result?.exists || false;
  }

  /**
   * Mettre à jour un match (override de BaseRepository)
   */
  async update(id: string, data: Partial<PurchaseRequestMatch>): Promise<PurchaseRequestMatch> {
    return this.executePatch<PurchaseRequestMatch>(`${this.apiBasePath}/${id}`, data);
  }
}
