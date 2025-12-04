/**
 * MaladieRepository - Gestion des maladies
 * 
 * Responsabilités:
 * - CRUD des maladies
 * - Recherche par projet, animal, lot
 * - Filtrage par statut (guéries, en cours)
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { Maladie, CreateMaladieInput } from '../../types/sante';
import uuid from 'react-native-uuid';

export class MaladieRepository extends BaseRepository<Maladie> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'maladies');
  }

  /**
   * Créer une nouvelle maladie
   */
  async create(input: CreateMaladieInput): Promise<Maladie> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO maladies (
        id, projet_id, animal_id, lot_id, type, nom_maladie, gravite,
        symptomes, diagnostic, date_debut, date_fin, gueri, contagieux,
        nombre_animaux_affectes, nombre_deces, veterinaire, cout_traitement, notes,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.projet_id,
        input.animal_id || null,
        input.lot_id || null,
        input.type,
        input.nom_maladie,
        input.gravite,
        input.symptomes,
        input.diagnostic || null,
        input.date_debut,
        input.date_fin || null,
        input.gueri ? 1 : 0,
        input.contagieux ? 1 : 0,
        input.nombre_animaux_affectes || null,
        input.nombre_deces || null,
        input.veterinaire || null,
        input.cout_traitement || null,
        input.notes || null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer la maladie');
    }
    return created;
  }

  /**
   * Mapper une ligne de la base vers Maladie
   */
  private mapRow(row: any): Maladie {
    return {
      id: row.id,
      projet_id: row.projet_id,
      animal_id: row.animal_id || undefined,
      lot_id: row.lot_id || undefined,
      type: row.type,
      nom_maladie: row.nom_maladie,
      gravite: row.gravite,
      date_debut: row.date_debut,
      date_fin: row.date_fin || undefined,
      symptomes: row.symptomes,
      diagnostic: row.diagnostic || undefined,
      contagieux: Boolean(row.contagieux),
      nombre_animaux_affectes: row.nombre_animaux_affectes || undefined,
      nombre_deces: row.nombre_deces || undefined,
      veterinaire: row.veterinaire || undefined,
      cout_traitement: row.cout_traitement || undefined,
      gueri: Boolean(row.gueri),
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  /**
   * Override findById pour mapper correctement
   */
  async findById(id: string): Promise<Maladie | null> {
    const row = await this.queryOne<any>(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    return row ? this.mapRow(row) : null;
  }

  /**
   * Récupérer toutes les maladies d'un projet
   */
  async findByProjet(projetId: string): Promise<Maladie[]> {
    const rows = await this.query<any>(
      `SELECT * FROM maladies WHERE projet_id = ? ORDER BY date_debut DESC`,
      [projetId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Récupérer toutes les maladies d'un animal
   */
  async findByAnimal(animalId: string): Promise<Maladie[]> {
    const rows = await this.query<any>(
      `SELECT * FROM maladies WHERE animal_id = ? ORDER BY date_debut DESC`,
      [animalId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Récupérer les maladies en cours (non guéries)
   */
  async findEnCours(projetId: string): Promise<Maladie[]> {
    const rows = await this.query<any>(
      `SELECT * FROM maladies WHERE projet_id = ? AND gueri = 0 ORDER BY date_debut DESC`,
      [projetId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Mettre à jour une maladie
   */
  async update(id: string, updates: Partial<CreateMaladieInput>): Promise<Maladie> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.animal_id !== undefined) {
      fields.push('animal_id = ?');
      values.push(updates.animal_id || null);
    }
    if (updates.lot_id !== undefined) {
      fields.push('lot_id = ?');
      values.push(updates.lot_id || null);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.nom_maladie !== undefined) {
      fields.push('nom_maladie = ?');
      values.push(updates.nom_maladie);
    }
    if (updates.gravite !== undefined) {
      fields.push('gravite = ?');
      values.push(updates.gravite);
    }
    if (updates.symptomes !== undefined) {
      fields.push('symptomes = ?');
      values.push(updates.symptomes);
    }
    if (updates.diagnostic !== undefined) {
      fields.push('diagnostic = ?');
      values.push(updates.diagnostic || null);
    }
    if (updates.date_debut !== undefined) {
      fields.push('date_debut = ?');
      values.push(updates.date_debut);
    }
    if (updates.date_fin !== undefined) {
      fields.push('date_fin = ?');
      values.push(updates.date_fin || null);
    }
    if (updates.gueri !== undefined) {
      fields.push('gueri = ?');
      values.push(updates.gueri ? 1 : 0);
    }
    if (updates.contagieux !== undefined) {
      fields.push('contagieux = ?');
      values.push(updates.contagieux ? 1 : 0);
    }
    if (updates.nombre_animaux_affectes !== undefined) {
      fields.push('nombre_animaux_affectes = ?');
      values.push(updates.nombre_animaux_affectes || null);
    }
    if (updates.nombre_deces !== undefined) {
      fields.push('nombre_deces = ?');
      values.push(updates.nombre_deces || null);
    }
    if (updates.veterinaire !== undefined) {
      fields.push('veterinaire = ?');
      values.push(updates.veterinaire || null);
    }
    if (updates.cout_traitement !== undefined) {
      fields.push('cout_traitement = ?');
      values.push(updates.cout_traitement || null);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes || null);
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Maladie introuvable');
      }
      return existing;
    }

    fields.push('derniere_modification = ?');
    values.push(now);
    values.push(id);

    await this.execute(`UPDATE maladies SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Maladie introuvable après mise à jour');
    }
    return updated;
  }

  /**
   * Supprimer une maladie (et ses traitements associés)
   */
  async delete(id: string): Promise<void> {
    // Supprimer aussi les traitements associés
    await this.execute('DELETE FROM traitements WHERE maladie_id = ?', [id]);
    await this.deleteById(id);
  }

  /**
   * Obtenir les statistiques de maladies
   */
  async getStatistiquesMaladies(projetId: string): Promise<{
    total: number;
    enCours: number;
    gueries: number;
    parType: { [key: string]: number };
    parGravite: { [key: string]: number };
    tauxGuerison: number;
  }> {
    const total = await this.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM maladies WHERE projet_id = ?',
      [projetId]
    );

    const enCours = await this.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM maladies WHERE projet_id = ? AND gueri = 0',
      [projetId]
    );

    const gueries = await this.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM maladies WHERE projet_id = ? AND gueri = 1',
      [projetId]
    );

    const parType = await this.query<{ type: string; count: number }>(
      'SELECT type, COUNT(*) as count FROM maladies WHERE projet_id = ? GROUP BY type',
      [projetId]
    );

    const parGravite = await this.query<{ gravite: string; count: number }>(
      'SELECT gravite, COUNT(*) as count FROM maladies WHERE projet_id = ? GROUP BY gravite',
      [projetId]
    );

    return {
      total: total?.count || 0,
      enCours: enCours?.count || 0,
      gueries: gueries?.count || 0,
      parType: parType.reduce((acc, item) => ({ ...acc, [item.type]: item.count }), {}),
      parGravite: parGravite.reduce((acc, item) => ({ ...acc, [item.gravite]: item.count }), {}),
      tauxGuerison: total?.count ? ((gueries?.count || 0) / total.count) * 100 : 0,
    };
  }
}

