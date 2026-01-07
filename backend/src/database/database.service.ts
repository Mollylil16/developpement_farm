import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
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
        console.log('✅ Connexion à la base de données établie avec succès');
        return; // Succès, on sort de la fonction
      } catch (error: any) {
        lastError = error;

        // Détecter les erreurs spécifiques et donner des messages clairs
        if (error.code === 'ENOTFOUND') {
          const hostname = error.hostname || 'inconnu';
          console.error(`\n❌ ERREUR DE CONNEXION À LA BASE DE DONNÉES`);
          console.error(`   Hostname introuvable: ${hostname}`);
          console.error(`   Code d'erreur: ${error.code}`);
          console.error(`\n💡 SOLUTIONS POSSIBLES:`);
          console.error(`   1. Vérifiez que la base de données existe et est accessible`);
          console.error(`   2. Vérifiez votre connexion Internet`);
          console.error(`   3. Si vous utilisez DATABASE_URL, vérifiez qu'elle est correcte`);
          console.error(`   4. Pour utiliser une base locale, supprimez DATABASE_URL et configurez:`);
          console.error(`      DB_HOST=localhost`);
          console.error(`      DB_PORT=5432`);
          console.error(`      DB_NAME=farmtrack_db`);
          console.error(`      DB_USER=farmtrack_user`);
          console.error(`      DB_PASSWORD=votre_mot_de_passe\n`);
        } else if (error.code === 'ECONNREFUSED') {
          console.error(`\n❌ ERREUR DE CONNEXION: Le serveur PostgreSQL refuse la connexion`);
          console.error(`   Vérifiez que PostgreSQL est démarré et accessible\n`);
        } else if (error.code === 'ETIMEDOUT') {
          console.error(`\n❌ ERREUR DE CONNEXION: Timeout - Le serveur ne répond pas`);
          console.error(`   Vérifiez votre connexion réseau et les paramètres de timeout\n`);
        }

        if (attempt < maxAttempts) {
          const delayMs = attempt * 2000; // Délai progressif: 2s, 4s, 6s, 8s
          console.log(`   Tentative ${attempt}/${maxAttempts} échouée. Nouvelle tentative dans ${delayMs/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    // Améliorer le message d'erreur final
    if (lastError?.code === 'ENOTFOUND') {
      const enhancedError = new Error(
        `Impossible de se connecter à la base de données: hostname '${lastError.hostname}' introuvable. ` +
        `Vérifiez votre DATABASE_URL ou configurez une connexion locale avec DB_HOST, DB_PORT, etc.`
      );
      enhancedError.stack = lastError.stack;
      throw enhancedError;
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
          error.code === 'ENOTFOUND' || // Hostname introuvable
          error.code === '57P01'; // PostgreSQL "terminating connection due to administrator command"
        
        // Pour ENOTFOUND, ne pas retry (c'est un problème de configuration)
        if (error.code === 'ENOTFOUND') {
          const hostname = error.hostname || 'inconnu';
          const enhancedError = new Error(
            `Erreur de connexion à la base de données: hostname '${hostname}' introuvable (ENOTFOUND). ` +
            `Vérifiez que DATABASE_URL est correcte ou configurez une connexion locale.`
          );
          enhancedError.stack = error.stack;
          throw enhancedError;
        }
        
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
      
      // NOTE: La vérification pg_transaction_status() a été supprimée car elle n'est pas supportée
      // par CockroachDB/Neon et causait la corruption de la transaction (COMMIT converti en ROLLBACK).
      
      await client.query('COMMIT');
      
      return result;
    } catch (error: any) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError: any) {
        // Ne pas throw ici pour éviter de masquer l'erreur originale
      }
      
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
