/**
 * Schéma de la table veterinarians
 * Gère les vétérinaires disponibles pour recherche
 */

import * as SQLite from 'expo-sqlite';
import { createTableSafely } from '../schemas/utils';
import { schemaLogger } from '../../utils/logger';

/**
 * Crée la table veterinarians si elle n'existe pas
 */
export async function createVeterinariansTable(db: SQLite.SQLiteDatabase): Promise<void> {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS veterinarians (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      specialties TEXT,
      rating REAL DEFAULT 0,
      reviews_count INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `;

  await createTableSafely(db, 'veterinarians', createTableSql);

  // Créer l'index pour recherche géographique
  try {
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_vet_location ON veterinarians(latitude, longitude);
    `);
    schemaLogger.success('Index idx_vet_location créé pour veterinarians');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    schemaLogger.warn("Erreur lors de la création de l'index idx_vet_location:", errorMessage);
  }
}
