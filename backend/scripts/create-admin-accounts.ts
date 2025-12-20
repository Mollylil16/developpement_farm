/**
 * Script pour créer les 2 comptes administrateurs
 * Usage: tsx scripts/create-admin-accounts.ts
 */

import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'farmtrack_db',
  user: process.env.DB_USER || 'farmtrack_user',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function createAdminAccounts() {
  const client = await pool.connect();

  try {
    // Vérifier si la table admins existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admins'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ La table admins n\'existe pas. Exécutez d\'abord les migrations.');
      process.exit(1);
    }

    // Vérifier si des admins existent déjà
    const existingAdmins = await client.query('SELECT COUNT(*) as count FROM admins');
    if (parseInt(existingAdmins.rows[0].count) > 0) {
      console.log('⚠️  Des administrateurs existent déjà. Voulez-vous continuer ? (y/n)');
      // Pour l'automatisation, on continue
    }

    // Admin 1 (toi)
    const admin1Email = process.env.ADMIN1_EMAIL || 'admin1@farmtrack.com';
    const admin1Password = process.env.ADMIN1_PASSWORD || 'Admin123!@#';
    const admin1Nom = process.env.ADMIN1_NOM || 'Admin';
    const admin1Prenom = process.env.ADMIN1_PRENOM || 'Principal';

    // Admin 2 (collaborateur)
    const admin2Email = process.env.ADMIN2_EMAIL || 'admin2@farmtrack.com';
    const admin2Password = process.env.ADMIN2_PASSWORD || 'Admin123!@#';
    const admin2Nom = process.env.ADMIN2_NOM || 'Admin';
    const admin2Prenom = process.env.ADMIN2_PRENOM || 'Collaborateur';

    // Hasher les mots de passe
    const saltRounds = 10;
    const admin1PasswordHash = await bcrypt.hash(admin1Password, saltRounds);
    const admin2PasswordHash = await bcrypt.hash(admin2Password, saltRounds);

    // Créer Admin 1
    const admin1Id = uuidv4();
    await client.query(
      `INSERT INTO admins (id, email, password_hash, nom, prenom, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         nom = EXCLUDED.nom,
         prenom = EXCLUDED.prenom,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()`,
      [admin1Id, admin1Email.toLowerCase(), admin1PasswordHash, admin1Nom, admin1Prenom, true],
    );

    // Créer Admin 2
    const admin2Id = uuidv4();
    await client.query(
      `INSERT INTO admins (id, email, password_hash, nom, prenom, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         nom = EXCLUDED.nom,
         prenom = EXCLUDED.prenom,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()`,
      [admin2Id, admin2Email.toLowerCase(), admin2PasswordHash, admin2Nom, admin2Prenom, true],
    );

    console.log('\n✅ Comptes administrateurs créés avec succès !\n');
    console.log('📧 Admin 1:');
    console.log(`   Email: ${admin1Email}`);
    console.log(`   Mot de passe: ${admin1Password}`);
    console.log(`   Nom: ${admin1Nom} ${admin1Prenom}\n`);
    console.log('📧 Admin 2:');
    console.log(`   Email: ${admin2Email}`);
    console.log(`   Mot de passe: ${admin2Password}`);
    console.log(`   Nom: ${admin2Nom} ${admin2Prenom}\n`);
    console.log('⚠️  IMPORTANT: Changez ces mots de passe après la première connexion !\n');
  } catch (error) {
    console.error('❌ Erreur lors de la création des comptes admin:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécuter le script
createAdminAccounts()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });

