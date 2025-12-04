/**
 * Service de gestion des permissions Marketplace
 * Vérifie les restrictions multi-rôles
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { MarketplaceListing, FarmCard } from '../types/marketplace';
import { MarketplaceListingRepository } from '../database/repositories';
import { ProjetRepository } from '../database/repositories';

export class MarketplacePermissions {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Vérifier si un utilisateur peut voir un listing
   * Un utilisateur ne peut pas voir ses propres listings, quel que soit son rôle
   */
  async canViewListing(userId: string, listing: MarketplaceListing): Promise<boolean> {
    // Récupérer tous les IDs de producteur de l'utilisateur
    const userProducerIds = await this.getUserProducerIds(userId);
    
    // Vérifier si le listing appartient à l'utilisateur
    return !userProducerIds.includes(listing.producerId);
  }

  /**
   * Filtrer les listings pour exclure ceux de l'utilisateur
   */
  async filterListingsForUser(
    userId: string,
    listings: MarketplaceListing[]
  ): Promise<MarketplaceListing[]> {
    // Récupérer tous les IDs de producteur de l'utilisateur
    const userProducerIds = await this.getUserProducerIds(userId);
    
    // Filtrer les listings
    return listings.filter(listing => {
      // Exclure les listings de l'utilisateur lui-même
      return !userProducerIds.includes(listing.producerId);
    });
  }

  /**
   * Filtrer les FarmCards pour exclure celles de l'utilisateur
   */
  async filterFarmCardsForUser(
    userId: string,
    farmCards: FarmCard[]
  ): Promise<FarmCard[]> {
    // Récupérer tous les IDs de producteur de l'utilisateur
    const userProducerIds = await this.getUserProducerIds(userId);
    
    // Filtrer les FarmCards
    return farmCards.filter(farm => {
      // Exclure les fermes de l'utilisateur lui-même
      return !userProducerIds.includes(farm.producerId);
    });
  }

  /**
   * Vérifier si un utilisateur peut faire une offre sur un listing
   */
  async canMakeOffer(userId: string, listing: MarketplaceListing): Promise<boolean> {
    // Un utilisateur ne peut pas faire d'offre sur ses propres listings
    return this.canViewListing(userId, listing);
  }

  /**
   * Vérifier si un utilisateur peut envoyer un message à un producteur
   */
  async canMessage(userId: string, producerId: string): Promise<boolean> {
    // Un utilisateur ne peut pas se message lui-même
    const userProducerIds = await this.getUserProducerIds(userId);
    return !userProducerIds.includes(producerId);
  }

  /**
   * Vérifier si un utilisateur peut noter un producteur
   */
  async canRate(userId: string, producerId: string): Promise<boolean> {
    // Un utilisateur ne peut pas se noter lui-même
    const userProducerIds = await this.getUserProducerIds(userId);
    return !userProducerIds.includes(producerId);
  }

  /**
   * Récupérer tous les IDs de producteur associés à un utilisateur
   * Un utilisateur peut être producteur via plusieurs projets
   */
  private async getUserProducerIds(userId: string): Promise<string[]> {
    try {
      const projetRepo = new ProjetRepository(this.db);

      // Récupérer tous les projets où l'utilisateur est propriétaire
      const projets = await projetRepo.findByOwnerId(userId);
      
      // Les IDs de producteur sont les IDs des projets
      return projets.map(p => p.id);
    } catch (error) {
      console.error('Erreur récupération IDs producteur:', error);
      return [];
    }
  }
}

/**
 * Instance singleton du service de permissions
 */
let permissionsInstance: MarketplacePermissions | null = null;

export function getMarketplacePermissions(db: SQLiteDatabase): MarketplacePermissions {
  if (!permissionsInstance) {
    permissionsInstance = new MarketplacePermissions(db);
  }
  return permissionsInstance;
}

