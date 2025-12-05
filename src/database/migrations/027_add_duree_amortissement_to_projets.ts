/**
 * Migration 027: Ajout de la colonne duree_amortissement_par_defaut_mois à la table projets
 * 
 * Cette colonne est utilisée pour définir la durée d'amortissement par défaut
 * pour les dépenses CAPEX dans un projet.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addDureeAmortissementToProjets(db: SQLiteDatabase): Promise<void> {
  console.log('🔧 [Migration 027] Ajout de duree_amortissement_par_defaut_mois à projets...');

  try {
    // Vérifier si la table existe
    const tableExists = await db.getFirstAsync<{ name: string } | null>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='projets'"
    );

    if (!tableExists) {
      console.log('✅ [Migration 027] Table projets n\'existe pas encore, sera créée par le schéma');
      return;
    }

    // Vérifier si la colonne existe déjà
    const tableInfo = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(projets)"
    );

    const hasColumn = tableInfo.some((col) => col.name === 'duree_amortissement_par_defaut_mois');

    if (hasColumn) {
      console.log('✅ [Migration 027] Colonne duree_amortissement_par_defaut_mois existe déjà');
      return;
    }

    // Ajouter la colonne
    await db.execAsync(`
      ALTER TABLE projets 
      ADD COLUMN duree_amortissement_par_defaut_mois INTEGER DEFAULT 36;
    `);

    console.log('✅ [Migration 027] Colonne duree_amortissement_par_defaut_mois ajoutée à projets');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ [Migration 027] Erreur:', errorMessage);
    
    // Ne pas faire échouer l'initialisation si la table n'existe pas encore
    if (errorMessage.includes('no such table')) {
      console.log('ℹ️  [Migration 027] Table n\'existe pas encore, sera créée par le schéma');
      return;
    }
    
    throw error;
  }
}

