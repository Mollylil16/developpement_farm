/**
 * Migration 21 : Synchroniser actif avec statut pour production_animaux
 * Assure la cohérence entre les deux colonnes
 * 
 * Version: 21
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function syncActifStatut(db: SQLiteDatabase): Promise<void> {
  const actifInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'actif'"
  );

  if (actifInfo) {
    // La colonne actif existe, synchroniser avec statut
    await db.execAsync(`
      UPDATE production_animaux 
      SET actif = CASE 
        WHEN statut = 'actif' THEN 1 
        ELSE 0 
      END
      WHERE actif IS NULL OR actif != CASE WHEN statut = 'actif' THEN 1 ELSE 0 END;
    `);
    console.log('✅ Migration: Colonne actif synchronisée avec statut');
  }
}

