const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'farmtrack',
  user: 'postgres',
  password: 'admin'
});

async function runMigration() {
  try {
    console.log('🔌 Connexion à PostgreSQL...');
    await client.connect();
    console.log('✅ Connecté à la base de données');

    console.log('📖 Lecture du fichier de migration...');
    const migrationPath = path.join(__dirname, 'src/database/migrations/add_description_to_marketplace_listings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log('=====================================');
    console.log(migrationSQL);
    console.log('=====================================');

    console.log('🚀 Exécution de la migration...');

    // Exécuter chaque instruction SQL séparément
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Exécution: ${statement.substring(0, 50)}...`);
        await client.query(statement);
      }
    }

    console.log('✅ Migration exécutée avec succès!');

    // Vérification que la colonne a été ajoutée
    console.log('🔍 Vérification de la colonne...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'marketplace_listings'
      AND column_name = 'description'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Colonne description ajoutée:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('❌ Colonne description non trouvée');
    }

    // Compter le nombre total de colonnes
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM information_schema.columns
      WHERE table_name = 'marketplace_listings'
    `);

    console.log(`📊 Table marketplace_listings: ${countResult.rows[0].total} colonnes`);

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Connexion fermée');
  }
}

runMigration();