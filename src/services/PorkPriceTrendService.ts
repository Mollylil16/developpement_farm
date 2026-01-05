/**
 * Service pour calculer et gérer les tendances de prix hebdomadaires du porc poids vif
 */

import {
  WeeklyPorkPriceTrendRepository,
  type WeeklyPorkPriceTrend,
  type CreateWeeklyPorkPriceTrendInput,
} from '../database/repositories/WeeklyPorkPriceTrendRepository';
import type { Transaction, Offer, MarketplaceListing } from '../types/marketplace';
import { getRegionalPriceService } from './RegionalPriceService';
import apiClient, { APIError } from './api/apiClient';
import { logger } from '../utils/logger';

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
  private trendRepo: WeeklyPorkPriceTrendRepository;

  constructor() {
    this.trendRepo = new WeeklyPorkPriceTrendRepository();
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
        const listing = await apiClient.get<any>(`/marketplace/listings/${transaction.listingId}`);
        if (listing) {
          // Calculer le poids total des sujets de la transaction
          const weight = await this.calculateTotalWeightForSubjects(transaction.subjectIds);
          if (weight > 0) {
            const pricePerKg = transaction.finalPrice / weight;
            // Utiliser pricePerKg pour valider que le prix est raisonnable (entre 1000 et 10000 FCFA/kg)
            if (pricePerKg < 1000 || pricePerKg > 10000) {
              logger.warn(
                `[PorkPriceTrendService] Prix par kg suspect pour transaction ${transaction.id}: ${pricePerKg.toFixed(0)} FCFA/kg`
              );
            }
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
          const listing = await apiClient.get<any>(`/marketplace/listings/${offer.listingId}`);
          if (listing) {
            const weight = await this.calculateTotalWeightForSubjects(offer.subjectIds);
            if (weight > 0) {
              const pricePerKg = offer.proposedPrice / weight;
              // Utiliser pricePerKg pour valider que le prix est raisonnable
              if (pricePerKg < 1000 || pricePerKg > 10000) {
                logger.warn(
                  `[PorkPriceTrendService] Prix par kg suspect pour offre ${offer.id}: ${pricePerKg.toFixed(0)} FCFA/kg`
                );
              }
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
    if (!avgPricePlatform || transactionsCount + offersCount < 5) {
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
      // Le service de prix régional n'a plus besoin de db, il utilise l'API
      const regionalPriceService = getRegionalPriceService();
      avgPriceRegional = await regionalPriceService.getCurrentRegionalPrice();
    } catch (error) {
      logger.warn(
        '[PorkPriceTrendService] Erreur lors de la récupération du prix régional, utilisation du prix par défaut:',
        error
      );
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

    // Sauvegarder la tendance via l'API backend
    try {
      return await apiClient.post<any>('/marketplace/price-trends', trendData);
    } catch (error: unknown) {
      // Si l'endpoint n'existe pas encore (404), logger en debug seulement
      if (error instanceof APIError && error.status === 404) {
        logger.debug('[PorkPriceTrendService] Endpoint /marketplace/price-trends non disponible (404), création locale ignorée');
        // Retourner un objet mock pour éviter les erreurs en aval
        return {
          id: `${year}-${weekNumber}`,
          year,
          weekNumber,
          ...trendData,
          updatedAt: new Date().toISOString(),
        } as WeeklyPorkPriceTrend;
      }
      // Pour les autres erreurs, essayer le repository
      try {
        return await this.trendRepo.upsert(trendData);
      } catch {
        // Si le repository échoue aussi, retourner un objet mock
        logger.warn('[PorkPriceTrendService] Impossible de sauvegarder la tendance');
        return {
          id: `${year}-${weekNumber}`,
          year,
          weekNumber,
          ...trendData,
          updatedAt: new Date().toISOString(),
        } as WeeklyPorkPriceTrend;
      }
    }
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
        logger.warn(`Erreur lors du calcul de la tendance pour S${week}/${year}:`, error);
      }
    }

    // Calculer pour la semaine en cours
    try {
      const currentTrend = await this.calculateWeeklyTrend(currentYear, currentWeek);
      trends.push(currentTrend);
    } catch (error) {
      logger.warn(`Erreur lors du calcul de la tendance pour la semaine en cours:`, error);
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
    // Récupérer toutes les transactions complétées depuis l'API backend
    const transactionsData = await apiClient.get<any[]>(`/marketplace/transactions`, {
      params: { status: 'completed' },
    });
    const rows = transactionsData.filter((t) => t.completed_at != null);

    // Les transactions sont déjà dans le bon format depuis l'API
    const allTransactions: Transaction[] = rows.map((row) => ({
      id: row.id,
      offerId: row.offer_id,
      listingId: row.listing_id,
      subjectIds: Array.isArray(row.subject_ids) ? row.subject_ids : JSON.parse(row.subject_ids || '[]'),
      buyerId: row.buyer_id,
      producerId: row.producer_id,
      finalPrice: row.final_price,
      status: row.status as Transaction['status'],
      deliveryDetails: row.delivery_scheduled_date
        ? {
            scheduledDate: row.delivery_scheduled_date,
            location: row.delivery_location,
            transportInfo: row.delivery_transport_info,
            producerConfirmed: Boolean(row.delivery_producer_confirmed),
            producerConfirmedAt: row.delivery_producer_confirmed_at,
            buyerConfirmed: Boolean(row.delivery_buyer_confirmed),
            buyerConfirmedAt: row.delivery_buyer_confirmed_at,
            deliveryProof: Array.isArray(row.delivery_proof_photos) 
              ? row.delivery_proof_photos 
              : (row.delivery_proof_photos ? JSON.parse(row.delivery_proof_photos) : []),
          }
        : undefined,
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
      // Utiliser getMondayOfWeek pour normaliser la date au début de la semaine
      const weekStart = getMondayOfWeek(completedDate);
      return isDateInWeek(weekStart, year, weekNumber);
    });
  }

  /**
   * Récupère les offres acceptées pour une semaine donnée
   */
  private async getAcceptedOffersForWeek(year: number, weekNumber: number): Promise<Offer[]> {
    // Récupérer toutes les offres acceptées depuis l'API backend
    const offersData = await apiClient.get<any[]>(`/marketplace/offers`, {
      params: { status: 'accepted' },
    });
    const rows = offersData.filter((o) => o.responded_at != null);

    const allOffers: Offer[] = rows.map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      subjectIds: Array.isArray(row.subject_ids) ? row.subject_ids : JSON.parse(row.subject_ids || '[]'),
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
      // Utiliser getMondayOfWeek pour normaliser la date au début de la semaine
      const weekStart = getMondayOfWeek(respondedDate);
      return isDateInWeek(weekStart, year, weekNumber);
    });
  }

  /**
   * Récupère les listings actifs pour une semaine donnée
   */
  private async getActiveListingsForWeek(
    year: number,
    weekNumber: number
  ): Promise<MarketplaceListing[]> {
    const allListings = await apiClient.get<any[]>('/marketplace/listings');
    return allListings.filter((l) => {
      if (l.status !== 'available') return false;
      const listedDate = new Date(l.listedAt);
      // Utiliser getMondayOfWeek pour normaliser la date au début de la semaine
      const weekStart = getMondayOfWeek(listedDate);
      return isDateInWeek(weekStart, year, weekNumber);
    });
  }

  /**
   * Calcule le poids total pour une liste de sujets
   */
  private async calculateTotalWeightForSubjects(subjectIds: string[]): Promise<number> {
    let totalWeight = 0;

    for (const subjectId of subjectIds) {
      // Récupérer la dernière pesée de l'animal
      const pesees = await apiClient.get<any[]>(`/production/pesees`, {
        params: { animal_id: subjectId, limit: 1 },
      });
      const lastPesee = pesees && pesees.length > 0 ? pesees[0] : null;
      if (lastPesee) {
        totalWeight += lastPesee.poids_kg;
      } else {
        // Fallback: utiliser le poids initial de l'animal
        const animal = await apiClient.get<any>(`/production/animaux/${subjectId}`);
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
    // Récupérer les tendances depuis l'API backend
    try {
      return await apiClient.get<any[]>('/marketplace/price-trends', {
        params: { weeks: 27 },
      });
    } catch (error: unknown) {
      // Si l'endpoint n'existe pas encore (404), retourner un tableau vide silencieusement
      // L'erreur est attendue tant que l'endpoint backend n'est pas implémenté
      if (error instanceof APIError && error.status === 404) {
        logger.debug('[PorkPriceTrendService] Endpoint /marketplace/price-trends non disponible (404), retour tableau vide');
        return [];
      }
      // Pour les autres erreurs, essayer le repository (qui échouera probablement aussi)
      try {
        return await this.trendRepo.findLastWeeks(27);
      } catch {
        // Si le repository échoue aussi, retourner un tableau vide
        logger.warn('[PorkPriceTrendService] Impossible de récupérer les tendances, retour tableau vide');
        return [];
      }
    }
  }
}

/**
 * Instance singleton du service
 */
let porkPriceTrendServiceInstance: PorkPriceTrendService | null = null;

export function getPorkPriceTrendService(): PorkPriceTrendService {
  if (!porkPriceTrendServiceInstance) {
    porkPriceTrendServiceInstance = new PorkPriceTrendService();
  }
  return porkPriceTrendServiceInstance;
}
