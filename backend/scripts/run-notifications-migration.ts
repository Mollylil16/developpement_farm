/**
 * Script pour créer la table marketplace_notifications
 *
 * Usage depuis la racine du projet:
 *   npx ts-node backend/scripts/run-notifications-migration.ts
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

async function main() {
  console.log('🔔 Création de la table marketplace_notifications...\n');

  try {
    // Lire le fichier SQL
    const sqlPath = path.resolve(__dirname, '../src/database/migrations/065_create_marketplace_notifications.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Exécuter la migration
    const client = await pool.connect();

    try {
      await client.query(sql);
      console.log('✅ Table marketplace_notifications créée avec succès !');

      // Vérifier que la table existe
      const checkResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = 'marketplace_notifications'
      `);

      if (checkResult.rows.length > 0) {
        console.log('✅ Vérification: Table marketplace_notifications existe');

        // Compter les colonnes
        const columnsResult = await client.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'marketplace_notifications'
          ORDER BY ordinal_position
        `);

        console.log(`📊 Colonnes créées: ${columnsResult.rows.length}`);
        columnsResult.rows.forEach((row, index) => {
          console.log(`   ${index + 1}. ${row.column_name}`);
        });
      } else {
        console.log('❌ Erreur: Table non trouvée après création');
      }

    } finally {
      client.release();
    }

    console.log('\n🎉 Migration notifications terminée avec succès !');

  } catch (error: any) {
    console.error('\n❌ Erreur lors de la création de la table notifications:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }

  process.exit(0);
}

main();