/**
 * Migration 19 : Ajouter derniere_modification à plusieurs tables
 * Permet de tracker les modifications pour revenus, depenses_ponctuelles et marketplace_listings
 * 
 * Version: 19
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { getErrorMessage } from '../../types/common';

export async function addDerniereModificationFields(db: SQLiteDatabase): Promise<void> {
  // Ajouter à revenus
  try {
    const revenusColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info('revenus')"
    );
    
    const hasDerniereModification = revenusColumns.some((col) => col.name === 'derniere_modification');
    
    if (!hasDerniereModification) {
      await db.execAsync(`
        ALTER TABLE revenus ADD COLUMN derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log('✅ Migration: Colonne derniere_modification ajoutée à revenus');
    }
    } catch (error: unknown) {
    console.warn('⚠️  Erreur lors de l\'ajout de derniere_modification dans revenus:', getErrorMessage(error));
  }

  // Ajouter à depenses_ponctuelles
  try {
    const depensesColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info('depenses_ponctuelles')"
    );
    
    const hasDerniereModification = depensesColumns.some((col) => col.name === 'derniere_modification');
    
    if (!hasDerniereModification) {
      await db.execAsync(`
        ALTER TABLE depenses_ponctuelles ADD COLUMN derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log('✅ Migration: Colonne derniere_modification ajoutée à depenses_ponctuelles');
    }
    } catch (error: unknown) {
    console.warn('⚠️  Erreur lors de l\'ajout de derniere_modification dans depenses_ponctuelles:', getErrorMessage(error));
  }

  // Ajouter à marketplace_listings
  try {
    const marketplaceTableExists = await db.getFirstAsync<{ name: string } | null>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='marketplace_listings'"
    );

    if (marketplaceTableExists) {
      const marketplaceColumns = await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info('marketplace_listings')"
      );
      
      const hasDerniereModification = marketplaceColumns.some((col) => col.name === 'derniere_modification');
      
      if (!hasDerniereModification) {
        await db.execAsync(`
          ALTER TABLE marketplace_listings ADD COLUMN derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP;
        `);
        
        // Mettre à jour les enregistrements existants avec updated_at
        await db.execAsync(`
          UPDATE marketplace_listings 
          SET derniere_modification = updated_at 
          WHERE derniere_modification IS NULL OR derniere_modification = '';
        `);
        
        console.log('✅ Migration: Colonne derniere_modification ajoutée à marketplace_listings');
      }
    }
    } catch (error: unknown) {
    console.warn('⚠️  Erreur lors de l\'ajout de derniere_modification dans marketplace_listings:', getErrorMessage(error));
  }
}

