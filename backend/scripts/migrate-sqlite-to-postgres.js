/**
 * Script de migration SQLite vers PostgreSQL
 * Lit les données de SQLite et les insère dans PostgreSQL
 */

const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Configuration PostgreSQL
const pgConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'farmtrack_db',
  user: process.env.DB_USER || 'farmtrack_user',
  password: process.env.DB_PASSWORD || 'postgres',
};

// Chercher le fichier SQLite dans les emplacements possibles
function findSQLiteDatabase() {
  const os = require('os');
  const platform = os.platform();
  const possiblePaths = [];
  
  if (platform === 'win32') {
    // Windows: emplacements Expo
    possiblePaths.push(
      path.join(os.homedir(), '.expo', 'databases', 'SQLite', 'fermier_pro.db'),
      path.join(os.homedir(), 'AppData', 'Local', 'expo', 'databases', 'SQLite', 'fermier_pro.db'),
      path.join(os.homedir(), '.expo', 'fermier_pro.db'),
      path.join(__dirname, '../../data/fermier_pro.db')
    );
  } else if (platform === 'darwin') {
    // macOS
    possiblePaths.push(
      path.join(os.homedir(), 'Library', 'Application Support', 'expo', 'databases', 'SQLite', 'fermier_pro.db'),
      path.join(os.homedir(), '.expo', 'databases', 'SQLite', 'fermier_pro.db'),
      path.join(__dirname, '../../data/fermier_pro.db')
    );
  } else {
    // Linux
    possiblePaths.push(
      path.join(os.homedir(), '.expo', 'databases', 'SQLite', 'fermier_pro.db'),
      path.join(__dirname, '../../data/fermier_pro.db')
    );
  }
  
  // Chercher le premier fichier qui existe
  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath)) {
      console.log(`✅ Fichier SQLite trouvé: ${dbPath}`);
      return dbPath;
    }
  }
  
  return null;
}

const sqlitePath = findSQLiteDatabase();

async function migrate() {
  console.log('🚀 Démarrage de la migration SQLite → PostgreSQL...\n');

  // Vérifier si le fichier SQLite existe
  if (!sqlitePath || !fs.existsSync(sqlitePath)) {
    console.error(`❌ Fichier SQLite introuvable`);
    console.log('💡 Le fichier SQLite sera créé automatiquement quand vous lancez l\'application Expo.');
    console.log('💡 Emplacements recherchés:');
    const os = require('os');
    if (os.platform() === 'win32') {
      console.log(`   - ${path.join(os.homedir(), '.expo', 'databases', 'SQLite', 'fermier_pro.db')}`);
      console.log(`   - ${path.join(os.homedir(), 'AppData', 'Local', 'expo', 'databases', 'SQLite', 'fermier_pro.db')}`);
    }
    console.log(`   - ${path.join(__dirname, '../../data/fermier_pro.db')}`);
    console.log('\n💡 Options:');
    console.log('   1. Lancez l\'application Expo une fois pour créer le fichier');
    console.log('   2. Ou copiez votre fichier SQLite dans: fermier-pro/data/fermier_pro.db');
    console.log('   3. Ou continuez sans données (base PostgreSQL vide)');
    process.exit(1);
  }

  // Connexion SQLite
  const sqliteDb = new Database(sqlitePath, { readonly: true });
  console.log('✅ Connexion SQLite établie');

  // Connexion PostgreSQL
  const pgPool = new Pool(pgConfig);
  
  try {
    await pgPool.query('SELECT 1');
    console.log('✅ Connexion PostgreSQL établie\n');
  } catch (error) {
    console.error('❌ Erreur de connexion PostgreSQL:', error.message);
    process.exit(1);
  }

  // Ordre de migration (respecter les dépendances)
  const tables = [
    'users',
    'projets',
    'charges_fixes',
    'depenses_ponctuelles',
    'revenus',
    'gestations',
    'sevrages',
    'ingredients',
    'rations',
    'rations_budget',
    'stocks_aliments',
    'stocks_mouvements',
    'production_animaux',
    'production_pesees',
    'rapports_croissance',
    'mortalites',
    'planifications',
    'collaborations',
    'calendrier_vaccinations',
    'vaccinations',
    'rappels_vaccinations',
    'maladies',
    'traitements',
    'visites_veterinaires',
  ];

  let totalMigrated = 0;

  for (const table of tables) {
    try {
      console.log(`📦 Migration de la table: ${table}...`);

      // Lire les données SQLite
      const rows = sqliteDb.prepare(`SELECT * FROM ${table}`).all();

      if (rows.length === 0) {
        console.log(`   ⏭️  Table vide, ignorée\n`);
        continue;
      }

      // Préparer les colonnes
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const columnNames = columns.join(', ');

      // Insérer dans PostgreSQL
      const insertQuery = `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      let count = 0;
      for (const row of rows) {
        const values = columns.map(col => {
          const value = row[col];
          // Convertir les booléens SQLite (0/1) en booléens PostgreSQL
          if (typeof value === 'number' && (col.includes('actif') || col.includes('gueri') || col.includes('termine') || col.includes('obligatoire') || col.includes('contagieux') || col.includes('alerte'))) {
            return value === 1;
          }
          // Convertir les dates
          if (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
            return value;
          }
          return value;
        });

        try {
          await pgPool.query(insertQuery, values);
          count++;
        } catch (error) {
          console.error(`   ⚠️  Erreur lors de l'insertion d'une ligne:`, error.message);
        }
      }

      console.log(`   ✅ ${count}/${rows.length} lignes migrées\n`);
      totalMigrated += count;

    } catch (error) {
      console.error(`   ❌ Erreur lors de la migration de ${table}:`, error.message);
      console.log(`   ⏭️  Table ignorée, continuation...\n`);
    }
  }

  sqliteDb.close();
  await pgPool.end();

  console.log(`\n🎉 Migration terminée !`);
  console.log(`📊 Total: ${totalMigrated} lignes migrées`);
}

// Exécuter la migration
migrate().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

