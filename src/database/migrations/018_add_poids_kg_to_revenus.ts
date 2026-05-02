/**
 * Migration 18 : Ajouter poids_kg à la table revenus
 * Permet de stocker le poids de l'animal lors de la vente
 *
 * Version: 18
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addPoidsKgToRevenus(db: SQLiteDatabase): Promise<void> {
  const revenusColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info('revenus')");

  const hasPoidsKg = revenusColumns.some((col) => col.name === 'poids_kg');

  if (!hasPoidsKg) {
    await db.execAsync(`
      ALTER TABLE revenus ADD COLUMN poids_kg REAL;
    `);
    console.log('✅ Migration: Colonne poids_kg ajoutée à revenus');
  }
}
