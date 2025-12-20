/**
 * CalendrierVaccinationRepository - Gestion des calendriers de vaccination
 *
 * Responsabilités:
 * - CRUD des calendriers de vaccination
 * - Recherche par projet et catégorie
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { CalendrierVaccination, CreateCalendrierVaccinationInput } from '../../types/sante';
import uuid from 'react-native-uuid';

export class CalendrierVaccinationRepository extends BaseRepository<CalendrierVaccination> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'calendrier_vaccinations');
  }

  /**
   * Créer un nouveau calendrier de vaccination
   */
  async create(input: CreateCalendrierVaccinationInput): Promise<CalendrierVaccination> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO calendrier_vaccinations (
        id, projet_id, vaccin, nom_vaccin, categorie, age_jours,
        date_planifiee, frequence_jours, obligatoire, notes,
        date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.projet_id,
        input.vaccin,
        input.nom_vaccin || null,
        input.categorie,
        input.age_jours || null,
        input.date_planifiee || null,
        input.frequence_jours || null,
        input.obligatoire ? 1 : 0,
        input.notes || null,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer le calendrier de vaccination');
    }
    return created;
  }

  /**
   * Mapper une ligne de la base vers CalendrierVaccination
   */
  private mapRow(row: unknown): CalendrierVaccination {
    return {
      id: row.id,
      projet_id: row.projet_id,
      vaccin: row.vaccin,
      nom_vaccin: row.nom_vaccin || undefined,
      categorie: row.categorie,
      age_jours: row.age_jours || undefined,
      date_planifiee: row.date_planifiee || undefined,
      frequence_jours: row.frequence_jours || undefined,
      obligatoire: Boolean(row.obligatoire),
      notes: row.notes || undefined,
      date_creation: row.date_creation,
    };
  }

  /**
   * Override findById pour mapper correctement
   */
  async findById(id: string): Promise<CalendrierVaccination | null> {
    const row = await this.queryOne<unknown>(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    return row ? this.mapRow(row) : null;
  }

  /**
   * Récupérer tous les calendriers d'un projet
   */
  async findByProjet(projetId: string): Promise<CalendrierVaccination[]> {
    const rows = await this.query<unknown>(
      `SELECT * FROM calendrier_vaccinations 
       WHERE projet_id = ? 
       ORDER BY categorie, age_jours`,
      [projetId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Récupérer les calendriers par catégorie d'animal
   */
  async findByCategorie(projetId: string, categorie: string): Promise<CalendrierVaccination[]> {
    const rows = await this.query<unknown>(
      `SELECT * FROM calendrier_vaccinations 
       WHERE projet_id = ? AND categorie = ?
       ORDER BY age_jours`,
      [projetId, categorie]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Mettre à jour un calendrier
   */
  async update(
    id: string,
    updates: Partial<CreateCalendrierVaccinationInput>
  ): Promise<CalendrierVaccination> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.vaccin !== undefined) {
      fields.push('vaccin = ?');
      values.push(updates.vaccin);
    }
    if (updates.nom_vaccin !== undefined) {
      fields.push('nom_vaccin = ?');
      values.push(updates.nom_vaccin);
    }
    if (updates.categorie !== undefined) {
      fields.push('categorie = ?');
      values.push(updates.categorie);
    }
    if (updates.age_jours !== undefined) {
      fields.push('age_jours = ?');
      values.push(updates.age_jours);
    }
    if (updates.date_planifiee !== undefined) {
      fields.push('date_planifiee = ?');
      values.push(updates.date_planifiee);
    }
    if (updates.frequence_jours !== undefined) {
      fields.push('frequence_jours = ?');
      values.push(updates.frequence_jours);
    }
    if (updates.obligatoire !== undefined) {
      fields.push('obligatoire = ?');
      values.push(updates.obligatoire ? 1 : 0);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Calendrier introuvable');
      }
      return existing;
    }

    // Note: La table n'a pas de champ derniere_modification, donc on ne l'ajoute pas
    values.push(id);

    await this.execute(
      `UPDATE calendrier_vaccinations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Calendrier introuvable après mise à jour');
    }
    return updated;
  }
}
