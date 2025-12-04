/**
 * Schéma de la table maladies
 * Gère le journal des maladies
 */

import * as SQLite from 'expo-sqlite';

/**
 * Crée la table maladies si elle n'existe pas
 */
export async function createMaladiesTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS maladies (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      animal_id TEXT,
      lot_id TEXT,
      type TEXT NOT NULL CHECK (type IN ('diarrhee', 'respiratoire', 'gale_parasites', 'fievre', 'boiterie', 'digestive', 'cutanee', 'reproduction', 'neurologique', 'autre')),
      nom_maladie TEXT NOT NULL,
      gravite TEXT NOT NULL CHECK (gravite IN ('faible', 'moderee', 'grave', 'critique')),
      date_debut TEXT NOT NULL,
      date_fin TEXT,
      symptomes TEXT NOT NULL,
      diagnostic TEXT,
      contagieux INTEGER DEFAULT 0 CHECK (contagieux IN (0, 1)),
      nombre_animaux_affectes INTEGER CHECK (nombre_animaux_affectes IS NULL OR nombre_animaux_affectes > 0),
      nombre_deces INTEGER CHECK (nombre_deces IS NULL OR nombre_deces >= 0),
      veterinaire TEXT,
      cout_traitement REAL CHECK (cout_traitement IS NULL OR cout_traitement >= 0),
      CHECK (date_fin IS NULL OR date_fin >= date_debut),
      gueri INTEGER DEFAULT 0 CHECK (gueri IN (0, 1)),
      notes TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE SET NULL
    );
  `);
}

