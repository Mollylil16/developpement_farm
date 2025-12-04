/**
 * RationRepository - Gestion des rations
 * 
 * Responsabilités:
 * - CRUD des rations
 * - Gestion des ingrédients de ration
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import {
  Ration,
  CreateRationInput,
  IngredientRation,
  RationBudget,
  CreateRationBudgetInput,
  UpdateRationBudgetInput,
} from '../../types/nutrition';
import uuid from 'react-native-uuid';

export class RationRepository extends BaseRepository<Ration> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'rations');
  }

  /**
   * Créer une nouvelle ration avec ses ingrédients
   */
  async create(input: CreateRationInput): Promise<Ration> {
    const id = uuid.v4() as string;
    const date_creation = new Date().toISOString();

    // Créer la ration
    await this.execute(
      `INSERT INTO rations (
        id, projet_id, type_porc, poids_kg, nombre_porcs, cout_total, cout_par_kg, notes, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.projet_id,
        input.type_porc,
        input.poids_kg,
        input.nombre_porcs || null,
        null, // cout_total calculé après
        null, // cout_par_kg calculé après
        input.notes || null,
        date_creation,
      ]
    );

    // Ajouter les ingrédients
    for (const ing of input.ingredients) {
      const ingId = uuid.v4() as string;
      await this.execute(
        `INSERT INTO ingredients_ration (id, ration_id, ingredient_id, quantite)
         VALUES (?, ?, ?, ?)`,
        [ingId, id, ing.ingredient_id, ing.quantite]
      );
    }

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer la ration');
    }
    return created;
  }

  /**
   * Récupérer une ration par ID avec ses ingrédients
   */
  async findById(id: string): Promise<Ration | null> {
    const ration = await this.queryOne<any>('SELECT * FROM rations WHERE id = ?', [id]);

    if (!ration) {
      return null;
    }

    // Récupérer les ingrédients
    const ingredientsRation = await this.query<any>(
      `SELECT ir.*, i.nom, i.unite, i.prix_unitaire, i.proteine_pourcent, i.energie_kcal
       FROM ingredients_ration ir
       JOIN ingredients i ON ir.ingredient_id = i.id
       WHERE ir.ration_id = ?`,
      [id]
    );

    return {
      ...ration,
      ingredients: ingredientsRation.map((ir) => ({
        id: ir.id,
        ration_id: ir.ration_id,
        ingredient_id: ir.ingredient_id,
        quantite: ir.quantite,
        ingredient: {
          id: ir.ingredient_id,
          nom: ir.nom,
          unite: ir.unite,
          prix_unitaire: ir.prix_unitaire,
          proteine_pourcent: ir.proteine_pourcent,
          energie_kcal: ir.energie_kcal,
          date_creation: '',
        },
      })),
    };
  }

  /**
   * Récupérer toutes les rations d'un projet
   */
  async findByProjet(projetId: string): Promise<Ration[]> {
    const rations = await this.query<any>(
      'SELECT * FROM rations WHERE projet_id = ? ORDER BY date_creation DESC',
      [projetId]
    );

    // Récupérer les ingrédients pour chaque ration
    const rationsWithIngredients = await Promise.all(
      rations.map(async (ration) => {
        const ingredientsRation = await this.query<any>(
          `SELECT ir.*, i.nom, i.unite, i.prix_unitaire, i.proteine_pourcent, i.energie_kcal
           FROM ingredients_ration ir
           JOIN ingredients i ON ir.ingredient_id = i.id
           WHERE ir.ration_id = ?`,
          [ration.id]
        );

        return {
          ...ration,
          ingredients: ingredientsRation.map((ir) => ({
            id: ir.id,
            ration_id: ir.ration_id,
            ingredient_id: ir.ingredient_id,
            quantite: ir.quantite,
            ingredient: {
              id: ir.ingredient_id,
              nom: ir.nom,
              unite: ir.unite,
              prix_unitaire: ir.prix_unitaire,
              proteine_pourcent: ir.proteine_pourcent,
              energie_kcal: ir.energie_kcal,
              date_creation: '',
            },
          })),
        };
      })
    );

    return rationsWithIngredients;
  }

  /**
   * Supprimer une ration et ses ingrédients
   */
  async delete(id: string): Promise<void> {
    await this.transaction(async () => {
      // Supprimer d'abord les ingrédients de la ration
      await this.execute('DELETE FROM ingredients_ration WHERE ration_id = ?', [id]);
      // Puis supprimer la ration
      await this.deleteById(id);
    });
  }

  // ============================================
  // MÉTHODES POUR RATIONS BUDGET (Budgétisation Aliment)
  // ============================================

  /**
   * Créer une ration budget
   */
  async createRationBudget(input: CreateRationBudgetInput): Promise<RationBudget> {
    const id = uuid.v4() as string;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;

    // Convertir les ingrédients en JSON pour stockage
    const ingredientsJson = JSON.stringify(input.ingredients);

    try {
      await this.execute(
        `INSERT INTO rations_budget (
          id, projet_id, nom, type_porc, poids_moyen_kg, nombre_porcs, duree_jours,
          ration_journaliere_par_porc, quantite_totale_kg, cout_total, cout_par_kg, cout_par_porc,
          ingredients, notes, date_creation, derniere_modification
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.projet_id,
          input.nom,
          input.type_porc,
          input.poids_moyen_kg,
          input.nombre_porcs,
          input.duree_jours,
          input.ration_journaliere_par_porc,
          input.quantite_totale_kg,
          input.cout_total,
          input.cout_par_kg,
          input.cout_par_porc,
          ingredientsJson,
          input.notes || null,
          date_creation,
          derniere_modification,
        ]
      );

      const created = await this.findRationBudgetById(id);
      if (!created) {
        throw new Error('Impossible de récupérer la ration budget créée');
      }
      return created;
    } catch (error: unknown) {
      console.error('Erreur lors de la création de la ration budget:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création de la ration budget';
      throw new Error(errorMessage);
    }
  }

  /**
   * Récupérer une ration budget par ID
   */
  async findRationBudgetById(id: string): Promise<RationBudget | null> {
    const row = await this.queryOne<any>(
      'SELECT * FROM rations_budget WHERE id = ?',
      [id]
    );

    if (!row) {
      return null;
    }

    // Parser les ingrédients depuis JSON
    let ingredients: RationBudget['ingredients'] = [];
    try {
      if (row.ingredients) {
        ingredients = typeof row.ingredients === 'string' 
          ? JSON.parse(row.ingredients) 
          : row.ingredients;
      }
    } catch (error) {
      console.warn('Erreur lors du parsing des ingrédients:', error);
      ingredients = [];
    }

    return {
      id: row.id,
      projet_id: row.projet_id,
      nom: row.nom,
      type_porc: row.type_porc,
      poids_moyen_kg: row.poids_moyen_kg,
      nombre_porcs: row.nombre_porcs,
      duree_jours: row.duree_jours,
      ration_journaliere_par_porc: row.ration_journaliere_par_porc,
      quantite_totale_kg: row.quantite_totale_kg,
      cout_total: row.cout_total,
      cout_par_kg: row.cout_par_kg,
      cout_par_porc: row.cout_par_porc,
      ingredients,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  /**
   * Récupérer toutes les rations budget d'un projet
   */
  async findRationsBudgetByProjet(projetId: string): Promise<RationBudget[]> {
    const rows = await this.query<any>(
      'SELECT * FROM rations_budget WHERE projet_id = ? ORDER BY date_creation DESC',
      [projetId]
    );

    return rows.map((row) => {
      // Parser les ingrédients depuis JSON
      let ingredients: RationBudget['ingredients'] = [];
      try {
        if (row.ingredients) {
          ingredients = typeof row.ingredients === 'string' 
            ? JSON.parse(row.ingredients) 
            : row.ingredients;
        }
      } catch (error) {
        console.warn('Erreur lors du parsing des ingrédients:', error);
        ingredients = [];
      }

      return {
        id: row.id,
        projet_id: row.projet_id,
        nom: row.nom,
        type_porc: row.type_porc,
        poids_moyen_kg: row.poids_moyen_kg,
        nombre_porcs: row.nombre_porcs,
        duree_jours: row.duree_jours,
        ration_journaliere_par_porc: row.ration_journaliere_par_porc,
        quantite_totale_kg: row.quantite_totale_kg,
        cout_total: row.cout_total,
        cout_par_kg: row.cout_par_kg,
        cout_par_porc: row.cout_par_porc,
        ingredients,
        notes: row.notes || undefined,
        date_creation: row.date_creation,
        derniere_modification: row.derniere_modification,
      };
    });
  }

  /**
   * Mettre à jour une ration budget
   */
  async updateRationBudget(
    id: string,
    updates: UpdateRationBudgetInput
  ): Promise<RationBudget | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.nom !== undefined) {
      fields.push('nom = ?');
      values.push(updates.nom);
    }
    if (updates.type_porc !== undefined) {
      fields.push('type_porc = ?');
      values.push(updates.type_porc);
    }
    if (updates.poids_moyen_kg !== undefined) {
      fields.push('poids_moyen_kg = ?');
      values.push(updates.poids_moyen_kg);
    }
    if (updates.nombre_porcs !== undefined) {
      fields.push('nombre_porcs = ?');
      values.push(updates.nombre_porcs);
    }
    if (updates.duree_jours !== undefined) {
      fields.push('duree_jours = ?');
      values.push(updates.duree_jours);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes || null);
    }

    if (fields.length === 0) {
      return this.findRationBudgetById(id);
    }

    // Toujours mettre à jour la date de modification
    fields.push('derniere_modification = ?');
    values.push(new Date().toISOString());

    values.push(id);

    await this.execute(
      `UPDATE rations_budget SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findRationBudgetById(id);
  }

  /**
   * Supprimer une ration budget
   */
  async deleteRationBudget(id: string): Promise<void> {
    await this.execute('DELETE FROM rations_budget WHERE id = ?', [id]);
  }
}

