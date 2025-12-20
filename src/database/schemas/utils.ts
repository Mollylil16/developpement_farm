/**
 * Utilitaires pour la création de tables de manière sûre
 * Préserve les données existantes sauf si la table est corrompue
 */

import * as SQLite from 'expo-sqlite';
import { schemaLogger } from '../../utils/logger';

/**
 * Vérifie si une table existe et est valide (non corrompue)
 * @param db Base de données SQLite
 * @param tableName Nom de la table à vérifier
 * @returns true si la table existe et est valide, false sinon
 */
export async function isTableValid(db: SQLite.SQLiteDatabase, tableName: string): Promise<boolean> {
  try {
    // Vérifier si la table existe
    const tables = await db.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
    );

    if (tables.length === 0) {
      return false; // La table n'existe pas
    }

    // Essayer de lire le schéma de la table avec PRAGMA table_info
    // Si la table est corrompue, cela échouera
    await db.getAllAsync(`PRAGMA table_info(${tableName})`);

    // Si on arrive ici, la table existe et est valide
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Si l'erreur contient "syntax error" ou "near", la table est probablement corrompue
    if (
      errorMessage.includes('syntax error') ||
      errorMessage.includes("near '") ||
      errorMessage.includes('malformed')
    ) {
      schemaLogger.warn(`Table ${tableName} semble corrompue:`, errorMessage);
      return false; // Table corrompue
    }
    // Autre erreur, considérer comme valide pour être sûr
    schemaLogger.warn(`Erreur lors de la vérification de ${tableName}:`, errorMessage);
    return true;
  }
}

/**
 * Crée une table de manière sûre en préservant les données existantes
 * Ne supprime la table que si elle est corrompue
 * @param db Base de données SQLite
 * @param tableName Nom de la table à créer
 * @param createTableSQL SQL pour créer la table (sans CREATE TABLE IF NOT EXISTS)
 */
export async function createTableSafely(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  createTableSQL: string
): Promise<void> {
  // Vérifier si la table existe et est valide
  const tableExistsAndValid = await isTableValid(db, tableName);

  if (tableExistsAndValid) {
    // La table existe et est valide, utiliser CREATE TABLE IF NOT EXISTS
    // Cela ne fera rien si la table existe déjà
    schemaLogger.log(`Table ${tableName} existe déjà et est valide, préservation des données`);
    const createIfNotExistsSQL = createTableSQL.replace(
      /^CREATE TABLE\s+/i,
      'CREATE TABLE IF NOT EXISTS '
    );
    try {
      await db.execAsync(createIfNotExistsSQL);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Si CREATE TABLE IF NOT EXISTS échoue, la table pourrait être corrompue
      if (
        errorMessage.includes('syntax error') ||
        errorMessage.includes("near '") ||
        errorMessage.includes('malformed')
      ) {
        schemaLogger.warn(
          `Table ${tableName} semble corrompue malgré la vérification, suppression...`
        );
        // Supprimer et recréer
        await dropTableSafely(db, tableName);
        await db.execAsync(createTableSQL);
      } else {
        throw error;
      }
    }
    return;
  }

  // La table n'existe pas ou est corrompue
  if (tableExistsAndValid === false) {
    // La table existe mais est corrompue, la supprimer d'abord
    schemaLogger.warn(`Table ${tableName} corrompue détectée, suppression...`);
    await dropTableSafely(db, tableName);
  }

  // Créer la table
  schemaLogger.log(`Création de la table ${tableName}...`);
  await db.execAsync(createTableSQL);
}

/**
 * Supprime une table de manière sûre, même si elle est corrompue
 * @param db Base de données SQLite
 * @param tableName Nom de la table à supprimer
 */
export async function dropTableSafely(db: SQLite.SQLiteDatabase, tableName: string): Promise<void> {
  const dropMethods = [
    `DROP TABLE IF EXISTS ${tableName};`,
    `DROP TABLE ${tableName};`, // Sans IF EXISTS
  ];

  for (const dropSql of dropMethods) {
    try {
      await db.execAsync(dropSql);
      schemaLogger.log(`Table ${tableName} supprimée`);
      return;
    } catch (dropError: unknown) {
      const errorMessage = dropError instanceof Error ? dropError.message : String(dropError);
      if (errorMessage.includes('no such table')) {
        // La table n'existe pas, c'est OK
        schemaLogger.log(`Table ${tableName} n'existe pas`);
        return;
      }
      // Si c'est une erreur de syntaxe, la table est corrompue - essayer méthode suivante
      if (
        errorMessage.includes('syntax error') ||
        errorMessage.includes("near '") ||
        errorMessage.includes('malformed')
      ) {
        schemaLogger.warn(`Table ${tableName} corrompue, essai méthode suivante...`);
        continue;
      }
      schemaLogger.warn(`Impossible de supprimer ${tableName} avec "${dropSql}":`, errorMessage);
    }
  }

  // Si toutes les méthodes ont échoué, utiliser PRAGMA pour forcer
  try {
    schemaLogger.log(`Tentative de suppression forcée de ${tableName} avec PRAGMA...`);
    await db.execAsync(`DELETE FROM sqlite_master WHERE type='table' AND name='${tableName}';`);
    schemaLogger.log(`Table ${tableName} supprimée via PRAGMA`);
  } catch (pragmaError: unknown) {
    const pragmaErrorMessage =
      pragmaError instanceof Error ? pragmaError.message : String(pragmaError);
    schemaLogger.warn(`Impossible de supprimer ${tableName} via PRAGMA:`, pragmaErrorMessage);
    // Continuer quand même - on essaiera de créer la table
  }
}
