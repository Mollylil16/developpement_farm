/**
 * Schéma de la table charges_fixes
 * Gère les charges fixes récurrentes
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table charges_fixes si elle n'existe pas
 */
export async function createChargesFixesTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS charges_fixes (
      id TEXT PRIMARY KEY,
      projet_id TEXT,
      categorie TEXT NOT NULL CHECK (categorie IN ('loyer', 'salaire', 'assurance', 'eau', 'electricite', 'autre')),
      libelle TEXT NOT NULL,
      montant REAL NOT NULL CHECK (montant >= 0),
      type_opex_capex TEXT CHECK (type_opex_capex IN ('opex', 'capex')),
      date_debut TEXT NOT NULL,
      frequence TEXT NOT NULL CHECK (frequence IN ('mensuel', 'trimestriel', 'annuel')),
      jour_paiement INTEGER CHECK (jour_paiement IS NULL OR (jour_paiement >= 1 AND jour_paiement <= 31)),
      notes TEXT,
      statut TEXT NOT NULL CHECK (statut IN ('actif', 'suspendu', 'termine')),
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );
  `);
}

