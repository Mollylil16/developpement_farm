/**
 * Script pour vérifier si toutes les migrations ont été appliquées
 * Vérifie les migrations critiques et donne un résumé complet
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

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

interface MigrationCheck {
  num: string;
  name: string;
  status: '✅' | '❌' | '⚠️';
  details: string;
}

async function checkTableExists(client: any, tableName: string): Promise<boolean> {
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = $1
  `, [tableName]);
  return result.rows.length > 0;
}

async function checkColumnExists(client: any, tableName: string, columnName: string): Promise<boolean> {
  const result = await client.query(`
    SELECT column_name
    FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = $2
  `, [tableName, columnName]);
  return result.rows.length > 0;
}

async function checkAllMigrations() {
  const client = await pool.connect();

  try {
    console.log('\n========================================');
    console.log('  Vérification de TOUTES les migrations');
    console.log('========================================\n');

    // Lire toutes les migrations
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

    console.log(`📊 Total de migrations: ${allMigrations.length}\n`);

    const checks: MigrationCheck[] = [];

    // Vérifier les migrations critiques
    console.log('🔍 Vérification des migrations critiques...\n');

    // Migration 003: projets
    const hasProjets = await checkTableExists(client, 'projets');
    checks.push({
      num: '003',
      name: 'create_projets_table',
      status: hasProjets ? '✅' : '❌',
      details: hasProjets ? 'Table projets existe' : 'Table projets manquante'
    });

    // Migration 004: production_animaux
    const hasAnimaux = await checkTableExists(client, 'production_animaux');
    checks.push({
      num: '004',
      name: 'create_production_animaux_table',
      status: hasAnimaux ? '✅' : '❌',
      details: hasAnimaux ? 'Table production_animaux existe' : 'Table manquante'
    });

    // Migration 042: management_method
    const hasManagementMethod = await checkColumnExists(client, 'projets', 'management_method');
    checks.push({
      num: '042',
      name: 'add_management_method_to_projets',
      status: hasManagementMethod ? '✅' : '❌',
      details: hasManagementMethod ? 'Colonne management_method existe' : 'Colonne manquante - MIGRATION CRITIQUE'
    });

    // Migration 043: batches
    const hasBatches = await checkTableExists(client, 'batches');
    checks.push({
      num: '043',
      name: 'create_batches_table',
      status: hasBatches ? '✅' : '❌',
      details: hasBatches ? 'Table batches existe' : 'Table manquante - MIGRATION CRITIQUE'
    });

    // Migration 045: batch_pigs
    const hasBatchPigs = await checkTableExists(client, 'batch_pigs');
    checks.push({
      num: '045',
      name: 'create_batch_pigs_tables',
      status: hasBatchPigs ? '✅' : '❌',
      details: hasBatchPigs ? 'Table batch_pigs existe' : 'Table manquante'
    });

    // Migration 047: batch_weighing_details
    const hasWeighingDetails = await checkTableExists(client, 'batch_weighing_details');
    checks.push({
      num: '047',
      name: 'create_batch_weighing_details',
      status: hasWeighingDetails ? '✅' : '❌',
      details: hasWeighingDetails ? 'Table batch_weighing_details existe' : 'Table manquante'
    });

    // Migration 049: migration_history
    const hasMigrationHistory = await checkTableExists(client, 'migration_history');
    checks.push({
      num: '049',
      name: 'create_migration_system',
      status: hasMigrationHistory ? '✅' : '❌',
      details: hasMigrationHistory ? 'Table migration_history existe' : 'Table manquante'
    });

    // Migration 051: knowledge_base
    const hasKnowledgeBase = await checkTableExists(client, 'knowledge_base');
    checks.push({
      num: '051',
      name: 'create_knowledge_base_table',
      status: hasKnowledgeBase ? '✅' : '❌',
      details: hasKnowledgeBase ? 'Table knowledge_base existe' : 'Table manquante'
    });

    // Migration 053: dettes
    const hasDettes = await checkTableExists(client, 'dettes');
    checks.push({
      num: '053',
      name: 'create_dettes_table',
      status: hasDettes ? '✅' : '❌',
      details: hasDettes ? 'Table dettes existe' : 'Table manquante'
    });

    // Migration 057: auth_logs
    const hasAuthLogs = await checkTableExists(client, 'auth_logs');
    checks.push({
      num: '057',
      name: 'create_auth_logs_table',
      status: hasAuthLogs ? '✅' : '❌',
      details: hasAuthLogs ? 'Table auth_logs existe' : 'Table manquante'
    });

    // Migration 065: dernière migration
    const lastMigration = allMigrations[allMigrations.length - 1];
    const lastNum = lastMigration.split('_')[0];
    checks.push({
      num: lastNum,
      name: lastMigration.replace('.sql', '').substring(lastNum.length + 1),
      status: '✅',
      details: `Dernière migration trouvée: ${lastMigration}`
    });

    // Afficher les résultats
    console.log('📋 Résultats de la vérification:\n');
    checks.forEach(check => {
      console.log(`${check.status} Migration ${check.num.padStart(3, '0')}: ${check.name}`);
      console.log(`   ${check.details}\n`);
    });

    // Résumé
    const successCount = checks.filter(c => c.status === '✅').length;
    const failCount = checks.filter(c => c.status === '❌').length;
    const totalChecked = checks.length;

    console.log('\n========================================');
    console.log('  RÉSUMÉ');
    console.log('========================================\n');
    console.log(`✅ Migrations vérifiées avec succès: ${successCount}/${totalChecked}`);
    console.log(`❌ Migrations manquantes: ${failCount}/${totalChecked}`);
    console.log(`📊 Total migrations disponibles: ${allMigrations.length}\n`);

    if (failCount > 0) {
      console.log('⚠️  ATTENTION: Certaines migrations ne sont pas appliquées !\n');
      console.log('💡 Pour appliquer toutes les migrations:');
      console.log('   npm run migrate\n');
    } else {
      console.log('✅ Toutes les migrations critiques semblent être appliquées !\n');
      console.log('💡 Pour être sûr, vérifie aussi les migrations intermédiaires.\n');
    }

  } catch (error: any) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkAllMigrations()
  .then(() => {
    console.log('✅ Vérification terminée\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  });

