import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

/**
 * Types de notifications disponibles
 */
export type NotificationType =
  | 'invitation_received'
  | 'invitation_accepted'
  | 'invitation_rejected'
  | 'invitation_expired'
  | 'collaboration_removed'
  | 'permission_changed'
  | 'project_shared'
  | 'other';

export interface NotificationData {
  projet_id?: string;
  collaboration_id?: string;
  projet_nom?: string;
  collaborateur_nom?: string;
  collaborateur_prenom?: string;
  [key: string]: any;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Crée une nouvelle notification
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: NotificationData
  ): Promise<string> {
    try {
      const result = await this.databaseService.query(
        `INSERT INTO notifications (user_id, type, title, message, data, read, created_at)
         VALUES ($1, $2, $3, $4, $5, FALSE, NOW())
         RETURNING id`,
        [
          userId,
          type,
          title,
          message,
          data ? JSON.stringify(data) : null,
        ]
      );

      const notificationId = result.rows[0].id;
      this.logger.debug(`Notification créée: ${notificationId} pour user ${userId} (type: ${type})`);
      return notificationId;
    } catch (error) {
      this.logger.error(`Erreur lors de la création de la notification pour ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Marque une notification comme lue
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const result = await this.databaseService.query(
      `UPDATE notifications 
       SET read = TRUE 
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Notification introuvable ou vous n\'avez pas accès à cette notification');
    }
  }

  /**
   * Marque toutes les notifications d'un utilisateur comme lues
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.databaseService.query(
      `UPDATE notifications 
       SET read = TRUE 
       WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );

    return result.rowCount || 0;
  }

  /**
   * Récupère les notifications d'un utilisateur
   */
  async getUserNotifications(
    userId: string,
    unreadOnly: boolean = false,
    limit: number = 50
  ): Promise<any[]> {
    let query = `
      SELECT 
        id,
        user_id,
        type,
        title,
        message,
        data,
        read,
        created_at
      FROM notifications
      WHERE user_id = $1
    `;

    const params: any[] = [userId];

    if (unreadOnly) {
      query += ` AND read = FALSE`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.databaseService.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data ? (typeof row.data === 'string' ? JSON.parse(row.data) : row.data) : null,
      read: row.read,
      created_at: row.created_at,
    }));
  }

  /**
   * Récupère le nombre de notifications non lues
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.databaseService.query(
      `SELECT COUNT(*) as count 
       FROM notifications 
       WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Supprime une notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const result = await this.databaseService.query(
      `DELETE FROM notifications 
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Notification introuvable ou vous n\'avez pas accès à cette notification');
    }
  }

  /**
   * Supprime toutes les notifications lues d'un utilisateur
   */
  async deleteReadNotifications(userId: string): Promise<number> {
    const result = await this.databaseService.query(
      `DELETE FROM notifications 
       WHERE user_id = $1 AND read = TRUE`,
      [userId]
    );

    return result.rowCount || 0;
  }
}
