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
    await client.connect();

    // Liste toutes les tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    // Vérifier si la table 'users' existe
    const usersCheck = tablesResult.rows.find((r) => r.table_name === 'users');
    if (usersCheck) {
      // Compter le nombre d'utilisateurs
      const countResult = await client.query('SELECT COUNT(*) as count FROM users');
      process.exit(0); // Succès
    } else {
      process.exit(1); // Échec
    }

  } catch (error) {
    process.exit(1); // Erreur
  } finally {
    await client.end();
  }
}

checkDatabase();



