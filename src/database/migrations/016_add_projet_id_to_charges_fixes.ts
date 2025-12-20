/**
 * Migration 16 : Ajouter projet_id à la table charges_fixes
 * Permet d'associer les charges fixes à un projet spécifique
 *
 * Version: 16
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addProjetIdToChargesFixes(db: SQLiteDatabase): Promise<void> {
  const chargesFixesTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='charges_fixes'"
  );

  if (!chargesFixesTableExists) {
    return; // Table n'existe pas encore, sera créée avec projet_id
  }

  const chargesFixesProjetIdInfo = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('charges_fixes') WHERE name = 'projet_id'"
  );

  if (!chargesFixesProjetIdInfo) {
    await db.execAsync(`
      ALTER TABLE charges_fixes ADD COLUMN projet_id TEXT;
    `);

    // Mettre à jour les charges fixes existantes avec le premier projet actif (si disponible)
    const premierProjet = await db.getFirstAsync<{ id: string } | null>(
      'SELECT id FROM projets ORDER BY date_creation ASC LIMIT 1'
    );
    if (premierProjet) {
      await db.runAsync('UPDATE charges_fixes SET projet_id = ? WHERE projet_id IS NULL', [
        premierProjet.id,
      ]);
    }

    console.log('✅ Migration: Colonne projet_id ajoutée à charges_fixes');
  }
}
