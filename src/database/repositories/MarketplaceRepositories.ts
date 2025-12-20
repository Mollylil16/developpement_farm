/**
 * Repositories compacts pour le Marketplace
 * Offres, Transactions, Ratings, Notifications, Chat
 */

import type {
  Offer,
  Transaction,
  TransactionStatus,
  ProducerRating,
  Notification,
  ChatConversation,
  ChatMessage,
} from '../../types/marketplace';
import { BaseRepository } from './BaseRepository';

// ========================================
// OFFERS REPOSITORY
// ========================================
export class MarketplaceOfferRepository extends BaseRepository<Offer> {
  constructor() {
    super('marketplace_offers', '/marketplace/offers');
  }

  async create(data: Omit<Offer, 'id' | 'createdAt' | 'status'>): Promise<Offer> {
    const offerData = {
      listing_id: data.listingId,
      subject_ids: data.subjectIds,
      buyer_id: data.buyerId,
      producer_id: data.producerId,
      proposed_price: data.proposedPrice,
      original_price: data.originalPrice,
      message: data.message || null,
      terms_accepted: data.termsAccepted,
      terms_accepted_at: data.termsAcceptedAt || null,
      expires_at: data.expiresAt,
      status: 'pending',
    };
    return this.executePost<Offer>(this.apiBasePath, offerData);
  }

  async findById(id: string): Promise<Offer | null> {
    const row = await this.queryOne<unknown>(`${this.apiBasePath}/${id}`);
    return row ? this.mapRow(row) : null;
  }

  async findByBuyerId(buyerId: string): Promise<Offer[]> {
    const rows = await this.query<unknown>(this.apiBasePath, {
      buyer_id: buyerId,
      order_by: 'created_at',
      order_direction: 'DESC',
    });
    return rows.map((r) => this.mapRow(r));
  }

  async findByProducerId(producerId: string): Promise<Offer[]> {
    const rows = await this.query<unknown>(this.apiBasePath, {
      producer_id: producerId,
      order_by: 'created_at',
      order_direction: 'DESC',
    });
    return rows.map((r) => this.mapRow(r));
  }

  async findByListingId(listingId: string): Promise<Offer[]> {
    const rows = await this.query<unknown>(this.apiBasePath, {
      listing_id: listingId,
      order_by: 'created_at',
      order_direction: 'DESC',
    });
    return rows.map((r) => this.mapRow(r));
  }

