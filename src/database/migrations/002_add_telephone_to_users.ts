/**
 * Migration 2 : Ajouter la colonne telephone à la table users
 * Permet l'authentification par téléphone
 * 
 * Version: 2
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addTelephoneToUsers(db: SQLiteDatabase): Promise<void> {
  const usersTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  );

  if (!usersTableExists) {
    return; // Table n'existe pas encore, sera créée avec telephone
  }

  // Vérifier si la colonne telephone existe
  const telephoneInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('users') WHERE name = 'telephone'"
  );

  if (!telephoneInfo) {
    // Ajouter la colonne telephone
    await db.execAsync(`
      ALTER TABLE users ADD COLUMN telephone TEXT;
    `);
    console.log('✅ Migration: Colonne telephone ajoutée à users');
  }
}

