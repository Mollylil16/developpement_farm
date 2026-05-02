/**
 * Script de migration SQLite → PostgreSQL
 * Migre les utilisateurs et leurs données depuis SQLite local vers PostgreSQL
 *
 * Usage: tsx scripts/migrate-sqlite-to-postgres.ts
 */

import * as SQLite from 'expo-sqlite';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

interface SQLiteUser {
  id: string;
  email?: string;
  telephone?: string;
  nom: string;
  prenom: string;
  password_hash?: string;
  provider: string;
  provider_id?: string;
  photo?: string;
  date_creation: string;
  derniere_connexion?: string;
  is_active: number; // SQLite stocke les booléens comme 0/1
  roles?: string;
  active_role?: string;
  is_onboarded: number;
  onboarding_completed_at?: string;
  saved_farms?: string;
}

async function migrateUsers() {
  console.log('🚀 Démarrage de la migration SQLite → PostgreSQL...\n');

  // Connexion PostgreSQL
  const pgPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'farmtrack_db',
    user: process.env.DB_USER || 'farmtrack_user',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Connexion SQLite (à adapter selon votre structure)
    // Note: Ce script doit être exécuté depuis le frontend ou avec accès à la DB SQLite
    console.log("⚠️  Note: Ce script nécessite l'accès à la base SQLite locale.");
    console.log('   Pour migrer les données, vous devez:');
    console.log('   1. Exporter les données SQLite vers JSON');
    console.log('   2. Importer le JSON dans PostgreSQL\n');

    // Exemple de structure de migration
    const sqliteDbPath = process.env.SQLITE_DB_PATH || './data.db';

    if (!fs.existsSync(sqliteDbPath)) {
      console.log('❌ Fichier SQLite introuvable:', sqliteDbPath);
      console.log('   Créez un fichier JSON avec les utilisateurs à migrer.\n');
      return;
    }

    // Lire les utilisateurs depuis SQLite (à adapter)
    // Pour l'instant, structure d'exemple
    const usersToMigrate: SQLiteUser[] = []; // À remplir depuis SQLite

    console.log(`📊 ${usersToMigrate.length} utilisateurs à migrer\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of usersToMigrate) {
      try {
        // Vérifier si l'utilisateur existe déjà
        const existing = await pgPool.query(
          'SELECT id FROM users WHERE id = $1 OR email = $2 OR telephone = $3',
          [user.id, user.email, user.telephone]
        );

        if (existing.rows.length > 0) {
          console.log(`⏭️  Utilisateur ${user.id} déjà présent, ignoré`);
          skipped++;
          continue;
        }

        // Migrer l'utilisateur
        await pgPool.query(
          `INSERT INTO users (
            id, email, telephone, nom, prenom, password_hash,
            provider, provider_id, photo, date_creation, derniere_connexion,
            is_active, roles, active_role, is_onboarded, onboarding_completed_at, saved_farms
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            user.id,
            user.email || null,
            user.telephone || null,
            user.nom,
            user.prenom,
            user.password_hash || null,
            user.provider,
            user.provider_id || null,
            user.photo || null,
            user.date_creation,
            user.derniere_connexion || null,
            user.is_active === 1,
            user.roles || null,
            user.active_role || null,
            user.is_onboarded === 1,
            user.onboarding_completed_at || null,
            user.saved_farms || null,
          ]
        );

        console.log(`✅ Utilisateur ${user.id} migré`);
        migrated++;
      } catch (error: any) {
        console.error(`❌ Erreur lors de la migration de ${user.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Résumé de la migration:');
    console.log(`   ✅ Migrés: ${migrated}`);
    console.log(`   ⏭️  Ignorés: ${skipped}`);
    console.log(`   ❌ Erreurs: ${errors}`);
    console.log(`   📦 Total: ${usersToMigrate.length}\n`);

    if (errors === 0) {
      console.log('🎉 Migration terminée avec succès!');
    } else {
      console.log('⚠️  Migration terminée avec des erreurs.');
    }
  } catch (error) {
    console.error('❌ Erreur fatale lors de la migration:', error);
    throw error;
  } finally {
    await pgPool.end();
  }
}

// Exécuter la migration
if (require.main === module) {
  migrateUsers().catch((error) => {
    console.error('Erreur:', error);
    process.exit(1);
  });
}

export { migrateUsers };
