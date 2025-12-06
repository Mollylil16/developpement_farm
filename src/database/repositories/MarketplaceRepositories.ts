/**
 * Repositories compacts pour le Marketplace
 * Offres, Transactions, Ratings, Notifications, Chat
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import uuid from 'react-native-uuid';
import type {
  Offer,
  Transaction,
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
  constructor(db: SQLiteDatabase) {
    super(db, 'marketplace_offers');
  }

  async create(data: Partial<Offer>): Promise<Offer> {
    const createData = data as Omit<Offer, 'id' | 'createdAt' | 'status'>;
    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO marketplace_offers (
        id, listing_id, subject_ids, buyer_id, producer_id,
        proposed_price, original_price, message, status,
        terms_accepted, terms_accepted_at, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [
        id,
        createData.listingId,
        JSON.stringify(createData.subjectIds),
        createData.buyerId,
        createData.producerId,
        createData.proposedPrice,
        createData.originalPrice,
        createData.message || null,
        createData.termsAccepted ? 1 : 0,
        createData.termsAcceptedAt || null,
        now,
        createData.expiresAt,
      ]
    );

    const offer = await this.findById(id);
    if (!offer) throw new Error('Failed to create offer');
    return offer;
  }

  async findById(id: string): Promise<Offer | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.mapRow(row) : null;
  }

  async findByBuyerId(buyerId: string): Promise<Offer[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE buyer_id = ? ORDER BY created_at DESC`,
      [buyerId]
    );
    return rows.map(r => this.mapRow(r));
  }

  async findByProducerId(producerId: string): Promise<Offer[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE producer_id = ? ORDER BY created_at DESC`,
      [producerId]
    );
    return rows.map(r => this.mapRow(r));
  }

  async update(id: string, data: Partial<Offer>): Promise<Offer> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
      updates.push('responded_at = ?');
      params.push(new Date().toISOString());
    }
    if (data.proposedPrice !== undefined) {
      updates.push('proposed_price = ?');
      params.push(data.proposedPrice);
    }
    if (data.message !== undefined) {
      updates.push('message = ?');
      params.push(data.message);
    }
    if (data.termsAccepted !== undefined) {
      updates.push('terms_accepted = ?');
      params.push(data.termsAccepted ? 1 : 0);
    }

    if (updates.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('Offer not found');
      return existing;
    }

    params.push(id);
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.findById(id);
    if (!updated) throw new Error('Failed to update offer');
    return updated;
  }

  async updateStatus(id: string, status: 'accepted' | 'rejected' | 'countered' | 'expired'): Promise<void> {
    await this.update(id, { status });
  }

  private mapRow(row: any): Offer {
    return {
      id: row.id,
      listingId: row.listing_id,
      subjectIds: JSON.parse(row.subject_ids),
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
  constructor(db: SQLiteDatabase) {
    super(db, 'marketplace_transactions');
  }

  async create(data: Partial<Transaction>): Promise<Transaction> {
    const createData = data as Omit<Transaction, 'id' | 'createdAt'>;
    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO marketplace_transactions (
        id, offer_id, listing_id, subject_ids,
        buyer_id, producer_id, final_price, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        createData.offerId,
        createData.listingId,
        JSON.stringify(createData.subjectIds),
        createData.buyerId,
        createData.producerId,
        createData.finalPrice,
        createData.status || 'confirmed',
        now,
      ]
    );

    const transaction = await this.findById(id);
    if (!transaction) throw new Error('Failed to create transaction');
    return transaction;
  }

  async findById(id: string): Promise<Transaction | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.mapRow(row) : null;
  }

  async findByBuyerId(buyerId: string): Promise<Transaction[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE buyer_id = ? ORDER BY created_at DESC`,
      [buyerId]
    );
    return rows.map(r => this.mapRow(r));
  }

  async findByProducerId(producerId: string): Promise<Transaction[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE producer_id = ? ORDER BY created_at DESC`,
      [producerId]
    );
    return rows.map(r => this.mapRow(r));
  }

  async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.finalPrice !== undefined) {
      updates.push('final_price = ?');
      params.push(data.finalPrice);
    }
    if (data.deliveryDetails !== undefined) {
      updates.push('delivery_scheduled_date = ?', 'delivery_location = ?', 'delivery_transport_info = ?');
      params.push(
        data.deliveryDetails.scheduledDate,
        data.deliveryDetails.location,
        data.deliveryDetails.transportInfo
      );
    }

    if (updates.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('Transaction not found');
      return existing;
    }

    params.push(id);
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.findById(id);
    if (!updated) throw new Error('Failed to update transaction');
    return updated;
  }

  async confirmDelivery(id: string, role: 'producer' | 'buyer'): Promise<void> {
    const field = role === 'producer' ? 'delivery_producer_confirmed' : 'delivery_buyer_confirmed';
    const dateField = role === 'producer' ? 'delivery_producer_confirmed_at' : 'delivery_buyer_confirmed_at';
    
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET ${field} = 1, ${dateField} = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );

    // Vérifier si les deux ont confirmé
    const transaction = await this.findById(id);
    if (transaction?.deliveryDetails?.producerConfirmed && transaction?.deliveryDetails?.buyerConfirmed) {
      await this.db.runAsync(
        `UPDATE ${this.tableName} SET status = 'completed', completed_at = ? WHERE id = ?`,
        [new Date().toISOString(), id]
      );
    }
  }

  private mapRow(row: any): Transaction {
    return {
      id: row.id,
      offerId: row.offer_id,
      listingId: row.listing_id,
      subjectIds: JSON.parse(row.subject_ids),
      buyerId: row.buyer_id,
      producerId: row.producer_id,
      finalPrice: row.final_price,
      status: row.status,
      deliveryDetails: row.delivery_scheduled_date ? {
        scheduledDate: row.delivery_scheduled_date,
        location: row.delivery_location,
        transportInfo: row.delivery_transport_info,
        producerConfirmed: Boolean(row.delivery_producer_confirmed),
        producerConfirmedAt: row.delivery_producer_confirmed_at,
        buyerConfirmed: Boolean(row.delivery_buyer_confirmed),
        buyerConfirmedAt: row.delivery_buyer_confirmed_at,
        deliveryProof: row.delivery_proof_photos ? JSON.parse(row.delivery_proof_photos) : [],
      } : undefined,
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
  constructor(db: SQLiteDatabase) {
    super(db, 'marketplace_ratings');
  }

  async create(data: Partial<ProducerRating>): Promise<ProducerRating> {
    const createData = data as Omit<ProducerRating, 'id' | 'createdAt' | 'status'>;
    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO marketplace_ratings (
        id, producer_id, buyer_id, transaction_id,
        rating_quality, rating_professionalism, rating_timeliness, rating_communication,
        overall, comment, photos, verified_purchase, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'published', ?)`,
      [
        id,
        createData.producerId,
        createData.buyerId,
        createData.transactionId,
        createData.ratings.quality,
        createData.ratings.professionalism,
        createData.ratings.timeliness,
        createData.ratings.communication,
        createData.overall,
        createData.comment || null,
        createData.photos ? JSON.stringify(createData.photos) : null,
        now,
      ]
    );

    const rating = await this.findById(id);
    if (!rating) throw new Error('Failed to create rating');
    return rating;
  }

  async findById(id: string): Promise<ProducerRating | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.mapRow(row) : null;
  }

  async findByProducerId(producerId: string): Promise<ProducerRating[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE producer_id = ? AND status = 'published' ORDER BY created_at DESC`,
      [producerId]
    );
    return rows.map(r => this.mapRow(r));
  }

  async update(id: string, data: Partial<ProducerRating>): Promise<ProducerRating> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.comment !== undefined) {
      updates.push('comment = ?');
      params.push(data.comment);
    }
    if (data.ratings !== undefined) {
      updates.push('rating_quality = ?', 'rating_professionalism = ?', 'rating_timeliness = ?', 'rating_communication = ?');
      params.push(
        data.ratings.quality,
        data.ratings.professionalism,
        data.ratings.timeliness,
        data.ratings.communication
      );
    }
    if (data.overall !== undefined) {
      updates.push('overall = ?');
      params.push(data.overall);
    }

    if (updates.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('Rating not found');
      return existing;
    }

    params.push(id);
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.findById(id);
    if (!updated) throw new Error('Failed to update rating');
    return updated;
  }

  async getAverageRating(producerId: string): Promise<number> {
    const result = await this.db.getFirstAsync<{ avg: number }>(
      `SELECT AVG(overall) as avg FROM ${this.tableName} WHERE producer_id = ? AND status = 'published'`,
      [producerId]
    );
    return result?.avg || 0;
  }

  private mapRow(row: any): ProducerRating {
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
      photos: row.photos ? JSON.parse(row.photos) : [],
      verifiedPurchase: Boolean(row.verified_purchase),
      status: row.status,
      producerResponse: row.producer_response_text ? {
        text: row.producer_response_text,
        respondedAt: row.producer_response_at,
      } : undefined,
      createdAt: row.created_at,
      helpfulCount: row.helpful_count || 0,
    };
  }
}

// ========================================
// NOTIFICATIONS REPOSITORY
// ========================================
export class MarketplaceNotificationRepository extends BaseRepository<Notification> {
  constructor(db: SQLiteDatabase) {
    super(db, 'marketplace_notifications');
  }

  async create(data: Partial<Notification>): Promise<Notification> {
    const createData = data as Omit<Notification, 'id' | 'createdAt' | 'read'>;
    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO marketplace_notifications (
        id, user_id, type, title, message, related_id, related_type,
        read, action_url, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        id,
        createData.userId,
        createData.type,
        createData.title,
        createData.message,
        createData.relatedId,
        createData.relatedType,
        createData.actionUrl || null,
        now,
      ]
    );

    const notification = await this.findById(id);
    if (!notification) throw new Error('Failed to create notification');
    return notification;
  }

  async findById(id: string): Promise<Notification | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.mapRow(row) : null;
  }

  async findByUserId(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE user_id = ?`;
    if (unreadOnly) {
      query += ' AND read = 0';
    }
    query += ' ORDER BY created_at DESC';

    const rows = await this.db.getAllAsync<any>(query, [userId]);
    return rows.map(r => this.mapRow(r));
  }

  async markAsRead(id: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET read = 1, read_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET read = 1, read_at = ? WHERE user_id = ? AND read = 0`,
      [new Date().toISOString(), userId]
    );
  }

  async update(id: string, data: Partial<Notification>): Promise<Notification> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.read !== undefined) {
      updates.push('read = ?');
      params.push(data.read ? 1 : 0);
      if (data.read) {
        updates.push('read_at = ?');
        params.push(new Date().toISOString());
      }
    }
    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.message !== undefined) {
      updates.push('message = ?');
      params.push(data.message);
    }

    if (updates.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('Notification not found');
      return existing;
    }

    params.push(id);
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.findById(id);
    if (!updated) throw new Error('Failed to update notification');
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
  }

  private mapRow(row: any): Notification {
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
  constructor(db: SQLiteDatabase) {
    super(db, 'marketplace_conversations');
  }

  async create(data: Partial<ChatConversation>): Promise<ChatConversation> {
    const createData = data as Omit<ChatConversation, 'id' | 'createdAt'>;
    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO marketplace_conversations (
        id, participants, related_listing_id, related_offer_id,
        last_message, last_message_at, unread_count_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        JSON.stringify(createData.participants),
        createData.relatedListingId,
        createData.relatedOfferId || null,
        createData.lastMessage,
        createData.lastMessageAt,
        JSON.stringify(createData.unreadCount),
        createData.status || 'active',
        now,
      ]
    );

    const conversation = await this.findConversationById(id);
    if (!conversation) throw new Error('Failed to create conversation');
    return conversation;
  }

  async findConversationById(id: string): Promise<ChatConversation | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.mapConversationRow(row) : null;
  }

  async findUserConversations(userId: string): Promise<ChatConversation[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE participants LIKE ? ORDER BY last_message_at DESC`,
      [`%${userId}%`]
    );
    return rows.map(r => this.mapConversationRow(r));
  }

  async update(id: string, data: Partial<ChatConversation>): Promise<ChatConversation> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.lastMessage !== undefined) {
      updates.push('last_message = ?');
      params.push(data.lastMessage);
    }
    if (data.lastMessageAt !== undefined) {
      updates.push('last_message_at = ?');
      params.push(data.lastMessageAt);
    }
    if (data.unreadCount !== undefined) {
      updates.push('unread_count_json = ?');
      params.push(JSON.stringify(data.unreadCount));
    }

    if (updates.length === 0) {
      const existing = await this.findConversationById(id);
      if (!existing) throw new Error('Conversation not found');
      return existing;
    }

    params.push(id);
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.findConversationById(id);
    if (!updated) throw new Error('Failed to update conversation');
    return updated;
  }

  async createConversation(data: Omit<ChatConversation, 'id' | 'createdAt'>): Promise<ChatConversation> {
    return this.create(data);
  }

  async createMessage(data: Omit<ChatMessage, 'id' | 'createdAt' | 'read'>): Promise<ChatMessage> {
    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    // Préparer les métadonnées incluant priceProposal si présent
    const metadataJson = data.priceProposal 
      ? JSON.stringify({ proposedPrice: data.priceProposal })
      : data.attachments 
      ? JSON.stringify({ attachments: data.attachments })
      : null;

    await this.db.runAsync(
      `INSERT INTO marketplace_messages (
        id, conversation_id, sender_id, recipient_id,
        message, message_type, metadata_json, read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        id,
        data.conversationId,
        data.senderId,
        data.recipientId,
        data.content,
        data.type || 'text',
        metadataJson,
        now,
      ]
    );

    // Mettre à jour la conversation
    await this.db.runAsync(
      `UPDATE marketplace_conversations SET last_message = ?, last_message_at = ? WHERE id = ?`,
      [data.content, now, data.conversationId]
    );

    const message = await this.findMessageById(id);
    if (!message) throw new Error('Failed to create message');
    return message;
  }

  // Méthode helper pour mettre à jour la conversation
  async updateConversationLastMessage(conversationId: string, message: ChatMessage): Promise<void> {
    await this.db.runAsync(
      `UPDATE marketplace_conversations SET last_message = ?, last_message_at = ? WHERE id = ?`,
      [message.content, message.createdAt, conversationId]
    );
  }

  // Marquer un message comme lu
  async markMessageAsRead(messageId: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE marketplace_messages SET read = 1, read_at = ? WHERE id = ?`,
      [new Date().toISOString(), messageId]
    );
  }

  async findMessageById(id: string): Promise<ChatMessage | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM marketplace_messages WHERE id = ?`,
      [id]
    );
    return row ? this.mapMessageRow(row) : null;
  }

  async findConversationMessages(conversationId: string, limit: number = 50): Promise<ChatMessage[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM marketplace_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?`,
      [conversationId, limit]
    );
    return rows.map(r => this.mapMessageRow(r)).reverse();
  }

  private mapConversationRow(row: any): ChatConversation {
    return {
      id: row.id,
      participants: JSON.parse(row.participants),
      relatedListingId: row.related_listing_id,
      relatedOfferId: row.related_offer_id,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      unreadCount: JSON.parse(row.unread_count_json || '{}'),
      status: row.status,
      createdAt: row.created_at,
    };
  }

  private mapMessageRow(row: any): ChatMessage {
    const metadata = row.metadata_json ? JSON.parse(row.metadata_json) : undefined;
    
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      content: row.message,
      type: row.message_type,
      attachments: metadata?.attachments,
      priceProposal: metadata?.proposedPrice,
      read: Boolean(row.read),
      readAt: row.read_at,
      sentAt: row.created_at, // On utilise createdAt comme sentAt
      createdAt: row.created_at,
    };
  }
}

