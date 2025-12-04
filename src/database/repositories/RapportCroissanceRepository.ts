/**
 * Repository pour la gestion des rapports de croissance
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { RapportCroissance, CreateRapportCroissanceInput } from '../../types/rapports';
import uuid from 'react-native-uuid';

export class RapportCroissanceRepository extends BaseRepository<RapportCroissance> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'rapports_croissance');
  }

  async create(input: CreateRapportCroissanceInput): Promise<RapportCroissance> {
    const id = uuid.v4() as string;
    const date_creation = new Date().toISOString();

    await this.execute(
      `INSERT INTO ${this.tableName} (
        id, projet_id, date, poids_moyen, nombre_porcs,
        gain_quotidien, poids_cible, notes, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.projet_id,
        input.date,
        input.poids_moyen,
        input.nombre_porcs,
        input.gain_quotidien || null,
        input.poids_cible || null,
        input.notes || null,
        date_creation,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer le rapport de croissance');
    }
    return created;
  }

  async findById(id: string): Promise<RapportCroissance | null> {
    const result = await this.queryOne<RapportCroissance>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return result;
  }

  async findAll(): Promise<RapportCroissance[]> {
    const rows = await this.query<RapportCroissance>(
      `SELECT * FROM ${this.tableName} ORDER BY date DESC`
    );
    return rows;
  }

  async findByProjet(projetId: string): Promise<RapportCroissance[]> {
    const rows = await this.query<RapportCroissance>(
      `SELECT * FROM ${this.tableName} WHERE projet_id = ? ORDER BY date ASC`,
      [projetId]
    );
    return rows;
  }

  async findByDateRange(
    dateDebut: string,
    dateFin: string
  ): Promise<RapportCroissance[]> {
    const rows = await this.query<RapportCroissance>(
      `SELECT * FROM ${this.tableName} WHERE date >= ? AND date <= ? ORDER BY date ASC`,
      [dateDebut, dateFin]
    );
    return rows;
  }

  async delete(id: string): Promise<void> {
    await this.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
  }
}

