import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor() {
    // Support pour DATABASE_URL (Railway, Heroku, etc.) ou variables individuelles
    let poolConfig;
    
    if (process.env.DATABASE_URL) {
      // Railway et autres plateformes utilisent DATABASE_URL
      poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('sslmode=require') 
          ? { rejectUnauthorized: false } 
          : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };
    } else {
      // Variables individuelles (développement local)
      poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'farmtrack_db',
        user: process.env.DB_USER || 'farmtrack_user',
        password: process.env.DB_PASSWORD || 'postgres',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };
    }

    this.pool = new Pool(poolConfig);

    this.pool.on('error', (err) => {
      this.logger.error('Erreur inattendue dans le pool PostgreSQL', err);
    });
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      this.logger.log('Connexion PostgreSQL établie avec succès');
      this.logger.debug(`Heure serveur: ${result.rows[0].now}`);
      client.release();
    } catch (error) {
      this.logger.error('Erreur lors de la connexion à PostgreSQL', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Pool PostgreSQL fermé');
  }

  async getClient() {
    return await this.pool.connect();
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    const slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10);
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Monitoring des requêtes lentes (Phase 3)
      if (duration > slowQueryThreshold) {
        const queryPreview = text.length > 100 ? `${text.substring(0, 100)}...` : text;
        const paramsPreview = params && params.length > 0 
          ? `[${params.slice(0, 3).map(p => typeof p === 'string' ? `"${p.substring(0, 20)}"` : p).join(', ')}${params.length > 3 ? '...' : ''}]`
          : '[]';
        
        this.logger.warn(
          `⚠️ SLOW QUERY (${duration}ms > ${slowQueryThreshold}ms): ${queryPreview} | Params: ${paramsPreview}`
        );
        
        // En production, on peut aussi envoyer à un service de monitoring (DataDog, New Relic, etc.)
        if (process.env.NODE_ENV === 'production' && process.env.ENABLE_QUERY_MONITORING === 'true') {
          // TODO: Intégrer avec un service de monitoring externe
          // Exemple: this.monitoringService.recordSlowQuery({ query: text, duration, params });
        }
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error(
        `❌ QUERY ERROR (${duration}ms): ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`,
        error
      );
      throw error;
    }
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
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

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1');
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }
}
