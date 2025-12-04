/**
 * Repository pour gérer les tendances de prix hebdomadaires du porc poids vif
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import uuid from 'react-native-uuid';
import { BaseRepository } from './BaseRepository';

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
  constructor(db: SQLiteDatabase) {
    super(db, 'weekly_pork_price_trends');
  }

  async create(data: CreateWeeklyPorkPriceTrendInput): Promise<WeeklyPorkPriceTrend> {
    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO ${this.tableName} (
        id, year, week_number, avg_price_platform, avg_price_regional,
        transactions_count, offers_count, listings_count, source_priority,
        total_weight_kg, total_price_fcfa, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.year,
        data.weekNumber,
        data.avgPricePlatform || null,
        data.avgPriceRegional || null,
        data.transactionsCount || 0,
        data.offersCount || 0,
        data.listingsCount || 0,
        data.sourcePriority || 'platform',
        data.totalWeightKg || null,
        data.totalPriceFcfa || null,
        now,
      ]
    );

    const trend = await this.findByYearAndWeek(data.year, data.weekNumber);
    if (!trend) throw new Error('Failed to create weekly pork price trend');
    return trend;
  }

  async findByYearAndWeek(year: number, weekNumber: number): Promise<WeeklyPorkPriceTrend | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM ${this.tableName} WHERE year = ? AND week_number = ?`,
      [year, weekNumber]
    );
    return row ? this.mapRow(row) : null;
  }

  async updateByYearAndWeek(
    year: number,
    weekNumber: number,
    updates: UpdateWeeklyPorkPriceTrendInput
  ): Promise<WeeklyPorkPriceTrend> {
    const now = new Date().toISOString();
    const setClause: string[] = [];
    const values: any[] = [];

    if (updates.avgPricePlatform !== undefined) {
      setClause.push('avg_price_platform = ?');
      values.push(updates.avgPricePlatform);
    }
    if (updates.avgPriceRegional !== undefined) {
      setClause.push('avg_price_regional = ?');
      values.push(updates.avgPriceRegional);
    }
    if (updates.transactionsCount !== undefined) {
      setClause.push('transactions_count = ?');
      values.push(updates.transactionsCount);
    }
    if (updates.offersCount !== undefined) {
      setClause.push('offers_count = ?');
      values.push(updates.offersCount);
    }
    if (updates.listingsCount !== undefined) {
      setClause.push('listings_count = ?');
      values.push(updates.listingsCount);
    }
    if (updates.sourcePriority !== undefined) {
      setClause.push('source_priority = ?');
      values.push(updates.sourcePriority);
    }
    if (updates.totalWeightKg !== undefined) {
      setClause.push('total_weight_kg = ?');
      values.push(updates.totalWeightKg);
    }
    if (updates.totalPriceFcfa !== undefined) {
      setClause.push('total_price_fcfa = ?');
      values.push(updates.totalPriceFcfa);
    }

    setClause.push('updated_at = ?');
    values.push(now);
    values.push(year, weekNumber);

    await this.db.runAsync(
      `UPDATE ${this.tableName} SET ${setClause.join(', ')} WHERE year = ? AND week_number = ?`,
      values
    );

    const updated = await this.findByYearAndWeek(year, weekNumber);
    if (!updated) throw new Error('Failed to update weekly pork price trend');
    return updated;
  }

  async findLastWeeks(weeks: number = 26): Promise<WeeklyPorkPriceTrend[]> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentWeek = this.getWeekNumber(now);

    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM ${this.tableName} 
       WHERE (year = ? AND week_number <= ?) OR (year = ? AND week_number >= ?)
       ORDER BY year DESC, week_number DESC
       LIMIT ?`,
      [currentYear, currentWeek, currentYear - 1, currentWeek, weeks]
    );

    return rows.map(r => this.mapRow(r)).reverse();
  }

  async findCurrentWeek(): Promise<WeeklyPorkPriceTrend | null> {
    const now = new Date();
    const year = now.getFullYear();
    const weekNumber = this.getWeekNumber(now);
    return this.findByYearAndWeek(year, weekNumber);
  }

  async upsert(data: CreateWeeklyPorkPriceTrendInput): Promise<WeeklyPorkPriceTrend> {
    const existing = await this.findByYearAndWeek(data.year, data.weekNumber);
    if (existing) {
      return this.updateByYearAndWeek(data.year, data.weekNumber, {
        avgPricePlatform: data.avgPricePlatform,
        avgPriceRegional: data.avgPriceRegional,
        transactionsCount: data.transactionsCount,
        offersCount: data.offersCount,
        listingsCount: data.listingsCount,
        sourcePriority: data.sourcePriority,
        totalWeightKg: data.totalWeightKg,
        totalPriceFcfa: data.totalPriceFcfa,
      });
    } else {
      return this.create(data);
    }
  }

  private mapRow(row: any): WeeklyPorkPriceTrend {
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

