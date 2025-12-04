/**
 * Repository pour les notifications de propositions de services
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import uuid from 'react-native-uuid';

export interface ServiceProposalNotification {
  id: string;
  userId: string;
  type: 'service_proposal_received' | 'service_proposal_accepted' | 'service_proposal_rejected';
  farmId?: string;
  vetId?: string;
  proposalId?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export class ServiceProposalNotificationRepository extends BaseRepository<ServiceProposalNotification> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'service_proposal_notifications');
  }

  /**
   * Créer une nouvelle notification
   */
  async create(data: Omit<ServiceProposalNotification, 'id' | 'createdAt'>): Promise<ServiceProposalNotification> {
    const id = uuid.v4() as string;
    const createdAt = new Date().toISOString();

    await this.execute(
      `INSERT INTO service_proposal_notifications (
        id, user_id, type, farm_id, vet_id, proposal_id, message, read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.type,
        data.farmId || null,
        data.vetId || null,
        data.proposalId || null,
        data.message,
        data.read ? 1 : 0,
        createdAt,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer la notification');
    }
    return created;
  }

  /**
   * Récupérer une notification par ID
   */
  async findById(id: string): Promise<ServiceProposalNotification | null> {
    const row = await this.queryOne<any>(
      'SELECT * FROM service_proposal_notifications WHERE id = ?',
      [id]
    );

    if (!row) {
      return null;
    }

    return this.mapRowToNotification(row);
  }

  /**
   * Récupérer toutes les notifications d'un utilisateur
   */
  async findByUserId(userId: string, includeRead: boolean = true): Promise<ServiceProposalNotification[]> {
    let query = 'SELECT * FROM service_proposal_notifications WHERE user_id = ?';
    const params: any[] = [userId];

    if (!includeRead) {
      query += ' AND read = 0';
    }

    query += ' ORDER BY created_at DESC';

    const rows = await this.query<any>(query, params);
    return rows.map(row => this.mapRowToNotification(row));
  }

  /**
   * Récupérer les notifications non lues d'un utilisateur
   */
  async findUnreadByUserId(userId: string): Promise<ServiceProposalNotification[]> {
    const rows = await this.query<any>(
      'SELECT * FROM service_proposal_notifications WHERE user_id = ? AND read = 0 ORDER BY created_at DESC',
      [userId]
    );

    return rows.map(row => this.mapRowToNotification(row));
  }

  /**
   * Compter les notifications non lues d'un utilisateur
   */
  async countUnreadByUserId(userId: string): Promise<number> {
    const result = await this.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM service_proposal_notifications WHERE user_id = ? AND read = 0',
      [userId]
    );

    return result?.count || 0;
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(id: string): Promise<void> {
    await this.execute(
      'UPDATE service_proposal_notifications SET read = 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * Marquer toutes les notifications d'un utilisateur comme lues
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.execute(
      'UPDATE service_proposal_notifications SET read = 1 WHERE user_id = ? AND read = 0',
      [userId]
    );
  }

  /**
   * Supprimer une notification
   */
  async delete(id: string): Promise<void> {
    await this.deleteById(id);
  }

  /**
   * Supprimer toutes les notifications lues d'un utilisateur
   */
  async deleteReadByUserId(userId: string): Promise<void> {
    await this.execute(
      'DELETE FROM service_proposal_notifications WHERE user_id = ? AND read = 1',
      [userId]
    );
  }

  /**
   * Mapper une ligne de la base de données vers un objet Notification
   */
  private mapRowToNotification(row: any): ServiceProposalNotification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      farmId: row.farm_id || undefined,
      vetId: row.vet_id || undefined,
      proposalId: row.proposal_id || undefined,
      message: row.message,
      read: row.read === 1,
      createdAt: row.created_at,
    };
  }
}

