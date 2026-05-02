/**
 * Schéma de la table regional_pork_price
 * Stocke le prix régional du porc poids vif avec historique
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table regional_pork_price si elle n'existe pas
 */
export async function createRegionalPorkPriceTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS regional_pork_price (
      id TEXT PRIMARY KEY,
      price REAL NOT NULL CHECK (price > 0),
      source TEXT NOT NULL CHECK (source IN ('api', 'manual', 'default')),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Index pour les requêtes par date
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_regional_pork_price_updated 
    ON regional_pork_price(updated_at DESC);
  `);
}
