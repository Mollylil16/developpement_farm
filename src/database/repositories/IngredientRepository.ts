/**
 * IngredientRepository - Gestion des ingrédients
 * 
 * Responsabilités:
 * - CRUD des ingrédients
 * - Les ingrédients sont partagés entre tous les projets
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { Ingredient, CreateIngredientInput } from '../../types/nutrition';
import uuid from 'react-native-uuid';

export class IngredientRepository extends BaseRepository<Ingredient> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'ingredients');
  }

  /**
   * Créer un nouvel ingrédient
   */
  async create(input: CreateIngredientInput): Promise<Ingredient> {
    const id = uuid.v4() as string;
    const date_creation = new Date().toISOString();

    await this.execute(
      `INSERT INTO ingredients (
        id, nom, unite, prix_unitaire, proteine_pourcent, energie_kcal, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.nom,
        input.unite,
        input.prix_unitaire,
        input.proteine_pourcent || null,
        input.energie_kcal || null,
        date_creation,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer l\'ingrédient');
    }
    return created;
  }

  /**
   * Mettre à jour un ingrédient
   */
  async update(id: string, updates: Partial<CreateIngredientInput>): Promise<Ingredient> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.nom !== undefined) {
      fields.push('nom = ?');
      values.push(updates.nom);
    }
    if (updates.unite !== undefined) {
      fields.push('unite = ?');
      values.push(updates.unite);
    }
    if (updates.prix_unitaire !== undefined) {
      fields.push('prix_unitaire = ?');
      values.push(updates.prix_unitaire);
    }
    if (updates.proteine_pourcent !== undefined) {
      fields.push('proteine_pourcent = ?');
      values.push(updates.proteine_pourcent || null);
    }
    if (updates.energie_kcal !== undefined) {
      fields.push('energie_kcal = ?');
      values.push(updates.energie_kcal || null);
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('Ingrédient introuvable');
      return existing;
    }

    values.push(id);

    await this.execute(`UPDATE ingredients SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Ingrédient introuvable après mise à jour');
    }
    return updated;
  }

  /**
   * Récupérer tous les ingrédients (partagés entre tous les projets)
   */
  async findAll(): Promise<Ingredient[]> {
    return this.query<Ingredient>('SELECT * FROM ingredients ORDER BY nom ASC');
  }

  /**
   * Récupérer tous les ingrédients (alias pour compatibilité)
   */
  async getAllIngredients(projetId?: string): Promise<Ingredient[]> {
    // Les ingrédients sont partagés, projetId est ignoré
    return this.findAll();
  }
}

