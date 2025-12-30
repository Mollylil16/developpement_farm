/**
 * Script d'importation de la base de connaissances Markdown dans PostgreSQL
 * 
 * Usage:
 *   npm run import:knowledge-base
 *   ou
 *   ts-node scripts/import-knowledge-base.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

// Charger les variables d'environnement (si dotenv est disponible)
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '../.env') });
} catch (e) {
  // dotenv n'est pas installé, utiliser les variables d'environnement du système
}

interface MarkdownFile {
  filePath: string;
  fileName: string;
  category: string;
  title: string;
  keywords: string[];
  content: string;
  summary: string;
  priority: number;
}

/**
 * Parse un fichier Markdown et extrait les métadonnées
 */
function parseMarkdownFile(filePath: string): MarkdownFile | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');
    
    // Extraire le titre (première ligne #)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (!titleMatch) {
      return null;
    }
    const title = titleMatch[1].trim();

    // Extraire la catégorie (ligne **Catégorie:**)
    const categoryMatch = content.match(/\*\*Catégorie:\*\*\s*`?([^`\n]+)`?/);
    if (!categoryMatch) {
      return null;
    }
    const category = categoryMatch[1].trim();
    
    // Extraire les mots-clés (ligne **Mots-clés:**)
    const keywordsMatch = content.match(/\*\*Mots-clés:\*\*\s*(.+)$/m);
    let keywords: string[] = [];
    if (keywordsMatch) {
      keywords = keywordsMatch[1]
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
    }
    
    // Générer un résumé (premières 200 caractères du contenu, après les métadonnées)
    const contentStart = content.indexOf('---', content.indexOf('---') + 3) + 3;
    const mainContent = content.substring(contentStart).trim();
    const summary = mainContent
      .split('\n')
      .filter(line => !line.startsWith('#') && line.trim().length > 0)
      .slice(0, 3)
      .join(' ')
      .substring(0, 200)
      .trim();
    
    // Déterminer la priorité selon le numéro du fichier
    const fileNumberMatch = fileName.match(/^(\d+)-/);
    const priority = fileNumberMatch ? 10 - parseInt(fileNumberMatch[1]) + 1 : 5;
    
    return {
      filePath,
      fileName,
      category,
      title,
      keywords,
      content: content.trim(),
      summary: summary || null,
      priority: Math.max(1, Math.min(10, priority)),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Se connecte à la base de données PostgreSQL
 */
function createDatabasePool(): Pool {
  let poolConfig;
  
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    poolConfig = {
      connectionString: url,
      ssl: url.includes('sslmode=require') || url.includes('ssl=true')
        ? { rejectUnauthorized: false } 
        : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  } else {
    // Par défaut, essayer sans SSL, mais permettre de forcer SSL
    // Si l'erreur "SSL/TLS required" apparaît, mettre DB_SSL=true dans .env
    const requiresSSL = process.env.DB_SSL === 'true' || process.env.DB_REQUIRE_SSL === 'true';
    
    poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'farmtrack_db',
      user: process.env.DB_USER || 'farmtrack_user',
      password: process.env.DB_PASSWORD || 'postgres',
      // Essayer avec SSL si requis, sinon sans
      ssl: requiresSSL ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }
  
  // Si la connexion échoue avec "SSL/TLS required", réessayer avec SSL
  // Cette logique sera gérée dans le try/catch de main()
  
  return new Pool(poolConfig);
}

/**
 * Vérifie si un contenu existe déjà (par titre)
 */
async function knowledgeExists(pool: Pool, title: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT id FROM knowledge_base WHERE title = $1 AND is_active = true',
    [title]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * Insère ou met à jour un contenu dans la base de connaissances
 */
async function upsertKnowledge(
  pool: Pool,
  knowledge: MarkdownFile,
  userId?: string
): Promise<{ id: string; action: 'created' | 'updated' }> {
  const existingId = await knowledgeExists(pool, knowledge.title);
  
  if (existingId) {
    // Mise à jour
    await pool.query(
      `UPDATE knowledge_base 
       SET category = $1, keywords = $2, content = $3, summary = $4, 
           priority = $5, updated_at = NOW()
       WHERE id = $6`,
      [
        knowledge.category,
        knowledge.keywords,
        knowledge.content,
        knowledge.summary,
        knowledge.priority,
        existingId,
      ]
    );
    return { id: existingId, action: 'updated' };
  } else {
    // Création
    const id = `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await pool.query(
      `INSERT INTO knowledge_base (
        id, category, title, keywords, content, summary, 
        priority, visibility, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        knowledge.category,
        knowledge.title,
        knowledge.keywords,
        knowledge.content,
        knowledge.summary,
        knowledge.priority,
        'global',
        userId || null,
      ]
    );
    return { id, action: 'created' };
  }
}

/**
 * Fonction principale
 */
async function main() {
  // Chemin vers les fichiers Markdown
  const markdownDir = path.join(__dirname, '../../src/services/chatAgent/knowledge/markdown');

  if (!fs.existsSync(markdownDir)) {
    process.exit(1);
  }
  
  // Lister les fichiers Markdown (exclure README.md)
  const files = fs.readdirSync(markdownDir)
    .filter(file => file.endsWith('.md') && file !== 'README.md')
    .sort() // Trier pour importer dans l'ordre
    .map(file => path.join(markdownDir, file));
  
  if (files.length === 0) {
    process.exit(1);
  }

  // Parser les fichiers
  const knowledgeItems: MarkdownFile[] = [];
  for (const file of files) {
    const parsed = parseMarkdownFile(file);
    if (parsed) {
      knowledgeItems.push(parsed);
    }
  }

  if (knowledgeItems.length === 0) {
    process.exit(1);
  }
  
  // Se connecter à la base de données (avec retry SSL si nécessaire)
  let pool = createDatabasePool();
  let sslRetried = false;

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const isTransientDbError = (err: any): boolean => {
    const code = err?.code || err?.errno;
    return (
      code === 'ECONNRESET' ||
      code === 'ETIMEDOUT' ||
      code === 'EPIPE' ||
      code === 'ENOTFOUND' ||
      code === 'ECONNREFUSED'
    );
  };

  async function ensureConnected(maxAttempts: number = 5): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await pool.query('SELECT NOW()');
        return;
      } catch (connError: any) {
        // SSL required case (retry once with ssl enforced)
        if (
          connError?.code === '28000' &&
          connError?.message?.includes('SSL/TLS required') &&
          !sslRetried
        ) {
          try { await pool.end(); } catch {}

          if (process.env.DATABASE_URL) {
            const url = process.env.DATABASE_URL;
            const newUrl = url.includes('sslmode=') ? url : url + (url.includes('?') ? '&' : '?') + 'sslmode=require';
            process.env.DATABASE_URL = newUrl;
          } else {
            process.env.DB_SSL = 'true';
          }

          pool = createDatabasePool();
          sslRetried = true;
          continue;
        }

        if (isTransientDbError(connError) && attempt < maxAttempts) {
          try { await pool.end(); } catch {}
          pool = createDatabasePool();
          await sleep(attempt * 1000);
          continue;
        }

        throw connError;
      }
    }
  }
  
  await ensureConnected();
  
  try {
    
    // Importer chaque fichier
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    for (const knowledge of knowledgeItems) {
      try {
        let result = await upsertKnowledge(pool, knowledge);
        // Si la connexion se coupe en cours d'import, refaire une tentative rapide
        // (utile avec DB distante qui ferme les connexions inactives)
        if (!result) {
          result = await upsertKnowledge(pool, knowledge);
        }
        if (result.action === 'created') {
          created++;
        } else {
          updated++;
        }
      } catch (error: any) {
        if (isTransientDbError(error)) {
          try {
            try { await pool.end(); } catch {}
            pool = createDatabasePool();
            await ensureConnected(3);
            const retryResult = await upsertKnowledge(pool, knowledge);
            if (retryResult.action === 'created') {
              created++;
            } else {
              updated++;
            }
            continue;
          } catch (retryError) {
            errors++;
            continue;
          }
        }
        errors++;
      }
    }
    
    if (errors === 0) {
      // Succès
    } else {
      process.exit(1);
    }
  } catch (error) {
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch((error) => {
    process.exit(1);
  });
}

export { main, parseMarkdownFile, upsertKnowledge };

