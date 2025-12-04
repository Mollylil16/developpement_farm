/**
 * Migration 24 : Ajouter permission_sante à la table collaborations
 * Permet de gérer les permissions spécifiques pour le module santé
 * 
 * Version: 24
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addPermissionSanteToCollaborations(db: SQLiteDatabase): Promise<void> {
  const collaborationsTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='collaborations'"
  );

  if (!collaborationsTableExists) {
    return; // Table n'existe pas encore, sera créée avec permission_sante
  }

  const permissionSanteInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('collaborations') WHERE name = 'permission_sante'"
  );

  if (!permissionSanteInfo) {
    await db.execAsync(`
      ALTER TABLE collaborations ADD COLUMN permission_sante INTEGER DEFAULT 0;
    `);
    console.log('✅ Migration: Colonne permission_sante ajoutée à collaborations');
  }
}

