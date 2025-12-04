/**
 * Schéma de la table rations_budget
 * Gère la budgétisation d'aliment
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table rations_budget si elle n'existe pas
 */
export async function createRationsBudgetTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS rations_budget (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      nom TEXT NOT NULL,
      type_porc TEXT NOT NULL CHECK (type_porc IN ('porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance')),
      poids_moyen_kg REAL NOT NULL,
      nombre_porcs INTEGER NOT NULL,
      duree_jours INTEGER NOT NULL,
      ration_journaliere_par_porc REAL NOT NULL,
      quantite_totale_kg REAL NOT NULL,
      cout_total REAL NOT NULL,
      cout_par_kg REAL NOT NULL,
      cout_par_porc REAL NOT NULL,
      ingredients TEXT NOT NULL,
      notes TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );
  `);
}

