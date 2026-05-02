/**
 * Migration 22 : Mettre à jour la contrainte CHECK de la table ingredients pour supporter 'sac'
 * Permet d'utiliser l'unité "sac" en plus des autres unités
 *
 * Version: 22
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function updateIngredientsUnit(db: SQLiteDatabase): Promise<void> {
  const ingredientsTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='ingredients'"
  );

  if (!ingredientsTableExists) {
    return; // Table n'existe pas encore
  }

  // Vérifier si la contrainte CHECK existe déjà avec 'sac'
  const tableInfo = await db.getFirstAsync<{ sql: string } | null>(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='ingredients'"
  );

  if (tableInfo && tableInfo.sql && !tableInfo.sql.includes("'sac'")) {
    // La table existe mais n'a pas le support de 'sac', on doit la recréer
    console.log(
      '🔄 Migration: Recréation de la table ingredients avec support de l\'unité "sac"...'
    );

    // Renommer l'ancienne table
    await db.execAsync(`ALTER TABLE ingredients RENAME TO ingredients_old;`);

    // Recréer la table avec la nouvelle contrainte
    await db.execAsync(`
      CREATE TABLE ingredients (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        nom TEXT NOT NULL,
        unite TEXT NOT NULL CHECK (unite IN ('kg', 'g', 'L', 'mL', 'unite', 'sac')),
        prix_unitaire REAL NOT NULL,
        fournisseur TEXT,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Copier les données existantes
    await db.execAsync(`
      INSERT INTO ingredients (
        id, projet_id, nom, unite, prix_unitaire, fournisseur, notes, 
        date_creation, derniere_modification
      )
      SELECT 
        id, projet_id, nom, unite, prix_unitaire, fournisseur, notes,
        date_creation, derniere_modification
      FROM ingredients_old;
    `);

    // Supprimer l'ancienne table
    await db.execAsync(`DROP TABLE ingredients_old;`);

    console.log('✅ Migration: Table ingredients recréée avec support de l\'unité "sac"');
  } else {
    console.log('ℹ️  Table ingredients a déjà le support de l\'unité "sac"');
  }
}
