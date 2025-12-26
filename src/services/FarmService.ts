/**
 * Service pour gérer les fermes et les propositions de services vétérinaires
 * Utilise l'API backend pour récupérer les données
 */

import apiClient from './api/apiClient';
import { getServiceProposalNotificationService } from './ServiceProposalNotificationService';
import { DEFAULT_PERMISSIONS } from '../types/collaboration';
import type { VeterinarianProfile } from '../types/roles';
import { logger } from '../utils/logger';

export interface Farm {
  id: string;
  name: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  herdSize: number;
  capacity: number;
  farmType: string;
  specialization?: string;
  producer: {
    id: string;
    name: string;
  };
  veterinarian?: string | null;
}

export interface ServiceProposal {
  id: string;
  vetId: string;
  farmId: string;
  status: 'pending' | 'accepted' | 'rejected';
  proposedAt: string;
  respondedAt?: string;
  message?: string;
}

class FarmService {

  /**
   * Récupérer les fermes dans un rayon donné via l'API backend
   */
  async getFarmsNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<Farm[]> {
    // Récupérer tous les projets via l'API backend
    // Note: Pour l'instant, on récupère tous les projets et on filtre côté client
    // TODO: Créer un endpoint backend pour filtrer par localisation
    const allProjects = await apiClient.get<any[]>('/projets');

    const farms: Farm[] = [];

    for (const project of allProjects) {
      // Calculer la distance (formule de Haversine simplifiée)
      // TODO: Utiliser les coordonnées réelles du projet si disponibles
      const projectLat = project.latitude || 0;
      const projectLng = project.longitude || 0;

      const distance = this.calculateDistance(latitude, longitude, projectLat, projectLng);

      if (distance <= radiusKm) {
        // Récupérer le producteur via l'API backend
        const producerId = project.proprietaire_id;
        if (producerId) {
          try {
            const producer = await apiClient.get<any>(`/users/${producerId}`);
            if (producer) {
              farms.push({
                id: project.id,
                name: project.nom || 'Ferme sans nom',
                city: project.localisation || '',
                region: project.region || '',
                latitude: projectLat,
                longitude: projectLng,
                herdSize: project.capacite_animaux || 0,
                capacity: project.capacite_animaux || 0,
                farmType: project.type_elevage || 'Individuel',
                specialization: project.specialisation,
                producer: {
                  id: producer.id,
                  name: `${producer.prenom || ''} ${producer.nom || ''}`.trim() || 'Producteur',
                },
                veterinarian: null, // TODO: Récupérer le vétérinaire assigné si disponible
              });
            }
          } catch (error) {
            logger.warn(`Erreur lors de la récupération du producteur ${producerId}:`, error);
          }
        }
      }
    }

    return farms;
  }

  /**
   * Calculer la distance entre deux points (formule de Haversine)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Proposer un service à une ferme via l'API backend
   */
  async proposeServiceToFarm(
    vetId: string,
    farmId: string,
    message?: string
  ): Promise<ServiceProposal> {
    // Récupérer le vétérinaire via l'API backend
    const vet = await apiClient.get<any>(`/users/${vetId}`);
    if (!vet || !vet.roles?.veterinarian) {
      throw new Error('Vétérinaire non trouvé');
    }

    const vetProfile = vet.roles.veterinarian;

    // Vérifier que le profil est validé
    if (vetProfile.validationStatus !== 'approved') {
      throw new Error('Votre profil doit être validé avant de proposer vos services');
    }

    // Créer la proposition
    const proposal: ServiceProposal = {
      id: `proposal-${vetId}-${farmId}-${Date.now()}`,
      vetId,
      farmId,
      status: 'pending',
      proposedAt: new Date().toISOString(),
      message,
    };

    // Récupérer les informations de la ferme et du producteur
    const farm = await apiClient.get<any>(`/projets/${farmId}`);
    const producerId = farm?.proprietaire_id;
    const producer = producerId ? await apiClient.get<any>(`/users/${producerId}`) : null;

    // Ajouter la proposition au profil vétérinaire
    const updatedProposals = [
      ...(vetProfile.serviceProposals || []),
      {
        farmId,
        farmName: farm?.nom || 'Ferme',
        status: 'pending' as const,
        proposedAt: proposal.proposedAt,
        message,
      },
    ];

    const updatedProfile: VeterinarianProfile = {
      ...vetProfile,
      serviceProposals: updatedProposals,
    };

    const updatedRoles = {
      ...vet.roles,
      veterinarian: updatedProfile,
    };

    // Mettre à jour le vétérinaire via l'API backend
    await apiClient.patch(`/users/${vetId}`, {
      roles: updatedRoles,
    });

    if (farm && producer) {
      // Créer une notification pour le producteur
      const notificationService = await getServiceProposalNotificationService();
      await notificationService.notifyProducerOfProposal(
        producer.id,
        farmId,
        vetId,
        proposal.id,
        `${vet.prenom || ''} ${vet.nom || ''}`.trim() || 'Vétérinaire',
        farm.nom || 'Ferme'
      );
    }

    // TODO: Stocker la proposition dans une table dédiée côté backend

    return proposal;
  }

