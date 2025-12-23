/**
 * Migration : Ajout du champ management_method à la table projets
 * Pour gérer le mode de suivi : individuel ou par bande
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addManagementMethodToProjets(db: SQLiteDatabase): Promise<void> {
  console.log('🏗️  [Migration] Ajout du champ management_method à projets...');

  try {
    // Vérifier si la colonne existe déjà
    const tableInfo = await db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(projets);`
    );
    
    const managementMethodExists = tableInfo.some(
      (column) => column.name === 'management_method'
    );

    if (!managementMethodExists) {
      // Ajouter la colonne management_method avec valeur par défaut 'individual'
      await db.execAsync(`
        ALTER TABLE projets 
        ADD COLUMN management_method TEXT NOT NULL DEFAULT 'individual' 
        CHECK (management_method IN ('individual', 'batch'));
      `);

      console.log('  ✅ Colonne management_method ajoutée à projets');
    } else {
      console.log('  ℹ️  La colonne management_method existe déjà');
    }

    // Créer un index pour améliorer les performances des requêtes
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_projets_management_method 
      ON projets(management_method);
    `);

    console.log('  ✅ Index créé sur management_method');
  } catch (error) {
    console.error('  ❌ Erreur lors de l\'ajout du champ management_method:', error);
    throw error;
  }
}

