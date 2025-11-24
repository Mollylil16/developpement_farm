/**
 * GestationRepository - Gestion des gestations
 * 
 * Responsabilités:
 * - CRUD des gestations
 * - Suivi des saillies et mises bas
 * - Alertes de mise bas imminente
 * - Statistiques de reproduction
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { Gestation } from '../../types/reproduction';
import uuid from 'react-native-uuid';
import { addDays, differenceInDays, parseISO } from 'date-fns';

export class GestationRepository extends BaseRepository<Gestation> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'gestations');
  }

  /**
   * Créer une nouvelle gestation
   */
  async create(data: Partial<Gestation>): Promise<Gestation> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    // Calculer la date de mise bas prévue (114 jours après saillie)
    const dateSautage = data.date_sautage || now;
    const dateMiseBasPrevue = addDays(new Date(dateSautage), 114).toISOString();

    await this.execute(
      `INSERT INTO gestations (
        id, projet_id, truie_id, verrat_id, date_sautage,
        date_mise_bas_prevue, statut, nombre_porcelets_prevu,
        notes, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id,
        data.truie_id,
        data.verrat_id || null,
        dateSautage,
        dateMiseBasPrevue,
        data.statut || 'en_cours',
        data.nombre_porcelets_prevu || null,
        data.notes || null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer la gestation');
    }
    return created;
  }

  /**
   * Mettre à jour une gestation
   */
  async update(id: string, data: Partial<Gestation>): Promise<Gestation> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.verrat_id !== undefined) {
      fields.push('verrat_id = ?');
      values.push(data.verrat_id);
    }
    if (data.date_sautage !== undefined) {
      fields.push('date_sautage = ?');
      values.push(data.date_sautage);
      // Recalculer date_mise_bas_prevue
      fields.push('date_mise_bas_prevue = ?');
      values.push(addDays(new Date(data.date_sautage), 114).toISOString());
    }
    if (data.date_mise_bas_reelle !== undefined) {
      fields.push('date_mise_bas_reelle = ?');
      values.push(data.date_mise_bas_reelle);
    }
    if (data.statut !== undefined) {
      fields.push('statut = ?');
      values.push(data.statut);
    }
    if (data.nombre_porcelets_prevu !== undefined) {
      fields.push('nombre_porcelets_prevu = ?');
      values.push(data.nombre_porcelets_prevu);
    }
    if (data.nombre_porcelets_reel !== undefined) {
      fields.push('nombre_porcelets_reel = ?');
      values.push(data.nombre_porcelets_reel);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    fields.push('derniere_modification = ?');
    values.push(now);
    values.push(id);

    await this.execute(
      `UPDATE gestations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Gestation introuvable après mise à jour');
    }
    return updated;
  }

  /**
   * Récupérer les gestations en cours d'un projet
   */
  async findEnCoursByProjet(projetId: string): Promise<Gestation[]> {
    return this.query<Gestation>(
      `SELECT * FROM gestations 
       WHERE projet_id = ? AND statut = 'en_cours'
       ORDER BY date_mise_bas_prevue ASC`,
      [projetId]
    );
  }

  /**
   * Récupérer les gestations par truie
   */
  async findByTruie(truieId: string): Promise<Gestation[]> {
    return this.query<Gestation>(
      `SELECT * FROM gestations 
       WHERE truie_id = ?
       ORDER BY date_sautage DESC`,
      [truieId]
    );
  }

  /**
   * Récupérer la gestation en cours d'une truie
   */
  async findGestationEnCoursForTruie(truieId: string): Promise<Gestation | null> {
    return this.queryOne<Gestation>(
      `SELECT * FROM gestations 
       WHERE truie_id = ? AND statut = 'en_cours'
       ORDER BY date_sautage DESC
       LIMIT 1`,
      [truieId]
    );
  }

  /**
   * Récupérer les gestations nécessitant une alerte (mise bas imminente)
   */
  async findGestationsAvecAlerte(projetId: string, joursAvant: number = 7): Promise<Gestation[]> {
    const dateAujourdhui = new Date().toISOString();
    const dateLimite = addDays(new Date(), joursAvant).toISOString();

    return this.query<Gestation>(
      `SELECT * FROM gestations 
       WHERE projet_id = ? 
       AND statut = 'en_cours'
       AND date_mise_bas_prevue >= ?
       AND date_mise_bas_prevue <= ?
       ORDER BY date_mise_bas_prevue ASC`,
      [projetId, dateAujourdhui, dateLimite]
    );
  }

  /**
   * Marquer une gestation comme terminée (mise bas effectuée)
   */
  async terminerGestation(
    id: string,
    dateMiseBas: string,
    nombrePorcelets: number
  ): Promise<Gestation> {
    return this.update(id, {
      statut: 'terminee',
      date_mise_bas_reelle: dateMiseBas,
      nombre_porcelets_reel: nombrePorcelets,
    });
  }

  /**
   * Annuler une gestation
   */
  async annulerGestation(id: string, raison?: string): Promise<Gestation> {
    const notes = raison ? `Annulée: ${raison}` : 'Annulée';
    return this.update(id, {
      statut: 'annulee',
      notes,
    });
  }

  /**
   * Statistiques de reproduction
   */
  async getStats(projetId: string): Promise<{
    total: number;
    enCours: number;
    terminees: number;
    annulees: number;
    moyennePorcelets: number;
    tauxReussite: number;
  }> {
    const stats = await this.queryOne<any>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'en_cours' THEN 1 ELSE 0 END) as enCours,
        SUM(CASE WHEN statut = 'terminee' THEN 1 ELSE 0 END) as terminees,
        SUM(CASE WHEN statut = 'annulee' THEN 1 ELSE 0 END) as annulees,
        AVG(CASE WHEN statut = 'terminee' AND nombre_porcelets_reel IS NOT NULL 
            THEN nombre_porcelets_reel ELSE NULL END) as moyennePorcelets
       FROM gestations
       WHERE projet_id = ?`,
      [projetId]
    );

    const total = stats?.total || 0;
    const terminees = stats?.terminees || 0;
    const tauxReussite = total > 0 ? (terminees / total) * 100 : 0;

    return {
      total,
      enCours: stats?.enCours || 0,
      terminees,
      annulees: stats?.annulees || 0,
      moyennePorcelets: stats?.moyennePorcelets || 0,
      tauxReussite,
    };
  }

  /**
   * Récupérer les gestations par période
   */
  async findByPeriod(
    projetId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<Gestation[]> {
    return this.query<Gestation>(
      `SELECT * FROM gestations 
       WHERE projet_id = ? 
       AND date_sautage >= ? 
       AND date_sautage <= ?
       ORDER BY date_sautage DESC`,
      [projetId, dateDebut, dateFin]
    );
  }

  /**
   * Vérifier si une truie a déjà une gestation en cours
   */
  async truieAGestationEnCours(truieId: string): Promise<boolean> {
    const result = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM gestations 
       WHERE truie_id = ? AND statut = 'en_cours'`,
      [truieId]
    );
    return (result?.count || 0) > 0;
  }

  /**
   * Récupérer l'historique de reproduction d'une truie
   */
  async getHistoriqueReproduction(truieId: string): Promise<{
    nombreGestations: number;
    nombreReussies: number;
    nombreAnnulees: number;
    totalPorcelets: number;
    moyennePorceletsParPortee: number;
  }> {
    const stats = await this.queryOne<any>(
      `SELECT 
        COUNT(*) as nombreGestations,
        SUM(CASE WHEN statut = 'terminee' THEN 1 ELSE 0 END) as nombreReussies,
        SUM(CASE WHEN statut = 'annulee' THEN 1 ELSE 0 END) as nombreAnnulees,
        SUM(CASE WHEN statut = 'terminee' AND nombre_porcelets_reel IS NOT NULL 
            THEN nombre_porcelets_reel ELSE 0 END) as totalPorcelets,
        AVG(CASE WHEN statut = 'terminee' AND nombre_porcelets_reel IS NOT NULL 
            THEN nombre_porcelets_reel ELSE NULL END) as moyennePorceletsParPortee
       FROM gestations
       WHERE truie_id = ?`,
      [truieId]
    );

    return {
      nombreGestations: stats?.nombreGestations || 0,
      nombreReussies: stats?.nombreReussies || 0,
      nombreAnnulees: stats?.nombreAnnulees || 0,
      totalPorcelets: stats?.totalPorcelets || 0,
      moyennePorceletsParPortee: stats?.moyennePorceletsParPortee || 0,
    };
  }
}
