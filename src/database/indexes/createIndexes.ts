/**
 * Création des index qui utilisent projet_id
 * 
 * CRITIQUE: Ces index sont essentiels pour les performances (53+ requêtes utilisent projet_id)
 * Création individuelle avec gestion d'erreur et réessai agressif pour chaque index
 */

import type { SQLiteDatabase } from 'expo-sqlite';

interface IndexDefinition {
  name: string;
  table: string;
  column: string;
  unique?: boolean;
  additionalColumns?: string;
  critical: boolean;
}

/**
 * Liste des index à créer avec projet_id
 * CRITIQUES: Tous ces index sont essentiels pour les performances
 */
const indexes: IndexDefinition[] = [
  {
    name: 'idx_depenses_projet',
    table: 'depenses_ponctuelles',
    column: 'projet_id',
    critical: true,
  },
  { 
    name: 'idx_revenus_projet', 
    table: 'revenus', 
    column: 'projet_id', 
    critical: true 
  },
  {
    name: 'idx_rapports_croissance_projet',
    table: 'rapports_croissance',
    column: 'projet_id',
    critical: true,
  },
  { 
    name: 'idx_mortalites_projet', 
    table: 'mortalites', 
    column: 'projet_id', 
    critical: true 
  },
  {
    name: 'idx_planifications_projet',
    table: 'planifications',
    column: 'projet_id',
    critical: true,
  },
  {
    name: 'idx_collaborations_projet',
    table: 'collaborations',
    column: 'projet_id',
    critical: true,
  },
  {
    name: 'idx_stocks_aliments_projet',
    table: 'stocks_aliments',
    column: 'projet_id',
    critical: true,
  },
  {
    name: 'idx_production_animaux_code',
    table: 'production_animaux',
    column: 'projet_id',
    unique: true,
    additionalColumns: 'code',
    critical: true,
  },
];

/**
 * Vérifie si un index existe déjà
 */
async function indexExists(db: SQLiteDatabase, indexName: string): Promise<boolean> {
  try {
    const result = await db.getFirstAsync<{ name: string } | null>(
      `SELECT name FROM sqlite_master WHERE type='index' AND name='${indexName}'`
    );
    return result !== null;
  } catch {
    return false;
  }
}

/**
 * Crée un index avec réessai agressif
 */
async function createIndexWithRetry(
  db: SQLiteDatabase,
  index: IndexDefinition,
  maxRetries: number = 5
): Promise<boolean> {
  // Vérifier d'abord si l'index existe déjà
  if (await indexExists(db, index.name)) {
    return true;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Vérifier que la table existe
      const tableExists = await db.getFirstAsync<{ name: string } | null>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${index.table}'`
      );

      if (!tableExists) {
        console.error(`❌ Index ${index.name} non créé: table ${index.table} n'existe pas`);
        return false;
      }

      // Vérifier que la colonne projet_id existe
      const columnExists = await db.getFirstAsync<{ name: string } | null>(
        `SELECT name FROM pragma_table_info('${index.table}') WHERE name = '${index.column}'`
      );

      if (!columnExists) {
        console.error(
          `❌ Index ${index.name} non créé: colonne ${index.column} n'existe pas dans ${index.table}`
        );
        return false;
      }

      // Construire la clause de colonnes pour l'index
      let columns = index.column;
      if (index.additionalColumns) {
        columns = `${index.column}, ${index.additionalColumns}`;
      }

      // Créer l'index
      const uniqueClause = index.unique ? 'UNIQUE' : '';
      const sql = `CREATE ${uniqueClause} INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${columns})`;
      
      await db.execAsync(sql);
      
      console.log(`✅ Index ${index.name} créé avec succès (tentative ${attempt})`);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (attempt < maxRetries) {
        // Attendre avant de réessayer (backoff exponentiel)
        const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
        console.warn(
          `⚠️  Tentative ${attempt}/${maxRetries} échouée pour l'index ${index.name}, nouvelle tentative dans ${delay}ms...`
        );
      } else {
        console.error(
          `❌ Impossible de créer l'index ${index.name} après ${maxRetries} tentatives:`,
          errorMessage
        );
        if (index.critical) {
          console.error(`⚠️  ATTENTION: L'index ${index.name} est CRITIQUE pour les performances!`);
        }
        return false;
      }
    }
  }

  return false;
}

/**
 * Crée tous les index qui utilisent projet_id
 * 
 * @param db - Instance de la base de données SQLite
 */
export async function createIndexesWithProjetId(db: SQLiteDatabase): Promise<void> {
  if (!db) {
    throw new Error('Base de données non initialisée lors de la création des index');
  }

  console.log('🔧 [DB] Création des index avec projet_id...');

  let successCount = 0;
  let failureCount = 0;

  for (const index of indexes) {
    const success = await createIndexWithRetry(db, index);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log(
    `✅ [DB] Index créés: ${successCount} succès, ${failureCount} échecs (sur ${indexes.length} index)`
  );

  if (failureCount > 0) {
    console.warn(
      `⚠️  [DB] ${failureCount} index(s) n'ont pas pu être créés. Les performances peuvent être dégradées.`
    );
  }

  // Créer les index qui dépendent de colonnes ajoutées par migration (mais pas projet_id)
  // Index sur users(telephone) - colonne ajoutée par migration
  try {
    const usersTableExists = await db.getFirstAsync<{ name: string } | null>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    );

    if (usersTableExists) {
      const telephoneColumnExists = await db.getFirstAsync<{ name: string } | null>(
        "SELECT name FROM pragma_table_info('users') WHERE name = 'telephone'"
      );

      if (telephoneColumnExists) {
        if (!(await indexExists(db, 'idx_users_telephone'))) {
          await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_users_telephone ON users(telephone);
          `);
          console.log('✅ Index idx_users_telephone créé avec succès');
        }
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('⚠️  Erreur lors de la création de idx_users_telephone:', errorMessage);
  }

  // Index sur production_animaux(reproducteur) - colonne ajoutée par migration
  try {
    const tableExists = await db.getFirstAsync<{ name: string } | null>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='production_animaux'"
    );

    if (tableExists) {
      const columnExists = await db.getFirstAsync<{ name: string } | null>(
        "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'reproducteur'"
      );

      if (columnExists) {
        if (!(await indexExists(db, 'idx_production_animaux_reproducteur'))) {
          await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_production_animaux_reproducteur ON production_animaux(reproducteur);
          `);
          console.log('✅ Index idx_production_animaux_reproducteur créé avec succès');
        }
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      '⚠️  Erreur lors de la création de idx_production_animaux_reproducteur:',
      errorMessage
    );
  }

  // Index sur collaborations(user_id) - colonne ajoutée par migration
  try {
    const tableExists = await db.getFirstAsync<{ name: string } | null>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='collaborations'"
    );

    if (tableExists) {
      const columnExists = await db.getFirstAsync<{ name: string } | null>(
        "SELECT name FROM pragma_table_info('collaborations') WHERE name = 'user_id'"
      );

      if (columnExists) {
        if (!(await indexExists(db, 'idx_collaborations_user_id'))) {
          await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_collaborations_user_id ON collaborations(user_id);
          `);
          console.log('✅ Index idx_collaborations_user_id créé avec succès');
        }
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      '⚠️  Erreur lors de la création de idx_collaborations_user_id:',
      errorMessage
    );
  }
}

