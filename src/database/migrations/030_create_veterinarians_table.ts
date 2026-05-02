/**
 * Migration 030: Création de la table veterinarians
 *
 * Cette table permet de stocker les informations des vétérinaires
 * pour la fonctionnalité de recherche géographique
 */

import * as SQLite from 'expo-sqlite';
import { migrationLogger } from '../../utils/logger';

export async function createVeterinariansTableMigration(db: SQLite.SQLiteDatabase): Promise<void> {
  migrationLogger.step('Migration 030: Création de la table veterinarians');

  try {
    // Vérifier si la table existe déjà
    const tableExists = await db.getFirstAsync<{ name: string } | null>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='veterinarians'"
    );

    if (tableExists) {
      migrationLogger.info('Table veterinarians existe déjà');
      return;
    }

    // Créer la table
    await db.execAsync(`
      CREATE TABLE veterinarians (
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
    `);

    // Créer l'index pour recherche géographique
    await db.execAsync(`
      CREATE INDEX idx_vet_location ON veterinarians(latitude, longitude);
    `);

    migrationLogger.success('✅ Migration 030 terminée: Table veterinarians créée');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    migrationLogger.error('❌ Erreur lors de la migration 030:', errorMessage);
    throw error;
  }
}
