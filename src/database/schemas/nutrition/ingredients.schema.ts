/**
 * Schéma de la table ingredients
 * Gère les ingrédients pour les rations
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table ingredients si elle n'existe pas
 */
export async function createIngredientsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      unite TEXT NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml', 'sac')),
      prix_unitaire REAL NOT NULL CHECK (prix_unitaire >= 0),
      proteine_pourcent REAL CHECK (proteine_pourcent IS NULL OR (proteine_pourcent >= 0 AND proteine_pourcent <= 100)),
      energie_kcal REAL CHECK (energie_kcal IS NULL OR energie_kcal >= 0),
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

