/**
 * Service pour gérer les demandes d'achat (Purchase Requests)
 * Inclut la logique de matching avec les listings des producteurs
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from './database';
import {
  PurchaseRequestRepository,
  PurchaseRequestOfferRepository,
  PurchaseRequestMatchRepository,
} from '../database/repositories/PurchaseRequestRepository';
import { MarketplaceListingRepository } from '../database/repositories/MarketplaceListingRepository';
import { MarketplaceNotificationRepository } from '../database/repositories/MarketplaceRepositories';
import { AnimalRepository } from '../database/repositories/AnimalRepository';
import { ProjetRepository } from '../database/repositories/ProjetRepository';
import { UserRepository } from '../database/repositories/UserRepository';
import type {
  PurchaseRequest,
  PurchaseRequestOffer,
  PurchaseRequestMatch,
  Location,
  MarketplaceListing,
} from '../types/marketplace';
import type { ProductionAnimal } from '../types/production';

/**
 * Calculer la distance entre deux points (formule de Haversine)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculer l'âge en mois à partir d'une date de naissance
 */
function calculateAgeInMonths(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  return Math.max(0, months);
}

/**
 * Vérifier si un âge correspond à une catégorie
 */
function matchesAgeCategory(ageMonths: number, category?: string): boolean {
  if (!category || category === 'tous') return true;
  
  switch (category) {
    case 'jeunes':
      return ageMonths <= 3;
    case 'engraissement':
      return ageMonths > 3 && ageMonths <= 8;
    case 'finis':
      return ageMonths > 8;
    default:
      return true;
  }
}

export class PurchaseRequestService {
  private db: SQLiteDatabase;
  private requestRepo: PurchaseRequestRepository;
  private offerRepo: PurchaseRequestOfferRepository;
  private matchRepo: PurchaseRequestMatchRepository;
  private listingRepo: MarketplaceListingRepository;
  private notificationRepo: MarketplaceNotificationRepository;
  private animalRepo: AnimalRepository;
  private projetRepo: ProjetRepository;
  private userRepo: UserRepository;

  constructor(db: SQLiteDatabase) {
    this.db = db;
    this.requestRepo = new PurchaseRequestRepository(db);
    this.offerRepo = new PurchaseRequestOfferRepository(db);
    this.matchRepo = new PurchaseRequestMatchRepository(db);
    this.listingRepo = new MarketplaceListingRepository(db);
    this.notificationRepo = new MarketplaceNotificationRepository(db);
    this.animalRepo = new AnimalRepository(db);
    this.projetRepo = new ProjetRepository(db);
    this.userRepo = new UserRepository(db);
  }

  /**
   * Générer un titre automatique pour une demande d'achat
   */
  private generateTitle(data: {
    race?: string;
    quantity: number;
    minWeight?: number;
    maxWeight?: number;
    ageCategory?: string;
  }): string {
    const parts: string[] = [];
    
    if (data.race && data.race !== 'Peu importe') {
      parts.push(data.race);
    } else {
      parts.push('porcs');
    }
    
    if (data.ageCategory) {
      const ageLabels: Record<string, string> = {
        'jeunes': 'jeunes',
        'engraissement': 'd\'engraissement',
        'finis': 'finis',
      };
      if (ageLabels[data.ageCategory]) {
        parts.push(ageLabels[data.ageCategory]);
      }
    }
    
    parts.push(`${data.quantity} tête${data.quantity > 1 ? 's' : ''}`);
    
    if (data.minWeight && data.maxWeight) {
      parts.push(`(${data.minWeight}-${data.maxWeight} kg)`);
    }
    
    return parts.join(' ');
  }

  /**
   * Créer une nouvelle demande d'achat
   */
  async createPurchaseRequest(data: {
    buyerId: string;
    title?: string;
    race?: string;
    minWeight: number;
    maxWeight: number;
    ageCategory?: string;
    minAgeMonths?: number;
    maxAgeMonths?: number;
    quantity: number;
    deliveryLocation?: {
      latitude?: number;
      longitude?: number;
      address?: string;
      city?: string;
      region?: string;
      department?: string;
      radiusKm?: number;
    };
    maxPricePerKg?: number;
    maxTotalPrice?: number;
    deliveryDate?: string;
    deliveryPeriodStart?: string;
    deliveryPeriodEnd?: string;
    message?: string;
    expiresAt?: string;
  }): Promise<PurchaseRequest> {
    // Générer un titre automatique si non fourni
    const title = data.title?.trim() || this.generateTitle({
      race: data.race,
      quantity: data.quantity,
      minWeight: data.minWeight,
      maxWeight: data.maxWeight,
      ageCategory: data.ageCategory,
    });

    // Calculer la date d'expiration par défaut (30 jours)
    const expiresAt = data.expiresAt || (() => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date.toISOString();
    })();

