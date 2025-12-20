/**
 * IngredientRepository - Gestion des ingrédients
 *
 * Responsabilités:
 * - CRUD des ingrédients
 * - Les ingrédients sont partagés entre tous les projets
 */

import { BaseRepository } from './BaseRepository';
import { Ingredient, CreateIngredientInput } from '../../types/nutrition';

export class IngredientRepository extends BaseRepository<Ingredient> {
  constructor() {
    super('ingredients', '/nutrition/ingredients');
  }

  /**
   * Créer un nouvel ingrédient
   */
  async create(input: CreateIngredientInput): Promise<Ingredient> {
    return this.executePost<Ingredient>(this.apiBasePath, input);
  }

  /**
   * Mettre à jour un ingrédient
   */
  async update(id: string, updates: Partial<CreateIngredientInput>): Promise<Ingredient> {
    return this.executePatch<Ingredient>(`${this.apiBasePath}/${id}`, updates);
  }

  /**
   * Récupérer tous les ingrédients (partagés entre tous les projets)
   */
  async findAll(): Promise<Ingredient[]> {
    return this.query<Ingredient>(this.apiBasePath, { order_by: 'nom', order_direction: 'ASC' });
  }

  /**
   * Récupérer tous les ingrédients (alias pour compatibilité)
   */
  async getAllIngredients(projetId?: string): Promise<Ingredient[]> {
    // Les ingrédients sont partagés, projetId est ignoré
    return this.findAll();
  }
}
