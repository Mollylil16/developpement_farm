/**
 * Script pour vérifier si les tables agent_learnings et agent_conversation_memory existent
 * et les créer si nécessaire
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Charger le fichier .env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkAgentTables() {
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

    // Vérifier si la table agent_conversation_memory existe
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_conversation_memory'
      );
    `;
    
    const tableExistsResult = await client.query(checkTableQuery);
    const tableExists = tableExistsResult.rows[0].exists;

    if (tableExists) {
      console.log('✅ Table "agent_conversation_memory" existe !\n');
      
      // Compter le nombre de messages
      const countResult = await client.query('SELECT COUNT(*) as count FROM agent_conversation_memory');
      console.log(`   → ${countResult.rows[0].count} messages dans la base\n`);
    } else {
      console.log('❌ Table "agent_conversation_memory" n\'existe PAS !\n');
      console.log('📝 Exécution de la migration 050...\n');
      
      // Lire le fichier de migration
      const migrationPath = path.join(__dirname, '../database/migrations/050_create_agent_learnings_table.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      
      // Exécuter la migration
      await client.query(migrationSQL);
      console.log('✅ Migration 050 exécutée avec succès !\n');
      
      // Vérifier à nouveau
      const checkAgainResult = await client.query(checkTableQuery);
      if (checkAgainResult.rows[0].exists) {
        console.log('✅ Table "agent_conversation_memory" créée avec succès !\n');
      } else {
        console.log('❌ Erreur : La table n\'a pas été créée après la migration.\n');
      }
    }

    // Vérifier aussi la table agent_learnings
    const checkLearningsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_learnings'
      );
    `;
    
    const learningsExistsResult = await client.query(checkLearningsQuery);
    const learningsExists = learningsExistsResult.rows[0].exists;

    if (learningsExists) {
      console.log('✅ Table "agent_learnings" existe !\n');
    } else {
      console.log('❌ Table "agent_learnings" n\'existe PAS !\n');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await client.end();
    console.log('🔌 Déconnecté de la base de données');
  }
}

checkAgentTables();

