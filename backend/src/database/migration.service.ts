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
        return;
      }

      // Créer la table si elle n'existe pas
      await this.databaseService.query(`
        CREATE TABLE schema_migrations (
          id SERIAL PRIMARY KEY,
          migration_number INTEGER NOT NULL UNIQUE,
          migration_name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await this.databaseService.query(`
        CREATE INDEX idx_schema_migrations_number ON schema_migrations(migration_number)
      `);
      
      await this.databaseService.query(`
        CREATE INDEX idx_schema_migrations_name ON schema_migrations(migration_name)
      `);
      
      this.logger.log('✅ Table schema_migrations créée');
    } catch (error) {
      this.logger.error('Erreur lors de la création de la table schema_migrations:', error);
      throw error;
    }
  }

  /**
   * Récupère la liste des migrations déjà appliquées
   */
  private async getAppliedMigrations(): Promise<Set<number>> {
    try {
      const result = await this.databaseService.query(
        'SELECT migration_number FROM schema_migrations ORDER BY migration_number'
      );
      return new Set(result.rows.map(row => row.migration_number));
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
      
      // Exécuter la migration dans une transaction
      await this.databaseService.transaction(async (client) => {
        // Exécuter le SQL de la migration
        await client.query(sql);
        
        // Enregistrer la migration comme appliquée
        await client.query(
          'INSERT INTO schema_migrations (migration_number, migration_name) VALUES ($1, $2)',
          [migration.number, migration.filename]
        );
      });
      
      this.logger.log(`✅ Migration ${migration.number} appliquée avec succès`);
    } catch (error: any) {
      this.logger.error(`❌ Erreur lors de l'application de la migration ${migration.number}:`, error.message);
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
      
      const pendingMigrations = allMigrations.filter(
        migration => !appliedMigrations.has(migration.number)
      );

      if (pendingMigrations.length === 0) {
        this.logger.log('✅ Toutes les migrations sont à jour');
        return;
      }

      this.logger.log(`📦 ${pendingMigrations.length} migration(s) en attente`);

      for (const migration of pendingMigrations) {
        try {
          await this.executeMigration(migration);
        } catch (error: any) {
          // Si la migration échoue, on arrête et on log l'erreur
          this.logger.error(
            `Migration ${migration.number} échouée. ` +
            `Veuillez l'appliquer manuellement: ${migration.filename}`
          );
          // Ne pas throw pour ne pas bloquer le démarrage
          // L'utilisateur pourra corriger et redémarrer
          break;
        }
      }

      const remaining = await this.getAppliedMigrations();
      const stillPending = allMigrations.filter(
        migration => !remaining.has(migration.number)
      );

      if (stillPending.length > 0) {
        this.logger.warn(
          `⚠️  ${stillPending.length} migration(s) n'ont pas pu être appliquées automatiquement. ` +
          `Veuillez les appliquer manuellement.`
        );
      } else {
        this.logger.log('✅ Toutes les migrations ont été appliquées avec succès');
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
