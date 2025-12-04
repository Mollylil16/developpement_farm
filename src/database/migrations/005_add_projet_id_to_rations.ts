/**
 * Migration 5 : Ajouter projet_id à la table rations
 * Permet d'associer les rations à un projet spécifique
 * 
 * Version: 5
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addProjetIdToRations(db: SQLiteDatabase): Promise<void> {
  // Vérifier d'abord si la table rations existe
  const rationsTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='rations'"
  );

  if (!rationsTableExists) {
    return; // Table n'existe pas encore, sera créée avec projet_id
  }

  const tableInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('rations') WHERE name = 'projet_id'"
  );

  if (!tableInfo) {
    // La colonne n'existe pas, on l'ajoute
    await db.execAsync(`
      ALTER TABLE rations ADD COLUMN projet_id TEXT;
    `);
    console.log('✅ Migration: Colonne projet_id ajoutée à rations');
  }
}

