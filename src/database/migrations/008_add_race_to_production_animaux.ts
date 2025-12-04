/**
 * Migration 8 : Ajouter race à la table production_animaux
 * Permet de spécifier la race de l'animal
 * 
 * Version: 8
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addRaceToProductionAnimaux(db: SQLiteDatabase): Promise<void> {
  const raceInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'race'"
  );

  if (!raceInfo) {
    await db.execAsync(`
      ALTER TABLE production_animaux ADD COLUMN race TEXT;
    `);
    console.log('✅ Migration: Colonne race ajoutée à production_animaux');
  }
}

