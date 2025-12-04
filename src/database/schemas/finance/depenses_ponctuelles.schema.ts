/**
 * Schéma de la table depenses_ponctuelles
 * Gère les dépenses ponctuelles
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table depenses_ponctuelles si elle n'existe pas
 */
export async function createDepensesPonctuellesTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS depenses_ponctuelles (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      montant REAL NOT NULL CHECK (montant >= 0),
      categorie TEXT NOT NULL CHECK (categorie IN ('aliment', 'medicament', 'equipement', 'maintenance', 'transport', 'autre')),
      libelle_categorie TEXT,
      type_opex_capex TEXT CHECK (type_opex_capex IN ('opex', 'capex')),
      duree_amortissement_mois INTEGER CHECK (duree_amortissement_mois IS NULL OR duree_amortissement_mois > 0),
      date TEXT NOT NULL,
      commentaire TEXT,
      photos TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );
  `);
}