  async updateStatus(
    id: string,
    status: 'accepted' | 'rejected' | 'countered' | 'expired' | 'withdrawn'
  ): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/${id}`, {
      status,
      responded_at: new Date().toISOString(),
    });
  }

  private mapRow(row: unknown): Offer {
    return {
      id: row.id,
      listingId: row.listing_id,
      subjectIds: Array.isArray(row.subject_ids) ? row.subject_ids : JSON.parse(row.subject_ids || '[]'),
      buyerId: row.buyer_id,
      producerId: row.producer_id,
      proposedPrice: row.proposed_price,
      originalPrice: row.original_price,
      message: row.message,
      status: row.status,
      termsAccepted: Boolean(row.terms_accepted),
      termsAcceptedAt: row.terms_accepted_at,
      createdAt: row.created_at,
      respondedAt: row.responded_at,
      expiresAt: row.expires_at,
    };
  }
}

// ========================================
// TRANSACTIONS REPOSITORY
// ========================================
export class MarketplaceTransactionRepository extends BaseRepository<Transaction> {
  constructor() {
    super('marketplace_transactions', '/marketplace/transactions');
  }

  async create(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const transactionData = {
      offer_id: data.offerId,
      listing_id: data.listingId,
      subject_ids: data.subjectIds,
      buyer_id: data.buyerId,
      producer_id: data.producerId,
      final_price: data.finalPrice,
      status: data.status || 'confirmed',
    };
    return this.executePost<Transaction>(this.apiBasePath, transactionData);
  }

  async findById(id: string): Promise<Transaction | null> {
    const row = await this.queryOne<unknown>(`${this.apiBasePath}/${id}`);
    return row ? this.mapRow(row) : null;
  }

  async findByBuyerId(buyerId: string): Promise<Transaction[]> {
    const rows = await this.query<unknown>(this.apiBasePath, {
      buyer_id: buyerId,
      order_by: 'created_at',
      order_direction: 'DESC',
    });
    return rows.map((r) => this.mapRow(r));
  }

  async findByProducerId(producerId: string): Promise<Transaction[]> {
    const rows = await this.query<unknown>(this.apiBasePath, {
      producer_id: producerId,
      order_by: 'created_at',
      order_direction: 'DESC',
    });
    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Mettre à jour le statut d'une transaction
   */
  async updateStatus(transactionId: string, status: TransactionStatus): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/${transactionId}`, { status });
  }

  async confirmDelivery(id: string, role: 'producer' | 'buyer'): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/${id}/confirm-delivery`, {
      role,
      confirmed_at: new Date().toISOString(),
    });
  }

  private mapRow(row: unknown): Transaction {
    return {
      id: row.id,
      offerId: row.offer_id,
      listingId: row.listing_id,
      subjectIds: Array.isArray(row.subject_ids) ? row.subject_ids : JSON.parse(row.subject_ids || '[]'),
      buyerId: row.buyer_id,
      producerId: row.producer_id,
      finalPrice: row.final_price,
      status: row.status,
      deliveryDetails: row.delivery_scheduled_date
        ? {
            scheduledDate: row.delivery_scheduled_date,
            location: row.delivery_location,
            transportInfo: row.delivery_transport_info,
            producerConfirmed: Boolean(row.delivery_producer_confirmed),
            producerConfirmedAt: row.delivery_producer_confirmed_at,
            buyerConfirmed: Boolean(row.delivery_buyer_confirmed),
            buyerConfirmedAt: row.delivery_buyer_confirmed_at,
            deliveryProof: Array.isArray(row.delivery_proof_photos)
              ? row.delivery_proof_photos
              : row.delivery_proof_photos
                ? JSON.parse(row.delivery_proof_photos)
                : [],
          }
        : undefined,
      documents: {
        healthCertificate: row.doc_health_certificate,
        deliveryNote: row.doc_delivery_note,
        invoice: row.doc_invoice,
      },
      createdAt: row.created_at,
      completedAt: row.completed_at,
      cancelledAt: row.cancelled_at,
      cancellationReason: row.cancellation_reason,
    };
  }
}

// ========================================
// RATINGS REPOSITORY
// ========================================
export class MarketplaceRatingRepository extends BaseRepository<ProducerRating> {
  constructor() {
    super('marketplace_ratings', '/marketplace/ratings');
  }

  async create(data: Omit<ProducerRating, 'id' | 'createdAt' | 'status'>): Promise<ProducerRating> {
    const ratingData = {
      producer_id: data.producerId,
      buyer_id: data.buyerId,
      transaction_id: data.transactionId,
      rating_quality: data.ratings.quality,
      rating_professionalism: data.ratings.professionalism,
      rating_timeliness: data.ratings.timeliness,
      rating_communication: data.ratings.communication,
      overall: data.overall,
      comment: data.comment || null,
      photos: data.photos || null,
      verified_purchase: true,
      status: 'published',
    };
    return this.executePost<ProducerRating>(this.apiBasePath, ratingData);
  }

  async findById(id: string): Promise<ProducerRating | null> {
    const row = await this.queryOne<unknown>(`${this.apiBasePath}/${id}`);
    return row ? this.mapRow(row) : null;
  }

  async findByProducerId(producerId: string): Promise<ProducerRating[]> {
    const rows = await this.query<unknown>(this.apiBasePath, {
      producer_id: producerId,
      status: 'published',
      order_by: 'created_at',
      order_direction: 'DESC',
    });
    return rows.map((r) => this.mapRow(r));
  }

  async getAverageRating(producerId: string): Promise<number> {
    const result = await this.queryOne<{ avg: number }>(`${this.apiBasePath}/average`, {
      producer_id: producerId,
    });
    return result?.avg || 0;
  }

  private mapRow(row: unknown): ProducerRating {
    return {
      id: row.id,
      producerId: row.producer_id,
      buyerId: row.buyer_id,
      transactionId: row.transaction_id,
      ratings: {
        quality: row.rating_quality,
        professionalism: row.rating_professionalism,
        timeliness: row.rating_timeliness,
        communication: row.rating_communication,
      },
      overall: row.overall,
      comment: row.comment,
      photos: Array.isArray(row.photos)
        ? row.photos
        : row.photos
          ? JSON.parse(row.photos)
          : [],
      verifiedPurchase: Boolean(row.verified_purchase),
      status: row.status,
      producerResponse: row.producer_response_text
        ? {
            text: row.producer_response_text,
            respondedAt: row.producer_response_at,
          }
        : undefined,
      createdAt: row.created_at,
      helpfulCount: row.helpful_count || 0,
    };
  }
}

// ========================================
// NOTIFICATIONS REPOSITORY
// ========================================
export class MarketplaceNotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super('marketplace_notifications', '/marketplace/notifications');
  }

  async create(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> {
    const notificationData = {
      user_id: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      related_id: data.relatedId,
      related_type: data.relatedType,
      action_url: data.actionUrl || null,
      read: false,
    };
    return this.executePost<Notification>(this.apiBasePath, notificationData);
  }

  async findById(id: string): Promise<Notification | null> {
    const row = await this.queryOne<unknown>(`${this.apiBasePath}/${id}`);
    return row ? this.mapRow(row) : null;
  }

  async findByUserId(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const params: Record<string, unknown> = {
      user_id: userId,
      order_by: 'created_at',
      order_direction: 'DESC',
    };
    if (unreadOnly) {
      params.read = false;
    }
    const rows = await this.query<unknown>(this.apiBasePath, params);
    return rows.map((r) => this.mapRow(r));
  }

  async markAsRead(id: string): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/${id}`, {
      read: true,
      read_at: new Date().toISOString(),
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/mark-all-read`, {
      user_id: userId,
    });
  }

  async delete(id: string): Promise<void> {
    await this.executeDelete(`${this.apiBasePath}/${id}`);
  }

  private mapRow(row: unknown): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      body: row.message, // Alias pour compatibilité UI
      relatedId: row.related_id,
      relatedType: row.related_type,
      read: Boolean(row.read),
      actionUrl: row.action_url,
      createdAt: row.created_at,
      readAt: row.read_at,
    };
  }
}

// ========================================
// CHAT REPOSITORY
// ========================================
export class MarketplaceChatRepository extends BaseRepository<ChatConversation> {
  constructor() {
    super('marketplace_conversations', '/marketplace/chat');
  }

  async createConversation(
    data: Omit<ChatConversation, 'id' | 'createdAt'>
  ): Promise<ChatConversation> {
    const conversationData = {
      participants: data.participants,
      related_listing_id: data.relatedListingId,
      related_offer_id: data.relatedOfferId || null,
      last_message: data.lastMessage,
      last_message_at: data.lastMessageAt,
      unread_count: data.unreadCount,
      status: data.status || 'active',
    };
    return this.executePost<ChatConversation>(`${this.apiBasePath}/conversations`, conversationData);
  }

  async findConversationById(id: string): Promise<ChatConversation | null> {
    const row = await this.queryOne<unknown>(`${this.apiBasePath}/conversations/${id}`);
    return row ? this.mapConversationRow(row) : null;
  }

  async findUserConversations(userId: string): Promise<ChatConversation[]> {
    const rows = await this.query<unknown>(`${this.apiBasePath}/conversations`, {
      user_id: userId,
      order_by: 'last_message_at',
      order_direction: 'DESC',
    });
    return rows.map((r) => this.mapConversationRow(r));
  }

  async createMessage(data: Omit<ChatMessage, 'id' | 'createdAt' | 'read'>): Promise<ChatMessage> {
    const messageData = {
      conversation_id: data.conversationId,
      sender_id: data.senderId,
      recipient_id: data.recipientId,
      content: data.content,
      message_type: data.type || 'text',
      price_proposal: data.priceProposal || null,
      attachments: data.attachments || null,
    };
    return this.executePost<ChatMessage>(`${this.apiBasePath}/messages`, messageData);
  }

  // Méthode helper pour mettre à jour la conversation
  async updateConversationLastMessage(conversationId: string, message: ChatMessage): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/conversations/${conversationId}`, {
      last_message: message.content,
      last_message_at: message.createdAt,
    });
  }

  // Marquer un message comme lu
  async markMessageAsRead(messageId: string): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/messages/${messageId}`, {
      read: true,
      read_at: new Date().toISOString(),
    });
  }

  async findMessageById(id: string): Promise<ChatMessage | null> {
    const row = await this.queryOne<unknown>(`${this.apiBasePath}/messages/${id}`);
    return row ? this.mapMessageRow(row) : null;
  }

  async findConversationMessages(
    conversationId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    const rows = await this.query<unknown>(`${this.apiBasePath}/messages`, {
      conversation_id: conversationId,
      limit,
      order_by: 'created_at',
      order_direction: 'DESC',
    });
    return rows.map((r) => this.mapMessageRow(r)).reverse();
  }

  private mapConversationRow(row: unknown): ChatConversation {
    return {
      id: row.id,
      participants: Array.isArray(row.participants)
        ? row.participants
        : JSON.parse(row.participants || '[]'),
      relatedListingId: row.related_listing_id,
      relatedOfferId: row.related_offer_id,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      unreadCount:
        typeof row.unread_count === 'object' && row.unread_count !== null
          ? row.unread_count
          : JSON.parse(row.unread_count_json || row.unread_count || '{}'),
      status: row.status,
      createdAt: row.created_at,
    };
  }

  private mapMessageRow(row: unknown): ChatMessage {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      content: row.message || row.content,
      type: row.message_type,
      attachments: row.attachments || undefined,
      priceProposal: row.price_proposal || undefined,
      read: Boolean(row.read),
      readAt: row.read_at,
      sentAt: row.created_at,
      createdAt: row.created_at,
    };
  }
}
