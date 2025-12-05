/**
 * Schéma de la table gestations
 * Gère les gestations
 */

import * as SQLite from 'expo-sqlite';
import { createTableSafely } from '../utils';

/**
 * Crée la table gestations si elle n'existe pas
 * Préserve les données existantes sauf si la table est corrompue
 */
export async function createGestationsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await createTableSafely(
    db,
    'gestations',
    `CREATE TABLE gestations (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      truie_id TEXT NOT NULL,
      truie_nom TEXT,
      verrat_id TEXT,
      verrat_nom TEXT,
      date_sautage TEXT NOT NULL,
      date_mise_bas_prevue TEXT NOT NULL,
      date_mise_bas_reelle TEXT,
      nombre_porcelets_prevu INTEGER NOT NULL CHECK (nombre_porcelets_prevu >= 0),
      nombre_porcelets_reel INTEGER CHECK (nombre_porcelets_reel IS NULL OR nombre_porcelets_reel >= 0),
      statut TEXT NOT NULL CHECK (statut IN ('en_cours', 'terminee', 'annulee')),
      notes TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
      CHECK (date_mise_bas_prevue >= date_sautage),
      CHECK (date_mise_bas_reelle IS NULL OR date_mise_bas_reelle >= date_sautage),
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (truie_id) REFERENCES production_animaux(id) ON DELETE CASCADE,
      FOREIGN KEY (verrat_id) REFERENCES production_animaux(id) ON DELETE SET NULL
    );`
  );
}

