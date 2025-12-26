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
        
        // Log des connexions pour debug
        log: process.env.NODE_ENV === 'development' ? console.log : undefined,
      };
      
      console.log(`🔌 Configuration PostgreSQL pour ${isRenderOrCloud ? 'CLOUD (Render/Railway)' : 'DATABASE_URL'}`);
      console.log(`   Max connexions: ${poolConfig.max}`);
      console.log(`   Timeout: ${poolConfig.connectionTimeoutMillis}ms`);
      console.log(`   SSL: ${poolConfig.ssl ? 'Activé' : 'Désactivé'}`);
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
      
      console.log('🔌 Configuration PostgreSQL LOCALE');
    }

    this.pool = new Pool(poolConfig);

    // Gestion des erreurs du pool
    this.pool.on('error', (err, client) => {
      console.error('❌ Erreur inattendue dans le pool PostgreSQL:', err);
      console.error('   Client concerné:', client ? 'Oui' : 'Non');
    });
    
    // Log du nombre de connexions actives (pour debug)
    this.pool.on('connect', (client) => {
      const totalCount = this.pool.totalCount;
      const idleCount = this.pool.idleCount;
      const waitingCount = this.pool.waitingCount;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔗 Nouvelle connexion PostgreSQL (Total: ${totalCount}, Idle: ${idleCount}, Waiting: ${waitingCount})`);
      }
    });
    
    // Log des connexions libérées
    this.pool.on('remove', (client) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔓 Connexion PostgreSQL libérée (Total restant: ${this.pool.totalCount})`);
      }
    });
  }

  async onModuleInit() {
    const maxAttempts = 5;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔌 Tentative de connexion PostgreSQL (${attempt}/${maxAttempts})...`);
        
        const client = await this.pool.connect();
        const result = await client.query('SELECT NOW()');
        
        console.log('✅ Connexion PostgreSQL établie avec succès');
        console.log(`📅 Heure serveur: ${result.rows[0].now}`);
        console.log(`📊 Pool status: ${this.pool.totalCount} total, ${this.pool.idleCount} idle`);
        
        client.release();
        return; // Succès, on sort de la fonction
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Tentative ${attempt}/${maxAttempts} échouée:`, error.message);
        
        if (attempt < maxAttempts) {
          const delayMs = attempt * 2000; // Délai progressif: 2s, 4s, 6s, 8s
          console.log(`⏳ Nouvelle tentative dans ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    // Si on arrive ici, toutes les tentatives ont échoué
    console.error('❌ Impossible de se connecter à PostgreSQL après', maxAttempts, 'tentatives');
    console.error('   DATABASE_URL:', process.env.DATABASE_URL ? 'Défini' : 'Non défini');
    throw lastError;
  }

  async onModuleDestroy() {
    await this.pool.end();
    console.log('🔌 Pool PostgreSQL fermé');
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
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.pool.query(text, params);
        const duration = Date.now() - start;
        
        if (duration > 1000) {
          console.log(`⚠️ Query lente (${duration}ms): ${text.substring(0, 50)}...`);
        }
        
        // Si on réussit après un retry, le signaler
        if (attempt > 1) {
          console.log(`✅ Query réussie après ${attempt} tentative(s)`);
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message || String(error);
        
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
          console.warn(`⚠️ Erreur de connexion PostgreSQL (tentative ${attempt}/${maxRetries}), retry dans ${retryDelay}ms...`);
          console.warn(`   Erreur: ${errorMessage.substring(0, 100)}`);
          
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
    console.error("❌ Erreur lors de l'exécution de la requête après", maxRetries, "tentative(s):", lastError);
    console.error('Query:', text);
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
