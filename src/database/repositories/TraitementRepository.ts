/**
 * TraitementRepository - Gestion des traitements médicaux
 * 
 * Responsabilités:
 * - CRUD des traitements
 * - Recherche par projet, maladie, animal
 * - Filtrage par statut (terminés, en cours)
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { Traitement, CreateTraitementInput } from '../../types/sante';
import uuid from 'react-native-uuid';

export class TraitementRepository extends BaseRepository<Traitement> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'traitements');
  }

  /**
   * Créer un nouveau traitement
   */
  async create(input: CreateTraitementInput): Promise<Traitement> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO traitements (
        id, projet_id, maladie_id, animal_id, lot_id, type, nom_medicament,
        voie_administration, dosage, frequence, date_debut, date_fin,
        duree_jours, temps_attente_jours, veterinaire, cout, termine,
        efficace, effets_secondaires, notes,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.projet_id,
        input.maladie_id || null,
        input.animal_id || null,
        input.lot_id || null,
        input.type,
        input.nom_medicament,
        input.voie_administration,
        input.dosage,
        input.frequence,
        input.date_debut,
        input.date_fin || null,
        input.duree_jours || null,
        input.temps_attente_jours || null,
        input.veterinaire || null,
        input.cout || null,
        input.termine ? 1 : 0,
        input.efficace !== undefined ? (input.efficace ? 1 : 0) : null,
        input.effets_secondaires || null,
        input.notes || null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer le traitement');
    }
    return created;
  }

  /**
   * Mapper une ligne de la base vers Traitement
   */
  private mapRow(row: any): Traitement {
    return {
      id: row.id,
      projet_id: row.projet_id,
      maladie_id: row.maladie_id || undefined,
      animal_id: row.animal_id || undefined,
      lot_id: row.lot_id || undefined,
      type: row.type,
      nom_medicament: row.nom_medicament,
      voie_administration: row.voie_administration,
      dosage: row.dosage,
      frequence: row.frequence,
      date_debut: row.date_debut,
      date_fin: row.date_fin || undefined,
      duree_jours: row.duree_jours || undefined,
      temps_attente_jours: row.temps_attente_jours || undefined,
      veterinaire: row.veterinaire || undefined,
      cout: row.cout || undefined,
      termine: Boolean(row.termine),
      efficace: row.efficace !== null && row.efficace !== undefined ? Boolean(row.efficace) : undefined,
      effets_secondaires: row.effets_secondaires || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  /**
   * Override findById pour mapper correctement
   */
  async findById(id: string): Promise<Traitement | null> {
    const row = await this.queryOne<any>(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    return row ? this.mapRow(row) : null;
  }

  /**
   * Récupérer tous les traitements d'un projet
   */
  async findByProjet(projetId: string): Promise<Traitement[]> {
    const rows = await this.query<any>(
      `SELECT * FROM traitements WHERE projet_id = ? ORDER BY date_debut DESC`,
      [projetId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Récupérer les traitements d'une maladie
   */
  async findByMaladie(maladieId: string): Promise<Traitement[]> {
    const rows = await this.query<any>(
      `SELECT * FROM traitements WHERE maladie_id = ? ORDER BY date_debut DESC`,
      [maladieId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Récupérer les traitements d'un animal
   */
  async findByAnimal(animalId: string): Promise<Traitement[]> {
    const rows = await this.query<any>(
      `SELECT * FROM traitements WHERE animal_id = ? ORDER BY date_debut DESC`,
      [animalId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Récupérer les traitements en cours (non terminés)
   */
  async findEnCours(projetId: string): Promise<Traitement[]> {
    const rows = await this.query<any>(
      `SELECT * FROM traitements WHERE projet_id = ? AND termine = 0 ORDER BY date_debut DESC`,
      [projetId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Mettre à jour un traitement
   */
  async update(id: string, updates: Partial<CreateTraitementInput>): Promise<Traitement> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.maladie_id !== undefined) {
      fields.push('maladie_id = ?');
      values.push(updates.maladie_id || null);
    }
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
    if (updates.nom_medicament !== undefined) {
      fields.push('nom_medicament = ?');
      values.push(updates.nom_medicament);
    }
    if (updates.voie_administration !== undefined) {
      fields.push('voie_administration = ?');
      values.push(updates.voie_administration);
    }
    if (updates.dosage !== undefined) {
      fields.push('dosage = ?');
      values.push(updates.dosage);
    }
    if (updates.frequence !== undefined) {
      fields.push('frequence = ?');
      values.push(updates.frequence);
    }
    if (updates.date_debut !== undefined) {
      fields.push('date_debut = ?');
      values.push(updates.date_debut);
    }
    if (updates.date_fin !== undefined) {
      fields.push('date_fin = ?');
      values.push(updates.date_fin || null);
    }
    if (updates.duree_jours !== undefined) {
      fields.push('duree_jours = ?');
      values.push(updates.duree_jours || null);
    }
    if (updates.temps_attente_jours !== undefined) {
      fields.push('temps_attente_jours = ?');
      values.push(updates.temps_attente_jours || null);
    }
    if (updates.veterinaire !== undefined) {
      fields.push('veterinaire = ?');
      values.push(updates.veterinaire || null);
    }
    if (updates.cout !== undefined) {
      fields.push('cout = ?');
      values.push(updates.cout || null);
    }
    if (updates.termine !== undefined) {
      fields.push('termine = ?');
      values.push(updates.termine ? 1 : 0);
    }
    if (updates.efficace !== undefined) {
      fields.push('efficace = ?');
      values.push(updates.efficace !== undefined ? (updates.efficace ? 1 : 0) : null);
    }
    if (updates.effets_secondaires !== undefined) {
      fields.push('effets_secondaires = ?');
      values.push(updates.effets_secondaires || null);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes || null);
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Traitement introuvable');
      }
      return existing;
    }

    fields.push('derniere_modification = ?');
    values.push(now);
    values.push(id);

    await this.execute(`UPDATE traitements SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Traitement introuvable après mise à jour');
    }
    return updated;
  }

  /**
   * Obtenir les statistiques de traitements
   */
  async getStatistiquesTraitements(projetId: string): Promise<{
    total: number;
    enCours: number;
    termines: number;
    coutTotal: number;
    efficaciteMoyenne: number;
  }> {
    const total = await this.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM traitements WHERE projet_id = ?',
      [projetId]
    );

    const enCours = await this.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM traitements WHERE projet_id = ? AND termine = 0',
      [projetId]
    );

    const termines = await this.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM traitements WHERE projet_id = ? AND termine = 1',
      [projetId]
    );

    const cout = await this.queryOne<{ total: number }>(
      'SELECT COALESCE(SUM(cout), 0) as total FROM traitements WHERE projet_id = ?',
      [projetId]
    );

    const efficacite = await this.queryOne<{ avg: number }>(
      'SELECT COALESCE(AVG(efficace), 0) as avg FROM traitements WHERE projet_id = ? AND efficace IS NOT NULL',
      [projetId]
    );

    return {
      total: total?.count || 0,
      enCours: enCours?.count || 0,
      termines: termines?.count || 0,
      coutTotal: cout?.total || 0,
      efficaciteMoyenne: efficacite?.avg || 0,
    };
  }
}

