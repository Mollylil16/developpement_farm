/**
 * Schéma de la table production_pesees
 * Gère les pesées des animaux
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table production_pesees si elle n'existe pas
 */
export async function createProductionPeseesTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS production_pesees (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      animal_id TEXT NOT NULL,
      date TEXT NOT NULL,
      poids_kg REAL NOT NULL CHECK (poids_kg > 0),
      gmq REAL,
      difference_standard REAL,
      commentaire TEXT,
      cree_par TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE CASCADE
    );
  `);
}
