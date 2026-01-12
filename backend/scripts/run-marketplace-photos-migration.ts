/**
 * Script pour ajouter le support des photos aux listings marketplace
 * 
 * Usage depuis la racine du projet:
 *   npx ts-node backend/scripts/run-marketplace-photos-migration.ts
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
  console.log('📸 Ajout du support des photos aux listings marketplace...\n');

  try {
    // Lire le fichier SQL
    const scriptDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(process.argv[1] || '');
    const sqlPath = path.resolve(scriptDir, '../src/database/migrations/add_photos_to_marketplace_listings.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Exécuter le script SQL
    // Séparer les commandes en gérant les COMMENT ON qui peuvent contenir des ';'
    const statements: string[] = [];
    let currentStatement = '';
    const lines = sql.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Ignorer les lignes de commentaires seules
      if (trimmedLine.startsWith('--') && !trimmedLine.includes('COMMENT')) {
        continue;
      }

      currentStatement += line + '\n';

      // Si la ligne se termine par ';' et n'est pas un COMMENT ON, c'est la fin d'une commande
      if (trimmedLine.endsWith(';') && !trimmedLine.startsWith('COMMENT')) {
        const statement = currentStatement.trim();
        if (statement.length > 0) {
          statements.push(statement);
        }
        currentStatement = '';
      }
    }

    // Ajouter la dernière commande si elle n'a pas de ';' final
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }

    console.log(`Exécution de ${statements.length} commandes SQL...\n`);

    const client = await pool.connect();

    try {
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        try {
          await client.query(statement);
          console.log(`✅ Commande ${i + 1}/${statements.length} exécutée avec succès`);
        } catch (error: any) {
          // Si la colonne/index existe déjà, c'est OK
          if (error.message?.includes('already exists') || 
              error.message?.includes('déjà existe') ||
              error.message?.includes('duplicate key')) {
            console.log(`⚠️  Commande ${i + 1}/${statements.length} : Déjà existant (ignoré)`);
          } else {
            console.error(`❌ Erreur sur la commande ${i + 1}/${statements.length}:`, error.message);
            throw error;
          }
        }
      }
    } finally {
      client.release();
    }

    // Créer le dossier uploads si nécessaire
    const uploadsDir = path.join(process.cwd(), 'backend', 'uploads', 'marketplace');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`\n✅ Dossier créé: ${uploadsDir}`);
    }

    console.log('\n✅ Le support des photos a été ajouté avec succès !');
    console.log('\n📈 Structure créée :');
    console.log('  - Colonne photos (JSONB) dans marketplace_listings');
    console.log('  - Index GIN sur photos');
    console.log('  - Dossier uploads/marketplace');

  } catch (error: any) {
    console.error('\n❌ Erreur lors de l\'ajout du support des photos:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }

  process.exit(0);
}

main();
