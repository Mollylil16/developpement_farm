/**
 * Service de gestion des migrations
 * Fournit des utilitaires pour gérer les migrations
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { runMigrations } from './MigrationRunner';
import { migrations } from './index';

export interface MigrationStatus {
  version: number;
  name: string;
  applied: boolean;
  appliedAt?: string;
}

export class MigrationService {
  /**
   * Exécute toutes les migrations en attente
   */
  static async runPendingMigrations(db: SQLiteDatabase): Promise<void> {
    await runMigrations(db, migrations);
  }

  /**
   * Récupère le statut de toutes les migrations
   */
  static async getMigrationStatus(db: SQLiteDatabase): Promise<MigrationStatus[]> {
    // Créer la table si elle n'existe pas
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Récupérer les migrations appliquées
    const applied = await db.getAllAsync<{ version: number; name: string; applied_at: string }>(
      'SELECT version, name, applied_at FROM schema_migrations ORDER BY version'
    );

    const appliedMap = new Map(
      applied.map((m) => [m.version, { name: m.name, appliedAt: m.applied_at }])
    );

    // Construire le statut pour toutes les migrations
    return migrations.map((migration) => {
      const appliedInfo = appliedMap.get(migration.version);
      return {
        version: migration.version,
        name: migration.name,
        applied: !!appliedInfo,
        appliedAt: appliedInfo?.appliedAt,
      };
    });
  }

  /**
   * Vérifie si une migration spécifique a été appliquée
   */
  static async isMigrationApplied(db: SQLiteDatabase, version: number): Promise<boolean> {
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM schema_migrations WHERE version = ?',
      [version]
    );
    return (result?.count || 0) > 0;
  }

  /**
   * Récupère la dernière migration appliquée
   */
  static async getLastAppliedMigration(
    db: SQLiteDatabase
  ): Promise<{ version: number; name: string; appliedAt: string } | null> {
    const result = await db.getFirstAsync<{
      version: number;
      name: string;
      applied_at: string;
    }>('SELECT version, name, applied_at FROM schema_migrations ORDER BY version DESC LIMIT 1');

    if (!result) {
      return null;
    }

    return {
      version: result.version,
      name: result.name,
      appliedAt: result.applied_at,
    };
  }

  /**
   * Récupère le nombre de migrations en attente
   */
  static async getPendingMigrationsCount(db: SQLiteDatabase): Promise<number> {
    const status = await this.getMigrationStatus(db);
    return status.filter((m) => !m.applied).length;
  }
}
