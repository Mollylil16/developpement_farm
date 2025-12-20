/**
 * Script pour exécuter les migrations SQL
 * Usage: tsx scripts/run-migrations.ts
 * @ts-check
 */

/// <reference types="node" />

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'farmtrack_db',
  user: process.env.DB_USER || 'farmtrack_user',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    // Liste des migrations à exécuter dans l'ordre
    const migrations = [
      // Marketplace (doit être avant les autres car référencé par d'autres tables)
      '030_create_marketplace_listings_table.sql',
      '031_create_marketplace_offers_table.sql',
      '032_create_marketplace_transactions_table.sql',
      '033_create_marketplace_ratings_table.sql',
      '034_create_marketplace_notifications_table.sql',
      // Admin et subscriptions
      '035_create_admins_table.sql',
      '036_create_subscription_plans_table.sql',
      '037_create_user_subscriptions_table.sql',
      '038_create_transactions_table.sql',
      '039_create_promotions_table.sql',
      '040_create_user_promotions_table.sql',
      '041_create_admin_messages_table.sql',
    ];

    // Obtenir le répertoire du script (CommonJS avec tsx)
    // @ts-ignore - __dirname est disponible dans CommonJS avec tsx
    const scriptDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(process.argv[1] || '');
    const migrationsDir = path.resolve(scriptDir, '../database/migrations');

    console.log('🚀 Début de l\'exécution des migrations...\n');

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


