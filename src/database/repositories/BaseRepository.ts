/**
 * BaseRepository - Classe abstraite pour tous les repositories
 *
 * Fournit les fonctionnalités communes:
 * - Gestion de la connexion API (PostgreSQL via backend)
 * - Méthodes CRUD de base
 * - Gestion des transactions (via API)
 * - Logging standardisé
 */

import apiClient, { APIError } from '../../services/api/apiClient';

export abstract class BaseRepository<T> {
  protected tableName: string;
  protected apiBasePath: string;

  constructor(tableName: string, apiBasePath: string) {
    this.tableName = tableName;
    this.apiBasePath = apiBasePath;
  }

  /**
   * Exécuter une requête GET et retourner tous les résultats
   */
  protected async query<R = T>(endpoint: string, params?: Record<string, unknown>): Promise<R[]> {
    try {
      const result = await apiClient.get<R[]>(endpoint, { params });
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error(`[${this.tableName}] Query error:`, error);
      console.error('Endpoint:', endpoint);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Exécuter une requête GET et retourner un seul résultat
   * @param silent403 Si true, les erreurs 403 sont gérées silencieusement (retourne null)
   * Utile dans le contexte du marketplace où on peut essayer d'accéder à des ressources d'autres utilisateurs
   */
  protected async queryOne<R = T>(
    endpoint: string,
    params?: Record<string, unknown>,
    options?: { silent403?: boolean }
  ): Promise<R | null> {
    try {
      const result = await apiClient.get<R>(endpoint, { params });
      return result || null;
    } catch (error) {
      // Si silent403 est activé et que c'est une erreur 403, retourner null silencieusement
      // C'est normal dans le contexte du marketplace où on peut voir des animaux d'autres producteurs
      if (options?.silent403 && error instanceof APIError && error.status === 403) {
        if (__DEV__) {
          console.warn(`[${this.tableName}] QueryOne 403 (silencieux):`, endpoint, 'Cet animal/ressource n\'appartient pas à l\'utilisateur');
        }
        return null;
      }

      // Pour les autres erreurs, logger et relancer
      if (__DEV__) {
        console.error(`[${this.tableName}] QueryOne error:`, error);
        console.error('Endpoint:', endpoint);
        console.error('Params:', params);
      }
      throw error;
    }
  }

  /**
   * Exécuter une requête POST
   */
  protected async executePost<R = T>(endpoint: string, data?: unknown, options?: { timeout?: number }): Promise<R> {
    try {
      const result = await apiClient.post<R>(endpoint, data, options);
      return result;
    } catch (error) {
      console.error(`[${this.tableName}] Execute POST error:`, error);
      console.error('Endpoint:', endpoint);
      console.error('Data:', data);
      throw error;
    }
  }

  /**
   * Exécuter une requête PATCH
   */
  protected async executePatch<R = T>(endpoint: string, data?: unknown): Promise<R> {
    try {
      const result = await apiClient.patch<R>(endpoint, data);
      return result;
    } catch (error) {
      console.error(`[${this.tableName}] Execute PATCH error:`, error);
      console.error('Endpoint:', endpoint);
      console.error('Data:', data);
      throw error;
    }
  }

  /**
   * Exécuter une requête DELETE
   */
  protected async executeDelete(endpoint: string): Promise<void> {
    try {
      await apiClient.delete(endpoint);
    } catch (error) {
      console.error(`[${this.tableName}] Execute DELETE error:`, error);
      console.error('Endpoint:', endpoint);
      throw error;
    }
  }

  /**
   * Récupérer tous les enregistrements d'une table
   * ⚠️ Attention: Peut charger beaucoup de données en mémoire
   * Utilisez findAllPaginated() pour les grandes tables
   */
  async findAll(projetId?: string): Promise<T[]> {
    const params: Record<string, unknown> = {};
    if (projetId) {
      params.projet_id = projetId;
    }
    return this.query<T>(this.apiBasePath, params);
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

    const params: Record<string, unknown> = {
      limit,
      offset,
      order_by: orderBy,
      order_direction: orderDirection,
    };

    if (projetId) {
      params.projet_id = projetId;
    }

    const result = await this.query<T>(this.apiBasePath, params);
    
    // Le backend devrait retourner les métadonnées de pagination
    // Pour l'instant, on simule avec les données reçues
    return {
      data: result,
      total: result.length,
      limit,
      offset,
      hasMore: result.length === limit,
    };
  }

  /**
   * Récupérer un enregistrement par ID
   * @param silent403 Si true, les erreurs 403 sont gérées silencieusement (retourne null)
   */
  async findById(id: string, options?: { silent403?: boolean }): Promise<T | null> {
    return this.queryOne<T>(`${this.apiBasePath}/${id}`, undefined, options);
  }

  /**
   * Supprimer un enregistrement par ID
   */
  async deleteById(id: string): Promise<void> {
    await this.executeDelete(`${this.apiBasePath}/${id}`);
  }

  /**
   * Compter les enregistrements
   */
  async count(projetId?: string): Promise<number> {
    const params: Record<string, unknown> = { count: true };
    if (projetId) {
      params.projet_id = projetId;
    }
    const result = await this.queryOne<{ count: number }>(this.apiBasePath, params);
    return result?.count || 0;
  }

  /**
   * Vérifier si un enregistrement existe
   */
  async exists(id: string): Promise<boolean> {
    try {
      const result = await this.findById(id);
      return result !== null;
    } catch {
      return false;
    }
  }

  /**
   * Parser les photos depuis JSON
   * Gère les cas où les photos sont stockées en JSON string dans la DB
   * @param photos - Photos à parser (peut être string JSON, array, null, ou undefined)
   * @returns Array de strings (URIs) ou undefined si invalide
   */
  protected parsePhotos(photos: unknown): string[] | undefined {
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
