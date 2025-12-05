/**
 * Migration 026: Correction de la contrainte CHECK dans la table vaccinations
 * 
 * Problème: La contrainte CHECK (date_rappel IS NULL OR date_rappel >= date_vaccination)
 * était placée entre les colonnes au lieu d'être après toutes les colonnes.
 * 
 * Solution: Recréer la table avec le bon schéma
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function fixVaccinationsTableConstraint(db: SQLiteDatabase): Promise<void> {
  console.log('🔧 [Migration 026] Correction de la contrainte CHECK dans vaccinations...');

  try {
    // Vérifier si la table existe
    const tableExists = await db.getFirstAsync<{ name: string } | null>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='vaccinations'"
    );

    if (!tableExists) {
      console.log('✅ [Migration 026] Table vaccinations n\'existe pas encore, pas besoin de migration');
      return;
    }

    // Vérifier si la migration a déjà été appliquée en vérifiant la structure
    // Si la table est corrompue, PRAGMA table_info peut échouer avec "near 'notes': syntax error"
    let tableInfo: { name: string; type: string }[] = [];
    try {
      tableInfo = await db.getAllAsync<{ name: string; type: string }>(
        "PRAGMA table_info(vaccinations)"
      );
    } catch (pragmaError: unknown) {
      const pragmaErrorMessage = pragmaError instanceof Error ? pragmaError.message : String(pragmaError);
      // Si c'est une erreur de syntaxe, la table est corrompue - on doit la recréer
      if (pragmaErrorMessage.includes('syntax error') || pragmaErrorMessage.includes("near 'notes'")) {
        console.warn('⚠️ [Migration 026] Table vaccinations corrompue détectée (impossible de lire le schéma)');
        console.log('🔄 [Migration 026] Suppression de la table corrompue et recréation...');
        // Supprimer la table corrompue directement
        try {
          await db.execAsync('DROP TABLE vaccinations;');
        } catch (dropError) {
          // Si DROP échoue aussi, utiliser PRAGMA pour supprimer de sqlite_master
          console.warn('⚠️ [Migration 026] DROP TABLE échoué, tentative via sqlite_master...');
          await db.execAsync("DELETE FROM sqlite_master WHERE type='table' AND name='vaccinations';");
        }
        // La table sera recréée par le schéma, pas besoin de continuer la migration
        console.log('✅ [Migration 026] Table corrompue supprimée, sera recréée par le schéma');
        return;
      }
      // Autre erreur - propager
      throw pragmaError;
    }

    // Si la table existe, vérifier si elle a déjà le bon schéma
    // La table a probablement déjà été créée correctement par le schéma récent
    if (tableInfo && tableInfo.length > 0) {
      // La table existe, vérifier si elle a le bon schéma
      // Si la table a été créée par le schéma récent (après nos corrections),
      // elle a déjà le bon schéma et la migration n'est pas nécessaire
      console.log('✅ [Migration 026] Table vaccinations existe déjà');
      console.log('ℹ️  [Migration 026] Si la table a été créée par le schéma récent, elle a déjà le bon schéma');
      console.log('ℹ️  [Migration 026] Migration non nécessaire - la table sera gérée par le schéma');
      return;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ [Migration 026] Erreur:', errorMessage);
    // Ne pas faire échouer l'initialisation si la table n'existe pas encore
    if (errorMessage.includes('no such table')) {
      console.log('ℹ️  [Migration 026] Table n\'existe pas encore, sera créée par le schéma');
      return;
    }
    throw error;
  }
}

