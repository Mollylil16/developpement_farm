/**
 * Schéma de la table collaborations
 * Gère les collaborations entre utilisateurs et projets
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table collaborations si elle n'existe pas
 */
export async function createCollaborationsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS collaborations (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      user_id TEXT,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      email TEXT NOT NULL,
      telephone TEXT,
      role TEXT NOT NULL CHECK (role IN ('proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur')),
      statut TEXT NOT NULL CHECK (statut IN ('actif', 'inactif', 'en_attente')),
      permission_reproduction INTEGER DEFAULT 0,
      permission_nutrition INTEGER DEFAULT 0,
      permission_finance INTEGER DEFAULT 0,
      permission_rapports INTEGER DEFAULT 0,
      permission_planification INTEGER DEFAULT 0,
      permission_mortalites INTEGER DEFAULT 0,
      permission_sante INTEGER DEFAULT 0,
      date_invitation TEXT NOT NULL,
      date_acceptation TEXT,
      notes TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
}
