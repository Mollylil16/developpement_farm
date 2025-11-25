/**
 * FinanceRepository - Gestion des finances
 * 
 * Responsabilités:
 * - CRUD des revenus
 * - CRUD des dépenses ponctuelles
 * - CRUD des charges fixes
 * - Calculs financiers (solde, statistiques)
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { Revenu, DepensePonctuelle, ChargeFixe } from '../../types/finance';
import uuid from 'react-native-uuid';

/**
 * Repository pour les Revenus
 */
export class RevenuRepository extends BaseRepository<Revenu> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'revenus');
  }
  
  /**
   * Parser les photos depuis JSON
   */
  private parsePhotos(photos: any): string[] | undefined {
    if (!photos) return undefined;
    if (Array.isArray(photos)) return photos;
    if (typeof photos === 'string') {
      try {
        const parsed = JSON.parse(photos);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
  
  /**
   * Surcharge de findAll pour parser les photos
   */
  async findAll(projetId?: string): Promise<Revenu[]> {
    const rows = await super.findAll(projetId);
    return rows.map(row => ({
      ...row,
      photos: this.parsePhotos((row as any).photos)
    }));
  }
  
  /**
   * Surcharge de findById pour parser les photos
   */
  async findById(id: string): Promise<Revenu | null> {
    const row = await super.findById(id);
    if (!row) return null;
    return {
      ...row,
      photos: this.parsePhotos((row as any).photos)
    };
  }

  async create(data: Partial<Revenu>): Promise<Revenu> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO revenus (
        id, projet_id, montant, categorie, date, commentaire,
        description, libelle_categorie, photos, poids_kg, animal_id,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id,
        data.montant,
        data.categorie,
        data.date || now,
        data.commentaire || null,
        data.description || null,
        data.libelle_categorie || null,
        data.photos ? JSON.stringify(data.photos) : null,
        data.poids_kg || null,
        data.animal_id || null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer le revenu');
    }
    return created;
  }

  async update(id: string, data: Partial<Revenu>): Promise<Revenu> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.montant !== undefined) {
      fields.push('montant = ?');
      values.push(data.montant);
    }
    if (data.categorie !== undefined) {
      fields.push('categorie = ?');
      values.push(data.categorie);
    }
    if (data.date !== undefined) {
      fields.push('date = ?');
      values.push(data.date);
    }
    if (data.commentaire !== undefined) {
      fields.push('commentaire = ?');
      values.push(data.commentaire);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.libelle_categorie !== undefined) {
      fields.push('libelle_categorie = ?');
      values.push(data.libelle_categorie);
    }
    if (data.photos !== undefined) {
      fields.push('photos = ?');
      values.push(data.photos ? JSON.stringify(data.photos) : null);
    }
    if (data.poids_kg !== undefined) {
      fields.push('poids_kg = ?');
      values.push(data.poids_kg);
    }
    if (data.animal_id !== undefined) {
      fields.push('animal_id = ?');
      values.push(data.animal_id);
    }

    fields.push('derniere_modification = ?');
    values.push(now);
    values.push(id);

    await this.execute(`UPDATE revenus SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Revenu introuvable après mise à jour');
    }
    return updated;
  }

  /**
   * Récupérer les revenus par période
   */
  async findByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<Revenu[]> {
    const rows = await this.query<any>(
      `SELECT * FROM revenus 
       WHERE projet_id = ? AND date >= ? AND date <= ?
       ORDER BY date DESC`,
      [projetId, dateDebut, dateFin]
    );
    
    // Parser les photos JSON
    return rows.map(row => ({
      ...row,
      photos: this.parsePhotos(row.photos)
    }));
  }

  /**
   * Calculer le total des revenus pour une période
   */
  async getTotalByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<number> {
    const result = await this.queryOne<{ total: number }>(
      `SELECT SUM(montant) as total FROM revenus 
       WHERE projet_id = ? AND date >= ? AND date <= ?`,
      [projetId, dateDebut, dateFin]
    );
    return result?.total || 0;
  }

  /**
   * Statistiques par catégorie
   */
  async getStatsByCategory(
    projetId: string,
    dateDebut?: string,
    dateFin?: string
  ): Promise<Array<{ categorie: string; total: number; count: number }>> {
    let sql = `SELECT categorie, SUM(montant) as total, COUNT(*) as count
               FROM revenus WHERE projet_id = ?`;
    const params: any[] = [projetId];

    if (dateDebut && dateFin) {
      sql += ` AND date >= ? AND date <= ?`;
      params.push(dateDebut, dateFin);
    }

    sql += ` GROUP BY categorie ORDER BY total DESC`;
    return this.query(sql, params);
  }
}

/**
 * Repository pour les Dépenses Ponctuelles
 */
export class DepensePonctuelleRepository extends BaseRepository<DepensePonctuelle> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'depenses_ponctuelles');
  }
  
  /**
   * Parser les photos depuis JSON
   */
  private parsePhotos(photos: any): string[] | undefined {
    if (!photos) return undefined;
    if (Array.isArray(photos)) return photos;
    if (typeof photos === 'string') {
      try {
        const parsed = JSON.parse(photos);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
  
  /**
   * Surcharge de findAll pour parser les photos
   */
  async findAll(projetId?: string): Promise<DepensePonctuelle[]> {
    const rows = await super.findAll(projetId);
    return rows.map(row => ({
      ...row,
      photos: this.parsePhotos((row as any).photos)
    }));
  }
  
  /**
   * Surcharge de findById pour parser les photos
   */
  async findById(id: string): Promise<DepensePonctuelle | null> {
    const row = await super.findById(id);
    if (!row) return null;
    return {
      ...row,
      photos: this.parsePhotos((row as any).photos)
    };
  }

  async create(data: Partial<DepensePonctuelle>): Promise<DepensePonctuelle> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO depenses_ponctuelles (
        id, projet_id, montant, categorie, libelle_categorie, date, 
        commentaire, photos, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id,
        data.montant,
        data.categorie,
        data.libelle_categorie || null,
        data.date || now,
        data.commentaire || null,
        data.photos ? JSON.stringify(data.photos) : null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer la dépense');
    }
    return created;
  }

  async update(id: string, data: Partial<DepensePonctuelle>): Promise<DepensePonctuelle> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.montant !== undefined) {
      fields.push('montant = ?');
      values.push(data.montant);
    }
    if (data.categorie !== undefined) {
      fields.push('categorie = ?');
      values.push(data.categorie);
    }
    if (data.libelle_categorie !== undefined) {
      fields.push('libelle_categorie = ?');
      values.push(data.libelle_categorie);
    }
    if (data.date !== undefined) {
      fields.push('date = ?');
      values.push(data.date);
    }
    if (data.commentaire !== undefined) {
      fields.push('commentaire = ?');
      values.push(data.commentaire);
    }
    if (data.photos !== undefined) {
      fields.push('photos = ?');
      values.push(JSON.stringify(data.photos));
    }

    fields.push('derniere_modification = ?');
    values.push(now);
    values.push(id);

    await this.execute(
      `UPDATE depenses_ponctuelles SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Dépense introuvable après mise à jour');
    }
    return updated;
  }

  async findByPeriod(
    projetId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<DepensePonctuelle[]> {
    const rows = await this.query<any>(
      `SELECT * FROM depenses_ponctuelles 
       WHERE projet_id = ? AND date >= ? AND date <= ?
       ORDER BY date DESC`,
      [projetId, dateDebut, dateFin]
    );
    
    // Parser les photos JSON
    return rows.map(row => ({
      ...row,
      photos: this.parsePhotos(row.photos)
    }));
  }

  async getTotalByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<number> {
    const result = await this.queryOne<{ total: number }>(
      `SELECT SUM(montant) as total FROM depenses_ponctuelles 
       WHERE projet_id = ? AND date >= ? AND date <= ?`,
      [projetId, dateDebut, dateFin]
    );
    return result?.total || 0;
  }

  async getStatsByCategory(
    projetId: string,
    dateDebut?: string,
    dateFin?: string
  ): Promise<Array<{ categorie: string; total: number; count: number }>> {
    let sql = `SELECT categorie, SUM(montant) as total, COUNT(*) as count
               FROM depenses_ponctuelles WHERE projet_id = ?`;
    const params: any[] = [projetId];

    if (dateDebut && dateFin) {
      sql += ` AND date >= ? AND date <= ?`;
      params.push(dateDebut, dateFin);
    }

    sql += ` GROUP BY categorie ORDER BY total DESC`;
    return this.query(sql, params);
  }
}

