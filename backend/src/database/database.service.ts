import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

/**
 * Service de connexion PostgreSQL
 * Gère le pool de connexions à la base de données
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor() {
    // Configuration depuis les variables d'environnement
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'farmtrack_db',
      user: process.env.DB_USER || 'farmtrack_user',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20, // Nombre maximum de connexions dans le pool
      idleTimeoutMillis: 30000, // Fermer les connexions inactives après 30s
      connectionTimeoutMillis: 2000, // Timeout de connexion: 2s
    });

    // Gestion des erreurs du pool
    this.pool.on('error', (err) => {
      console.error('❌ Erreur inattendue dans le pool PostgreSQL:', err);
    });
  }

  /**
   * Initialise la connexion à la base de données
   */
  async onModuleInit() {
    try {
      // Tester la connexion
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✅ Connexion PostgreSQL établie avec succès');
      console.log(`📅 Heure serveur: ${result.rows[0].now}`);
      client.release();
    } catch (error) {
      console.error('❌ Erreur lors de la connexion à PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Ferme le pool de connexions à l'arrêt du module
   */
  async onModuleDestroy() {
    await this.pool.end();
    console.log('🔌 Pool PostgreSQL fermé');
  }

  /**
   * Obtient une connexion du pool
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Exécute une requête SQL
   */
  async query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log(`📊 Query exécutée en ${duration}ms: ${text.substring(0, 50)}...`);
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de l\'exécution de la requête:', error);
      throw error;
    }
  }

  /**
   * Exécute une transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Vérifie la santé de la connexion
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1');
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }
}

