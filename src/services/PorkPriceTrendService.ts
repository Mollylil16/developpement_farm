/**
 * Service pour calculer et gérer les tendances de prix hebdomadaires du porc poids vif
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from './database';
import {
  WeeklyPorkPriceTrendRepository,
  type WeeklyPorkPriceTrend,
  type CreateWeeklyPorkPriceTrendInput,
} from '../database/repositories/WeeklyPorkPriceTrendRepository';
import {
  MarketplaceTransactionRepository,
  MarketplaceOfferRepository,
} from '../database/repositories/MarketplaceRepositories';
import { MarketplaceListingRepository } from '../database/repositories/MarketplaceListingRepository';
import { AnimalRepository } from '../database/repositories/AnimalRepository';
import { PeseeRepository } from '../database/repositories/PeseeRepository';
import type { Transaction, Offer, MarketplaceListing } from '../types/marketplace';
import { getRegionalPriceService } from './RegionalPriceService';

/**
 * Prix moyen régional par défaut (FCFA/kg)
 * Utilisé comme fallback si le service de prix régional n'est pas disponible
 */
const DEFAULT_REGIONAL_PRICE = 2300; // FCFA/kg

/**
 * Calcule le numéro de semaine ISO (1-53)
 * Semaine = du lundi au dimanche
 */
function getWeekNumber(date: Date): { year: number; weekNumber: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), weekNumber };
}

/**
 * Obtient le lundi de la semaine pour une date donnée
 */
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour lundi
  return new Date(d.setDate(diff));
}

/**
 * Vérifie si une date est dans une semaine donnée
 */
function isDateInWeek(date: Date, year: number, weekNumber: number): boolean {
  const { year: dateYear, weekNumber: dateWeek } = getWeekNumber(date);
  return dateYear === year && dateWeek === weekNumber;
}

export class PorkPriceTrendService {
  private db: SQLiteDatabase;
  private trendRepo: WeeklyPorkPriceTrendRepository;
  private transactionRepo: MarketplaceTransactionRepository;
  private offerRepo: MarketplaceOfferRepository;
  private listingRepo: MarketplaceListingRepository;
  private animalRepo: AnimalRepository;
  private peseeRepo: PeseeRepository;

  constructor(db: SQLiteDatabase) {
    this.db = db;
    this.trendRepo = new WeeklyPorkPriceTrendRepository(db);
    this.transactionRepo = new MarketplaceTransactionRepository(db);
    this.offerRepo = new MarketplaceOfferRepository(db);
    this.listingRepo = new MarketplaceListingRepository(db);
    this.animalRepo = new AnimalRepository(db);
    this.peseeRepo = new PeseeRepository(db);
  }

