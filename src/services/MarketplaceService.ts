/**
 * Service principal du Marketplace
 * Orchestre toutes les opérations marketplace
 */

import { isError } from '../types/common';
import type {
  MarketplaceListing,
  Offer,
  Transaction,
  MarketplaceFilters,
  MarketplaceSortOption,
  MarketplaceSearchResult,
  ProducerStats,
  Location,
  FarmCard,
} from '../types/marketplace';
import {
  MarketplaceListingRepository,
  MarketplaceOfferRepository,
  MarketplaceTransactionRepository,
  MarketplaceRatingRepository,
  MarketplaceNotificationRepository,
} from '../database/repositories';
import { logger } from '../utils/logger';

export class MarketplaceService {
  private listingRepo: MarketplaceListingRepository;
  private offerRepo: MarketplaceOfferRepository;
  private transactionRepo: MarketplaceTransactionRepository;
  private ratingRepo: MarketplaceRatingRepository;
  private notificationRepo: MarketplaceNotificationRepository;

  constructor() {
    this.listingRepo = new MarketplaceListingRepository();
    this.offerRepo = new MarketplaceOfferRepository();
    this.transactionRepo = new MarketplaceTransactionRepository();
    this.ratingRepo = new MarketplaceRatingRepository();
    this.notificationRepo = new MarketplaceNotificationRepository();
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
    // ✅ VALIDATION: Vérifier que le poids n'est pas nul
    if (!data.weight || data.weight <= 0) {
      throw new Error(
        "Impossible de mettre en vente un sujet dont le poids est nul ou négatif. Veuillez d'abord enregistrer une pesée pour ce sujet."
      );
    }

    // Vérifier que le producteur ne met pas déjà ce sujet en vente
    const existingListings = await this.listingRepo.findByFarmId(data.farmId);
    const alreadyListed = existingListings.find(
      (l) => l.subjectId === data.subjectId && l.status === 'available'
    );

    if (alreadyListed) {
      // Récupérer les informations du sujet pour un message d'erreur plus précis
      try {
        const { AnimalRepository } = await import('../database/repositories');
        const animalRepo = new AnimalRepository();
        const animal = await animalRepo.findById(data.subjectId);

        const subjectName = animal?.nom || animal?.code || 'sujet';
        const subjectCode = animal?.code || data.subjectId;
        throw new Error(
          `Le sujet "${subjectName}" (${subjectCode}) est déjà en vente sur le marketplace`
        );
      } catch (error: unknown) {
        // Si l'erreur est déjà notre message personnalisé, la relancer
        if (isError(error) && error.message.includes('déjà en vente')) {
          throw error;
        }
        // Sinon, utiliser un message générique
        throw new Error('Ce sujet est déjà en vente sur le marketplace');
      }
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
          "Tous les documents sanitaires et certificats seront fournis. Garantie de conformité au poids et à l'âge annoncés (marge de ±5%)",
        cancellationPolicy:
          "Annulation possible jusqu'à 48h avant la date de livraison. Après ce délai, des frais peuvent s'appliquer.",
      },
    });

    // Mettre à jour le statut du sujet dans production_animaux
    try {
      const { AnimalRepository } = await import('../database/repositories');
      const animalRepo = new AnimalRepository();

      // Vérifier que l'animal existe avant de mettre à jour
      const animal = await animalRepo.findById(data.subjectId);
      if (!animal) {
        throw new Error(`Animal ${data.subjectId} introuvable`);
      }

      // Mettre à jour le statut de l'animal via le repository
      await animalRepo.update(data.subjectId, {
        // Note: marketplace_status et marketplace_listing_id doivent être gérés par le backend
        // Pour l'instant, on laisse le backend gérer ces champs
      });
    } catch (error) {
      logger.warn('Erreur mise à jour statut marketplace dans production_animaux:', error);
      // Ne pas bloquer si la mise à jour échoue
    }

    return listing;
  }

  /**
   * Récupérer un listing par ID
   */
  async getListingById(listingId: string): Promise<MarketplaceListing> {
    const listing = await this.listingRepo.findById(listingId);
    if (!listing) {
      throw new Error('Listing introuvable');
    }
    return listing;
  }

  /**
   * Rechercher des annonces avec filtres et pagination
   * @param userId - ID de l'utilisateur pour filtrer ses propres listings (optionnel)
   */
  async searchListings(
    filters?: MarketplaceFilters,
    sort?: MarketplaceSortOption,
    page: number = 1,
    limit: number = 20,
    userId?: string
  ): Promise<MarketplaceSearchResult> {
    const { listings, total } = await this.listingRepo.search(filters, sort, page, limit);

    // Utiliser total pour calculer le nombre total de pages
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    // Filtrer les listings de l'utilisateur si userId fourni
    let filteredListings = listings;
    if (userId) {
      try {
        const { getMarketplacePermissions } = await import('./MarketplacePermissions');
        const permissions = getMarketplacePermissions();
        filteredListings = await permissions.filterListingsForUser(userId, listings);
      } catch (error) {
        logger.error('Erreur lors du filtrage des listings dans searchListings:', error);
        // En cas d'erreur, filtrer manuellement par producerId et farmId
        try {
          const { ProjetRepository } = await import('../database/repositories');
          const projetRepo = new ProjetRepository();
          const userProjets = await projetRepo.findByOwnerId(userId);
          const userFarmIds = userProjets.map((p) => p.id);
          
          filteredListings = listings.filter((listing) => {
            // Exclure si producerId correspond à userId
            if (listing.producerId === userId) {
              return false;
            }
            // Exclure si farmId correspond à un projet de l'utilisateur
            if (listing.farmId && userFarmIds.includes(listing.farmId)) {
              return false;
            }
            return true;
          });
        } catch (fallbackError) {
          logger.error('Erreur lors du filtrage de secours:', fallbackError);
          // En dernier recours, filtrer uniquement par producerId
          filteredListings = listings.filter((listing) => listing.producerId !== userId);
        }
      }
    }

    // Enrichir les listings avec les données des animaux
    const { AnimalRepository } = await import('../database/repositories');
    const { PeseeRepository } = await import('../database/repositories');
    const { VaccinationRepository } = await import('../database/repositories');
    const animalRepo = new AnimalRepository();
      const peseeRepo = new PeseeRepository();
    const vaccinationRepo = new VaccinationRepository();

    const enrichedListings = await Promise.all(
      filteredListings.map(async (listing) => {
        try {
          // Gérer les listings batch (sans subjectId)
          if (listing.listingType === 'batch' || (!listing.subjectId && listing.batchId)) {
            // Pour les listings batch, retourner le listing tel quel avec quelques enrichissements
            return {
              ...listing,
              type: 'batch' as const,
              code: listing.batchId ? `Bande #${listing.batchId.slice(0, 8)}` : 'Bande',
              race: 'Bande',
              weight: listing.weight || 0,
              weightDate: listing.lastWeightDate,
              age: 0,
              totalPrice: listing.calculatedPrice,
              healthStatus: 'good' as const,
              vaccinations: false,
              available: listing.status === 'available',
            };
          }

          // Pour les listings individuels, récupérer les données de l'animal
          if (!listing.subjectId) {
            return null; // Ignorer les listings sans subjectId ni batchId
          }

          const animal = await animalRepo.findById(listing.subjectId);
          if (!animal) {
            return null; // Ignorer les listings avec animaux introuvables
          }

          // Récupérer la dernière pesée pour le poids actuel
          const dernierePesee = await peseeRepo.findLastByAnimal(animal.id);
          const poidsActuel = dernierePesee?.poids_kg || animal.poids_initial || 0;

          // Calculer l'âge en mois
          const ageEnMois = animal.date_naissance
            ? Math.floor(
                (new Date().getTime() - new Date(animal.date_naissance).getTime()) /
                  (1000 * 60 * 60 * 24 * 30)
              )
            : 0;

          // Vérifier le statut des vaccinations
          const vaccinations = await vaccinationRepo.findByAnimal(animal.id);
          const vaccinationsAJour =
            vaccinations.length > 0 &&
            vaccinations.every(
              (v) => v.date_rappel === null || new Date(v.date_rappel) > new Date()
            );

          // Déterminer le statut de santé (simplifié)
          let healthStatus: 'good' | 'attention' | 'critical' = 'good';
          if (animal.statut === 'mort' || animal.statut === 'malade') {
            healthStatus = 'critical';
          } else if (!vaccinationsAJour) {
            healthStatus = 'attention';
          }

          // Créer un objet enrichi qui peut être utilisé comme SubjectCard ou MarketplaceListing
          return {
            ...listing,
            type: 'subject' as const,
            // Propriétés pour SubjectCard
            code: animal.code || animal.numero_identification || (animal.id ? `#${animal.id.slice(0, 8)}` : listing.subjectId || 'N/A'),
            race: animal.race || 'Non spécifiée',
            weight: poidsActuel,
            weightDate: dernierePesee?.date_pesee || listing.lastWeightDate,
            age: ageEnMois,
            totalPrice: listing.calculatedPrice,
            healthStatus,
            vaccinations: vaccinationsAJour,
            available: listing.status === 'available',
          };
        } catch (error) {
          logger.error(`Erreur lors de l'enrichissement du listing ${listing.id}:`, error);
          return null;
        }
      })
    );

    // Filtrer les nulls
    const validListings = enrichedListings.filter((l): l is NonNullable<typeof l> => l !== null);
    
    const filteredTotal = validListings.length;
    // Calculer le nombre de pages après filtrage et enrichissement
    const totalPagesAfterFilter = Math.ceil(filteredTotal / limit);

    return {
      listings: validListings,
      total: filteredTotal, // Total après filtrage et enrichissement
      page,
      totalPages: totalPagesAfterFilter, // Utiliser totalPagesAfterFilter
      hasMore: page < totalPagesAfterFilter, // Recalculer hasMore basé sur le total filtré
    };
  }

  /**
   * Grouper les listings par ferme et créer des FarmCards
   * @param userId - ID de l'utilisateur pour filtrer ses propres listings (optionnel)
   */
  async groupListingsByFarm(
    listings: MarketplaceListing[],
    buyerLocation?: { latitude: number; longitude: number },
    userId?: string
  ): Promise<FarmCard[]> {
    // Récupérer les favoris de l'utilisateur si userId fourni
    let savedFarms: string[] = [];
    if (userId) {
      try {
        const { UserRepository } = await import('../database/repositories');
        const userRepo = new UserRepository();
        const user = await userRepo.findById(userId);
        if (user?.saved_farms) {
          savedFarms = user.saved_farms;
        }
      } catch (error) {
        logger.warn('Erreur récupération favoris:', error);
      }
    }
    // Filtrer les listings de l'utilisateur si userId fourni
    let filteredListings = listings;
    if (userId) {
      try {
        const { getMarketplacePermissions } = await import('./MarketplacePermissions');
        const permissions = getMarketplacePermissions();
        filteredListings = await permissions.filterListingsForUser(userId, listings);
      } catch (error) {
        logger.error('Erreur lors du filtrage des listings dans groupListingsByFarm:', error);
        // En cas d'erreur, filtrer manuellement par producerId et farmId
        try {
          const { ProjetRepository } = await import('../database/repositories');
          const projetRepo = new ProjetRepository();
          const userProjets = await projetRepo.findByOwnerId(userId);
          const userFarmIds = userProjets.map((p) => p.id);
          
          filteredListings = listings.filter((listing) => {
            // Exclure si producerId correspond à userId
            if (listing.producerId === userId) {
              return false;
            }
            // Exclure si farmId correspond à un projet de l'utilisateur
            if (listing.farmId && userFarmIds.includes(listing.farmId)) {
              return false;
            }
            return true;
          });
        } catch (fallbackError) {
          logger.error('Erreur lors du filtrage de secours:', fallbackError);
          // En dernier recours, filtrer uniquement par producerId
          filteredListings = listings.filter((listing) => listing.producerId !== userId);
        }
      }
    }
    // Grouper par farmId
    const farmGroups = new Map<string, MarketplaceListing[]>();

    for (const listing of filteredListings) {
      if (listing.status !== 'available') continue;

      const existing = farmGroups.get(listing.farmId) || [];
      existing.push(listing);
      farmGroups.set(listing.farmId, existing);
    }

    // Créer les FarmCards
    let userRepo: any;
    let projetRepo: any;
    let ratingRepo: any;
    let animalRepo: any;

    try {
      const repositories = await import('../database/repositories');
      userRepo = new repositories.UserRepository();
      projetRepo = new repositories.ProjetRepository();
      ratingRepo = new repositories.MarketplaceRatingRepository();
      animalRepo = new repositories.AnimalRepository();
    } catch (error) {
      logger.error('Erreur lors de l\'import des repositories dans groupListingsByFarm:', error);
      // Retourner un tableau vide si les repositories ne peuvent pas être chargés
      return [];
    }

    const farmCards: FarmCard[] = [];

    for (const [farmId, farmListings] of farmGroups.entries()) {
      try {
        // Récupérer les infos de la ferme
        const projet = await projetRepo.findById(farmId);
        if (!projet) continue;

        // Récupérer les infos du producteur
        const producerId = farmListings[0].producerId;
        const producer = await userRepo.findById(producerId);
        if (!producer) continue;

        // Calculer les données agrégées
        const weights = farmListings.map((l) => l.weight || 0);
        const prices = farmListings.map((l) => l.pricePerKg);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const totalSubjects = farmListings.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

        // Récupérer les races disponibles
        // Filtrer les listings individuels (avec subjectId) et batch (avec batchId)
        const individualListings = farmListings.filter((l) => l.subjectId && (l.listingType === 'individual' || !l.listingType));
        const batchListings = farmListings.filter((l) => l.listingType === 'batch' && l.batchId);
        
        const races = new Set<string>();
        const photos: string[] = [];

        // Traiter les listings individuels
        const subjectIds = individualListings.map((l) => l.subjectId).filter((id): id is string => !!id);
        for (const subjectId of subjectIds.slice(0, 4)) {
          try {
            const animal = await animalRepo.findById(subjectId);
            if (animal) {
              if (animal.race) races.add(animal.race);
              if (animal.photo_uri) photos.push(animal.photo_uri);
            }
          } catch (error) {
            logger.warn(`Erreur récupération animal ${subjectId}:`, error);
          }
        }

        // Traiter les listings batch (récupérer les races depuis les batches)
        for (const batchListing of batchListings.slice(0, 4)) {
          try {
            if (batchListing.batchId) {
              // Récupérer les informations de la bande depuis l'API
              const apiClient = (await import('./api/apiClient')).default;
              const batch = await apiClient.get<any>(`/batch-pigs/batch/${batchListing.batchId}`);
              if (batch) {
                // Les batches peuvent avoir une catégorie qui peut être utilisée comme "race"
                if (batch.category) {
                  races.add(batch.category);
                }
                // Pour les photos, on pourrait récupérer depuis batch_pigs si nécessaire
              }
            }
          } catch (error) {
            logger.warn(`Erreur récupération batch ${batchListing.batchId}:`, error);
          }
        }

        // Récupérer les ratings
        const ratings = await ratingRepo.findByProducerId(producerId);
        const avgRating =
          ratings.length > 0 ? ratings.reduce((sum, r) => sum + (r.overall || 0), 0) / ratings.length : 0;

        // Calculer la distance si location fournie
        let distance: number | undefined;
        if (buyerLocation && farmListings[0].location.latitude) {
          distance = this.calculateDistance(
            buyerLocation.latitude,
            buyerLocation.longitude,
            farmListings[0].location.latitude,
            farmListings[0].location.longitude
          );
        }

        // Déterminer les badges
        const now = new Date();
        const firstListingDate = new Date(farmListings[0].listedAt);
        const monthsSinceFirstListing =
          (now.getTime() - firstListingDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        const isNewProducer = monthsSinceFirstListing < 3;

        // Calculer fastResponder depuis les stats
        const producerStats = await this.getProducerStats(producerId);
        const fastResponder = producerStats.responseTime > 0 && producerStats.responseTime < 24; // Répond en moins de 24h
        const isCertified = false; // À implémenter avec système de certifications

        const farmCard: FarmCard = {
          id: farmId,
          farmId,
          name: projet.nom,
          location: farmListings[0].location,
          distance,
          totalSubjects,
          totalWeight,
          averageRating: avgRating,
          photoUrl: photos[0],
          isNew: isNewProducer,
          stats: {
            totalListings: totalSubjects,
            totalSales: producerStats.totalSales,
            averageRating: avgRating,
            totalRatings: ratings.length,
            responseTime: producerStats.responseTime,
            completionRate: producerStats.completionRate,
          },
          producerId,
          producerName: producer.nom || producer.email || 'Producteur',
          producerAvatar: producer.photo_uri,
          aggregatedData: {
            totalSubjectsForSale: totalSubjects,
            totalWeight,
            priceRange: {
              min: minPrice,
              max: maxPrice,
            },
            averagePricePerKg: avgPrice,
          },
          producerRating: {
            overall: avgRating,
            totalReviews: ratings.length,
          },
          badges: {
            isNewProducer,
            isCertified,
            fastResponder,
          },
          preview: {
            subjectPhotos: photos.slice(0, 4),
            availableRaces: Array.from(races),
          },
          lastUpdated: new Date(
            Math.max(...farmListings.map((l) => new Date(l.updatedAt).getTime()))
          ),
        };

        farmCards.push(farmCard);
      } catch (error) {
        logger.error(`Erreur lors de la création de la FarmCard pour ${farmId}:`, error);
      }
    }

    // Filtrer les FarmCards de l'utilisateur si userId fourni
    let filteredFarmCards = farmCards;
    if (userId) {
      try {
        const { getMarketplacePermissions } = await import('./MarketplacePermissions');
        const permissions = getMarketplacePermissions();
        filteredFarmCards = await permissions.filterFarmCardsForUser(userId, farmCards);
      } catch (error) {
        logger.error('Erreur lors du filtrage des FarmCards:', error);
        // En cas d'erreur, filtrer manuellement par producerId et farmId
        try {
          const { ProjetRepository } = await import('../database/repositories');
          const projetRepo = new ProjetRepository();
          const userProjets = await projetRepo.findByOwnerId(userId);
          const userFarmIds = userProjets.map((p) => p.id);
          
          filteredFarmCards = farmCards.filter((farm) => {
            // Exclure si producerId correspond à userId
            if (farm.producerId === userId) {
              return false;
            }
            // Exclure si farmId correspond à un projet de l'utilisateur
            if (farm.farmId && userFarmIds.includes(farm.farmId)) {
              return false;
            }
            return true;
          });
        } catch (fallbackError) {
          logger.error('Erreur lors du filtrage de secours des FarmCards:', fallbackError);
          // En dernier recours, filtrer uniquement par producerId
          filteredFarmCards = farmCards.filter((farm) => farm.producerId !== userId);
        }
      }
    }

    // Trier les fermes : favoris en premier, puis les autres
    filteredFarmCards.sort((a, b) => {
      const aIsFavorite = savedFarms.includes(a.farmId);
      const bIsFavorite = savedFarms.includes(b.farmId);

      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;

      // Si les deux sont favoris ou non favoris, trier par nom
      return a.name.localeCompare(b.name);
    });

    return filteredFarmCards;
  }

  /**
   * Calculer la distance entre deux points (formule de Haversine)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
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
      throw new Error("Vous n'êtes pas autorisé à retirer cette annonce");
    }

    // Vérifier qu'il n'y a pas d'offres en attente
    const offers = await this.offerRepo.findByListingId(listingId);
    const pendingOffers = offers.filter((o) => o.status === 'pending');

    if (pendingOffers.length > 0) {
      throw new Error(
        "Impossible de retirer cette annonce, des offres sont en attente. Veuillez les traiter d'abord."
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
   * Vérifie si un utilisateur peut faire une offre sur une annonce
   *
   * RÈGLE CRITIQUE: Un utilisateur ne peut JAMAIS acheter ses propres sujets,
   * quel que soit son rôle/profil actif (producteur, acheteur, vétérinaire, technicien).
   *
   * Cette vérification se fait au niveau du producteur (producerId), pas du rôle actif.
   *
   * @param userId - ID de l'utilisateur
   * @param listingId - ID de l'annonce
   * @returns Objet avec allowed (boolean) et reason (string optionnel)
   */
  async canUserMakeOffer(
    userId: string,
    listingId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const listing = await this.listingRepo.findById(listingId);

    if (!listing) {
      return {
        allowed: false,
        reason: 'Annonce introuvable',
      };
    }

    // ✅ RÈGLE CRITIQUE: Vérifier si l'utilisateur est le producteur
    // Peu importe son rôle actif, un utilisateur ne peut pas acheter ses propres sujets
    // On vérifie via les projets (farmId) car le producerId est l'ID du projet
    try {
      const { ProjetRepository } = await import('../database/repositories');
      const projetRepo = new ProjetRepository();
      const projet = await projetRepo.findById(listing.farmId);

      if (projet && projet.proprietaire_id === userId) {
        return {
          allowed: false,
          reason:
            "Vous ne pouvez pas faire d'offre sur vos propres sujets, quel que soit votre rôle actif.",
        };
      }
    } catch (error) {
      logger.error('Erreur lors de la vérification du propriétaire:', error);
      // En cas d'erreur, on fait une vérification de secours
      // Si le producerId correspond directement à l'userId (ancien système), bloquer aussi
      if (listing.producerId === userId) {
        return {
          allowed: false,
          reason:
            "Vous ne pouvez pas faire d'offre sur vos propres sujets, quel que soit votre rôle actif.",
        };
      }
    }

    // Vérifier que l'annonce est disponible
    if (listing.status !== 'available') {
      return {
        allowed: false,
        reason: "Cette annonce n'est plus disponible",
      };
    }

    return { allowed: true };
  }

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
    // Vérifier si l'utilisateur peut faire une offre
    const canMakeOffer = await this.canUserMakeOffer(data.buyerId, data.listingId);
    if (!canMakeOffer.allowed) {
      throw new Error(canMakeOffer.reason || "Vous ne pouvez pas faire d'offre sur cette annonce");
    }

    const listing = await this.listingRepo.findById(data.listingId);

    if (!listing) {
      throw new Error('Annonce introuvable');
    }

    if (listing.status !== 'available') {
      throw new Error("Cette annonce n'est plus disponible");
    }

    // ✅ RÈGLE CRITIQUE: Vérification supplémentaire (redondante mais sécurisée)
    // La vérification principale est déjà faite dans canUserMakeOffer, mais on la refait ici
    // pour une sécurité maximale. On vérifie via les projets (farmId) car le producerId est l'ID du projet
    try {
      const { ProjetRepository } = await import('../database/repositories');
      const projetRepo = new ProjetRepository();
      const projet = await projetRepo.findById(listing.farmId);

      if (projet && projet.proprietaire_id === data.buyerId) {
        throw new Error(
          'Vous ne pouvez pas acheter vos propres sujets, quel que soit votre rôle actif.'
        );
      }
    } catch (error: unknown) {
      // Si l'erreur est déjà notre message personnalisé, la relancer
      if (isError(error) && error.message.includes('ne pouvez pas acheter')) {
        throw error;
      }
      // En cas d'erreur de vérification, faire une vérification de secours
      // (pour compatibilité avec l'ancien système où producerId pourrait être l'userId)
      if (data.buyerId === listing.producerId) {
        throw new Error(
          'Vous ne pouvez pas acheter vos propres sujets, quel que soit votre rôle actif.'
        );
      }
    }

    // Vérifier si l'acheteur a déjà fait une offre pour ce sujet
    const existingOffers = await this.offerRepo.findByBuyerId(data.buyerId);
    const hasExistingOffer = existingOffers.some((offer) => {
      // Vérifier si l'offre existe pour le même listing et contient au moins un des mêmes sujets
      if (offer.listingId === data.listingId && offer.status === 'pending') {
        // Vérifier si au moins un sujet est en commun
        const commonSubjects = offer.subjectIds.filter((id) => data.subjectIds.includes(id));
        return commonSubjects.length > 0;
      }
      return false;
    });

    if (hasExistingOffer) {
      throw new Error(
        "Vous avez déjà fait une offre pour ce sujet. Veuillez retirer votre offre existante avant d'en créer une nouvelle."
      );
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
      throw new Error("Vous n'êtes pas autorisé à accepter cette offre");
    }

    if (offer.status !== 'pending') {
      throw new Error("Cette offre n'est plus en attente");
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

    // Notifier l'acheteur qui a fait l'offre acceptée
    await this.notificationRepo.create({
      userId: offer.buyerId,
      type: 'offer_accepted',
      title: 'Offre acceptée !',
      message: 'Votre offre a été acceptée par le producteur',
      relatedId: transaction.id,
      relatedType: 'transaction',
    });

    // Notifier les autres acheteurs qui ont fait des offres pour les mêmes sujets
    // que ces sujets ne sont plus disponibles
    const allOffersForListing = await this.offerRepo.findByListingId(offer.listingId);
    const otherPendingOffers = allOffersForListing.filter(
      (o) => o.id !== offer.id && o.status === 'pending' && o.buyerId !== offer.buyerId
    );

    // Vérifier si les autres offres concernent les mêmes sujets
    for (const otherOffer of otherPendingOffers) {
      // Vérifier si au moins un sujet est en commun
      const commonSubjects = otherOffer.subjectIds.filter((id) => offer.subjectIds.includes(id));
      if (commonSubjects.length > 0) {
        // Marquer l'offre comme expirée/invalide
        await this.offerRepo.updateStatus(otherOffer.id, 'expired');

        // Notifier l'acheteur que son offre n'est plus valable
        await this.notificationRepo.create({
          userId: otherOffer.buyerId,
          type: 'offer_expired',
          title: 'Sujet non disponible',
          message:
            "Un sujet pour lequel vous avez fait une offre a été acheté par un autre acheteur. Votre offre n'est plus valable.",
          relatedId: otherOffer.id,
          relatedType: 'offer',
        });
      }
    }

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
      throw new Error("Vous n'êtes pas autorisé à rejeter cette offre");
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

  /**
   * Retirer une offre (par l'acheteur)
   */
  async withdrawOffer(offerId: string, buyerId: string): Promise<void> {
    const offer = await this.offerRepo.findById(offerId);

    if (!offer) {
      throw new Error('Offre introuvable');
    }

    if (offer.buyerId !== buyerId) {
      throw new Error("Vous n'êtes pas autorisé à retirer cette offre");
    }

    if (offer.status !== 'pending') {
      throw new Error('Vous ne pouvez retirer que les offres en attente');
    }

    // Mettre à jour le statut de l'offre à 'withdrawn' pour indiquer qu'elle a été retirée par l'acheteur
    await this.offerRepo.updateStatus(offerId, 'withdrawn');

    // Notifier le producteur
    await this.notificationRepo.create({
      userId: offer.producerId,
      type: 'offer_withdrawn',
      title: 'Offre retirée',
      message: 'Un acheteur a retiré son offre',
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
      throw new Error("Vous n'êtes pas autorisé à confirmer cette livraison");
    }
    if (role === 'buyer' && transaction.buyerId !== userId) {
      throw new Error("Vous n'êtes pas autorisé à confirmer cette livraison");
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

      // Retirer les sujets du cheptel et mettre à jour leur statut
      const { AnimalRepository } = await import('../database/repositories');
      const animalRepo = new AnimalRepository();

      for (const subjectId of transaction.subjectIds) {
        try {
          // Utiliser animalRepo pour mettre à jour le statut de l'animal
          const animal = await animalRepo.findById(subjectId);
          if (animal) {
            // Mettre à jour le statut de l'animal via le repository
            await animalRepo.update(subjectId, {
              statut: 'vendu',
            });
          }
        } catch (error) {
          logger.warn(`Erreur mise à jour sujet ${subjectId} après vente:`, error);
        }
      }

      // Notifier les deux parties
      await this.notificationRepo.create({
        userId: transaction.producerId,
        type: 'delivery_confirmed',
        title: 'Livraison confirmée',
        message: "La transaction est terminée. N'oubliez pas de noter l'acheteur !",
        relatedId: transactionId,
        relatedType: 'transaction',
      });

      await this.notificationRepo.create({
        userId: transaction.buyerId,
        type: 'delivery_confirmed',
        title: 'Livraison confirmée',
        message: "La transaction est terminée. N'oubliez pas de noter le producteur !",
        relatedId: transactionId,
        relatedType: 'transaction',
      });
    } else {
      // Notifier l'autre partie qu'une confirmation est en attente
      const otherUserId = role === 'producer' ? transaction.buyerId : transaction.producerId;

      await this.notificationRepo.create({
        userId: otherUserId,
        type: 'delivery_confirmed',
        title: 'Confirmation de livraison',
        message: `${role === 'producer' ? 'Le producteur' : "L'acheteur"} a confirmé la livraison. Veuillez confirmer de votre côté.`,
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
      totalTransactions > 0 ? (completedTransactions.length / totalTransactions) * 100 : 0;

    // Calculer le temps de réponse moyen (en heures)
    let responseTime = 0;
    const offers = await this.offerRepo.findByProducerId(producerId);
    const offersWithResponse = offers.filter((o) => o.respondedAt && o.createdAt);
    if (offersWithResponse.length > 0) {
      const totalResponseTime = offersWithResponse.reduce((sum, offer) => {
        const created = new Date(offer.createdAt).getTime();
        const responded = new Date(offer.respondedAt!).getTime();
        return sum + (responded - created);
      }, 0);
      responseTime = Math.round(totalResponseTime / offersWithResponse.length / (1000 * 60 * 60)); // Convertir en heures
    }

    return {
      totalSales: completedTransactions.length,
      averageRating: Math.round(averageRating * 10) / 10, // Arrondir à 1 décimale
      totalRatings: ratings.length,
      responseTime,
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
    // Vérifier que le sujet existe et est actif
    const { AnimalRepository } = await import('../database/repositories');
    const animalRepo = new AnimalRepository();
    const animal = await animalRepo.findById(subjectId);

    if (!animal) {
      return { canList: false, reason: "Le sujet n'existe pas" };
    }

    if (animal.statut?.toLowerCase() !== 'actif') {
      return { canList: false, reason: 'Le sujet doit être actif pour être mis en vente' };
    }

    // Vérifier que le sujet n'est pas déjà en vente
    const existingListings = await this.listingRepo.findBySubjectId(subjectId);
    const activeListing = existingListings.find(
      (l) => l.status === 'available' || l.status === 'reserved'
    );
    if (activeListing) {
      return { canList: false, reason: 'Ce sujet est déjà en vente' };
    }

    // Vérifier qu'il y a une pesée récente (< 30 jours)
    const { PeseeRepository } = await import('../database/repositories');
      const peseeRepo = new PeseeRepository();
    const pesees = await peseeRepo.findByAnimal(subjectId);
    const dernierePesee = pesees.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];

    if (!dernierePesee) {
      return {
        canList: false,
        reason: 'Aucune pesée enregistrée. Une pesée récente est requise pour mettre en vente',
      };
    }

    const joursDepuisPesee =
      (new Date().getTime() - new Date(dernierePesee.date).getTime()) / (1000 * 60 * 60 * 24);
    if (joursDepuisPesee > 30) {
      return {
        canList: false,
        reason: 'La dernière pesée date de plus de 30 jours. Une pesée récente est requise',
      };
    }

    return { canList: true };
  }
}

/**
 * Instance singleton du service
 */
let marketplaceServiceInstance: MarketplaceService | null = null;

export function getMarketplaceService(): MarketplaceService {
  if (!marketplaceServiceInstance) {
    marketplaceServiceInstance = new MarketplaceService();
  }
  return marketplaceServiceInstance;
}