    const request = await this.requestRepo.create({
      ...data,
      title,
      race: data.race || 'Peu importe',
      expiresAt,
    });

    // Lancer le matching en arrière-plan
    this.findMatchesForRequest(request.id).catch((error) => {
      console.error('Erreur lors du matching automatique:', error);
    });

    return request;
  }

  /**
   * Trouver les matches pour une demande d'achat
   * C'est le cœur du système de matching
   */
  async findMatchesForRequest(requestId: string): Promise<PurchaseRequestMatch[]> {
    const request = await this.requestRepo.findById(requestId);
    if (!request || request.status !== 'published') {
      return [];
    }

    // Récupérer tous les listings disponibles
    const allListings = await this.listingRepo.findAll();
    const matches: PurchaseRequestMatch[] = [];

    for (const listing of allListings) {
      // Vérifier si le listing correspond aux critères
      const matchResult = await this.checkListingMatch(request, listing);
      
      if (matchResult.matches) {
        // Vérifier si le match n'existe pas déjà
        const exists = await this.matchRepo.exists(requestId, listing.id);
        if (!exists) {
          const match = await this.matchRepo.create({
            purchaseRequestId: requestId,
            producerId: listing.producerId,
            listingId: listing.id,
            matchScore: matchResult.score,
          });

          matches.push(match);

          // Incrémenter le compteur de producteurs matchés
          await this.requestRepo.incrementMatchedProducers(requestId);

          // Envoyer une notification au producteur
          await this.notifyProducerOfMatch(match, request, listing);
        }
      }
    }

    return matches;
  }

  /**
   * Vérifier si un listing correspond à une demande d'achat
   */
  private async checkListingMatch(
    request: PurchaseRequest,
    listing: MarketplaceListing
  ): Promise<{ matches: boolean; score: number }> {
    let score = 0;
    let matches = true;

    // 1. Vérifier la race
    const animal = await this.animalRepo.findById(listing.subjectId);
    if (!animal) {
      return { matches: false, score: 0 };
    }

    if (animal.race && animal.race.toLowerCase() !== request.race.toLowerCase()) {
      return { matches: false, score: 0 };
    }
    score += 20; // Race correspond

    // 2. Vérifier le poids
    // Récupérer le poids actuel de l'animal
    const { PoidsRepository } = await import('../database/repositories');
    const poidsRepo = new (PoidsRepository as any)(this.db);
    const latestWeight = await poidsRepo.findLatestByAnimalId(listing.subjectId);
    
    if (latestWeight) {
      const currentWeight = latestWeight.poids;
      if (currentWeight < request.minWeight || currentWeight > request.maxWeight) {
        return { matches: false, score: 0 };
      }
      score += 20; // Poids correspond
    } else {
      // Si pas de poids, on utilise le poids initial
      if (animal.poids_initial) {
        if (animal.poids_initial < request.minWeight || animal.poids_initial > request.maxWeight) {
          return { matches: false, score: 0 };
        }
        score += 15; // Poids initial correspond (moins de confiance)
      }
    }

    // 3. Vérifier l'âge
    if (animal.date_naissance) {
      const ageMonths = calculateAgeInMonths(animal.date_naissance);
      
      // Vérifier la catégorie d'âge
      if (request.ageCategory && !matchesAgeCategory(ageMonths, request.ageCategory)) {
        return { matches: false, score: 0 };
      }
      
      // Vérifier les limites d'âge
      if (request.minAgeMonths !== undefined && ageMonths < request.minAgeMonths) {
        return { matches: false, score: 0 };
      }
      if (request.maxAgeMonths !== undefined && ageMonths > request.maxAgeMonths) {
        return { matches: false, score: 0 };
      }
      score += 20; // Âge correspond
    }

    // 4. Vérifier la quantité
    // Pour l'instant, on considère qu'un listing = 1 sujet
    // TODO: Gérer les lots multiples
    if (request.quantity > 1) {
      // On accepte quand même mais avec un score réduit
      score += 10;
    } else {
      score += 15; // Quantité correspond
    }

    // 5. Vérifier la localisation
    if (request.deliveryLocation?.latitude && request.deliveryLocation?.longitude) {
      if (listing.location.latitude && listing.location.longitude) {
        const distance = calculateDistance(
          request.deliveryLocation.latitude,
          request.deliveryLocation.longitude,
          listing.location.latitude,
          listing.location.longitude
        );

        const maxRadius = request.deliveryLocation.radiusKm || 50; // Par défaut 50km
        if (distance > maxRadius) {
          return { matches: false, score: 0 };
        }

        // Score basé sur la distance (plus proche = meilleur score)
        const distanceScore = Math.max(0, 20 - (distance / maxRadius) * 10);
        score += distanceScore;
      }
    } else {
      score += 10; // Pas de contrainte de localisation
    }

    // 6. Vérifier le prix
    if (request.maxPricePerKg) {
      if (listing.pricePerKg > request.maxPricePerKg) {
        return { matches: false, score: 0 };
      }
      // Score basé sur le prix (moins cher = meilleur score)
      const priceRatio = listing.pricePerKg / request.maxPricePerKg;
      const priceScore = (1 - priceRatio) * 15;
      score += priceScore;
    } else if (request.maxTotalPrice) {
      // Calculer le prix total du listing
      if (latestWeight) {
        const totalPrice = listing.pricePerKg * latestWeight.poids;
        if (totalPrice > request.maxTotalPrice) {
          return { matches: false, score: 0 };
        }
        const priceRatio = totalPrice / request.maxTotalPrice;
        const priceScore = (1 - priceRatio) * 15;
        score += priceScore;
      }
    } else {
      score += 10; // Pas de contrainte de prix
    }

    return { matches: true, score: Math.min(100, Math.round(score)) };
  }

  /**
   * Notifier un producteur d'un match
   */
  private async notifyProducerOfMatch(
    match: PurchaseRequestMatch,
    request: PurchaseRequest,
    listing: MarketplaceListing
  ): Promise<void> {
    // Récupérer les informations de l'acheteur
    const buyer = await this.userRepo.findById(request.buyerId);
    const buyerName = buyer ? `${buyer.prenom} ${buyer.nom}` : 'Un acheteur';

    // Créer la notification
    await this.notificationRepo.create({
      userId: match.producerId,
      type: 'offer_received', // Réutiliser le type existant
      title: 'Nouvelle demande correspondant à votre annonce',
      message: `${buyerName} recherche ${request.quantity} ${request.race} correspondant à votre annonce. Poids souhaité: ${request.minWeight}-${request.maxWeight}kg.`,
      relatedId: match.id,
      relatedType: 'offer', // Réutiliser le type existant
      actionUrl: `purchase_request:${request.id}`,
    });

    // Marquer comme notifié
    await this.matchRepo.markAsNotified(match.id);
  }

  /**
   * Créer une offre de producteur sur une demande d'achat
   */
  async createOffer(data: {
    purchaseRequestId: string;
    producerId: string;
    listingId?: string;
    subjectIds: string[];
    proposedPricePerKg: number;
    quantity: number;
    availableDate?: string;
    message?: string;
  }): Promise<PurchaseRequestOffer> {
    const request = await this.requestRepo.findById(data.purchaseRequestId);
    if (!request) {
      throw new Error('Demande d\'achat introuvable');
    }

    if (request.status !== 'published') {
      throw new Error('Cette demande d\'achat n\'est plus active');
    }

    // Calculer le prix total
    // TODO: Récupérer le poids réel des sujets
    const estimatedWeight = (request.minWeight + request.maxWeight) / 2;
    const proposedTotalPrice = data.proposedPricePerKg * estimatedWeight * data.quantity;

    const offer = await this.offerRepo.create({
      purchaseRequestId: data.purchaseRequestId,
      producerId: data.producerId,
      listingId: data.listingId,
      subjectIds: data.subjectIds,
      proposedPricePerKg: data.proposedPricePerKg,
      proposedTotalPrice,
      quantity: data.quantity,
      availableDate: data.availableDate,
      message: data.message,
    });

    // Incrémenter le compteur d'offres
    await this.requestRepo.incrementOffers(data.purchaseRequestId);

    // Notifier l'acheteur
    const producer = await this.userRepo.findById(data.producerId);
    const producerName = producer ? `${producer.prenom} ${producer.nom}` : 'Un producteur';

    await this.notificationRepo.create({
      userId: request.buyerId,
      type: 'offer_received',
      title: 'Nouvelle offre reçue',
      message: `${producerName} vous propose ${data.quantity} ${request.race} à ${data.proposedPricePerKg.toLocaleString()} FCFA/kg.`,
      relatedId: offer.id,
      relatedType: 'offer',
      actionUrl: `purchase_request_offer:${offer.id}`,
    });

    return offer;
  }

  /**
   * Accepter une offre
   */
  async acceptOffer(offerId: string, buyerId: string): Promise<void> {
    const offer = await this.offerRepo.findById(offerId);
    if (!offer) {
      throw new Error('Offre introuvable');
    }

    const request = await this.requestRepo.findById(offer.purchaseRequestId);
    if (!request || request.buyerId !== buyerId) {
      throw new Error('Vous n\'êtes pas autorisé à accepter cette offre');
    }

    if (offer.status !== 'pending') {
      throw new Error('Cette offre n\'est plus valable');
    }

    // Mettre à jour le statut de l'offre
    await this.offerRepo.updateStatus(offerId, 'accepted');

    // Marquer la demande comme pourvue
    await this.requestRepo.markAsFulfilled(offer.purchaseRequestId);

    // Notifier le producteur
    const buyer = await this.userRepo.findById(buyerId);
    const buyerName = buyer ? `${buyer.prenom} ${buyer.nom}` : 'L\'acheteur';

    await this.notificationRepo.create({
      userId: offer.producerId,
      type: 'offer_accepted',
      title: 'Offre acceptée',
      message: `${buyerName} a accepté votre offre pour ${request.quantity} ${request.race}.`,
      relatedId: offerId,
      relatedType: 'offer',
    });

    // TODO: Créer une transaction automatique
  }

  /**
   * Refuser une offre
   */
  async rejectOffer(offerId: string, buyerId: string): Promise<void> {
    const offer = await this.offerRepo.findById(offerId);
    if (!offer) {
      throw new Error('Offre introuvable');
    }

    const request = await this.requestRepo.findById(offer.purchaseRequestId);
    if (!request || request.buyerId !== buyerId) {
      throw new Error('Vous n\'êtes pas autorisé à refuser cette offre');
    }

    await this.offerRepo.updateStatus(offerId, 'rejected');

    // Notifier le producteur
    const buyer = await this.userRepo.findById(buyerId);
    const buyerName = buyer ? `${buyer.prenom} ${buyer.nom}` : 'L\'acheteur';

    await this.notificationRepo.create({
      userId: offer.producerId,
      type: 'offer_rejected',
      title: 'Offre refusée',
      message: `${buyerName} a refusé votre offre.`,
      relatedId: offerId,
      relatedType: 'offer',
    });
  }

  /**
   * Retirer une offre (par le producteur)
   */
  async withdrawOffer(offerId: string, producerId: string): Promise<void> {
    const offer = await this.offerRepo.findById(offerId);
    if (!offer) {
      throw new Error('Offre introuvable');
    }

    if (offer.producerId !== producerId) {
      throw new Error('Vous n\'êtes pas autorisé à retirer cette offre');
    }

    if (offer.status !== 'pending') {
      throw new Error('Seules les offres en attente peuvent être retirées');
    }

    await this.offerRepo.withdraw(offerId);

    // Notifier l'acheteur
    const request = await this.requestRepo.findById(offer.purchaseRequestId);
    if (request) {
      const producer = await this.userRepo.findById(producerId);
      const producerName = producer ? `${producer.prenom} ${producer.nom}` : 'Le producteur';

      await this.notificationRepo.create({
        userId: request.buyerId,
        type: 'offer_rejected', // Réutiliser le type
        title: 'Offre retirée',
        message: `${producerName} a retiré son offre.`,
        relatedId: offerId,
        relatedType: 'offer',
      });
    }
  }

  /**
   * Récupérer les demandes d'achat matchées pour un producteur
   */
  async getMatchedRequestsForProducer(producerId: string): Promise<PurchaseRequestMatch[]> {
    return await this.matchRepo.findByProducerId(producerId);
  }

  /**
   * Récupérer les offres reçues pour un acheteur
   */
  async getOffersForBuyer(buyerId: string): Promise<PurchaseRequestOffer[]> {
    // Récupérer toutes les demandes de l'acheteur
    const requests = await this.requestRepo.findByBuyerId(buyerId);
    const allOffers: PurchaseRequestOffer[] = [];

    for (const request of requests) {
      const offers = await this.offerRepo.findByPurchaseRequestId(request.id, 'pending');
      allOffers.push(...offers);
    }

    return allOffers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

/**
 * Obtenir une instance du service
 */
export function getPurchaseRequestService(db?: SQLiteDatabase): PurchaseRequestService {
  if (db) {
    return new PurchaseRequestService(db);
  }
  // Si pas de db fournie, on ne peut pas créer le service
  // Il faudra l'appeler avec getDatabase()
  throw new Error('Database instance required');
}

