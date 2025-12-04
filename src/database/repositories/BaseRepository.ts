/**
 * BaseRepository - Classe abstraite pour tous les repositories
 * 
 * Fournit les fonctionnalités communes:
 * - Gestion de la connexion SQLite
 * - Méthodes CRUD de base
 * - Gestion des transactions
 * - Logging standardisé
 */

import * as SQLite from 'expo-sqlite';

export abstract class BaseRepository<T> {
  protected db: SQLite.SQLiteDatabase;
  protected tableName: string;

  constructor(db: SQLite.SQLiteDatabase, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * Exécuter une requête SELECT et retourner tous les résultats
   */
  protected async query<R = T>(sql: string, params: unknown[] = []): Promise<R[]> {
    try {
      const result = await this.db.getAllAsync<R>(sql, params);
      return result;
    } catch (error) {
      console.error(`[${this.tableName}] Query error:`, error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Exécuter une requête SELECT et retourner un seul résultat
   */
  protected async queryOne<R = T>(sql: string, params: unknown[] = []): Promise<R | null> {
    try {
      const result = await this.db.getFirstAsync<R>(sql, params);
      return result || null;
    } catch (error) {
      console.error(`[${this.tableName}] QueryOne error:`, error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Exécuter une requête INSERT, UPDATE, DELETE
   */
  protected async execute(sql: string, params: unknown[] = []): Promise<SQLite.SQLiteRunResult> {
    try {
      const result = await this.db.runAsync(sql, params);
      return result;
    } catch (error) {
      console.error(`[${this.tableName}] Execute error:`, error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Exécuter plusieurs requêtes dans une transaction
   */
  protected async transaction(callback: () => Promise<void>): Promise<void> {
    try {
      await this.db.withTransactionAsync(async () => {
        await callback();
      });
    } catch (error) {
      console.error(`[${this.tableName}] Transaction error:`, error);
      throw error;
    }
  }

  /**
   * Récupérer tous les enregistrements d'une table
   * ⚠️ Attention: Peut charger beaucoup de données en mémoire
   * Utilisez findAllPaginated() pour les grandes tables
   */
  async findAll(projetId?: string): Promise<T[]> {
    if (projetId) {
      return this.query<T>(
        `SELECT * FROM ${this.tableName} WHERE projet_id = ? ORDER BY derniere_modification DESC`,
        [projetId]
      );
    }
    return this.query<T>(`SELECT * FROM ${this.tableName} ORDER BY derniere_modification DESC`);
  }

  /**
   * Récupérer les enregistrements avec pagination
   * @param options - Options de pagination
   * @returns Résultats paginés avec métadonnées
   */
  async findAllPaginated(options: {
    projetId?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<{
    data: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    const {
      projetId,
      limit = 50,
      offset = 0,
      orderBy = 'derniere_modification',
      orderDirection = 'DESC',
    } = options;

    // Construire la clause WHERE
    let whereClause = '';
    const params: any[] = [];

    if (projetId) {
      whereClause = 'WHERE projet_id = ?';
      params.push(projetId);
    }

    // Compter le total
    const countResult = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`,
      params
    );
    const total = countResult?.count || 0;

    // Récupérer les données paginées
    const data = await this.query<T>(
      `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY ${orderBy} ${orderDirection} LIMIT ? OFFSET ?`,
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
   * Récupérer un enregistrement par ID
   */
  async findById(id: string): Promise<T | null> {
    return this.queryOne<T>(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  /**
   * Supprimer un enregistrement par ID
   */
  async deleteById(id: string): Promise<void> {
    await this.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  /**
   * Compter les enregistrements
   */
  async count(projetId?: string): Promise<number> {
    if (projetId) {
      const result = await this.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE projet_id = ?`,
        [projetId]
      );
      return result?.count || 0;
    }
    const result = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}`
    );
    return result?.count || 0;
  }

  /**
   * Vérifier si un enregistrement existe
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return (result?.count || 0) > 0;
  }

  /**
   * Parser les photos depuis JSON
   * Gère les cas où les photos sont stockées en JSON string dans la DB
   * @param photos - Photos à parser (peut être string JSON, array, null, ou undefined)
   * @returns Array de strings (URIs) ou undefined si invalide
   */
  protected parsePhotos(photos: any): string[] | undefined {
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
   * Méthodes abstraites à implémenter par les repositories enfants
   */
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
}

