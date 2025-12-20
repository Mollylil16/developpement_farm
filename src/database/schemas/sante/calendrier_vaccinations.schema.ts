/**
 * Schéma de la table calendrier_vaccinations
 * Gère les protocoles de vaccination
 */

import * as SQLite from 'expo-sqlite';
import { createTableSafely } from '../utils';

/**
 * Crée la table calendrier_vaccinations si elle n'existe pas
 * Préserve les données existantes sauf si la table est corrompue
 */
export async function createCalendrierVaccinationsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await createTableSafely(
    db,
    'calendrier_vaccinations',
    `CREATE TABLE calendrier_vaccinations (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      vaccin TEXT NOT NULL CHECK (vaccin IN ('rouget', 'parvovirose', 'mal_rouge', 'circovirus', 'mycoplasme', 'grippe', 'autre')),
      nom_vaccin TEXT,
      categorie TEXT NOT NULL CHECK (categorie IN ('porcelet', 'truie', 'verrat', 'porc_croissance', 'tous')),
      age_jours INTEGER,
      date_planifiee TEXT,
      frequence_jours INTEGER,
      obligatoire INTEGER DEFAULT 0 CHECK (obligatoire IN (0, 1)),
      notes TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );`
  );
}
