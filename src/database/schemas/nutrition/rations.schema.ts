/**
 * Schéma de la table rations
 * Gère les rations alimentaires
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table rations si elle n'existe pas
 */
export async function createRationsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS rations (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      type_porc TEXT NOT NULL CHECK (type_porc IN ('porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance')),
      poids_kg REAL NOT NULL,
      nombre_porcs INTEGER,
      cout_total REAL,
      cout_par_kg REAL,
      notes TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );
  `);
}

