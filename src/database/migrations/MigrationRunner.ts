/**
 * MigrationRunner - Système de migrations versionné
 *
 * Gère l'exécution des migrations dans l'ordre et le suivi des migrations appliquées
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
  down?: (db: SQLiteDatabase) => Promise<void>;
}

/**
 * Crée la table de suivi des migrations si elle n'existe pas
 */
async function ensureMigrationsTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Récupère la liste des migrations déjà appliquées
 */
async function getAppliedMigrations(db: SQLiteDatabase): Promise<number[]> {
  const migrations = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version'
  );
  return migrations.map((m) => m.version);
}

/**
 * Marque une migration comme appliquée
 */
async function markMigrationApplied(
  db: SQLiteDatabase,
  version: number,
  name: string
): Promise<void> {
  await db.runAsync('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [version, name]);
}

/**
 * Exécute toutes les migrations en attente dans l'ordre
 */
export async function runMigrations(db: SQLiteDatabase, migrations: Migration[]): Promise<void> {
  await ensureMigrationsTable(db);
  const appliedMigrations = await getAppliedMigrations(db);

  // Trier les migrations par version
  const sortedMigrations = [...migrations].sort((a, b) => a.version - b.version);

  for (const migration of sortedMigrations) {
    // Vérifier si la migration a déjà été appliquée
    if (appliedMigrations.includes(migration.version)) {
      console.log(`⏭️  Migration ${migration.version}: ${migration.name} déjà appliquée`);
      continue;
    }

    try {
      console.log(`🔄 Application de la migration ${migration.version}: ${migration.name}...`);

      // Exécuter dans une transaction pour garantir l'atomicité
      await db.execAsync('BEGIN TRANSACTION;');
      try {
        await migration.up(db);
        await markMigrationApplied(db, migration.version, migration.name);
        await db.execAsync('COMMIT;');
        console.log(`✅ Migration ${migration.version}: ${migration.name} appliquée avec succès`);
      } catch (error: unknown) {
        await db.execAsync('ROLLBACK;');
        throw error;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `❌ Erreur lors de la migration ${migration.version}: ${migration.name}`,
        errorMessage
      );
      // Arrêter le processus en cas d'erreur - les migrations doivent être idempotentes
      throw new Error(
        `Migration ${migration.version} (${migration.name}) a échoué: ${(error as any).message}`
      );
    }
  }
}
