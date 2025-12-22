/**
 * Script pour exécuter les migrations SQL
 * Usage: tsx scripts/run-migrations.ts
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
    ssl: process.env.DATABASE_URL.includes('render.com') || process.env.DATABASE_URL.includes('sslmode=require')
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

async function runMigrations() {
  // @ts-ignore - TypeScript a du mal avec le type Pool
  const client = await pool.connect();

  try {
    // Obtenir le répertoire du script (CommonJS avec tsx)
    // @ts-ignore - __dirname est disponible dans CommonJS avec tsx
    const scriptDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(process.argv[1] || '');
    const migrationsDir = path.resolve(scriptDir, '../database/migrations');

    // Lire automatiquement TOUS les fichiers .sql et les trier par ordre numérique
    const migrations = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort((a, b) => {
        // Extraire le numéro de migration (ex: "000" de "000_create_users_table.sql")
        const numA = parseInt(a.split('_')[0]);
        const numB = parseInt(b.split('_')[0]);
        return numA - numB;
      });

    console.log('🚀 Début de l\'exécution des migrations...');
    console.log(`📊 ${migrations.length} migrations trouvées\n`);

    for (const migrationFile of migrations) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      
      if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Fichier de migration introuvable: ${migrationFile}`);
        continue;
      }

      console.log(`📄 Exécution de: ${migrationFile}`);
      
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await client.query(sql);
        console.log(`✅ Migration ${migrationFile} exécutée avec succès\n`);
      } catch (error: any) {
        // Si la table/trigger/index existe déjà, on continue (IF NOT EXISTS)
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('existe déjà') ||
            error.code === '42710') { // Code PostgreSQL pour "objet existe déjà"
          console.log(`⚠️  Migration ${migrationFile} déjà appliquée (ignorée)\n`);
        } else {
          console.error(`❌ Erreur lors de l'exécution de ${migrationFile}:`, error.message);
          throw error;
        }
      }
    }

    console.log('✅ Toutes les migrations ont été exécutées avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des migrations:', error);
    throw error;
  } finally {
    client.release();
    // @ts-ignore - TypeScript a du mal avec le type Pool
    await pool.end();
  }
}

// Exécuter le script
runMigrations()
  .then(() => {
    console.log('\n✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  });


