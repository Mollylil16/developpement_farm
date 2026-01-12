/**
 * Service de gestion automatique des ventes marketplace
 * Gère la logique de décision automatique pour les offres :
 * - Acceptation automatique si prix >= target
 * - Demande de confirmation si prix entre min-3% et min
 * - Rejet automatique si prix < min-5%
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './dto/notification.dto';
import { v4 as uuidv4 } from 'uuid';

export interface AutoSaleSettings {
  id: string;
  listingId: string;
  userId: string;
  minPricePerKg: number;
  targetPricePerKg: number;
  autoAcceptThreshold: number; // % sous target pour acceptation auto
  confirmThreshold: number; // % sous min pour demander confirmation (3-5%)
  autoRejectThreshold: number; // % sous min pour rejet auto (> 5%)
  autoManagementEnabled: boolean;
  kouakouManaged: boolean;
  offersAutoAccepted: number;
  offersAutoRejected: number;
  offersPendingConfirmation: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingDecision {
  id: string;
  settingId: string;
  offerId: string;
  offeredPrice: number;
  offeredPricePerKg: number;
  minPricePerKg: number;
  priceDifferencePercent: number;
  recommendedAction: 'accept' | 'reject' | 'counter';
  recommendedCounterPrice?: number;
  kouakouMessage: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'expired';
  userResponse?: string;
  respondedAt?: Date;
  createdAt: Date;
  expiresAt: Date;
}

export interface CreateAutoSaleSettingsDto {
  listingId: string;
  minPricePerKg: number;
  targetPricePerKg: number;
  autoAcceptThreshold?: number;
  confirmThreshold?: number;
  autoRejectThreshold?: number;
  autoManagementEnabled?: boolean;
  kouakouManaged?: boolean;
}

export interface OfferDecisionResult {
  action: 'auto_accepted' | 'auto_rejected' | 'pending_confirmation' | 'manual';
  message: string;
  pendingDecisionId?: string;
}

@Injectable()
export class AutoSaleService {
  private readonly logger = new Logger(AutoSaleService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService
  ) {}

  /**
   * Créer ou mettre à jour les paramètres de vente automatique
   */
  async upsertSettings(dto: CreateAutoSaleSettingsDto): Promise<AutoSaleSettings> {
    const id = `auto_sale_${uuidv4()}`;
    const now = new Date();

    const result = await this.databaseService.query(
      `INSERT INTO marketplace_auto_sale_settings (
        id, listing_id, user_id, min_price_per_kg, target_price_per_kg,
        auto_accept_threshold, confirm_threshold, auto_reject_threshold,
        auto_management_enabled, kouakou_managed, created_at, updated_at
      )
      SELECT $1, $2, l.producer_id, $3, $4, $5, $6, $7, $8, $9, $10, $10
      FROM marketplace_listings l WHERE l.id = $2
      ON CONFLICT (listing_id) DO UPDATE SET
        min_price_per_kg = EXCLUDED.min_price_per_kg,
        target_price_per_kg = EXCLUDED.target_price_per_kg,
        auto_accept_threshold = EXCLUDED.auto_accept_threshold,
        confirm_threshold = EXCLUDED.confirm_threshold,
        auto_reject_threshold = EXCLUDED.auto_reject_threshold,
        auto_management_enabled = EXCLUDED.auto_management_enabled,
        kouakou_managed = EXCLUDED.kouakou_managed,
        updated_at = $10
      RETURNING *`,
      [
        id,
        dto.listingId,
        dto.minPricePerKg,
        dto.targetPricePerKg,
        dto.autoAcceptThreshold ?? 0,
        dto.confirmThreshold ?? 5,
        dto.autoRejectThreshold ?? 5,
        dto.autoManagementEnabled ?? true,
        dto.kouakouManaged ?? true,
        now,
      ]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Listing non trouvé');
    }

    this.logger.log(`[AutoSale] Paramètres créés pour listing ${dto.listingId}`);
    return this.mapRowToSettings(result.rows[0]);
  }

  /**
   * Récupérer les paramètres d'un listing
   */
  async getSettings(listingId: string): Promise<AutoSaleSettings | null> {
    const result = await this.databaseService.query(
      `SELECT * FROM marketplace_auto_sale_settings WHERE listing_id = $1`,
      [listingId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSettings(result.rows[0]);
  }

  /**
   * Traiter une nouvelle offre avec la logique de décision automatique
   */
  async processOffer(offerId: string): Promise<OfferDecisionResult> {
    // Récupérer les détails de l'offre
    const offerResult = await this.databaseService.query(
      `SELECT o.*, l.id as listing_id, l.weight, l.pig_count,
              s.id as setting_id, s.min_price_per_kg, s.target_price_per_kg,
              s.auto_accept_threshold, s.confirm_threshold, s.auto_reject_threshold,
              s.auto_management_enabled, s.kouakou_managed, s.user_id as seller_id
       FROM marketplace_offers o
       JOIN marketplace_listings l ON o.listing_id = l.id
       LEFT JOIN marketplace_auto_sale_settings s ON l.id = s.listing_id
       WHERE o.id = $1`,
      [offerId]
    );

    if (offerResult.rows.length === 0) {
      throw new NotFoundException('Offre non trouvée');
    }

    const offer = offerResult.rows[0];

    // Si pas de paramètres auto-sale ou gestion désactivée, traitement manuel
    if (!offer.setting_id || !offer.auto_management_enabled) {
      this.logger.log(`[AutoSale] Offre ${offerId}: traitement manuel (pas de settings ou désactivé)`);
      return {
        action: 'manual',
        message: 'Offre à traiter manuellement',
      };
    }

    // Calculer le prix par kg de l'offre
    const totalWeight = (offer.weight || 80) * (offer.pig_count || 1);
    const offeredPricePerKg = offer.proposed_price / totalWeight;
    const targetPricePerKg = offer.target_price_per_kg;
    const minPricePerKg = offer.min_price_per_kg;

    this.logger.log(`[AutoSale] Analyse offre ${offerId}:
      - Prix offert: ${offer.proposed_price} FCFA (${offeredPricePerKg.toFixed(0)} FCFA/kg)
      - Prix cible: ${targetPricePerKg} FCFA/kg
      - Prix min: ${minPricePerKg} FCFA/kg`);

    // Logique de décision
    // 1. Si prix >= target → Acceptation automatique
    if (offeredPricePerKg >= targetPricePerKg) {
      return await this.autoAcceptOffer(offer, offerId, offeredPricePerKg);
    }

    // 2. Calculer le % de différence par rapport au min
    const diffFromMin = ((minPricePerKg - offeredPricePerKg) / minPricePerKg) * 100;

    // 3. Si prix < min - 5% → Rejet automatique
    if (diffFromMin > offer.auto_reject_threshold) {
      return await this.autoRejectOffer(offer, offerId, offeredPricePerKg, diffFromMin);
    }

    // 4. Si prix entre min-5% et min → Demander confirmation
    if (diffFromMin > 0 && diffFromMin <= offer.confirm_threshold) {
      return await this.createPendingDecision(offer, offerId, offeredPricePerKg, diffFromMin);
    }

    // 5. Si prix entre min et target → Acceptation (dans la fourchette acceptable)
    if (offeredPricePerKg >= minPricePerKg) {
      return await this.autoAcceptOffer(offer, offerId, offeredPricePerKg);
    }

    // Par défaut, demander confirmation
    return await this.createPendingDecision(offer, offerId, offeredPricePerKg, diffFromMin);
  }

  /**
   * Accepter automatiquement une offre
   */
  private async autoAcceptOffer(offer: any, offerId: string, offeredPricePerKg: number): Promise<OfferDecisionResult> {
    await this.databaseService.query(
      `UPDATE marketplace_offers SET status = 'accepted', responded_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [offerId]
    );

    // Incrémenter le compteur
    await this.databaseService.query(
      `UPDATE marketplace_auto_sale_settings 
       SET offers_auto_accepted = offers_auto_accepted + 1, last_offer_checked_at = NOW()
       WHERE id = $1`,
      [offer.setting_id]
    );

    // Notifier le vendeur
    await this.notificationsService.createNotification({
      userId: offer.seller_id,
      type: NotificationType.OFFER_ACCEPTED,
      title: '✅ Offre acceptée automatiquement',
      message: `Kouakou a accepté une offre de ${offer.proposed_price.toLocaleString('fr-FR')} FCFA (${offeredPricePerKg.toFixed(0)} FCFA/kg) car elle correspond à tes critères.`,
      relatedId: offerId,
      relatedType: 'offer',
    });

    // Notifier l'acheteur
    await this.notificationsService.createNotification({
      userId: offer.buyer_id,
      type: NotificationType.OFFER_ACCEPTED,
      title: '🎉 Offre acceptée !',
      message: `Votre offre de ${offer.proposed_price.toLocaleString('fr-FR')} FCFA a été acceptée ! Contactez le vendeur pour organiser la livraison.`,
      relatedId: offerId,
      relatedType: 'offer',
    });

    this.logger.log(`[AutoSale] Offre ${offerId} acceptée automatiquement`);

    return {
      action: 'auto_accepted',
      message: `Offre acceptée automatiquement (${offeredPricePerKg.toFixed(0)} FCFA/kg ≥ prix minimum)`,
    };
  }

  /**
   * Rejeter automatiquement une offre
   */
  private async autoRejectOffer(offer: any, offerId: string, offeredPricePerKg: number, diffPercent: number): Promise<OfferDecisionResult> {
    await this.databaseService.query(
      `UPDATE marketplace_offers SET status = 'rejected', responded_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [offerId]
    );

    // Incrémenter le compteur
    await this.databaseService.query(
      `UPDATE marketplace_auto_sale_settings 
       SET offers_auto_rejected = offers_auto_rejected + 1, last_offer_checked_at = NOW()
       WHERE id = $1`,
      [offer.setting_id]
    );

    // Notifier le vendeur
    await this.notificationsService.createNotification({
      userId: offer.seller_id,
      type: NotificationType.OFFER_REJECTED,
      title: '❌ Offre refusée automatiquement',
      message: `Kouakou a refusé une offre de ${offer.proposed_price.toLocaleString('fr-FR')} FCFA (${offeredPricePerKg.toFixed(0)} FCFA/kg) car elle est ${diffPercent.toFixed(1)}% en dessous de ton prix minimum.`,
      relatedId: offerId,
      relatedType: 'offer',
    });

    // Notifier l'acheteur
    await this.notificationsService.createNotification({
      userId: offer.buyer_id,
      type: NotificationType.OFFER_REJECTED,
      title: 'Offre refusée',
      message: `Votre offre de ${offer.proposed_price.toLocaleString('fr-FR')} FCFA a été refusée car elle est trop basse par rapport au prix demandé.`,
      relatedId: offerId,
      relatedType: 'offer',
    });

    this.logger.log(`[AutoSale] Offre ${offerId} rejetée automatiquement (${diffPercent.toFixed(1)}% sous min)`);

    return {
      action: 'auto_rejected',
      message: `Offre refusée automatiquement (${offeredPricePerKg.toFixed(0)} FCFA/kg est ${diffPercent.toFixed(1)}% sous le minimum)`,
    };
  }

  /**
   * Créer une décision en attente de confirmation
   */
  private async createPendingDecision(offer: any, offerId: string, offeredPricePerKg: number, diffPercent: number): Promise<OfferDecisionResult> {
    const id = `pending_${uuidv4()}`;
    const recommendedCounterPrice = Math.round(offer.min_price_per_kg * (offer.weight || 80) * (offer.pig_count || 1));
    
    const kouakouMessage = `🔔 J'ai reçu une offre de ${offer.proposed_price.toLocaleString('fr-FR')} FCFA (${offeredPricePerKg.toFixed(0)} FCFA/kg).

Cette offre est ${diffPercent.toFixed(1)}% en dessous de ton prix minimum (${offer.min_price_per_kg} FCFA/kg).

💡 Je te recommande de :
${diffPercent <= 3 ? '• **Accepter** cette offre car elle est proche de ton minimum' : '• **Contre-proposer** à ' + recommendedCounterPrice.toLocaleString('fr-FR') + ' FCFA'}

Que veux-tu faire ?
• Dis "accepter" pour accepter cette offre
• Dis "refuser" pour refuser
• Dis "contre-proposer à X FCFA" pour négocier`;

    await this.databaseService.query(
      `INSERT INTO marketplace_pending_decisions (
        id, setting_id, offer_id, offered_price, offered_price_per_kg,
        min_price_per_kg, price_difference_percent, recommended_action,
        recommended_counter_price, kouakou_message, status, created_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', NOW(), NOW() + INTERVAL '24 hours')`,
      [
        id,
        offer.setting_id,
        offerId,
        offer.proposed_price,
        offeredPricePerKg,
        offer.min_price_per_kg,
        diffPercent,
        diffPercent <= 3 ? 'accept' : 'counter',
        recommendedCounterPrice,
        kouakouMessage,
      ]
    );

    // Incrémenter le compteur
    await this.databaseService.query(
      `UPDATE marketplace_auto_sale_settings 
       SET offers_pending_confirmation = offers_pending_confirmation + 1, last_offer_checked_at = NOW()
       WHERE id = $1`,
      [offer.setting_id]
    );

    // Notifier le vendeur qu'une décision est attendue
    await this.notificationsService.createNotification({
      userId: offer.seller_id,
      type: NotificationType.OFFER_RECEIVED,
      title: '🔔 Offre nécessitant ton avis',
      message: kouakouMessage.split('\n')[0], // Premier paragraphe seulement
      relatedId: id,
      relatedType: 'pending_decision',
      actionUrl: `/marketplace/pending-decisions/${id}`,
    });

    this.logger.log(`[AutoSale] Décision en attente créée: ${id} pour offre ${offerId}`);

    return {
      action: 'pending_confirmation',
      message: kouakouMessage,
      pendingDecisionId: id,
    };
  }

  /**
   * Traiter la réponse de l'utilisateur à une décision en attente
   */
  async respondToPendingDecision(
    decisionId: string,
    userId: string,
    response: 'accept' | 'reject' | 'counter',
    counterPrice?: number
  ): Promise<void> {
    const decisionResult = await this.databaseService.query(
      `SELECT pd.*, s.user_id, o.buyer_id
       FROM marketplace_pending_decisions pd
       JOIN marketplace_auto_sale_settings s ON pd.setting_id = s.id
       JOIN marketplace_offers o ON pd.offer_id = o.id
       WHERE pd.id = $1`,
      [decisionId]
    );

    if (decisionResult.rows.length === 0) {
      throw new NotFoundException('Décision non trouvée');
    }

    const decision = decisionResult.rows[0];

    if (decision.user_id !== userId) {
      throw new BadRequestException('Vous n\'êtes pas autorisé à répondre à cette décision');
    }

    if (decision.status !== 'pending') {
      throw new BadRequestException('Cette décision a déjà été traitée');
    }

    // Mettre à jour la décision
    await this.databaseService.query(
      `UPDATE marketplace_pending_decisions 
       SET status = 'confirmed', user_response = $1, responded_at = NOW()
       WHERE id = $2`,
      [response, decisionId]
    );

    // Traiter selon la réponse
    switch (response) {
      case 'accept':
        await this.databaseService.query(
          `UPDATE marketplace_offers SET status = 'accepted', responded_at = NOW() WHERE id = $1`,
          [decision.offer_id]
        );
        await this.notificationsService.createNotification({
          userId: decision.buyer_id,
          type: NotificationType.OFFER_ACCEPTED,
          title: '🎉 Offre acceptée !',
          message: `Votre offre a été acceptée ! Contactez le vendeur pour organiser la livraison.`,
          relatedId: decision.offer_id,
          relatedType: 'offer',
        });
        break;

      case 'reject':
        await this.databaseService.query(
          `UPDATE marketplace_offers SET status = 'rejected', responded_at = NOW() WHERE id = $1`,
          [decision.offer_id]
        );
        await this.notificationsService.createNotification({
          userId: decision.buyer_id,
          type: NotificationType.OFFER_REJECTED,
          title: 'Offre refusée',
          message: `Votre offre a été refusée par le vendeur.`,
          relatedId: decision.offer_id,
          relatedType: 'offer',
        });
        break;

      case 'counter':
        if (!counterPrice) {
          throw new BadRequestException('Le prix de contre-proposition est requis');
        }
        await this.databaseService.query(
          `UPDATE marketplace_offers 
           SET status = 'countered', proposed_price = $1, responded_at = NOW()
           WHERE id = $2`,
          [counterPrice, decision.offer_id]
        );
        await this.notificationsService.createNotification({
          userId: decision.buyer_id,
          type: NotificationType.OFFER_COUNTERED,
          title: '💬 Contre-proposition reçue',
          message: `Le vendeur vous propose ${counterPrice.toLocaleString('fr-FR')} FCFA. Acceptez-vous ?`,
          relatedId: decision.offer_id,
          relatedType: 'offer',
        });
        break;
    }

    // Décrémenter le compteur de pending
    await this.databaseService.query(
      `UPDATE marketplace_auto_sale_settings 
       SET offers_pending_confirmation = GREATEST(0, offers_pending_confirmation - 1)
       WHERE id = $1`,
      [decision.setting_id]
    );

    this.logger.log(`[AutoSale] Décision ${decisionId} traitée: ${response}`);
  }

  /**
   * Récupérer les décisions en attente pour un utilisateur
   */
  async getPendingDecisions(userId: string): Promise<PendingDecision[]> {
    const result = await this.databaseService.query(
      `SELECT pd.*
       FROM marketplace_pending_decisions pd
       JOIN marketplace_auto_sale_settings s ON pd.setting_id = s.id
       WHERE s.user_id = $1 AND pd.status = 'pending' AND pd.expires_at > NOW()
       ORDER BY pd.created_at DESC`,
      [userId]
    );

    return result.rows.map(this.mapRowToDecision);
  }

  private mapRowToSettings(row: any): AutoSaleSettings {
    return {
      id: row.id,
      listingId: row.listing_id,
      userId: row.user_id,
      minPricePerKg: parseFloat(row.min_price_per_kg),
      targetPricePerKg: parseFloat(row.target_price_per_kg),
      autoAcceptThreshold: parseFloat(row.auto_accept_threshold),
      confirmThreshold: parseFloat(row.confirm_threshold),
      autoRejectThreshold: parseFloat(row.auto_reject_threshold),
      autoManagementEnabled: row.auto_management_enabled,
      kouakouManaged: row.kouakou_managed,
      offersAutoAccepted: row.offers_auto_accepted || 0,
      offersAutoRejected: row.offers_auto_rejected || 0,
      offersPendingConfirmation: row.offers_pending_confirmation || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToDecision(row: any): PendingDecision {
    return {
      id: row.id,
      settingId: row.setting_id,
      offerId: row.offer_id,
      offeredPrice: parseFloat(row.offered_price),
      offeredPricePerKg: parseFloat(row.offered_price_per_kg),
      minPricePerKg: parseFloat(row.min_price_per_kg),
      priceDifferencePercent: parseFloat(row.price_difference_percent),
      recommendedAction: row.recommended_action,
      recommendedCounterPrice: row.recommended_counter_price ? parseFloat(row.recommended_counter_price) : undefined,
      kouakouMessage: row.kouakou_message,
      status: row.status,
      userResponse: row.user_response,
      respondedAt: row.responded_at ? new Date(row.responded_at) : undefined,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
    };
  }
}
