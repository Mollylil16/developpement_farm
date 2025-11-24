/**
 * Service de base de données SQLite
 * Gère toutes les opérations de base de données pour l'application
 */

import * as SQLite from 'expo-sqlite';
import uuid from 'react-native-uuid';
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
import { genererPlusieursNomsAleatoires } from '../utils/nameGenerator';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialise la connexion à la base de données
   * Utilise un verrou pour éviter les initialisations parallèles
   */
  async initialize(): Promise<void> {
    // Si déjà initialisé, ne rien faire
    if (this.db) {
      return;
    }

    // Si une initialisation est en cours, attendre qu'elle se termine
    if (this.isInitializing && this.initPromise) {
      console.log('⏳ [DB] Initialisation en cours, attente...');
      return this.initPromise;
    }

    // Marquer comme en cours d'initialisation
    this.isInitializing = true;

    // Créer la promesse d'initialisation
    this.initPromise = (async () => {
      try {
        console.log('🔧 [DB] Initialisation de la base de données...');
        this.db = await SQLite.openDatabaseAsync('fermier_pro.db');
        
        // Configurer SQLite pour éviter les deadlocks
        try {
          await this.db.execAsync('PRAGMA busy_timeout = 5000;'); // Attendre 5s si locked
          await this.db.execAsync('PRAGMA journal_mode = WAL;'); // Write-Ahead Logging
          console.log('✅ [DB] Configuration SQLite appliquée');
        } catch (error: any) {
          console.warn('⚠️ [DB] Impossible de configurer SQLite:', error?.message);
        }

        await this.createTables();
        await this.migrateTables();
        await this.createIndexesWithProjetId();
        
        console.log('✅ [DB] Base de données initialisée avec succès');
      } catch (error) {
        console.error("❌ [DB] Erreur lors de l'initialisation de la base de données:", error);
        this.db = null; // Réinitialiser en cas d'erreur
        throw error;
      } finally {
        this.isInitializing = false;
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Détecte et répare une base de données corrompue
   */
  private async detectAndRepairCorruption(): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    try {
      // Vérifier si des tables _old existent
      const oldTables = await this.db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_old'"
      );

      if (oldTables.length > 0) {
        console.warn(`🚨 [DB] CORRUPTION DÉTECTÉE: ${oldTables.length} table(s) temporaire(s)`);
        console.warn('🔧 [DB] Tentative de réparation automatique...');

        // Tenter de supprimer chaque table _old
        let failedDeletions = 0;
        for (const table of oldTables) {
          try {
            await this.db.execAsync(`DROP TABLE IF EXISTS ${table.name};`);
            console.log(`   ✅ ${table.name} supprimée`);
          } catch (error: any) {
            failedDeletions++;
            console.error(`   ❌ ${table.name}: ${error?.message}`);
          }
        }

        // Si on n'a pas pu supprimer les tables, la base est verrouillée = corruption critique
        if (failedDeletions > 0) {
          console.error('🚨 [DB] CORRUPTION CRITIQUE: Impossible de nettoyer les tables');
          console.error('🔄 [DB] Reconstruction complète nécessaire...');
          return true; // Signaler qu'une reconstruction est nécessaire
        }
      }

      return false; // Pas de corruption ou réparation réussie
    } catch (error: any) {
      console.error('❌ [DB] Erreur lors de la détection de corruption:', error?.message);
      return false;
    }
  }

  /**
   * Reconstruit complètement la base de données
   */
  private async rebuildDatabase(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      console.warn('🔨 [DB] RECONSTRUCTION COMPLÈTE DE LA BASE...');

      // Fermer la connexion actuelle
      await this.db.closeAsync();
      this.db = null;

      // Attendre un peu pour s'assurer que le fichier est libéré
      await new Promise(resolve => setTimeout(resolve, 500));

      // Supprimer l'ancienne base (via expo-sqlite, on ne peut pas supprimer physiquement)
      // On va plutôt recréer toutes les tables en DROP IF EXISTS
      console.log('🗑️  [DB] Suppression de toutes les tables...');

      // Rouvrir la base
      this.db = await SQLite.openDatabaseAsync('fermier_pro.db');

      // Supprimer TOUTES les tables existantes
      const allTables = await this.db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );

      for (const table of allTables) {
        try {
          await this.db.execAsync(`DROP TABLE IF EXISTS ${table.name};`);
          console.log(`   ✅ Table ${table.name} supprimée`);
        } catch (error: any) {
          console.warn(`   ⚠️  Impossible de supprimer ${table.name}: ${error?.message}`);
        }
      }

      console.log('✅ [DB] Base reconstruite, recréation des tables...');

    } catch (error: any) {
      console.error('❌ [DB] Erreur lors de la reconstruction:', error?.message);
      throw error;
    }
  }

  /**
   * Nettoie les tables temporaires (_old) laissées par des migrations échouées
   */
  private async cleanupFailedMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    try {
      console.log('🧹 [DB] Nettoyage des migrations échouées...');

      // Détecter une corruption critique
      const needsRebuild = await this.detectAndRepairCorruption();

      if (needsRebuild) {
        // Reconstruction complète
        await this.rebuildDatabase();
        return; // Les tables seront recréées après
      }

      // Vérifier à nouveau s'il reste des tables _old
      const oldTables = await this.db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_old'"
      );

      if (oldTables.length === 0) {
        console.log('✅ [DB] Aucune table temporaire trouvée');
      }
    } catch (error: any) {
      console.error('❌ [DB] Erreur lors du nettoyage:', error?.message || error);
      // En cas d'erreur, tenter une reconstruction
      try {
        await this.rebuildDatabase();
      } catch (rebuildError: any) {
        console.error('❌ [DB] Impossible de reconstruire la base:', rebuildError?.message);
      }
    }
  }

  /**
   * Migrations pour les bases de données existantes
   */
  private async migrateTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // NOUVEAU: Nettoyer les tables temporaires avant toute migration
    await this.cleanupFailedMigrations();

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
            // Migration: Colonne telephone ajoutée
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

            // Migration: Table users recréée
          }
        }
      } catch (error: any) {
        console.warn('Erreur lors de la migration de la table users:', error?.message || error);
      }

      // Migration: Ajouter champs profil_type et champs vétérinaire
      // DÉSACTIVÉE - Fonctionnalité retirée mais colonnes conservées en DB
      /* try {
        const usersColumns = await this.db.getAllAsync<{ name: string }>(
          "PRAGMA table_info('users')"
        );
        
        const colonnesAVerifier = [
          { nom: 'profil_type', sql: 'profil_type TEXT CHECK (profil_type IN (\'producteur\', \'veterinaire\', \'acheteur\'))' },
          { nom: 'localite_exercice', sql: 'localite_exercice TEXT' },
          { nom: 'photo_piece_identite', sql: 'photo_piece_identite TEXT' },
          { nom: 'photo_diplome_veterinaire', sql: 'photo_diplome_veterinaire TEXT' }
        ];
        
        for (const colonne of colonnesAVerifier) {
          const colonneExiste = usersColumns.some((col) => col.name === colonne.nom);
          if (!colonneExiste) {
            await this.db.execAsync(`ALTER TABLE users ADD COLUMN ${colonne.sql};`);
            console.log(`Migration: Colonne ${colonne.nom} ajoutée à la table users`);
          }
        }
      } catch (error: any) {
        console.warn('Erreur lors de la migration profil_type pour users:', error?.message || error);
      } */

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
            // Migration: Colonne projet_id ajoutée à rations
          }
        } else {
          // Table n'existe pas encore, elle sera créée avec projet_id dans createTables
          // Migration: Table rations sera créée avec projet_id
        }
      } catch (error: any) {
        console.warn(
          'Erreur lors de la migration projet_id pour rations:',
          error?.message || error
        );
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

        // Migration: Colonne statut ajoutée
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
            // Migration: Ajout colonne user_id à collaborations

            // Ajouter la colonne user_id (nullable car les anciens collaborateurs n'ont pas encore de user_id)
            await this.db.execAsync(`
              ALTER TABLE collaborations ADD COLUMN user_id TEXT;
            `);

            // Créer un index pour user_id
            await this.db.execAsync(`
              CREATE INDEX IF NOT EXISTS idx_collaborations_user_id ON collaborations(user_id);
            `);

            // Migration: Colonne user_id ajoutée
          } else {
            // Migration: Colonne user_id existe déjà
          }
        } else {
          // Migration: Table collaborations sera créée avec user_id
        }
      } catch (error: any) {
        console.error(
          '❌ Erreur lors de la migration user_id pour collaborations:',
          error?.message || error
        );
        console.error("Détails de l'erreur:", error);
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
        // Migration: Colonne race ajoutée
      }

      // Migration: Ajouter prix_kg_vif et prix_kg_carcasse à la table projets si elles n'existent pas
      try {
        const projetsTableExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='projets'"
        );

        if (projetsTableExists) {
          const prixVifInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('projets') WHERE name = 'prix_kg_vif'"
          );

          if (!prixVifInfo) {
            await this.db.execAsync(`
              ALTER TABLE projets ADD COLUMN prix_kg_vif REAL;
            `);
            // Migration: Colonne prix_kg_vif ajoutée à la table projets');
          }

          const prixCarcasseInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('projets') WHERE name = 'prix_kg_carcasse'"
          );

          if (!prixCarcasseInfo) {
            await this.db.execAsync(`
              ALTER TABLE projets ADD COLUMN prix_kg_carcasse REAL;
            `);
            // Migration: Colonne prix_kg_carcasse ajoutée à la table projets');
          }
        }
      } catch (error: any) {
        console.warn('Erreur lors de la migration prix_kg pour projets:', error?.message || error);
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
        // Migration: Colonne reproducteur ajoutée à la table production_animaux');
      }

      // Migration: Ajouter pere_id si absent
      const pereInfo = await this.db.getFirstAsync<{ name: string } | null>(
        "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'pere_id'"
      );

      if (!pereInfo) {
        await this.db.execAsync(`
          ALTER TABLE production_animaux ADD COLUMN pere_id TEXT;
        `);
        // Migration: Colonne pere_id ajoutée à la table production_animaux');
      }

      // Migration: Ajouter mere_id si absent
      const mereInfo = await this.db.getFirstAsync<{ name: string } | null>(
        "SELECT name FROM pragma_table_info('production_animaux') WHERE name = 'mere_id'"
      );

      if (!mereInfo) {
        await this.db.execAsync(`
          ALTER TABLE production_animaux ADD COLUMN mere_id TEXT;
        `);
        // Migration: Colonne mere_id ajoutée à la table production_animaux');
      }

      // Migration: Ajouter verrat_id à la table gestations si elle n'existe pas
      try {
        // Vérifier d'abord si la table gestations existe
        const gestationsTableExistsForVerratId = await this.db.getFirstAsync<{
          name: string;
        } | null>("SELECT name FROM sqlite_master WHERE type='table' AND name='gestations'");

        if (gestationsTableExistsForVerratId) {
          const verratIdInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('gestations') WHERE name = 'verrat_id'"
          );

          if (!verratIdInfo) {
            await this.db.execAsync(`
              ALTER TABLE gestations ADD COLUMN verrat_id TEXT;
            `);
            // Migration: Colonne verrat_id ajoutée à la table gestations');
          }
        }
      } catch (error: any) {
        console.warn(
          'Erreur lors de la migration verrat_id pour gestations:',
          error?.message || error
        );
      }

      // Migration: Ajouter verrat_nom à la table gestations si elle n'existe pas
      try {
        // Vérifier d'abord si la table gestations existe
        const gestationsTableExistsForVerratNom = await this.db.getFirstAsync<{
          name: string;
        } | null>("SELECT name FROM sqlite_master WHERE type='table' AND name='gestations'");

        if (gestationsTableExistsForVerratNom) {
          const verratNomInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('gestations') WHERE name = 'verrat_nom'"
          );

          if (!verratNomInfo) {
            await this.db.execAsync(`
              ALTER TABLE gestations ADD COLUMN verrat_nom TEXT;
            `);
            // Migration: Colonne verrat_nom ajoutée à la table gestations');
          }
        }
      } catch (error: any) {
        console.warn(
          'Erreur lors de la migration verrat_nom pour gestations:',
          error?.message || error
        );
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
            // Migration: Colonne projet_id ajoutée à la table gestations');
          }
        } else {
          // Table n'existe pas encore, elle sera créée avec projet_id dans createTables
          // Migration: Table gestations n\'existe pas encore, sera créée avec projet_id');
        }
      } catch (error: any) {
        console.warn(
          'Erreur lors de la migration projet_id pour gestations:',
          error?.message || error
        );
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
            // Migration: Colonne animal_code ajoutée à la table mortalites');
          }
        } else {
          // Table n'existe pas encore, elle sera créée avec animal_code dans createTables
          // Migration: Table mortalites n\'existe pas encore, sera créée avec animal_code');
        }
      } catch (error: any) {
        console.warn(
          'Erreur lors de la migration animal_code pour mortalites:',
          error?.message || error
        );
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
          // Migration: Table sevrages n\'existe pas encore, sera créée avec projet_id');
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
                  const gestationsAvecProjetId = await this.db.getFirstAsync<{
                    count: number;
                  } | null>('SELECT COUNT(*) as count FROM gestations WHERE projet_id IS NOT NULL');

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
                  console.warn(
                    'Colonne projet_id non utilisable dans gestations, utilisation du fallback:',
                    testError?.message || testError
                  );
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
            // Migration: Colonne projet_id ajoutée à la table sevrages');
          }
        }
      } catch (error: any) {
        console.warn(
          'Erreur lors de la migration projet_id pour sevrages:',
          error?.message || error
        );
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
            // Migration: Colonne projet_id ajoutée à la table depenses_ponctuelles');
          }
        } else {
          // Table n'existe pas encore, elle sera créée avec projet_id dans createTables
          // Migration: Table depenses_ponctuelles n\'existe pas encore, sera créée avec projet_id');
        }
      } catch (error: any) {
        console.warn(
          'Erreur lors de la migration projet_id pour depenses_ponctuelles:',
          error?.message || error
        );
      }

      // Migration: Ajouter projet_id à la table charges_fixes si elle n'existe pas
      try {
        const chargesFixesTableExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='charges_fixes'"
        );

        if (chargesFixesTableExists) {
          const chargesFixesProjetIdInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('charges_fixes') WHERE name = 'projet_id'"
          );

          if (!chargesFixesProjetIdInfo) {
            await this.db.execAsync(`
              ALTER TABLE charges_fixes ADD COLUMN projet_id TEXT;
            `);
            // Mettre à jour les charges fixes existantes avec le premier projet actif (si disponible)
            const premierProjet = await this.db.getFirstAsync<{ id: string } | null>(
              'SELECT id FROM projets ORDER BY date_creation ASC LIMIT 1'
            );
            if (premierProjet) {
              await this.db.runAsync(
                'UPDATE charges_fixes SET projet_id = ? WHERE projet_id IS NULL',
                [premierProjet.id]
              );
            }
            console.log('  ✅ Colonne projet_id ajoutée à la table charges_fixes');
          } else {
            console.log('  ℹ️  Colonne projet_id déjà présente dans la table charges_fixes');
          }
        } else {
          // Table n'existe pas encore, elle sera créée avec projet_id dans createTables
          console.log('  ℹ️  Table charges_fixes n\'existe pas encore, sera créée avec projet_id');
        }
      } catch (error: any) {
        console.warn('⚠️  Erreur lors de la migration projet_id pour charges_fixes:', error?.message || error);
      }

      // Migration: Mettre à jour la contrainte CHECK de la table ingredients pour supporter 'sac'
      try {
        const ingredientsTableExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='ingredients'"
        );

        if (ingredientsTableExists) {
          // Vérifier si la migration a déjà été effectuée
          const migrationCheck = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
          );

          let migrationEffectuee = false;
          if (migrationCheck) {
            const uniteSacMigration = await this.db.getFirstAsync<{ done: number } | null>(
              "SELECT done FROM _migrations WHERE migration = 'ingredients_unite_sac'"
            );
            migrationEffectuee = uniteSacMigration?.done === 1;
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
            // Récupérer les données existantes
            const existingIngredients = await this.db.getAllAsync<any>('SELECT * FROM ingredients');

            // Supprimer l'ancienne table
            await this.db.execAsync('DROP TABLE IF EXISTS ingredients');

            // Recréer la table avec la nouvelle contrainte
            await this.db.execAsync(`
              CREATE TABLE IF NOT EXISTS ingredients (
                id TEXT PRIMARY KEY,
                nom TEXT NOT NULL,
                unite TEXT NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml', 'sac')),
                prix_unitaire REAL NOT NULL,
                proteine_pourcent REAL,
                energie_kcal REAL,
                date_creation TEXT DEFAULT CURRENT_TIMESTAMP
              );
            `);

            // Réinsérer les données
            for (const ing of existingIngredients) {
              await this.db.runAsync(
                `INSERT INTO ingredients (id, nom, unite, prix_unitaire, proteine_pourcent, energie_kcal, date_creation)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  ing.id,
                  ing.nom,
                  ing.unite,
                  ing.prix_unitaire,
                  ing.proteine_pourcent || null,
                  ing.energie_kcal || null,
                  ing.date_creation,
                ]
              );
            }

            // Marquer la migration comme effectuée
            await this.db.runAsync(
              'INSERT OR REPLACE INTO _migrations (migration, done) VALUES (?, ?)',
              ['ingredients_unite_sac', 1]
            );

            // Migration: Table ingredients recréée avec support de l\'unité "sac"');
          }
        }
      } catch (error: any) {
        console.warn(
          'Erreur lors de la migration de la contrainte unite pour ingredients:',
          error?.message || error
        );
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

      // Migration: Ajouter permission_sante à la table collaborations si elle n'existe pas
      try {
        const collaborationsTableExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='collaborations'"
        );

        if (collaborationsTableExists) {
          const permissionSanteInfo = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('collaborations') WHERE name = 'permission_sante'"
          );

          if (!permissionSanteInfo) {
            await this.db.execAsync(`
              ALTER TABLE collaborations ADD COLUMN permission_sante INTEGER DEFAULT 0;
            `);
            // Migration: Colonne permission_sante ajoutée à la table collaborations');
          }
        } else {
          // Migration: Table collaborations n\'existe pas encore, sera créée avec permission_sante');
        }
      } catch (error: any) {
        console.warn(
          'Erreur lors de la migration permission_sante pour collaborations:',
          error?.message || error
        );
      }

      // Migration: Ajouter nouvelles colonnes à la table vaccinations pour prophylaxie améliorée
      try {
        const vaccinationsTableExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='vaccinations'"
        );

        if (vaccinationsTableExists) {
          // Vérifier et ajouter chaque nouvelle colonne si elle n'existe pas
          const colonnesAAjouter = [
            { nom: 'animal_ids', type: 'TEXT', default: null }, // JSON array
            { nom: 'type_prophylaxie', type: 'TEXT', default: "'vitamine'" },
            { nom: 'produit_administre', type: 'TEXT', default: null },
            { nom: 'photo_flacon', type: 'TEXT', default: null },
            { nom: 'dosage', type: 'TEXT', default: null },
            { nom: 'unite_dosage', type: 'TEXT', default: "'ml'" },
            { nom: 'raison_traitement', type: 'TEXT', default: "'suivi_normal'" },
            { nom: 'raison_autre', type: 'TEXT', default: null },
          ];

          for (const colonne of colonnesAAjouter) {
            try {
              const colonneInfo = await this.db.getFirstAsync<{ name: string } | null>(
                `SELECT name FROM pragma_table_info('vaccinations') WHERE name = '${colonne.nom}'`
              );

              if (!colonneInfo) {
                const defaultValue = colonne.default || 'NULL';
                await this.db.execAsync(`
                  ALTER TABLE vaccinations ADD COLUMN ${colonne.nom} ${colonne.type} DEFAULT ${defaultValue};
                `);
                console.log(`Migration: Colonne ${colonne.nom} ajoutée à la table vaccinations`);
              }
            } catch (error: any) {
              console.warn(
                `Erreur lors de l'ajout de la colonne ${colonne.nom}:`,
                error?.message || error
              );
            }
          }
        } else {
          // Migration: Table vaccinations n\'existe pas encore, sera créée avec les nouvelles colonnes');
        }
      } catch (error: any) {
        console.warn(
          'Erreur lors de la migration des colonnes prophylaxie pour vaccinations:',
          error?.message || error
        );
      }

      // Migration: Mettre à jour table visites_veterinaires
      try {
        const visitesVetTable = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='visites_veterinaires'"
        );

        if (visitesVetTable) {
          // Vérifier si la colonne prochaine_visite_prevue existe
          const colonneExists = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('visites_veterinaires') WHERE name = 'prochaine_visite_prevue'"
          );

          if (!colonneExists) {
            // Migration: Mise à jour de la table visites_veterinaires');

            await this.db.execAsync(
              `ALTER TABLE visites_veterinaires RENAME TO visites_veterinaires_old;`
            );

            await this.db.execAsync(`
              CREATE TABLE visites_veterinaires (
                id TEXT PRIMARY KEY,
                projet_id TEXT NOT NULL,
                date_visite TEXT NOT NULL,
                veterinaire TEXT,
                motif TEXT NOT NULL,
                animaux_examines TEXT,
                diagnostic TEXT,
                prescriptions TEXT,
                recommandations TEXT,
                traitement TEXT,
                cout REAL,
                prochaine_visite_prevue TEXT,
                notes TEXT,
                date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
                derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (projet_id) REFERENCES projets(id)
              );
            `);

            // Copier avec mapping de colonnes
            await this.db.execAsync(`
              INSERT INTO visites_veterinaires 
                (id, projet_id, date_visite, veterinaire, motif, animaux_examines, 
                 diagnostic, prescriptions, recommandations, cout, notes, date_creation, derniere_modification)
              SELECT 
                id, projet_id, date_visite, veterinaire, motif, animaux_examines,
                diagnostic, prescriptions, recommandations, cout, notes, date_creation, derniere_modification
              FROM visites_veterinaires_old;
            `);

            await this.db.execAsync(`DROP TABLE visites_veterinaires_old;`);

            // Migration: Table visites_veterinaires mise à jour avec succès');
          }
        }
      } catch (error: any) {
        console.warn('Erreur lors de la migration visites_veterinaires:', error?.message || error);
      }

      // Migration: Ajouter la colonne photo_uri dans production_animaux
      try {
        const hasPhotoUri = await this.db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM pragma_table_info('production_animaux') WHERE name='photo_uri'"
        );

        if (hasPhotoUri && hasPhotoUri.count === 0) {
          // Migration: Ajout de la colonne photo_uri dans production_animaux');
          await this.db.execAsync(`ALTER TABLE production_animaux ADD COLUMN photo_uri TEXT;`);
          // Migration: Colonne photo_uri ajoutée avec succès');
        }
      } catch (error: any) {
        console.warn("Erreur lors de l'ajout de photo_uri:", error?.message || error);
      }

      // Migration: Mettre à jour CHECK constraint statut dans production_animaux
      try {
        const productionAnimauxTable = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='production_animaux'"
        );

        if (productionAnimauxTable) {
          // Supprimer l'ancienne table si elle existe (migration précédente incomplète)
          try {
            await this.db.execAsync(`DROP TABLE IF EXISTS production_animaux_old;`);
          } catch (e) {
            // Ignorer les erreurs
          }

          await this.db.execAsync(
            `ALTER TABLE production_animaux RENAME TO production_animaux_old;`
          );

          await this.db.execAsync(`
            CREATE TABLE production_animaux (
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
              statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'mort', 'vendu', 'offert', 'autre')),
              race TEXT,
              reproducteur INTEGER DEFAULT 0 CHECK (reproducteur IN (0, 1)),
              pere_id TEXT,
              mere_id TEXT,
              notes TEXT,
              photo_uri TEXT,
              date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
              derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (projet_id) REFERENCES projets(id),
              FOREIGN KEY (pere_id) REFERENCES production_animaux(id),
              FOREIGN KEY (mere_id) REFERENCES production_animaux(id)
            );
          `);

          await this.db.execAsync(`
            INSERT INTO production_animaux (
              id, projet_id, code, nom, origine, sexe, date_naissance, poids_initial, 
              date_entree, actif, statut, race, reproducteur, pere_id, mere_id, notes,
              date_creation, derniere_modification
            )
            SELECT 
              id, projet_id, code, nom, origine, sexe, date_naissance, poids_initial,
              date_entree, actif, statut, race, reproducteur, pere_id, mere_id, notes,
              date_creation, derniere_modification
            FROM production_animaux_old;
          `);

          await this.db.execAsync(`DROP TABLE IF EXISTS production_animaux_old;`);
        }
      } catch (error: any) {
        console.warn(
          'Erreur lors de la migration production_animaux statut:',
          error?.message || error
        );
      }

      // Migration: Rendre la colonne vaccin nullable dans vaccinations (pour type_prophylaxie)
      try {
        const vaccinationsCheckTable = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='vaccinations'"
        );

        if (vaccinationsCheckTable) {
          // Vérifier si type_prophylaxie existe (signe de la nouvelle structure)
          const typeProphylaxieExists = await this.db.getFirstAsync<{ name: string } | null>(
            "SELECT name FROM pragma_table_info('vaccinations') WHERE name = 'type_prophylaxie'"
          );

          if (typeProphylaxieExists) {
            // Migration: Mise à jour de la table vaccinations pour rendre vaccin nullable');

            // Recréer la table avec vaccin nullable
            await this.db.execAsync(`ALTER TABLE vaccinations RENAME TO vaccinations_old;`);

            await this.db.execAsync(`
              CREATE TABLE vaccinations (
                id TEXT PRIMARY KEY,
                projet_id TEXT NOT NULL,
                calendrier_id TEXT,
                animal_id TEXT,
                lot_id TEXT,
                vaccin TEXT,
                nom_vaccin TEXT,
                date_vaccination TEXT NOT NULL,
                date_rappel TEXT,
                numero_lot_vaccin TEXT,
                veterinaire TEXT,
                cout REAL,
                statut TEXT NOT NULL CHECK (statut IN ('planifie', 'effectue', 'en_retard', 'annule')) DEFAULT 'effectue',
                effets_secondaires TEXT,
                notes TEXT,
                date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
                derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
                animal_ids TEXT,
                type_prophylaxie TEXT DEFAULT 'vitamine',
                produit_administre TEXT,
                photo_flacon TEXT,
                dosage TEXT,
                unite_dosage TEXT DEFAULT 'ml',
                raison_traitement TEXT DEFAULT 'suivi_normal',
                raison_autre TEXT,
                FOREIGN KEY (projet_id) REFERENCES projets(id),
                FOREIGN KEY (calendrier_id) REFERENCES calendrier_vaccinations(id),
                FOREIGN KEY (animal_id) REFERENCES production_animaux(id)
              );
            `);

            // Copier les données
            await this.db.execAsync(`
              INSERT INTO vaccinations SELECT * FROM vaccinations_old;
            `);

            // Supprimer l'ancienne table
            await this.db.execAsync(`DROP TABLE vaccinations_old;`);

            // Migration: Table vaccinations mise à jour avec succès');
          }
        }
      } catch (error: any) {
        console.warn('Erreur lors de la migration vaccinations nullable:', error?.message || error);
      }

      // Migration: Mettre à jour le constraint de la table maladies pour nouveaux types
      try {
        const maladiesTableExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='maladies'"
        );

        if (maladiesTableExists) {
          // SQLite ne supporte pas ALTER COLUMN, donc on doit recréer la table
          // Migration: Mise à jour de la table maladies pour nouveaux types de maladies');

          // Renommer l'ancienne table
          await this.db.execAsync(`ALTER TABLE maladies RENAME TO maladies_old;`);

          // Recréer la table avec le nouveau constraint
          await this.db.execAsync(`
            CREATE TABLE maladies (
              id TEXT PRIMARY KEY,
              projet_id TEXT NOT NULL,
              animal_id TEXT,
              lot_id TEXT,
              type TEXT NOT NULL CHECK (type IN ('diarrhee', 'respiratoire', 'gale_parasites', 'fievre', 'boiterie', 'digestive', 'cutanee', 'reproduction', 'neurologique', 'autre')),
              nom_maladie TEXT NOT NULL,
              gravite TEXT NOT NULL CHECK (gravite IN ('faible', 'moderee', 'grave', 'critique')),
              date_debut TEXT NOT NULL,
              date_fin TEXT,
              symptomes TEXT NOT NULL,
              diagnostic TEXT,
              contagieux INTEGER DEFAULT 0 CHECK (contagieux IN (0, 1)),
              nombre_animaux_affectes INTEGER,
              nombre_deces INTEGER,
              veterinaire TEXT,
              cout_traitement REAL,
              gueri INTEGER DEFAULT 0 CHECK (gueri IN (0, 1)),
              notes TEXT,
              date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
              derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (projet_id) REFERENCES projets(id),
              FOREIGN KEY (animal_id) REFERENCES production_animaux(id)
            );
          `);

          // Copier les données existantes
          await this.db.execAsync(`
            INSERT INTO maladies SELECT * FROM maladies_old;
          `);

          // Supprimer l'ancienne table
          await this.db.execAsync(`DROP TABLE maladies_old;`);

          // Migration: Table maladies mise à jour avec succès');
        } else {
          // Migration: Table maladies n\'existe pas encore, sera créée avec les nouveaux types');
        }
      } catch (error: any) {
        console.warn('Erreur lors de la migration des types de maladies:', error?.message || error);
      }

      // ============================================
      // Migration: OPEX/CAPEX - Ajout champs amortissement et marges
      // ============================================
      try {
        const { migrateOpexCapexFields, isOpexCapexMigrationApplied } = 
          await import('../database/migrations/add_opex_capex_fields');
        
        const migrationApplied = await isOpexCapexMigrationApplied(this.db);
        
        if (!migrationApplied) {
          console.log('🔄 Application de la migration OPEX/CAPEX...');
          await migrateOpexCapexFields(this.db);
          console.log('✅ Migration OPEX/CAPEX appliquée avec succès');
        } else {
          console.log('ℹ️  Migration OPEX/CAPEX déjà appliquée');
        }
      } catch (error: any) {
        console.warn('⚠️  Erreur lors de la migration OPEX/CAPEX:', error?.message || error);
        // La migration échoue silencieusement pour ne pas bloquer l'app
      }

      // ============================================
      // Migration: Ajout de animal_id dans revenus
      // ============================================
      try {
        const revenusColumns = await this.db.getAllAsync<{ name: string }>(
          "PRAGMA table_info('revenus')"
        );
        
        const hasAnimalId = revenusColumns.some((col) => col.name === 'animal_id');
        
        if (!hasAnimalId) {
          await this.db.execAsync(`
            ALTER TABLE revenus ADD COLUMN animal_id TEXT;
          `);
          console.log('✅ Colonne animal_id ajoutée à la table revenus');
        } else {
          console.log('ℹ️  Colonne animal_id déjà présente dans revenus');
        }
      } catch (error: any) {
        console.warn('⚠️  Erreur lors de l\'ajout de animal_id:', error?.message || error);
        // La migration échoue silencieusement pour ne pas bloquer l'app
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
      {
        name: 'idx_depenses_projet',
        table: 'depenses_ponctuelles',
        column: 'projet_id',
        critical: true,
      },
      { name: 'idx_revenus_projet', table: 'revenus', column: 'projet_id', critical: true },
      {
        name: 'idx_rapports_croissance_projet',
        table: 'rapports_croissance',
        column: 'projet_id',
        critical: true,
      },
      { name: 'idx_mortalites_projet', table: 'mortalites', column: 'projet_id', critical: true },
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
      index: (typeof indexes)[0],
      maxRetries: number = 5 // Augmenté à 5 tentatives pour être plus agressif
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
            console.error(
              `❌ Index ${index.name} non créé: colonne ${index.column} n'existe pas dans ${index.table}`
            );
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
            await new Promise((resolve) => setTimeout(resolve, delay));
            console.warn(
              `⚠ Tentative ${attempt}/${maxRetries} échouée pour ${index.name}, réessai dans ${delay}ms...`,
              errorMessage
            );
          } else {
            // Dernière tentative échouée
            console.error(
              `❌ Échec définitif de création de l'index ${index.name} après ${maxRetries} tentatives:`,
              errorMessage
            );
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
      console.warn(
        'Erreur lors de la création de idx_production_animaux_reproducteur:',
        error?.message || error
      );
    }

    // Index sur collaborations(user_id) - colonne ajoutée par migration
    try {
      const tableExists = await this.db.getFirstAsync<{ name: string } | null>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='collaborations'"
      );

      if (tableExists) {
        const columnExists = await this.db.getFirstAsync<{ name: string } | null>(
          "SELECT name FROM pragma_table_info('collaborations') WHERE name = 'user_id'"
        );

        if (columnExists) {
          if (!(await indexExists('idx_collaborations_user_id'))) {
            await this.db.execAsync(`
              CREATE INDEX IF NOT EXISTS idx_collaborations_user_id ON collaborations(user_id);
            `);
            console.log('✓ Index idx_collaborations_user_id créé avec succès');
          }
        }
      }
    } catch (error: any) {
      console.warn(
        'Erreur lors de la création de idx_collaborations_user_id:',
        error?.message || error
      );
    }

    // Résumé et vérification critique
    const successCount = results.filter((r) => r).length;
    const failCount = results.filter((r) => !r).length;
    const failedIndexes = indexes.filter((_, i) => !results[i]);

    if (failCount > 0) {
      console.error(
        `❌ CRITIQUE: ${failCount} index(s) critique(s) n'ont pas pu être créés:`,
        failedIndexes.map((i) => i.name).join(', ')
      );
      console.error(
        `⚠ Sans ces index, les requêtes sur projet_id seront TRÈS LENTES (scan complet de table)`
      );
      console.error(`⚠ L'application fonctionnera mais l'expérience utilisateur sera dégradée`);

      // Ne pas bloquer l'initialisation, mais logger sévèrement
      // L'application pourra réessayer lors de la prochaine initialisation
    } else {
      console.log(
        `✓ Tous les index critiques (${successCount}/${indexes.length}) ont été créés avec succès`
      );
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
      'idx_collaborations_user_id',
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
        projet_id TEXT,
        categorie TEXT NOT NULL,
        libelle TEXT NOT NULL,
        montant REAL NOT NULL,
        date_debut TEXT NOT NULL,
        frequence TEXT NOT NULL CHECK (frequence IN ('mensuel', 'trimestriel', 'annuel')),
        jour_paiement INTEGER,
        notes TEXT,
        statut TEXT NOT NULL CHECK (statut IN ('actif', 'suspendu', 'termine')),
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
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
        unite TEXT NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml', 'sac')),
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
          statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'mort', 'vendu', 'offert', 'autre')),
        race TEXT,
        reproducteur INTEGER DEFAULT 0 CHECK (reproducteur IN (0, 1)),
        pere_id TEXT,
        mere_id TEXT,
        notes TEXT,
        photo_uri TEXT,
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

    // Table rations_budget (budgétisation d'aliment)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS rations_budget (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        nom TEXT NOT NULL,
        type_porc TEXT NOT NULL CHECK (type_porc IN ('porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance')),
        poids_moyen_kg REAL NOT NULL,
        nombre_porcs INTEGER NOT NULL,
        duree_jours INTEGER NOT NULL,
        ration_journaliere_par_porc REAL NOT NULL,
        quantite_totale_kg REAL NOT NULL,
        cout_total REAL NOT NULL,
        cout_par_kg REAL NOT NULL,
        cout_par_porc REAL NOT NULL,
        ingredients TEXT NOT NULL,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
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
        permission_sante INTEGER DEFAULT 0,
        date_invitation TEXT NOT NULL,
        date_acceptation TEXT,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // ============================================
    // MODULE SANTÉ
    // ============================================

    // Table calendrier_vaccinations (protocoles de vaccination)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS calendrier_vaccinations (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        vaccin TEXT NOT NULL CHECK (vaccin IN ('rouget', 'parvovirose', 'mal_rouge', 'circovirus', 'mycoplasme', 'grippe', 'autre')),
        nom_vaccin TEXT,
        categorie TEXT NOT NULL CHECK (categorie IN ('porcelet', 'truie', 'verrat', 'porc_croissance', 'tous')),
        age_jours INTEGER,
        date_planifiee TEXT,
        frequence_jours INTEGER,
        obligatoire INTEGER DEFAULT 0 CHECK (obligatoire IN (0, 1)),
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Table vaccinations (vaccinations effectuées)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS vaccinations (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        calendrier_id TEXT,
        animal_id TEXT,
        lot_id TEXT,
        vaccin TEXT,
        nom_vaccin TEXT,
        date_vaccination TEXT NOT NULL,
        date_rappel TEXT,
        numero_lot_vaccin TEXT,
        veterinaire TEXT,
        cout REAL,
        statut TEXT NOT NULL CHECK (statut IN ('planifie', 'effectue', 'en_retard', 'annule')) DEFAULT 'effectue',
        effets_secondaires TEXT,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        animal_ids TEXT,
        type_prophylaxie TEXT DEFAULT 'vitamine',
        produit_administre TEXT,
        photo_flacon TEXT,
        dosage TEXT,
        unite_dosage TEXT DEFAULT 'ml',
        raison_traitement TEXT DEFAULT 'suivi_normal',
        raison_autre TEXT,
        FOREIGN KEY (projet_id) REFERENCES projets(id),
        FOREIGN KEY (calendrier_id) REFERENCES calendrier_vaccinations(id),
        FOREIGN KEY (animal_id) REFERENCES production_animaux(id)
      );
    `);

    // Table maladies (journal des maladies)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS maladies (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        animal_id TEXT,
        lot_id TEXT,
        type TEXT NOT NULL CHECK (type IN ('diarrhee', 'respiratoire', 'gale_parasites', 'fievre', 'boiterie', 'digestive', 'cutanee', 'reproduction', 'neurologique', 'autre')),
        nom_maladie TEXT NOT NULL,
        gravite TEXT NOT NULL CHECK (gravite IN ('faible', 'moderee', 'grave', 'critique')),
        date_debut TEXT NOT NULL,
        date_fin TEXT,
        symptomes TEXT NOT NULL,
        diagnostic TEXT,
        contagieux INTEGER DEFAULT 0 CHECK (contagieux IN (0, 1)),
        nombre_animaux_affectes INTEGER,
        nombre_deces INTEGER,
        veterinaire TEXT,
        cout_traitement REAL,
        gueri INTEGER DEFAULT 0 CHECK (gueri IN (0, 1)),
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id),
        FOREIGN KEY (animal_id) REFERENCES production_animaux(id)
      );
    `);

    // Table traitements (traitements médicaux)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS traitements (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        maladie_id TEXT,
        animal_id TEXT,
        lot_id TEXT,
        type TEXT NOT NULL CHECK (type IN ('antibiotique', 'antiparasitaire', 'anti_inflammatoire', 'vitamine', 'vaccin', 'autre')),
        nom_medicament TEXT NOT NULL,
        voie_administration TEXT NOT NULL CHECK (voie_administration IN ('orale', 'injectable', 'topique', 'alimentaire')),
        dosage TEXT NOT NULL,
        frequence TEXT NOT NULL,
        date_debut TEXT NOT NULL,
        date_fin TEXT,
        duree_jours INTEGER,
        temps_attente_jours INTEGER,
        veterinaire TEXT,
        cout REAL,
        termine INTEGER DEFAULT 0 CHECK (termine IN (0, 1)),
        efficace INTEGER,
        effets_secondaires TEXT,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id),
        FOREIGN KEY (maladie_id) REFERENCES maladies(id),
        FOREIGN KEY (animal_id) REFERENCES production_animaux(id)
      );
    `);

    // Table visites_veterinaires (historique des visites vétérinaires)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS visites_veterinaires (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        date_visite TEXT NOT NULL,
        veterinaire TEXT,
        motif TEXT NOT NULL,
        animaux_examines TEXT,
        diagnostic TEXT,
        prescriptions TEXT,
        recommandations TEXT,
        traitement TEXT,
        cout REAL,
        prochaine_visite_prevue TEXT,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Table rappels_vaccinations (rappels automatiques)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS rappels_vaccinations (
        id TEXT PRIMARY KEY,
        vaccination_id TEXT NOT NULL,
        date_rappel TEXT NOT NULL,
        envoi INTEGER DEFAULT 0 CHECK (envoi IN (0, 1)),
        date_envoi TEXT,
        FOREIGN KEY (vaccination_id) REFERENCES vaccinations(id)
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
      -- Note: idx_collaborations_user_id est créé dans createIndexesWithProjetId() après la migration
      CREATE INDEX IF NOT EXISTS idx_stocks_aliments_alerte ON stocks_aliments(alerte_active);
      CREATE INDEX IF NOT EXISTS idx_stocks_mouvements_aliment ON stocks_mouvements(aliment_id);
      CREATE INDEX IF NOT EXISTS idx_stocks_mouvements_date ON stocks_mouvements(date);
      CREATE INDEX IF NOT EXISTS idx_production_animaux_actif ON production_animaux(actif);
      CREATE INDEX IF NOT EXISTS idx_production_pesees_animal ON production_pesees(animal_id);
      CREATE INDEX IF NOT EXISTS idx_production_pesees_date ON production_pesees(date);
      CREATE INDEX IF NOT EXISTS idx_calendrier_vaccinations_categorie ON calendrier_vaccinations(categorie);
      CREATE INDEX IF NOT EXISTS idx_vaccinations_statut ON vaccinations(statut);
      CREATE INDEX IF NOT EXISTS idx_vaccinations_date_rappel ON vaccinations(date_rappel);
      CREATE INDEX IF NOT EXISTS idx_vaccinations_animal ON vaccinations(animal_id);
      CREATE INDEX IF NOT EXISTS idx_maladies_type ON maladies(type);
      CREATE INDEX IF NOT EXISTS idx_maladies_gravite ON maladies(gravite);
      CREATE INDEX IF NOT EXISTS idx_maladies_gueri ON maladies(gueri);
      CREATE INDEX IF NOT EXISTS idx_maladies_date_debut ON maladies(date_debut);
      CREATE INDEX IF NOT EXISTS idx_traitements_termine ON traitements(termine);
      CREATE INDEX IF NOT EXISTS idx_traitements_maladie ON traitements(maladie_id);
      CREATE INDEX IF NOT EXISTS idx_traitements_animal ON traitements(animal_id);
      CREATE INDEX IF NOT EXISTS idx_visites_veterinaires_date ON visites_veterinaires(date_visite);
      CREATE INDEX IF NOT EXISTS idx_rappels_vaccinations_date ON rappels_vaccinations(date_rappel);
      CREATE INDEX IF NOT EXISTS idx_rappels_vaccinations_vaccination ON rappels_vaccinations(vaccination_id);
    `);
  }

  /**
   * ============================================
   * MODULE SANTÉ - CALENDRIER DE VACCINATIONS
   * ============================================
   */

  /**
   * Créer un protocole de vaccination dans le calendrier
   */
  async createCalendrierVaccination(
    input: CreateCalendrierVaccinationInput
  ): Promise<CalendrierVaccination> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO calendrier_vaccinations (
        id, projet_id, vaccin, nom_vaccin, categorie_animal, age_min_jours,
        age_max_jours, frequence_jours, obligatoire, notes, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.projet_id,
        input.vaccin,
        input.nom_vaccin || null,
        input.categorie_animal,
        input.age_min_jours || null,
        input.age_max_jours || null,
        input.frequence_jours || null,
        input.obligatoire ? 1 : 0,
        input.notes || null,
        now,
        now,
      ]
    );

    return {
      id,
      projet_id: input.projet_id,
      vaccin: input.vaccin,
      nom_vaccin: input.nom_vaccin,
      categorie_animal: input.categorie_animal,
      age_min_jours: input.age_min_jours,
      age_max_jours: input.age_max_jours,
      frequence_jours: input.frequence_jours,
      obligatoire: input.obligatoire || false,
      notes: input.notes,
      date_creation: now,
      derniere_modification: now,
    };
  }

  /**
   * Récupérer tous les protocoles de vaccination d'un projet
   */
  async getCalendrierVaccinationsByProjet(projetId: string): Promise<CalendrierVaccination[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM calendrier_vaccinations 
       WHERE projet_id = ? 
       ORDER BY categorie_animal, age_min_jours`,
      [projetId]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      vaccin: row.vaccin,
      nom_vaccin: row.nom_vaccin,
      categorie_animal: row.categorie_animal,
      age_min_jours: row.age_min_jours,
      age_max_jours: row.age_max_jours,
      frequence_jours: row.frequence_jours,
      obligatoire: Boolean(row.obligatoire),
      notes: row.notes,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    }));
  }

  /**
   * Récupérer un protocole de vaccination par ID
   */
  async getCalendrierVaccinationById(id: string): Promise<CalendrierVaccination | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM calendrier_vaccinations WHERE id = ?',
      [id]
    );

    if (!row) return null;

    return {
      id: row.id,
      projet_id: row.projet_id,
      vaccin: row.vaccin,
      nom_vaccin: row.nom_vaccin,
      categorie_animal: row.categorie_animal,
      age_min_jours: row.age_min_jours,
      age_max_jours: row.age_max_jours,
      frequence_jours: row.frequence_jours,
      obligatoire: Boolean(row.obligatoire),
      notes: row.notes,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  /**
   * Mettre à jour un protocole de vaccination
   */
  async updateCalendrierVaccination(
    id: string,
    updates: Partial<CreateCalendrierVaccinationInput>
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.vaccin !== undefined) {
      fields.push('vaccin = ?');
      values.push(updates.vaccin);
    }
    if (updates.nom_vaccin !== undefined) {
      fields.push('nom_vaccin = ?');
      values.push(updates.nom_vaccin);
    }
    if (updates.categorie_animal !== undefined) {
      fields.push('categorie_animal = ?');
      values.push(updates.categorie_animal);
    }
    if (updates.age_min_jours !== undefined) {
      fields.push('age_min_jours = ?');
      values.push(updates.age_min_jours);
    }
    if (updates.age_max_jours !== undefined) {
      fields.push('age_max_jours = ?');
      values.push(updates.age_max_jours);
    }
    if (updates.frequence_jours !== undefined) {
      fields.push('frequence_jours = ?');
      values.push(updates.frequence_jours);
    }
    if (updates.obligatoire !== undefined) {
      fields.push('obligatoire = ?');
      values.push(updates.obligatoire ? 1 : 0);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    if (fields.length === 0) return;

    fields.push('derniere_modification = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.runAsync(
      `UPDATE calendrier_vaccinations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Supprimer un protocole de vaccination
   */
  async deleteCalendrierVaccination(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM calendrier_vaccinations WHERE id = ?', [id]);
  }

  /**
   * Initialiser les protocoles de vaccination standard pour un projet
   */
  async initProtocolesVaccinationStandard(projetId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const { PROTOCOLES_VACCINATION_STANDARD } = await import('../types/sante');

    for (const protocole of PROTOCOLES_VACCINATION_STANDARD) {
      await this.createCalendrierVaccination({
        projet_id: projetId,
        ...protocole,
      });
    }
  }

  /**
   * ============================================
   * MODULE SANTÉ - VACCINATIONS
   * ============================================
   */

  /**
   * Créer une vaccination
   */
  async createVaccination(input: CreateVaccinationInput): Promise<Vaccination> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    // Convertir animal_ids en JSON string si présent
    const animalIdsJson = input.animal_ids ? JSON.stringify(input.animal_ids) : null;

    await this.db.runAsync(
      `INSERT INTO vaccinations (
        id, projet_id, calendrier_id, animal_id, lot_id, vaccin, nom_vaccin,
        date_vaccination, date_rappel, numero_lot_vaccin, veterinaire, cout,
        statut, effets_secondaires, notes, date_creation, derniere_modification,
        animal_ids, type_prophylaxie, produit_administre, photo_flacon, dosage,
        unite_dosage, raison_traitement, raison_autre
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.projet_id,
        input.calendrier_id || null,
        input.animal_ids && input.animal_ids.length > 0 ? input.animal_ids[0] : null, // Compat: premier animal
        input.lot_id || null,
        input.vaccin || null, // Plus obligatoire avec type_prophylaxie
        input.nom_vaccin || null,
        input.date_vaccination,
        input.date_rappel || null,
        input.numero_lot_vaccin || null,
        input.veterinaire || null,
        input.cout || null,
        input.statut || 'effectue',
        input.effets_secondaires || null,
        input.notes || null,
        now,
        now,
        // Nouveaux champs
        animalIdsJson,
        input.type_prophylaxie,
        input.produit_administre,
        input.photo_flacon || null,
        input.dosage,
        input.unite_dosage || 'ml',
        input.raison_traitement,
        input.raison_autre || null,
      ]
    );

    // Créer un rappel si date_rappel est fournie
    if (input.date_rappel) {
      await this.createRappelVaccination({
        projet_id: input.projet_id,
        vaccination_id: id,
        date_rappel: input.date_rappel,
        statut: 'en_attente',
      });
    }

    return {
      id,
      projet_id: input.projet_id,
      calendrier_id: input.calendrier_id,
      animal_ids: input.animal_ids,
      lot_id: input.lot_id,
      type_prophylaxie: input.type_prophylaxie,
      vaccin: input.vaccin,
      nom_vaccin: input.nom_vaccin,
      produit_administre: input.produit_administre,
      photo_flacon: input.photo_flacon,
      date_vaccination: input.date_vaccination,
      date_rappel: input.date_rappel,
      numero_lot_vaccin: input.numero_lot_vaccin,
      dosage: input.dosage,
      unite_dosage: input.unite_dosage,
      raison_traitement: input.raison_traitement,
      raison_autre: input.raison_autre,
      veterinaire: input.veterinaire,
      cout: input.cout,
      statut: input.statut || 'effectue',
      effets_secondaires: input.effets_secondaires,
      notes: input.notes,
      date_creation: now,
      derniere_modification: now,
    };
  }

  /**
   * Récupérer toutes les vaccinations d'un projet
   */
  async getVaccinationsByProjet(projetId: string): Promise<Vaccination[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM vaccinations 
       WHERE projet_id = ? 
       ORDER BY date_vaccination DESC`,
      [projetId]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      calendrier_id: row.calendrier_id,
      animal_ids: row.animal_ids ? JSON.parse(row.animal_ids) : undefined,
      lot_id: row.lot_id,
      type_prophylaxie: row.type_prophylaxie || 'vitamine',
      vaccin: row.vaccin,
      nom_vaccin: row.nom_vaccin,
      produit_administre: row.produit_administre || '',
      photo_flacon: row.photo_flacon,
      date_vaccination: row.date_vaccination,
      date_rappel: row.date_rappel,
      numero_lot_vaccin: row.numero_lot_vaccin,
      dosage: row.dosage || '',
      unite_dosage: row.unite_dosage || 'ml',
      raison_traitement: row.raison_traitement || 'suivi_normal',
      raison_autre: row.raison_autre,
      veterinaire: row.veterinaire,
      cout: row.cout,
      statut: row.statut,
      effets_secondaires: row.effets_secondaires,
      notes: row.notes,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    }));
  }

  /**
   * Récupérer une vaccination par ID
   */
  async getVaccinationById(id: string): Promise<Vaccination | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const row = await this.db.getFirstAsync<any>('SELECT * FROM vaccinations WHERE id = ?', [id]);

    if (!row) return null;

    return {
      id: row.id,
      projet_id: row.projet_id,
      calendrier_id: row.calendrier_id,
      animal_id: row.animal_id,
      lot_id: row.lot_id,
      vaccin: row.vaccin,
      nom_vaccin: row.nom_vaccin,
      date_vaccination: row.date_vaccination,
      date_rappel: row.date_rappel,
      numero_lot_vaccin: row.numero_lot_vaccin,
      veterinaire: row.veterinaire,
      cout: row.cout,
      statut: row.statut,
      effets_secondaires: row.effets_secondaires,
      notes: row.notes,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  /**
   * Récupérer les vaccinations d'un animal
   */
  async getVaccinationsByAnimal(animalId: string): Promise<Vaccination[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM vaccinations 
       WHERE animal_id = ? 
       ORDER BY date_vaccination DESC`,
      [animalId]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      calendrier_id: row.calendrier_id,
      animal_id: row.animal_id,
      lot_id: row.lot_id,
      vaccin: row.vaccin,
      nom_vaccin: row.nom_vaccin,
      date_vaccination: row.date_vaccination,
      date_rappel: row.date_rappel,
      numero_lot_vaccin: row.numero_lot_vaccin,
      veterinaire: row.veterinaire,
      cout: row.cout,
      statut: row.statut,
      effets_secondaires: row.effets_secondaires,
      notes: row.notes,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    }));
  }

  /**
   * Récupérer les vaccinations en retard
   */
  async getVaccinationsEnRetard(projetId: string): Promise<Vaccination[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const today = new Date().toISOString().split('T')[0];

    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM vaccinations 
       WHERE projet_id = ? 
       AND date_rappel IS NOT NULL 
       AND date_rappel < ? 
       AND statut != 'annulee'
       ORDER BY date_rappel ASC`,
      [projetId, today]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      calendrier_id: row.calendrier_id,
      animal_id: row.animal_id,
      lot_id: row.lot_id,
      vaccin: row.vaccin,
      nom_vaccin: row.nom_vaccin,
      date_vaccination: row.date_vaccination,
      date_rappel: row.date_rappel,
      numero_lot_vaccin: row.numero_lot_vaccin,
      veterinaire: row.veterinaire,
      cout: row.cout,
      statut: row.statut,
      effets_secondaires: row.effets_secondaires,
      notes: row.notes,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    }));
  }

  /**
   * Récupérer les vaccinations à venir (dans les 7 prochains jours)
   */
  async getVaccinationsAVenir(projetId: string, joursAvance: number = 7): Promise<Vaccination[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + joursAvance);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM vaccinations 
       WHERE projet_id = ? 
       AND date_rappel IS NOT NULL 
       AND date_rappel >= ? 
       AND date_rappel <= ?
       AND statut != 'annulee'
       ORDER BY date_rappel ASC`,
      [projetId, today, futureDateStr]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      calendrier_id: row.calendrier_id,
      animal_id: row.animal_id,
      lot_id: row.lot_id,
      vaccin: row.vaccin,
      nom_vaccin: row.nom_vaccin,
      date_vaccination: row.date_vaccination,
      date_rappel: row.date_rappel,
      numero_lot_vaccin: row.numero_lot_vaccin,
      veterinaire: row.veterinaire,
      cout: row.cout,
      statut: row.statut,
      effets_secondaires: row.effets_secondaires,
      notes: row.notes,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    }));
  }

  /**
   * Mettre à jour une vaccination
   */
  async updateVaccination(id: string, updates: Partial<CreateVaccinationInput>): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.calendrier_id !== undefined) {
      fields.push('calendrier_id = ?');
      values.push(updates.calendrier_id);
    }
    if (updates.animal_id !== undefined) {
      fields.push('animal_id = ?');
      values.push(updates.animal_id);
    }
    if (updates.lot_id !== undefined) {
      fields.push('lot_id = ?');
      values.push(updates.lot_id);
    }
    if (updates.vaccin !== undefined) {
      fields.push('vaccin = ?');
      values.push(updates.vaccin);
    }
    if (updates.nom_vaccin !== undefined) {
      fields.push('nom_vaccin = ?');
      values.push(updates.nom_vaccin);
    }
    if (updates.date_vaccination !== undefined) {
      fields.push('date_vaccination = ?');
      values.push(updates.date_vaccination);
    }
    if (updates.date_rappel !== undefined) {
      fields.push('date_rappel = ?');
      values.push(updates.date_rappel);
    }
    if (updates.numero_lot_vaccin !== undefined) {
      fields.push('numero_lot_vaccin = ?');
      values.push(updates.numero_lot_vaccin);
    }
    if (updates.veterinaire !== undefined) {
      fields.push('veterinaire = ?');
      values.push(updates.veterinaire);
    }
    if (updates.cout !== undefined) {
      fields.push('cout = ?');
      values.push(updates.cout);
    }
    if (updates.statut !== undefined) {
      fields.push('statut = ?');
      values.push(updates.statut);
    }
    if (updates.effets_secondaires !== undefined) {
      fields.push('effets_secondaires = ?');
      values.push(updates.effets_secondaires);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    if (fields.length === 0) return;

    fields.push('derniere_modification = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.runAsync(`UPDATE vaccinations SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  /**
   * Supprimer une vaccination
   */
  async deleteVaccination(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM vaccinations WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * MODULE SANTÉ - MALADIES
   * ============================================
   */

  /**
   * Créer une maladie
   */
  async createMaladie(input: CreateMaladieInput): Promise<Maladie> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO maladies (
        id, projet_id, animal_id, lot_id, type, nom_maladie, gravite,
        symptomes, date_debut, date_fin, gueri, contagieux, notes,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.projet_id,
        input.animal_id || null,
        input.lot_id || null,
        input.type,
        input.nom_maladie || null,
        input.gravite,
        input.symptomes || null,
        input.date_debut,
        input.date_fin || null,
        input.gueri ? 1 : 0,
        input.contagieux ? 1 : 0,
        input.notes || null,
        now,
        now,
      ]
    );

    return {
      id,
      projet_id: input.projet_id,
      animal_id: input.animal_id,
      lot_id: input.lot_id,
      type: input.type,
      nom_maladie: input.nom_maladie,
      gravite: input.gravite,
      symptomes: input.symptomes,
      date_debut: input.date_debut,
      date_fin: input.date_fin,
      gueri: input.gueri || false,
      contagieux: input.contagieux || false,
      notes: input.notes,
      date_creation: now,
      derniere_modification: now,
    };
  }

  /**
   * Récupérer toutes les maladies d'un projet
   */
  async getMaladiesByProjet(projetId: string): Promise<Maladie[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM maladies WHERE projet_id = ? ORDER BY date_debut DESC',
      [projetId]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      animal_id: row.animal_id || undefined,
      lot_id: row.lot_id || undefined,
      type: row.type,
      nom_maladie: row.nom_maladie || undefined,
      gravite: row.gravite,
      symptomes: row.symptomes || undefined,
      date_debut: row.date_debut,
      date_fin: row.date_fin || undefined,
      gueri: row.gueri === 1,
      contagieux: row.contagieux === 1,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    }));
  }

  /**
   * Récupérer une maladie par ID
   */
  async getMaladieById(id: string): Promise<Maladie | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const row = await this.db.getFirstAsync<any>('SELECT * FROM maladies WHERE id = ?', [id]);

    if (!row) return null;

    return {
      id: row.id,
      projet_id: row.projet_id,
      animal_id: row.animal_id || undefined,
      lot_id: row.lot_id || undefined,
      type: row.type,
      nom_maladie: row.nom_maladie || undefined,
      gravite: row.gravite,
      symptomes: row.symptomes || undefined,
      date_debut: row.date_debut,
      date_fin: row.date_fin || undefined,
      gueri: row.gueri === 1,
      contagieux: row.contagieux === 1,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  /**
   * Récupérer toutes les maladies d'un animal
   */
  async getMaladiesByAnimal(animalId: string): Promise<Maladie[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM maladies WHERE animal_id = ? ORDER BY date_debut DESC',
      [animalId]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      animal_id: row.animal_id || undefined,
      lot_id: row.lot_id || undefined,
      type: row.type,
      nom_maladie: row.nom_maladie || undefined,
      gravite: row.gravite,
      symptomes: row.symptomes || undefined,
      date_debut: row.date_debut,
      date_fin: row.date_fin || undefined,
      gueri: row.gueri === 1,
      contagieux: row.contagieux === 1,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    }));
  }

  /**
   * Récupérer les maladies en cours (non guéries)
   */
  async getMaladiesEnCours(projetId: string): Promise<Maladie[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM maladies WHERE projet_id = ? AND gueri = 0 ORDER BY date_debut DESC',
      [projetId]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      animal_id: row.animal_id || undefined,
      lot_id: row.lot_id || undefined,
      type: row.type,
      nom_maladie: row.nom_maladie || undefined,
      gravite: row.gravite,
      symptomes: row.symptomes || undefined,
      date_debut: row.date_debut,
      date_fin: row.date_fin || undefined,
      gueri: false,
      contagieux: row.contagieux === 1,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    }));
  }

  /**
   * Mettre à jour une maladie
   */
  async updateMaladie(id: string, updates: Partial<CreateMaladieInput>): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.animal_id !== undefined) {
      fields.push('animal_id = ?');
      values.push(updates.animal_id || null);
    }
    if (updates.lot_id !== undefined) {
      fields.push('lot_id = ?');
      values.push(updates.lot_id || null);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.nom_maladie !== undefined) {
      fields.push('nom_maladie = ?');
      values.push(updates.nom_maladie || null);
    }
    if (updates.gravite !== undefined) {
      fields.push('gravite = ?');
      values.push(updates.gravite);
    }
    if (updates.symptomes !== undefined) {
      fields.push('symptomes = ?');
      values.push(updates.symptomes || null);
    }
    if (updates.date_debut !== undefined) {
      fields.push('date_debut = ?');
      values.push(updates.date_debut);
    }
    if (updates.date_fin !== undefined) {
      fields.push('date_fin = ?');
      values.push(updates.date_fin || null);
    }
    if (updates.gueri !== undefined) {
      fields.push('gueri = ?');
      values.push(updates.gueri ? 1 : 0);
    }
    if (updates.contagieux !== undefined) {
      fields.push('contagieux = ?');
      values.push(updates.contagieux ? 1 : 0);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes || null);
    }

    if (fields.length === 0) return;

    fields.push('derniere_modification = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.runAsync(`UPDATE maladies SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  /**
   * Supprimer une maladie
   */
  async deleteMaladie(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Supprimer aussi les traitements associés
    await this.db.runAsync('DELETE FROM traitements WHERE maladie_id = ?', [id]);
    await this.db.runAsync('DELETE FROM maladies WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * MODULE SANTÉ - TRAITEMENTS
   * ============================================
   */

  /**
   * Créer un traitement
   */
  async createTraitement(input: CreateTraitementInput): Promise<Traitement> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO traitements (
        id, projet_id, maladie_id, animal_id, lot_id, medicament,
        dosage, frequence, voie_administration, date_debut, date_fin,
        duree_jours, temps_attente_abattage_jours, cout, efficacite,
        effets_secondaires, termine, notes, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.projet_id,
        input.maladie_id || null,
        input.animal_id || null,
        input.lot_id || null,
        input.medicament,
        input.dosage || null,
        input.frequence || null,
        input.voie_administration || null,
        input.date_debut,
        input.date_fin || null,
        input.duree_jours || null,
        input.temps_attente_abattage_jours || null,
        input.cout || null,
        input.efficacite || null,
        input.effets_secondaires || null,
        input.termine ? 1 : 0,
        input.notes || null,
        now,
        now,
      ]
    );

    return {
      id,
      projet_id: input.projet_id,
      maladie_id: input.maladie_id,
      animal_id: input.animal_id,
      lot_id: input.lot_id,
      medicament: input.medicament,
      dosage: input.dosage,
      frequence: input.frequence,
      voie_administration: input.voie_administration,
      date_debut: input.date_debut,
      date_fin: input.date_fin,
      duree_jours: input.duree_jours,
      temps_attente_abattage_jours: input.temps_attente_abattage_jours,
      cout: input.cout,
      efficacite: input.efficacite,
      effets_secondaires: input.effets_secondaires,
      termine: input.termine || false,
      notes: input.notes,
      date_creation: now,
      derniere_modification: now,
    };
  }

  /**
   * Récupérer tous les traitements d'un projet
   */
  async getTraitementsByProjet(projetId: string): Promise<Traitement[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM traitements WHERE projet_id = ? ORDER BY date_debut DESC',
      [projetId]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      maladie_id: row.maladie_id || undefined,
      animal_id: row.animal_id || undefined,
      lot_id: row.lot_id || undefined,
      medicament: row.medicament,
      dosage: row.dosage || undefined,
      frequence: row.frequence || undefined,
      voie_administration: row.voie_administration || undefined,
      date_debut: row.date_debut,
      date_fin: row.date_fin || undefined,
      duree_jours: row.duree_jours || undefined,
      temps_attente_abattage_jours: row.temps_attente_abattage_jours || undefined,
      cout: row.cout || undefined,
      efficacite: row.efficacite || undefined,
      effets_secondaires: row.effets_secondaires || undefined,
      termine: row.termine === 1,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    }));
  }

  /**
   * Récupérer un traitement par ID
   */
  async getTraitementById(id: string): Promise<Traitement | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const row = await this.db.getFirstAsync<any>('SELECT * FROM traitements WHERE id = ?', [id]);

    if (!row) return null;

    return {
      id: row.id,
      projet_id: row.projet_id,
      maladie_id: row.maladie_id || undefined,
      animal_id: row.animal_id || undefined,
      lot_id: row.lot_id || undefined,
      medicament: row.medicament,
      dosage: row.dosage || undefined,
      frequence: row.frequence || undefined,
      voie_administration: row.voie_administration || undefined,
      date_debut: row.date_debut,
      date_fin: row.date_fin || undefined,
      duree_jours: row.duree_jours || undefined,
      temps_attente_abattage_jours: row.temps_attente_abattage_jours || undefined,
      cout: row.cout || undefined,
      efficacite: row.efficacite || undefined,
      effets_secondaires: row.effets_secondaires || undefined,
      termine: row.termine === 1,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  /**
   * Récupérer les traitements d'une maladie
   */
  async getTraitementsByMaladie(maladieId: string): Promise<Traitement[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM traitements WHERE maladie_id = ? ORDER BY date_debut DESC',
      [maladieId]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      maladie_id: row.maladie_id || undefined,
      animal_id: row.animal_id || undefined,
      lot_id: row.lot_id || undefined,
      medicament: row.medicament,
      dosage: row.dosage || undefined,
      frequence: row.frequence || undefined,
      voie_administration: row.voie_administration || undefined,
      date_debut: row.date_debut,
      date_fin: row.date_fin || undefined,
      duree_jours: row.duree_jours || undefined,
      temps_attente_abattage_jours: row.temps_attente_abattage_jours || undefined,
      cout: row.cout || undefined,
      efficacite: row.efficacite || undefined,
      effets_secondaires: row.effets_secondaires || undefined,
      termine: row.termine === 1,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    }));
  }

  /**
   * Récupérer les traitements d'un animal
   */
  async getTraitementsByAnimal(animalId: string): Promise<Traitement[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM traitements WHERE animal_id = ? ORDER BY date_debut DESC',
      [animalId]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      maladie_id: row.maladie_id || undefined,
      animal_id: row.animal_id || undefined,
      lot_id: row.lot_id || undefined,
      medicament: row.medicament,
      dosage: row.dosage || undefined,
      frequence: row.frequence || undefined,
      voie_administration: row.voie_administration || undefined,
      date_debut: row.date_debut,
      date_fin: row.date_fin || undefined,
      duree_jours: row.duree_jours || undefined,
      temps_attente_abattage_jours: row.temps_attente_abattage_jours || undefined,
      cout: row.cout || undefined,
      efficacite: row.efficacite || undefined,
      effets_secondaires: row.effets_secondaires || undefined,
      termine: row.termine === 1,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    }));
  }

  /**
   * Récupérer les traitements en cours (non terminés)
   */
  async getTraitementsEnCours(projetId: string): Promise<Traitement[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM traitements WHERE projet_id = ? AND termine = 0 ORDER BY date_debut DESC',
      [projetId]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      maladie_id: row.maladie_id || undefined,
      animal_id: row.animal_id || undefined,
      lot_id: row.lot_id || undefined,
      medicament: row.medicament,
      dosage: row.dosage || undefined,
      frequence: row.frequence || undefined,
      voie_administration: row.voie_administration || undefined,
      date_debut: row.date_debut,
      date_fin: row.date_fin || undefined,
      duree_jours: row.duree_jours || undefined,
      temps_attente_abattage_jours: row.temps_attente_abattage_jours || undefined,
      cout: row.cout || undefined,
      efficacite: row.efficacite || undefined,
      effets_secondaires: row.effets_secondaires || undefined,
      termine: false,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    }));
  }

  /**
   * Mettre à jour un traitement
   */
  async updateTraitement(id: string, updates: Partial<CreateTraitementInput>): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.maladie_id !== undefined) {
      fields.push('maladie_id = ?');
      values.push(updates.maladie_id || null);
    }
    if (updates.animal_id !== undefined) {
      fields.push('animal_id = ?');
      values.push(updates.animal_id || null);
    }
    if (updates.lot_id !== undefined) {
      fields.push('lot_id = ?');
      values.push(updates.lot_id || null);
    }
    if (updates.medicament !== undefined) {
      fields.push('medicament = ?');
      values.push(updates.medicament);
    }
    if (updates.dosage !== undefined) {
      fields.push('dosage = ?');
      values.push(updates.dosage || null);
    }
    if (updates.frequence !== undefined) {
      fields.push('frequence = ?');
      values.push(updates.frequence || null);
    }
    if (updates.voie_administration !== undefined) {
      fields.push('voie_administration = ?');
      values.push(updates.voie_administration || null);
    }
    if (updates.date_debut !== undefined) {
      fields.push('date_debut = ?');
      values.push(updates.date_debut);
    }
    if (updates.date_fin !== undefined) {
      fields.push('date_fin = ?');
      values.push(updates.date_fin || null);
    }
    if (updates.duree_jours !== undefined) {
      fields.push('duree_jours = ?');
      values.push(updates.duree_jours || null);
    }
    if (updates.temps_attente_abattage_jours !== undefined) {
      fields.push('temps_attente_abattage_jours = ?');
      values.push(updates.temps_attente_abattage_jours || null);
    }
    if (updates.cout !== undefined) {
      fields.push('cout = ?');
      values.push(updates.cout || null);
    }
    if (updates.efficacite !== undefined) {
      fields.push('efficacite = ?');
      values.push(updates.efficacite || null);
    }
    if (updates.effets_secondaires !== undefined) {
      fields.push('effets_secondaires = ?');
      values.push(updates.effets_secondaires || null);
    }
    if (updates.termine !== undefined) {
      fields.push('termine = ?');
      values.push(updates.termine ? 1 : 0);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes || null);
    }

    if (fields.length === 0) return;

    fields.push('derniere_modification = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.runAsync(`UPDATE traitements SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  /**
   * Supprimer un traitement
   */
  async deleteTraitement(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM traitements WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * MODULE SANTÉ - VISITES VÉTÉRINAIRES
   * ============================================
   */

  /**
   * Créer une visite vétérinaire
   */
  async createVisiteVeterinaire(input: CreateVisiteVeterinaireInput): Promise<VisiteVeterinaire> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO visites_veterinaires (
        id, projet_id, date_visite, motif, veterinaire, diagnostic,
        prescriptions, cout, animaux_examines, prochaine_visite_prevue,
        notes, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.projet_id,
        input.date_visite,
        input.motif,
        input.veterinaire || null,
        input.diagnostic || null,
        input.prescriptions || null,
        input.cout || null,
        input.animaux_examines ? JSON.stringify(input.animaux_examines) : null,
        input.prochaine_visite_prevue || null,
        input.notes || null,
        now,
        now,
      ]
    );

    return {
      id,
      projet_id: input.projet_id,
      date_visite: input.date_visite,
      motif: input.motif,
      veterinaire: input.veterinaire,
      diagnostic: input.diagnostic,
      prescriptions: input.prescriptions,
      cout: input.cout,
      animaux_examines: input.animaux_examines,
      prochaine_visite_prevue: input.prochaine_visite_prevue,
      notes: input.notes,
      date_creation: now,
      derniere_modification: now,
    };
  }

  /**
   * Récupérer toutes les visites vétérinaires d'un projet
   */
  async getVisitesVeterinairesByProjet(projetId: string): Promise<VisiteVeterinaire[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM visites_veterinaires WHERE projet_id = ? ORDER BY date_visite DESC',
      [projetId]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      date_visite: row.date_visite,
      motif: row.motif,
      veterinaire: row.veterinaire || undefined,
      diagnostic: row.diagnostic || undefined,
      prescriptions: row.prescriptions || undefined,
      cout: row.cout || undefined,
      animaux_examines: row.animaux_examines ? JSON.parse(row.animaux_examines) : undefined,
      prochaine_visite_prevue: row.prochaine_visite_prevue || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    }));
  }

  /**
   * Récupérer une visite vétérinaire par ID
   */
  async getVisiteVeterinaireById(id: string): Promise<VisiteVeterinaire | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM visites_veterinaires WHERE id = ?',
      [id]
    );

    if (!row) return null;

    return {
      id: row.id,
      projet_id: row.projet_id,
      date_visite: row.date_visite,
      motif: row.motif,
      veterinaire: row.veterinaire || undefined,
      diagnostic: row.diagnostic || undefined,
      prescriptions: row.prescriptions || undefined,
      cout: row.cout || undefined,
      animaux_examines: row.animaux_examines ? JSON.parse(row.animaux_examines) : undefined,
      prochaine_visite_prevue: row.prochaine_visite_prevue || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  /**
   * Récupérer la prochaine visite prévue
   */
  async getProchainVisitePrevue(projetId: string): Promise<VisiteVeterinaire | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM visites_veterinaires 
       WHERE projet_id = ? AND prochaine_visite_prevue IS NOT NULL AND prochaine_visite_prevue > ?
       ORDER BY prochaine_visite_prevue ASC LIMIT 1`,
      [projetId, new Date().toISOString()]
    );

    if (!row) return null;

    return {
      id: row.id,
      projet_id: row.projet_id,
      date_visite: row.date_visite,
      motif: row.motif,
      veterinaire: row.veterinaire || undefined,
      diagnostic: row.diagnostic || undefined,
      prescriptions: row.prescriptions || undefined,
      cout: row.cout || undefined,
      animaux_examines: row.animaux_examines ? JSON.parse(row.animaux_examines) : undefined,
      prochaine_visite_prevue: row.prochaine_visite_prevue || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  /**
   * Mettre à jour une visite vétérinaire
   */
  async updateVisiteVeterinaire(
    id: string,
    updates: Partial<CreateVisiteVeterinaireInput>
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.date_visite !== undefined) {
      fields.push('date_visite = ?');
      values.push(updates.date_visite);
    }
    if (updates.motif !== undefined) {
      fields.push('motif = ?');
      values.push(updates.motif);
    }
    if (updates.veterinaire !== undefined) {
      fields.push('veterinaire = ?');
      values.push(updates.veterinaire || null);
    }
    if (updates.diagnostic !== undefined) {
      fields.push('diagnostic = ?');
      values.push(updates.diagnostic || null);
    }
    if (updates.prescriptions !== undefined) {
      fields.push('prescriptions = ?');
      values.push(updates.prescriptions || null);
    }
    if (updates.cout !== undefined) {
      fields.push('cout = ?');
      values.push(updates.cout || null);
    }
    if (updates.animaux_examines !== undefined) {
      fields.push('animaux_examines = ?');
      values.push(updates.animaux_examines ? JSON.stringify(updates.animaux_examines) : null);
    }
    if (updates.prochaine_visite_prevue !== undefined) {
      fields.push('prochaine_visite_prevue = ?');
      values.push(updates.prochaine_visite_prevue || null);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes || null);
    }

    if (fields.length === 0) return;

    fields.push('derniere_modification = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.runAsync(
      `UPDATE visites_veterinaires SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Supprimer une visite vétérinaire
   */
  async deleteVisiteVeterinaire(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM visites_veterinaires WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * MODULE SANTÉ - RAPPELS VACCINATIONS
   * ============================================
   */

  /**
   * Créer un rappel de vaccination (automatique lors d'une vaccination)
   */
  async createRappelVaccination(input: CreateRappelVaccinationInput): Promise<RappelVaccination> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = uuid.v4() as string;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO rappels_vaccinations (
        id, projet_id, vaccination_id, date_rappel, statut_envoi,
        date_envoi, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.projet_id,
        input.vaccination_id,
        input.date_rappel,
        input.statut_envoi || 'en_attente',
        input.date_envoi || null,
        now,
      ]
    );

    return {
      id,
      projet_id: input.projet_id,
      vaccination_id: input.vaccination_id,
      date_rappel: input.date_rappel,
      statut_envoi: input.statut_envoi || 'en_attente',
      date_envoi: input.date_envoi,
      date_creation: now,
    };
  }

  /**
   * Récupérer tous les rappels d'un projet
   */
  async getRappelsByProjet(projetId: string): Promise<RappelVaccination[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM rappels_vaccinations WHERE projet_id = ? ORDER BY date_rappel ASC',
      [projetId]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      vaccination_id: row.vaccination_id,
      date_rappel: row.date_rappel,
      statut_envoi: row.statut_envoi,
      date_envoi: row.date_envoi || undefined,
      date_creation: row.date_creation,
    }));
  }

  /**
   * Récupérer les rappels à venir (dans les X jours)
   */
  async getRappelsAVenir(projetId: string, joursAvance: number = 7): Promise<RappelVaccination[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const now = new Date();
    const dateMax = new Date(now.getTime() + joursAvance * 24 * 60 * 60 * 1000);

    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM rappels_vaccinations 
       WHERE projet_id = ? AND date_rappel BETWEEN ? AND ? AND statut_envoi = 'en_attente'
       ORDER BY date_rappel ASC`,
      [projetId, now.toISOString(), dateMax.toISOString()]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      vaccination_id: row.vaccination_id,
      date_rappel: row.date_rappel,
      statut_envoi: row.statut_envoi,
      date_envoi: row.date_envoi || undefined,
      date_creation: row.date_creation,
    }));
  }

  /**
   * Récupérer les rappels en retard
   */
  async getRappelsEnRetard(projetId: string): Promise<RappelVaccination[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const now = new Date().toISOString();

    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM rappels_vaccinations 
       WHERE projet_id = ? AND date_rappel < ? AND statut_envoi = 'en_attente'
       ORDER BY date_rappel ASC`,
      [projetId, now]
    );

    return rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      vaccination_id: row.vaccination_id,
      date_rappel: row.date_rappel,
      statut_envoi: row.statut_envoi,
      date_envoi: row.date_envoi || undefined,
      date_creation: row.date_creation,
    }));
  }

  /**
   * Marquer un rappel comme envoyé
   */
  async marquerRappelEnvoye(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync(
      `UPDATE rappels_vaccinations SET statut_envoi = 'envoye', date_envoi = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
  }

  /**
   * ============================================
   * MODULE SANTÉ - STATISTIQUES ET RAPPORTS
   * ============================================
   */

  /**
   * Obtenir les statistiques de vaccinations
   */
  async getStatistiquesVaccinations(projetId: string): Promise<{
    total: number;
    effectuees: number;
    enAttente: number;
    enRetard: number;
    tauxCouverture: number;
    coutTotal: number;
  }> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const total = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM vaccinations WHERE projet_id = ?',
      [projetId]
    );

    const effectuees = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM vaccinations WHERE projet_id = ? AND statut = 'effectuee'",
      [projetId]
    );

    const enAttente = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM vaccinations WHERE projet_id = ? AND statut = 'planifiee'",
      [projetId]
    );

    const now = new Date().toISOString();
    const enRetard = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM vaccinations 
       WHERE projet_id = ? AND statut = 'planifiee' AND date_vaccination < ?`,
      [projetId, now]
    );

    const cout = await this.db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(cout), 0) as total FROM vaccinations WHERE projet_id = ?',
      [projetId]
    );

    return {
      total: total?.count || 0,
      effectuees: effectuees?.count || 0,
      enAttente: enAttente?.count || 0,
      enRetard: enRetard?.count || 0,
      tauxCouverture: total?.count ? ((effectuees?.count || 0) / total.count) * 100 : 0,
      coutTotal: cout?.total || 0,
    };
  }

  /**
   * Obtenir les statistiques de maladies
   */
  async getStatistiquesMaladies(projetId: string): Promise<{
    total: number;
    enCours: number;
    gueries: number;
    parType: { [key: string]: number };
    parGravite: { [key: string]: number };
    tauxGuerison: number;
  }> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const total = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM maladies WHERE projet_id = ?',
      [projetId]
    );

    const enCours = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM maladies WHERE projet_id = ? AND gueri = 0',
      [projetId]
    );

    const gueries = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM maladies WHERE projet_id = ? AND gueri = 1',
      [projetId]
    );

    const parType = await this.db.getAllAsync<{ type: string; count: number }>(
      'SELECT type, COUNT(*) as count FROM maladies WHERE projet_id = ? GROUP BY type',
      [projetId]
    );

    const parGravite = await this.db.getAllAsync<{ gravite: string; count: number }>(
      'SELECT gravite, COUNT(*) as count FROM maladies WHERE projet_id = ? GROUP BY gravite',
      [projetId]
    );

    return {
      total: total?.count || 0,
      enCours: enCours?.count || 0,
      gueries: gueries?.count || 0,
      parType: parType.reduce((acc, item) => ({ ...acc, [item.type]: item.count }), {}),
      parGravite: parGravite.reduce((acc, item) => ({ ...acc, [item.gravite]: item.count }), {}),
      tauxGuerison: total?.count ? ((gueries?.count || 0) / total.count) * 100 : 0,
    };
  }

  /**
   * Obtenir les statistiques de traitements
   */
  async getStatistiquesTraitements(projetId: string): Promise<{
    total: number;
    enCours: number;
    termines: number;
    coutTotal: number;
    efficaciteMoyenne: number;
  }> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const total = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM traitements WHERE projet_id = ?',
      [projetId]
    );

    const enCours = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM traitements WHERE projet_id = ? AND termine = 0',
      [projetId]
    );

    const termines = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM traitements WHERE projet_id = ? AND termine = 1',
      [projetId]
    );

    const cout = await this.db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(cout), 0) as total FROM traitements WHERE projet_id = ?',
      [projetId]
    );

    const efficacite = await this.db.getFirstAsync<{ avg: number }>(
      'SELECT COALESCE(AVG(efficacite), 0) as avg FROM traitements WHERE projet_id = ? AND efficacite IS NOT NULL',
      [projetId]
    );

    return {
      total: total?.count || 0,
      enCours: enCours?.count || 0,
      termines: termines?.count || 0,
      coutTotal: cout?.total || 0,
      efficaciteMoyenne: efficacite?.avg || 0,
    };
  }

  /**
   * Obtenir les coûts vétérinaires totaux
   */
  async getCoutsVeterinaires(projetId: string): Promise<{
    vaccinations: number;
    traitements: number;
    visites: number;
    total: number;
  }> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const coutVaccinations = await this.db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(cout), 0) as total FROM vaccinations WHERE projet_id = ?',
      [projetId]
    );

    const coutTraitements = await this.db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(cout), 0) as total FROM traitements WHERE projet_id = ?',
      [projetId]
    );

    const coutVisites = await this.db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(cout), 0) as total FROM visites_veterinaires WHERE projet_id = ?',
      [projetId]
    );

    const totalVaccinations = coutVaccinations?.total || 0;
    const totalTraitements = coutTraitements?.total || 0;
    const totalVisites = coutVisites?.total || 0;

    return {
      vaccinations: totalVaccinations,
      traitements: totalTraitements,
      visites: totalVisites,
      total: totalVaccinations + totalTraitements + totalVisites,
    };
  }

  /**
   * Obtenir le taux de mortalité par cause
   */
  async getTauxMortaliteParCause(projetId: string): Promise<
    Array<{
      cause: string;
      nombre: number;
      pourcentage: number;
    }>
  > {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const total = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM mortalites WHERE projet_id = ?',
      [projetId]
    );

    const parCause = await this.db.getAllAsync<{ cause: string; count: number }>(
      'SELECT cause, COUNT(*) as count FROM mortalites WHERE projet_id = ? GROUP BY cause ORDER BY count DESC',
      [projetId]
    );

    return parCause.map((item) => ({
      cause: item.cause,
      nombre: item.count,
      pourcentage: total?.count ? (item.count / total.count) * 100 : 0,
    }));
  }

  /**
   * Obtenir des recommandations sanitaires basées sur l'historique
   */
  async getRecommandationsSanitaires(projetId: string): Promise<
    Array<{
      type: 'vaccination' | 'traitement' | 'visite' | 'alerte';
      priorite: 'haute' | 'moyenne' | 'basse';
      message: string;
      data?: any;
    }>
  > {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const recommendations: Array<{
      type: 'vaccination' | 'traitement' | 'visite' | 'alerte';
      priorite: 'haute' | 'moyenne' | 'basse';
      message: string;
      data?: any;
    }> = [];

    // Vérifier les rappels en retard
    const rappelsEnRetard = await this.getRappelsEnRetard(projetId);
    if (rappelsEnRetard.length > 0) {
      recommendations.push({
        type: 'vaccination',
        priorite: 'haute',
        message: `${rappelsEnRetard.length} rappel(s) de vaccination en retard`,
        data: { rappels: rappelsEnRetard },
      });
    }

    // Vérifier les rappels à venir
    const rappelsAVenir = await this.getRappelsAVenir(projetId, 7);
    if (rappelsAVenir.length > 0) {
      recommendations.push({
        type: 'vaccination',
        priorite: 'moyenne',
        message: `${rappelsAVenir.length} vaccination(s) prévue(s) cette semaine`,
        data: { rappels: rappelsAVenir },
      });
    }

    // Vérifier les maladies en cours
    const maladiesEnCours = await this.getMaladiesEnCours(projetId);
    if (maladiesEnCours.length > 0) {
      const critiques = maladiesEnCours.filter((m) => m.gravite === 'critique');
      if (critiques.length > 0) {
        recommendations.push({
          type: 'alerte',
          priorite: 'haute',
          message: `${critiques.length} maladie(s) critique(s) en cours`,
          data: { maladies: critiques },
        });
      }
    }

    // Vérifier les traitements en cours
    const traitementsEnCours = await this.getTraitementsEnCours(projetId);
    if (traitementsEnCours.length > 0) {
      recommendations.push({
        type: 'traitement',
        priorite: 'moyenne',
        message: `${traitementsEnCours.length} traitement(s) en cours`,
        data: { traitements: traitementsEnCours },
      });
    }

    // Vérifier si une visite vétérinaire est prévue
    const prochaineVisite = await this.getProchainVisitePrevue(projetId);
    if (prochaineVisite) {
      recommendations.push({
        type: 'visite',
        priorite: 'basse',
        message: `Visite vétérinaire prévue le ${new Date(prochaineVisite.prochaine_visite_prevue!).toLocaleDateString()}`,
        data: { visite: prochaineVisite },
      });
    }

    return recommendations;
  }

  /**
   * Obtenir les alertes sanitaires urgentes
   */
  async getAlertesSanitaires(projetId: string): Promise<
    Array<{
      type: 'rappel_retard' | 'maladie_critique' | 'epidemie' | 'mortalite_elevee';
      gravite: 'critique' | 'elevee' | 'moyenne';
      message: string;
      date: string;
      data?: any;
    }>
  > {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const alertes: Array<{
      type: 'rappel_retard' | 'maladie_critique' | 'epidemie' | 'mortalite_elevee';
      gravite: 'critique' | 'elevee' | 'moyenne';
      message: string;
      date: string;
      data?: any;
    }> = [];

    // Rappels en retard
    const rappelsEnRetard = await this.getRappelsEnRetard(projetId);
    if (rappelsEnRetard.length > 0) {
      alertes.push({
        type: 'rappel_retard',
        gravite: 'elevee',
        message: `${rappelsEnRetard.length} rappel(s) de vaccination en retard`,
        date: new Date().toISOString(),
        data: { rappels: rappelsEnRetard },
      });
    }

    // Maladies critiques
    const maladiesCritiques = await this.db.getAllAsync<any>(
      "SELECT * FROM maladies WHERE projet_id = ? AND gravite = 'critique' AND gueri = 0",
      [projetId]
    );
    if (maladiesCritiques.length > 0) {
      alertes.push({
        type: 'maladie_critique',
        gravite: 'critique',
        message: `${maladiesCritiques.length} maladie(s) critique(s) nécessitant une attention immédiate`,
        date: new Date().toISOString(),
        data: { maladies: maladiesCritiques },
      });
    }

    // Détection d'épidémie (maladies contagieuses multiples)
    const maladiesContagieuses = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM maladies WHERE projet_id = ? AND contagieux = 1 AND gueri = 0',
      [projetId]
    );
    if (maladiesContagieuses && maladiesContagieuses.count >= 3) {
      alertes.push({
        type: 'epidemie',
        gravite: 'critique',
        message: `Risque d'épidémie détecté : ${maladiesContagieuses.count} cas de maladies contagieuses actives`,
        date: new Date().toISOString(),
        data: { nombre: maladiesContagieuses.count },
      });
    }

    // Mortalité élevée (derniers 30 jours)
    const date30JoursAvant = new Date();
    date30JoursAvant.setDate(date30JoursAvant.getDate() - 30);
    const mortalitesRecentes = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM mortalites WHERE projet_id = ? AND date > ?',
      [projetId, date30JoursAvant.toISOString()]
    );
    if (mortalitesRecentes && mortalitesRecentes.count >= 5) {
      alertes.push({
        type: 'mortalite_elevee',
        gravite: 'elevee',
        message: `Taux de mortalité élevé : ${mortalitesRecentes.count} décès dans les 30 derniers jours`,
        date: new Date().toISOString(),
        data: { nombre: mortalitesRecentes.count },
      });
    }

    return alertes;
  }

  /**
   * Obtenir l'historique médical complet d'un animal
   */
  async getHistoriqueMedicalAnimal(animalId: string): Promise<{
    vaccinations: Vaccination[];
    maladies: Maladie[];
    traitements: Traitement[];
    visites: VisiteVeterinaire[];
  }> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const vaccinations = await this.getVaccinationsByAnimal(animalId);
    const maladies = await this.getMaladiesByAnimal(animalId);
    const traitements = await this.getTraitementsByAnimal(animalId);

    // Récupérer les visites vétérinaires qui ont examiné cet animal
    const visites = await this.db.getAllAsync<any>(
      `SELECT * FROM visites_veterinaires 
       WHERE animaux_examines LIKE ?
       ORDER BY date_visite DESC`,
      [`%${animalId}%`]
    );

    return {
      vaccinations,
      maladies,
      traitements,
      visites: visites.map((row) => ({
        id: row.id,
        projet_id: row.projet_id,
        date_visite: row.date_visite,
        motif: row.motif,
        veterinaire: row.veterinaire || undefined,
        diagnostic: row.diagnostic || undefined,
        prescriptions: row.prescriptions || undefined,
        cout: row.cout || undefined,
        animaux_examines: row.animaux_examines ? JSON.parse(row.animaux_examines) : undefined,
        prochaine_visite_prevue: row.prochaine_visite_prevue || undefined,
        notes: row.notes || undefined,
        date_creation: row.date_creation,
        derniere_modification: row.derniere_modification,
      })),
    };
  }

  /**
   * Obtenir les animaux avec temps d'attente actif (avant abattage)
   */
  async getAnimauxTempsAttente(projetId: string): Promise<
    Array<{
      animal_id: string;
      traitement: Traitement;
      date_fin_attente: string;
      jours_restants: number;
    }>
  > {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const now = new Date();

    const traitements = await this.db.getAllAsync<any>(
      `SELECT * FROM traitements 
       WHERE projet_id = ? 
       AND temps_attente_abattage_jours IS NOT NULL 
       AND animal_id IS NOT NULL
       ORDER BY date_debut DESC`,
      [projetId]
    );

    const animauxAvecAttente: Array<{
      animal_id: string;
      traitement: Traitement;
      date_fin_attente: string;
      jours_restants: number;
    }> = [];

    for (const row of traitements) {
      const dateDebut = new Date(row.date_debut);
      const tempsAttente = row.temps_attente_abattage_jours;
      const dateFinAttente = new Date(dateDebut.getTime() + tempsAttente * 24 * 60 * 60 * 1000);

      // Vérifier si le temps d'attente est toujours actif
      if (dateFinAttente > now) {
        const joursRestants = Math.ceil(
          (dateFinAttente.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        animauxAvecAttente.push({
          animal_id: row.animal_id,
          traitement: {
            id: row.id,
            projet_id: row.projet_id,
            maladie_id: row.maladie_id || undefined,
            animal_id: row.animal_id || undefined,
            lot_id: row.lot_id || undefined,
            medicament: row.medicament,
            dosage: row.dosage || undefined,
            frequence: row.frequence || undefined,
            voie_administration: row.voie_administration || undefined,
            date_debut: row.date_debut,
            date_fin: row.date_fin || undefined,
            duree_jours: row.duree_jours || undefined,
            temps_attente_abattage_jours: row.temps_attente_abattage_jours || undefined,
            cout: row.cout || undefined,
            efficacite: row.efficacite || undefined,
            effets_secondaires: row.effets_secondaires || undefined,
            termine: row.termine === 1,
            notes: row.notes || undefined,
            date_creation: row.date_creation,
            derniere_modification: row.derniere_modification,
          },
          date_fin_attente: dateFinAttente.toISOString(),
          jours_restants: joursRestants,
        });
      }
    }

    return animauxAvecAttente;
  }

  /**
   * Obtenir les coûts vétérinaires sur une période donnée
   */
  async getCoutsVeterinairesPeriode(
    projetId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<{
    vaccinations: number;
    traitements: number;
    visites: number;
    total: number;
    details: {
      vaccinations: Vaccination[];
      traitements: Traitement[];
      visites: VisiteVeterinaire[];
    };
  }> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Vaccinations
    const vaccinations = await this.db.getAllAsync<any>(
      `SELECT * FROM vaccinations 
       WHERE projet_id = ? AND date_vaccination BETWEEN ? AND ? AND cout IS NOT NULL`,
      [projetId, dateDebut, dateFin]
    );

    // Traitements
    const traitements = await this.db.getAllAsync<any>(
      `SELECT * FROM traitements 
       WHERE projet_id = ? AND date_debut BETWEEN ? AND ? AND cout IS NOT NULL`,
      [projetId, dateDebut, dateFin]
    );

    // Visites
    const visites = await this.db.getAllAsync<any>(
      `SELECT * FROM visites_veterinaires 
       WHERE projet_id = ? AND date_visite BETWEEN ? AND ? AND cout IS NOT NULL`,
      [projetId, dateDebut, dateFin]
    );

    const coutVaccinations = vaccinations.reduce((sum, v) => sum + (v.cout || 0), 0);
    const coutTraitements = traitements.reduce((sum, t) => sum + (t.cout || 0), 0);
    const coutVisites = visites.reduce((sum, v) => sum + (v.cout || 0), 0);

    return {
      vaccinations: coutVaccinations,
      traitements: coutTraitements,
      visites: coutVisites,
      total: coutVaccinations + coutTraitements + coutVisites,
      details: {
        vaccinations: vaccinations.map((row) => ({
          id: row.id,
          projet_id: row.projet_id,
          calendrier_id: row.calendrier_id || undefined,
          animal_id: row.animal_id || undefined,
          lot_id: row.lot_id || undefined,
          vaccin: row.vaccin,
          nom_vaccin: row.nom_vaccin || undefined,
          date_vaccination: row.date_vaccination,
          date_rappel: row.date_rappel || undefined,
          numero_lot_vaccin: row.numero_lot_vaccin || undefined,
          veterinaire: row.veterinaire || undefined,
          cout: row.cout || undefined,
          statut: row.statut,
          effets_secondaires: row.effets_secondaires || undefined,
          notes: row.notes || undefined,
          date_creation: row.date_creation,
          derniere_modification: row.derniere_modification,
        })),
        traitements: traitements.map((row) => ({
          id: row.id,
          projet_id: row.projet_id,
          maladie_id: row.maladie_id || undefined,
          animal_id: row.animal_id || undefined,
          lot_id: row.lot_id || undefined,
          medicament: row.medicament,
          dosage: row.dosage || undefined,
          frequence: row.frequence || undefined,
          voie_administration: row.voie_administration || undefined,
          date_debut: row.date_debut,
          date_fin: row.date_fin || undefined,
          duree_jours: row.duree_jours || undefined,
          temps_attente_abattage_jours: row.temps_attente_abattage_jours || undefined,
          cout: row.cout || undefined,
          efficacite: row.efficacite || undefined,
          effets_secondaires: row.effets_secondaires || undefined,
          termine: row.termine === 1,
          notes: row.notes || undefined,
          date_creation: row.date_creation,
          derniere_modification: row.derniere_modification,
        })),
        visites: visites.map((row) => ({
          id: row.id,
          projet_id: row.projet_id,
          date_visite: row.date_visite,
          motif: row.motif,
          veterinaire: row.veterinaire || undefined,
          diagnostic: row.diagnostic || undefined,
          prescriptions: row.prescriptions || undefined,
          cout: row.cout || undefined,
          animaux_examines: row.animaux_examines ? JSON.parse(row.animaux_examines) : undefined,
          prochaine_visite_prevue: row.prochaine_visite_prevue || undefined,
          notes: row.notes || undefined,
          date_creation: row.date_creation,
          derniere_modification: row.derniere_modification,
        })),
      },
    };
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
    console.log('📋 Utilisateur récupéré:', {
      id: createdUser.id,
      email: createdUser.email,
      telephone: createdUser.telephone,
    });
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
      const allEmails = await this.db.getAllAsync<any>(
        'SELECT email FROM users WHERE email IS NOT NULL'
      );
      console.log(
        '📋 Emails dans la base:',
        allEmails.map((e) => e.email)
      );
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
   * Retourne null si l'utilisateur n'existe pas au lieu de lancer une erreur
   */
  async getUserById(id: string): Promise<User | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    if (!id) {
      return null;
    }

    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [id]
    );

    if (!row) {
      return null;
    }

    return this.mapRowToUser(row);
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(
    id: string,
    updates: {
      nom?: string;
      prenom?: string;
      email?: string;
      telephone?: string;
      photo?: string;
    }
  ): Promise<User> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.nom !== undefined) {
      fields.push('nom = ?');
      values.push(updates.nom);
    }
    if (updates.prenom !== undefined) {
      fields.push('prenom = ?');
      values.push(updates.prenom);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.telephone !== undefined) {
      fields.push('telephone = ?');
      values.push(updates.telephone);
    }
    if (updates.photo !== undefined) {
      fields.push('photo = ?');
      values.push(updates.photo);
    }
    /* DÉSACTIVÉ - profil_type
    if (updates.profil_type !== undefined) {
      fields.push('profil_type = ?');
      values.push(updates.profil_type);
    }
    if (updates.localite_exercice !== undefined) {
      fields.push('localite_exercice = ?');
      values.push(updates.localite_exercice);
    }
    if (updates.photo_piece_identite !== undefined) {
      fields.push('photo_piece_identite = ?');
      values.push(updates.photo_piece_identite);
    }
    if (updates.photo_diplome_veterinaire !== undefined) {
      fields.push('photo_diplome_veterinaire = ?');
      values.push(updates.photo_diplome_veterinaire);
    }
    */ // FIN DÉSACTIVATION profil_type

    if (fields.length === 0) {
      throw new Error('Aucun champ à mettre à jour');
    }

    values.push(id);

    await this.db.runAsync(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const updatedUser = await this.getUserById(id);
    if (!updatedUser) {
      throw new Error('Utilisateur non trouvé après mise à jour');
    }
    return updatedUser;
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
      const allUsers = await this.db.getAllAsync<any>(
        'SELECT id, email, telephone FROM users WHERE is_active = 1'
      );
      console.log(
        '📋 Utilisateurs actifs dans la base:',
        allUsers.map((u) => ({ id: u.id, email: u.email, telephone: u.telephone }))
      );
      return null;
    }

    console.log('✅ Utilisateur trouvé:', user.id, user.email || user.telephone);

    // Mettre à jour la dernière connexion
    await this.db.runAsync('UPDATE users SET derniere_connexion = ? WHERE id = ?', [
      new Date().toISOString(),
      user.id,
    ]);

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

  async createProjet(
    projet: Omit<Projet, 'id' | 'date_creation' | 'derniere_modification'>
  ): Promise<Projet> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `projet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;

    await this.db.runAsync(
      `INSERT INTO projets (
        id, nom, localisation, nombre_truies, nombre_verrats, nombre_porcelets,
        poids_moyen_actuel, age_moyen_actuel, prix_kg_vif, prix_kg_carcasse, notes, statut, proprietaire_id,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        projet.nom,
        projet.localisation,
        projet.nombre_truies,
        projet.nombre_verrats,
        projet.nombre_porcelets,
        projet.poids_moyen_actuel,
        projet.age_moyen_actuel,
        projet.prix_kg_vif || null,
        projet.prix_kg_carcasse || null,
        projet.notes || null,
        projet.statut,
        projet.proprietaire_id,
        date_creation,
        derniere_modification,
      ]
    );

    const projetCree = await this.getProjetById(id);

    // Créer automatiquement les animaux dans le cheptel
    if (
      projetCree.nombre_truies > 0 ||
      projetCree.nombre_verrats > 0 ||
      projetCree.nombre_porcelets > 0
    ) {
      await this.createAnimauxInitials(projetCree.id, {
        nombre_truies: projetCree.nombre_truies,
        nombre_verrats: projetCree.nombre_verrats,
        nombre_porcelets: projetCree.nombre_porcelets,
      });
    }

    return projetCree;
  }

  /**
   * Crée automatiquement les animaux initiaux lors de la création d'un projet
   */
  private async createAnimauxInitials(
    projetId: string,
    effectifs: { nombre_truies: number; nombre_verrats: number; nombre_porcelets: number }
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Récupérer les codes existants pour éviter les doublons
    const animauxExistants = await this.getProductionAnimaux(projetId, true);
    const codesExistants = new Set(animauxExistants.map((a) => a.code.toUpperCase()));

    // Récupérer les noms déjà utilisés pour générer des noms uniques
    const nomsDejaUtilises = animauxExistants
      .map((a) => a.nom)
      .filter((nom): nom is string => nom !== undefined && nom !== null && nom !== '');

    // Fonction helper pour générer un code unique
    const generateUniqueCode = (prefix: string, count: number): string => {
      let num = count;
      let code = `${prefix}${String(num).padStart(3, '0')}`;

      // Si le code existe déjà, incrémenter jusqu'à trouver un code libre
      while (codesExistants.has(code.toUpperCase())) {
        num++;
        code = `${prefix}${String(num).padStart(3, '0')}`;
      }

      codesExistants.add(code.toUpperCase());
      return code;
    };

    let truieCount = 0;
    let verratCount = 0;
    let porceletCount = 0;

    // Compter les animaux existants par type pour la numérotation
    animauxExistants.forEach((animal) => {
      const codeUpper = animal.code.toUpperCase();
      if (codeUpper.startsWith('T')) {
        const num = parseInt(codeUpper.substring(1));
        if (!isNaN(num) && num > truieCount) truieCount = num;
      } else if (codeUpper.startsWith('V')) {
        const num = parseInt(codeUpper.substring(1));
        if (!isNaN(num) && num > verratCount) verratCount = num;
      } else if (codeUpper.startsWith('P')) {
        const num = parseInt(codeUpper.substring(1));
        if (!isNaN(num) && num > porceletCount) porceletCount = num;
      }
    });

    // Générer des noms uniques séparément par genre pour éviter les noms féminins aux verrats
    const nomsFeminins = genererPlusieursNomsAleatoires(
      effectifs.nombre_truies,
      nomsDejaUtilises,
      'tous',
      'femelle'
    );
    const nomsMasculins = genererPlusieursNomsAleatoires(
      effectifs.nombre_verrats,
      [...nomsDejaUtilises, ...nomsFeminins], // Éviter les doublons avec les truies
      'tous',
      'male'
    );
    const nomsPorcelets = genererPlusieursNomsAleatoires(
      effectifs.nombre_porcelets,
      [...nomsDejaUtilises, ...nomsFeminins, ...nomsMasculins], // Éviter les doublons
      'tous',
      'indetermine'
    );

    let nomFemininIndex = 0;
    let nomMasculinIndex = 0;
    let nomPorceletIndex = 0;

    // Créer les truies
    for (let i = 0; i < effectifs.nombre_truies; i++) {
      truieCount++;
      const code = generateUniqueCode('T', truieCount);
      const nom = nomsFeminins[nomFemininIndex++];

      await this.createProductionAnimal({
        projet_id: projetId,
        code,
        nom,
        sexe: 'femelle',
        reproducteur: true,
        statut: 'actif',
        date_naissance: undefined,
        poids_initial: undefined,
        date_entree: undefined,
        race: undefined,
        origine: undefined,
        notes: "Créé lors de l'initialisation du projet",
        pere_id: null, // Inconnu par défaut, modifiable par l'utilisateur
        mere_id: null, // Inconnu par défaut, modifiable par l'utilisateur
      });
    }

    // Créer les verrats
    for (let i = 0; i < effectifs.nombre_verrats; i++) {
      verratCount++;
      const code = generateUniqueCode('V', verratCount);
      const nom = nomsMasculins[nomMasculinIndex++];

      await this.createProductionAnimal({
        projet_id: projetId,
        code,
        nom,
        sexe: 'male',
        reproducteur: true,
        statut: 'actif',
        date_naissance: undefined,
        poids_initial: undefined,
        date_entree: undefined,
        race: undefined,
        origine: undefined,
        notes: "Créé lors de l'initialisation du projet",
        pere_id: null, // Inconnu par défaut, modifiable par l'utilisateur
        mere_id: null, // Inconnu par défaut, modifiable par l'utilisateur
      });
    }

    // Créer les porcelets
    for (let i = 0; i < effectifs.nombre_porcelets; i++) {
      porceletCount++;
      const code = generateUniqueCode('P', porceletCount);
      const nom = nomsPorcelets[nomPorceletIndex++];

      await this.createProductionAnimal({
        projet_id: projetId,
        code,
        nom,
        sexe: 'indetermine',
        reproducteur: false,
        statut: 'actif',
        date_naissance: undefined,
        poids_initial: undefined,
        date_entree: undefined,
        race: undefined,
        origine: undefined,
        notes: "Créé lors de l'initialisation du projet",
        pere_id: null, // Inconnu par défaut, modifiable par l'utilisateur
        mere_id: null, // Inconnu par défaut, modifiable par l'utilisateur
      });
    }
  }

  async getProjetById(id: string): Promise<Projet> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<Projet>('SELECT * FROM projets WHERE id = ?', [id]);

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

    await this.db.runAsync(`UPDATE projets SET ${fields.join(', ')} WHERE id = ?`, values);

    return this.getProjetById(id);
  }

  /**
   * ============================================
   * GESTION DES CHARGES FIXES
   * ============================================
   */

  async createChargeFixe(
    charge: Omit<ChargeFixe, 'id' | 'date_creation' | 'derniere_modification'>
  ): Promise<ChargeFixe> {
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

    await this.db.runAsync(`UPDATE charges_fixes SET ${fields.join(', ')} WHERE id = ?`, values);

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

  async createDepensePonctuelle(
    depense: Omit<DepensePonctuelle, 'id' | 'date_creation'>
  ): Promise<DepensePonctuelle> {
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

  async getDepensesPonctuellesByDateRange(
    dateDebut: string,
    dateFin: string
  ): Promise<DepensePonctuelle[]> {
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

  async updateDepensePonctuelle(
    id: string,
    updates: UpdateDepensePonctuelleInput
  ): Promise<DepensePonctuelle> {
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

    const result = await this.db.getFirstAsync<any>('SELECT * FROM revenus WHERE id = ?', [id]);

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

  async getRevenusByDateRange(
    dateDebut: string,
    dateFin: string,
    projetId: string
  ): Promise<Revenu[]> {
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

  async createGestation(
    gestation: Omit<
      Gestation,
      'id' | 'date_creation' | 'derniere_modification' | 'date_mise_bas_prevue'
    >
  ): Promise<Gestation> {
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

    const result = await this.db.getFirstAsync<Gestation>('SELECT * FROM gestations WHERE id = ?', [
      id,
    ]);

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

    await this.db.runAsync(`UPDATE gestations SET ${fields.join(', ')} WHERE id = ?`, values);

    // ✅ AUTOMATISATION : Créer les porcelets automatiquement si la gestation est terminée
    if (
      updates.statut === 'terminee' &&
      updates.nombre_porcelets_reel &&
      updates.nombre_porcelets_reel > 0
    ) {
      const gestation = await this.getGestationById(id);
      await this.creerPorceletsDepuisGestation(gestation);
    }

    return this.getGestationById(id);
  }

  async deleteGestation(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM gestations WHERE id = ?', [id]);
  }

  /**
   * Crée automatiquement les porcelets dans la table production_animaux
   * lorsqu'une gestation est terminée
   */
  private async creerPorceletsDepuisGestation(gestation: Gestation): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Vérifier que la gestation est bien terminée
    if (
      gestation.statut !== 'terminee' ||
      !gestation.nombre_porcelets_reel ||
      gestation.nombre_porcelets_reel <= 0
    ) {
      return;
    }

    // Vérifier si les porcelets n'ont pas déjà été créés pour cette gestation
    // On vérifie s'il existe déjà des porcelets avec cette truie comme mère et nés à la date de mise bas réelle
    const dateMiseBas = gestation.date_mise_bas_reelle || gestation.date_mise_bas_prevue;
    const porceletsExistants = await this.db.getAllAsync<ProductionAnimal>(
      `SELECT * FROM production_animaux 
       WHERE projet_id = ? 
       AND mere_id = ? 
       AND date_naissance = ? 
       AND reproducteur = 0`,
      [gestation.projet_id, gestation.truie_id, dateMiseBas]
    );

    if (porceletsExistants && porceletsExistants.length > 0) {
      console.log(`Les porcelets pour la gestation ${gestation.id} ont déjà été créés.`);
      return;
    }

    // Récupérer tous les animaux du projet pour générer des codes uniques
    const animauxExistants = await this.getProductionAnimaux(gestation.projet_id, true);

    // ✅ CORRECTION : Trouver les vrais IDs des parents dans production_animaux
    // truie_id et verrat_id dans gestations peuvent être des codes ou des IDs
    let mereIdReel: string | null = null;
    let pereIdReel: string | null = null;

    // Chercher la truie par ID ou par code
    const truieTrouvee = animauxExistants.find(
      (a) => a.id === gestation.truie_id || a.code === gestation.truie_id
    );
    if (truieTrouvee) {
      mereIdReel = truieTrouvee.id;
    }

    // Chercher le verrat par ID ou par code (si renseigné)
    if (gestation.verrat_id) {
      const verratTrouve = animauxExistants.find(
        (a) => a.id === gestation.verrat_id || a.code === gestation.verrat_id
      );
      if (verratTrouve) {
        pereIdReel = verratTrouve.id;
      }
    }

    // Trouver le prochain numéro de porcelet disponible
    const codesPorcelets = animauxExistants
      .map((a) => a.code)
      .filter((code) => code.startsWith('P'))
      .map((code) => {
        const match = code.match(/P(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((num) => !isNaN(num));

    const maxNumero = codesPorcelets.length > 0 ? Math.max(...codesPorcelets) : 0;
    let prochainNumero = maxNumero + 1;

    // Générer des noms uniques et aléatoires pour les porcelets
    const nomsDejaUtilises = animauxExistants
      .map((a) => a.nom)
      .filter((nom): nom is string => nom !== undefined && nom !== null && nom !== '');

    const nombrePorcelets = gestation.nombre_porcelets_reel;
    const nomsAleatoires = genererPlusieursNomsAleatoires(
      nombrePorcelets,
      nomsDejaUtilises,
      'tous',
      'indetermine' // Les porcelets ont un sexe indéterminé à la naissance
    );

    // Créer les porcelets
    const porceletsCreees: ProductionAnimal[] = [];

    for (let i = 0; i < nombrePorcelets; i++) {
      const codePorcelet = `P${String(prochainNumero).padStart(3, '0')}`;
      const nomPorcelet = nomsAleatoires[i];

      try {
        const porcelet = await this.createProductionAnimal({
          projet_id: gestation.projet_id,
          code: codePorcelet,
          nom: nomPorcelet,
          origine: 'Naissance',
          sexe: 'indetermine',
          date_naissance: dateMiseBas,
          poids_initial: undefined,
          date_entree: dateMiseBas,
          statut: 'actif',
          race: undefined,
          reproducteur: false,
          pere_id: pereIdReel, // ✅ Utiliser le vrai ID trouvé
          mere_id: mereIdReel, // ✅ Utiliser le vrai ID trouvé
          notes: `Né de la gestation ${gestation.truie_nom || gestation.truie_id}${gestation.verrat_nom ? ` x ${gestation.verrat_nom}` : ''}`,
        });

        porceletsCreees.push(porcelet);
        prochainNumero++;
      } catch (error) {
        console.error(`Erreur lors de la création du porcelet ${codePorcelet}:`, error);
        // Continuer avec les autres porcelets même en cas d'erreur
      }
    }

    console.log(
      `✅ ${porceletsCreees.length} porcelet(s) créé(s) automatiquement pour la gestation ${gestation.id}`
    );
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
      throw new Error("La gestation n'a pas de projet_id associé");
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

    const result = await this.db.getFirstAsync<Sevrage>('SELECT * FROM sevrages WHERE id = ?', [
      id,
    ]);

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

  async createIngredient(
    ingredient: Omit<Ingredient, 'id' | 'date_creation'>
  ): Promise<Ingredient> {
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
    return await this.db.getAllAsync<Ingredient>('SELECT * FROM ingredients ORDER BY nom ASC');
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

    await this.db.runAsync(`UPDATE ingredients SET ${fields.join(', ')} WHERE id = ?`, values);

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
   * GESTION DES RATIONS BUDGET (BUDGÉTISATION ALIMENT)
   * ============================================
   */

  async createRationBudget(
    input: import('../types/nutrition').CreateRationBudgetInput
  ): Promise<import('../types/nutrition').RationBudget> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `ration_budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const ingredients_json = JSON.stringify(input.ingredients);

    await this.db.runAsync(
      `INSERT INTO rations_budget (
        id, projet_id, nom, type_porc, poids_moyen_kg, nombre_porcs,
        duree_jours, ration_journaliere_par_porc, quantite_totale_kg,
        cout_total, cout_par_kg, cout_par_porc, ingredients, notes,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.projet_id,
        input.nom,
        input.type_porc,
        input.poids_moyen_kg,
        input.nombre_porcs,
        input.duree_jours,
        input.ration_journaliere_par_porc,
        input.quantite_totale_kg,
        input.cout_total,
        input.cout_par_kg,
        input.cout_par_porc,
        ingredients_json,
        input.notes || null,
        date_creation,
        date_creation,
      ]
    );

    const ration = await this.getRationBudgetById(id);
    if (!ration) {
      throw new Error('Erreur lors de la création de la ration budget');
    }
    return ration;
  }

  async getRationBudgetById(id: string): Promise<import('../types/nutrition').RationBudget | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<any>('SELECT * FROM rations_budget WHERE id = ?', [
      id,
    ]);

    if (!result) {
      return null;
    }

    return {
      ...result,
      ingredients: JSON.parse(result.ingredients || '[]'),
    };
  }

  async getRationsBudgetByProjet(
    projetId: string
  ): Promise<import('../types/nutrition').RationBudget[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM rations_budget WHERE projet_id = ? ORDER BY date_creation DESC',
      [projetId]
    );

    return results.map((row) => ({
      ...row,
      ingredients: JSON.parse(row.ingredients || '[]'),
    }));
  }

  async updateRationBudget(
    id: string,
    updates: import('../types/nutrition').UpdateRationBudgetInput
  ): Promise<import('../types/nutrition').RationBudget | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const derniere_modification = new Date().toISOString();
    const setClauses: string[] = ['derniere_modification = ?'];
    const values: any[] = [derniere_modification];

    if (updates.nom !== undefined) {
      setClauses.push('nom = ?');
      values.push(updates.nom);
    }
    if (updates.type_porc !== undefined) {
      setClauses.push('type_porc = ?');
      values.push(updates.type_porc);
    }
    if (updates.poids_moyen_kg !== undefined) {
      setClauses.push('poids_moyen_kg = ?');
      values.push(updates.poids_moyen_kg);
    }
    if (updates.nombre_porcs !== undefined) {
      setClauses.push('nombre_porcs = ?');
      values.push(updates.nombre_porcs);
    }
    if (updates.duree_jours !== undefined) {
      setClauses.push('duree_jours = ?');
      values.push(updates.duree_jours);
    }
    if (updates.notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(updates.notes);
    }

    values.push(id);

    await this.db.runAsync(
      `UPDATE rations_budget SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    return this.getRationBudgetById(id);
  }

  async deleteRationBudget(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM rations_budget WHERE id = ?', [id]);
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
    const alerte_active =
      input.seuil_alerte !== undefined && input.seuil_alerte !== null
        ? quantite_initiale <= input.seuil_alerte
        : false;

    await this.db.runAsync(
      `INSERT INTO stocks_aliments (
        id, projet_id, nom, categorie, quantite_actuelle, unite,
        seuil_alerte, date_derniere_entree, date_derniere_sortie,
        alerte_active, notes, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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

    const result = await this.db.getFirstAsync<any>('SELECT * FROM stocks_aliments WHERE id = ?', [
      id,
    ]);

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
    const nouveauSeuil =
      updates.seuil_alerte !== undefined
        ? (updates.seuil_alerte ?? null)
        : (current.seuil_alerte ?? null);
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

    await this.db.runAsync(`UPDATE stocks_aliments SET ${fields.join(', ')} WHERE id = ?`, values);

    return this.getStockAlimentById(id);
  }

  async deleteStockAliment(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM stocks_mouvements WHERE aliment_id = ?', [id]);
    await this.db.runAsync('DELETE FROM stocks_aliments WHERE id = ?', [id]);
  }

  async createStockMouvement(
    input: CreateStockMouvementInput
  ): Promise<{ mouvement: StockMouvement; stock: StockAliment }> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const stock = await this.getStockAlimentById(input.aliment_id);

    // S'assurer que les valeurs sont des nombres
    const quantiteActuelle =
      typeof stock.quantite_actuelle === 'number'
        ? stock.quantite_actuelle
        : parseFloat(String(stock.quantite_actuelle)) || 0;
    const quantiteMouvement =
      typeof input.quantite === 'number' ? input.quantite : parseFloat(String(input.quantite)) || 0;

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
    const nouvelleQuantiteNum =
      typeof nouvelleQuantite === 'number'
        ? nouvelleQuantite
        : parseFloat(String(nouvelleQuantite)) || 0;

    // S'assurer que input.quantite est bien un nombre pour l'insertion
    const quantiteMouvementNum =
      typeof input.quantite === 'number' ? input.quantite : parseFloat(String(input.quantite)) || 0;

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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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

    const alerte_active =
      stock.seuil_alerte !== undefined && stock.seuil_alerte !== null
        ? nouvelleQuantiteNum <= stock.seuil_alerte
        : false;

    const dateDerniereEntree =
      input.type === 'entree' ? input.date : stock.date_derniere_entree || null;
    const dateDerniereSortie =
      input.type === 'sortie' ? input.date : stock.date_derniere_sortie || null;

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
    const quantiteEnDb =
      typeof verification?.quantite_actuelle === 'number'
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
        photo_uri, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
        input.photo_uri || null,
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

  async getProductionAnimaux(
    projetId: string,
    inclureInactifs: boolean = true
  ): Promise<ProductionAnimal[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const query = inclureInactifs
      ? 'SELECT * FROM production_animaux WHERE projet_id = ? ORDER BY code ASC'
      : 'SELECT * FROM production_animaux WHERE projet_id = ? AND actif = 1 ORDER BY code ASC';

    const results = await this.db.getAllAsync<any>(query, [projetId]);
    return results.map((row) => this.mapRowToProductionAnimal(row));
  }

  async updateProductionAnimal(
    id: string,
    updates: UpdateProductionAnimalInput
  ): Promise<ProductionAnimal> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'actif') {
        // actif est géré via statut
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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

  /**
   * Met à jour une pesée et recalcule le GMQ
   */
  async updatePesee(id: string, updates: Partial<CreatePeseeInput>): Promise<ProductionPesee> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Récupérer la pesée existante
    const peseeExistante = await this.getPeseeById(id);

    // Fusionner les données
    const dataMerged = {
      projet_id: peseeExistante.projet_id,
      animal_id: peseeExistante.animal_id,
      date: updates.date ?? peseeExistante.date,
      poids_kg: updates.poids_kg ?? peseeExistante.poids_kg,
      commentaire:
        updates.commentaire !== undefined ? updates.commentaire : peseeExistante.commentaire,
      cree_par: peseeExistante.cree_par,
    };

    // Recalculer le GMQ avec les nouvelles données
    const animal = await this.getProductionAnimalById(dataMerged.animal_id);
    const previous = await this.getDernierePeseeAvantDate(dataMerged.animal_id, dataMerged.date);

    let gmq: number | null = null;
    let difference_standard: number | null = null;

    let poidsReference = animal.poids_initial ?? null;
    let dateReference = animal.date_entree ?? null;

    if (previous && previous.id !== id) {
      // Exclure la pesée qu'on est en train de modifier
      poidsReference = previous.poids_kg;
      dateReference = previous.date;
    }

    if (poidsReference !== null && dateReference) {
      const diffJours = this.calculateDayDifference(dateReference, dataMerged.date);
      if (diffJours > 0) {
        gmq = ((dataMerged.poids_kg - poidsReference) * 1000) / diffJours;
        const standard = getStandardGMQ(dataMerged.poids_kg);
        if (standard) {
          difference_standard = gmq - standard.gmq_cible;
        }
      }
    }

    // Mettre à jour la pesée
    await this.db.runAsync(
      `UPDATE production_pesees 
       SET date = ?, poids_kg = ?, gmq = ?, difference_standard = ?, commentaire = ?
       WHERE id = ?`,
      [
        dataMerged.date,
        dataMerged.poids_kg,
        gmq ?? null,
        difference_standard ?? null,
        dataMerged.commentaire || null,
        id,
      ]
    );

    // Recalculer les GMQ des pesées suivantes
    await this.recalculerGMQSuivants(dataMerged.animal_id, dataMerged.date);

    return this.getPeseeById(id);
  }

  /**
   * Supprime une pesée et recalcule les GMQ suivants
   */
  async deletePesee(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Récupérer la pesée avant de la supprimer pour savoir quel animal et quelle date
    const pesee = await this.getPeseeById(id);

    // Supprimer la pesée
    await this.db.runAsync('DELETE FROM production_pesees WHERE id = ?', [id]);

    // Recalculer les GMQ des pesées suivantes
    await this.recalculerGMQSuivants(pesee.animal_id, pesee.date);
  }

  /**
   * Recalcule les GMQ de toutes les pesées suivant une date donnée pour un animal
   */
  private async recalculerGMQSuivants(animalId: string, dateModifiee: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Récupérer toutes les pesées après la date modifiée
    const peseesASuivantes = await this.db.getAllAsync<any>(
      'SELECT * FROM production_pesees WHERE animal_id = ? AND date > ? ORDER BY date ASC',
      [animalId, dateModifiee]
    );

    const animal = await this.getProductionAnimalById(animalId);

    // Recalculer le GMQ pour chaque pesée suivante
    for (const peseeSuivante of peseesASuivantes) {
      const previous = await this.getDernierePeseeAvantDate(animalId, peseeSuivante.date);

      let gmq: number | null = null;
      let difference_standard: number | null = null;

      let poidsReference = animal.poids_initial ?? null;
      let dateReference = animal.date_entree ?? null;

      if (previous && previous.id !== peseeSuivante.id) {
        poidsReference = previous.poids_kg;
        dateReference = previous.date;
      }

      if (poidsReference !== null && dateReference) {
        const diffJours = this.calculateDayDifference(dateReference, peseeSuivante.date);
        if (diffJours > 0) {
          gmq = ((peseeSuivante.poids_kg - poidsReference) * 1000) / diffJours;
          const standard = getStandardGMQ(peseeSuivante.poids_kg);
          if (standard) {
            difference_standard = gmq - standard.gmq_cible;
          }
        }
      }

      // Mettre à jour le GMQ de cette pesée
      await this.db.runAsync(
        'UPDATE production_pesees SET gmq = ?, difference_standard = ? WHERE id = ?',
        [gmq ?? null, difference_standard ?? null, peseeSuivante.id]
      );
    }
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

    const ration = await this.db.getFirstAsync<any>('SELECT * FROM rations WHERE id = ?', [id]);

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

  async createRapportCroissance(
    rapport: Omit<RapportCroissance, 'id' | 'date_creation'>
  ): Promise<RapportCroissance> {
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

  async getRapportsCroissanceParDateRange(
    dateDebut: string,
    dateFin: string
  ): Promise<RapportCroissance[]> {
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
    const derniere_modification = date_creation;

    // Récupérer tous les animaux actifs du projet pour validation et mise à jour
    const animauxProjet = await this.getProductionAnimaux(mortalite.projet_id, true);
    const animauxActifs = animauxProjet.filter((a) => a.statut?.toLowerCase() === 'actif');

    // Fonction helper pour déterminer si un animal correspond à la catégorie
    const animalCorrespondCategorie = (animal: ProductionAnimal, categorie: string): boolean => {
      if (categorie === 'autre') return true; // Catégorie "autre" accepte tous les animaux

      const isReproducteur = animal.reproducteur === true;
      const isMale = animal.sexe === 'male';
      const isFemelle = animal.sexe === 'femelle';

      switch (categorie) {
        case 'truie':
          return isFemelle && isReproducteur;
        case 'verrat':
          return isMale && isReproducteur;
        case 'porcelet':
          return (
            (isMale && !isReproducteur) ||
            (isFemelle && !isReproducteur) ||
            animal.sexe === 'indetermine'
          );
        default:
          return true;
      }
    };

    // Filtrer les animaux actifs correspondant à la catégorie
    const animauxCorrespondants = animauxActifs.filter((a) =>
      animalCorrespondCategorie(a, mortalite.categorie)
    );

    // Validation : vérifier qu'il y a assez d'animaux actifs disponibles
    if (mortalite.nombre_porcs > animauxCorrespondants.length) {
      throw new Error(
        `Impossible d'enregistrer ${mortalite.nombre_porcs} mortalité(s) de ${mortalite.categorie}(s). ` +
          `Il n'y a que ${animauxCorrespondants.length} ${mortalite.categorie}(s) actif(s) disponible(s).`
      );
    }

    // Insérer la mortalité dans la base de données
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

    // Mettre à jour le statut des animaux concernés
    if (mortalite.animal_code) {
      // Cas 1 : Code d'animal spécifique renseigné
      try {
        const animal = await this.db.getFirstAsync<any>(
          'SELECT * FROM production_animaux WHERE projet_id = ? AND code = ?',
          [mortalite.projet_id, mortalite.animal_code]
        );

        if (animal && animal.statut?.toLowerCase() === 'actif') {
          // Changer le statut en "mort"
          await this.db.runAsync(
            'UPDATE production_animaux SET statut = ?, actif = 0, derniere_modification = ? WHERE id = ?',
            ['mort', derniere_modification, animal.id]
          );
        }
      } catch (error) {
        console.warn(
          `Animal avec le code ${mortalite.animal_code} non trouvé lors de la création de la mortalité`
        );
      }
    } else {
      // Cas 2 : Mortalité générique (sans code spécifique)
      // Mettre à jour automatiquement les N premiers animaux actifs correspondant à la catégorie
      const animauxAMarquer = animauxCorrespondants.slice(0, mortalite.nombre_porcs);

      for (const animal of animauxAMarquer) {
        await this.db.runAsync(
          'UPDATE production_animaux SET statut = ?, actif = 0, derniere_modification = ? WHERE id = ?',
          ['mort', derniere_modification, animal.id]
        );
      }
    }

    return this.getMortaliteById(id);
  }

  async getMortaliteById(id: string): Promise<Mortalite> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<Mortalite>('SELECT * FROM mortalites WHERE id = ?', [
      id,
    ]);

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

    await this.db.runAsync(`UPDATE mortalites SET ${fields.join(', ')} WHERE id = ?`, values);

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

    // Récupérer les animaux du projet pour calculer le taux basé sur les données réelles du cheptel
    const animauxProjet = await this.getProductionAnimaux(projetId, true);

    // Calculer le nombre d'animaux morts : UNIQUEMENT depuis les animaux avec statut "mort" dans le cheptel
    // C'est la source de vérité car les animaux sont automatiquement mis à jour lors de l'enregistrement d'une mortalité
    const nombrePorcsMorts = animauxProjet.filter(
      (animal) => animal.statut?.toLowerCase() === 'mort'
    ).length;

    // Calculer aussi le total des morts depuis la table mortalites (pour référence)
    // On utilise le maximum entre les deux sources pour plus de précision
    const total_morts_depuis_table = mortalites.reduce((sum, m) => sum + m.nombre_porcs, 0);
    const total_morts = Math.max(nombrePorcsMorts, total_morts_depuis_table);

    // Population totale = tous les animaux du projet (actifs + morts + vendus + autres)
    // C'est la population initiale qui a existé dans le projet
    const nombrePorcsTotal = animauxProjet.length;

    // Calculer le taux de mortalité
    // Taux = (nombre de morts / population totale) * 100
    // Population totale = tous les animaux du projet (actifs + morts + vendus + autres)
    const taux_mortalite = nombrePorcsTotal > 0 ? (nombrePorcsMorts / nombrePorcsTotal) * 100 : 0;

    // Compter par catégorie
    const mortalites_par_categorie = {
      porcelet: mortalites
        .filter((m) => m.categorie === 'porcelet')
        .reduce((sum, m) => sum + m.nombre_porcs, 0),
      truie: mortalites
        .filter((m) => m.categorie === 'truie')
        .reduce((sum, m) => sum + m.nombre_porcs, 0),
      verrat: mortalites
        .filter((m) => m.categorie === 'verrat')
        .reduce((sum, m) => sum + m.nombre_porcs, 0),
      autre: mortalites
        .filter((m) => m.categorie === 'autre')
        .reduce((sum, m) => sum + m.nombre_porcs, 0),
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

  async createPlanification(
    planification: Omit<Planification, 'id' | 'date_creation' | 'derniere_modification'>
  ): Promise<Planification> {
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

  async getPlanificationsParDateRange(
    dateDebut: string,
    dateFin: string
  ): Promise<Planification[]> {
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

    await this.db.runAsync(`UPDATE planifications SET ${fields.join(', ')} WHERE id = ?`, values);

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

  async createCollaborateur(
    collaborateur: Omit<Collaborateur, 'id' | 'date_creation' | 'derniere_modification'>
  ): Promise<Collaborateur> {
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
        permission_rapports, permission_planification, permission_mortalites, permission_sante,
        date_invitation, date_acceptation, notes, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        collaborateur.permissions.sante ? 1 : 0,
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

    const result = await this.db.getFirstAsync<any>('SELECT * FROM collaborations WHERE id = ?', [
      id,
    ]);

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
  async lierCollaborateurAUtilisateur(
    userId: string,
    email: string
  ): Promise<Collaborateur | null> {
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
            sante: perms?.sante ?? currentCollaborateur!.permissions.sante,
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
          fields.push('permission_sante = ?');
          values.push(mergedPerms.sante ? 1 : 0);
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

    await this.db.runAsync(`UPDATE collaborations SET ${fields.join(', ')} WHERE id = ?`, values);

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
    const quantiteActuelle =
      typeof row.quantite_actuelle === 'number'
        ? row.quantite_actuelle
        : parseFloat(String(row.quantite_actuelle)) || 0;

    // S'assurer que seuil_alerte est un nombre ou undefined
    const seuilAlerte =
      row.seuil_alerte !== null && row.seuil_alerte !== undefined
        ? typeof row.seuil_alerte === 'number'
          ? row.seuil_alerte
          : parseFloat(String(row.seuil_alerte)) || undefined
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
      photo_uri: row.photo_uri || undefined,
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
        sante: row.permission_sante === 1,
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
        await this.db.runAsync(
          'DELETE FROM ingredients_ration WHERE ration_id IN (SELECT id FROM rations WHERE projet_id = ?)',
          [projetId]
        );
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

/**
 * Fonction helper pour obtenir la base de données
 * Utilisée par les repositories
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  await databaseService.initialize();
  const db = (databaseService as any).db;
  if (!db) {
    throw new Error('Base de données non initialisée');
  }
  return db;
}
