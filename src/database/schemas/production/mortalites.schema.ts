/**
 * Schéma de la table mortalites
 * Gère les mortalités
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table mortalites si elle n'existe pas
 */
export async function createMortalitesTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS mortalites (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      nombre_porcs INTEGER NOT NULL CHECK (nombre_porcs > 0),
      date TEXT NOT NULL,
      cause TEXT,
      categorie TEXT NOT NULL CHECK (categorie IN ('porcelet', 'truie', 'verrat', 'autre')),
      animal_code TEXT,
      poids_kg REAL CHECK (poids_kg IS NULL OR poids_kg > 0),
      notes TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );
  `);
}
