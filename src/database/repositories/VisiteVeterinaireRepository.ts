/**
 * VisiteVeterinaireRepository - Gestion des visites vétérinaires
 * 
 * Responsabilités:
 * - CRUD des visites vétérinaires
 * - Recherche par projet
 * - Prochaine visite prévue
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { VisiteVeterinaire, CreateVisiteVeterinaireInput } from '../../types/sante';
import uuid from 'react-native-uuid';

export class VisiteVeterinaireRepository extends BaseRepository<VisiteVeterinaire> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'visites_veterinaires');
  }

  /**
   * Créer une nouvelle visite vétérinaire
   */
  async create(input: CreateVisiteVeterinaireInput): Promise<VisiteVeterinaire> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO visites_veterinaires (
        id, projet_id, date_visite, veterinaire, motif, animaux_examines,
        diagnostic, prescriptions, recommandations, traitement, cout,
        prochaine_visite_prevue, notes,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.projet_id,
        input.date_visite,
        input.veterinaire || null,
        input.motif,
        input.animaux_examines || null,
        input.diagnostic || null,
        input.prescriptions || null,
        input.recommandations || null,
        null, // traitement (non utilisé dans le type)
        input.cout || null,
        input.prochaine_visite || null,
        input.notes || null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer la visite vétérinaire');
    }
    return created;
  }

  /**
   * Mapper une ligne de la base vers VisiteVeterinaire
   */
  private mapRow(row: any): VisiteVeterinaire {
    return {
      id: row.id,
      projet_id: row.projet_id,
      date_visite: row.date_visite,
      veterinaire: row.veterinaire || undefined,
      motif: row.motif,
      animaux_examines: row.animaux_examines || undefined,
      diagnostic: row.diagnostic || undefined,
      prescriptions: row.prescriptions || undefined,
      recommandations: row.recommandations || undefined,
      cout: row.cout || 0,
      prochaine_visite: row.prochaine_visite_prevue || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  /**
   * Override findById pour mapper correctement
   */
  async findById(id: string): Promise<VisiteVeterinaire | null> {
    const row = await this.queryOne<any>(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    return row ? this.mapRow(row) : null;
  }

  /**
   * Récupérer toutes les visites d'un projet
   */
  async findByProjet(projetId: string): Promise<VisiteVeterinaire[]> {
    const rows = await this.query<any>(
      `SELECT * FROM visites_veterinaires WHERE projet_id = ? ORDER BY date_visite DESC`,
      [projetId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Récupérer la prochaine visite prévue
   */
  async findProchaineVisite(projetId: string): Promise<VisiteVeterinaire | null> {
    const row = await this.queryOne<any>(
      `SELECT * FROM visites_veterinaires 
       WHERE projet_id = ? AND prochaine_visite_prevue IS NOT NULL AND prochaine_visite_prevue > ?
       ORDER BY prochaine_visite_prevue ASC LIMIT 1`,
      [projetId, new Date().toISOString()]
    );
    return row ? this.mapRow(row) : null;
  }

  /**
   * Mettre à jour une visite
   */
  async update(id: string, updates: Partial<CreateVisiteVeterinaireInput>): Promise<VisiteVeterinaire> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.date_visite !== undefined) {
      fields.push('date_visite = ?');
      values.push(updates.date_visite);
    }
    if (updates.veterinaire !== undefined) {
      fields.push('veterinaire = ?');
      values.push(updates.veterinaire || null);
    }
    if (updates.motif !== undefined) {
      fields.push('motif = ?');
      values.push(updates.motif);
    }
    if (updates.animaux_examines !== undefined) {
      fields.push('animaux_examines = ?');
      values.push(updates.animaux_examines || null);
    }
    if (updates.diagnostic !== undefined) {
      fields.push('diagnostic = ?');
      values.push(updates.diagnostic || null);
    }
    if (updates.prescriptions !== undefined) {
      fields.push('prescriptions = ?');
      values.push(updates.prescriptions || null);
    }
    if (updates.recommandations !== undefined) {
      fields.push('recommandations = ?');
      values.push(updates.recommandations || null);
    }
    if (updates.cout !== undefined) {
      fields.push('cout = ?');
      values.push(updates.cout || null);
    }
    if (updates.prochaine_visite !== undefined) {
      fields.push('prochaine_visite_prevue = ?');
      values.push(updates.prochaine_visite || null);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes || null);
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Visite introuvable');
      }
      return existing;
    }

    fields.push('derniere_modification = ?');
    values.push(now);
    values.push(id);

    await this.execute(`UPDATE visites_veterinaires SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Visite introuvable après mise à jour');
    }
    return updated;
  }
}

