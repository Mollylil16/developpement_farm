/**
 * Migration 13 : Ajouter animal_code à la table mortalites
 * Permet d'identifier l'animal par son code
 *
 * Version: 13
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addAnimalCodeToMortalites(db: SQLiteDatabase): Promise<void> {
  const mortalitesTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='mortalites'"
  );

  if (!mortalitesTableExists) {
    return; // Table n'existe pas encore, sera créée avec animal_code
  }

  const animalCodeInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('mortalites') WHERE name = 'animal_code'"
  );

  if (!animalCodeInfo) {
    await db.execAsync(`
      ALTER TABLE mortalites ADD COLUMN animal_code TEXT;
    `);
    console.log('✅ Migration: Colonne animal_code ajoutée à mortalites');
  }
}
