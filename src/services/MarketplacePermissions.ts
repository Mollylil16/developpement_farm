/**
 * Service de gestion des permissions Marketplace
 * Vérifie les restrictions multi-rôles
 * 
 * Utilise maintenant l'API REST (PostgreSQL via backend)
 */

import type { MarketplaceListing, FarmCard } from '../types/marketplace';
import apiClient from './api/apiClient';

export class MarketplacePermissions {
  constructor() {
    // Plus besoin de db
  }

  /**
   * Vérifier si un utilisateur peut voir un listing
   * Un utilisateur ne peut pas voir ses propres listings, quel que soit son rôle
   */
  async canViewListing(userId: string, listing: MarketplaceListing): Promise<boolean> {
    // Vérifier via producerId (qui est l'userId dans le backend)
    if (listing.producerId === userId) {
      return false;
    }
    
    // Vérifier via farmId (vérifier si l'utilisateur est propriétaire du projet)
    const userProducerIds = await this.getUserProducerIds(userId);
    if (listing.farmId && userProducerIds.includes(listing.farmId)) {
      return false;
    }
    
    return true;
  }

  /**
   * Filtrer les listings pour exclure ceux de l'utilisateur
   * Un utilisateur ne peut pas voir ses propres listings dans l'onglet "Acheter"
   */
  async filterListingsForUser(
    userId: string,
    listings: MarketplaceListing[]
  ): Promise<MarketplaceListing[]> {
    const userProducerIds = await this.getUserProducerIds(userId);
    
    // Filtrer les listings qui n'appartiennent pas à l'utilisateur
    return listings.filter((listing) => {
      // Vérifier si le listing appartient à l'utilisateur
      // 1. Via producerId (qui est l'userId dans le backend)
      if (listing.producerId === userId) {
        return false;
      }
      
      // 2. Via farmId (vérifier si l'utilisateur est propriétaire du projet)
      if (listing.farmId && userProducerIds.includes(listing.farmId)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Filtrer les FarmCards pour exclure celles de l'utilisateur
   */
  async filterFarmCardsForUser(userId: string, farmCards: FarmCard[]): Promise<FarmCard[]> {
    const userProducerIds = await this.getUserProducerIds(userId);
    
    return farmCards.filter((farm) => {
      // Vérifier si la ferme appartient à l'utilisateur
      // 1. Via producerId (qui est l'userId dans le backend)
      if (farm.producerId === userId) {
        return false;
      }
      
      // 2. Via farmId (vérifier si l'utilisateur est propriétaire du projet)
      if (farm.farmId && userProducerIds.includes(farm.farmId)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Vérifier si un utilisateur peut faire une offre sur un listing
   */
  async canMakeOffer(userId: string, listing: MarketplaceListing): Promise<boolean> {
    return this.canViewListing(userId, listing);
  }

  /**
   * Vérifier si un utilisateur peut envoyer un message à un producteur
   */
  async canMessage(userId: string, producerId: string): Promise<boolean> {
    const userProducerIds = await this.getUserProducerIds(userId);
    return !userProducerIds.includes(producerId);
  }

  /**
   * Vérifier si un utilisateur peut noter un producteur
   */
  async canRate(userId: string, producerId: string): Promise<boolean> {
    const userProducerIds = await this.getUserProducerIds(userId);
    return !userProducerIds.includes(producerId);
  }

  /**
   * Récupérer tous les IDs de producteur associés à un utilisateur
   * Un utilisateur peut être producteur via plusieurs projets
   * 
   * Note: producerId dans les listings est l'userId, pas le farmId
   * Mais on doit aussi vérifier via farmId pour être sûr
   */
  private async getUserProducerIds(userId: string): Promise<string[]> {
    try {
      // Récupérer tous les projets où l'utilisateur est propriétaire depuis l'API backend
      const allProjets = await apiClient.get<any[]>('/projets');
      const projets = allProjets.filter((p) => p.proprietaire_id === userId);

      // Les IDs de producteur sont les IDs des projets (farmId)
      return projets.map((p) => p.id);
    } catch (error) {
      console.error('Erreur lors de la récupération des IDs de producteur:', error);
      return [];
    }
  }

  /**
   * Vérifier si un utilisateur est propriétaire d'un projet (farmId)
   */
  private async isUserOwnerOfFarm(userId: string, farmId: string): Promise<boolean> {
    try {
      const userProducerIds = await this.getUserProducerIds(userId);
      return userProducerIds.includes(farmId);
    } catch (error) {
      console.error('Erreur lors de la vérification de propriété du projet:', error);
      return false;
    }
  }
}

/**
 * Helper pour créer une instance de MarketplacePermissions
 */
export function getMarketplacePermissions(): MarketplacePermissions {
  return new MarketplacePermissions();
}
