/**
 * Migration 4 : Ajouter les colonnes pour le système multi-rôles
 * 
 * Version: 4
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addMultiRoleFields(db: SQLiteDatabase): Promise<void> {
  const usersTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  );

  if (!usersTableExists) {
    return;
  }

  const usersColumns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info('users')"
  );

  const colonnesMultiRoles = [
    { nom: 'roles', sql: 'roles TEXT' },
    { nom: 'active_role', sql: 'active_role TEXT' },
    { nom: 'is_onboarded', sql: 'is_onboarded INTEGER DEFAULT 0 CHECK (is_onboarded IN (0, 1))' },
    { nom: 'onboarding_completed_at', sql: 'onboarding_completed_at TEXT' },
  ];

  for (const colonne of colonnesMultiRoles) {
    const colonneExiste = usersColumns.some((col) => col.name === colonne.nom);
    if (!colonneExiste) {
      await db.execAsync(`ALTER TABLE users ADD COLUMN ${colonne.sql};`);
      console.log(`✅ [Migration] Colonne ${colonne.nom} ajoutée à la table users`);
    }
  }
}

