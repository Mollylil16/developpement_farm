/**
 * Schéma de la table users
 * Gère les utilisateurs de l'application
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table users si elle n'existe pas
 */
export async function createUsersTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      telephone TEXT UNIQUE,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      password_hash TEXT,
      provider TEXT NOT NULL CHECK (provider IN ('email', 'google', 'apple', 'telephone')) DEFAULT 'email',
      provider_id TEXT,
      photo TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_connexion TEXT,
      is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
      saved_farms TEXT,
      -- 🆕 Colonnes pour le système multi-rôles
      roles TEXT,
      active_role TEXT,
      is_onboarded INTEGER DEFAULT 0 CHECK (is_onboarded IN (0, 1)),
      onboarding_completed_at TEXT,
      CHECK (email IS NOT NULL OR telephone IS NOT NULL)
    );
  `);
}

