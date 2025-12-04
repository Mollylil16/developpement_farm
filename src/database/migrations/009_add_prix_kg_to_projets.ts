/**
 * Migration 9 : Ajouter prix_kg_vif et prix_kg_carcasse à la table projets
 * Permet de définir les prix de référence pour les calculs financiers
 * 
 * Version: 9
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addPrixKgToProjets(db: SQLiteDatabase): Promise<void> {
  const projetsTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='projets'"
  );

  if (!projetsTableExists) {
    return; // Table n'existe pas encore
  }

  const prixVifInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('projets') WHERE name = 'prix_kg_vif'"
  );

  if (!prixVifInfo) {
    await db.execAsync(`
      ALTER TABLE projets ADD COLUMN prix_kg_vif REAL;
    `);
    console.log('✅ Migration: Colonne prix_kg_vif ajoutée à projets');
  }

  const prixCarcasseInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('projets') WHERE name = 'prix_kg_carcasse'"
  );

  if (!prixCarcasseInfo) {
    await db.execAsync(`
      ALTER TABLE projets ADD COLUMN prix_kg_carcasse REAL;
    `);
    console.log('✅ Migration: Colonne prix_kg_carcasse ajoutée à projets');
  }
}

