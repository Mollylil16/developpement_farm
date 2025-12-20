/**
 * Schéma de la table planifications
 * Gère les planifications
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table planifications si elle n'existe pas
 */
export async function createPlanificationsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS planifications (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('saillie', 'vaccination', 'sevrage', 'nettoyage', 'alimentation', 'veterinaire', 'autre')),
      titre TEXT NOT NULL,
      description TEXT,
      date_prevue TEXT NOT NULL,
      date_echeance TEXT,
      rappel TEXT,
      statut TEXT NOT NULL CHECK (statut IN ('a_faire', 'en_cours', 'terminee', 'annulee')),
      recurrence TEXT CHECK (recurrence IN ('aucune', 'quotidienne', 'hebdomadaire', 'mensuelle')),
      lien_gestation_id TEXT,
      lien_sevrage_id TEXT,
      notes TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (lien_gestation_id) REFERENCES gestations(id) ON DELETE SET NULL,
      FOREIGN KEY (lien_sevrage_id) REFERENCES sevrages(id) ON DELETE SET NULL
    );
  `);
}
