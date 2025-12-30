import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor() {
    // Support pour DATABASE_URL (Railway, Heroku, Render, etc.) ou variables individuelles
    let poolConfig;
    
    if (process.env.DATABASE_URL) {
      // Détecter Render ou d'autres plateformes cloud
      const isRenderOrCloud = 
        process.env.DATABASE_URL.includes('render.com') ||
        process.env.DATABASE_URL.includes('railway.app') ||
        process.env.DATABASE_URL.includes('heroku.com') ||
        process.env.DATABASE_URL.includes('.amazonaws.com');
      
      poolConfig = {
        connectionString: process.env.DATABASE_URL,
        // SSL obligatoire sur Render/Cloud (rejectUnauthorized: false pour certificats auto-signés)
        ssl: isRenderOrCloud ? { rejectUnauthorized: false } : false,
        
        // RENDER FREE TIER : Max 5 connexions simultanées (on garde une marge)
        max: isRenderOrCloud ? 5 : 20,
        
        // Timeout augmenté pour Render (réseau plus lent que local) - 30s pour cloud, 10s pour local
        connectionTimeoutMillis: isRenderOrCloud ? 30000 : 10000,
        
        // Temps avant de fermer une connexion inactive (garde les connexions un peu plus longtemps)
        idleTimeoutMillis: 60000, // 1 minute
        
        // Fermer les connexions trop anciennes (évite les connexions zombies)
        maxUses: 7500, // Une connexion est fermée après 7500 requêtes
        
        // Keep-alive pour éviter que Render ferme les connexions inactives
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000, // 10s
        
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
        connectionTimeoutMillis: 5000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      };
    }

    this.pool = new Pool(poolConfig);

    // Gestion des erreurs du pool
    this.pool.on('error', (err, client) => {
      // Gestion silencieuse des erreurs du pool
    });
    
  }

  async onModuleInit() {
    const maxAttempts = 5;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const client = await this.pool.connect();
        const result = await client.query('SELECT NOW()');

        client.release();
        return; // Succès, on sort de la fonction
      } catch (error: any) {
        lastError = error;

        if (attempt < maxAttempts) {
          const delayMs = attempt * 2000; // Délai progressif: 2s, 4s, 6s, 8s
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    throw lastError;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async getClient() {
    return await this.pool.connect();
  }

  /**
   * Exécute une requête SQL avec retry automatique en cas d'erreur de connexion
   * @param text Requête SQL
   * @param params Paramètres de la requête
   * @param maxRetries Nombre maximum de tentatives (défaut: 3)
   * @param retryDelay Délai entre les tentatives en ms (défaut: 1000)
   */
  async query(text: string, params?: any[], maxRetries: number = 3, retryDelay: number = 1000) {
    const start = Date.now();
    const slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10);
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.pool.query(text, params);
        const duration = Date.now() - start;
        
        
        return result;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message || String(error);
        const duration = Date.now() - start;
        
        // Vérifier si c'est une erreur de connexion qui mérite un retry
        const isConnectionError = 
          errorMessage.includes('Connection terminated') ||
          errorMessage.includes('connection timeout') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('Connection closed') ||
          error.code === 'ECONNRESET' ||
          error.code === '57P01'; // PostgreSQL "terminating connection due to administrator command"
        
        if (isConnectionError && attempt < maxRetries) {
          // Attendre avant de réessayer
          await new Promise(resolve => setTimeout(resolve, retryDelay));

          // Augmenter progressivement le délai (exponential backoff)
          retryDelay *= 1.5;
        } else {
          // Ce n'est pas une erreur de connexion OU on a épuisé les retries
          break;
        }
      }
    }
    
    // Si on arrive ici, toutes les tentatives ont échoué
    throw lastError;
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
