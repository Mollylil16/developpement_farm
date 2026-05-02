/**
 * Schéma de la table stocks_aliments
 * Gère les stocks d'aliments
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table stocks_aliments si elle n'existe pas
 */
export async function createStocksAlimentsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS stocks_aliments (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      nom TEXT NOT NULL,
      categorie TEXT,
      quantite_actuelle REAL NOT NULL CHECK (quantite_actuelle >= 0),
      unite TEXT NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml', 'sac')),
      seuil_alerte REAL CHECK (seuil_alerte IS NULL OR seuil_alerte >= 0),
      date_derniere_entree TEXT,
      date_derniere_sortie TEXT,
      alerte_active INTEGER DEFAULT 0,
      notes TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );
  `);
}
