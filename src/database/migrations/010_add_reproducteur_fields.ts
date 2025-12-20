/**
 * Migration 10 : Ajouter reproducteur, pere_id et mere_id à production_animaux
 * Permet de gérer la généalogie et identifier les reproducteurs
 *
 * Version: 10
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addReproducteurFields(db: SQLiteDatabase): Promise<void> {
  // Ajouter reproducteur
  const reproducteurInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'reproducteur'"
  );

  if (!reproducteurInfo) {
    await db.execAsync(`
      ALTER TABLE production_animaux ADD COLUMN reproducteur INTEGER DEFAULT 0 
      CHECK (reproducteur IN (0, 1));
    `);
    await db.execAsync(`
      UPDATE production_animaux SET reproducteur = 0 WHERE reproducteur IS NULL;
    `);
    console.log('✅ Migration: Colonne reproducteur ajoutée à production_animaux');
  }

  // Ajouter pere_id
  const pereInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'pere_id'"
  );

  if (!pereInfo) {
    await db.execAsync(`
      ALTER TABLE production_animaux ADD COLUMN pere_id TEXT;
    `);
    console.log('✅ Migration: Colonne pere_id ajoutée à production_animaux');
  }

  // Ajouter mere_id
  const mereInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'mere_id'"
  );

  if (!mereInfo) {
    await db.execAsync(`
      ALTER TABLE production_animaux ADD COLUMN mere_id TEXT;
    `);
    console.log('✅ Migration: Colonne mere_id ajoutée à production_animaux');
  }
}
