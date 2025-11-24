/**
 * SevrageRepository - Gestion des sevrages
 * 
 * Responsabilités:
 * - CRUD des sevrages
 * - Suivi post-mise bas
 * - Calculs de performance (taux de survie)
 * - Alertes de sevrage imminent
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { Sevrage } from '../../types/reproduction';
import uuid from 'react-native-uuid';

export class SevrageRepository extends BaseRepository<Sevrage> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'sevrages');
  }

  /**
   * Créer un nouveau sevrage
   */
  async create(data: Partial<Sevrage>): Promise<Sevrage> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO sevrages (
        id, projet_id, gestation_id, date_sevrage,
        nombre_porcelets, poids_moyen_kg, notes,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id,
        data.gestation_id,
        data.date_sevrage || now,
        data.nombre_porcelets || 0,
        data.poids_moyen_kg || null,
        data.notes || null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer le sevrage');
    }
    return created;
  }

  /**
   * Mettre à jour un sevrage
   */
  async update(id: string, data: Partial<Sevrage>): Promise<Sevrage> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.date_sevrage !== undefined) {
      fields.push('date_sevrage = ?');
      values.push(data.date_sevrage);
    }
    if (data.nombre_porcelets !== undefined) {
      fields.push('nombre_porcelets = ?');
      values.push(data.nombre_porcelets);
    }
    if (data.poids_moyen_kg !== undefined) {
      fields.push('poids_moyen_kg = ?');
      values.push(data.poids_moyen_kg);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    fields.push('derniere_modification = ?');
    values.push(now);
    values.push(id);

    await this.execute(`UPDATE sevrages SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Sevrage introuvable après mise à jour');
    }
    return updated;
  }

  /**
   * Récupérer tous les sevrages d'un projet
   */
  async findByProjet(projetId: string): Promise<Sevrage[]> {
    return this.query<Sevrage>(
      `SELECT * FROM sevrages 
       WHERE projet_id = ?
       ORDER BY date_sevrage DESC`,
      [projetId]
    );
  }

  /**
   * Récupérer le sevrage d'une gestation
   */
  async findByGestation(gestationId: string): Promise<Sevrage | null> {
    return this.queryOne<Sevrage>(
      `SELECT * FROM sevrages 
       WHERE gestation_id = ?
       LIMIT 1`,
      [gestationId]
    );
  }

  /**
   * Vérifier si une gestation a déjà un sevrage
   */
  async gestationASevrage(gestationId: string): Promise<boolean> {
    const result = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM sevrages 
       WHERE gestation_id = ?`,
      [gestationId]
    );
    return (result?.count || 0) > 0;
  }

  /**
   * Récupérer les sevrages par période
   */
  async findByPeriod(
    projetId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<Sevrage[]> {
    return this.query<Sevrage>(
      `SELECT * FROM sevrages 
       WHERE projet_id = ? 
       AND date_sevrage >= ? 
       AND date_sevrage <= ?
       ORDER BY date_sevrage DESC`,
      [projetId, dateDebut, dateFin]
    );
  }

  /**
   * Statistiques des sevrages
   */
  async getStats(projetId: string): Promise<{
    total: number;
    totalPorceletsSevrages: number;
    moyennePorceletsParSevrage: number;
    poidsMoyenGlobal: number;
  }> {
    const stats = await this.queryOne<any>(
      `SELECT 
        COUNT(*) as total,
        SUM(nombre_porcelets) as totalPorceletsSevrages,
        AVG(nombre_porcelets) as moyennePorceletsParSevrage,
        AVG(poids_moyen_kg) as poidsMoyenGlobal
       FROM sevrages
       WHERE projet_id = ?`,
      [projetId]
    );

    return {
      total: stats?.total || 0,
      totalPorceletsSevrages: stats?.totalPorceletsSevrages || 0,
      moyennePorceletsParSevrage: stats?.moyennePorceletsParSevrage || 0,
      poidsMoyenGlobal: stats?.poidsMoyenGlobal || 0,
    };
  }

  /**
   * Calculer le taux de survie (porcelets sevrés / porcelets nés)
   */
  async getTauxSurvie(projetId: string): Promise<number> {
    const result = await this.queryOne<any>(
      `SELECT 
        SUM(s.nombre_porcelets) as porceletsSevrages,
        SUM(g.nombre_porcelets_reel) as porceletsNes
       FROM sevrages s
       INNER JOIN gestations g ON s.gestation_id = g.id
       WHERE s.projet_id = ?`,
      [projetId]
    );

    const porceletsSevrages = result?.porceletsSevrages || 0;
    const porceletsNes = result?.porceletsNes || 0;

    if (porceletsNes === 0) {
      return 0;
    }

    return (porceletsSevrages / porceletsNes) * 100;
  }

  /**
   * Récupérer les sevrages récents (X derniers jours)
   */
  async findRecents(projetId: string, nombreJours: number = 30): Promise<Sevrage[]> {
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - nombreJours);
    const dateDebutStr = dateDebut.toISOString();

    return this.query<Sevrage>(
      `SELECT * FROM sevrages 
       WHERE projet_id = ? AND date_sevrage >= ?
       ORDER BY date_sevrage DESC`,
      [projetId, dateDebutStr]
    );
  }

  /**
   * Récupérer les performances par truie (via gestations)
   */
  async getPerformancesByTruie(truieId: string): Promise<{
    nombreSevrages: number;
    totalPorceletsSevrages: number;
    moyennePorceletsParSevrage: number;
    poidsMoyenSevrages: number;
  }> {
    const stats = await this.queryOne<any>(
      `SELECT 
        COUNT(*) as nombreSevrages,
        SUM(s.nombre_porcelets) as totalPorceletsSevrages,
        AVG(s.nombre_porcelets) as moyennePorceletsParSevrage,
        AVG(s.poids_moyen_kg) as poidsMoyenSevrages
       FROM sevrages s
       INNER JOIN gestations g ON s.gestation_id = g.id
       WHERE g.truie_id = ?`,
      [truieId]
    );

    return {
      nombreSevrages: stats?.nombreSevrages || 0,
      totalPorceletsSevrages: stats?.totalPorceletsSevrages || 0,
      moyennePorceletsParSevrage: stats?.moyennePorceletsParSevrage || 0,
      poidsMoyenSevrages: stats?.poidsMoyenSevrages || 0,
    };
  }
}