  /**
   * Calcule le prix moyen pondéré par semaine
   * Priorité: Transactions complétées > Offres acceptées > Listings actifs > Prix régional
   */
  async calculateWeeklyTrend(year: number, weekNumber: number): Promise<WeeklyPorkPriceTrend> {
    // 1. Transactions complétées (source la plus fiable)
    const transactions = await this.getCompletedTransactionsForWeek(year, weekNumber);
    let avgPricePlatform: number | undefined;
    let totalWeight = 0;
    let totalPrice = 0;
    let transactionsCount = 0;

    if (transactions.length > 0) {
      for (const transaction of transactions) {
        const listing = await this.listingRepo.findById(transaction.listingId);
        if (listing) {
          // Calculer le poids total des sujets de la transaction
          const weight = await this.calculateTotalWeightForSubjects(transaction.subjectIds);
          if (weight > 0) {
            const pricePerKg = transaction.finalPrice / weight;
            totalWeight += weight;
            totalPrice += transaction.finalPrice;
            transactionsCount++;
          }
        }
      }

      if (totalWeight > 0) {
        avgPricePlatform = totalPrice / totalWeight;
      }
    }

    // 2. Offres acceptées (si pas assez de transactions)
    let offersCount = 0;
    if (!avgPricePlatform || transactionsCount < 3) {
      const acceptedOffers = await this.getAcceptedOffersForWeek(year, weekNumber);
      offersCount = acceptedOffers.length;

      if (acceptedOffers.length > 0) {
        let offersTotalWeight = 0;
        let offersTotalPrice = 0;

        for (const offer of acceptedOffers) {
          const listing = await this.listingRepo.findById(offer.listingId);
          if (listing) {
            const weight = await this.calculateTotalWeightForSubjects(offer.subjectIds);
            if (weight > 0) {
              const pricePerKg = offer.proposedPrice / weight;
              offersTotalWeight += weight;
              offersTotalPrice += offer.proposedPrice;
            }
          }
        }

        if (offersTotalWeight > 0) {
          const offersAvgPrice = offersTotalPrice / offersTotalWeight;
          // Combiner avec les transactions si disponibles
          if (avgPricePlatform && totalWeight > 0) {
            const combinedWeight = totalWeight + offersTotalWeight;
            const combinedPrice = totalPrice + offersTotalPrice;
            avgPricePlatform = combinedPrice / combinedWeight;
            totalWeight = combinedWeight;
            totalPrice = combinedPrice;
          } else {
            avgPricePlatform = offersAvgPrice;
            totalWeight = offersTotalWeight;
            totalPrice = offersTotalPrice;
          }
        }
      }
    }

    // 3. Listings actifs (si toujours pas assez de données)
    let listingsCount = 0;
    if (!avgPricePlatform || (transactionsCount + offersCount) < 5) {
      const activeListings = await this.getActiveListingsForWeek(year, weekNumber);
      listingsCount = activeListings.length;

      if (activeListings.length > 0) {
        let listingsTotalWeight = 0;
        let listingsTotalPrice = 0;

        for (const listing of activeListings) {
          if (listing.weight && listing.weight > 0) {
            listingsTotalWeight += listing.weight;
            listingsTotalPrice += listing.pricePerKg * listing.weight;
          }
        }

        if (listingsTotalWeight > 0) {
          const listingsAvgPrice = listingsTotalPrice / listingsTotalWeight;
          // Combiner avec les données existantes
          if (avgPricePlatform && totalWeight > 0) {
            const combinedWeight = totalWeight + listingsTotalWeight;
            const combinedPrice = totalPrice + listingsTotalPrice;
            avgPricePlatform = combinedPrice / combinedWeight;
            totalWeight = combinedWeight;
            totalPrice = combinedPrice;
          } else {
            avgPricePlatform = listingsAvgPrice;
            totalWeight = listingsTotalWeight;
            totalPrice = listingsTotalPrice;
          }
        }
      }
    }

    // 4. Prix régional (fallback)
    // Récupérer le prix régional depuis le service (qui peut utiliser une API)
    let avgPriceRegional: number;
    try {
      const regionalPriceService = getRegionalPriceService(this.db);
      avgPriceRegional = await regionalPriceService.getCurrentRegionalPrice();
    } catch (error) {
      console.warn('⚠️ [PorkPriceTrendService] Erreur lors de la récupération du prix régional, utilisation du prix par défaut:', error);
      avgPriceRegional = DEFAULT_REGIONAL_PRICE;
    }

    let sourcePriority: 'platform' | 'offers' | 'listings' | 'regional' = 'platform';
    if (!avgPricePlatform) {
      avgPricePlatform = avgPriceRegional;
      sourcePriority = 'regional';
    } else if (transactionsCount === 0 && offersCount === 0 && listingsCount > 0) {
      sourcePriority = 'listings';
    } else if (transactionsCount === 0 && offersCount > 0) {
      sourcePriority = 'offers';
    }

    // Créer ou mettre à jour la tendance
    const trendData: CreateWeeklyPorkPriceTrendInput = {
      year,
      weekNumber,
      avgPricePlatform: Math.round(avgPricePlatform),
      avgPriceRegional,
      transactionsCount,
      offersCount,
      listingsCount,
      sourcePriority,
      totalWeightKg: totalWeight > 0 ? Math.round(totalWeight * 100) / 100 : undefined,
      totalPriceFcfa: totalPrice > 0 ? Math.round(totalPrice) : undefined,
    };

    return this.trendRepo.upsert(trendData);
  }

