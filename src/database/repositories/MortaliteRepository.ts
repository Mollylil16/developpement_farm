/**
 * MortaliteRepository - Gestion des mortalités
 * 
 * Responsabilités:
 * - CRUD des mortalités
 * - Statistiques de mortalité
 * - Suivi des causes
 * - Alertes de mortalité anormale
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { Mortalite } from '../../types/mortalite';
import uuid from 'react-native-uuid';

export class MortaliteRepository extends BaseRepository<Mortalite> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'mortalites');
  }

  async create(data: Partial<Mortalite>): Promise<Mortalite> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO mortalites (
        id, projet_id, nombre_porcs, date, cause,
        categorie, animal_code, notes, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id,
        data.nombre_porcs || 1,
        data.date || now,
        data.cause || null,
        data.categorie || 'autre',
        data.animal_code || null,
        data.notes || null,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer la mortalité');
    }
    return created;
  }

  async update(id: string, data: Partial<Mortalite>): Promise<Mortalite> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.nombre_porcs !== undefined) {
      fields.push('nombre_porcs = ?');
      values.push(data.nombre_porcs);
    }
    if (data.date !== undefined) {
      fields.push('date = ?');
      values.push(data.date);
    }
    if (data.cause !== undefined) {
      fields.push('cause = ?');
      values.push(data.cause);
    }
    if (data.categorie !== undefined) {
      fields.push('categorie = ?');
      values.push(data.categorie);
    }
    if (data.animal_code !== undefined) {
      fields.push('animal_code = ?');
      values.push(data.animal_code);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    if (fields.length === 0) {
      // Aucun champ à mettre à jour
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Mortalité introuvable');
      }
      return existing;
    }

    values.push(id);
    await this.execute(`UPDATE mortalites SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Mortalité introuvable');
    }
    return updated;
  }

  async findByProjet(projetId: string): Promise<Mortalite[]> {
    return this.query<Mortalite>(
      `SELECT * FROM mortalites 
       WHERE projet_id = ?
       ORDER BY date DESC`,
      [projetId]
    );
  }

  async findByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<Mortalite[]> {
    return this.query<Mortalite>(
      `SELECT * FROM mortalites 
       WHERE projet_id = ? AND date >= ? AND date <= ?
       ORDER BY date DESC`,
      [projetId, dateDebut, dateFin]
    );
  }

  async getStats(projetId: string): Promise<{
    total: number;
    parCause: Record<string, number>;
    tauxMortalite: number;
    ageMoyen: number;
  }> {
    const total = await this.count(projetId);

    const parCauseResult = await this.query<{ cause: string; count: number }>(
      `SELECT cause, COUNT(*) as count FROM mortalites WHERE projet_id = ? GROUP BY cause`,
      [projetId]
    );

    const parCause: Record<string, number> = {};
    parCauseResult.forEach((row) => {
      parCause[row.cause] = row.count;
    });

    // Taux de mortalité = (morts / total animaux) * 100
    const totalAnimauxResult = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM production_animaux WHERE projet_id = ?`,
      [projetId]
    );

    const totalAnimaux = totalAnimauxResult?.count || 0;
    const tauxMortalite = totalAnimaux > 0 ? (total / totalAnimaux) * 100 : 0;

    // Note: age_jours n'existe pas dans la table mortalites
    // L'âge moyen n'est pas disponible avec la structure actuelle
    return {
      total,
      parCause,
      tauxMortalite,
      ageMoyen: 0, // Non disponible - la colonne age_jours n'existe pas dans la table
    };
  }
}

