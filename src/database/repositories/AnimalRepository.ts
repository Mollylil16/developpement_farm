/**
 * AnimalRepository - Gestion des animaux de production
 * 
 * Responsabilités:
 * - CRUD des animaux (truies, verrats, porcelets)
 * - Recherche et filtrage
 * - Statistiques du cheptel
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { ProductionAnimal } from '../../types/production';
import uuid from 'react-native-uuid';

export class AnimalRepository extends BaseRepository<ProductionAnimal> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'production_animaux');
  }

  /**
   * Créer un nouvel animal
   */
  async create(data: Partial<ProductionAnimal>): Promise<ProductionAnimal> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO production_animaux (
        id, projet_id, code, nom, sexe, race, date_naissance,
        reproducteur, statut, photo_uri, origine, date_entree, poids_initial, 
        notes, pere_id, mere_id, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id,
        data.code,
        data.nom || null,
        data.sexe,
        data.race || null,
        data.date_naissance || null,
        data.reproducteur ? 1 : 0,
        data.statut || 'actif',
        data.photo_uri || null,
        data.origine || null,
        data.date_entree || null,
        data.poids_initial || null,
        data.notes || null,
        data.pere_id || null,
        data.mere_id || null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer l\'animal');
    }
    return created;
  }

  /**
   * Mettre à jour un animal
   */
  async update(id: string, data: Partial<ProductionAnimal>): Promise<ProductionAnimal> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    // Construire dynamiquement la requête UPDATE - TOUS les champs supportés
    if (data.code !== undefined) {
      fields.push('code = ?');
      values.push(data.code);
    }
    if (data.nom !== undefined) {
      fields.push('nom = ?');
      values.push(data.nom);
    }
    if (data.sexe !== undefined) {
      fields.push('sexe = ?');
      values.push(data.sexe);
    }
    if (data.race !== undefined) {
      fields.push('race = ?');
      values.push(data.race);
    }
    if (data.date_naissance !== undefined) {
      fields.push('date_naissance = ?');
      values.push(data.date_naissance);
    }
    if (data.reproducteur !== undefined) {
      fields.push('reproducteur = ?');
      values.push(data.reproducteur ? 1 : 0);
    }
    if (data.statut !== undefined) {
      fields.push('statut = ?');
      values.push(data.statut);
    }
    if (data.photo_uri !== undefined) {
      fields.push('photo_uri = ?');
      values.push(data.photo_uri);
    }
    if (data.pere_id !== undefined) {
      fields.push('pere_id = ?');
      values.push(data.pere_id);
    }
    if (data.mere_id !== undefined) {
      fields.push('mere_id = ?');
      values.push(data.mere_id);
    }
    if (data.origine !== undefined) {
      fields.push('origine = ?');
      values.push(data.origine);
    }
    if (data.date_entree !== undefined) {
      fields.push('date_entree = ?');
      values.push(data.date_entree);
    }
    if (data.poids_initial !== undefined) {
      fields.push('poids_initial = ?');
      values.push(data.poids_initial);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    // Toujours mettre à jour derniere_modification
    fields.push('derniere_modification = ?');
    values.push(now);

    if (fields.length === 1) { // Si seulement derniere_modification
      throw new Error('Aucune donnée à mettre à jour');
    }

    values.push(id);
    await this.execute(
      `UPDATE production_animaux SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Animal introuvable après mise à jour');
    }
    return updated;
  }

  /**
   * Récupérer tous les animaux d'un projet (actifs et inactifs)
   */
  async findByProjet(projetId: string): Promise<ProductionAnimal[]> {
    return this.query<ProductionAnimal>(
      `SELECT * FROM production_animaux 
       WHERE projet_id = ?
       ORDER BY date_creation DESC`,
      [projetId]
    );
  }

  /**
   * Récupérer les animaux actifs d'un projet
   */
  async findActiveByProjet(projetId: string): Promise<ProductionAnimal[]> {
    return this.query<ProductionAnimal>(
      `SELECT * FROM production_animaux 
       WHERE projet_id = ? AND statut = 'actif'
       ORDER BY date_creation DESC`,
      [projetId]
    );
  }

  /**
   * Récupérer les reproducteurs (truies et verrats)
   */
  async findReproducteursByProjet(
    projetId: string,
    sexe?: 'male' | 'femelle'
  ): Promise<ProductionAnimal[]> {
    let sql = `SELECT * FROM production_animaux 
               WHERE projet_id = ? AND reproducteur = 1 AND statut = 'actif'`;
    const params: any[] = [projetId];

    if (sexe) {
      sql += ` AND sexe = ?`;
      params.push(sexe);
    }

    sql += ` ORDER BY code ASC`;
    return this.query<ProductionAnimal>(sql, params);
  }

  /**
   * Rechercher un animal par son code
   */
  async findByCode(code: string, projetId?: string): Promise<ProductionAnimal | null> {
    if (projetId) {
      return this.queryOne<ProductionAnimal>(
        `SELECT * FROM production_animaux WHERE code = ? AND projet_id = ?`,
        [code, projetId]
      );
    }
    return this.queryOne<ProductionAnimal>(
      `SELECT * FROM production_animaux WHERE code = ?`,
      [code]
    );
  }

  /**
   * Vérifier si un code existe déjà
   */
  async codeExists(code: string, projetId?: string, excludeId?: string): Promise<boolean> {
    let sql = `SELECT COUNT(*) as count FROM production_animaux WHERE code = ?`;
    const params: any[] = [code];

    if (projetId) {
      sql += ` AND projet_id = ?`;
      params.push(projetId);
    }

    if (excludeId) {
      sql += ` AND id != ?`;
      params.push(excludeId);
    }

    const result = await this.queryOne<{ count: number }>(sql, params);
    return (result?.count || 0) > 0;
  }

  /**
   * Statistiques du cheptel
   */
  async getStats(projetId: string): Promise<{
    total: number;
    actifs: number;
    truies: number;
    verrats: number;
    porcelets: number;
    vendus: number;
    morts: number;
  }> {
    const stats = await this.queryOne<any>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'actif' THEN 1 ELSE 0 END) as actifs,
        SUM(CASE WHEN sexe = 'femelle' AND reproducteur = 1 AND statut = 'actif' THEN 1 ELSE 0 END) as truies,
        SUM(CASE WHEN sexe = 'male' AND reproducteur = 1 AND statut = 'actif' THEN 1 ELSE 0 END) as verrats,
        SUM(CASE WHEN reproducteur = 0 AND statut = 'actif' THEN 1 ELSE 0 END) as porcelets,
        SUM(CASE WHEN statut = 'vendu' THEN 1 ELSE 0 END) as vendus,
        SUM(CASE WHEN statut = 'mort' THEN 1 ELSE 0 END) as morts
       FROM production_animaux
       WHERE projet_id = ?`,
      [projetId]
    );

    return {
      total: stats?.total || 0,
      actifs: stats?.actifs || 0,
      truies: stats?.truies || 0,
      verrats: stats?.verrats || 0,
      porcelets: stats?.porcelets || 0,
      vendus: stats?.vendus || 0,
      morts: stats?.morts || 0,
    };
  }

  /**
   * Marquer un animal comme vendu
   */
  async markAsSold(id: string, dateVente?: string): Promise<ProductionAnimal> {
    return this.update(id, {
      statut: 'vendu',
      // On pourrait ajouter un champ date_vente si nécessaire
    });
  }

  /**
   * Marquer un animal comme mort
   */
  async markAsDead(id: string): Promise<ProductionAnimal> {
    return this.update(id, {
      statut: 'mort',
    });
  }

  /**
   * Récupérer les animaux par statut
   */
  async findByStatut(
    projetId: string,
    statut: 'actif' | 'vendu' | 'mort'
  ): Promise<ProductionAnimal[]> {
    return this.query<ProductionAnimal>(
      `SELECT * FROM production_animaux 
       WHERE projet_id = ? AND statut = ?
       ORDER BY derniere_modification DESC`,
      [projetId, statut]
    );
  }
}

