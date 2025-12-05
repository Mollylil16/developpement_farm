/**
 * Migration 032: Ajout de categorie_poids aux animaux et nombre_croissance aux projets
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { migrationLogger } from '../../utils/logger';

export async function addCategoriePoidsAndNombreCroissance(db: SQLiteDatabase): Promise<void> {
  migrationLogger.step('Migration 032: Ajout de categorie_poids et nombre_croissance');
  
  try {
    // Ajouter categorie_poids à production_animaux si elle n'existe pas
    const animauxTableInfo = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(production_animaux)"
    );
    const hasCategoriePoids = animauxTableInfo.some(col => col.name === 'categorie_poids');
    
    if (!hasCategoriePoids) {
      await db.execAsync(`
        ALTER TABLE production_animaux 
        ADD COLUMN categorie_poids TEXT CHECK (categorie_poids IN ('porcelet', 'croissance', 'finition'))
      `);
      migrationLogger.success('Colonne categorie_poids ajoutée à production_animaux');
    } else {
      migrationLogger.info('Colonne categorie_poids existe déjà dans production_animaux');
    }

    // Ajouter nombre_croissance à projets si elle n'existe pas
    const projetsTableInfo = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(projets)"
    );
    const hasNombreCroissance = projetsTableInfo.some(col => col.name === 'nombre_croissance');
    
    if (!hasNombreCroissance) {
      await db.execAsync(`
        ALTER TABLE projets 
        ADD COLUMN nombre_croissance INTEGER NOT NULL DEFAULT 0
      `);
      migrationLogger.success('Colonne nombre_croissance ajoutée à projets');
    } else {
      migrationLogger.info('Colonne nombre_croissance existe déjà dans projets');
    }

    migrationLogger.success('Migration 032 terminée avec succès');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    migrationLogger.error('❌ Erreur lors de la migration 032:', errorMessage);
    throw error;
  }
}

