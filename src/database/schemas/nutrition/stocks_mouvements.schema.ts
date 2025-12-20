/**
 * Schéma de la table stocks_mouvements
 * Gère les mouvements de stocks (entrées, sorties, ajustements)
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table stocks_mouvements si elle n'existe pas
 */
export async function createStocksMouvementsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS stocks_mouvements (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      aliment_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('entree', 'sortie', 'ajustement')),
      quantite REAL NOT NULL CHECK (quantite > 0),
      unite TEXT NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml', 'sac')),
      date TEXT NOT NULL,
      origine TEXT,
      commentaire TEXT,
      cree_par TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (aliment_id) REFERENCES stocks_aliments(id) ON DELETE CASCADE
    );
  `);
}
