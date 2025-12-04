/**
 * Migration 7 : Ajouter user_id à la table collaborations
 * Permet de lier les collaborations à un utilisateur spécifique
 * 
 * Version: 7
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addUserIdToCollaborations(db: SQLiteDatabase): Promise<void> {
  const collaborationsTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='collaborations'"
  );

  if (!collaborationsTableExists) {
    return; // Table n'existe pas encore, sera créée avec user_id
  }

  const userIdInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('collaborations') WHERE name = 'user_id'"
  );

  if (!userIdInfo) {
    // Ajouter la colonne user_id (nullable car les anciens collaborateurs n'ont pas encore de user_id)
    await db.execAsync(`
      ALTER TABLE collaborations ADD COLUMN user_id TEXT;
    `);

    // Créer un index pour user_id
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_collaborations_user_id ON collaborations(user_id);
    `);

    console.log('✅ Migration: Colonne user_id ajoutée à collaborations');
  }
}

