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
        // Utiliser la méthode marketplace qui ne vérifie pas l'appartenance
        const animal = await animalRepo.findMarketplaceAnimal(data.subjectId);

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
      const animal = await animalRepo.findMarketplaceAnimal(data.subjectId);
      if (!animal) {
        throw new Error(`Animal ${data.subjectId} introuvable ou non accessible`);
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
    // ✅ Utiliser l'endpoint marketplace public qui ne vérifie pas l'appartenance
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

          // Pour les listings individuels, utiliser l'endpoint marketplace public
          if (!listing.subjectId) {
            return null; // Ignorer les listings sans subjectId ni batchId
          }

          // ✅ Utiliser l'endpoint marketplace public qui retourne toutes les données nécessaires
          // (y compris la dernière pesée) sans vérifier l'appartenance
          const listingWithSubjects = await this.getListingWithSubjects(listing.id);
          if (!listingWithSubjects || !listingWithSubjects.subjects || listingWithSubjects.subjects.length === 0) {
            // Si pas de sujets trouvés, utiliser les données de base du listing
            return {
              ...listing,
              type: 'subject' as const,
              code: listing.subjectId ? `#${listing.subjectId.slice(0, 8)}` : 'N/A',
              race: 'Non spécifiée',
              weight: listing.weight || 0,
              weightDate: listing.lastWeightDate,
              age: 0,
              totalPrice: listing.calculatedPrice,
              healthStatus: 'good' as const,
              vaccinations: false,
              available: listing.status === 'available',
            };
          }

          // Utiliser le premier sujet (pour listings individuels, il n'y en a qu'un)
          const subject = listingWithSubjects.subjects[0];
          
          // Calculer l'âge en mois si date_naissance disponible
          const ageEnMois = subject.date_naissance
            ? Math.floor(
                (new Date().getTime() - new Date(subject.date_naissance).getTime()) /
                  (1000 * 60 * 60 * 24 * 30)
              )
            : 0;

          // Utiliser la dernière pesée du sujet (déjà disponible dans les données publiques)
          const poidsActuel = subject.derniere_pesee?.poids_kg || subject.poids_initial || listing.weight || 0;
          const datePesee = subject.derniere_pesee?.date || listing.lastWeightDate;

          // Déterminer le statut de santé (simplifié - pas d'accès aux vaccinations pour les acheteurs)
          let healthStatus: 'good' | 'attention' | 'critical' = 'good';
          if (subject.statut === 'mort' || subject.statut === 'malade') {
            healthStatus = 'critical';
          }

          // Créer un objet enrichi qui peut être utilisé comme SubjectCard ou MarketplaceListing
          return {
            ...listing,
            type: 'subject' as const,
            // Propriétés pour SubjectCard
            code: subject.code || (subject.id ? `#${subject.id.slice(0, 8)}` : listing.subjectId || 'N/A'),
            race: subject.race || 'Non spécifiée',
            weight: poidsActuel,
            weightDate: datePesee,
            age: ageEnMois,
            totalPrice: listing.calculatedPrice,
            healthStatus,
            vaccinations: false, // Pas d'accès aux vaccinations pour les acheteurs (données privées)
            available: listing.status === 'available',
          };
        } catch (error) {
          logger.error(`Erreur lors de l'enrichissement du listing ${listing.id}:`, error);
          // En cas d'erreur, retourner le listing de base sans enrichissement
          return {
            ...listing,
            type: (listing.listingType === 'batch' ? 'batch' : 'subject') as const,
            code: listing.subjectId ? `#${listing.subjectId.slice(0, 8)}` : 'N/A',
            race: 'Non spécifiée',
            weight: listing.weight || 0,
            weightDate: listing.lastWeightDate,
            age: 0,
            totalPrice: listing.calculatedPrice,
            healthStatus: 'good' as const,
            vaccinations: false,
            available: listing.status === 'available',
          };
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
      
      // Vérifier que les classes sont bien définies avant de les instancier
      if (!repositories.UserRepository || 
          !repositories.ProjetRepository || 
          !repositories.MarketplaceRatingRepository || 
          !repositories.AnimalRepository) {
        logger.error('Certains repositories ne sont pas disponibles dans l\'import', {
          hasUserRepository: !!repositories.UserRepository,
          hasProjetRepository: !!repositories.ProjetRepository,
          hasMarketplaceRatingRepository: !!repositories.MarketplaceRatingRepository,
          hasAnimalRepository: !!repositories.AnimalRepository,
        });
        return [];
      }
      
      // Vérifier que les prototypes existent (évite "Cannot read property 'prototype' of undefined")
      if (!repositories.UserRepository.prototype || 
          !repositories.ProjetRepository.prototype || 
          !repositories.MarketplaceRatingRepository.prototype || 
          !repositories.AnimalRepository.prototype) {
        logger.error('Les prototypes des repositories ne sont pas disponibles', {
          hasUserRepoProto: !!repositories.UserRepository.prototype,
          hasProjetRepoProto: !!repositories.ProjetRepository.prototype,
          hasRatingRepoProto: !!repositories.MarketplaceRatingRepository.prototype,
          hasAnimalRepoProto: !!repositories.AnimalRepository.prototype,
        });
        return [];
      }
      
      // Instancier les repositories avec vérification individuelle
      try {
        userRepo = new repositories.UserRepository();
      } catch (error) {
        logger.error('Erreur instanciation UserRepository:', error);
        return [];
      }
      
      try {
        projetRepo = new repositories.ProjetRepository();
      } catch (error) {
        logger.error('Erreur instanciation ProjetRepository:', error);
        return [];
      }
      
      try {
        ratingRepo = new repositories.MarketplaceRatingRepository();
      } catch (error) {
        logger.error('Erreur instanciation MarketplaceRatingRepository:', error);
        return [];
      }
      
      try {
        animalRepo = new repositories.AnimalRepository();
      } catch (error) {
        logger.error('Erreur instanciation AnimalRepository:', error);
        return [];
      }
      
      // Vérifier que les instances sont bien créées
      if (!userRepo || !projetRepo || !ratingRepo || !animalRepo) {
        logger.error('Impossible de créer les instances des repositories');
        return [];
      }
    } catch (error) {
      logger.error('Erreur lors de l\'import des repositories dans groupListingsByFarm:', error);
      // Retourner un tableau vide si les repositories ne peuvent pas être chargés
      return [];
    }

    // ✅ OPTIMISATION: Paralléliser la création de toutes les FarmCards
    const farmCardsPromises = Array.from(farmGroups.entries()).map(async ([farmId, farmListings]) => {
      try {
        // ✅ Paralléliser les appels API pour projet et producteur
        const producerId = farmListings[0].producerId;
        const [projet, producer] = await Promise.all([
          projetRepo.findById(farmId),
          userRepo.findById(producerId),
        ]);
        
        if (!projet || !producer) return null;

        // Calculer les données agrégées
        // Filtrer les listings individuels (avec subjectId) et batch (avec batchId)
        const individualListings = farmListings.filter((l) => l.subjectId && (l.listingType === 'individual' || !l.listingType));
        const batchListings = farmListings.filter((l) => l.listingType === 'batch' && l.batchId);
        
        // Calculer le poids total et le nombre de sujets
        // Pour les listings individuels : utiliser le poids du listing
        // Pour les batch listings : utiliser weight * pigCount (poids moyen * nombre d'animaux)
        let totalWeight = 0;
        let totalSubjects = 0;
        
        // Poids et sujets des listings individuels
        for (const listing of individualListings) {
          totalWeight += listing.weight || 0;
          totalSubjects += 1; // Un listing = un sujet
        }
        
        // Poids et sujets des batch listings
        for (const listing of batchListings) {
          const averageWeight = listing.weight || 0;
          const pigCount = listing.pigCount || (listing.pigIds?.length || 0);
          const batchTotalWeight = averageWeight * pigCount;
          totalWeight += batchTotalWeight;
          totalSubjects += pigCount; // Nombre d'animaux dans la bande
        }
        
        const prices = farmListings.map((l) => l.pricePerKg);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        
        const races = new Set<string>();
        const photos: string[] = [];

        // ✅ OPTIMISATION: Paralléliser la récupération des animaux individuels
        const subjectIds = individualListings.map((l) => l.subjectId).filter((id): id is string => !!id);
        const animalPromises = subjectIds.slice(0, 4).map(async (subjectId) => {
          try {
            // ✅ Utiliser d'abord les données disponibles dans le listing (éviter les appels API inutiles)
            const listing = individualListings.find((l) => l.subjectId === subjectId);
            if (listing?.race && listing.race !== 'Non spécifiée') {
              races.add(listing.race);
            }
            
            // Seulement récupérer l'animal si on a besoin de la photo
            // ✅ Utiliser l'endpoint marketplace public qui ne vérifie pas l'appartenance
            const animal = await animalRepo.findMarketplaceAnimal(subjectId).catch(() => null);
            if (animal) {
              if (animal.race && animal.race !== 'Non spécifiée') races.add(animal.race);
              if (animal.photo_uri) photos.push(animal.photo_uri);
            }
          } catch (error) {
            logger.warn(`Erreur récupération animal ${subjectId}:`, error);
          }
        });
        await Promise.all(animalPromises);

        // ✅ OPTIMISATION: Utiliser les données disponibles dans les listings batch (éviter les appels API)
        // Pour les acheteurs, on ne peut pas accéder aux détails des batches (403), donc utiliser les données du listing
        for (const batchListing of batchListings.slice(0, 4)) {
          // Utiliser directement les données du listing (race, etc.) disponibles
          if (batchListing.race && batchListing.race !== 'Non spécifiée') {
            races.add(batchListing.race);
          }
        }
        
        // ✅ OPTIMISATION: Paralléliser les appels batch seulement si nécessaire (pour les producteurs)
        // Pour les acheteurs, on skip car cela génère des 403
        const batchPromises = batchListings.slice(0, 2).map(async (batchListing) => {
          if (!batchListing.batchId) return;
          try {
            const apiClient = (await import('./api/apiClient')).default;
            const batch = await apiClient.get<any>(`/batch-pigs/batch/${batchListing.batchId}`).catch(() => null);
            if (batch?.category) {
              races.add(batch.category);
            }
          } catch (error: any) {
            // Ignorer les erreurs 403 (normal pour les acheteurs)
            const status = error?.status || error?.statusCode;
            if (status !== 403 && status !== 404) {
              logger.warn(`Erreur récupération batch ${batchListing.batchId}:`, error);
            }
          }
        });
        await Promise.all(batchPromises);

        // ✅ OPTIMISATION: Paralléliser ratings et stats
        const [ratings, producerStatsResult] = await Promise.allSettled([
          ratingRepo.findByProducerId(producerId),
          this.getProducerStats(producerId).catch(() => ({
            totalSales: 0,
            averageRating: 0,
            totalRatings: 0,
            responseTime: 0,
            completionRate: 0,
          })),
        ]);
        
        const ratingsData = ratings.status === 'fulfilled' ? ratings.value : [];
        const avgRating =
          ratingsData.length > 0 ? ratingsData.reduce((sum, r) => sum + (r.overall || 0), 0) / ratingsData.length : 0;
        
        const producerStats = producerStatsResult.status === 'fulfilled' 
          ? producerStatsResult.value 
          : {
              totalSales: 0,
              averageRating: 0,
              totalRatings: 0,
              responseTime: 0,
              completionRate: 0,
            };

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
            totalRatings: ratingsData.length,
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
            totalReviews: ratingsData.length,
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

        return farmCard;
      } catch (error) {
        logger.error(`Erreur lors de la création de la FarmCard pour ${farmId}:`, error);
        return null;
      }
    });
    
    // ✅ Attendre toutes les FarmCards en parallèle et filtrer les null
    const farmCardsResults = await Promise.all(farmCardsPromises);
    const farmCards = farmCardsResults.filter((card): card is FarmCard => card !== null);

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
   * Récupérer un listing avec ses sujets (détails complets)
   * Utilise l'endpoint marketplace qui ne vérifie pas l'appartenance
   */
  async getListingWithSubjects(listingId: string): Promise<{
    listing: MarketplaceListing;
    subjects: Array<{
      id: string;
      code: string;
      nom?: string;
      race?: string;
      sexe?: string;
      date_naissance?: string;
      poids_initial?: number;
      categorie_poids?: string;
      statut?: string;
      photo_uri?: string;
      derniere_pesee?: { poids_kg: number; date: string };
    }>;
  } | null> {
    try {
      const apiClient = (await import('../services/api/apiClient')).default;
      const response = await apiClient.get(`/marketplace/listings/${listingId}/subjects`);
      return response;
    } catch (error) {
      logger.error('[MarketplaceService] Erreur chargement sujets listing:', error);
      return null;
    }
  }

  /**
   * Récupérer plusieurs listings avec leurs sujets en une seule requête
   */
  async getMultipleListingsWithSubjects(listingIds: string[]): Promise<Array<{
    listing: MarketplaceListing;
    subjects: Array<{
      id: string;
      code: string;
      nom?: string;
      race?: string;
      sexe?: string;
      date_naissance?: string;
      poids_initial?: number;
      categorie_poids?: string;
      statut?: string;
      photo_uri?: string;
      derniere_pesee?: { poids_kg: number; date: string };
    }>;
  }>> {
    try {
      // ✅ Log de diagnostic : voir quels IDs sont envoyés
      logger.info('[MarketplaceService] getMultipleListingsWithSubjects appelé avec:', {
        listingIdsCount: listingIds.length,
        listingIds: listingIds,
      });

      const apiClient = (await import('../services/api/apiClient')).default;
      const response = await apiClient.post('/marketplace/listings/details', {
        listingIds,
      });

      // ✅ Log de diagnostic : voir ce qui est retourné
      logger.info('[MarketplaceService] getMultipleListingsWithSubjects réponse:', {
        responseCount: response?.length || 0,
        response: response?.map((r: any) => ({
          listingId: r.listing?.id,
          listingType: r.listing?.listingType,
          subjectsCount: r.subjects?.length || 0,
        })) || [],
      });

      return response || [];
    } catch (error) {
      // ✅ Log détaillé de l'erreur
      const errorDetails = error instanceof Error 
        ? { message: error.message, stack: error.stack?.substring(0, 500) }
        : { error: String(error) };
      
      logger.error('[MarketplaceService] Erreur chargement listings:', {
        ...errorDetails,
        listingIdsCount: listingIds.length,
        listingIds: listingIds,
      });
      
      return [];
    }
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
    dateRecuperationSouhaitee?: string;
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
      dateRecuperationSouhaitee: data.dateRecuperationSouhaitee,
      termsAccepted: true, // Doit être accepté avant création
      termsAcceptedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    // NOTE: Le backend gère automatiquement:
    // - L'incrémentation du compteur 'inquiries' 
    // - L'envoi de la notification au producteur

    return offer;
  }

  // ========================================
  // RÉCUPÉRATION DES OFFRES
  // ========================================

  /**
   * Récupérer mes offres envoyées (acheteur)
   */
  async getMyOffers(): Promise<any[]> {
    try {
      logger.info('[marketplace] Récupération de mes offres...');
      const apiClient = (await import('./api/apiClient')).default;
      // NOTE: apiClient.get retourne directement les données (pas { data: ... })
      const offers = await apiClient.get<any[]>('/marketplace/my-offers');
      logger.info('[marketplace] Offres reçues:', offers?.length || 0, 'offres');

      // Log détaillé de la première offre pour debug
      if (offers && offers.length > 0) {
        logger.info('[marketplace] Première offre:', {
          id: offers[0].id,
          offeredAmount: offers[0].offeredAmount,
          proposedPrice: offers[0].proposedPrice,
          pig_count: offers[0].pig_count,
          createdAt: offers[0].createdAt,
          status: offers[0].status,
          seller_nom: offers[0].seller_nom,
        });
      }

      return offers || [];
    } catch (error) {
      logger.error('[marketplace] Erreur récupération mes offres:', error);
      throw error;
    }
  }

  /**
   * Récupérer les offres reçues (vendeur)
   */
  async getReceivedOffers(): Promise<any[]> {
    try {
      const apiClient = (await import('./api/apiClient')).default;
      // NOTE: apiClient.get retourne directement les données (pas { data: ... })
      const offers = await apiClient.get<any[]>('/marketplace/my-received-offers');
      return offers || [];
    } catch (error) {
      logger.error('[marketplace] Erreur récupération offres reçues:', error);
      throw error;
    }
  }

  /**
   * Retirer/annuler une offre (acheteur)
   */
  async withdrawOffer(offerId: string): Promise<any> {
    try {
      logger.info('[marketplace] Retrait offre:', offerId);
      const apiClient = (await import('./api/apiClient')).default;
      // NOTE: apiClient.delete retourne directement les données (pas { data: ... })
      const result = await apiClient.delete(`/marketplace/offers/${offerId}`);
      logger.info('[marketplace] Offre retirée avec succès:', result);
      return result;
    } catch (error) {
      logger.error('[marketplace] Erreur retrait offre:', error);
      throw error;
    }
  }

  // ========================================
  // PHOTOS DES LISTINGS
  // ========================================

  /**
   * Uploader une photo pour un listing
   */
  async uploadListingPhoto(
    listingId: string,
    photoUri: string,
    caption?: string
  ): Promise<any> {
    try {
      const apiClient = (await import('./api/apiClient')).default;
      const formData = new FormData();
      
      // Créer l'objet fichier depuis l'URI
      const filename = photoUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('photo', {
        uri: photoUri,
        name: filename,
        type,
      } as any);

      if (caption) {
        formData.append('caption', caption);
      }

      const response = await apiClient.post(
        `/marketplace/listings/${listingId}/photos`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('[marketplace] Erreur upload photo:', error);
      throw error;
    }
  }

  /**
   * Uploader plusieurs photos pour un listing
   */
  async uploadMultiplePhotos(
    listingId: string,
    photoUris: string[]
  ): Promise<any> {
    try {
      const apiClient = (await import('./api/apiClient')).default;
      const formData = new FormData();

      photoUris.forEach((uri, index) => {
        const filename = uri.split('/').pop() || `photo${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('photos', {
          uri,
          name: filename,
          type,
        } as any);
      });

      const response = await apiClient.post(
        `/marketplace/listings/${listingId}/photos/bulk`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('[marketplace] Erreur upload photos multiples:', error);
      throw error;
    }
  }

  /**
   * Supprimer une photo d'un listing
   */
  async deleteListingPhoto(listingId: string, photoIndex: number): Promise<any> {
    try {
      const apiClient = (await import('./api/apiClient')).default;
      const response = await apiClient.delete(
        `/marketplace/listings/${listingId}/photos/${photoIndex}`
      );
      return response.data;
    } catch (error) {
      logger.error('[marketplace] Erreur suppression photo:', error);
      throw error;
    }
  }

  /**
   * Créer une contre-proposition (producteur propose un nouveau prix)
   * NOTE: Le backend gère les notifications automatiquement
   */
  async counterOffer(
    offerId: string,
    _producerId: string, // Non utilisé - vérification faite côté backend
    nouveauPrixTotal: number,
    message?: string
  ): Promise<Offer> {
    try {
      // Appeler l'API backend (PATCH, pas PUT)
      const apiClient = (await import('./api/apiClient')).default;
      const result = await apiClient.patch<Offer>(`/marketplace/offers/${offerId}/counter`, {
        nouveau_prix_total: nouveauPrixTotal,
        message: message || undefined,
      });
      
      logger.info('[marketplace] Contre-proposition créée:', offerId);
      return result;
    } catch (error) {
      logger.error('[marketplace] Erreur contre-proposition:', error);
      throw error;
    }
  }

  /**
   * Accepter une offre (producteur ou acheteur pour contre-proposition)
   * NOTE: Le backend gère tout automatiquement (transaction, notifications, expiration autres offres)
   */
  async acceptOffer(
    offerId: string,
    _userId: string, // Non utilisé - vérification faite côté backend
    role: 'producer' | 'buyer' = 'producer'
  ): Promise<Transaction> {
    try {
      // Appeler l'API backend avec le rôle - Le backend gère:
      // - Création de la transaction
      // - Mise à jour du statut du listing
      // - Notifications (acheteur + autres acheteurs)
      // - Expiration des autres offres
      const apiClient = (await import('./api/apiClient')).default;
      const transaction = await apiClient.patch<Transaction>(
        `/marketplace/offers/${offerId}/accept?role=${role}`,
        {}
      );

      logger.info('[marketplace] Offre acceptée:', offerId);
      return transaction;
    } catch (error) {
      logger.error('[marketplace] Erreur acceptation offre:', error);
      throw error;
    }
  }

  /**
   * Rejeter une offre
   * NOTE: Le backend gère les notifications automatiquement
   */
  async rejectOffer(offerId: string, _producerId: string): Promise<void> {
    try {
      // Appeler l'API backend (PATCH /offers/:id/reject)
      const apiClient = (await import('./api/apiClient')).default;
      await apiClient.patch(`/marketplace/offers/${offerId}/reject`, {});

      logger.info('[marketplace] Offre rejetée:', offerId);
    } catch (error) {
      logger.error('[marketplace] Erreur rejet offre:', error);
      throw error;
    }
  }

  // ========================================
  // TRANSACTIONS - Gestion des ventes
  // ========================================

  /**
   * Confirmer la livraison (producteur ou acheteur)
   * NOTE: Le backend gère automatiquement (via saleAutomationService) :
   * - La mise à jour du statut du listing
   * - La mise à jour du statut des animaux
   * - Les notifications de vente complétée
   * Le frontend gère seulement les notifications intermédiaires
   */
  async confirmDelivery(
    transactionId: string,
    _userId: string, // Non utilisé - vérification faite côté backend
    role: 'producer' | 'buyer'
  ): Promise<void> {
    try {
      // Récupérer la transaction avant confirmation pour les notifications intermédiaires
      const transaction = await this.transactionRepo.findById(transactionId);
      
      if (!transaction) {
        throw new Error('Transaction introuvable');
      }

      // Appeler l'API backend - Le backend gère :
      // - La mise à jour des delivery_details
      // - Le changement de statut (delivered -> completed)
      // - L'appel à saleAutomationService si les deux ont confirmé
      await this.transactionRepo.confirmDelivery(transactionId, role);

      // Récupérer la transaction mise à jour pour savoir si on doit envoyer une notification intermédiaire
      const updatedTransaction = await this.transactionRepo.findById(transactionId);

      // Si UNE SEULE partie a confirmé (pas les deux), envoyer une notification intermédiaire
      // Note: Si les deux ont confirmé, le backend envoie les notifications via saleAutomationService
      const bothConfirmed =
        updatedTransaction?.deliveryDetails?.producerConfirmed &&
        updatedTransaction?.deliveryDetails?.buyerConfirmed;

      if (!bothConfirmed) {
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

      logger.info('[marketplace] Livraison confirmée:', { transactionId, role, bothConfirmed });
    } catch (error) {
      logger.error('[marketplace] Erreur confirmation livraison:', error);
      throw error;
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

    // Compter le nombre total de notations
    const ratings = await this.ratingRepo.findByProducerId(producerId);

    // Calculer la note moyenne (fallback si l'endpoint n'existe pas)
    let averageRating = 0;
    try {
      averageRating = await this.ratingRepo.getAverageRating(producerId);
    } catch (error: any) {
      // Si l'endpoint /ratings/average n'existe pas (404), calculer manuellement
      const status = error?.status || error?.statusCode;
      if (status === 404) {
        // Calculer depuis les ratings récupérés
        if (ratings.length > 0) {
          averageRating = ratings.reduce((sum, r) => sum + (r.overall || 0), 0) / ratings.length;
        }
        // Ne pas logger les erreurs 404 car l'endpoint n'est pas encore implémenté
      } else {
        logger.warn(`Erreur récupération note moyenne pour producteur ${producerId}:`, error);
        // Fallback: calculer depuis les ratings récupérés
        if (ratings.length > 0) {
          averageRating = ratings.reduce((sum, r) => sum + (r.overall || 0), 0) / ratings.length;
        }
      }
    }

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
const marketplaceServiceInstance = new MarketplaceService();

/**
 * Export par défaut de l'instance singleton
 */
export default marketplaceServiceInstance;

/**
 * Export nommé aussi disponible
 */
export { marketplaceServiceInstance as marketplaceService };
