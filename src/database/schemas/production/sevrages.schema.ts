/**
 * Schéma de la table sevrages
 * Gère les sevrages
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table sevrages si elle n'existe pas
 */
export async function createSevragesTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sevrages (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      gestation_id TEXT NOT NULL,
      date_sevrage TEXT NOT NULL,
      nombre_porcelets_sevres INTEGER NOT NULL,
      poids_moyen_sevrage REAL,
      notes TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (gestation_id) REFERENCES gestations(id) ON DELETE CASCADE
    );
  `);
}

