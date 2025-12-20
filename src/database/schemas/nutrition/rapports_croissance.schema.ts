/**
 * Schéma de la table rapports_croissance
 * Gère les rapports de croissance
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table rapports_croissance si elle n'existe pas
 */
export async function createRapportsCroissanceTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS rapports_croissance (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      date TEXT NOT NULL,
      poids_moyen REAL NOT NULL,
      nombre_porcs INTEGER NOT NULL,
      gain_quotidien REAL,
      poids_cible REAL,
      notes TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );
  `);
}
