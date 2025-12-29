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
  console.log('ℹ️  Utilisation des variables d\'environnement du système');
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
      console.warn(`⚠️  Pas de titre trouvé dans ${fileName}`);
      return null;
    }
    const title = titleMatch[1].trim();
    
    // Extraire la catégorie (ligne **Catégorie:**)
    const categoryMatch = content.match(/\*\*Catégorie:\*\*\s*`?([^`\n]+)`?/);
    if (!categoryMatch) {
      console.warn(`⚠️  Pas de catégorie trouvée dans ${fileName}`);
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
    console.error(`❌ Erreur lors du parsing de ${filePath}:`, error);
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
  console.log('🚀 Démarrage de l\'importation de la base de connaissances...\n');
  
  // Chemin vers les fichiers Markdown
  const markdownDir = path.join(__dirname, '../../src/services/chatAgent/knowledge/markdown');
  
  if (!fs.existsSync(markdownDir)) {
    console.error(`❌ Le dossier ${markdownDir} n'existe pas !`);
    process.exit(1);
  }
  
  // Lister les fichiers Markdown (exclure README.md)
  const files = fs.readdirSync(markdownDir)
    .filter(file => file.endsWith('.md') && file !== 'README.md')
    .sort() // Trier pour importer dans l'ordre
    .map(file => path.join(markdownDir, file));
  
  if (files.length === 0) {
    console.error(`❌ Aucun fichier Markdown trouvé dans ${markdownDir} !`);
    process.exit(1);
  }
  
  console.log(`📁 ${files.length} fichier(s) Markdown trouvé(s)\n`);
  
  // Parser les fichiers
  const knowledgeItems: MarkdownFile[] = [];
  for (const file of files) {
    const parsed = parseMarkdownFile(file);
    if (parsed) {
      knowledgeItems.push(parsed);
      console.log(`✅ Parsé: ${parsed.title} (${parsed.category})`);
    }
  }
  
  if (knowledgeItems.length === 0) {
    console.error('❌ Aucun fichier valide à importer !');
    process.exit(1);
  }
  
  console.log(`\n📊 ${knowledgeItems.length} fichier(s) valide(s) à importer\n`);
  
  // Se connecter à la base de données (avec retry SSL si nécessaire)
  let pool = createDatabasePool();
  let sslRetried = false;
  
  try {
    // Tester la connexion
    await pool.query('SELECT NOW()');
    console.log('✅ Connexion à la base de données établie\n');
  } catch (connError: any) {
    // Si erreur SSL/TLS required et qu'on n'a pas encore essayé avec SSL, réessayer
    if (connError.code === '28000' && connError.message?.includes('SSL/TLS required') && !sslRetried) {
      console.log('⚠️  SSL requis détecté, nouvelle tentative avec SSL...\n');
      await pool.end();
      
      // Forcer SSL
      if (process.env.DATABASE_URL) {
        // Ajouter sslmode=require à l'URL si pas déjà présent
        const url = process.env.DATABASE_URL;
        const newUrl = url.includes('sslmode=') ? url : url + (url.includes('?') ? '&' : '?') + 'sslmode=require';
        process.env.DATABASE_URL = newUrl;
      } else {
        process.env.DB_SSL = 'true';
      }
      
      pool = createDatabasePool();
      sslRetried = true;
      
      try {
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion à la base de données établie (avec SSL)\n');
      } catch (retryError) {
        throw retryError;
      }
    } else {
      throw connError;
    }
  }
  
  try {
    
    // Importer chaque fichier
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    for (const knowledge of knowledgeItems) {
      try {
        const result = await upsertKnowledge(pool, knowledge);
        if (result.action === 'created') {
          created++;
          console.log(`✅ Créé: ${knowledge.title}`);
        } else {
          updated++;
          console.log(`🔄 Mis à jour: ${knowledge.title}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Erreur lors de l'importation de ${knowledge.title}:`, error);
      }
    }
    
    console.log('\n📈 Résumé de l\'importation:');
    console.log(`   ✅ Créés: ${created}`);
    console.log(`   🔄 Mis à jour: ${updated}`);
    console.log(`   ❌ Erreurs: ${errors}`);
    console.log(`   📊 Total: ${knowledgeItems.length}\n`);
    
    if (errors === 0) {
      console.log('🎉 Importation terminée avec succès !\n');
    } else {
      console.log('⚠️  Importation terminée avec des erreurs\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}

export { main, parseMarkdownFile, upsertKnowledge };

