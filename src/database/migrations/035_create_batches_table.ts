/**
 * Migration : Création de la table batches pour le suivi par bande
 * Permet de gérer des groupes d'animaux par loge/enclos
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function createBatchesTable(db: SQLiteDatabase): Promise<void> {
  console.log('🐷 [Migration] Création de la table batches...');

  try {
    // Créer la table batches
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        pen_name TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN (
          'truie_reproductrice',
          'verrat_reproducteur',
          'porcelets',
          'porcs_croissance',
          'porcs_engraissement'
        )),
        
        total_count INTEGER NOT NULL,
        male_count INTEGER DEFAULT 0,
        female_count INTEGER DEFAULT 0,
        castrated_count INTEGER DEFAULT 0,
        
        average_age_months REAL NOT NULL,
        average_weight_kg REAL NOT NULL,
        
        batch_creation_date TEXT NOT NULL,
        expected_sale_date TEXT,
        
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
      );
    `);

    // Créer les index pour améliorer les performances
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_batches_projet 
      ON batches(projet_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_batches_category 
      ON batches(category);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_batches_pen 
      ON batches(pen_name);
    `);

    console.log('  ✅ Table batches créée avec succès');
  } catch (error) {
    console.error('  ❌ Erreur lors de la création de la table batches:', error);
    throw error;
  }
}

