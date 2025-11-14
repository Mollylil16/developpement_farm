/**
 * Service de base de données SQLite
 * Gère toutes les opérations de base de données pour l'application
 */

import * as SQLite from 'expo-sqlite';
import {
  Projet,
  ChargeFixe,
  DepensePonctuelle,
  UpdateDepensePonctuelleInput,
  Revenu,
  UpdateRevenuInput,
  Gestation,
  Sevrage,
  Ingredient,
  Ration,
  RapportCroissance,
  Mortalite,
  Planification,
  Collaborateur,
  UpdateCollaborateurInput,
  StockAliment,
  CreateStockAlimentInput,
  UpdateStockAlimentInput,
  StockMouvement,
  CreateStockMouvementInput,
  ProductionAnimal,
  CreateProductionAnimalInput,
  UpdateProductionAnimalInput,
  ProductionPesee,
  CreatePeseeInput,
  ProductionStandardGMQ,
  getStandardGMQ,
  User,
} from '../types';
import { calculerDateMiseBasPrevue } from '../types/reproduction';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  /**
   * Initialise la connexion à la base de données
   */
  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('fermier_pro.db');
      await this.createTables();
      await this.migrateTables();
      await this.createIndexesWithProjetId();
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la base de données:', error);
      throw error;
    }
  }

  /**
   * Migrations pour les bases de données existantes
   */
  private async migrateTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    try {
      // Toutes les migrations sont dans un try-catch global pour éviter qu'une erreur bloque l'initialisation
      
      // Migration: Mettre à jour la table users pour supporter email OU téléphone (sans mot de passe)
      try {
        const usersTableExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        );

        if (usersTableExists) {
          // Vérifier si la colonne telephone existe
          const telephoneInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('users') WHERE name = 'telephone'"
          );

          if (!telephoneInfo) {
            // Ajouter la colonne telephone
            await this.db.execAsync(`
              ALTER TABLE users ADD COLUMN telephone TEXT;
            `);
            console.log('Migration: Colonne telephone ajoutée à la table users');
          }

          // Vérifier si la colonne email est encore NOT NULL (anciennes installations)
          const usersColumns = await this.db.getAllAsync<{
            name: string;
            notnull: number;
          }>("PRAGMA table_info('users')");

          const emailColumn = usersColumns.find((col) => col.name === 'email');

          if (emailColumn && emailColumn.notnull === 1) {
            console.log(
              'Migration: Recréation de la table users pour permettre email ou téléphone facultatif'
            );

            // Renommer l'ancienne table
            await this.db.execAsync(`ALTER TABLE users RENAME TO users_old;`);

            // Recréer la table avec la nouvelle structure (email/telephone facultatifs)
            await this.db.execAsync(`
              CREATE TABLE users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                telephone TEXT UNIQUE,
                nom TEXT NOT NULL,
                prenom TEXT NOT NULL,
                password_hash TEXT,
                provider TEXT NOT NULL CHECK (provider IN ('email', 'google', 'apple', 'telephone')) DEFAULT 'email',
                provider_id TEXT,
                photo TEXT,
                date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
                derniere_connexion TEXT,
                is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
                CHECK (email IS NOT NULL OR telephone IS NOT NULL)
              );
            `);

            // Copier les données existantes
            await this.db.execAsync(`
              INSERT INTO users (
                id, email, telephone, nom, prenom, password_hash, provider,
                provider_id, photo, date_creation, derniere_connexion, is_active
              )
              SELECT
                id,
                NULLIF(email, ''),
                NULLIF(telephone, ''),
                nom,
                prenom,
                password_hash,
                CASE
                  WHEN provider IN ('email', 'google', 'apple', 'telephone') THEN provider
                  ELSE 'email'
                END,
                provider_id,
                photo,
                date_creation,
                derniere_connexion,
                COALESCE(is_active, 1)
              FROM users_old;
            `);

            // Supprimer l'ancienne table
            await this.db.execAsync(`DROP TABLE users_old;`);

            console.log('Migration: Table users recréée avec succès');
          }
        }
      } catch (error: any) {
        console.warn('Erreur lors de la migration de la table users:', error?.message || error);
      }

      // Migration: Ajouter projet_id à la table rations si elle n'existe pas
      try {
        // Vérifier d'abord si la table rations existe
        const rationsTableExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='rations'"
        );

        if (rationsTableExists) {
          const tableInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('rations') WHERE name = 'projet_id'"
          );
          
          if (!tableInfo) {
            // La colonne n'existe pas, on l'ajoute
            await this.db.execAsync(`
              ALTER TABLE rations ADD COLUMN projet_id TEXT;
            `);
            
            // Pour les rations existantes sans projet_id, on peut les associer au premier projet actif
            // ou les laisser NULL (selon votre logique métier)
            console.log('Migration: Colonne projet_id ajoutée à la table rations');
          }
        } else {
          // Table n'existe pas encore, elle sera créée avec projet_id dans createTables
          console.log('Migration: Table rations n\'existe pas encore, sera créée avec projet_id');
        }
      } catch (error: any) {
        console.warn('Erreur lors de la migration projet_id pour rations:', error?.message || error);
      }

      // Migration: Ajouter statut à la table production_animaux si elle n'existe pas
      const statutInfo = await this.db.getFirstAsync<{ name: string } | null>(
        "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'statut'"
      );
      
      if (!statutInfo) {
        // La colonne n'existe pas, on l'ajoute
        await this.db.execAsync(`
          ALTER TABLE production_animaux ADD COLUMN statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'mort', 'vendu', 'offert', 'autre'));
        `);
        
        // Pour les animaux existants, définir le statut basé sur actif
        await this.db.execAsync(`
          UPDATE production_animaux 
          SET statut = CASE 
            WHEN actif = 1 THEN 'actif' 
            ELSE 'autre' 
          END
          WHERE statut IS NULL;
        `);
        
        console.log('Migration: Colonne statut ajoutée à la table production_animaux');
      }

      // Migration: Ajouter user_id à la table collaborations si elle n'existe pas
      try {
        const collaborationsTableExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='collaborations'"
        );

        if (collaborationsTableExists) {
          const userIdInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('collaborations') WHERE name = 'user_id'"
          );
          
          if (!userIdInfo) {
            console.log('🔄 Migration: Ajout de la colonne user_id à la table collaborations...');
            
            // Ajouter la colonne user_id (nullable car les anciens collaborateurs n'ont pas encore de user_id)
            await this.db.execAsync(`
              ALTER TABLE collaborations ADD COLUMN user_id TEXT;
            `);
            
            // Créer un index pour user_id
            await this.db.execAsync(`
              CREATE INDEX IF NOT EXISTS idx_collaborations_user_id ON collaborations(user_id);
            `);
            
            console.log('✅ Migration: Colonne user_id ajoutée à la table collaborations avec succès');
          } else {
            console.log('✅ Migration: Colonne user_id existe déjà dans la table collaborations');
          }
        } else {
          console.log('ℹ️ Migration: Table collaborations n\'existe pas encore, sera créée avec user_id');
        }
      } catch (error: any) {
        console.error('❌ Erreur lors de la migration user_id pour collaborations:', error?.message || error);
        console.error('Détails de l\'erreur:', error);
        // Ne pas bloquer l'initialisation, mais loguer l'erreur clairement
      }

      // Migration: Ajouter race à la table production_animaux si elle n'existe pas
      const raceInfo = await this.db.getFirstAsync<{ name: string } | null>(
        "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'race'"
      );

      if (!raceInfo) {
        await this.db.execAsync(`
          ALTER TABLE production_animaux ADD COLUMN race TEXT;
        `);
        console.log('Migration: Colonne race ajoutée à la table production_animaux');
      }

      // Migration: Ajouter reproducteur (booléen) si absent
      const reproducteurInfo = await this.db.getFirstAsync<{ name: string } | null>(
        "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'reproducteur'"
      );

      if (!reproducteurInfo) {
        await this.db.execAsync(`
          ALTER TABLE production_animaux ADD COLUMN reproducteur INTEGER DEFAULT 0 CHECK (reproducteur IN (0, 1));
        `);
        await this.db.execAsync(`
          UPDATE production_animaux SET reproducteur = 0 WHERE reproducteur IS NULL;
        `);
        console.log('Migration: Colonne reproducteur ajoutée à la table production_animaux');
      }

      // Migration: Ajouter pere_id si absent
      const pereInfo = await this.db.getFirstAsync<{ name: string } | null>(
        "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'pere_id'"
      );

      if (!pereInfo) {
        await this.db.execAsync(`
          ALTER TABLE production_animaux ADD COLUMN pere_id TEXT;
        `);
        console.log('Migration: Colonne pere_id ajoutée à la table production_animaux');
      }

      // Migration: Ajouter mere_id si absent
      const mereInfo = await this.db.getFirstAsync<{ name: string } | null>(
        "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'mere_id'"
      );

      if (!mereInfo) {
        await this.db.execAsync(`
          ALTER TABLE production_animaux ADD COLUMN mere_id TEXT;
        `);
        console.log('Migration: Colonne mere_id ajoutée à la table production_animaux');
      }

      // Migration: Ajouter verrat_id à la table gestations si elle n'existe pas
      try {
        // Vérifier d'abord si la table gestations existe
        const gestationsTableExistsForVerratId = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='gestations'"
        );

        if (gestationsTableExistsForVerratId) {
          const verratIdInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('gestations') WHERE name = 'verrat_id'"
          );

          if (!verratIdInfo) {
            await this.db.execAsync(`
              ALTER TABLE gestations ADD COLUMN verrat_id TEXT;
            `);
            console.log('Migration: Colonne verrat_id ajoutée à la table gestations');
          }
        }
      } catch (error: any) {
        console.warn('Erreur lors de la migration verrat_id pour gestations:', error?.message || error);
      }

      // Migration: Ajouter verrat_nom à la table gestations si elle n'existe pas
      try {
        // Vérifier d'abord si la table gestations existe
        const gestationsTableExistsForVerratNom = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='gestations'"
        );

        if (gestationsTableExistsForVerratNom) {
          const verratNomInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('gestations') WHERE name = 'verrat_nom'"
          );

          if (!verratNomInfo) {
            await this.db.execAsync(`
              ALTER TABLE gestations ADD COLUMN verrat_nom TEXT;
            `);
            console.log('Migration: Colonne verrat_nom ajoutée à la table gestations');
          }
        }
      } catch (error: any) {
        console.warn('Erreur lors de la migration verrat_nom pour gestations:', error?.message || error);
      }

      // Migration: Ajouter projet_id à la table gestations si elle n'existe pas
      try {
        // Vérifier d'abord si la table gestations existe
        const gestationsTableExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='gestations'"
        );

        if (gestationsTableExists) {
          const gestationsProjetIdInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('gestations') WHERE name = 'projet_id'"
          );

          if (!gestationsProjetIdInfo) {
            await this.db.execAsync(`
              ALTER TABLE gestations ADD COLUMN projet_id TEXT;
            `);
            // Mettre à jour les gestations existantes avec le premier projet actif (si disponible)
            const premierProjet = await this.db.getFirstAsync<{ id: string } | null>(
              'SELECT id FROM projets ORDER BY date_creation ASC LIMIT 1'
            );
            if (premierProjet) {
              await this.db.runAsync(
                'UPDATE gestations SET projet_id = ? WHERE projet_id IS NULL',
                [premierProjet.id]
              );
            }
            console.log('Migration: Colonne projet_id ajoutée à la table gestations');
          }
        } else {
          // Table n'existe pas encore, elle sera créée avec projet_id dans createTables
          console.log('Migration: Table gestations n\'existe pas encore, sera créée avec projet_id');
        }
      } catch (error: any) {
        console.warn('Erreur lors de la migration projet_id pour gestations:', error?.message || error);
      }

      // Migration: Ajouter animal_code à la table mortalites si elle n'existe pas
      try {
        // Vérifier d'abord si la table mortalites existe
        const mortalitesTableExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='mortalites'"
        );

        if (mortalitesTableExists) {
          const animalCodeInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('mortalites') WHERE name = 'animal_code'"
          );

          if (!animalCodeInfo) {
            await this.db.execAsync(`
              ALTER TABLE mortalites ADD COLUMN animal_code TEXT;
            `);
            console.log('Migration: Colonne animal_code ajoutée à la table mortalites');
          }
        } else {
          // Table n'existe pas encore, elle sera créée avec animal_code dans createTables
          console.log('Migration: Table mortalites n\'existe pas encore, sera créée avec animal_code');
        }
      } catch (error: any) {
        console.warn('Erreur lors de la migration animal_code pour mortalites:', error?.message || error);
      }

      // Migration: Ajouter projet_id à la table sevrages si elle n'existe pas
      // IMPORTANT: Cette migration doit être exécutée APRÈS celle de gestations
      try {
        // Vérifier d'abord si la table sevrages existe
        const sevragesTableExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='sevrages'"
        );

        if (!sevragesTableExists) {
          // Table n'existe pas encore, elle sera créée avec projet_id dans createTables
          console.log('Migration: Table sevrages n\'existe pas encore, sera créée avec projet_id');
        } else {
          const sevragesProjetIdInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('sevrages') WHERE name = 'projet_id'"
          );

          if (!sevragesProjetIdInfo) {
            await this.db.execAsync(`
              ALTER TABLE sevrages ADD COLUMN projet_id TEXT;
            `);
            
            // Vérifier d'abord si la table gestations existe et a la colonne projet_id
            const gestationsTableExists = await this.db.getFirstAsync<{ name: string } | null>(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='gestations'"
            );
            
            if (gestationsTableExists) {
              const gestationsHasProjetId = await this.db.getFirstAsync<{ name: string } | null>(
                "SELECT name FROM pragma_table_info('gestations') WHERE name = 'projet_id'"
              );
              
              if (gestationsHasProjetId) {
                // Vérifier que la colonne projet_id est réellement utilisable dans gestations
                try {
                  // Test de la colonne avec une requête simple
                  await this.db.getFirstAsync<any>('SELECT projet_id FROM gestations LIMIT 1');
                  
                  // Si on arrive ici, la colonne est utilisable
                  // Vérifier qu'il y a des gestations avec projet_id
                  const gestationsAvecProjetId = await this.db.getFirstAsync<{ count: number } | null>(
                    'SELECT COUNT(*) as count FROM gestations WHERE projet_id IS NOT NULL'
                  );
                  
                  if (gestationsAvecProjetId && gestationsAvecProjetId.count > 0) {
                    // Utiliser une requête UPDATE avec sous-requête
                    await this.db.runAsync(
                      `UPDATE sevrages 
                       SET projet_id = (
                         SELECT projet_id FROM gestations 
                         WHERE gestations.id = sevrages.gestation_id 
                         LIMIT 1
                       )
                       WHERE projet_id IS NULL AND EXISTS (
                         SELECT 1 FROM gestations 
                         WHERE gestations.id = sevrages.gestation_id 
                         AND gestations.projet_id IS NOT NULL
                       )`
                    );
                  } else {
                    // Pas de gestations avec projet_id, utiliser le premier projet
                    const premierProjet = await this.db.getFirstAsync<{ id: string } | null>(
                      'SELECT id FROM projets ORDER BY date_creation ASC LIMIT 1'
                    );
                    if (premierProjet) {
                      await this.db.runAsync(
                        'UPDATE sevrages SET projet_id = ? WHERE projet_id IS NULL',
                        [premierProjet.id]
                      );
                    }
                  }
                } catch (testError: any) {
                  // Si la colonne n'est pas utilisable, utiliser le premier projet comme fallback
                  console.warn('Colonne projet_id non utilisable dans gestations, utilisation du fallback:', testError?.message || testError);
                  const premierProjet = await this.db.getFirstAsync<{ id: string } | null>(
                    'SELECT id FROM projets ORDER BY date_creation ASC LIMIT 1'
                  );
                  if (premierProjet) {
                    await this.db.runAsync(
                      'UPDATE sevrages SET projet_id = ? WHERE projet_id IS NULL',
                      [premierProjet.id]
                    );
                  }
                }
              } else {
                // gestations n'a pas encore projet_id, utiliser le premier projet
                const premierProjet = await this.db.getFirstAsync<{ id: string } | null>(
                  'SELECT id FROM projets ORDER BY date_creation ASC LIMIT 1'
                );
                if (premierProjet) {
                  await this.db.runAsync(
                    'UPDATE sevrages SET projet_id = ? WHERE projet_id IS NULL',
                    [premierProjet.id]
                  );
                }
              }
            } else {
              // Table gestations n'existe pas, utiliser le premier projet
              const premierProjet = await this.db.getFirstAsync<{ id: string } | null>(
                'SELECT id FROM projets ORDER BY date_creation ASC LIMIT 1'
              );
              if (premierProjet) {
                await this.db.runAsync(
                  'UPDATE sevrages SET projet_id = ? WHERE projet_id IS NULL',
                  [premierProjet.id]
                );
              }
            }
            console.log('Migration: Colonne projet_id ajoutée à la table sevrages');
          }
        }
      } catch (error: any) {
        console.warn('Erreur lors de la migration projet_id pour sevrages:', error?.message || error);
      }

      // Migration: Ajouter projet_id à la table depenses_ponctuelles si elle n'existe pas
      try {
        // Vérifier d'abord si la table depenses_ponctuelles existe
        const depensesTableExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='depenses_ponctuelles'"
        );

        if (depensesTableExists) {
          const depensesProjetIdInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('depenses_ponctuelles') WHERE name = 'projet_id'"
          );

          if (!depensesProjetIdInfo) {
            await this.db.execAsync(`
              ALTER TABLE depenses_ponctuelles ADD COLUMN projet_id TEXT;
            `);
            // Mettre à jour les dépenses existantes avec le premier projet actif (si disponible)
            const premierProjet = await this.db.getFirstAsync<{ id: string } | null>(
              'SELECT id FROM projets ORDER BY date_creation ASC LIMIT 1'
            );
            if (premierProjet) {
              await this.db.runAsync(
                'UPDATE depenses_ponctuelles SET projet_id = ? WHERE projet_id IS NULL',
                [premierProjet.id]
              );
            }
            console.log('Migration: Colonne projet_id ajoutée à la table depenses_ponctuelles');
          }
        } else {
          // Table n'existe pas encore, elle sera créée avec projet_id dans createTables
          console.log('Migration: Table depenses_ponctuelles n\'existe pas encore, sera créée avec projet_id');
        }
      } catch (error: any) {
        console.warn('Erreur lors de la migration projet_id pour depenses_ponctuelles:', error?.message || error);
      }

      // Migration: Recalculer les GMQ des pesées existantes avec la nouvelle fonction de calcul
      // Cette migration ne s'exécute qu'une seule fois (vérification via une table de migrations)
      try {
        // Vérifier si la migration a déjà été effectuée
        const migrationCheck = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
        );

        let migrationEffectuee = false;
        if (migrationCheck) {
          const gmqMigration = await this.db.getFirstAsync<{ done: number } | null>(
            "SELECT done FROM _migrations WHERE migration = 'recalcul_gmq_2025'"
          );
          migrationEffectuee = gmqMigration?.done === 1;
        } else {
          // Créer la table de migrations si elle n'existe pas
          await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS _migrations (
              migration TEXT PRIMARY KEY,
              done INTEGER DEFAULT 0,
              date TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);
        }

        if (!migrationEffectuee) {
          const toutesLesPesees = await this.db.getAllAsync<any>(
            'SELECT id, animal_id, date, poids_kg FROM production_pesees ORDER BY animal_id, date ASC'
          );

          for (const pesee of toutesLesPesees) {
            const animal = await this.getProductionAnimalById(pesee.animal_id);
            // Récupérer la pesée précédente en excluant la pesée actuelle
            const previous = await this.db.getFirstAsync<any>(
              'SELECT * FROM production_pesees WHERE animal_id = ? AND date < ? AND id != ? ORDER BY date DESC LIMIT 1',
              [pesee.animal_id, pesee.date, pesee.id]
            );

            let poidsReference = animal.poids_initial ?? null;
            let dateReference = animal.date_entree ?? null;

            if (previous) {
              poidsReference = previous.poids_kg;
              dateReference = previous.date;
            }

            let gmq: number | null = null;
            let difference_standard: number | null = null;

            if (poidsReference !== null && dateReference) {
              const diffJours = this.calculateDayDifference(dateReference, pesee.date);
              if (diffJours > 0) {
                gmq = ((pesee.poids_kg - poidsReference) * 1000) / diffJours; // g/jour
                const standard = getStandardGMQ(pesee.poids_kg);
                if (standard) {
                  difference_standard = gmq - standard.gmq_cible;
                }
              }
            }

            // Mettre à jour le GMQ de cette pesée
            await this.db.runAsync(
              'UPDATE production_pesees SET gmq = ?, difference_standard = ? WHERE id = ?',
              [gmq ?? null, difference_standard ?? null, pesee.id]
            );
          }

          if (toutesLesPesees.length > 0) {
            console.log(`Migration: GMQ recalculé pour ${toutesLesPesees.length} pesées`);
          }

          // Marquer la migration comme effectuée
          await this.db.runAsync(
            'INSERT OR REPLACE INTO _migrations (migration, done) VALUES (?, ?)',
            ['recalcul_gmq_2025', 1]
          );
        }
      } catch (error) {
        // Si le recalcul échoue, on continue quand même
        console.warn('Erreur lors du recalcul des GMQ:', error);
      }
    } catch (error) {
      // Si la migration échoue, on continue quand même
      console.warn('Erreur lors de la migration des tables:', error);
    }
  }

  /**
   * Créer les index qui utilisent projet_id après les migrations
   * CRITIQUE: Ces index sont essentiels pour les performances (53+ requêtes utilisent projet_id)
   * Création individuelle avec gestion d'erreur et réessai agressif pour chaque index
   */
  private async createIndexesWithProjetId(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée lors de la création des index');
    }

    // Liste des index à créer avec leur table et colonne
    // CRITIQUES: Tous ces index sont essentiels pour les performances
    const indexes = [
      { name: 'idx_depenses_projet', table: 'depenses_ponctuelles', column: 'projet_id', critical: true },
      { name: 'idx_revenus_projet', table: 'revenus', column: 'projet_id', critical: true },
      { name: 'idx_rapports_croissance_projet', table: 'rapports_croissance', column: 'projet_id', critical: true },
      { name: 'idx_mortalites_projet', table: 'mortalites', column: 'projet_id', critical: true },
      { name: 'idx_planifications_projet', table: 'planifications', column: 'projet_id', critical: true },
      { name: 'idx_collaborations_projet', table: 'collaborations', column: 'projet_id', critical: true },
      { name: 'idx_stocks_aliments_projet', table: 'stocks_aliments', column: 'projet_id', critical: true },
      { name: 'idx_production_animaux_code', table: 'production_animaux', column: 'projet_id', unique: true, additionalColumns: 'code', critical: true },
    ];

    // Fonction helper pour vérifier si un index existe déjà
    const indexExists = async (indexName: string): Promise<boolean> => {
      try {
        const result = await this.db!.getFirstAsync<{ name: string } | null>(
          `SELECT name FROM sqlite_master WHERE type='index' AND name='${indexName}'`
        );
        return result !== null;
      } catch {
        return false;
      }
    };

    // Fonction helper pour créer un index avec réessai agressif
    const createIndexWithRetry = async (
      index: typeof indexes[0],
      maxRetries: number = 5  // Augmenté à 5 tentatives pour être plus agressif
    ): Promise<boolean> => {
      // Vérifier d'abord si l'index existe déjà
      if (await indexExists(index.name)) {
        return true;
      }

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Vérifier que la table existe
          const tableExists = await this.db!.getFirstAsync<{ name: string } | null>(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='${index.table}'`
          );
          
          if (!tableExists) {
            console.error(`❌ Index ${index.name} non créé: table ${index.table} n'existe pas`);
            return false;
          }

          // Vérifier que la colonne projet_id existe
          const columnExists = await this.db!.getFirstAsync<{ name: string } | null>(
            `SELECT name FROM pragma_table_info('${index.table}') WHERE name = '${index.column}'`
          );

          if (!columnExists) {
            console.error(`❌ Index ${index.name} non créé: colonne ${index.column} n'existe pas dans ${index.table}`);
            return false;
          }

          // Créer l'index
          if (index.unique && index.additionalColumns) {
            await this.db!.execAsync(
              `CREATE UNIQUE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.column}, ${index.additionalColumns})`
            );
          } else {
            await this.db!.execAsync(
              `CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.column})`
            );
          }

          // Vérifier que l'index a bien été créé
          if (await indexExists(index.name)) {
            console.log(`✓ Index ${index.name} créé avec succès`);
            return true;
          } else {
            throw new Error(`Index ${index.name} n'a pas été créé après l'exécution`);
          }
        } catch (error: any) {
          const errorMessage = error?.message || error;
          
          if (attempt < maxRetries) {
            // Délai progressif plus long pour les tentatives suivantes
            const delay = Math.min(200 * attempt, 1000); // Max 1 seconde
            await new Promise(resolve => setTimeout(resolve, delay));
            console.warn(`⚠ Tentative ${attempt}/${maxRetries} échouée pour ${index.name}, réessai dans ${delay}ms...`, errorMessage);
          } else {
            // Dernière tentative échouée
            console.error(`❌ Échec définitif de création de l'index ${index.name} après ${maxRetries} tentatives:`, errorMessage);
            return false;
          }
        }
      }

      return false;
    };

    // Créer tous les index (séquentiellement pour éviter les conflits)
    const results: boolean[] = [];
    for (const index of indexes) {
      const success = await createIndexWithRetry(index);
      results.push(success);
    }

    // Créer les index qui dépendent de colonnes ajoutées par migration (mais pas projet_id)
    // Index sur users(telephone) - colonne ajoutée par migration
    try {
      const usersTableExists = await this.db.getFirstAsync<{ name: string } | null>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      );

      if (usersTableExists) {
        const telephoneColumnExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM pragma_table_info('users') WHERE name = 'telephone'"
        );

        if (telephoneColumnExists) {
          if (!(await indexExists('idx_users_telephone'))) {
            await this.db.execAsync(`
              CREATE INDEX IF NOT EXISTS idx_users_telephone ON users(telephone);
            `);
            console.log('✓ Index idx_users_telephone créé avec succès');
          }
        }
      }
    } catch (error: any) {
      console.warn('Erreur lors de la création de idx_users_telephone:', error?.message || error);
    }

    // Index sur production_animaux(reproducteur) - colonne ajoutée par migration
    try {
      const tableExists = await this.db.getFirstAsync<{ name: string } | null>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='production_animaux'"
      );
      
      if (tableExists) {
        const columnExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'reproducteur'"
        );

        if (columnExists) {
          if (!(await indexExists('idx_production_animaux_reproducteur'))) {
            await this.db.execAsync(`
              CREATE INDEX IF NOT EXISTS idx_production_animaux_reproducteur ON production_animaux(reproducteur);
            `);
            console.log('✓ Index idx_production_animaux_reproducteur créé avec succès');
          }
        }
      }
    } catch (error: any) {
      console.warn('Erreur lors de la création de idx_production_animaux_reproducteur:', error?.message || error);
    }

    // Résumé et vérification critique
    const successCount = results.filter(r => r).length;
    const failCount = results.filter(r => !r).length;
    const failedIndexes = indexes.filter((_, i) => !results[i]);

    if (failCount > 0) {
      console.error(`❌ CRITIQUE: ${failCount} index(s) critique(s) n'ont pas pu être créés:`, failedIndexes.map(i => i.name).join(', '));
      console.error(`⚠ Sans ces index, les requêtes sur projet_id seront TRÈS LENTES (scan complet de table)`);
      console.error(`⚠ L'application fonctionnera mais l'expérience utilisateur sera dégradée`);
      
      // Ne pas bloquer l'initialisation, mais logger sévèrement
      // L'application pourra réessayer lors de la prochaine initialisation
    } else {
      console.log(`✓ Tous les index critiques (${successCount}/${indexes.length}) ont été créés avec succès`);
    }
  }

  /**
   * Vérifie et répare les index manquants (peut être appelé périodiquement)
   */
  async repairMissingIndexes(): Promise<{ repaired: number; failed: number }> {
    if (!this.db) {
      return { repaired: 0, failed: 0 };
    }

    console.log('🔧 Vérification et réparation des index manquants...');
    await this.createIndexesWithProjetId();
    
    // Compter les index manquants après réparation
    const indexes = [
      'idx_depenses_projet',
      'idx_revenus_projet',
      'idx_rapports_croissance_projet',
      'idx_mortalites_projet',
      'idx_planifications_projet',
      'idx_collaborations_projet',
      'idx_stocks_aliments_projet',
      'idx_production_animaux_code',
      'idx_production_animaux_reproducteur',
    ];

    let repaired = 0;
    let failed = 0;

    for (const indexName of indexes) {
      const exists = await this.db.getFirstAsync<{ name: string } | null>(
        `SELECT name FROM sqlite_master WHERE type='index' AND name='${indexName}'`
      );
      if (exists) {
        repaired++;
      } else {
        failed++;
      }
    }

    if (failed > 0) {
      console.warn(`⚠ ${failed} index(s) toujours manquant(s) après réparation`);
    } else {
      console.log(`✓ Tous les index sont présents`);
    }

    return { repaired, failed };
  }

  /**
   * Crée toutes les tables nécessaires
   */
  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Table users
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        telephone TEXT UNIQUE,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        password_hash TEXT,
        provider TEXT NOT NULL CHECK (provider IN ('email', 'google', 'apple', 'telephone')) DEFAULT 'email',
        provider_id TEXT,
        photo TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_connexion TEXT,
        is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
        CHECK (email IS NOT NULL OR telephone IS NOT NULL)
      );
    `);

    // Table projets
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS projets (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        localisation TEXT NOT NULL,
        nombre_truies INTEGER NOT NULL,
        nombre_verrats INTEGER NOT NULL,
        nombre_porcelets INTEGER NOT NULL,
        poids_moyen_actuel REAL NOT NULL,
        age_moyen_actuel INTEGER NOT NULL,
        notes TEXT,
        statut TEXT NOT NULL CHECK (statut IN ('actif', 'archive', 'suspendu')),
        proprietaire_id TEXT NOT NULL,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table charges_fixes
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS charges_fixes (
        id TEXT PRIMARY KEY,
        categorie TEXT NOT NULL,
        libelle TEXT NOT NULL,
        montant REAL NOT NULL,
        date_debut TEXT NOT NULL,
        frequence TEXT NOT NULL CHECK (frequence IN ('mensuel', 'trimestriel', 'annuel')),
        jour_paiement INTEGER,
        notes TEXT,
        statut TEXT NOT NULL CHECK (statut IN ('actif', 'suspendu', 'termine')),
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table depenses_ponctuelles
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS depenses_ponctuelles (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        montant REAL NOT NULL,
        categorie TEXT NOT NULL,
        libelle_categorie TEXT,
        date TEXT NOT NULL,
        commentaire TEXT,
        photos TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Table revenus
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS revenus (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        montant REAL NOT NULL,
        categorie TEXT NOT NULL CHECK (categorie IN ('vente_porc', 'vente_autre', 'subvention', 'autre')),
        libelle_categorie TEXT,
        date TEXT NOT NULL,
        description TEXT,
        commentaire TEXT,
        photos TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Table gestations
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS gestations (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        truie_id TEXT NOT NULL,
        truie_nom TEXT,
        verrat_id TEXT,
        verrat_nom TEXT,
        date_sautage TEXT NOT NULL,
        date_mise_bas_prevue TEXT NOT NULL,
        date_mise_bas_reelle TEXT,
        nombre_porcelets_prevu INTEGER NOT NULL,
        nombre_porcelets_reel INTEGER,
        statut TEXT NOT NULL CHECK (statut IN ('en_cours', 'terminee', 'annulee')),
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Table sevrages
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sevrages (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        gestation_id TEXT NOT NULL,
        date_sevrage TEXT NOT NULL,
        nombre_porcelets_sevres INTEGER NOT NULL,
        poids_moyen_sevrage REAL,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id),
        FOREIGN KEY (gestation_id) REFERENCES gestations(id)
      );
    `);

    // Table ingredients
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        unite TEXT NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml')),
        prix_unitaire REAL NOT NULL,
        proteine_pourcent REAL,
        energie_kcal REAL,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table stocks_aliments
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS stocks_aliments (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        nom TEXT NOT NULL,
        categorie TEXT,
        quantite_actuelle REAL NOT NULL,
        unite TEXT NOT NULL,
        seuil_alerte REAL,
        date_derniere_entree TEXT,
        date_derniere_sortie TEXT,
        alerte_active INTEGER DEFAULT 0,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Table stocks_mouvements
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS stocks_mouvements (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        aliment_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('entree', 'sortie', 'ajustement')),
        quantite REAL NOT NULL,
        unite TEXT NOT NULL,
        date TEXT NOT NULL,
        origine TEXT,
        commentaire TEXT,
        cree_par TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id),
        FOREIGN KEY (aliment_id) REFERENCES stocks_aliments(id)
      );
    `);

    // Table production_animaux
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS production_animaux (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        code TEXT NOT NULL,
        nom TEXT,
        origine TEXT,
        sexe TEXT NOT NULL CHECK (sexe IN ('male', 'femelle', 'indetermine')) DEFAULT 'indetermine',
        date_naissance TEXT,
        poids_initial REAL,
        date_entree TEXT,
        actif INTEGER DEFAULT 1,
        statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'mort', 'vendu', 'offert', 'autre')),
        race TEXT,
        reproducteur INTEGER DEFAULT 0 CHECK (reproducteur IN (0, 1)),
        pere_id TEXT,
        mere_id TEXT,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id),
        FOREIGN KEY (pere_id) REFERENCES production_animaux(id),
        FOREIGN KEY (mere_id) REFERENCES production_animaux(id)
      );
    `);

    // Table production_pesees
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS production_pesees (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        animal_id TEXT NOT NULL,
        date TEXT NOT NULL,
        poids_kg REAL NOT NULL,
        gmq REAL,
        difference_standard REAL,
        commentaire TEXT,
        cree_par TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id),
        FOREIGN KEY (animal_id) REFERENCES production_animaux(id)
      );
    `);

    // Table rations
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS rations (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        type_porc TEXT NOT NULL CHECK (type_porc IN ('porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance')),
        poids_kg REAL NOT NULL,
        nombre_porcs INTEGER,
        cout_total REAL,
        cout_par_kg REAL,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Table ingredients_ration (table de liaison)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ingredients_ration (
        id TEXT PRIMARY KEY,
        ration_id TEXT NOT NULL,
        ingredient_id TEXT NOT NULL,
        quantite REAL NOT NULL,
        FOREIGN KEY (ration_id) REFERENCES rations(id),
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
      );
    `);

    // Table rapports_croissance
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS rapports_croissance (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        date TEXT NOT NULL,
        poids_moyen REAL NOT NULL,
        nombre_porcs INTEGER NOT NULL,
        gain_quotidien REAL,
        poids_cible REAL,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Table mortalites
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS mortalites (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        nombre_porcs INTEGER NOT NULL,
        date TEXT NOT NULL,
        cause TEXT,
        categorie TEXT NOT NULL CHECK (categorie IN ('porcelet', 'truie', 'verrat', 'autre')),
        animal_code TEXT,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Table planifications
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS planifications (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('saillie', 'vaccination', 'sevrage', 'nettoyage', 'alimentation', 'veterinaire', 'autre')),
        titre TEXT NOT NULL,
        description TEXT,
        date_prevue TEXT NOT NULL,
        date_echeance TEXT,
        rappel TEXT,
        statut TEXT NOT NULL CHECK (statut IN ('a_faire', 'en_cours', 'terminee', 'annulee')),
        recurrence TEXT CHECK (recurrence IN ('aucune', 'quotidienne', 'hebdomadaire', 'mensuelle')),
        lien_gestation_id TEXT,
        lien_sevrage_id TEXT,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Table collaborations
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS collaborations (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        user_id TEXT,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        email TEXT NOT NULL,
        telephone TEXT,
        role TEXT NOT NULL CHECK (role IN ('proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur')),
        statut TEXT NOT NULL CHECK (statut IN ('actif', 'inactif', 'en_attente')),
        permission_reproduction INTEGER DEFAULT 0,
        permission_nutrition INTEGER DEFAULT 0,
        permission_finance INTEGER DEFAULT 0,
        permission_rapports INTEGER DEFAULT 0,
        permission_planification INTEGER DEFAULT 0,
        permission_mortalites INTEGER DEFAULT 0,
        date_invitation TEXT NOT NULL,
        date_acceptation TEXT,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Index pour optimiser les requêtes (sans ceux qui utilisent projet_id)
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
      CREATE INDEX IF NOT EXISTS idx_projets_statut ON projets(statut);
      CREATE INDEX IF NOT EXISTS idx_charges_fixes_statut ON charges_fixes(statut);
      CREATE INDEX IF NOT EXISTS idx_depenses_date ON depenses_ponctuelles(date);
      CREATE INDEX IF NOT EXISTS idx_revenus_date ON revenus(date);
      CREATE INDEX IF NOT EXISTS idx_gestations_statut ON gestations(statut);
      CREATE INDEX IF NOT EXISTS idx_gestations_date_mise_bas ON gestations(date_mise_bas_prevue);
      CREATE INDEX IF NOT EXISTS idx_sevrages_gestation ON sevrages(gestation_id);
      CREATE INDEX IF NOT EXISTS idx_rations_type ON rations(type_porc);
      CREATE INDEX IF NOT EXISTS idx_ingredients_ration_ration ON ingredients_ration(ration_id);
      CREATE INDEX IF NOT EXISTS idx_rapports_croissance_date ON rapports_croissance(date);
      CREATE INDEX IF NOT EXISTS idx_mortalites_date ON mortalites(date);
      CREATE INDEX IF NOT EXISTS idx_mortalites_categorie ON mortalites(categorie);
      CREATE INDEX IF NOT EXISTS idx_planifications_date_prevue ON planifications(date_prevue);
      CREATE INDEX IF NOT EXISTS idx_planifications_statut ON planifications(statut);
      CREATE INDEX IF NOT EXISTS idx_planifications_type ON planifications(type);
      CREATE INDEX IF NOT EXISTS idx_collaborations_statut ON collaborations(statut);
      CREATE INDEX IF NOT EXISTS idx_collaborations_role ON collaborations(role);
      CREATE INDEX IF NOT EXISTS idx_collaborations_email ON collaborations(email);
      CREATE INDEX IF NOT EXISTS idx_collaborations_user_id ON collaborations(user_id);
      CREATE INDEX IF NOT EXISTS idx_stocks_aliments_alerte ON stocks_aliments(alerte_active);
      CREATE INDEX IF NOT EXISTS idx_stocks_mouvements_aliment ON stocks_mouvements(aliment_id);
      CREATE INDEX IF NOT EXISTS idx_stocks_mouvements_date ON stocks_mouvements(date);
      CREATE INDEX IF NOT EXISTS idx_production_animaux_actif ON production_animaux(actif);
      CREATE INDEX IF NOT EXISTS idx_production_pesees_animal ON production_pesees(animal_id);
      CREATE INDEX IF NOT EXISTS idx_production_pesees_date ON production_pesees(date);
    `);
  }

  /**
   * ============================================
   * GESTION DES UTILISATEURS
   * ============================================
   */

  /**
   * Créer un nouvel utilisateur
   */
  async createUser(input: {
    email?: string;
    telephone?: string;
    nom: string;
    prenom: string;
    provider?: 'email' | 'google' | 'apple' | 'telephone';
    provider_id?: string;
    photo?: string;
  }): Promise<User> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Vérifier qu'au moins email ou téléphone est fourni
    if (!input.email && !input.telephone) {
      throw new Error('Email ou numéro de téléphone requis');
    }

    // Vérifier si l'email existe déjà (si fourni)
    if (input.email) {
      const normalizedEmail = input.email.trim().toLowerCase();
      const existingEmail = await this.db.getFirstAsync<{ id: string } | null>(
        'SELECT id FROM users WHERE email = ?',
        [normalizedEmail]
      );

      if (existingEmail) {
        throw new Error('Un compte existe déjà avec cet email');
      }
    }

    // Vérifier si le téléphone existe déjà (si fourni)
    if (input.telephone) {
      const existingPhone = await this.db.getFirstAsync<{ id: string } | null>(
        'SELECT id FROM users WHERE telephone = ?',
        [input.telephone]
      );

      if (existingPhone) {
        throw new Error('Un compte existe déjà avec ce numéro de téléphone');
      }
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const provider = input.provider || (input.telephone ? 'telephone' : 'email');
    
    // Normaliser l'email (trim + lowercase) si fourni
    const normalizedEmail = input.email ? input.email.trim().toLowerCase() : null;
    const normalizedTelephone = input.telephone ? input.telephone.trim().replace(/\s+/g, '') : null;

    console.log('📝 Création utilisateur:', {
      id,
      email: normalizedEmail,
      telephone: normalizedTelephone,
      nom: input.nom,
      prenom: input.prenom,
      provider,
    });

    await this.db.runAsync(
      `INSERT INTO users (
        id, email, telephone, nom, prenom, password_hash, provider, provider_id, photo,
        date_creation, derniere_connexion, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        normalizedEmail,
        normalizedTelephone,
        input.nom,
        input.prenom,
        null, // Pas de mot de passe
        provider,
        input.provider_id || null,
        input.photo || null,
        now,
        now,
        1,
      ]
    );

    console.log('✅ Utilisateur créé avec succès:', id);
    const createdUser = await this.getUserById(id);
    console.log('📋 Utilisateur récupéré:', { id: createdUser.id, email: createdUser.email, telephone: createdUser.telephone });
    return createdUser;
  }

  /**
   * Récupérer un utilisateur par email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔍 Recherche par email normalisé:', normalizedEmail);
    
    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [normalizedEmail]
    );

    if (!row) {
      console.log('❌ Aucun utilisateur trouvé avec email:', normalizedEmail);
      // Vérifier tous les emails dans la base (pour débogage)
      const allEmails = await this.db.getAllAsync<any>('SELECT email FROM users WHERE email IS NOT NULL');
      console.log('📋 Emails dans la base:', allEmails.map(e => e.email));
      return null;
    }

    console.log('✅ Utilisateur trouvé par email:', row.id);
    return this.mapRowToUser(row);
  }

  /**
   * Récupérer un utilisateur par téléphone
   */
  async getUserByTelephone(telephone: string): Promise<User | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM users WHERE telephone = ? AND is_active = 1',
      [telephone]
    );

    if (!row) {
      return null;
    }

    return this.mapRowToUser(row);
  }

  /**
   * Récupérer un utilisateur par email ou téléphone
   */
  async getUserByIdentifier(identifier: string): Promise<User | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Normaliser l'identifiant (trim + lowercase pour email)
    const normalized = identifier.trim();
    
    // Vérifier si c'est un email (contient @) ou un téléphone
    const isEmail = normalized.includes('@');
    
    if (isEmail) {
      // Pour les emails, utiliser toLowerCase pour la recherche
      return this.getUserByEmail(normalized.toLowerCase());
    } else {
      // Pour les téléphones, utiliser tel quel (sans espaces)
      const cleanPhone = normalized.replace(/\s+/g, '');
      return this.getUserByTelephone(cleanPhone);
    }
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async getUserById(id: string): Promise<User> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [id]
    );

    if (!row) {
      throw new Error('Utilisateur non trouvé');
    }

    return this.mapRowToUser(row);
  }

  /**
   * Connecter un utilisateur par email ou téléphone (sans mot de passe)
   */
  async loginUser(identifier: string): Promise<User | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    console.log('🔍 Recherche utilisateur avec identifiant:', identifier);
    const user = await this.getUserByIdentifier(identifier);
    
    if (!user) {
      console.log('❌ Aucun utilisateur trouvé avec:', identifier);
      // Vérifier si l'utilisateur existe dans la base (pour débogage)
      const allUsers = await this.db.getAllAsync<any>('SELECT id, email, telephone FROM users WHERE is_active = 1');
      console.log('📋 Utilisateurs actifs dans la base:', allUsers.map(u => ({ id: u.id, email: u.email, telephone: u.telephone })));
      return null;
    }

    console.log('✅ Utilisateur trouvé:', user.id, user.email || user.telephone);

    // Mettre à jour la dernière connexion
    await this.db.runAsync(
      'UPDATE users SET derniere_connexion = ? WHERE id = ?',
      [new Date().toISOString(), user.id]
    );

    return this.getUserById(user.id);
  }

  /**
   * Mapper une ligne de la base de données vers un objet User
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email || undefined,
      telephone: row.telephone || undefined,
      nom: row.nom,
      prenom: row.prenom,
      provider: row.provider as 'email' | 'google' | 'apple' | 'telephone',
      photo: row.photo || undefined,
      date_creation: row.date_creation,
      derniere_connexion: row.derniere_connexion || row.date_creation,
    };
  }

  /**
   * ============================================
   * GESTION DES PROJETS
   * ============================================
   */

  async createProjet(projet: Omit<Projet, 'id' | 'date_creation' | 'derniere_modification'>): Promise<Projet> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `projet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;

    await this.db.runAsync(
      `INSERT INTO projets (
        id, nom, localisation, nombre_truies, nombre_verrats, nombre_porcelets,
        poids_moyen_actuel, age_moyen_actuel, notes, statut, proprietaire_id,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        projet.nom,
        projet.localisation,
        projet.nombre_truies,
        projet.nombre_verrats,
        projet.nombre_porcelets,
        projet.poids_moyen_actuel,
        projet.age_moyen_actuel,
        projet.notes || null,
        projet.statut,
        projet.proprietaire_id,
        date_creation,
        derniere_modification,
      ]
    );

    return this.getProjetById(id);
  }

  async getProjetById(id: string): Promise<Projet> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<Projet>(
      'SELECT * FROM projets WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Projet avec l'id ${id} non trouvé`);
    }

    return result;
  }

  /**
   * Obtenir tous les projets d'un utilisateur (propriétaire + collaborateur)
   */
  async getAllProjets(userId?: string): Promise<Projet[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    if (userId) {
      // Récupérer les projets où l'utilisateur est propriétaire
      // ET les projets où l'utilisateur est collaborateur actif
      return await this.db.getAllAsync<Projet>(
        `SELECT DISTINCT p.* 
         FROM projets p
         LEFT JOIN collaborations c ON p.id = c.projet_id AND c.user_id = ? AND c.statut = 'actif'
         WHERE p.proprietaire_id = ? OR c.user_id = ?
         ORDER BY p.date_creation DESC`,
        [userId, userId, userId]
      );
    }

    // Par défaut, retourner tous les projets (pour compatibilité)
    return await this.db.getAllAsync<Projet>('SELECT * FROM projets ORDER BY date_creation DESC');
  }

  /**
   * Obtenir le projet actif d'un utilisateur (propriétaire ou collaborateur)
   */
  async getProjetActif(userId?: string): Promise<Projet | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    if (!userId) {
      // SANS userId, on ne retourne RIEN pour éviter les fuites de données
      return null;
    }

    // Récupérer le projet actif où l'utilisateur est propriétaire
    // OU collaborateur actif
    return await this.db.getFirstAsync<Projet>(
      `SELECT DISTINCT p.* 
       FROM projets p
       LEFT JOIN collaborations c ON p.id = c.projet_id AND c.user_id = ? AND c.statut = 'actif'
       WHERE p.statut = 'actif' AND (p.proprietaire_id = ? OR c.user_id = ?)
       ORDER BY p.date_creation DESC 
       LIMIT 1`,
      [userId, userId, userId]
    );
  }

  async updateProjet(id: string, updates: Partial<Projet>, userId?: string): Promise<Projet> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Vérifier que le projet appartient à l'utilisateur si userId est fourni
    if (userId) {
      const projet = await this.getProjetById(id);
      if (projet.proprietaire_id !== userId) {
        throw new Error('Ce projet ne vous appartient pas');
      }
    }

    const derniere_modification = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'date_creation' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getProjetById(id);
    }

    fields.push('derniere_modification = ?');
    values.push(derniere_modification);
    values.push(id);

    await this.db.runAsync(
      `UPDATE projets SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getProjetById(id);
  }

  /**
   * ============================================
   * GESTION DES CHARGES FIXES
   * ============================================
   */

  async createChargeFixe(charge: Omit<ChargeFixe, 'id' | 'date_creation' | 'derniere_modification'>): Promise<ChargeFixe> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `charge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;

    await this.db.runAsync(
      `INSERT INTO charges_fixes (
        id, categorie, libelle, montant, date_debut, frequence,
        jour_paiement, notes, statut, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        charge.categorie,
        charge.libelle,
        charge.montant,
        charge.date_debut,
        charge.frequence,
        charge.jour_paiement || null,
        charge.notes || null,
        charge.statut,
        date_creation,
        derniere_modification,
      ]
    );

    return this.getChargeFixeById(id);
  }

  async getChargeFixeById(id: string): Promise<ChargeFixe> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<ChargeFixe>(
      'SELECT * FROM charges_fixes WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Charge fixe avec l'id ${id} non trouvée`);
    }

    return result;
  }

  async getAllChargesFixes(projetId: string): Promise<ChargeFixe[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<ChargeFixe>(
      'SELECT * FROM charges_fixes WHERE projet_id = ? ORDER BY date_debut DESC',
      [projetId]
    );
  }

  async getChargesFixesActives(projetId: string): Promise<ChargeFixe[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<ChargeFixe>(
      'SELECT * FROM charges_fixes WHERE projet_id = ? AND statut = ? ORDER BY date_debut DESC',
      [projetId, 'actif']
    );
  }

  async updateChargeFixe(id: string, updates: Partial<ChargeFixe>): Promise<ChargeFixe> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const derniere_modification = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'date_creation' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getChargeFixeById(id);
    }

    fields.push('derniere_modification = ?');
    values.push(derniere_modification);
    values.push(id);

    await this.db.runAsync(
      `UPDATE charges_fixes SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getChargeFixeById(id);
  }

  async deleteChargeFixe(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM charges_fixes WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES DÉPENSES PONCTUELLES
   * ============================================
   */

  async createDepensePonctuelle(depense: Omit<DepensePonctuelle, 'id' | 'date_creation'>): Promise<DepensePonctuelle> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `depense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const photosJson = depense.photos ? JSON.stringify(depense.photos) : null;

    await this.db.runAsync(
      `INSERT INTO depenses_ponctuelles (
        id, projet_id, montant, categorie, libelle_categorie, date,
        commentaire, photos, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        depense.projet_id,
        depense.montant,
        depense.categorie,
        depense.libelle_categorie || null,
        depense.date,
        depense.commentaire || null,
        photosJson,
        date_creation,
      ]
    );

    return this.getDepensePonctuelleById(id);
  }

  async getDepensePonctuelleById(id: string): Promise<DepensePonctuelle> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM depenses_ponctuelles WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Dépense ponctuelle avec l'id ${id} non trouvée`);
    }

    return {
      ...result,
      photos: result.photos ? JSON.parse(result.photos) : undefined,
    };
  }

  async getAllDepensesPonctuelles(projetId: string): Promise<DepensePonctuelle[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM depenses_ponctuelles WHERE projet_id = ? ORDER BY date DESC',
      [projetId]
    );

    return results.map((result) => ({
      ...result,
      photos: result.photos ? JSON.parse(result.photos) : undefined,
    }));
  }

  async getDepensesPonctuellesByDateRange(dateDebut: string, dateFin: string): Promise<DepensePonctuelle[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM depenses_ponctuelles WHERE date >= ? AND date <= ? ORDER BY date DESC',
      [dateDebut, dateFin]
    );

    return results.map((result) => ({
      ...result,
      photos: result.photos ? JSON.parse(result.photos) : undefined,
    }));
  }

  async updateDepensePonctuelle(id: string, updates: UpdateDepensePonctuelleInput): Promise<DepensePonctuelle> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const photosJson = updates.photos ? JSON.stringify(updates.photos) : null;

    await this.db.runAsync(
      `UPDATE depenses_ponctuelles SET
        montant = COALESCE(?, montant),
        categorie = COALESCE(?, categorie),
        libelle_categorie = COALESCE(?, libelle_categorie),
        date = COALESCE(?, date),
        commentaire = COALESCE(?, commentaire),
        photos = COALESCE(?, photos)
      WHERE id = ?`,
      [
        updates.montant ?? null,
        updates.categorie ?? null,
        updates.libelle_categorie ?? null,
        updates.date ?? null,
        updates.commentaire ?? null,
        photosJson,
        id,
      ]
    );

    return this.getDepensePonctuelleById(id);
  }

  async deleteDepensePonctuelle(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM depenses_ponctuelles WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES REVENUS
   * ============================================
   */

  async createRevenu(revenu: Omit<Revenu, 'id' | 'date_creation'>): Promise<Revenu> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `revenu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const photosJson = revenu.photos ? JSON.stringify(revenu.photos) : null;

    await this.db.runAsync(
      `INSERT INTO revenus (
        id, projet_id, montant, categorie, libelle_categorie, date,
        description, commentaire, photos, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        revenu.projet_id,
        revenu.montant,
        revenu.categorie,
        revenu.libelle_categorie || null,
        revenu.date,
        revenu.description || null,
        revenu.commentaire || null,
        photosJson,
        date_creation,
      ]
    );

    return this.getRevenuById(id);
  }

  async getRevenuById(id: string): Promise<Revenu> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM revenus WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Revenu avec l'id ${id} non trouvé`);
    }

    return {
      ...result,
      photos: result.photos ? JSON.parse(result.photos) : undefined,
    };
  }

  async getAllRevenus(projetId: string): Promise<Revenu[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM revenus WHERE projet_id = ? ORDER BY date DESC',
      [projetId]
    );

    return results.map((result) => ({
      ...result,
      photos: result.photos ? JSON.parse(result.photos) : undefined,
    }));
  }

  async getRevenusByDateRange(dateDebut: string, dateFin: string, projetId: string): Promise<Revenu[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM revenus WHERE projet_id = ? AND date >= ? AND date <= ? ORDER BY date DESC',
      [projetId, dateDebut, dateFin]
    );

    return results.map((result) => ({
      ...result,
      photos: result.photos ? JSON.parse(result.photos) : undefined,
    }));
  }

  async updateRevenu(id: string, updates: UpdateRevenuInput): Promise<Revenu> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const photosJson = updates.photos ? JSON.stringify(updates.photos) : null;

    await this.db.runAsync(
      `UPDATE revenus SET
        montant = COALESCE(?, montant),
        categorie = COALESCE(?, categorie),
        libelle_categorie = COALESCE(?, libelle_categorie),
        date = COALESCE(?, date),
        description = COALESCE(?, description),
        commentaire = COALESCE(?, commentaire),
        photos = COALESCE(?, photos)
      WHERE id = ?`,
      [
        updates.montant ?? null,
        updates.categorie ?? null,
        updates.libelle_categorie ?? null,
        updates.date ?? null,
        updates.description ?? null,
        updates.commentaire ?? null,
        photosJson,
        id,
      ]
    );

    return this.getRevenuById(id);
  }

  async deleteRevenu(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM revenus WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES GESTATIONS
   * ============================================
   */

  async createGestation(gestation: Omit<Gestation, 'id' | 'date_creation' | 'derniere_modification' | 'date_mise_bas_prevue'>): Promise<Gestation> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `gestation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;
    const date_mise_bas_prevue = calculerDateMiseBasPrevue(gestation.date_sautage);

    await this.db.runAsync(
      `INSERT INTO gestations (
        id, projet_id, truie_id, truie_nom, verrat_id, verrat_nom, date_sautage, date_mise_bas_prevue,
        nombre_porcelets_prevu, statut, notes, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        gestation.projet_id,
        gestation.truie_id,
        gestation.truie_nom || null,
        gestation.verrat_id || null,
        gestation.verrat_nom || null,
        gestation.date_sautage,
        date_mise_bas_prevue,
        gestation.nombre_porcelets_prevu,
        gestation.statut,
        gestation.notes || null,
        date_creation,
        derniere_modification,
      ]
    );

    return this.getGestationById(id);
  }

  async getGestationById(id: string): Promise<Gestation> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<Gestation>(
      'SELECT * FROM gestations WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Gestation avec l'id ${id} non trouvée`);
    }

    return result;
  }

  async getAllGestations(projetId: string): Promise<Gestation[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Gestation>(
      'SELECT * FROM gestations WHERE projet_id = ? ORDER BY date_mise_bas_prevue ASC',
      [projetId]
    );
  }

  async getGestationsEnCours(projetId: string): Promise<Gestation[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Gestation>(
      "SELECT * FROM gestations WHERE projet_id = ? AND statut = 'en_cours' ORDER BY date_mise_bas_prevue ASC",
      [projetId]
    );
  }

  async getGestationsParDateMiseBas(dateDebut: string, dateFin: string): Promise<Gestation[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Gestation>(
      'SELECT * FROM gestations WHERE date_mise_bas_prevue >= ? AND date_mise_bas_prevue <= ? ORDER BY date_mise_bas_prevue ASC',
      [dateDebut, dateFin]
    );
  }

  async updateGestation(id: string, updates: Partial<Gestation>): Promise<Gestation> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const derniere_modification = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'date_creation' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getGestationById(id);
    }

    fields.push('derniere_modification = ?');
    values.push(derniere_modification);
    values.push(id);

    await this.db.runAsync(
      `UPDATE gestations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getGestationById(id);
  }

  async deleteGestation(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM gestations WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES SEVRAGES
   * ============================================
   */

  async createSevrage(sevrage: Omit<Sevrage, 'id' | 'date_creation'>): Promise<Sevrage> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Récupérer le projet_id depuis la gestation
    const gestation = await this.getGestationById(sevrage.gestation_id);
    if (!gestation.projet_id) {
      throw new Error('La gestation n\'a pas de projet_id associé');
    }

    const id = `sevrage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO sevrages (
        id, projet_id, gestation_id, date_sevrage, nombre_porcelets_sevres,
        poids_moyen_sevrage, notes, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        gestation.projet_id,
        sevrage.gestation_id,
        sevrage.date_sevrage,
        sevrage.nombre_porcelets_sevres,
        sevrage.poids_moyen_sevrage || null,
        sevrage.notes || null,
        date_creation,
      ]
    );

    return this.getSevrageById(id);
  }

  async getSevrageById(id: string): Promise<Sevrage> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<Sevrage>(
      'SELECT * FROM sevrages WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Sevrage avec l'id ${id} non trouvé`);
    }

    return result;
  }

  async getAllSevrages(projetId: string): Promise<Sevrage[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Sevrage>(
      'SELECT * FROM sevrages WHERE projet_id = ? ORDER BY date_sevrage DESC',
      [projetId]
    );
  }

  async getSevragesParGestation(gestationId: string): Promise<Sevrage[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Sevrage>(
      'SELECT * FROM sevrages WHERE gestation_id = ? ORDER BY date_sevrage DESC',
      [gestationId]
    );
  }

  async getSevragesParDateRange(dateDebut: string, dateFin: string): Promise<Sevrage[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Sevrage>(
      'SELECT * FROM sevrages WHERE date_sevrage >= ? AND date_sevrage <= ? ORDER BY date_sevrage DESC',
      [dateDebut, dateFin]
    );
  }

  async deleteSevrage(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM sevrages WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES INGRÉDIENTS
   * ============================================
   */

  async createIngredient(ingredient: Omit<Ingredient, 'id' | 'date_creation'>): Promise<Ingredient> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `ingredient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO ingredients (
        id, nom, unite, prix_unitaire, proteine_pourcent, energie_kcal, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        ingredient.nom,
        ingredient.unite,
        ingredient.prix_unitaire,
        ingredient.proteine_pourcent || null,
        ingredient.energie_kcal || null,
        date_creation,
      ]
    );

    return this.getIngredientById(id);
  }

  async getIngredientById(id: string): Promise<Ingredient> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<Ingredient>(
      'SELECT * FROM ingredients WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Ingrédient avec l'id ${id} non trouvé`);
    }

    return result;
  }

  async getAllIngredients(projetId: string): Promise<Ingredient[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Les ingrédients sont partagés entre tous les projets (pas de projet_id dans la table)
    return await this.db.getAllAsync<Ingredient>(
      'SELECT * FROM ingredients ORDER BY nom ASC'
    );
  }

  async updateIngredient(id: string, updates: Partial<Ingredient>): Promise<Ingredient> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'date_creation' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getIngredientById(id);
    }

    values.push(id);

    await this.db.runAsync(
      `UPDATE ingredients SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getIngredientById(id);
  }

  async deleteIngredient(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM ingredients WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES STOCKS D'ALIMENTS
   * ============================================
   */

  async createStockAliment(input: CreateStockAlimentInput): Promise<StockAliment> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const quantite_initiale = input.quantite_initiale ?? 0;
    const alerte_active = input.seuil_alerte !== undefined && input.seuil_alerte !== null
      ? quantite_initiale <= input.seuil_alerte
      : false;

    await this.db.runAsync(
      `INSERT INTO stocks_aliments (
        id, projet_id, nom, categorie, quantite_actuelle, unite,
        seuil_alerte, date_derniere_entree, date_derniere_sortie,
        alerte_active, notes, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ,[
        id,
        input.projet_id,
        input.nom,
        input.categorie || null,
        quantite_initiale,
        input.unite,
        input.seuil_alerte ?? null,
        quantite_initiale > 0 ? date_creation : null,
        null,
        alerte_active ? 1 : 0,
        input.notes || null,
        date_creation,
        date_creation,
      ]
    );

    return this.getStockAlimentById(id);
  }

  async getStockAlimentById(id: string): Promise<StockAliment> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM stocks_aliments WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Aliment avec l'id ${id} non trouvé`);
    }

    return this.mapRowToStockAliment(result);
  }

  async getStocksParProjet(projetId: string): Promise<StockAliment[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM stocks_aliments WHERE projet_id = ? ORDER BY nom ASC',
      [projetId]
    );

    return results.map((row) => this.mapRowToStockAliment(row));
  }

  async getStocksEnAlerte(projetId: string): Promise<StockAliment[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM stocks_aliments WHERE projet_id = ? AND alerte_active = 1 ORDER BY nom ASC',
      [projetId]
    );

    return results.map((row) => this.mapRowToStockAliment(row));
  }

  async updateStockAliment(id: string, updates: UpdateStockAlimentInput): Promise<StockAliment> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const current = await this.getStockAlimentById(id);
    const nouvelleQuantite = current.quantite_actuelle;
    const nouveauSeuil = updates.seuil_alerte !== undefined ? updates.seuil_alerte ?? null : current.seuil_alerte ?? null;
    const alerte_active = nouveauSeuil !== null ? nouvelleQuantite <= nouveauSeuil : false;
    const derniere_modification = new Date().toISOString();

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.nom !== undefined) {
      fields.push('nom = ?');
      values.push(updates.nom);
    }
    if (updates.categorie !== undefined) {
      fields.push('categorie = ?');
      values.push(updates.categorie ?? null);
    }
    if (updates.unite !== undefined) {
      fields.push('unite = ?');
      values.push(updates.unite);
    }
    if (updates.seuil_alerte !== undefined) {
      fields.push('seuil_alerte = ?');
      values.push(updates.seuil_alerte ?? null);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes ?? null);
    }

    // Toujours mettre à jour alerte_active et derniere_modification
    fields.push('alerte_active = ?');
    values.push(alerte_active ? 1 : 0);
    fields.push('derniere_modification = ?');
    values.push(derniere_modification);
    values.push(id);

    await this.db.runAsync(
      `UPDATE stocks_aliments SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getStockAlimentById(id);
  }

  async deleteStockAliment(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM stocks_mouvements WHERE aliment_id = ?', [id]);
    await this.db.runAsync('DELETE FROM stocks_aliments WHERE id = ?', [id]);
  }

  async createStockMouvement(input: CreateStockMouvementInput): Promise<{ mouvement: StockMouvement; stock: StockAliment }> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const stock = await this.getStockAlimentById(input.aliment_id);
    
    // S'assurer que les valeurs sont des nombres
    const quantiteActuelle = typeof stock.quantite_actuelle === 'number' ? stock.quantite_actuelle : parseFloat(String(stock.quantite_actuelle)) || 0;
    const quantiteMouvement = typeof input.quantite === 'number' ? input.quantite : parseFloat(String(input.quantite)) || 0;
    
    console.log('[createStockMouvement] Avant calcul:', {
      type: input.type,
      quantiteActuelle,
      quantiteMouvement,
      aliment_id: input.aliment_id,
    });
    
    let nouvelleQuantite = quantiteActuelle;

    switch (input.type) {
      case 'entree':
        nouvelleQuantite = quantiteActuelle + quantiteMouvement;
        break;
      case 'sortie':
        nouvelleQuantite = quantiteActuelle - quantiteMouvement;
        break;
      case 'ajustement':
        nouvelleQuantite = quantiteMouvement;
        break;
      default:
        break;
    }

    nouvelleQuantite = Math.max(0, nouvelleQuantite);
    
    // S'assurer que nouvelleQuantite est bien un nombre
    const nouvelleQuantiteNum = typeof nouvelleQuantite === 'number' 
      ? nouvelleQuantite 
      : parseFloat(String(nouvelleQuantite)) || 0;
    
    // S'assurer que input.quantite est bien un nombre pour l'insertion
    const quantiteMouvementNum = typeof input.quantite === 'number'
      ? input.quantite
      : parseFloat(String(input.quantite)) || 0;
    
    console.log('[createStockMouvement] Après calcul:', {
      nouvelleQuantite: nouvelleQuantiteNum,
      type: input.type,
      stock_unite: stock.unite,
      mouvement_unite: input.unite,
    });

    const id = `mvt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO stocks_mouvements (
        id, projet_id, aliment_id, type, quantite, unite, date,
        origine, commentaire, cree_par, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ,[
        id,
        input.projet_id,
        input.aliment_id,
        input.type,
        quantiteMouvementNum, // Utiliser la valeur convertie en nombre
        input.unite,
        input.date,
        input.origine || null,
        input.commentaire || null,
        input.cree_par || null,
        date_creation,
      ]
    );

    const alerte_active = stock.seuil_alerte !== undefined && stock.seuil_alerte !== null
      ? nouvelleQuantiteNum <= stock.seuil_alerte
      : false;

    const dateDerniereEntree = input.type === 'entree' ? input.date : stock.date_derniere_entree || null;
    const dateDerniereSortie = input.type === 'sortie' ? input.date : stock.date_derniere_sortie || null;

    console.log('[createStockMouvement] Avant UPDATE:', {
      stock_id: stock.id,
      nouvelleQuantite: nouvelleQuantiteNum,
      quantite_actuelle_avant: quantiteActuelle,
    });

    await this.db.runAsync(
      `UPDATE stocks_aliments SET
        quantite_actuelle = ?,
        date_derniere_entree = ?,
        date_derniere_sortie = ?,
        alerte_active = ?,
        derniere_modification = ?
      WHERE id = ?`,
      [
        nouvelleQuantiteNum, // Utiliser la valeur convertie en nombre
        dateDerniereEntree,
        dateDerniereSortie,
        alerte_active ? 1 : 0,
        date_creation,
        stock.id,
      ]
    );
    
    console.log('[createStockMouvement] UPDATE exécuté avec succès');

    // Vérifier que la mise à jour a bien été effectuée
    const verification = await this.db.getFirstAsync<any>(
      'SELECT quantite_actuelle FROM stocks_aliments WHERE id = ?',
      [stock.id]
    );
    
    // Convertir en nombre pour la comparaison
    const quantiteEnDb = typeof verification?.quantite_actuelle === 'number'
      ? verification.quantite_actuelle
      : parseFloat(String(verification?.quantite_actuelle)) || 0;
    
    console.log('[createStockMouvement] Vérification après UPDATE:', {
      quantite_actuelle_en_db: quantiteEnDb,
      nouvelleQuantite_calculee: nouvelleQuantite,
      match: Math.abs(quantiteEnDb - nouvelleQuantite) < 0.001, // Comparaison avec tolérance pour les nombres à virgule
      stock_unite: stock.unite,
      mouvement_unite: input.unite,
    });

    const mouvement = await this.getStockMouvementById(id);
    const updatedStock = await this.getStockAlimentById(stock.id);
    
    console.log('[createStockMouvement] Stock retourné:', {
      id: updatedStock.id,
      quantite_actuelle: updatedStock.quantite_actuelle,
    });

    return {
      mouvement,
      stock: updatedStock,
    };
  }

  async getStockMouvementById(id: string): Promise<StockMouvement> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM stocks_mouvements WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Mouvement avec l'id ${id} non trouvé`);
    }

    return this.mapRowToStockMouvement(result);
  }

  async getMouvementsParAliment(alimentId: string, limit: number = 50): Promise<StockMouvement[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM stocks_mouvements WHERE aliment_id = ? ORDER BY date DESC LIMIT ?',
      [alimentId, limit]
    );

    return results.map((row) => this.mapRowToStockMouvement(row));
  }

  async getMouvementsRecents(projetId: string, limit: number = 20): Promise<StockMouvement[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM stocks_mouvements WHERE projet_id = ? ORDER BY date DESC LIMIT ?',
      [projetId, limit]
    );

    return results.map((row) => this.mapRowToStockMouvement(row));
  }

  /**
   * ============================================
   * GESTION PRODUCTION - ANIMAUX & PESÉES
   * ============================================
   */

  async createProductionAnimal(input: CreateProductionAnimalInput): Promise<ProductionAnimal> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `animal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;

    await this.db.runAsync(
      `INSERT INTO production_animaux (
        id, projet_id, code, nom, origine, sexe, date_naissance, poids_initial,
        date_entree, actif, statut, race, reproducteur, pere_id, mere_id, notes,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ,[
        id,
        input.projet_id,
        input.code,
        input.nom || null,
        input.origine || null,
        input.sexe || 'indetermine',
        input.date_naissance || null,
        input.poids_initial ?? null,
        input.date_entree || null,
        input.statut === 'actif' ? 1 : 0, // Pour compatibilité avec actif
        input.statut || 'actif',
        input.race || null,
        input.reproducteur ? 1 : 0,
        input.pere_id ?? null,
        input.mere_id ?? null,
        input.notes || null,
        date_creation,
        derniere_modification,
      ]
    );

    return this.getProductionAnimalById(id);
  }

  async getProductionAnimalById(id: string): Promise<ProductionAnimal> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM production_animaux WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Animal avec l'id ${id} non trouvé`);
    }

    return this.mapRowToProductionAnimal(result);
  }

  async getProductionAnimaux(projetId: string, inclureInactifs: boolean = true): Promise<ProductionAnimal[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const query = inclureInactifs
      ? 'SELECT * FROM production_animaux WHERE projet_id = ? ORDER BY code ASC'
      : 'SELECT * FROM production_animaux WHERE projet_id = ? AND actif = 1 ORDER BY code ASC';

    const results = await this.db.getAllAsync<any>(query, [projetId]);
    return results.map((row) => this.mapRowToProductionAnimal(row));
  }

  async updateProductionAnimal(id: string, updates: UpdateProductionAnimalInput): Promise<ProductionAnimal> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'actif') { // actif est géré via statut
        if (key === 'statut') {
          fields.push('statut = ?');
          fields.push('actif = ?'); // Mettre à jour actif en fonction du statut
          values.push(value);
          values.push(value === 'actif' ? 1 : 0);
        } else if (key === 'reproducteur') {
          fields.push('reproducteur = ?');
          values.push(value ? 1 : 0);
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    if (fields.length === 0) {
      return this.getProductionAnimalById(id);
    }

    fields.push('derniere_modification = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.runAsync(
      `UPDATE production_animaux SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getProductionAnimalById(id);
  }

  async deleteProductionAnimal(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM production_pesees WHERE animal_id = ?', [id]);
    await this.db.runAsync('DELETE FROM production_animaux WHERE id = ?', [id]);
  }

  async createPesee(input: CreatePeseeInput): Promise<ProductionPesee> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const animal = await this.getProductionAnimalById(input.animal_id);
    const previous = await this.getDernierePeseeAvantDate(input.animal_id, input.date);

    let gmq: number | null = null;
    let difference_standard: number | null = null;

    let poidsReference = animal.poids_initial ?? null;
    let dateReference = animal.date_entree ?? null;

    if (previous) {
      poidsReference = previous.poids_kg;
      dateReference = previous.date;
    }

    if (poidsReference !== null && dateReference) {
      const diffJours = this.calculateDayDifference(dateReference, input.date);
      if (diffJours > 0) {
        gmq = ((input.poids_kg - poidsReference) * 1000) / diffJours; // g/jour
        const standard = getStandardGMQ(input.poids_kg);
        if (standard) {
          difference_standard = gmq - standard.gmq_cible;
        }
      }
    }

    const id = `pesee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO production_pesees (
        id, projet_id, animal_id, date, poids_kg, gmq, difference_standard,
        commentaire, cree_par, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ,[
        id,
        input.projet_id,
        input.animal_id,
        input.date,
        input.poids_kg,
        gmq ?? null,
        difference_standard ?? null,
        input.commentaire || null,
        input.cree_par || null,
        date_creation,
      ]
    );

    return this.getPeseeById(id);
  }

  async getPeseeById(id: string): Promise<ProductionPesee> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM production_pesees WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Pesée avec l'id ${id} non trouvée`);
    }

    return this.mapRowToProductionPesee(result);
  }

  async getDernierePeseeAvantDate(animalId: string, date: string): Promise<ProductionPesee | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM production_pesees WHERE animal_id = ? AND date <= ? ORDER BY date DESC LIMIT 1',
      [animalId, date]
    );

    return result ? this.mapRowToProductionPesee(result) : null;
  }

  async getPeseesParAnimal(animalId: string): Promise<ProductionPesee[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM production_pesees WHERE animal_id = ? ORDER BY date DESC',
      [animalId]
    );

    return results.map((row) => this.mapRowToProductionPesee(row));
  }

  async getPeseesRecents(projetId: string, limit: number = 20): Promise<ProductionPesee[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Ne retourner que les pesées des animaux actifs
    const results = await this.db.getAllAsync<any>(
      `SELECT pp.* FROM production_pesees pp
       INNER JOIN production_animaux pa ON pp.animal_id = pa.id
       WHERE pp.projet_id = ? AND pa.statut = 'actif'
       ORDER BY pp.date DESC LIMIT ?`,
      [projetId, limit]
    );

    return results.map((row) => this.mapRowToProductionPesee(row));
  }

  async deletePesee(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM production_pesees WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES RATIONS
   * ============================================
   */

  async createRation(ration: {
    projet_id: string;
    type_porc: string;
    poids_kg: number;
    nombre_porcs?: number;
    ingredients: { ingredient_id: string; quantite: number }[];
    cout_total?: number;
    cout_par_kg?: number;
    notes?: string;
  }): Promise<Ration> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `ration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();

    // Créer la ration
    await this.db.runAsync(
      `INSERT INTO rations (
        id, projet_id, type_porc, poids_kg, nombre_porcs, cout_total, cout_par_kg, notes, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        ration.projet_id,
        ration.type_porc,
        ration.poids_kg,
        ration.nombre_porcs || null,
        ration.cout_total || null,
        ration.cout_par_kg || null,
        ration.notes || null,
        date_creation,
      ]
    );

    // Ajouter les ingrédients
    for (const ing of ration.ingredients) {
      const ingId = `ing_ration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await this.db.runAsync(
        `INSERT INTO ingredients_ration (id, ration_id, ingredient_id, quantite)
         VALUES (?, ?, ?, ?)`,
        [ingId, id, ing.ingredient_id, ing.quantite]
      );
    }

    return this.getRationById(id);
  }

  async getRationById(id: string): Promise<Ration> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const ration = await this.db.getFirstAsync<any>(
      'SELECT * FROM rations WHERE id = ?',
      [id]
    );

    if (!ration) {
      throw new Error(`Ration avec l'id ${id} non trouvée`);
    }

    // Récupérer les ingrédients
    const ingredientsRation = await this.db.getAllAsync<any>(
      `SELECT ir.*, i.nom, i.unite, i.prix_unitaire, i.proteine_pourcent, i.energie_kcal
       FROM ingredients_ration ir
       JOIN ingredients i ON ir.ingredient_id = i.id
       WHERE ir.ration_id = ?`,
      [id]
    );

    return {
      ...ration,
      ingredients: ingredientsRation.map((ir) => ({
        id: ir.id,
        ration_id: ir.ration_id,
        ingredient_id: ir.ingredient_id,
        quantite: ir.quantite,
        ingredient: {
          id: ir.ingredient_id,
          nom: ir.nom,
          unite: ir.unite,
          prix_unitaire: ir.prix_unitaire,
          proteine_pourcent: ir.proteine_pourcent,
          energie_kcal: ir.energie_kcal,
          date_creation: '',
        },
      })),
    };
  }

  async getAllRations(projetId: string): Promise<Ration[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const rations = await this.db.getAllAsync<any>(
      'SELECT * FROM rations WHERE projet_id = ? ORDER BY date_creation DESC',
      [projetId]
    );

    // Récupérer les ingrédients pour chaque ration
    const rationsWithIngredients = await Promise.all(
      rations.map(async (ration) => {
        const ingredientsRation = await this.db!.getAllAsync<any>(
          `SELECT ir.*, i.nom, i.unite, i.prix_unitaire, i.proteine_pourcent, i.energie_kcal
           FROM ingredients_ration ir
           JOIN ingredients i ON ir.ingredient_id = i.id
           WHERE ir.ration_id = ?`,
          [ration.id]
        );

        return {
          ...ration,
          ingredients: ingredientsRation.map((ir) => ({
            id: ir.id,
            ration_id: ir.ration_id,
            ingredient_id: ir.ingredient_id,
            quantite: ir.quantite,
            ingredient: {
              id: ir.ingredient_id,
              nom: ir.nom,
              unite: ir.unite,
              prix_unitaire: ir.prix_unitaire,
              proteine_pourcent: ir.proteine_pourcent,
              energie_kcal: ir.energie_kcal,
              date_creation: '',
            },
          })),
        };
      })
    );

    return rationsWithIngredients;
  }

  async deleteRation(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Supprimer d'abord les ingrédients de la ration
    await this.db.runAsync('DELETE FROM ingredients_ration WHERE ration_id = ?', [id]);
    // Puis supprimer la ration
    await this.db.runAsync('DELETE FROM rations WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES RAPPORTS DE CROISSANCE
   * ============================================
   */

  async createRapportCroissance(rapport: Omit<RapportCroissance, 'id' | 'date_creation'>): Promise<RapportCroissance> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `rapport_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO rapports_croissance (
        id, projet_id, date, poids_moyen, nombre_porcs,
        gain_quotidien, poids_cible, notes, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        rapport.projet_id,
        rapport.date,
        rapport.poids_moyen,
        rapport.nombre_porcs,
        rapport.gain_quotidien || null,
        rapport.poids_cible || null,
        rapport.notes || null,
        date_creation,
      ]
    );

    return this.getRapportCroissanceById(id);
  }

  async getRapportCroissanceById(id: string): Promise<RapportCroissance> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<RapportCroissance>(
      'SELECT * FROM rapports_croissance WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Rapport avec l'id ${id} non trouvé`);
    }

    return result;
  }

  async getAllRapportsCroissance(): Promise<RapportCroissance[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<RapportCroissance>(
      'SELECT * FROM rapports_croissance ORDER BY date DESC'
    );
  }

  async getRapportsCroissanceParProjet(projetId: string): Promise<RapportCroissance[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<RapportCroissance>(
      'SELECT * FROM rapports_croissance WHERE projet_id = ? ORDER BY date ASC',
      [projetId]
    );
  }

  async getRapportsCroissanceParDateRange(dateDebut: string, dateFin: string): Promise<RapportCroissance[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<RapportCroissance>(
      'SELECT * FROM rapports_croissance WHERE date >= ? AND date <= ? ORDER BY date ASC',
      [dateDebut, dateFin]
    );
  }

  async deleteRapportCroissance(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM rapports_croissance WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES MORTALITÉS
   * ============================================
   */

  async createMortalite(mortalite: Omit<Mortalite, 'id' | 'date_creation'>): Promise<Mortalite> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `mortalite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO mortalites (
        id, projet_id, nombre_porcs, date, cause, categorie, animal_code, notes, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        mortalite.projet_id,
        mortalite.nombre_porcs,
        mortalite.date,
        mortalite.cause || null,
        mortalite.categorie,
        mortalite.animal_code || null,
        mortalite.notes || null,
        date_creation,
      ]
    );

    // Si un code d'animal est renseigné, changer le statut de l'animal en "mort"
    if (mortalite.animal_code) {
      try {
        const animal = await this.db.getFirstAsync<any>(
          'SELECT * FROM production_animaux WHERE projet_id = ? AND code = ?',
          [mortalite.projet_id, mortalite.animal_code]
        );
        
        if (animal) {
          // Changer le statut en "mort"
          await this.db.runAsync(
            'UPDATE production_animaux SET statut = ?, actif = 0, derniere_modification = ? WHERE id = ?',
            ['mort', new Date().toISOString(), animal.id]
          );
        }
      } catch (error) {
        // Si l'animal n'est pas trouvé, on continue quand même (peut-être que le code est incorrect)
        console.warn(`Animal avec le code ${mortalite.animal_code} non trouvé lors de la création de la mortalité`);
      }
    }

    return this.getMortaliteById(id);
  }

  async getMortaliteById(id: string): Promise<Mortalite> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<Mortalite>(
      'SELECT * FROM mortalites WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Mortalité avec l'id ${id} non trouvée`);
    }

    return result;
  }

  async getAllMortalites(projetId: string): Promise<Mortalite[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Mortalite>(
      'SELECT * FROM mortalites WHERE projet_id = ? ORDER BY date DESC',
      [projetId]
    );
  }

  async getMortalitesParProjet(projetId: string): Promise<Mortalite[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Mortalite>(
      'SELECT * FROM mortalites WHERE projet_id = ? ORDER BY date DESC',
      [projetId]
    );
  }

  async getMortalitesParDateRange(dateDebut: string, dateFin: string): Promise<Mortalite[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Mortalite>(
      'SELECT * FROM mortalites WHERE date >= ? AND date <= ? ORDER BY date DESC',
      [dateDebut, dateFin]
    );
  }

  async getMortalitesParCategorie(categorie: string): Promise<Mortalite[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Mortalite>(
      'SELECT * FROM mortalites WHERE categorie = ? ORDER BY date DESC',
      [categorie]
    );
  }

  async updateMortalite(id: string, updates: Partial<Mortalite>): Promise<Mortalite> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'date_creation' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getMortaliteById(id);
    }

    values.push(id);

    await this.db.runAsync(
      `UPDATE mortalites SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getMortaliteById(id);
  }

  async deleteMortalite(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM mortalites WHERE id = ?', [id]);
  }

  async getStatistiquesMortalite(projetId: string): Promise<{
    total_morts: number;
    taux_mortalite: number;
    mortalites_par_categorie: {
      porcelet: number;
      truie: number;
      verrat: number;
      autre: number;
    };
    mortalites_par_mois: Array<{
      mois: string;
      nombre: number;
    }>;
  }> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Récupérer toutes les mortalités du projet
    const mortalites = await this.getMortalitesParProjet(projetId);

    // Calculer le total
    const total_morts = mortalites.reduce((sum, m) => sum + m.nombre_porcs, 0);

    // Récupérer le projet pour calculer le taux
    const projet = await this.getProjetById(projetId);
    const nombrePorcsTotal =
      projet.nombre_truies + projet.nombre_verrats + projet.nombre_porcelets;
    const taux_mortalite = nombrePorcsTotal > 0 ? (total_morts / nombrePorcsTotal) * 100 : 0;

    // Compter par catégorie
    const mortalites_par_categorie = {
      porcelet: mortalites.filter((m) => m.categorie === 'porcelet').reduce((sum, m) => sum + m.nombre_porcs, 0),
      truie: mortalites.filter((m) => m.categorie === 'truie').reduce((sum, m) => sum + m.nombre_porcs, 0),
      verrat: mortalites.filter((m) => m.categorie === 'verrat').reduce((sum, m) => sum + m.nombre_porcs, 0),
      autre: mortalites.filter((m) => m.categorie === 'autre').reduce((sum, m) => sum + m.nombre_porcs, 0),
    };

    // Grouper par mois
    const mortalitesParMoisMap = new Map<string, number>();
    mortalites.forEach((m) => {
      const date = new Date(m.date);
      const mois = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = mortalitesParMoisMap.get(mois) || 0;
      mortalitesParMoisMap.set(mois, current + m.nombre_porcs);
    });

    const mortalites_par_mois = Array.from(mortalitesParMoisMap.entries())
      .map(([mois, nombre]) => ({ mois, nombre }))
      .sort((a, b) => a.mois.localeCompare(b.mois));

    return {
      total_morts,
      taux_mortalite,
      mortalites_par_categorie,
      mortalites_par_mois,
    };
  }

  /**
   * ============================================
   * GESTION DES PLANIFICATIONS
   * ============================================
   */

  async createPlanification(planification: Omit<Planification, 'id' | 'date_creation' | 'derniere_modification'>): Promise<Planification> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `planification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;

    await this.db.runAsync(
      `INSERT INTO planifications (
        id, projet_id, type, titre, description, date_prevue, date_echeance,
        rappel, statut, recurrence, lien_gestation_id, lien_sevrage_id, notes,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        planification.projet_id,
        planification.type,
        planification.titre,
        planification.description || null,
        planification.date_prevue,
        planification.date_echeance || null,
        planification.rappel || null,
        planification.statut,
        planification.recurrence || null,
        planification.lien_gestation_id || null,
        planification.lien_sevrage_id || null,
        planification.notes || null,
        date_creation,
        derniere_modification,
      ]
    );

    return this.getPlanificationById(id);
  }

  async getPlanificationById(id: string): Promise<Planification> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<Planification>(
      'SELECT * FROM planifications WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Planification avec l'id ${id} non trouvée`);
    }

    return result;
  }

  async getAllPlanifications(projetId: string): Promise<Planification[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Planification>(
      'SELECT * FROM planifications WHERE projet_id = ? ORDER BY date_prevue ASC',
      [projetId]
    );
  }

  async getPlanificationsParProjet(projetId: string): Promise<Planification[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Planification>(
      'SELECT * FROM planifications WHERE projet_id = ? ORDER BY date_prevue ASC',
      [projetId]
    );
  }

  async getPlanificationsParStatut(statut: string): Promise<Planification[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Planification>(
      'SELECT * FROM planifications WHERE statut = ? ORDER BY date_prevue ASC',
      [statut]
    );
  }

  async getPlanificationsParDateRange(dateDebut: string, dateFin: string): Promise<Planification[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Planification>(
      'SELECT * FROM planifications WHERE date_prevue >= ? AND date_prevue <= ? ORDER BY date_prevue ASC',
      [dateDebut, dateFin]
    );
  }

  async getPlanificationsAVenir(projetId: string, jours: number = 7): Promise<Planification[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const aujourdhui = new Date().toISOString().split('T')[0];
    const dateFin = new Date();
    dateFin.setDate(dateFin.getDate() + jours);
    const dateFinStr = dateFin.toISOString().split('T')[0];

    return await this.db.getAllAsync<Planification>(
      `SELECT * FROM planifications 
       WHERE projet_id = ? 
       AND date_prevue >= ? 
       AND date_prevue <= ? 
       AND statut IN ('a_faire', 'en_cours')
       ORDER BY date_prevue ASC`,
      [projetId, aujourdhui, dateFinStr]
    );
  }

  async updatePlanification(id: string, updates: Partial<Planification>): Promise<Planification> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const derniere_modification = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'date_creation' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getPlanificationById(id);
    }

    fields.push('derniere_modification = ?');
    values.push(derniere_modification);
    values.push(id);

    await this.db.runAsync(
      `UPDATE planifications SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getPlanificationById(id);
  }

  async deletePlanification(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM planifications WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES COLLABORATIONS
   * ============================================
   */

  async createCollaborateur(collaborateur: Omit<Collaborateur, 'id' | 'date_creation' | 'derniere_modification'>): Promise<Collaborateur> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `collaborateur_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;

    await this.db.runAsync(
      `INSERT INTO collaborations (
        id, projet_id, user_id, nom, prenom, email, telephone, role, statut,
        permission_reproduction, permission_nutrition, permission_finance,
        permission_rapports, permission_planification, permission_mortalites,
        date_invitation, date_acceptation, notes, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        collaborateur.projet_id,
        collaborateur.user_id || null,
        collaborateur.nom,
        collaborateur.prenom,
        collaborateur.email,
        collaborateur.telephone || null,
        collaborateur.role,
        collaborateur.statut || 'en_attente',
        collaborateur.permissions.reproduction ? 1 : 0,
        collaborateur.permissions.nutrition ? 1 : 0,
        collaborateur.permissions.finance ? 1 : 0,
        collaborateur.permissions.rapports ? 1 : 0,
        collaborateur.permissions.planification ? 1 : 0,
        collaborateur.permissions.mortalites ? 1 : 0,
        collaborateur.date_invitation,
        collaborateur.date_acceptation || null,
        collaborateur.notes || null,
        date_creation,
        derniere_modification,
      ]
    );

    return this.getCollaborateurById(id);
  }

  async getCollaborateurById(id: string): Promise<Collaborateur> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM collaborations WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Collaborateur avec l'id ${id} non trouvé`);
    }

    return this.mapRowToCollaborateur(result);
  }

  async getAllCollaborateurs(projetId: string): Promise<Collaborateur[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM collaborations WHERE projet_id = ? ORDER BY nom ASC, prenom ASC',
      [projetId]
    );

    return results.map((row) => this.mapRowToCollaborateur(row));
  }

  async getCollaborateursParProjet(projetId: string): Promise<Collaborateur[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM collaborations WHERE projet_id = ? ORDER BY nom ASC, prenom ASC',
      [projetId]
    );

    return results.map((row) => this.mapRowToCollaborateur(row));
  }

  async getCollaborateursParStatut(statut: string): Promise<Collaborateur[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM collaborations WHERE statut = ? ORDER BY nom ASC, prenom ASC',
      [statut]
    );

    return results.map((row) => this.mapRowToCollaborateur(row));
  }

  async getCollaborateursParRole(role: string): Promise<Collaborateur[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM collaborations WHERE role = ? ORDER BY nom ASC, prenom ASC',
      [role]
    );

    return results.map((row) => this.mapRowToCollaborateur(row));
  }

  /**
   * Trouver un collaborateur actif par email
   */
  async getCollaborateurActifParEmail(email: string): Promise<Collaborateur | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const emailNormalized = email.trim().toLowerCase();
    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM collaborations WHERE LOWER(TRIM(email)) = ? AND statut = ? LIMIT 1',
      [emailNormalized, 'actif']
    );

    if (!result) {
      return null;
    }

    return this.mapRowToCollaborateur(result);
  }

  /**
   * Obtenir tous les collaborateurs actifs d'un utilisateur (par user_id)
   */
  async getCollaborateursActifsParUserId(userId: string): Promise<Collaborateur[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM collaborations WHERE user_id = ? AND statut = ? ORDER BY nom ASC, prenom ASC',
      [userId, 'actif']
    );

    return results.map((row) => this.mapRowToCollaborateur(row));
  }

  /**
   * Lier un collaborateur à un utilisateur par email
   * Cette fonction met à jour le user_id du collaborateur si l'email correspond
   */
  async lierCollaborateurAUtilisateur(userId: string, email: string): Promise<Collaborateur | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const emailNormalized = email.trim().toLowerCase();
    
    // Trouver le collaborateur avec cet email qui n'a pas encore de user_id
    const collaborateur = await this.db.getFirstAsync<any>(
      'SELECT * FROM collaborations WHERE LOWER(TRIM(email)) = ? AND (user_id IS NULL OR user_id = ?) LIMIT 1',
      [emailNormalized, userId]
    );

    if (!collaborateur) {
      return null;
    }

    // Mettre à jour le user_id
    await this.db.runAsync(
      'UPDATE collaborations SET user_id = ?, derniere_modification = ? WHERE id = ?',
      [userId, new Date().toISOString(), collaborateur.id]
    );

    // Retourner le collaborateur mis à jour
    return this.getCollaborateurById(collaborateur.id);
  }

  /**
   * Obtenir tous les collaborateurs (actifs ou en attente) d'un utilisateur par email
   * Utile pour vérifier les invitations en attente
   */
  async getCollaborateursParEmail(email: string): Promise<Collaborateur[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const emailNormalized = email.trim().toLowerCase();
    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM collaborations WHERE LOWER(TRIM(email)) = ? ORDER BY statut ASC, nom ASC, prenom ASC',
      [emailNormalized]
    );

    return results.map((row) => this.mapRowToCollaborateur(row));
  }

  /**
   * Obtenir toutes les invitations en attente pour un utilisateur (par user_id)
   * Utile pour afficher les invitations en attente au démarrage
   */
  async getInvitationsEnAttenteParUserId(userId: string): Promise<Collaborateur[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      `SELECT c.*, p.nom as projet_nom 
       FROM collaborations c
       LEFT JOIN projets p ON c.projet_id = p.id
       WHERE c.user_id = ? AND c.statut = ? 
       ORDER BY c.date_invitation DESC`,
      [userId, 'en_attente']
    );

    return results.map((row) => this.mapRowToCollaborateur(row));
  }

  /**
   * Obtenir toutes les invitations en attente pour un utilisateur (par email)
   * Utile pour détecter les invitations avant que l'utilisateur soit lié
   */
  async getInvitationsEnAttenteParEmail(email: string): Promise<Collaborateur[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const emailNormalized = email.trim().toLowerCase();
    const results = await this.db.getAllAsync<any>(
      `SELECT c.*, p.nom as projet_nom 
       FROM collaborations c
       LEFT JOIN projets p ON c.projet_id = p.id
       WHERE LOWER(TRIM(c.email)) = ? AND c.statut = ? 
       ORDER BY c.date_invitation DESC`,
      [emailNormalized, 'en_attente']
    );

    return results.map((row) => this.mapRowToCollaborateur(row));
  }

  async updateCollaborateur(id: string, updates: UpdateCollaborateurInput): Promise<Collaborateur> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Récupérer les permissions actuelles si des permissions partielles sont fournies
    let currentCollaborateur: Collaborateur | null = null;
    if (updates.permissions) {
      currentCollaborateur = await this.getCollaborateurById(id);
    }

    const derniere_modification = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'date_creation' && key !== 'projet_id' && value !== undefined) {
        // Gérer user_id séparément
        if (key === 'user_id') {
          fields.push('user_id = ?');
          values.push(value);
          return;
        }
        if (key === 'permissions') {
          const perms = value as UpdateCollaborateurInput['permissions'];
          // Fusionner les permissions partielles avec les permissions actuelles
          const mergedPerms = {
            reproduction: perms?.reproduction ?? currentCollaborateur!.permissions.reproduction,
            nutrition: perms?.nutrition ?? currentCollaborateur!.permissions.nutrition,
            finance: perms?.finance ?? currentCollaborateur!.permissions.finance,
            rapports: perms?.rapports ?? currentCollaborateur!.permissions.rapports,
            planification: perms?.planification ?? currentCollaborateur!.permissions.planification,
            mortalites: perms?.mortalites ?? currentCollaborateur!.permissions.mortalites,
          };
          fields.push('permission_reproduction = ?');
          values.push(mergedPerms.reproduction ? 1 : 0);
          fields.push('permission_nutrition = ?');
          values.push(mergedPerms.nutrition ? 1 : 0);
          fields.push('permission_finance = ?');
          values.push(mergedPerms.finance ? 1 : 0);
          fields.push('permission_rapports = ?');
          values.push(mergedPerms.rapports ? 1 : 0);
          fields.push('permission_planification = ?');
          values.push(mergedPerms.planification ? 1 : 0);
          fields.push('permission_mortalites = ?');
          values.push(mergedPerms.mortalites ? 1 : 0);
        } else if (key === 'date_acceptation') {
          fields.push(`${key} = ?`);
          values.push(value);
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    if (fields.length === 0) {
      return this.getCollaborateurById(id);
    }

    fields.push('derniere_modification = ?');
    values.push(derniere_modification);
    values.push(id);

    await this.db.runAsync(
      `UPDATE collaborations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getCollaborateurById(id);
  }
  async deleteCollaborateur(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM collaborations WHERE id = ?', [id]);
  }

  // Helper pour mapper les lignes de la base de données vers l'objet Collaborateur
  private mapRowToStockAliment(row: any): StockAliment {
    // S'assurer que quantite_actuelle est toujours un nombre
    const quantiteActuelle = typeof row.quantite_actuelle === 'number' 
      ? row.quantite_actuelle 
      : parseFloat(String(row.quantite_actuelle)) || 0;
    
    // S'assurer que seuil_alerte est un nombre ou undefined
    const seuilAlerte = row.seuil_alerte !== null && row.seuil_alerte !== undefined
      ? (typeof row.seuil_alerte === 'number' ? row.seuil_alerte : parseFloat(String(row.seuil_alerte)) || undefined)
      : undefined;
    
    return {
      id: row.id,
      projet_id: row.projet_id,
      nom: row.nom,
      categorie: row.categorie || undefined,
      quantite_actuelle: quantiteActuelle,
      unite: row.unite,
      seuil_alerte: seuilAlerte,
      date_derniere_entree: row.date_derniere_entree || undefined,
      date_derniere_sortie: row.date_derniere_sortie || undefined,
      alerte_active: row.alerte_active === 1,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  private mapRowToStockMouvement(row: any): StockMouvement {
    return {
      id: row.id,
      projet_id: row.projet_id,
      aliment_id: row.aliment_id,
      type: row.type,
      quantite: row.quantite,
      unite: row.unite,
      date: row.date,
      origine: row.origine || undefined,
      commentaire: row.commentaire || undefined,
      cree_par: row.cree_par || undefined,
      date_creation: row.date_creation,
    };
  }

  private mapRowToProductionAnimal(row: any): ProductionAnimal {
    return {
      id: row.id,
      projet_id: row.projet_id,
      code: row.code,
      nom: row.nom || undefined,
      origine: row.origine || undefined,
      sexe: row.sexe,
      date_naissance: row.date_naissance || undefined,
      poids_initial: row.poids_initial !== null ? row.poids_initial : undefined,
      date_entree: row.date_entree || undefined,
      actif: row.actif === 1,
      statut: (row.statut || (row.actif === 1 ? 'actif' : 'autre')) as any,
      race: row.race || undefined,
      reproducteur: row.reproducteur === 1,
      pere_id: row.pere_id || undefined,
      mere_id: row.mere_id || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  private mapRowToProductionPesee(row: any): ProductionPesee {
    return {
      id: row.id,
      projet_id: row.projet_id,
      animal_id: row.animal_id,
      date: row.date,
      poids_kg: row.poids_kg,
      gmq: row.gmq !== null ? row.gmq : undefined,
      difference_standard: row.difference_standard !== null ? row.difference_standard : undefined,
      commentaire: row.commentaire || undefined,
      cree_par: row.cree_par || undefined,
      date_creation: row.date_creation,
    };
  }

  // Helper pour mapper les lignes de la base de données vers l'objet Collaborateur
  private mapRowToCollaborateur(row: any): Collaborateur {
    return {
      id: row.id,
      projet_id: row.projet_id,
      user_id: row.user_id || undefined,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      telephone: row.telephone || undefined,
      role: row.role,
      statut: row.statut,
      permissions: {
        reproduction: row.permission_reproduction === 1,
        nutrition: row.permission_nutrition === 1,
        finance: row.permission_finance === 1,
        rapports: row.permission_rapports === 1,
        planification: row.permission_planification === 1,
        mortalites: row.permission_mortalites === 1,
      },
      date_invitation: row.date_invitation,
      date_acceptation: row.date_acceptation || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  private calculateDayDifference(start: string, end: string): number {
    // Parser les dates en ignorant l'heure pour éviter les problèmes de timezone
    // Format attendu: YYYY-MM-DD
    const parseDateOnly = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    
    const startDate = parseDateOnly(start);
    const endDate = parseDateOnly(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    // Utiliser Math.floor pour avoir le nombre exact de jours complets
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays <= 0 ? 0 : diffDays;
  }

  /**
   * Nettoie toutes les données d'un utilisateur (projets et données associées)
   */
  async clearUserData(userId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    try {
      // Récupérer tous les projets de l'utilisateur
      const projets = await this.db.getAllAsync<{ id: string }>(
        'SELECT id FROM projets WHERE proprietaire_id = ?',
        [userId]
      );

      // Pour chaque projet, supprimer toutes les données associées
      for (const projet of projets) {
        const projetId = projet.id;

        // Supprimer toutes les données liées au projet (en respectant l'ordre des dépendances)
        await this.db.runAsync('DELETE FROM stocks_mouvements WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM stocks_aliments WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM ingredients_ration WHERE ration_id IN (SELECT id FROM rations WHERE projet_id = ?)', [projetId]);
        await this.db.runAsync('DELETE FROM rations WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM production_pesees WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM production_animaux WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM sevrages WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM gestations WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM depenses_ponctuelles WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM revenus WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM charges_fixes WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM rapports_croissance WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM mortalites WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM planifications WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM collaborations WHERE projet_id = ?', [projetId]);
      }

      // Supprimer les projets de l'utilisateur
      await this.db.runAsync('DELETE FROM projets WHERE proprietaire_id = ?', [userId]);
    } catch (error) {
      console.error('Erreur lors du nettoyage des données utilisateur:', error);
      throw error;
    }
  }
}

// Instance singleton
export const databaseService = new DatabaseService();


