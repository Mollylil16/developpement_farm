/**
 * PlanificationRepository - Gestion des planifications
 * 
 * Responsabilités:
 * - CRUD des planifications
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { Planification } from '../../types/planification';
import uuid from 'react-native-uuid';

export class PlanificationRepository extends BaseRepository<Planification> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'planifications');
  }

  /**
   * Créer une nouvelle planification
   */
  async create(data: Omit<Planification, 'id' | 'date_creation' | 'derniere_modification'>): Promise<Planification> {
    const id = uuid.v4() as string;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;

    await this.execute(
      `INSERT INTO planifications (
        id, projet_id, type, titre, description, date_prevue, date_echeance,
        rappel, statut, recurrence, lien_gestation_id, lien_sevrage_id, notes,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id,
        data.type,
        data.titre,
        data.description || null,
        data.date_prevue,
        data.date_echeance || null,
        data.rappel || null,
        data.statut || 'a_faire',
        data.recurrence || null,
        data.lien_gestation_id || null,
        data.lien_sevrage_id || null,
        data.notes || null,
        date_creation,
        derniere_modification,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer la planification');
    }
    return created;
  }

  /**
   * Mettre à jour une planification
   */
  async update(id: string, updates: Partial<Planification>): Promise<Planification> {
    const derniere_modification = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.titre !== undefined) {
      fields.push('titre = ?');
      values.push(updates.titre);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description || null);
    }
    if (updates.date_prevue !== undefined) {
      fields.push('date_prevue = ?');
      values.push(updates.date_prevue);
    }
    if (updates.date_echeance !== undefined) {
      fields.push('date_echeance = ?');
      values.push(updates.date_echeance || null);
    }
    if (updates.rappel !== undefined) {
      fields.push('rappel = ?');
      values.push(updates.rappel || null);
    }
    if (updates.statut !== undefined) {
      fields.push('statut = ?');
      values.push(updates.statut);
    }
    if (updates.recurrence !== undefined) {
      fields.push('recurrence = ?');
      values.push(updates.recurrence || null);
    }
    if (updates.lien_gestation_id !== undefined) {
      fields.push('lien_gestation_id = ?');
      values.push(updates.lien_gestation_id || null);
    }
    if (updates.lien_sevrage_id !== undefined) {
      fields.push('lien_sevrage_id = ?');
      values.push(updates.lien_sevrage_id || null);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes || null);
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('Planification introuvable');
      return existing;
    }

    fields.push('derniere_modification = ?');
    values.push(derniere_modification);
    values.push(id);

    await this.execute(`UPDATE planifications SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Planification introuvable après mise à jour');
    }
    return updated;
  }

  /**
   * Récupérer toutes les planifications d'un projet
   * ⚠️ Attention: Peut charger beaucoup de données en mémoire
   * Utilisez findByProjetPaginated() pour les projets avec beaucoup de planifications
   */
  async findByProjet(projetId: string): Promise<Planification[]> {
    return this.query<Planification>(
      'SELECT * FROM planifications WHERE projet_id = ? ORDER BY date_prevue ASC',
      [projetId]
    );
  }

  /**
   * Récupérer les planifications d'un projet avec pagination
   */
  async findByProjetPaginated(
    projetId: string,
    options: {
      limit?: number;
      offset?: number;
      statut?: string;
    } = {}
  ): Promise<{
    data: Planification[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    const { limit = 50, offset = 0, statut } = options;

    // Construire la clause WHERE
    let whereClause = 'WHERE projet_id = ?';
    const params: unknown[] = [projetId];

    if (statut) {
      whereClause += ' AND statut = ?';
      params.push(statut);
    }

    // Compter le total
    const countResult = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM planifications ${whereClause}`,
      params
    );
    const total = countResult?.count || 0;

    // Récupérer les données paginées
    const data = await this.query<Planification>(
      `SELECT * FROM planifications ${whereClause} ORDER BY date_prevue ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    };
  }

  /**
   * Récupérer les planifications par statut
   */
  async findByStatut(statut: string): Promise<Planification[]> {
    return this.query<Planification>(
      'SELECT * FROM planifications WHERE statut = ? ORDER BY date_prevue ASC',
      [statut]
    );
  }

  /**
   * Récupérer les planifications par période
   */
  async findByPeriod(dateDebut: string, dateFin: string): Promise<Planification[]> {
    return this.query<Planification>(
      'SELECT * FROM planifications WHERE date_prevue >= ? AND date_prevue <= ? ORDER BY date_prevue ASC',
      [dateDebut, dateFin]
    );
  }

  /**
   * Récupérer les planifications à venir
   */
  async findAVenir(projetId: string, jours: number = 7): Promise<Planification[]> {
    const aujourdhui = new Date().toISOString().split('T')[0];
    const dateFin = new Date();
    dateFin.setDate(dateFin.getDate() + jours);
    const dateFinStr = dateFin.toISOString().split('T')[0];

    return this.query<Planification>(
      `SELECT * FROM planifications 
       WHERE projet_id = ? 
       AND date_prevue >= ? 
       AND date_prevue <= ? 
       AND statut IN ('a_faire', 'en_cours')
       ORDER BY date_prevue ASC`,
      [projetId, aujourdhui, dateFinStr]
    );
  }
}

