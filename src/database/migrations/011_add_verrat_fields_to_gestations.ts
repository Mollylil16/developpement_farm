/**
 * Migration 11 : Ajouter verrat_id et verrat_nom à la table gestations
 * Permet d'identifier le verrat utilisé pour la saillie
 *
 * Version: 11
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addVerratFieldsToGestations(db: SQLiteDatabase): Promise<void> {
  const gestationsTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='gestations'"
  );

  if (!gestationsTableExists) {
    return; // Table n'existe pas encore
  }

  // Ajouter verrat_id
  const verratIdInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('gestations') WHERE name = 'verrat_id'"
  );

  if (!verratIdInfo) {
    await db.execAsync(`
      ALTER TABLE gestations ADD COLUMN verrat_id TEXT;
    `);
    console.log('✅ Migration: Colonne verrat_id ajoutée à gestations');
  }

  // Ajouter verrat_nom
  const verratNomInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('gestations') WHERE name = 'verrat_nom'"
  );

  if (!verratNomInfo) {
    await db.execAsync(`
      ALTER TABLE gestations ADD COLUMN verrat_nom TEXT;
    `);
    console.log('✅ Migration: Colonne verrat_nom ajoutée à gestations');
  }
}
