/**
 * Migration 12 : Ajouter projet_id à la table gestations
 * Permet d'associer les gestations à un projet spécifique
 * 
 * Version: 12
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addProjetIdToGestations(db: SQLiteDatabase): Promise<void> {
  const gestationsTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='gestations'"
  );

  if (!gestationsTableExists) {
    return; // Table n'existe pas encore, sera créée avec projet_id
  }

  const gestationsProjetIdInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('gestations') WHERE name = 'projet_id'"
  );

  if (!gestationsProjetIdInfo) {
    await db.execAsync(`
      ALTER TABLE gestations ADD COLUMN projet_id TEXT;
    `);
    
    // Mettre à jour les gestations existantes avec le premier projet actif (si disponible)
    const premierProjet = await db.getFirstAsync<{ id: string } | null>(
      'SELECT id FROM projets ORDER BY date_creation ASC LIMIT 1'
    );
    if (premierProjet) {
      await db.runAsync(
        'UPDATE gestations SET projet_id = ? WHERE projet_id IS NULL',
        [premierProjet.id]
      );
    }
    
    console.log('✅ Migration: Colonne projet_id ajoutée à gestations');
  }
}

