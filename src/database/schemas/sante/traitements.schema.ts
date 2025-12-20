/**
 * Schéma de la table traitements
 * Gère les traitements médicaux
 */

import * as SQLite from 'expo-sqlite';
import { createTableSafely } from '../utils';

/**
 * Crée la table traitements si elle n'existe pas
 * Préserve les données existantes sauf si la table est corrompue
 */
export async function createTraitementsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await createTableSafely(
    db,
    'traitements',
    `CREATE TABLE traitements (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      maladie_id TEXT,
      animal_id TEXT,
      lot_id TEXT,
      type TEXT NOT NULL CHECK (type IN ('antibiotique', 'antiparasitaire', 'anti_inflammatoire', 'vitamine', 'vaccin', 'autre')),
      nom_medicament TEXT NOT NULL,
      voie_administration TEXT NOT NULL CHECK (voie_administration IN ('orale', 'injectable', 'topique', 'alimentaire')),
      dosage TEXT NOT NULL,
      frequence TEXT NOT NULL,
      date_debut TEXT NOT NULL,
      date_fin TEXT,
      duree_jours INTEGER CHECK (duree_jours IS NULL OR duree_jours > 0),
      temps_attente_jours INTEGER CHECK (temps_attente_jours IS NULL OR temps_attente_jours >= 0),
      veterinaire TEXT,
      cout REAL CHECK (cout IS NULL OR cout >= 0),
      termine INTEGER DEFAULT 0 CHECK (termine IN (0, 1)),
      efficace INTEGER,
      effets_secondaires TEXT,
      notes TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
      CHECK (date_fin IS NULL OR date_fin >= date_debut),
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (maladie_id) REFERENCES maladies(id) ON DELETE SET NULL,
      FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE SET NULL
    );`
  );
}
