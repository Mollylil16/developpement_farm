import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateNotificationDto, NotificationType } from './dto/notification.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async createNotification(dto: CreateNotificationDto) {
    // Utiliser UUID v4 pour une génération d'ID cryptographiquement sécurisée
    const notificationId = `notif_${uuidv4()}`;

    await this.databaseService.query(
      `INSERT INTO marketplace_notifications (
        id, user_id, type, title, message,
        related_type, related_id, action_url,
        read, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, NOW())`,
      [
        notificationId,
        dto.userId,
        dto.type,
        dto.title,
        dto.message,
        dto.relatedType || null,
        dto.relatedId || null,
        dto.actionUrl || null,
      ]
    );

    this.logger.log(`[Notifications] Notification créée: ${notificationId} pour user ${dto.userId}`);
    return { notificationId };
  }

  async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    const query = unreadOnly
      ? `SELECT * FROM marketplace_notifications
         WHERE user_id = $1 AND read = FALSE
         ORDER BY created_at DESC`
      : `SELECT * FROM marketplace_notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`;

    const result = await this.databaseService.query(query, [userId]);
    
    // Mapper les noms de colonnes snake_case vers camelCase pour le frontend
    return result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      relatedId: row.related_id,
      relatedType: row.related_type,
      read: row.read,
      actionUrl: row.action_url,
      createdAt: row.created_at,
      readAt: row.read_at,
    }));
  }

  async markAsRead(notificationIds: string[], userId: string) {
    if (notificationIds.length === 0) {
      return { updated: 0 };
    }

    const result = await this.databaseService.query(
      `UPDATE marketplace_notifications
       SET read = TRUE, read_at = NOW()
       WHERE id = ANY($1) AND user_id = $2`,
      [notificationIds, userId]
    );

    this.logger.log(`[Notifications] ${result.rowCount || 0} notification(s) marquée(s) comme lue(s) pour user ${userId}`);
    return { updated: result.rowCount || 0 };
  }

  async markAllAsRead(userId: string) {
    const result = await this.databaseService.query(
      `UPDATE marketplace_notifications
       SET read = TRUE, read_at = NOW()
       WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );

    this.logger.log(`[Notifications] Toutes les notifications marquées comme lues pour user ${userId}`);
    return { updated: result.rowCount || 0 };
  }

  async deleteNotification(notificationId: string, userId: string) {
    const result = await this.databaseService.query(
      `DELETE FROM marketplace_notifications
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Notification non trouvée ou non autorisée');
    }

    this.logger.log(`[Notifications] Notification supprimée: ${notificationId} pour user ${userId}`);
    return { deleted: true };
  }

  async getUnreadCount(userId: string) {
    const result = await this.databaseService.query(
      `SELECT COUNT(*) as count FROM marketplace_notifications
       WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );

    return { unreadCount: parseInt(result.rows[0]?.count || '0') };
  }

  // ========================================
  // MÉTHODES HELPER POUR CRÉER DES NOTIFICATIONS SPÉCIFIQUES
  // ========================================

  async notifyOfferReceived(
    sellerId: string,
    offerId: string,
    amount: number,
    buyerName?: string
  ) {
    const buyerText = buyerName ? ` de ${buyerName}` : '';
    return await this.createNotification({
      userId: sellerId,
      type: NotificationType.OFFER_RECEIVED,
      title: 'Nouvelle offre reçue',
      message: `Vous avez reçu une offre${buyerText} de ${amount.toLocaleString()} FCFA`,
      relatedType: 'offer',
      relatedId: offerId,
      actionUrl: `/marketplace/offers/${offerId}`,
    });
  }

  async notifyOfferAccepted(buyerId: string, offerId: string, listingTitle: string) {
    return await this.createNotification({
      userId: buyerId,
      type: NotificationType.OFFER_ACCEPTED,
      title: 'Offre acceptée !',
      message: `Votre offre pour "${listingTitle}" a été acceptée`,
      relatedType: 'offer',
      relatedId: offerId,
      actionUrl: `/marketplace/offers/${offerId}`,
    });
  }

  async notifyOfferRejected(buyerId: string, offerId: string, listingTitle: string) {
    return await this.createNotification({
      userId: buyerId,
      type: NotificationType.OFFER_REJECTED,
      title: 'Offre refusée',
      message: `Votre offre pour "${listingTitle}" a été refusée`,
      relatedType: 'offer',
      relatedId: offerId,
      actionUrl: `/marketplace/offers/${offerId}`,
    });
  }

  async notifyOfferCountered(buyerId: string, offerId: string, listingTitle: string, counterAmount: number) {
    return await this.createNotification({
      userId: buyerId,
      type: NotificationType.OFFER_COUNTERED,
      title: 'Contre-proposition reçue',
      message: `Le vendeur a fait une contre-proposition de ${counterAmount.toLocaleString()} FCFA pour "${listingTitle}"`,
      relatedType: 'offer',
      relatedId: offerId,
      actionUrl: `/marketplace/offers/${offerId}`,
    });
  }

  async notifyListingSold(sellerId: string, listingId: string, listingTitle: string, saleAmount: number) {
    return await this.createNotification({
      userId: sellerId,
      type: NotificationType.LISTING_SOLD,
      title: 'Annonce vendue !',
      message: `Votre annonce "${listingTitle}" a été vendue pour ${saleAmount.toLocaleString()} FCFA`,
      relatedType: 'listing',
      relatedId: listingId,
      actionUrl: `/marketplace/listings/${listingId}`,
    });
  }

  async notifyMessageReceived(userId: string, senderName: string, message: string) {
    return await this.createNotification({
      userId: userId,
      type: NotificationType.MESSAGE_RECEIVED,
      title: 'Nouveau message',
      message: `${senderName}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
      relatedType: 'message',
      actionUrl: `/marketplace/messages`,
    });
  }
}
