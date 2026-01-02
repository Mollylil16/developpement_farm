/**
 * Script pour vérifier que la migration 063 a été appliquée
 * Usage: tsx scripts/check-migration-063.ts
 */

import { Pool } from 'pg';
import * as path from 'path';
import dotenv from 'dotenv';

// Charger le fichier .env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Support pour DATABASE_URL ou variables individuelles
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

async function checkMigration063() {
  const client = await pool.connect();

  try {
    console.log('\n========================================');
    console.log('  Vérification Migration 063');
    console.log('========================================\n');

    let allOk = true;

    // 1. Vérifier les colonnes batch_pigs
    console.log('📋 Vérification des colonnes batch_pigs...');
    const batchPigsColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'batch_pigs' 
      AND column_name IN ('marketplace_status', 'marketplace_listing_id', 'listed_at', 'sold_at')
    `);

    if (batchPigsColumns.rows.length === 4) {
      console.log('  ✅ Colonnes batch_pigs OK (4/4)');
      batchPigsColumns.rows.forEach(row => {
        console.log(`     - ${row.column_name}`);
      });
    } else {
      console.log(`  ❌ Colonnes batch_pigs manquantes (${batchPigsColumns.rows.length}/4)`);
      allOk = false;
    }

    // 2. Vérifier les colonnes batches
    console.log('\n📋 Vérification des colonnes batches...');
    const batchesColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'batches' 
      AND column_name IN ('marketplace_status', 'marketplace_listed_count')
    `);

    if (batchesColumns.rows.length === 2) {
      console.log('  ✅ Colonnes batches OK (2/2)');
      batchesColumns.rows.forEach(row => {
        console.log(`     - ${row.column_name}`);
      });
    } else {
      console.log(`  ❌ Colonnes batches manquantes (${batchesColumns.rows.length}/2)`);
      allOk = false;
    }

    // 3. Vérifier le trigger
    console.log('\n📋 Vérification du trigger...');
    const trigger = await client.query(`
      SELECT tgname 
      FROM pg_trigger 
      WHERE tgname = 'trigger_sync_batch_marketplace_status'
    `);

    if (trigger.rows.length >= 1) {
      console.log('  ✅ Trigger de synchronisation OK');
    } else {
      console.log('  ❌ Trigger de synchronisation manquant');
      allOk = false;
    }

    // 4. Vérifier la vue enrichie
    console.log('\n📋 Vérification de la vue enrichie...');
    const view = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name = 'v_marketplace_listings_enriched'
    `);

    if (view.rows.length === 1) {
      console.log('  ✅ Vue enrichie OK');
    } else {
      console.log('  ❌ Vue enrichie manquante');
      allOk = false;
    }

    // 5. Vérifier la contrainte weight NOT NULL
    console.log('\n📋 Vérification de la contrainte weight...');
    const weightConstraint = await client.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'marketplace_listings' 
      AND column_name = 'weight'
    `);

    if (weightConstraint.rows.length > 0 && weightConstraint.rows[0].is_nullable === 'NO') {
      console.log('  ✅ Contrainte weight NOT NULL OK');
    } else if (weightConstraint.rows.length > 0) {
      console.log('  ⚠️  Colonne weight existe mais nullable (migration partielle)');
    } else {
      console.log('  ❌ Colonne weight manquante');
      allOk = false;
    }

    // 6. Statistiques
    console.log('\n📊 Statistiques marketplace...');
    const stats = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE listing_type = 'individual') as individuels,
        COUNT(*) FILTER (WHERE listing_type = 'batch') as bandes,
        COUNT(*) FILTER (WHERE status = 'available') as disponibles
      FROM marketplace_listings
      WHERE status != 'removed'
    `);

    if (stats.rows.length > 0) {
      const { individuels, bandes, disponibles } = stats.rows[0];
      console.log(`  Listings individuels: ${individuels}`);
      console.log(`  Listings bandes: ${bandes}`);
      console.log(`  Listings disponibles: ${disponibles}`);
    }

    console.log('\n========================================');
    if (allOk) {
      console.log('✅ Migration 063 appliquée avec succès!');
      console.log('========================================\n');
      console.log('Prochaines étapes:');
      console.log('  1. Redémarrer le backend: npm run start:dev');
      console.log('  2. Tester les endpoints marketplace');
      console.log('  3. Consulter: GUIDE_DEPLOIEMENT.md\n');
      return 0;
    } else {
      console.log('❌ Migration 063 incomplète ou non appliquée');
      console.log('========================================\n');
      console.log('Pour appliquer la migration:');
      console.log('  npm run migrate\n');
      return 1;
    }
  } catch (error: any) {
    console.error('\n❌ Erreur lors de la vérification:', error.message);
    return 1;
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécuter le script
checkMigration063()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });

