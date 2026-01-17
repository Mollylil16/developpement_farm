import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationFile {
  number: number;
  filename: string;
  fullPath: string;
}

@Injectable()
export class MigrationService implements OnModuleInit {
  private readonly logger = new Logger(MigrationService.name);
  private readonly migrationsDir = path.join(process.cwd(), 'database', 'migrations');

  constructor(private databaseService: DatabaseService) {}

  async onModuleInit() {
    // Attendre que DatabaseService soit complètement initialisé
    // On attend jusqu'à 5 secondes pour que la connexion soit prête
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      try {
        // Tester la connexion
        await this.databaseService.query('SELECT 1');
        break; // Connexion OK, on continue
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          this.logger.warn('Impossible de se connecter à la base de données, migrations ignorées');
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    try {
      await this.ensureMigrationTable();
      await this.runPendingMigrations();
    } catch (error) {
      this.logger.error('Erreur lors de l\'exécution des migrations:', error);
      // Ne pas bloquer le démarrage si les migrations échouent
      // L'utilisateur pourra les appliquer manuellement
    }
  }

  /**
   * Crée la table de suivi des migrations si elle n'existe pas
   */
  private async ensureMigrationTable(): Promise<void> {
    try {
      // Vérifier si la table existe déjà
      const checkResult = await this.databaseService.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'schema_migrations'
        )
      `);
      
      if (checkResult.rows[0].exists) {
        this.logger.debug('Table schema_migrations existe déjà');
        
        // Vérifier et corriger la contrainte si nécessaire
        await this.fixMigrationTableConstraints();
        return;
      }

      // Créer la table si elle n'existe pas
      // Note: migration_name est UNIQUE (pas migration_number) pour gérer les doublons de numéro
      await this.databaseService.query(`
        CREATE TABLE schema_migrations (
          id SERIAL PRIMARY KEY,
          migration_number INTEGER NOT NULL,
          migration_name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await this.databaseService.query(`
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_number ON schema_migrations(migration_number)
      `);
      
      await this.databaseService.query(`
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_name ON schema_migrations(migration_name)
      `);
      
      this.logger.log('✅ Table schema_migrations créée');
    } catch (error) {
      this.logger.error('Erreur lors de la création de la table schema_migrations:', error);
      throw error;
    }
  }

  /**
   * Corrige les contraintes de la table schema_migrations si nécessaire
   * (pour gérer les migrations avec le même numéro)
   */
  private async fixMigrationTableConstraints(): Promise<void> {
    try {
      // Vérifier si la contrainte unique est sur migration_number (ancienne version)
      const constraintCheck = await this.databaseService.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'schema_migrations'
          AND constraint_type = 'UNIQUE'
          AND constraint_name LIKE '%migration_number%'
      `);
      
      if (constraintCheck.rows.length > 0) {
        this.logger.log('Correction de la contrainte unique de schema_migrations...');
        
        // Supprimer l'ancienne contrainte unique sur migration_number
        await this.databaseService.query(`
          ALTER TABLE schema_migrations
          DROP CONSTRAINT IF EXISTS schema_migrations_migration_number_key
        `);
        
        // Ajouter la contrainte unique sur migration_name si elle n'existe pas
        const nameConstraintCheck = await this.databaseService.query(`
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = 'schema_migrations'
            AND constraint_type = 'UNIQUE'
            AND constraint_name LIKE '%migration_name%'
        `);
        
        if (nameConstraintCheck.rows.length === 0) {
          await this.databaseService.query(`
            ALTER TABLE schema_migrations
            ADD CONSTRAINT schema_migrations_migration_name_key UNIQUE (migration_name)
          `);
        }
        
        this.logger.log('✅ Contrainte de schema_migrations corrigée');
      }
    } catch (error) {
      this.logger.warn('Erreur lors de la correction des contraintes (non bloquant):', error);
      // Ne pas throw, continuer quand même
    }
  }

  /**
   * Récupère la liste des migrations déjà appliquées (par nom de fichier)
   */
  private async getAppliedMigrations(): Promise<Set<string>> {
    try {
      const result = await this.databaseService.query(
        'SELECT migration_name FROM schema_migrations ORDER BY migration_number'
      );
      return new Set(result.rows.map(row => row.migration_name));
    } catch (error) {
      this.logger.warn('Impossible de récupérer les migrations appliquées, on considère qu\'aucune n\'est appliquée');
      return new Set();
    }
  }

  /**
   * Récupère la liste des fichiers de migration disponibles
   */
  private getMigrationFiles(): MigrationFile[] {
    try {
      const files = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql') && /^\d{3}_/.test(file))
        .map(file => {
          const match = file.match(/^(\d{3})_/);
          if (!match) return null;
          return {
            number: parseInt(match[1], 10),
            filename: file,
            fullPath: path.join(this.migrationsDir, file),
          };
        })
        .filter((file): file is MigrationFile => file !== null)
        .sort((a, b) => a.number - b.number);

      return files;
    } catch (error) {
      this.logger.error(`Erreur lors de la lecture du dossier migrations: ${error}`);
      return [];
    }
  }

  /**
   * Exécute une migration SQL
   */
  private async executeMigration(migration: MigrationFile): Promise<void> {
    this.logger.log(`Application de la migration ${migration.number}: ${migration.filename}`);

    try {
      const sql = fs.readFileSync(migration.fullPath, 'utf-8');
      
      // Vérifier d'abord si cette migration a déjà été appliquée (par nom de fichier)
      const alreadyApplied = await this.databaseService.query(
        'SELECT id FROM schema_migrations WHERE migration_name = $1',
        [migration.filename]
      );
      
      if (alreadyApplied.rows.length > 0) {
        this.logger.debug(`Migration ${migration.filename} déjà appliquée, ignorée`);
        return;
      }
      
      // Exécuter la migration dans une transaction
      await this.databaseService.transaction(async (client) => {
        // Exécuter le SQL de la migration
        await client.query(sql);
        
        // Enregistrer la migration comme appliquée (utiliser ON CONFLICT sur migration_name)
        await client.query(
          `INSERT INTO schema_migrations (migration_number, migration_name) 
           VALUES ($1, $2)
           ON CONFLICT (migration_name) DO UPDATE 
           SET migration_number = EXCLUDED.migration_number,
               applied_at = CURRENT_TIMESTAMP`,
          [migration.number, migration.filename]
        );
      });
      
      this.logger.log(`✅ Migration ${migration.filename} appliquée avec succès`);
    } catch (error: any) {
      // Si c'est une erreur de contrainte unique, la migration a peut-être déjà été appliquée
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        this.logger.warn(
          `Migration ${migration.filename} semble déjà appliquée (conflit de numéro ${migration.number}). ` +
          `Vérification et mise à jour du registre...`
        );
        
        // Essayer de mettre à jour le registre si le nom est différent
        try {
          await this.databaseService.query(
            `UPDATE schema_migrations 
             SET migration_name = $1, applied_at = CURRENT_TIMESTAMP
             WHERE migration_number = $2 AND migration_name != $1`,
            [migration.filename, migration.number]
          );
          this.logger.log(`✅ Registre mis à jour pour la migration ${migration.filename}`);
        } catch (updateError) {
          this.logger.debug(`Migration ${migration.filename} déjà enregistrée`);
        }
        return; // Ne pas throw, considérer comme appliquée
      }
      
      this.logger.error(`❌ Erreur lors de l'application de la migration ${migration.filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Exécute toutes les migrations en attente
   */
  async runPendingMigrations(): Promise<void> {
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      const allMigrations = this.getMigrationFiles();
      
      // Filtrer par nom de fichier (pas par numéro) pour gérer les doublons
      const pendingMigrations = allMigrations.filter(
        migration => !appliedMigrations.has(migration.filename)
      );

      if (pendingMigrations.length === 0) {
        this.logger.log('✅ Toutes les migrations sont à jour');
        return;
      }

      this.logger.log(`📦 ${pendingMigrations.length} migration(s) en attente`);

      let successCount = 0;
      let failCount = 0;

      for (const migration of pendingMigrations) {
        try {
          await this.executeMigration(migration);
          successCount++;
        } catch (error: any) {
          failCount++;
          // Si la migration échoue, on continue avec les suivantes
          // (ne pas break pour permettre aux autres migrations de s'exécuter)
          this.logger.error(
            `Migration ${migration.filename} échouée. ` +
            `Veuillez l'appliquer manuellement si nécessaire.`
          );
        }
      }

      const remaining = await this.getAppliedMigrations();
      const stillPending = allMigrations.filter(
        migration => !remaining.has(migration.filename)
      );

      if (stillPending.length > 0) {
        this.logger.warn(
          `⚠️  ${stillPending.length} migration(s) n'ont pas pu être appliquées automatiquement. ` +
          `Veuillez les appliquer manuellement si nécessaire.`
        );
        this.logger.debug(`Migrations en échec: ${stillPending.map(m => m.filename).join(', ')}`);
      } else {
        this.logger.log(
          `✅ Toutes les migrations ont été appliquées avec succès ` +
          `(${successCount} appliquée(s), ${failCount} échouée(s))`
        );
      }
    } catch (error) {
      this.logger.error('Erreur lors de l\'exécution des migrations:', error);
      // Ne pas throw pour ne pas bloquer le démarrage
    }
  }

  /**
   * Méthode publique pour forcer l'exécution des migrations (utile pour les scripts)
   */
  async forceRunMigrations(): Promise<void> {
    await this.ensureMigrationTable();
    await this.runPendingMigrations();
  }
}
