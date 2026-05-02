/**
 * Script pour exécuter le script SQL d'optimisation des index du Marketplace
 * Usage: tsx scripts/run-marketplace-indexes.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Charger le fichier .env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Support pour DATABASE_URL (Railway, Heroku, Render, etc.) ou variables individuelles
let poolConfig: any;
if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('render.com') || 
         process.env.DATABASE_URL.includes('sslmode=require') ||
         process.env.DATABASE_URL.includes('railway.app')
      ? { rejectUnauthorized: false } 
      : false,
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'farmtrack_db',
    user: process.env.DB_USER || 'farmtrack_user',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

const pool = new Pool(poolConfig);

async function runMarketplaceIndexes() {
  const scriptDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(process.argv[1] || '');
  const sqlPath = path.resolve(scriptDir, '../src/marketplace/migrations/add-marketplace-indexes.sql');

  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Erreur: Fichier SQL introuvable: ${sqlPath}`);
    process.exit(1);
  }

  console.log(`🚀 Exécution du script SQL d'optimisation des index du Marketplace`);
  console.log(`📄 Chemin: ${sqlPath}\n`);

  const client = await pool.connect();

  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Exécution du script SQL...\n');
    await client.query(sql);
    
    // Vérifier les index créés
    console.log('\n📊 Vérification des index créés...\n');
    const indexResult = await client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'marketplace_listings'
        AND indexname LIKE 'idx_marketplace_listings%'
      ORDER BY indexname;
    `);

    if (indexResult.rows.length > 0) {
      console.log('✅ Index créés avec succès :\n');
      indexResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.indexname}`);
      });
      console.log(`\n📈 Total: ${indexResult.rows.length} index créés\n`);
    } else {
      console.log('⚠️  Aucun index trouvé. Vérifiez que la table marketplace_listings existe.\n');
    }

    console.log('✅ Script SQL exécuté avec succès !\n');
  } catch (error: any) {
    // Si l'index existe déjà, on continue (IF NOT EXISTS)
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate') ||
        error.message.includes('existe déjà') ||
        error.code === '42710') {
      console.log(`⚠️  Certains index existent déjà (ignorés)\n`);
    } else {
      console.error(`❌ Erreur lors de l'exécution du script SQL:`, error.message);
      if (error.position) {
        console.error(`   Position: ${error.position}`);
      }
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécuter le script
runMarketplaceIndexes()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  });
