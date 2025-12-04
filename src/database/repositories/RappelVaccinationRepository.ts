/**
 * RappelVaccinationRepository - Gestion des rappels de vaccination
 * 
 * Responsabilités:
 * - CRUD des rappels de vaccination
 * - Recherche par projet, vaccination
 * - Filtrage par statut (à venir, en retard)
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { RappelVaccination } from '../../types/sante';
import uuid from 'react-native-uuid';

export interface CreateRappelVaccinationInput {
  vaccination_id: string;
  date_rappel: string;
  envoi?: boolean;
  date_envoi?: string;
}

export class RappelVaccinationRepository extends BaseRepository<RappelVaccination> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'rappels_vaccinations');
  }

  /**
   * Créer un nouveau rappel
   */
  async create(input: CreateRappelVaccinationInput): Promise<RappelVaccination> {
    const id = uuid.v4().toString();

    await this.execute(
      `INSERT INTO rappels_vaccinations (
        id, vaccination_id, date_rappel, envoi, date_envoi
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        input.vaccination_id,
        input.date_rappel,
        input.envoi ? 1 : 0,
        input.date_envoi || null,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer le rappel');
    }
    return created;
  }

  /**
   * Mapper une ligne de la base vers RappelVaccination
   */
  private mapRow(row: any): RappelVaccination {
    return {
      id: row.id,
      vaccination_id: row.vaccination_id,
      date_rappel: row.date_rappel,
      envoi: Boolean(row.envoi),
      date_envoi: row.date_envoi || undefined,
    };
  }

  /**
   * Override findById pour mapper correctement
   */
  async findById(id: string): Promise<RappelVaccination | null> {
    const row = await this.queryOne<any>(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    return row ? this.mapRow(row) : null;
  }

  /**
   * Récupérer tous les rappels d'une vaccination
   */
  async findByVaccination(vaccinationId: string): Promise<RappelVaccination[]> {
    const rows = await this.query<any>(
      `SELECT * FROM rappels_vaccinations WHERE vaccination_id = ? ORDER BY date_rappel ASC`,
      [vaccinationId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Récupérer les rappels à venir (dans les X jours)
   * Note: Nécessite de joindre avec vaccinations pour filtrer par projet_id
   */
  async findAVenir(vaccinationIds: string[], joursAvance: number = 7): Promise<RappelVaccination[]> {
    if (vaccinationIds.length === 0) return [];
    
    const now = new Date();
    const dateMax = new Date(now.getTime() + joursAvance * 24 * 60 * 60 * 1000);
    const placeholders = vaccinationIds.map(() => '?').join(',');

    const rows = await this.query<any>(
      `SELECT * FROM rappels_vaccinations 
       WHERE vaccination_id IN (${placeholders}) 
       AND date_rappel BETWEEN ? AND ? 
       AND envoi = 0
       ORDER BY date_rappel ASC`,
      [...vaccinationIds, now.toISOString(), dateMax.toISOString()]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Récupérer les rappels en retard
   */
  async findEnRetard(vaccinationIds: string[]): Promise<RappelVaccination[]> {
    if (vaccinationIds.length === 0) return [];
    
    const placeholders = vaccinationIds.map(() => '?').join(',');
    const now = new Date().toISOString();

    const rows = await this.query<any>(
      `SELECT * FROM rappels_vaccinations 
       WHERE vaccination_id IN (${placeholders}) 
       AND date_rappel < ? 
       AND envoi = 0
       ORDER BY date_rappel ASC`,
      [...vaccinationIds, now]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Marquer un rappel comme envoyé
   */
  async marquerEnvoye(id: string): Promise<RappelVaccination> {
    await this.execute(
      `UPDATE rappels_vaccinations SET envoi = 1, date_envoi = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Rappel introuvable après mise à jour');
    }
    return updated;
  }

  /**
   * Mettre à jour un rappel
   */
  async update(id: string, updates: Partial<CreateRappelVaccinationInput>): Promise<RappelVaccination> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.date_rappel !== undefined) {
      fields.push('date_rappel = ?');
      values.push(updates.date_rappel);
    }
    if (updates.envoi !== undefined) {
      fields.push('envoi = ?');
      values.push(updates.envoi ? 1 : 0);
    }
    if (updates.date_envoi !== undefined) {
      fields.push('date_envoi = ?');
      values.push(updates.date_envoi || null);
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Rappel introuvable');
      }
      return existing;
    }

    values.push(id);

    await this.execute(`UPDATE rappels_vaccinations SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Rappel introuvable après mise à jour');
    }
    return updated;
  }
}

