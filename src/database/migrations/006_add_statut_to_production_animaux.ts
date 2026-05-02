/**
 * Migration 6 : Ajouter statut à la table production_animaux
 * Remplace partiellement la colonne actif avec plus de granularité
 *
 * Version: 6
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addStatutToProductionAnimaux(db: SQLiteDatabase): Promise<void> {
  const statutInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'statut'"
  );

  if (!statutInfo) {
    // La colonne n'existe pas, on l'ajoute
    await db.execAsync(`
      ALTER TABLE production_animaux ADD COLUMN statut TEXT DEFAULT 'actif' 
      CHECK (statut IN ('actif', 'mort', 'vendu', 'offert', 'autre'));
    `);

    // Pour les animaux existants, définir le statut basé sur actif
    await db.execAsync(`
      UPDATE production_animaux 
      SET statut = CASE 
        WHEN actif = 1 THEN 'actif' 
        ELSE 'autre' 
      END
      WHERE statut IS NULL;
    `);

    console.log('✅ Migration: Colonne statut ajoutée à production_animaux');
  }
}
