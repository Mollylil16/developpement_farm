/**
 * Migration 1 : Ajouter le champ saved_farms à la table users
 * Permet de sauvegarder les fermes favorites de l'utilisateur
 *
 * Version: 1
 * Date: 2024
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { getErrorMessage } from '../../types/common';

export async function addSavedFarmsToUsers(db: SQLiteDatabase): Promise<void> {
  try {
    // Vérifier si la colonne existe déjà
    const tableInfo = await db.getAllAsync<unknown>("PRAGMA table_info('users')");
    const savedFarmsColumn = tableInfo.find((col) => col.name === 'saved_farms');

    if (savedFarmsColumn) {
      console.log('ℹ️  Migration saved_farms déjà appliquée');
      return;
    }

    console.log('🔄 Application de la migration saved_farms...');

    // Ajouter la colonne saved_farms (JSON array d'IDs de fermes)
    await db.execAsync(`
      ALTER TABLE users ADD COLUMN saved_farms TEXT DEFAULT '[]';
    `);

    console.log('✅ Migration saved_farms appliquée avec succès');
  } catch (error: unknown) {
    console.warn('⚠️  Erreur lors de la migration saved_farms:', getErrorMessage(error));
    // La migration échoue silencieusement pour ne pas bloquer l'app
  }
}
