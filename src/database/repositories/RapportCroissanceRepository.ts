/**
 * Repository pour la gestion des rapports de croissance
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { RapportCroissance, CreateRapportCroissanceInput } from '../../types/rapports';
import uuid from 'react-native-uuid';

export class RapportCroissanceRepository extends BaseRepository<RapportCroissance> {
  private _db: any;
  constructor(db: SQLite.SQLiteDatabase) {
    super('rapports_croissance', '/rapports/croissance');
    this._db = db;
  }

  async update(id: string, data: Partial<RapportCroissance>): Promise<RapportCroissance> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Rapport ${id} not found`);
    return { ...existing, ...data };
  }

  async create(input: CreateRapportCroissanceInput): Promise<RapportCroissance> {
    return this.executePost<RapportCroissance>(this.apiBasePath, input);
  }

  async findById(id: string): Promise<RapportCroissance | null> {
    const result = await this.queryOne<RapportCroissance>(
      `${this.apiBasePath}/${id}`
    );
    return result;
  }

  async findAll(): Promise<RapportCroissance[]> {
    return this.query<RapportCroissance>(this.apiBasePath);
  }

  async findByProjet(projetId: string): Promise<RapportCroissance[]> {
    return this.query<RapportCroissance>(this.apiBasePath, { projet_id: projetId });
  }

  async findByDateRange(dateDebut: string, dateFin: string): Promise<RapportCroissance[]> {
    return this.query<RapportCroissance>(this.apiBasePath, { date_debut: dateDebut, date_fin: dateFin });
  }

  async delete(id: string): Promise<void> {
    await this.executeDelete(`${this.apiBasePath}/${id}`);
  }
}
