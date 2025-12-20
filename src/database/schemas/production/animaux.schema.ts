/**
 * Schéma de la table production_animaux
 * Gère les animaux de production
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table production_animaux si elle n'existe pas
 */
export async function createProductionAnimauxTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS production_animaux (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      code TEXT NOT NULL,
      nom TEXT,
      origine TEXT,
      sexe TEXT NOT NULL CHECK (sexe IN ('male', 'femelle', 'indetermine')) DEFAULT 'indetermine',
      date_naissance TEXT,
      poids_initial REAL CHECK (poids_initial IS NULL OR poids_initial > 0),
      date_entree TEXT,
      actif INTEGER DEFAULT 1,
      statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'mort', 'vendu', 'offert', 'autre')),
      race TEXT,
      reproducteur INTEGER DEFAULT 0 CHECK (reproducteur IN (0, 1)),
      categorie_poids TEXT CHECK (categorie_poids IN ('porcelet', 'croissance', 'finition')),
      pere_id TEXT,
      mere_id TEXT,
      notes TEXT,
      photo_uri TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (pere_id) REFERENCES production_animaux(id) ON DELETE SET NULL,
      FOREIGN KEY (mere_id) REFERENCES production_animaux(id) ON DELETE SET NULL
    );
  `);
}
