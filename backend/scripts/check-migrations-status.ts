/**
 * Script pour vérifier si les migrations ont été appliquées sur la base de données
 * Usage: tsx scripts/check-migrations-status.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Charger le fichier .env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Support pour DATABASE_URL (Render, Railway, etc.) ou variables individuelles
let poolConfig: any;
if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('render.com') || 
         process.env.DATABASE_URL.includes('railway.app') ||
         process.env.DATABASE_URL.includes('sslmode=require')
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

async function checkMigrationsStatus() {
  const client = await pool.connect();

  try {
    console.log('\n========================================');
    console.log('  Vérification des migrations');
    console.log('========================================\n');

    // Compter le nombre total de migrations
    const fs = await import('fs');
    const scriptDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(process.argv[1] || '');
    const migrationsDir = path.resolve(scriptDir, '../database/migrations');
    const allMigrations = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .filter(file => /^\d+_/.test(file))
      .sort((a, b) => {
        const numA = parseInt(a.split('_')[0]);
        const numB = parseInt(b.split('_')[0]);
        return numA - numB;
      });

    console.log(`📊 Total de migrations disponibles: ${allMigrations.length}`);
    console.log(`   Dernière migration: ${allMigrations[allMigrations.length - 1]}\n`);

    // Vérifier la migration 042 : management_method
    console.log('🔍 Vérification migration 042: management_method...');
    try {
      const result042 = await client.query(`
        SELECT 
          column_name, 
          data_type, 
          column_default,
          is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'projets' 
          AND column_name = 'management_method'
      `);

      if (result042.rows.length > 0) {
        console.log('   ✅ Colonne management_method existe');
        console.log(`      Type: ${result042.rows[0].data_type}`);
        console.log(`      Défaut: ${result042.rows[0].column_default}`);
      } else {
        console.log('   ❌ Colonne management_method N\'EXISTE PAS');
        console.log('   ⚠️  Migration 042 non appliquée !');
      }
    } catch (error: any) {
      console.log('   ❌ Erreur lors de la vérification:', error.message);
    }

    console.log('');

    // Vérifier la migration 043 : table batches
    console.log('🔍 Vérification migration 043: table batches...');
    try {
      const result043 = await client.query(`
        SELECT 
          table_name
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'batches'
      `);

      if (result043.rows.length > 0) {
        console.log('   ✅ Table batches existe');
        
        // Vérifier les colonnes importantes
        const columns = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'batches'
          ORDER BY ordinal_position
        `);
        
        console.log(`      Colonnes trouvées: ${columns.rows.length}`);
        const importantColumns = ['id', 'projet_id', 'pen_name', 'category', 'total_count'];
        const foundColumns = columns.rows.map((r: any) => r.column_name);
        const missingColumns = importantColumns.filter(col => !foundColumns.includes(col));
        
        if (missingColumns.length === 0) {
          console.log('   ✅ Toutes les colonnes importantes sont présentes');
        } else {
          console.log(`   ⚠️  Colonnes manquantes: ${missingColumns.join(', ')}`);
        }
      } else {
        console.log('   ❌ Table batches N\'EXISTE PAS');
        console.log('   ⚠️  Migration 043 non appliquée !');
      }
    } catch (error: any) {
      console.log('   ❌ Erreur lors de la vérification:', error.message);
    }

    console.log('');

    // Vérifier les index
    console.log('🔍 Vérification des index...');
    try {
      const index042 = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'projets' 
          AND indexname = 'idx_projets_management_method'
      `);
      
      if (index042.rows.length > 0) {
        console.log('   ✅ Index idx_projets_management_method existe');
      } else {
        console.log('   ⚠️  Index idx_projets_management_method manquant');
      }

      const index043 = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'batches' 
          AND indexname IN ('idx_batches_projet', 'idx_batches_category', 'idx_batches_pen')
      `);
      
      if (index043.rows.length >= 3) {
        console.log(`   ✅ ${index043.rows.length}/3 index de batches existent`);
      } else {
        console.log(`   ⚠️  Seulement ${index043.rows.length}/3 index de batches trouvés`);
      }
    } catch (error: any) {
      console.log('   ⚠️  Erreur lors de la vérification des index:', error.message);
    }

    console.log('\n========================================');
    console.log('  Résumé');
    console.log('========================================\n');
    
    // Test final : essayer de sélectionner management_method
    try {
      await client.query('SELECT management_method FROM projets LIMIT 1');
      console.log('✅ La colonne management_method est accessible');
    } catch (error: any) {
      console.log('❌ Impossible d\'accéder à management_method:', error.message);
      console.log('   → Migration 042 non appliquée\n');
    }

    try {
      await client.query('SELECT * FROM batches LIMIT 1');
      console.log('✅ La table batches est accessible');
    } catch (error: any) {
      console.log('❌ Impossible d\'accéder à batches:', error.message);
      console.log('   → Migration 043 non appliquée\n');
    }

    console.log('\n💡 Pour appliquer les migrations:');
    console.log('   npm run migrate\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécuter le script
checkMigrationsStatus()
  .then(() => {
    console.log('\n✅ Vérification terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  });

