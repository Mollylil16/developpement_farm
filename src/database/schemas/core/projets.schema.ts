/**
 * Schéma de la table projets
 * Gère les projets (fermes) de l'application
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table projets si elle n'existe pas
 */
export async function createProjetsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS projets (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      localisation TEXT NOT NULL,
      nombre_truies INTEGER NOT NULL,
      nombre_verrats INTEGER NOT NULL,
      nombre_porcelets INTEGER NOT NULL,
      poids_moyen_actuel REAL NOT NULL,
      age_moyen_actuel INTEGER NOT NULL,
      notes TEXT,
      statut TEXT NOT NULL CHECK (statut IN ('actif', 'archive', 'suspendu')),
      proprietaire_id TEXT NOT NULL,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

