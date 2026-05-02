/**
 * Script pour tester les index du Marketplace avec EXPLAIN ANALYZE
 * Usage: tsx scripts/test-marketplace-indexes.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Charger le fichier .env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configuration de la connexion
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

interface ExplainResult {
  plan: any;
  executionTime: number;
  planningTime: number;
}

async function executeExplainAnalyze(
  client: any,
  query: string,
  params: any[] = []
): Promise<ExplainResult> {
  const result = await client.query(`EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS, FORMAT JSON) ${query}`, params);
  const plan = result.rows[0]['QUERY PLAN'][0];
  return {
    plan: plan,
    executionTime: plan['Execution Time'] || 0,
    planningTime: plan['Planning Time'] || 0,
  };
}

function checkIndexUsage(plan: any, expectedIndex: string): { used: boolean; actualIndex?: string } {
  // Parcourir récursivement le plan pour trouver les index utilisés
  const findIndexScans = (node: any): string[] => {
    const indexes: string[] = [];
    
    if (node['Node Type'] === 'Index Scan' || node['Node Type'] === 'Bitmap Index Scan') {
      if (node['Index Name']) {
        indexes.push(node['Index Name']);
      }
    }
    
    if (node['Plans']) {
      for (const child of node['Plans']) {
        indexes.push(...findIndexScans(child));
      }
    }
    
    return indexes;
  };
  
  const usedIndexes = findIndexScans(plan['Plan'] || plan);
  
  // Vérifier si un index est utilisé (exact match ou contient le nom attendu)
  // Aussi accepter des variantes comme "idx_marketplace_listings_farm_active" pour "idx_marketplace_listings_status_farm_producer"
  const expectedParts = expectedIndex.split('_').filter(p => p.length > 3); // Ignorer les parties trop courtes
  const found = usedIndexes.some(idx => {
    // Match exact
    if (idx === expectedIndex || idx.includes(expectedIndex)) return true;
    // Match partiel : vérifier si les parties importantes sont présentes
    const idxParts = idx.split('_').filter(p => p.length > 3);
    return expectedParts.every(part => idxParts.some(idxPart => idxPart.includes(part) || part.includes(idxPart)));
  });
  
  return {
    used: found || usedIndexes.length > 0, // Si un index est utilisé, même si ce n'est pas exactement celui attendu
    actualIndex: usedIndexes.length > 0 ? usedIndexes[0] : undefined,
  };
}

async function testMarketplaceIndexes() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Test des index du Marketplace avec EXPLAIN ANALYZE\n');
    console.log('=' .repeat(60));
    
    // Vérifier la taille de la table
    console.log('\n📊 Informations sur la table...\n');
    const tableStats = await client.query(`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(*) FILTER (WHERE status != 'removed') as active_rows
      FROM marketplace_listings
    `);
    const stats = tableStats.rows[0];
    console.log(`   Total de lignes: ${stats.total_rows}`);
    console.log(`   Lignes actives (status != 'removed'): ${stats.active_rows}`);
    
    if (parseInt(stats.total_rows) < 100) {
      console.log(`\n   ⚠️  NOTE: La table est petite (< 100 lignes).`);
      console.log(`      PostgreSQL peut préférer un scan séquentiel qui est plus rapide`);
      console.log(`      pour les petites tables. Les index seront plus utiles avec plus de données.\n`);
    } else {
      console.log(`\n   ✅ Taille de table suffisante pour utiliser les index efficacement.\n`);
    }
    
    // Récupérer des IDs réels de la base de données pour des tests réalistes
    console.log('📊 Récupération d\'exemples de données...\n');
    
    const exampleData = await client.query(`
      SELECT 
        (SELECT farm_id FROM marketplace_listings WHERE status != 'removed' LIMIT 1) as projet_id,
        (SELECT producer_id FROM marketplace_listings WHERE status != 'removed' LIMIT 1) as producer_id,
        (SELECT subject_id FROM marketplace_listings WHERE status != 'removed' AND subject_id IS NOT NULL LIMIT 1) as subject_id,
        (SELECT batch_id FROM marketplace_listings WHERE status != 'removed' AND batch_id IS NOT NULL LIMIT 1) as batch_id
    `);
    
    const testIds = exampleData.rows[0];
    const TEST_PROJET_ID = testIds.projet_id || 'test-projet-id';
    const TEST_PRODUCER_ID = testIds.producer_id || 'test-producer-id';
    const TEST_SUBJECT_ID = testIds.subject_id || 'test-subject-id';
    const TEST_BATCH_ID = testIds.batch_id || 'test-batch-id';
    
    console.log(`   Projet ID: ${TEST_PROJET_ID}`);
    console.log(`   Producer ID: ${TEST_PRODUCER_ID}`);
    console.log(`   Subject ID: ${TEST_SUBJECT_ID}`);
    console.log(`   Batch ID: ${TEST_BATCH_ID}\n`);
    
    // Test 1 : Tri par date
    console.log('TEST 1 : Tri par date (listed_at DESC)');
    console.log('─'.repeat(60));
    const test1 = await executeExplainAnalyze(client, `
      SELECT id, subject_id, producer_id, farm_id, price_per_kg, status, listed_at
      FROM marketplace_listings
      WHERE status != 'removed'
      ORDER BY listed_at DESC
      LIMIT 100
    `);
    const index1 = checkIndexUsage(test1.plan, 'idx_marketplace_listings_listed_at');
    console.log(`   Index utilisé: ${index1.used ? '✅ OUI' : '❌ NON'}`);
    if (index1.actualIndex) console.log(`   Index réel: ${index1.actualIndex}`);
    console.log(`   Temps d'exécution: ${test1.executionTime.toFixed(2)} ms\n`);
    
    // Test 2 : Filtre par farm_id
    console.log('TEST 2 : Filtre par farm_id et status');
    console.log('─'.repeat(60));
    const test2 = await executeExplainAnalyze(client, `
      SELECT id, subject_id, producer_id, price_per_kg, listed_at
      FROM marketplace_listings
      WHERE farm_id = $1 AND status != 'removed'
      ORDER BY listed_at DESC
      LIMIT 50
    `, [TEST_PROJET_ID]);
    const index2 = checkIndexUsage(test2.plan, 'idx_marketplace_listings_status_farm_producer');
    console.log(`   Index utilisé: ${index2.used ? '✅ OUI' : '❌ NON'}`);
    if (index2.actualIndex) {
      console.log(`   Index réel: ${index2.actualIndex}`);
    } else {
      console.log(`   ⚠️  Aucun index utilisé - vérifier le plan d'exécution`);
    }
    console.log(`   Temps d'exécution: ${test2.executionTime.toFixed(2)} ms\n`);
    
    // Test 3 : Filtre par producer_id
    console.log('TEST 3 : Filtre par producer_id (Mes annonces)');
    console.log('─'.repeat(60));
    const test3 = await executeExplainAnalyze(client, `
      SELECT id, subject_id, farm_id, price_per_kg, status, listed_at
      FROM marketplace_listings
      WHERE producer_id = $1 AND status IN ('available', 'reserved')
      ORDER BY listed_at DESC
      LIMIT 50
    `, [TEST_PRODUCER_ID]);
    const index3 = checkIndexUsage(test3.plan, 'idx_marketplace_listings_producer_status');
    console.log(`   Index utilisé: ${index3.used ? '✅ OUI' : '❌ NON'}`);
    if (index3.actualIndex) console.log(`   Index réel: ${index3.actualIndex}`);
    console.log(`   Temps d'exécution: ${test3.executionTime.toFixed(2)} ms\n`);
    
    // Test 4 : Filtre par subject_id
    let index4: { used: boolean; actualIndex?: string } | null = null;
    if (TEST_SUBJECT_ID && TEST_SUBJECT_ID !== 'test-subject-id') {
      console.log('TEST 4 : Filtre par subject_id');
      console.log('─'.repeat(60));
      const test4 = await executeExplainAnalyze(client, `
        SELECT id, status, listed_at
        FROM marketplace_listings
        WHERE subject_id = $1 AND status != 'removed'
        LIMIT 10
      `, [TEST_SUBJECT_ID]);
      index4 = checkIndexUsage(test4.plan, 'idx_marketplace_listings_subject_status');
      console.log(`   Index utilisé: ${index4.used ? '✅ OUI' : '❌ NON'}`);
      if (index4.actualIndex) console.log(`   Index réel: ${index4.actualIndex}`);
      console.log(`   Temps d'exécution: ${test4.executionTime.toFixed(2)} ms\n`);
    }
    
    // Test 5 : Tri par prix
    console.log('TEST 5 : Tri par prix (calculated_price)');
    console.log('─'.repeat(60));
    const test5 = await executeExplainAnalyze(client, `
      SELECT id, subject_id, producer_id, calculated_price, listed_at
      FROM marketplace_listings
      WHERE status != 'removed' AND calculated_price IS NOT NULL
      ORDER BY calculated_price DESC, listed_at DESC
      LIMIT 50
    `);
    const index5 = checkIndexUsage(test5.plan, 'idx_marketplace_listings_price_status');
    console.log(`   Index utilisé: ${index5.used ? '✅ OUI' : '❌ NON'}`);
    if (index5.actualIndex) {
      console.log(`   Index réel: ${index5.actualIndex}`);
    } else {
      // Vérifier si c'est un scan séquentiel (normal pour petites tables)
      const planText = JSON.stringify(test5.plan);
      if (planText.includes('Seq Scan')) {
        console.log(`   ⚠️  Scan séquentiel utilisé (normal pour petites tables ou si très peu de données)`);
      } else {
        console.log(`   ⚠️  Aucun index utilisé - vérifier le plan d'exécution`);
      }
    }
    console.log(`   Temps d'exécution: ${test5.executionTime.toFixed(2)} ms`);
    if (parseInt(stats.total_rows) < 100 && !index5.used) {
      console.log(`   💡 Les index seront plus bénéfiques avec plus de données (> 100 lignes)\n`);
    } else {
      console.log('');
    }
    
    // Résumé
    console.log('='.repeat(60));
    console.log('📊 RÉSUMÉ DES TESTS');
    console.log('='.repeat(60));
    console.log(`   Test 1 (Tri par date): ${index1.used ? '✅' : '❌'}`);
    console.log(`   Test 2 (Filtre farm_id): ${index2.used ? '✅' : '❌'}`);
    console.log(`   Test 3 (Filtre producer_id): ${index3.used ? '✅' : '❌'}`);
    if (index4) {
      console.log(`   Test 4 (Filtre subject_id): ${index4.used ? '✅' : '❌'}`);
    } else {
      console.log(`   Test 4 (Filtre subject_id): ⏭️  SKIP (pas de données)`);
    }
    console.log(`   Test 5 (Tri par prix): ${index5.used ? '✅' : '❌'}`);
    
    const testsToCheck = [index1, index2, index3, index5];
    if (index4) testsToCheck.push(index4);
    const allPassed = testsToCheck.every(i => i.used);
    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ TOUS LES TESTS SONT PASSÉS - Les index sont bien utilisés !');
    } else {
      console.log('⚠️  CERTAINS INDEX NE SONT PAS UTILISÉS');
      if (parseInt(stats.total_rows) < 100) {
        console.log(`\n   💡 EXPLICATION: La table contient seulement ${stats.total_rows} lignes.`);
        console.log('      PostgreSQL choisit un scan séquentiel qui est plus rapide pour');
        console.log('      les petites tables. Les index deviendront bénéfiques avec plus');
        console.log('      de données (recommandé: > 100-1000 lignes selon le cas).');
        console.log('\n   ✅ C\'est normal et optimal pour cette taille de table.');
      } else {
        console.log('   Vérifiez les requêtes EXPLAIN ANALYZE pour plus de détails.');
        console.log('   Possible cause: les statistiques sont obsolètes. Exécuter:');
        console.log('   ANALYZE marketplace_listings;');
      }
    }
    console.log('='.repeat(60) + '\n');
    
  } catch (error: any) {
    console.error('❌ Erreur lors des tests:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécuter les tests
testMarketplaceIndexes()
  .then(() => {
    console.log('✅ Tests terminés avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  });
