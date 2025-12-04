/**
 * Schéma de la table rappels_vaccinations
 * Gère les rappels automatiques de vaccination
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table rappels_vaccinations si elle n'existe pas
 */
export async function createRappelsVaccinationsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS rappels_vaccinations (
      id TEXT PRIMARY KEY,
      vaccination_id TEXT NOT NULL,
      date_rappel TEXT NOT NULL,
      envoi INTEGER DEFAULT 0 CHECK (envoi IN (0, 1)),
      date_envoi TEXT,
      FOREIGN KEY (vaccination_id) REFERENCES vaccinations(id) ON DELETE CASCADE
    );
  `);
}

