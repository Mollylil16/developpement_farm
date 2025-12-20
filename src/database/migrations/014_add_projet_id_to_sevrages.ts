/**
 * Migration 14 : Ajouter projet_id à la table sevrages
 * Permet d'associer les sevrages à un projet spécifique
 *
 * Version: 14
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addProjetIdToSevrages(db: SQLiteDatabase): Promise<void> {
  const sevragesTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='sevrages'"
  );

  if (!sevragesTableExists) {
    return; // Table n'existe pas encore, sera créée avec projet_id
  }

  const sevragesProjetIdInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('sevrages') WHERE name = 'projet_id'"
  );

  if (!sevragesProjetIdInfo) {
    await db.execAsync(`
      ALTER TABLE sevrages ADD COLUMN projet_id TEXT;
    `);

    // Mettre à jour les sevrages existants avec le projet_id de leur gestation associée
    await db.execAsync(`
      UPDATE sevrages 
      SET projet_id = (
        SELECT projet_id 
        FROM gestations 
        WHERE gestations.id = sevrages.gestation_id
      )
      WHERE projet_id IS NULL;
    `);

    // Pour les sevrages sans gestation associée, utiliser le premier projet actif
    const premierProjet = await db.getFirstAsync<{ id: string } | null>(
      'SELECT id FROM projets ORDER BY date_creation ASC LIMIT 1'
    );
    if (premierProjet) {
      await db.runAsync('UPDATE sevrages SET projet_id = ? WHERE projet_id IS NULL', [
        premierProjet.id,
      ]);
    }

    console.log('✅ Migration: Colonne projet_id ajoutée à sevrages');
  }
}
