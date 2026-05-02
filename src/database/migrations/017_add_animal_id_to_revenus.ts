/**
 * Migration 17 : Ajouter animal_id à la table revenus
 * Permet d'associer un revenu à un animal spécifique
 *
 * Version: 17
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addAnimalIdToRevenus(db: SQLiteDatabase): Promise<void> {
  const revenusColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info('revenus')");

  const hasAnimalId = revenusColumns.some((col) => col.name === 'animal_id');

  if (!hasAnimalId) {
    await db.execAsync(`
      ALTER TABLE revenus ADD COLUMN animal_id TEXT;
    `);
    console.log('✅ Migration: Colonne animal_id ajoutée à revenus');
  }
}
