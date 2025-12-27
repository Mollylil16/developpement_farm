/**
 * Script pour exécuter une migration SQL spécifique
 * Usage: tsx scripts/run-single-migration.ts <migration-file>
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Charger le fichier .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Erreur: Nom de fichier de migration requis');
  console.error('Usage: tsx scripts/run-single-migration.ts <migration-file>');
  process.exit(1);
}

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

async function runMigration() {
  const scriptDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(process.argv[1] || '');
  const migrationsDir = path.resolve(scriptDir, '../database/migrations');
  const migrationPath = path.join(migrationsDir, migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Erreur: Fichier de migration introuvable: ${migrationPath}`);
    process.exit(1);
  }

  console.log(`🚀 Exécution de la migration: ${migrationFile}`);
  console.log(`📄 Chemin: ${migrationPath}\n`);

  const client = await pool.connect();

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(sql);
    console.log(`✅ Migration ${migrationFile} exécutée avec succès !\n`);
  } catch (error: any) {
    // Si la table/trigger/index existe déjà, on continue (IF NOT EXISTS)
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate') ||
        error.message.includes('existe déjà') ||
        error.code === '42710') {
      console.log(`⚠️  Migration ${migrationFile} déjà appliquée (ignorée)\n`);
    } else {
      console.error(`❌ Erreur lors de l'exécution de ${migrationFile}:`, error.message);
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécuter le script
runMigration()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  });

