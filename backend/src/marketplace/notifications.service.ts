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

    this.logger.log(
      `[Notifications] Création notification: type=${dto.type}, userId=${dto.userId}, relatedId=${dto.relatedId}`,
    );

    try {
      await this.databaseService.query(
        `INSERT INTO marketplace_notifications (
          id, user_id, type, title, message,
          related_type, related_id, action_url, data,
          read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, NOW())`,
        [
          notificationId,
          dto.userId,
          dto.type,
          dto.title,
          dto.message,
          dto.relatedType || null,
          dto.relatedId || null,
          dto.actionUrl || null,
          dto.data ? JSON.stringify(dto.data) : null,
        ],
      );

      this.logger.log(
        `[Notifications] ✅ Notification créée avec succès: ${notificationId} pour user ${dto.userId} (type: ${dto.type})`,
      );

      // Vérifier que la notification a bien été insérée
      const verification = await this.databaseService.query(
        `SELECT id, user_id, type, created_at FROM marketplace_notifications WHERE id = $1`,
        [notificationId],
      );

      if (verification.rows.length > 0) {
        this.logger.debug(
          `[Notifications] Vérification: notification ${notificationId} trouvée en base pour user_id=${verification.rows[0].user_id}`,
        );
      } else {
        this.logger.error(
          `[Notifications] ⚠️ Notification ${notificationId} non trouvée après insertion!`,
        );
      }

      return { notificationId };
    } catch (error) {
      this.logger.error(
        `[Notifications] ❌ Erreur lors de la création de la notification:`,
        error,
      );
      throw error;
    }
  }

  async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    this.logger.log(
      `[Notifications] Récupération notifications pour user ${userId}, unreadOnly: ${unreadOnly}`,
    );

    // ✅ Vérification supplémentaire : chercher les notifications avec des user_id différents mais liées au même utilisateur
    // Cela peut arriver si un utilisateur a plusieurs profils avec des IDs différents (problème potentiel)
    const checkQuery = `SELECT COUNT(*) as count, 
      array_agg(DISTINCT user_id) as user_ids
      FROM marketplace_notifications 
      WHERE user_id IN (
        SELECT id FROM users WHERE id = $1
        UNION
        SELECT id FROM users WHERE email = (SELECT email FROM users WHERE id = $1)
        UNION  
        SELECT id FROM users WHERE telephone = (SELECT telephone FROM users WHERE id = $1)
      )`;
    
    try {
      const checkResult = await this.databaseService.query(checkQuery, [userId]);
      if (checkResult.rows.length > 0 && checkResult.rows[0].user_ids) {
        const userIds = checkResult.rows[0].user_ids;
        if (userIds && userIds.length > 1) {
          this.logger.warn(
            `[Notifications] ⚠️ ATTENTION: Plusieurs IDs utilisateur trouvés pour le même compte: ${userIds.join(', ')}. Cela peut indiquer un problème de structure de données.`,
          );
        }
      }
    } catch (error) {
      // Ne pas bloquer si la vérification échoue
      this.logger.debug(`[Notifications] Vérification supplémentaire échouée (non critique):`, error);
    }

    const query = unreadOnly
      ? `SELECT * FROM marketplace_notifications
         WHERE user_id = $1 AND read = FALSE
         ORDER BY created_at DESC`
      : `SELECT * FROM marketplace_notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`;

    const result = await this.databaseService.query(query, [userId]);

    this.logger.log(
      `[Notifications] ${result.rows.length} notification(s) trouvée(s) pour user ${userId}`,
    );

    // ✅ Vérification : chercher les notifications de rendez-vous qui pourraient être liées à cet utilisateur
    // mais avec un user_id différent (problème potentiel)
    if (result.rows.length === 0) {
      this.logger.debug(
        `[Notifications] Aucune notification trouvée pour user ${userId}. Vérification des notifications de rendez-vous...`,
      );
      
      // Chercher les notifications de rendez-vous récentes qui pourraient être liées à cet utilisateur
      const appointmentCheckQuery = `
        SELECT n.*, u.id as notification_user_id, u.email, u.telephone
        FROM marketplace_notifications n
        JOIN users u ON n.user_id = u.id
        WHERE n.type = 'appointment_requested'
          AND n.created_at > NOW() - INTERVAL '7 days'
        ORDER BY n.created_at DESC
        LIMIT 10
      `;
      
      try {
        const appointmentCheck = await this.databaseService.query(appointmentCheckQuery, []);
        if (appointmentCheck.rows.length > 0) {
          this.logger.debug(
            `[Notifications] Notifications de rendez-vous récentes trouvées (pour débogage):`,
          );
          appointmentCheck.rows.forEach((notif) => {
            this.logger.debug(
              `[Notifications] - Notification ${notif.id}: user_id=${notif.notification_user_id}, email=${notif.email}, telephone=${notif.telephone}`,
            );
          });
        }
      } catch (error) {
        // Ne pas bloquer si la vérification échoue
        this.logger.debug(`[Notifications] Vérification appointments échouée (non critique):`, error);
      }
    }

    if (result.rows.length > 0) {
      const types = result.rows.map((r) => r.type).join(', ');
      this.logger.debug(
        `[Notifications] Types de notifications trouvées: ${types}`,
      );
      // Logger les notifications de type appointment pour débogage
      const appointmentNotifications = result.rows.filter(
        (r) => r.type && r.type.includes('appointment'),
      );
      if (appointmentNotifications.length > 0) {
        this.logger.log(
          `[Notifications] ${appointmentNotifications.length} notification(s) de rendez-vous trouvée(s)`,
        );
        appointmentNotifications.forEach((notif) => {
          this.logger.debug(
            `[Notifications] - ID: ${notif.id}, Type: ${notif.type}, Title: ${notif.title}, Created: ${notif.created_at}, user_id: ${notif.user_id}`,
          );
        });
      }
    }

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
      // ✅ Inclure les données enrichies
      data: row.data ? (typeof row.data === 'string' ? JSON.parse(row.data) : row.data) : null,
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

  // ========================================
  // NOTIFICATIONS ENRICHIES POUR VENTE CONFIRMÉE
  // ========================================

  /**
   * Génère un lien Google Maps à partir des coordonnées
   */
  private generateGoogleMapsUrl(latitude: number, longitude: number): string {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  /**
   * Notification enrichie pour l'ACHETEUR après acceptation d'offre
   * Inclut: contact producteur, localisation ferme, lien GPS
   */
  async notifySaleConfirmedToBuyer(
    buyerId: string,
    transactionId: string,
    data: {
      producerName: string;
      producerPhone?: string;
      producerEmail?: string;
      farmName: string;
      farmAddress: string;
      farmCity: string;
      farmRegion?: string;
      latitude?: number;
      longitude?: number;
      finalPrice: number;
      subjectCount: number;
      pickupDate?: string;
    }
  ) {
    const googleMapsUrl = data.latitude && data.longitude 
      ? this.generateGoogleMapsUrl(data.latitude, data.longitude)
      : null;

    const messageLines = [
      `🎉 Votre offre pour ${data.subjectCount} sujet(s) a été acceptée !`,
      `💰 Prix final: ${data.finalPrice.toLocaleString('fr-FR')} FCFA`,
    ];

    if (data.pickupDate) {
      messageLines.push(`📅 Récupération prévue: ${data.pickupDate}`);
    }

    return await this.createNotification({
      userId: buyerId,
      type: NotificationType.SALE_CONFIRMED_BUYER,
      title: '🎉 Offre acceptée - Détails de récupération',
      message: messageLines.join('\n'),
      relatedType: 'transaction',
      relatedId: transactionId,
      actionUrl: `/marketplace/transactions/${transactionId}`,
      data: {
        transactionId,
        finalPrice: data.finalPrice,
        subjectCount: data.subjectCount,
        pickupDate: data.pickupDate || null,
        producer: {
          name: data.producerName,
          phone: data.producerPhone || null,
          email: data.producerEmail || null,
        },
        farm: {
          name: data.farmName,
          address: data.farmAddress,
          city: data.farmCity,
          region: data.farmRegion || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          googleMapsUrl,
        },
      },
    });
  }

  /**
   * Notification enrichie pour le PRODUCTEUR après acceptation d'offre
   * Inclut: contact acheteur, détails transaction
   */
  async notifySaleConfirmedToProducer(
    producerId: string,
    transactionId: string,
    data: {
      buyerName: string;
      buyerPhone?: string;
      buyerEmail?: string;
      finalPrice: number;
      subjectCount: number;
      pickupDate?: string;
    }
  ) {
    const messageLines = [
      `💰 Vente confirmée de ${data.subjectCount} sujet(s) !`,
      `Prix: ${data.finalPrice.toLocaleString('fr-FR')} FCFA`,
      `Acheteur: ${data.buyerName}`,
    ];

    if (data.pickupDate) {
      messageLines.push(`📅 Récupération prévue: ${data.pickupDate}`);
    }

    return await this.createNotification({
      userId: producerId,
      type: NotificationType.SALE_CONFIRMED_PRODUCER,
      title: '💰 Vente confirmée - Informations acheteur',
      message: messageLines.join('\n'),
      relatedType: 'transaction',
      relatedId: transactionId,
      actionUrl: `/marketplace/transactions/${transactionId}`,
      data: {
        transactionId,
        finalPrice: data.finalPrice,
        subjectCount: data.subjectCount,
        pickupDate: data.pickupDate || null,
        buyer: {
          name: data.buyerName,
          phone: data.buyerPhone || null,
          email: data.buyerEmail || null,
        },
      },
    });
  }
}