  /**
   * Accepter ou refuser une proposition de service (appelé par le producteur) via l'API backend
   */
  async respondToServiceProposal(
    proposalId: string,
    farmId: string,
    vetId: string,
    status: 'accepted' | 'rejected'
  ): Promise<void> {
    // Récupérer le vétérinaire et la ferme via l'API backend
    const vet = await apiClient.get<any>(`/users/${vetId}`);
    const farm = await apiClient.get<any>(`/projets/${farmId}`);
    const producerId = farm?.proprietaire_id;
    const producer = producerId ? await apiClient.get<any>(`/users/${producerId}`) : null;

    if (!vet || !vet.roles?.veterinarian || !farm || !producer) {
      throw new Error('Données introuvables');
    }

    const vetProfile = vet.roles.veterinarian;

    // Mettre à jour le statut de la proposition dans le profil vétérinaire
    const updatedProposals = (vetProfile.serviceProposals || []).map((p: { farmId: string; farmName: string; status: 'pending' | 'accepted' | 'rejected'; proposedAt: string; respondedAt?: string; message?: string }) =>
      p.farmId === farmId && p.status === 'pending'
        ? {
            ...p,
            status: status,
            respondedAt: new Date().toISOString(),
          }
        : p
    );

    const updatedProfile: VeterinarianProfile = {
      ...vetProfile,
      serviceProposals: updatedProposals,
    };

    // Si acceptée, ajouter la ferme aux clients et créer une collaboration
    if (status === 'accepted') {
      const existingClient = updatedProfile.clients.find((c) => c.farmId === farmId);
      if (!existingClient) {
        updatedProfile.clients.push({
          farmId,
          farmName: farm.nom || 'Ferme',
          since: new Date().toISOString(),
          status: 'active',
          contractType: 'consultation',
        });
      }

      // Créer automatiquement une collaboration pour le vétérinaire via l'API backend
      try {
        // Vérifier si une collaboration existe déjà
        const existingCollaborations = await apiClient.get<any[]>(
          `/collaborations?projet_id=${farmId}`
        );
        const existingVetCollaboration = existingCollaborations.find(
          (c) => c.user_id === vetId && c.role === 'veterinaire'
        );

        if (!existingVetCollaboration) {
          // Créer la collaboration avec les permissions par défaut pour vétérinaire
          const vetPermissions = DEFAULT_PERMISSIONS.veterinaire;
          await apiClient.post('/collaborations', {
            projet_id: farmId,
            user_id: vetId,
            nom: vet.nom || '',
            prenom: vet.prenom || '',
            email: vet.email || '',
            telephone: vet.telephone || undefined,
            role: 'veterinaire',
            statut: 'actif',
            permissions: vetPermissions,
            date_invitation: new Date().toISOString(),
            date_acceptation: new Date().toISOString(),
          });
        } else if (existingVetCollaboration.statut !== 'actif') {
          // Réactiver la collaboration si elle existe mais n'est pas active
          await apiClient.patch(`/collaborations/${existingVetCollaboration.id}`, {
            statut: 'actif',
            date_acceptation: new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.warn('Erreur lors de la création de la collaboration:', error);
      }
    }

    const updatedRoles = {
      ...vet.roles,
      veterinarian: updatedProfile,
    };

    // Mettre à jour le vétérinaire via l'API backend
    await apiClient.patch(`/users/${vetId}`, {
      roles: updatedRoles,
    });

    // Notifier le vétérinaire
    const notificationService = await getServiceProposalNotificationService();
    if (status === 'accepted') {
      await notificationService.notifyVetOfAcceptance(
        vetId,
        farmId,
        proposalId,
        farm.nom || 'Ferme',
        `${producer.prenom || ''} ${producer.nom || ''}`.trim() || 'Producteur'
      );
    } else {
      await notificationService.notifyVetOfRejection(
        vetId,
        farmId,
        proposalId,
        farm.nom || 'Ferme',
        `${producer.prenom || ''} ${producer.nom || ''}`.trim() || 'Producteur'
      );
    }
  }
}

// Singleton
let farmServiceInstance: FarmService | null = null;

export const getFarmService = async (): Promise<FarmService> => {
  if (!farmServiceInstance) {
    farmServiceInstance = new FarmService();
  }
  return farmServiceInstance;
};

export default FarmService;
