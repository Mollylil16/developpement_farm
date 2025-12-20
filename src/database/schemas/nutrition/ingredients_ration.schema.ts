/**
 * Schéma de la table ingredients_ration
 * Table de liaison entre rations et ingredients
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table ingredients_ration si elle n'existe pas
 */
export async function createIngredientsRationTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ingredients_ration (
      id TEXT PRIMARY KEY,
      ration_id TEXT NOT NULL,
      ingredient_id TEXT NOT NULL,
      quantite REAL NOT NULL CHECK (quantite > 0),
      FOREIGN KEY (ration_id) REFERENCES rations(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
    );
  `);
}
