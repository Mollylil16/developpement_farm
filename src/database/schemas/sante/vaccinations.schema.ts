/**
 * Schéma de la table vaccinations
 * Gère les vaccinations effectuées
 */

import * as SQLite from 'expo-sqlite';
import { createTableSafely } from '../utils';

/**
 * Crée la table vaccinations si elle n'existe pas
 * Préserve les données existantes sauf si la table est corrompue
 */
export async function createVaccinationsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await createTableSafely(
    db,
    'vaccinations',
    `CREATE TABLE vaccinations (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      calendrier_id TEXT,
      animal_id TEXT,
      lot_id TEXT,
      vaccin TEXT,
      nom_vaccin TEXT,
      date_vaccination TEXT NOT NULL,
      date_rappel TEXT,
      numero_lot_vaccin TEXT,
      veterinaire TEXT,
      cout REAL CHECK (cout IS NULL OR cout >= 0),
      statut TEXT NOT NULL CHECK (statut IN ('planifie', 'effectue', 'en_retard', 'annule')) DEFAULT 'effectue',
      effets_secondaires TEXT,
      notes TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
      animal_ids TEXT,
      type_prophylaxie TEXT DEFAULT 'vitamine',
      produit_administre TEXT,
      photo_flacon TEXT,
      dosage TEXT,
      unite_dosage TEXT DEFAULT 'ml',
      raison_traitement TEXT DEFAULT 'suivi_normal',
      raison_autre TEXT,
      CHECK (date_rappel IS NULL OR date_rappel >= date_vaccination),
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (calendrier_id) REFERENCES calendrier_vaccinations(id) ON DELETE SET NULL,
      FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE SET NULL
    );`
  );
}
