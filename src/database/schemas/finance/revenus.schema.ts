/**
 * Schéma de la table revenus
 * Gère les revenus
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table revenus si elle n'existe pas
 */
export async function createRevenusTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS revenus (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      montant REAL NOT NULL CHECK (montant >= 0),
      categorie TEXT NOT NULL CHECK (categorie IN ('vente_porc', 'vente_autre', 'subvention', 'autre')),
      libelle_categorie TEXT,
      date TEXT NOT NULL,
      description TEXT,
      commentaire TEXT,
      photos TEXT,
      poids_kg REAL CHECK (poids_kg IS NULL OR poids_kg > 0),
      animal_id TEXT,
      cout_kg_opex REAL CHECK (cout_kg_opex IS NULL OR cout_kg_opex >= 0),
      cout_kg_complet REAL CHECK (cout_kg_complet IS NULL OR cout_kg_complet >= 0),
      cout_reel_opex REAL CHECK (cout_reel_opex IS NULL OR cout_reel_opex >= 0),
      cout_reel_complet REAL CHECK (cout_reel_complet IS NULL OR cout_reel_complet >= 0),
      marge_opex REAL,
      marge_complete REAL,
      marge_opex_pourcent REAL CHECK (marge_opex_pourcent IS NULL OR (marge_opex_pourcent >= -100 AND marge_opex_pourcent <= 100)),
      marge_complete_pourcent REAL CHECK (marge_complete_pourcent IS NULL OR (marge_complete_pourcent >= -100 AND marge_complete_pourcent <= 100)),
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE SET NULL
    );
  `);
}

