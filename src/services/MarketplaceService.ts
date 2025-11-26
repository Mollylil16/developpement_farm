/**
 * Service principal du Marketplace
 * Orchestre toutes les opérations marketplace
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  MarketplaceListing,
  Offer,
  Transaction,
  MarketplaceFilters,
  MarketplaceSortOption,
  MarketplaceSearchResult,
  ProducerStats,
  Location,
} from '../types/marketplace';
import {
  MarketplaceListingRepository,
  MarketplaceOfferRepository,
  MarketplaceTransactionRepository,
  MarketplaceRatingRepository,
  MarketplaceNotificationRepository,
} from '../database/repositories';

export class MarketplaceService {
  private listingRepo: MarketplaceListingRepository;
  private offerRepo: MarketplaceOfferRepository;
  private transactionRepo: MarketplaceTransactionRepository;
  private ratingRepo: MarketplaceRatingRepository;
  private notificationRepo: MarketplaceNotificationRepository;

  constructor(private db: SQLiteDatabase) {
    this.listingRepo = new MarketplaceListingRepository(db);
    this.offerRepo = new MarketplaceOfferRepository(db);
    this.transactionRepo = new MarketplaceTransactionRepository(db);
    this.ratingRepo = new MarketplaceRatingRepository(db);
    this.notificationRepo = new MarketplaceNotificationRepository(db);
  }

  // ========================================
  // LISTINGS - Gestion des annonces
  // ========================================

  /**
   * Créer une annonce
   */
  async createListing(data: {
    subjectId: string;
    producerId: string;
    farmId: string;
    pricePerKg: number;
    weight: number;
    lastWeightDate: string;
    location: Location;
  }): Promise<MarketplaceListing> {
    // Vérifier que le producteur ne met pas déjà ce sujet en vente
    const existingListings = await this.listingRepo.findByFarmId(data.farmId);
    const alreadyListed = existingListings.some(
      (l) => l.subjectId === data.subjectId && l.status === 'available'
    );

    if (alreadyListed) {
      throw new Error('Ce sujet est déjà en vente sur le marketplace');
    }

    // Calculer le prix total
    const calculatedPrice = data.pricePerKg * data.weight;

    // Créer le listing avec conditions de vente par défaut
    const listing = await this.listingRepo.create({
      subjectId: data.subjectId,
      producerId: data.producerId,
      farmId: data.farmId,
      pricePerKg: data.pricePerKg,
      calculatedPrice,
      lastWeightDate: data.lastWeightDate,
      location: data.location,
      saleTerms: {
        transport: 'buyer_responsibility',
        slaughter: 'buyer_responsibility',
        paymentTerms: 'on_delivery',
        warranty:
          'Tous les documents sanitaires et certificats seront fournis. Garantie de conformité au poids et à l\'âge annoncés (marge de ±5%)',
        cancellationPolicy:
          'Annulation possible jusqu\'à 48h avant la date de livraison. Après ce délai, des frais peuvent s\'appliquer.',
      },
    });

    // TODO: Mettre à jour le statut du sujet dans production_animaux
    // marketplace_status = 'available', marketplace_listing_id = listing.id

    return listing;
  }

  /**
   * Rechercher des annonces avec filtres et pagination
   */
  async searchListings(
    filters?: MarketplaceFilters,
    sort?: MarketplaceSortOption,
    page: number = 1,
    limit: number = 20
  ): Promise<MarketplaceSearchResult> {
    const { listings, total } = await this.listingRepo.search(filters, sort, page, limit);
    const totalPages = Math.ceil(total / limit);

    return {
      listings,
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Obtenir les détails d'une annonce
   */
  async getListingDetails(listingId: string): Promise<MarketplaceListing | null> {
    const listing = await this.listingRepo.findById(listingId);
    
    // Incrémenter les vues
    if (listing) {
      await this.listingRepo.incrementViews(listingId);
    }

    return listing;
  }

  /**
   * Retirer une annonce du marketplace
   */
  async removeListing(listingId: string, producerId: string): Promise<void> {
    const listing = await this.listingRepo.findById(listingId);
    
    if (!listing) {
      throw new Error('Annonce introuvable');
    }

    if (listing.producerId !== producerId) {
      throw new Error('Vous n\'êtes pas autorisé à retirer cette annonce');
    }

    // Vérifier qu'il n'y a pas d'offres en attente
    const offers = await this.offerRepo.findByBuyerId(producerId);
    const pendingOffers = offers.filter(
      (o) => o.listingId === listingId && o.status === 'pending'
    );

    if (pendingOffers.length > 0) {
      throw new Error(
        'Impossible de retirer cette annonce, des offres sont en attente. Veuillez les traiter d\'abord.'
      );
    }

    await this.listingRepo.remove(listingId);

    // TODO: Mettre à jour le statut du sujet dans production_animaux
    // marketplace_status = null, marketplace_listing_id = null
  }

  // ========================================
  // OFFERS - Gestion des offres
  // ========================================

  /**
   * Créer une offre
   */
  async createOffer(data: {
    listingId: string;
    subjectIds: string[];
    buyerId: string;
    proposedPrice: number;
    message?: string;
  }): Promise<Offer> {
    const listing = await this.listingRepo.findById(data.listingId);

    if (!listing) {
      throw new Error('Annonce introuvable');
    }

    if (listing.status !== 'available') {
      throw new Error('Cette annonce n\'est plus disponible');
    }

    // Vérifier que l'acheteur n'est pas le producteur (auto-achat interdit)
    if (data.buyerId === listing.producerId) {
      throw new Error('Vous ne pouvez pas acheter vos propres sujets');
    }

    // Calculer la date d'expiration (7 jours)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const offer = await this.offerRepo.create({
      listingId: data.listingId,
      subjectIds: data.subjectIds,
      buyerId: data.buyerId,
      producerId: listing.producerId,
      proposedPrice: data.proposedPrice,
      originalPrice: listing.calculatedPrice,
      message: data.message,
      termsAccepted: true, // Doit être accepté avant création
      termsAcceptedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    // Incrémenter le compteur d'enquêtes
    await this.listingRepo.incrementInquiries(data.listingId);

    // Notifier le producteur
    await this.notificationRepo.create({
      userId: listing.producerId,
      type: 'offer_received',
      title: 'Nouvelle offre reçue',
      message: `Vous avez reçu une offre de ${data.proposedPrice.toLocaleString()} FCFA`,
      relatedId: offer.id,
      relatedType: 'offer',
    });

    return offer;
  }

  /**
   * Accepter une offre
   */
  async acceptOffer(offerId: string, producerId: string): Promise<Transaction> {
    const offer = await this.offerRepo.findById(offerId);

    if (!offer) {
      throw new Error('Offre introuvable');
    }

    if (offer.producerId !== producerId) {
      throw new Error('Vous n\'êtes pas autorisé à accepter cette offre');
    }

    if (offer.status !== 'pending') {
      throw new Error('Cette offre n\'est plus en attente');
    }

    // Mettre à jour le statut de l'offre
    await this.offerRepo.updateStatus(offerId, 'accepted');

    // Créer la transaction
    const transaction = await this.transactionRepo.create({
      offerId: offer.id,
      listingId: offer.listingId,
      subjectIds: offer.subjectIds,
      buyerId: offer.buyerId,
      producerId: offer.producerId,
      finalPrice: offer.proposedPrice,
      status: 'confirmed',
      documents: {},
    });

    // Mettre à jour le statut du listing
    await this.listingRepo.updateStatus(offer.listingId, 'reserved');

    // Notifier l'acheteur
    await this.notificationRepo.create({
      userId: offer.buyerId,
      type: 'offer_accepted',
      title: 'Offre acceptée !',
      message: 'Votre offre a été acceptée par le producteur',
      relatedId: transaction.id,
      relatedType: 'transaction',
    });

    return transaction;
  }

  /**
   * Rejeter une offre
   */
  async rejectOffer(offerId: string, producerId: string): Promise<void> {
    const offer = await this.offerRepo.findById(offerId);

    if (!offer) {
      throw new Error('Offre introuvable');
    }

    if (offer.producerId !== producerId) {
      throw new Error('Vous n\'êtes pas autorisé à rejeter cette offre');
    }

    await this.offerRepo.updateStatus(offerId, 'rejected');

    // Notifier l'acheteur
    await this.notificationRepo.create({
      userId: offer.buyerId,
      type: 'offer_rejected',
      title: 'Offre refusée',
      message: 'Votre offre a été refusée par le producteur',
      relatedId: offerId,
      relatedType: 'offer',
    });
  }

  // ========================================
  // TRANSACTIONS - Gestion des ventes
  // ========================================

  /**
   * Confirmer la livraison (producteur ou acheteur)
   */
  async confirmDelivery(
    transactionId: string,
    userId: string,
    role: 'producer' | 'buyer'
  ): Promise<void> {
    const transaction = await this.transactionRepo.findById(transactionId);

    if (!transaction) {
      throw new Error('Transaction introuvable');
    }

    // Vérifier l'autorisation
    if (role === 'producer' && transaction.producerId !== userId) {
      throw new Error('Vous n\'êtes pas autorisé à confirmer cette livraison');
    }
    if (role === 'buyer' && transaction.buyerId !== userId) {
      throw new Error('Vous n\'êtes pas autorisé à confirmer cette livraison');
    }

    // Confirmer la livraison
    await this.transactionRepo.confirmDelivery(transactionId, role);

    // Vérifier si les deux ont confirmé
    const updatedTransaction = await this.transactionRepo.findById(transactionId);
    
    if (
      updatedTransaction?.deliveryDetails?.producerConfirmed &&
      updatedTransaction?.deliveryDetails?.buyerConfirmed
    ) {
      // Transaction complétée !
      // Mettre à jour le listing
      await this.listingRepo.updateStatus(transaction.listingId, 'sold');

      // TODO: Retirer le sujet du cheptel (inHerd = false)

      // Notifier les deux parties
      await this.notificationRepo.create({
        userId: transaction.producerId,
        type: 'delivery_confirmed',
        title: 'Livraison confirmée',
        message: 'La transaction est terminée. N\'oubliez pas de noter l\'acheteur !',
        relatedId: transactionId,
        relatedType: 'transaction',
      });

      await this.notificationRepo.create({
        userId: transaction.buyerId,
        type: 'delivery_confirmed',
        title: 'Livraison confirmée',
        message: 'La transaction est terminée. N\'oubliez pas de noter le producteur !',
        relatedId: transactionId,
        relatedType: 'transaction',
      });
    } else {
      // Notifier l'autre partie qu'une confirmation est en attente
      const otherUserId =
        role === 'producer' ? transaction.buyerId : transaction.producerId;
      
      await this.notificationRepo.create({
        userId: otherUserId,
        type: 'delivery_confirmed',
        title: 'Confirmation de livraison',
        message: `${role === 'producer' ? 'Le producteur' : 'L\'acheteur'} a confirmé la livraison. Veuillez confirmer de votre côté.`,
        relatedId: transactionId,
        relatedType: 'transaction',
      });
    }
  }

  // ========================================
  // PRODUCER STATS - Statistiques producteur
  // ========================================

  /**
   * Obtenir les statistiques d'un producteur
   */
  async getProducerStats(producerId: string): Promise<ProducerStats> {
    // Compter les ventes complétées
    const transactions = await this.transactionRepo.findByProducerId(producerId);
    const completedTransactions = transactions.filter((t) => t.status === 'completed');

    // Calculer la note moyenne
    const averageRating = await this.ratingRepo.getAverageRating(producerId);

    // Compter le nombre total de notations
    const ratings = await this.ratingRepo.findByProducerId(producerId);

    // Calculer le taux de complétion (ventes complétées / ventes totales)
    const totalTransactions = transactions.length;
    const completionRate =
      totalTransactions > 0
        ? (completedTransactions.length / totalTransactions) * 100
        : 0;

    return {
      totalSales: completedTransactions.length,
      averageRating: Math.round(averageRating * 10) / 10, // Arrondir à 1 décimale
      totalRatings: ratings.length,
      responseTime: 24, // TODO: Calculer le temps de réponse moyen
      completionRate: Math.round(completionRate),
    };
  }

  // ========================================
  // VALIDATION - Vérifications de sécurité
  // ========================================

  /**
   * Vérifier si un utilisateur peut interagir avec un listing
   * (empêcher l'auto-achat)
   */
  canUserInteractWithListing(userId: string, listing: MarketplaceListing): boolean {
    return listing.producerId !== userId;
  }

  /**
   * Vérifier si un sujet peut être mis en vente
   */
  async canSubjectBeListed(subjectId: string): Promise<{
    canList: boolean;
    reason?: string;
  }> {
    // TODO: Vérifier dans production_animaux:
    // - Le sujet existe
    // - Le sujet est actif (statut = 'actif')
    // - Le sujet n'est pas déjà en vente
    // - Le sujet a une pesée récente (< 30 jours)

    return { canList: true };
  }
}

/**
 * Instance singleton du service
 */
let marketplaceServiceInstance: MarketplaceService | null = null;

export function getMarketplaceService(db: SQLiteDatabase): MarketplaceService {
  if (!marketplaceServiceInstance) {
    marketplaceServiceInstance = new MarketplaceService(db);
  }
  return marketplaceServiceInstance;
}

