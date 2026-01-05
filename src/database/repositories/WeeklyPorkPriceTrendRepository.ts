/**
 * Repository pour gérer les tendances de prix hebdomadaires du porc poids vif
 */

import { BaseRepository } from './BaseRepository';
import { APIError } from '../../services/api/apiClient';

export interface WeeklyPorkPriceTrend {
  id: string;
  year: number;
  weekNumber: number;
  avgPricePlatform?: number;
  avgPriceRegional?: number;
  transactionsCount: number;
  offersCount: number;
  listingsCount: number;
  sourcePriority: 'platform' | 'offers' | 'listings' | 'regional';
  totalWeightKg?: number;
  totalPriceFcfa?: number;
  updatedAt: string;
}

export interface CreateWeeklyPorkPriceTrendInput {
  year: number;
  weekNumber: number;
  avgPricePlatform?: number;
  avgPriceRegional?: number;
  transactionsCount?: number;
  offersCount?: number;
  listingsCount?: number;
  sourcePriority?: 'platform' | 'offers' | 'listings' | 'regional';
  totalWeightKg?: number;
  totalPriceFcfa?: number;
}

export interface UpdateWeeklyPorkPriceTrendInput {
  avgPricePlatform?: number;
  avgPriceRegional?: number;
  transactionsCount?: number;
  offersCount?: number;
  listingsCount?: number;
  sourcePriority?: 'platform' | 'offers' | 'listings' | 'regional';
  totalWeightKg?: number;
  totalPriceFcfa?: number;
}

export class WeeklyPorkPriceTrendRepository extends BaseRepository<WeeklyPorkPriceTrend> {
  constructor() {
    super('weekly_pork_price_trends', '/marketplace/price-trends');
  }

  async create(data: CreateWeeklyPorkPriceTrendInput): Promise<WeeklyPorkPriceTrend> {
    return this.executePost<WeeklyPorkPriceTrend>(this.apiBasePath, data);
  }

  async findByYearAndWeek(year: number, weekNumber: number): Promise<WeeklyPorkPriceTrend | null> {
    const row = await this.queryOne<unknown>(this.apiBasePath, {
      year,
      week_number: weekNumber,
    });
    return row ? this.mapRow(row) : null;
  }

  async updateByYearAndWeek(
    year: number,
    weekNumber: number,
    updates: UpdateWeeklyPorkPriceTrendInput
  ): Promise<WeeklyPorkPriceTrend> {
    return this.executePatch<WeeklyPorkPriceTrend>(`${this.apiBasePath}/${year}/${weekNumber}`, updates);
  }

  async findLastWeeks(weeks: number = 26): Promise<WeeklyPorkPriceTrend[]> {
    try {
      const rows = await this.query<unknown>(this.apiBasePath, {
        weeks,
        order_by: 'year,week_number',
        order_direction: 'DESC',
      });
      return rows.map((r) => this.mapRow(r)).reverse();
    } catch (error: unknown) {
      // Si l'endpoint n'existe pas (404), retourner un tableau vide silencieusement
      if (error instanceof APIError && error.status === 404) {
        // L'endpoint backend n'est pas encore implémenté, retourner vide
        return [];
      }
      // Pour les autres erreurs, propager
      throw error;
    }
  }

  async findCurrentWeek(): Promise<WeeklyPorkPriceTrend | null> {
    const now = new Date();
    const year = now.getFullYear();
    const weekNumber = this.getWeekNumber(now);
    return this.findByYearAndWeek(year, weekNumber);
  }

  async upsert(data: CreateWeeklyPorkPriceTrendInput): Promise<WeeklyPorkPriceTrend> {
    return this.executePost<WeeklyPorkPriceTrend>(`${this.apiBasePath}/upsert`, data);
  }

  private mapRow(row: unknown): WeeklyPorkPriceTrend {
    return {
      id: row.id,
      year: row.year,
      weekNumber: row.week_number,
      avgPricePlatform: row.avg_price_platform || undefined,
      avgPriceRegional: row.avg_price_regional || undefined,
      transactionsCount: row.transactions_count || 0,
      offersCount: row.offers_count || 0,
      listingsCount: row.listings_count || 0,
      sourcePriority: row.source_priority || 'platform',
      totalWeightKg: row.total_weight_kg || undefined,
      totalPriceFcfa: row.total_price_fcfa || undefined,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Calcule le numéro de semaine ISO (1-53)
   * Semaine = du lundi au dimanche
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
