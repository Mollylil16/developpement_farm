/**
 * RationRepository - Gestion des rations
 *
 * Responsabilités:
 * - CRUD des rations
 * - Gestion des ingrédients de ration
 */

import { BaseRepository } from './BaseRepository';
import {
  Ration,
  CreateRationInput,
  IngredientRation,
  RationBudget,
  CreateRationBudgetInput,
  UpdateRationBudgetInput,
} from '../../types/nutrition';

export class RationRepository extends BaseRepository<Ration> {
  constructor() {
    super('rations', '/nutrition/rations');
  }

  /**
   * Créer une nouvelle ration avec ses ingrédients
   */
  async create(input: CreateRationInput): Promise<Ration> {
    return this.executePost<Ration>(this.apiBasePath, input);
  }

  /**
   * Récupérer une ration par ID avec ses ingrédients
   */
  async findById(id: string): Promise<Ration | null> {
    return this.queryOne<Ration>(`${this.apiBasePath}/${id}`);
  }

  /**
   * Récupérer toutes les rations d'un projet
   */
  async findByProjet(projetId: string): Promise<Ration[]> {
    return this.query<Ration>(this.apiBasePath, {
      projet_id: projetId,
      order_by: 'date_creation',
      order_direction: 'DESC',
    });
  }

  /**
   * Supprimer une ration et ses ingrédients
   */
  async delete(id: string): Promise<void> {
    await this.executeDelete(`${this.apiBasePath}/${id}`);
  }

  // ============================================
  // MÉTHODES POUR RATIONS BUDGET (Budgétisation Aliment)
  // ============================================

  /**
   * Créer une ration budget
   */
  async createRationBudget(input: CreateRationBudgetInput): Promise<RationBudget> {
    return this.executePost<RationBudget>(`${this.apiBasePath}/budget`, input);
  }

  /**
   * Récupérer une ration budget par ID
   */
  async findRationBudgetById(id: string): Promise<RationBudget | null> {
    return this.queryOne<RationBudget>(`${this.apiBasePath}/budget/${id}`);
  }

  /**
   * Récupérer toutes les rations budget d'un projet
   */
  async findRationsBudgetByProjet(projetId: string): Promise<RationBudget[]> {
    return this.query<RationBudget>(`${this.apiBasePath}/budget`, {
      projet_id: projetId,
      order_by: 'date_creation',
      order_direction: 'DESC',
    });
  }

  /**
   * Mettre à jour une ration budget
   */
  async updateRationBudget(
    id: string,
    updates: UpdateRationBudgetInput
  ): Promise<RationBudget | null> {
    return this.executePatch<RationBudget>(`${this.apiBasePath}/budget/${id}`, updates);
  }

  /**
   * Supprimer une ration budget
   */
  async deleteRationBudget(id: string): Promise<void> {
    await this.executeDelete(`${this.apiBasePath}/budget/${id}`);
  }
}
