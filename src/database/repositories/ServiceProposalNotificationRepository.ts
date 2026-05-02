/**
 * Repository pour les notifications de propositions de services
 */

import { BaseRepository } from './BaseRepository';

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
  constructor() {
    super('service_proposal_notifications', '/notifications/service-proposals');
  }

  /**
   * Créer une nouvelle notification
   */
  async create(
    data: Omit<ServiceProposalNotification, 'id' | 'createdAt'>
  ): Promise<ServiceProposalNotification> {
    const notificationData = {
      user_id: data.userId,
      type: data.type,
      farm_id: data.farmId || null,
      vet_id: data.vetId || null,
      proposal_id: data.proposalId || null,
      message: data.message,
      read: data.read || false,
    };
    return this.executePost<ServiceProposalNotification>(this.apiBasePath, notificationData);
  }

  /**
   * Récupérer une notification par ID
   */
  async findById(id: string): Promise<ServiceProposalNotification | null> {
    const row = await this.queryOne<unknown>(`${this.apiBasePath}/${id}`);
    if (!row) {
      return null;
    }
    return this.mapRowToNotification(row);
  }

  /**
   * Récupérer toutes les notifications d'un utilisateur
   */
  async findByUserId(
    userId: string,
    includeRead: boolean = true
  ): Promise<ServiceProposalNotification[]> {
    const params: Record<string, unknown> = {
      user_id: userId,
      order_by: 'created_at',
      order_direction: 'DESC',
    };
    if (!includeRead) {
      params.read = false;
    }
    const rows = await this.query<unknown>(this.apiBasePath, params);
    return rows.map((row) => this.mapRowToNotification(row));
  }

  /**
   * Récupérer les notifications non lues d'un utilisateur
   */
  async findUnreadByUserId(userId: string): Promise<ServiceProposalNotification[]> {
    const rows = await this.query<unknown>(this.apiBasePath, {
      user_id: userId,
      read: false,
      order_by: 'created_at',
      order_direction: 'DESC',
    });
    return rows.map((row) => this.mapRowToNotification(row));
  }

  /**
   * Compter les notifications non lues d'un utilisateur
   */
  async countUnreadByUserId(userId: string): Promise<number> {
    const result = await this.queryOne<{ count: number }>(`${this.apiBasePath}/count`, {
      user_id: userId,
      read: false,
    });
    return result?.count || 0;
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(id: string): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/${id}`, { read: true });
  }

  /**
   * Marquer toutes les notifications d'un utilisateur comme lues
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.executePatch(`${this.apiBasePath}/mark-all-read`, { user_id: userId });
  }

  /**
   * Supprimer une notification
   */
  async delete(id: string): Promise<void> {
    await this.executeDelete(`${this.apiBasePath}/${id}`);
  }

  /**
   * Supprimer toutes les notifications lues d'un utilisateur
   */
  async deleteReadByUserId(userId: string): Promise<void> {
    await this.executeDelete(`${this.apiBasePath}/read`, { user_id: userId });
  }

  /**
   * Mapper une ligne de la base de données vers un objet Notification
   */
  private mapRowToNotification(row: unknown): ServiceProposalNotification {
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
