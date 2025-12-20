/**
 * Service pour gérer les notifications liées aux propositions de services vétérinaires
 */

import {
  ServiceProposalNotificationRepository,
  type ServiceProposalNotification,
} from '../database/repositories/ServiceProposalNotificationRepository';
import apiClient from './api/apiClient';
import type { VeterinarianProfile } from '../types/roles';

// Réexporter le type pour compatibilité
export type { ServiceProposalNotification };

class ServiceProposalNotificationService {
  private notificationRepo: ServiceProposalNotificationRepository | null = null;

  constructor() {
    // Plus besoin de db
  }

  private async getNotificationRepo(): Promise<ServiceProposalNotificationRepository> {
    if (!this.notificationRepo) {
      this.notificationRepo = new ServiceProposalNotificationRepository();
    }
    return this.notificationRepo;
  }

  /**
   * Créer une notification pour le producteur lorsqu'un vétérinaire propose ses services
   */
  async notifyProducerOfProposal(
    producerId: string,
    farmId: string,
    vetId: string,
    proposalId: string,
    vetName: string,
    farmName: string
  ): Promise<ServiceProposalNotification> {
    const repo = await this.getNotificationRepo();

    // Récupérer les informations du vétérinaire depuis l'API backend
    const vet = await apiClient.get<any>(`/users/${vetId}`);
    const vetProfile = vet?.roles?.veterinarian;
    const vetSpecialty = vetProfile?.specialty ? ` (${vetProfile.specialty})` : '';
    const vetExperience = vetProfile?.yearsOfExperience ? ` avec ${vetProfile.yearsOfExperience} ans d'expérience` : '';
    
    // Récupérer les informations de la ferme depuis l'API backend
    const farm = await apiClient.get<any>(`/projets/${farmId}`);
    const farmLocation = farm?.localisation ? ` située à ${farm.localisation}` : '';

    const notification = await repo.create({
      userId: producerId,
      type: 'service_proposal_received',
      farmId,
      vetId,
      proposalId,
      message: `${vetName}${vetSpecialty}${vetExperience} vous propose ses services pour votre ferme "${farmName}"${farmLocation}`,
      read: false,
    });

    // TODO: Envoyer une notification push si l'utilisateur a activé les notifications
    // await this.sendPushNotification(producerId, notification);

    return notification;
  }

  /**
   * Créer une notification pour le vétérinaire lorsqu'un producteur accepte sa proposition
   */
  async notifyVetOfAcceptance(
    vetId: string,
    farmId: string,
    proposalId: string,
    farmName: string,
    producerName: string
  ): Promise<ServiceProposalNotification> {
    const repo = await this.getNotificationRepo();

    const notification = await repo.create({
      userId: vetId,
      type: 'service_proposal_accepted',
      farmId,
      proposalId,
      message: `${producerName} a accepté votre proposition de services pour la ferme "${farmName}"`,
      read: false,
    });

    return notification;
  }

  /**
   * Créer une notification pour le vétérinaire lorsqu'un producteur refuse sa proposition
   */
  async notifyVetOfRejection(
    vetId: string,
    farmId: string,
    proposalId: string,
    farmName: string,
    producerName: string
  ): Promise<ServiceProposalNotification> {
    const repo = await this.getNotificationRepo();

    const notification = await repo.create({
      userId: vetId,
      type: 'service_proposal_rejected',
      farmId,
      proposalId,
      message: `${producerName} a refusé votre proposition de services pour la ferme "${farmName}"`,
      read: false,
    });

    return notification;
  }

  /**
   * Récupérer les notifications non lues pour un utilisateur
   */
  async getUnreadNotifications(userId: string): Promise<ServiceProposalNotification[]> {
    try {
      const repo = await this.getNotificationRepo();
      return await repo.findUnreadByUserId(userId);
    } catch (error) {
      console.error('Erreur récupération notifications non lues:', error);
      return [];
    }
  }

  /**
   * Récupérer toutes les notifications pour un utilisateur
   */
  async getAllNotifications(userId: string): Promise<ServiceProposalNotification[]> {
    try {
      const repo = await this.getNotificationRepo();
      return await repo.findByUserId(userId, true);
    } catch (error) {
      console.error('Erreur récupération notifications:', error);
      return [];
    }
  }

  /**
   * Compter les notifications non lues pour un utilisateur
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const repo = await this.getNotificationRepo();
      return await repo.countUnreadByUserId(userId);
    } catch (error) {
      console.error('Erreur comptage notifications:', error);
      return 0;
    }
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const repo = await this.getNotificationRepo();
      await repo.markAsRead(notificationId);
    } catch (error) {
      console.error('Erreur marquage notification:', error);
      throw error;
    }
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const repo = await this.getNotificationRepo();
      await repo.markAllAsRead(userId);
    } catch (error) {
      console.error('Erreur marquage notifications:', error);
      throw error;
    }
  }

  /**
   * Supprimer une notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    try {
      const repo = await this.getNotificationRepo();
      await repo.delete(notificationId);
    } catch (error) {
      console.error('Erreur suppression notification:', error);
      throw error;
    }
  }
}

// Singleton
let notificationServiceInstance: ServiceProposalNotificationService | null = null;

export const getServiceProposalNotificationService =
  async (): Promise<ServiceProposalNotificationService> => {
    if (!notificationServiceInstance) {
      notificationServiceInstance = new ServiceProposalNotificationService();
    }
    return notificationServiceInstance;
  };

export default ServiceProposalNotificationService;
