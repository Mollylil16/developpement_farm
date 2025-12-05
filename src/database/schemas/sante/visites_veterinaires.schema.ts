/**
 * Schéma de la table visites_veterinaires
 * Gère l'historique des visites vétérinaires
 */

import * as SQLite from 'expo-sqlite';
import { createTableSafely } from '../utils';

/**
 * Crée la table visites_veterinaires si elle n'existe pas
 * Préserve les données existantes sauf si la table est corrompue
 */
export async function createVisitesVeterinairesTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await createTableSafely(
    db,
    'visites_veterinaires',
    `CREATE TABLE visites_veterinaires (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      date_visite TEXT NOT NULL,
      veterinaire TEXT,
      motif TEXT NOT NULL,
      animaux_examines TEXT,
      diagnostic TEXT,
      prescriptions TEXT,
      recommandations TEXT,
      traitement TEXT,
      cout REAL CHECK (cout IS NULL OR cout >= 0),
      prochaine_visite_prevue TEXT,
      notes TEXT,
      date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
      CHECK (prochaine_visite_prevue IS NULL OR prochaine_visite_prevue >= date_visite),
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );`
  );
}

