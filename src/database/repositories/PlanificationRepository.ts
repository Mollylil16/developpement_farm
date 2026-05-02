/**
 * PlanificationRepository - Gestion des planifications
 *
 * Responsabilités:
 * - CRUD des planifications
 */

import { BaseRepository } from './BaseRepository';
import { Planification } from '../../types/planification';

export class PlanificationRepository extends BaseRepository<Planification> {
  constructor() {
    super('planifications', '/planification');
  }

  /**
   * Créer une nouvelle planification
   */
  async create(
    data: Omit<Planification, 'id' | 'date_creation' | 'derniere_modification'>
  ): Promise<Planification> {
    const planificationData = {
      ...data,
      statut: data.statut || 'a_faire',
    };
    return this.executePost<Planification>(this.apiBasePath, planificationData);
  }

  /**
   * Mettre à jour une planification
   */
  async update(id: string, updates: Partial<Planification>): Promise<Planification> {
    return this.executePatch<Planification>(`${this.apiBasePath}/${id}`, updates);
  }

  /**
   * Récupérer toutes les planifications d'un projet
   * ⚠️ Attention: Peut charger beaucoup de données en mémoire
   * Utilisez findByProjetPaginated() pour les projets avec beaucoup de planifications
   */
  async findByProjet(projetId: string): Promise<Planification[]> {
    return this.query<Planification>(this.apiBasePath, {
      projet_id: projetId,
      order_by: 'date_prevue',
      order_direction: 'ASC',
    });
  }

  /**
   * Récupérer les planifications d'un projet avec pagination
   */
  async findByProjetPaginated(
    projetId: string,
    options: {
      limit?: number;
      offset?: number;
      statut?: string;
    } = {}
  ): Promise<{
    data: Planification[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    const { limit = 50, offset = 0, statut } = options;
    const params: Record<string, unknown> = {
      projet_id: projetId,
      limit,
      offset,
      order_by: 'date_prevue',
      order_direction: 'ASC',
    };
    if (statut) {
      params.statut = statut;
    }

    const result = await this.findAllPaginated({
      projetId,
      limit,
      offset,
      orderBy: 'date_prevue',
      orderDirection: 'ASC',
    });

    // Filtrer par statut si nécessaire
    let data = result.data;
    if (statut) {
      data = data.filter((p) => p.statut === statut);
    }

    return {
      data,
      total: result.total,
      limit,
      offset,
      hasMore: result.hasMore,
    };
  }

  /**
   * Récupérer les planifications par statut
   */
  async findByStatut(statut: string): Promise<Planification[]> {
    return this.query<Planification>(this.apiBasePath, {
      statut,
      order_by: 'date_prevue',
      order_direction: 'ASC',
    });
  }

  /**
   * Récupérer les planifications par période
   */
  async findByPeriod(dateDebut: string, dateFin: string): Promise<Planification[]> {
    return this.query<Planification>(this.apiBasePath, {
      date_debut: dateDebut,
      date_fin: dateFin,
      order_by: 'date_prevue',
      order_direction: 'ASC',
    });
  }

  /**
   * Récupérer les planifications à venir
   */
  async findAVenir(projetId: string, jours: number = 7): Promise<Planification[]> {
    const aujourdhui = new Date().toISOString().split('T')[0];
    const dateFin = new Date();
    dateFin.setDate(dateFin.getDate() + jours);
    const dateFinStr = dateFin.toISOString().split('T')[0];

    return this.query<Planification>(this.apiBasePath, {
      projet_id: projetId,
      date_debut: aujourdhui,
      date_fin: dateFinStr,
      statut: ['a_faire', 'en_cours'],
      order_by: 'date_prevue',
      order_direction: 'ASC',
    });
  }
}
