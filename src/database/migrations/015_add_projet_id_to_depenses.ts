/**
 * Migration 15 : Ajouter projet_id à la table depenses_ponctuelles
 * Permet d'associer les dépenses à un projet spécifique
 *
 * Version: 15
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addProjetIdToDepenses(db: SQLiteDatabase): Promise<void> {
  const depensesTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='depenses_ponctuelles'"
  );

  if (!depensesTableExists) {
    return; // Table n'existe pas encore, sera créée avec projet_id
  }

  const depensesProjetIdInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('depenses_ponctuelles') WHERE name = 'projet_id'"
  );

  if (!depensesProjetIdInfo) {
    await db.execAsync(`
      ALTER TABLE depenses_ponctuelles ADD COLUMN projet_id TEXT;
    `);

    // Mettre à jour les dépenses existantes avec le premier projet actif (si disponible)
    const premierProjet = await db.getFirstAsync<{ id: string } | null>(
      'SELECT id FROM projets ORDER BY date_creation ASC LIMIT 1'
    );
    if (premierProjet) {
      await db.runAsync('UPDATE depenses_ponctuelles SET projet_id = ? WHERE projet_id IS NULL', [
        premierProjet.id,
      ]);
    }

    console.log('✅ Migration: Colonne projet_id ajoutée à depenses_ponctuelles');
  }
}
