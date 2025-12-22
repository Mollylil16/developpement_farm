/**
 * Script pour vérifier les tables dans la base de données Render
 */
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Charger le fichier .env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('render.com')
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    console.log('🔌 Connexion à la base de données...\n');
    await client.connect();
    console.log('✅ Connecté avec succès !\n');

    // Liste toutes les tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('📊 TABLES TROUVÉES :', tablesResult.rows.length, '\n');
    console.log('═══════════════════════════════════════\n');
    
    tablesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });

    console.log('\n═══════════════════════════════════════\n');

    // Vérifier si la table 'users' existe
    const usersCheck = tablesResult.rows.find((r) => r.table_name === 'users');
    if (usersCheck) {
      console.log('✅ Table "users" existe !');
      
      // Compter le nombre d'utilisateurs
      const countResult = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`   → ${countResult.rows[0].count} utilisateurs dans la base\n`);
    } else {
      console.log('❌ Table "users" n\'existe PAS ! Les migrations n\'ont pas été appliquées.\n');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
    console.log('🔌 Déconnecté de la base de données');
  }
}

checkDatabase();



