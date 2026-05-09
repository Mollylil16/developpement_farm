/**
 * Création des index composites pour optimiser les requêtes fréquentes
 *
 * Les index composites sont essentiels pour les requêtes avec plusieurs conditions WHERE
 * et ORDER BY sur plusieurs colonnes.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

interface CompositeIndexDefinition {
  name: string;
  table: string;
  columns: string[];
  unique?: boolean;
  description: string;
}

/**
 * Liste des index composites à créer
 * Optimisés pour les requêtes fréquentes identifiées dans les repositories
 */
const compositeIndexes: CompositeIndexDefinition[] = [
  // Production Animaux
  {
    name: 'idx_production_animaux_projet_actif',
    table: 'production_animaux',
    columns: ['projet_id', 'actif'],
    description: 'Optimise les requêtes findByProjet avec filtre actif',
  },
  {
    name: 'idx_production_animaux_projet_statut',
    table: 'production_animaux',
    columns: ['projet_id', 'statut'],
    description: 'Optimise les requêtes findByProjet avec filtre statut',
  },
  {
    name: 'idx_production_animaux_projet_reproducteur',
    table: 'production_animaux',
    columns: ['projet_id', 'reproducteur', 'actif'],
    description: 'Optimise les requêtes de reproducteurs actifs par projet',
  },
  {
    name: 'idx_production_animaux_code_projet',
    table: 'production_animaux',
    columns: ['code', 'projet_id'],
    unique: true,
    description: 'Optimise les recherches par code (déjà existant mais vérifié)',
  },

  // Production Pesées
  {
    name: 'idx_production_pesees_animal_date',
    table: 'production_pesees',
    columns: ['animal_id', 'date'],
    description: 'Optimise les requêtes de pesées par animal triées par date',
  },
  {
    name: 'idx_production_pesees_projet_date',
    table: 'production_pesees',
    columns: ['projet_id', 'date'],
    description: 'Optimise les requêtes de pesées par projet triées par date',
  },

  // Gestations
  {
    name: 'idx_gestations_projet_statut',
    table: 'gestations',
    columns: ['projet_id', 'statut'],
    description: 'Optimise les requêtes de gestations par projet et statut',
  },
  {
    name: 'idx_gestations_truie_date',
    table: 'gestations',
    columns: ['truie_id', 'date_sautage'],
    description: 'Optimise les requêtes de gestations par truie triées par date',
  },

  // Revenus
  {
    name: 'idx_revenus_projet_date',
    table: 'revenus',
    columns: ['projet_id', 'date'],
    description: 'Optimise les requêtes de revenus par projet et période',
  },
  {
    name: 'idx_revenus_projet_animal',
    table: 'revenus',
    columns: ['projet_id', 'animal_id'],
    description: 'Optimise les requêtes de revenus par projet et animal',
  },

  // Dépenses
  {
    name: 'idx_depenses_projet_date',
    table: 'depenses_ponctuelles',
    columns: ['projet_id', 'date'],
    description: 'Optimise les requêtes de dépenses par projet et période',
  },
  {
    name: 'idx_depenses_projet_categorie',
    table: 'depenses_ponctuelles',
    columns: ['projet_id', 'categorie'],
    description: 'Optimise les requêtes de dépenses par projet et catégorie',
  },

  // Charges fixes
  {
    name: 'idx_charges_fixes_projet_statut',
    table: 'charges_fixes',
    columns: ['projet_id', 'statut'],
    description: 'Optimise les requêtes de charges fixes par projet et statut',
  },

  // Vaccinations
  {
    name: 'idx_vaccinations_projet_date',
    table: 'vaccinations',
    columns: ['projet_id', 'date_vaccination'],
    description: 'Optimise les requêtes de vaccinations par projet triées par date',
  },
  {
    name: 'idx_vaccinations_projet_statut',
    table: 'vaccinations',
    columns: ['projet_id', 'statut'],
    description: 'Optimise les requêtes de vaccinations par projet et statut',
  },
  {
    name: 'idx_vaccinations_animal_date',
    table: 'vaccinations',
    columns: ['animal_id', 'date_vaccination'],
    description: 'Optimise les requêtes de vaccinations par animal triées par date',
  },

  // Traitements
  {
    name: 'idx_traitements_projet_date',
    table: 'traitements',
    columns: ['projet_id', 'date_debut'],
    description: 'Optimise les requêtes de traitements par projet triées par date',
  },
  {
    name: 'idx_traitements_animal_date',
    table: 'traitements',
    columns: ['animal_id', 'date_debut'],
    description: 'Optimise les requêtes de traitements par animal triées par date',
  },

  // Maladies
  {
    name: 'idx_maladies_projet_date',
    table: 'maladies',
    columns: ['projet_id', 'date_debut'],
    description: 'Optimise les requêtes de maladies par projet triées par date',
  },
  {
    name: 'idx_maladies_animal_date',
    table: 'maladies',
    columns: ['animal_id', 'date_debut'],
    description: 'Optimise les requêtes de maladies par animal triées par date',
  },

  // Planifications
  {
    name: 'idx_planifications_projet_statut',
    table: 'planifications',
    columns: ['projet_id', 'statut'],
    description: 'Optimise les requêtes de planifications par projet et statut',
  },
  {
    name: 'idx_planifications_projet_date',
    table: 'planifications',
    columns: ['projet_id', 'date_prevue'],
    description: 'Optimise les requêtes de planifications par projet triées par date',
  },

  // Collaborations
  {
    name: 'idx_collaborations_projet_statut',
    table: 'collaborations',
    columns: ['projet_id', 'statut'],
    description: 'Optimise les requêtes de collaborations par projet et statut',
  },
  {
    name: 'idx_collaborations_user_statut',
    table: 'collaborations',
    columns: ['user_id', 'statut'],
    description: 'Optimise les requêtes de collaborations par utilisateur et statut',
  },

  // Stocks
  {
    name: 'idx_stocks_mouvements_aliment_date',
    table: 'stocks_mouvements',
    columns: ['aliment_id', 'date'],
    description: 'Optimise les requêtes de mouvements de stock par aliment triées par date',
  },
  {
    name: 'idx_stocks_mouvements_projet_type',
    table: 'stocks_mouvements',
    columns: ['projet_id', 'type'],
    description: 'Optimise les requêtes de mouvements par projet et type',
  },

  // Rations
  {
    name: 'idx_rations_projet_type',
    table: 'rations',
    columns: ['projet_id', 'type_porc'],
    description: 'Optimise les requêtes de rations par projet et type de porc',
  },

  // Mortalités
  {
    name: 'idx_mortalites_projet_date',
    table: 'mortalites',
    columns: ['projet_id', 'date'],
    description: 'Optimise les requêtes de mortalités par projet triées par date',
  },
  {
    name: 'idx_mortalites_projet_categorie',
    table: 'mortalites',
    columns: ['projet_id', 'categorie'],
    description: 'Optimise les requêtes de mortalités par projet et catégorie',
  },
];

function validateIdentifier(name: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
}

async function indexExists(db: SQLiteDatabase, indexName: string): Promise<boolean> {
  try {
    const result = await db.getFirstAsync<{ name: string } | null>(
      `SELECT name FROM sqlite_master WHERE type='index' AND name=?`,
      [indexName]
    );
    return result !== null;
  } catch {
    return false;
  }
}

/**
 * Crée un index composite avec gestion d'erreur
 */
async function createCompositeIndex(
  db: SQLiteDatabase,
  index: CompositeIndexDefinition
): Promise<boolean> {
  // Vérifier si l'index existe déjà
  if (await indexExists(db, index.name)) {
    return true;
  }

  try {
    validateIdentifier(index.name);
    validateIdentifier(index.table);
    index.columns.forEach(c => validateIdentifier(c));

    // Vérifier que la table existe
    const tableExists = await db.getFirstAsync<{ name: string } | null>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [index.table]
    );

    if (!tableExists) {
      console.warn(`⚠️  Index ${index.name} non créé: table ${index.table} n'existe pas`);
      return false;
    }

    // Vérifier que toutes les colonnes existent
    for (const column of index.columns) {
      const columnExists = await db.getFirstAsync<{ name: string } | null>(
        `SELECT name FROM pragma_table_info('${index.table}') WHERE name = ?`,
        [column]
      );

      if (!columnExists) {
        console.warn(
          `⚠️  Index ${index.name} non créé: colonne ${column} n'existe pas dans ${index.table}`
        );
        return false;
      }
    }

    // Créer l'index composite
    const uniqueClause = index.unique ? 'UNIQUE' : '';
    const columns = index.columns.join(', ');
    const sql = `CREATE ${uniqueClause} INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${columns})`;

    await db.execAsync(sql);

    console.log(`✅ Index composite ${index.name} créé: ${index.description}`);
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Erreur lors de la création de l'index ${index.name}:`, errorMessage);
    return false;
  }
}

/**
 * Crée tous les index composites pour optimiser les requêtes fréquentes
 *
 * @param db - Instance de la base de données SQLite
 */
export async function createCompositeIndexes(db: SQLiteDatabase): Promise<void> {
  if (!db) {
    throw new Error('Base de données non initialisée lors de la création des index composites');
  }

  console.log('🔧 [DB] Création des index composites pour optimiser les requêtes...');

  let successCount = 0;
  let failureCount = 0;

  for (const index of compositeIndexes) {
    const success = await createCompositeIndex(db, index);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log(
    `✅ [DB] Index composites créés: ${successCount} succès, ${failureCount} échecs (sur ${compositeIndexes.length} index)`
  );

  if (failureCount > 0) {
    console.warn(
      `⚠️  [DB] ${failureCount} index(s) composite(s) n'ont pas pu être créés. Certaines requêtes peuvent être plus lentes.`
    );
  }
}