/**
 * Repository pour les Charges Fixes
 */
export class ChargeFixeRepository extends BaseRepository<ChargeFixe> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'charges_fixes');
  }

  async create(data: Partial<ChargeFixe>): Promise<ChargeFixe> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO charges_fixes (
        id, projet_id, categorie, libelle, montant, date_debut,
        frequence, jour_paiement, notes, statut, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id || null,
        data.categorie,
        data.libelle,
        data.montant,
        data.date_debut || now,
        data.frequence,
        data.jour_paiement || null,
        data.notes || null,
        data.statut || 'actif',
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer la charge fixe');
    }
    return created;
  }

  async update(id: string, data: Partial<ChargeFixe>): Promise<ChargeFixe> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.projet_id !== undefined) {
      fields.push('projet_id = ?');
      values.push(data.projet_id);
    }
    if (data.categorie !== undefined) {
      fields.push('categorie = ?');
      values.push(data.categorie);
    }
    if (data.libelle !== undefined) {
      fields.push('libelle = ?');
      values.push(data.libelle);
    }
    if (data.montant !== undefined) {
      fields.push('montant = ?');
      values.push(data.montant);
    }
    if (data.date_debut !== undefined) {
      fields.push('date_debut = ?');
      values.push(data.date_debut);
    }
    if (data.frequence !== undefined) {
      fields.push('frequence = ?');
      values.push(data.frequence);
    }
    if (data.jour_paiement !== undefined) {
      fields.push('jour_paiement = ?');
      values.push(data.jour_paiement);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }
    if (data.statut !== undefined) {
      fields.push('statut = ?');
      values.push(data.statut);
    }

    fields.push('derniere_modification = ?');
    values.push(now);
    values.push(id);

    await this.execute(`UPDATE charges_fixes SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Charge fixe introuvable après mise à jour');
    }
    return updated;
  }

  /**
   * Récupérer toutes les charges fixes d'un projet
   */
  async findByProjet(projetId: string): Promise<ChargeFixe[]> {
    return this.query<ChargeFixe>(
      `SELECT * FROM charges_fixes 
       WHERE projet_id = ?
       ORDER BY libelle ASC`,
      [projetId]
    );
  }

  /**
   * Récupérer uniquement les charges actives
   */
  async findActiveByProjet(projetId: string): Promise<ChargeFixe[]> {
    return this.query<ChargeFixe>(
      `SELECT * FROM charges_fixes 
       WHERE projet_id = ? AND statut = 'actif'
       ORDER BY libelle ASC`,
      [projetId]
    );
  }

  /**
   * Calculer le total mensuel des charges fixes actives
   */
  async getTotalMensuelActif(projetId: string): Promise<number> {
    const result = await this.queryOne<{ total: number }>(
      `SELECT SUM(montant) as total FROM charges_fixes 
       WHERE projet_id = ? AND statut = 'actif'`,
      [projetId]
    );
    return result?.total || 0;
  }

  /**
   * Activer/Désactiver une charge
   */
  async toggleStatus(id: string): Promise<ChargeFixe> {
    const charge = await this.findById(id);
    if (!charge) {
      throw new Error('Charge fixe introuvable');
    }
    const newStatus = charge.statut === 'actif' ? 'inactif' : 'actif';
    return this.update(id, { statut: newStatus });
  }
}

/**
 * Service principal Finance regroupant tous les repositories
 */
export class FinanceService {
  public revenus: RevenuRepository;
  public depenses: DepensePonctuelleRepository;
  public charges: ChargeFixeRepository;

  constructor(db: SQLite.SQLiteDatabase) {
    this.revenus = new RevenuRepository(db);
    this.depenses = new DepensePonctuelleRepository(db);
    this.charges = new ChargeFixeRepository(db);
  }

  /**
   * Calculer le solde pour une période
   */
  async getSoldeByPeriod(
    projetId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<{
    revenus: number;
    depenses: number;
    charges: number;
    solde: number;
  }> {
    const [totalRevenus, totalDepenses, totalCharges] = await Promise.all([
      this.revenus.getTotalByPeriod(projetId, dateDebut, dateFin),
      this.depenses.getTotalByPeriod(projetId, dateDebut, dateFin),
      this.charges.getTotalMensuelActif(projetId),
    ]);

    // Pour les charges, multiplier par le nombre de mois dans la période
    const moisDebut = new Date(dateDebut);
    const moisFin = new Date(dateFin);
    const nombreMois =
      (moisFin.getFullYear() - moisDebut.getFullYear()) * 12 +
      (moisFin.getMonth() - moisDebut.getMonth()) +
      1;
    const chargesTotal = totalCharges * nombreMois;

    const solde = totalRevenus - (totalDepenses + chargesTotal);

    return {
      revenus: totalRevenus,
      depenses: totalDepenses,
      charges: chargesTotal,
      solde,
    };
  }
}