  /**
   * Calcule les tendances pour les 26 dernières semaines + semaine en cours
   */
  async calculateLast26Weeks(): Promise<WeeklyPorkPriceTrend[]> {
    const now = new Date();
    const { year: currentYear, weekNumber: currentWeek } = getWeekNumber(now);
    const trends: WeeklyPorkPriceTrend[] = [];

    // Calculer pour les 26 dernières semaines
    for (let i = 0; i < 26; i++) {
      let year = currentYear;
      let week = currentWeek - i;

      // Gérer le passage d'année
      while (week < 1) {
        year--;
        week += 52; // Approximation (peut être 52 ou 53 selon l'année)
      }

      try {
        const trend = await this.calculateWeeklyTrend(year, week);
        trends.push(trend);
      } catch (error) {
        console.warn(`Erreur lors du calcul de la tendance pour S${week}/${year}:`, error);
      }
    }

    // Calculer pour la semaine en cours
    try {
      const currentTrend = await this.calculateWeeklyTrend(currentYear, currentWeek);
      trends.push(currentTrend);
    } catch (error) {
      console.warn(`Erreur lors du calcul de la tendance pour la semaine en cours:`, error);
    }

    return trends.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.weekNumber - b.weekNumber;
    });
  }

  /**
   * Récupère les transactions complétées pour une semaine donnée
   */
  private async getCompletedTransactionsForWeek(
    year: number,
    weekNumber: number
  ): Promise<Transaction[]> {
    // Récupérer toutes les transactions avec status 'completed'
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM marketplace_transactions WHERE status = 'completed' AND completed_at IS NOT NULL`
    );
    
    const allTransactions: Transaction[] = rows.map((row) => ({
      id: row.id,
      offerId: row.offer_id,
      listingId: row.listing_id,
      subjectIds: JSON.parse(row.subject_ids || '[]'),
      buyerId: row.buyer_id,
      producerId: row.producer_id,
      finalPrice: row.final_price,
      status: row.status as Transaction['status'],
      deliveryDetails: row.delivery_scheduled_date ? {
        scheduledDate: row.delivery_scheduled_date,
        location: row.delivery_location,
        transportInfo: row.delivery_transport_info,
        producerConfirmed: Boolean(row.delivery_producer_confirmed),
        producerConfirmedAt: row.delivery_producer_confirmed_at,
        buyerConfirmed: Boolean(row.delivery_buyer_confirmed),
        buyerConfirmedAt: row.delivery_buyer_confirmed_at,
        deliveryProof: row.delivery_proof_photos ? JSON.parse(row.delivery_proof_photos) : [],
      } : undefined,
      documents: {
        healthCertificate: row.doc_health_certificate,
        deliveryNote: row.doc_delivery_note,
        invoice: row.doc_invoice,
      },
      createdAt: row.created_at,
      completedAt: row.completed_at,
      cancelledAt: row.cancelled_at,
      cancellationReason: row.cancellation_reason,
    }));
    
    return allTransactions.filter((t) => {
      if (!t.completedAt) return false;
      const completedDate = new Date(t.completedAt);
      return isDateInWeek(completedDate, year, weekNumber);
    });
  }

  /**
   * Récupère les offres acceptées pour une semaine donnée
   */
  private async getAcceptedOffersForWeek(year: number, weekNumber: number): Promise<Offer[]> {
    // Récupérer toutes les offres avec status 'accepted'
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM marketplace_offers WHERE status = 'accepted' AND responded_at IS NOT NULL`
    );
    
    const allOffers: Offer[] = rows.map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      subjectIds: JSON.parse(row.subject_ids || '[]'),
      buyerId: row.buyer_id,
      producerId: row.producer_id,
      proposedPrice: row.proposed_price,
      originalPrice: row.original_price,
      message: row.message,
      status: row.status as Offer['status'],
      termsAccepted: Boolean(row.terms_accepted),
      termsAcceptedAt: row.terms_accepted_at,
      createdAt: row.created_at,
      respondedAt: row.responded_at,
      expiresAt: row.expires_at,
    }));
    
    return allOffers.filter((o) => {
      if (!o.respondedAt) return false;
      const respondedDate = new Date(o.respondedAt);
      return isDateInWeek(respondedDate, year, weekNumber);
    });
  }

  /**
   * Récupère les listings actifs pour une semaine donnée
   */
  private async getActiveListingsForWeek(
    year: number,
    weekNumber: number
  ): Promise<MarketplaceListing[]> {
    const allListings = await this.listingRepo.findAll();
    return allListings.filter((l) => {
      if (l.status !== 'available') return false;
      const listedDate = new Date(l.listedAt);
      return isDateInWeek(listedDate, year, weekNumber);
    });
  }

  /**
   * Calcule le poids total pour une liste de sujets
   */
  private async calculateTotalWeightForSubjects(subjectIds: string[]): Promise<number> {
    let totalWeight = 0;

    for (const subjectId of subjectIds) {
      // Récupérer la dernière pesée de l'animal
      const lastPesee = await this.peseeRepo.findLastByAnimal(subjectId);
      if (lastPesee) {
        totalWeight += lastPesee.poids_kg;
      } else {
        // Fallback: utiliser le poids initial de l'animal
        const animal = await this.animalRepo.findById(subjectId);
        if (animal && animal.poids_initial) {
          totalWeight += animal.poids_initial;
        }
      }
    }

    return totalWeight;
  }

  /**
   * Récupère les tendances des 26 dernières semaines + semaine en cours
   */
  async getLast26WeeksTrends(): Promise<WeeklyPorkPriceTrend[]> {
    return this.trendRepo.findLastWeeks(27); // 26 + semaine en cours
  }
}

/**
 * Instance singleton du service
 */
let porkPriceTrendServiceInstance: PorkPriceTrendService | null = null;

export function getPorkPriceTrendService(db?: SQLiteDatabase): PorkPriceTrendService {
  if (!porkPriceTrendServiceInstance) {
    if (!db) {
      throw new Error('Database instance required for first call');
    }
    porkPriceTrendServiceInstance = new PorkPriceTrendService(db);
  }
  return porkPriceTrendServiceInstance;
}

