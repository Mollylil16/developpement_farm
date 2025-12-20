import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
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
      console.error('❌ Erreur inattendue dans le pool PostgreSQL:', err);
    });
  }

  async onModuleInit() {
    try {
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

  async onModuleDestroy() {
    await this.pool.end();
    console.log('🔌 Pool PostgreSQL fermé');
  }

  async getClient() {
    return await this.pool.connect();
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.log(`⚠️ Query lente (${duration}ms): ${text.substring(0, 50)}...`);
      }
      return result;
    } catch (error) {
      console.error("❌ Erreur lors de l'exécution de la requête:", error);
      console.error('Query:', text);
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
