/**
 * Service pour gérer les fermes et les propositions de services vétérinaires
 */

import { getDatabase } from './database';
import { ProjetRepository } from '../database/repositories/ProjetRepository';
import { UserRepository } from '../database/repositories/UserRepository';
import { CollaborateurRepository } from '../database/repositories/CollaborateurRepository';
import { getServiceProposalNotificationService } from './ServiceProposalNotificationService';
import { DEFAULT_PERMISSIONS } from '../types/collaboration';
import type { VeterinarianProfile } from '../types/roles';

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
  private db: any;

  constructor() {
    this.db = null;
  }

  private async getDb() {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  /**
   * Récupérer les fermes dans un rayon donné
   */
  async getFarmsNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<Farm[]> {
    const db = await this.getDb();
    const projetRepo = new ProjetRepository(db);
    const userRepo = new UserRepository(db);

    // Récupérer tous les projets (fermes)
    const allProjects = await projetRepo.findAll();

    const farms: Farm[] = [];

    for (const project of allProjects) {
      // Calculer la distance (formule de Haversine simplifiée)
      // TODO: Utiliser les coordonnées réelles du projet si disponibles
      const projectLat = project.latitude || 0;
      const projectLng = project.longitude || 0;

      const distance = this.calculateDistance(latitude, longitude, projectLat, projectLng);

      if (distance <= radiusKm) {
        // Récupérer le producteur
        const producerId = (project as any).proprietaire_id || (project as any).user_id;
        const producer = producerId ? await userRepo.findById(producerId) : null;
        if (producer) {
          farms.push({
            id: project.id,
            name: project.nom || 'Ferme sans nom',
            city: project.ville || '',
            region: project.region || '',
            latitude: projectLat,
            longitude: projectLng,
            herdSize: project.capacite_animaux || 0,
            capacity: project.capacite_animaux || 0,
            farmType: project.type_elevage || 'Individuel',
            specialization: project.specialisation,
            producer: {
              id: producer.id,
              name: `${producer.prenom} ${producer.nom}`,
            },
            veterinarian: null, // TODO: Récupérer le vétérinaire assigné si disponible
          });
        }
      }
    }

    return farms;
  }

  /**
   * Calculer la distance entre deux points (formule de Haversine)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
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
   * Proposer un service à une ferme
   */
  async proposeServiceToFarm(
    vetId: string,
    farmId: string,
    message?: string
  ): Promise<ServiceProposal> {
    const db = await this.getDb();
    const userRepo = new UserRepository(db);

    const vet = await userRepo.findById(vetId);
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

    // Ajouter la proposition au profil vétérinaire
    const updatedProposals = [
      ...(vetProfile.serviceProposals || []),
      {
        farmId,
        farmName: '', // TODO: Récupérer le nom de la ferme
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

    await userRepo.update(vetId, {
      roles: updatedRoles,
    });

    // Récupérer les informations pour la notification
    const projetRepo = new ProjetRepository(db);
    const farm = await projetRepo.findById(farmId);
    const producer = farm ? await userRepo.findById(farm.user_id) : null;

    if (farm && producer) {
      // Créer une notification pour le producteur
      const notificationService = await getServiceProposalNotificationService();
      await notificationService.notifyProducerOfProposal(
        producer.id,
        farmId,
        vetId,
        proposal.id,
        `${vet.prenom} ${vet.nom}`,
        (farm as any).nom || 'Ferme'
      );
    }

    // TODO: Stocker la proposition dans une table dédiée

    return proposal;
  }

  /**
   * Accepter ou refuser une proposition de service (appelé par le producteur)
   */
  async respondToServiceProposal(
    proposalId: string,
    farmId: string,
    vetId: string,
    status: 'accepted' | 'rejected'
  ): Promise<void> {
    const db = await this.getDb();
    const userRepo = new UserRepository(db);
    const projetRepo = new ProjetRepository(db);

    // Récupérer le vétérinaire et la ferme
    const vet = await userRepo.findById(vetId);
    const farm = await projetRepo.findById(farmId);
    const producerId = (farm as any)?.proprietaire_id || (farm as any)?.user_id;
    const producer = producerId ? await userRepo.findById(producerId) : null;

    if (!vet || !vet.roles?.veterinarian || !farm || !producer) {
      throw new Error('Données introuvables');
    }

    const vetProfile = vet.roles.veterinarian;

    // Mettre à jour le statut de la proposition dans le profil vétérinaire
    const updatedProposals = vetProfile.serviceProposals.map((p) =>
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

      // Créer automatiquement une collaboration pour le vétérinaire
      const collaborateurRepo = new CollaborateurRepository(db);
      
      // Vérifier si une collaboration existe déjà
      const existingCollaborations = await collaborateurRepo.findByProjet(farmId);
      const existingVetCollaboration = existingCollaborations.find(
        c => c.user_id === vetId && c.role === 'veterinaire'
      );

      if (!existingVetCollaboration) {
        // Créer la collaboration avec les permissions par défaut pour vétérinaire
        const vetPermissions = DEFAULT_PERMISSIONS.veterinaire;
        await collaborateurRepo.create({
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
        await collaborateurRepo.update(existingVetCollaboration.id, {
          statut: 'actif',
          date_acceptation: new Date().toISOString(),
        });
      }
    }

    const updatedRoles = {
      ...vet.roles,
      veterinarian: updatedProfile,
    };

    await userRepo.update(vetId, {
      roles: updatedRoles,
    });

    // Notifier le vétérinaire
    const notificationService = await getServiceProposalNotificationService();
    if (status === 'accepted') {
      await notificationService.notifyVetOfAcceptance(
        vetId,
        farmId,
        proposalId,
        (farm as any).nom || 'Ferme',
        `${producer.prenom} ${producer.nom}`
      );
    } else {
      await notificationService.notifyVetOfRejection(
        vetId,
        farmId,
        proposalId,
        (farm as any).nom || 'Ferme',
        `${producer.prenom} ${producer.nom}`
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

