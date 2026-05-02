const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'farmtrack',
  user: 'postgres',
  password: 'admin'
});

const fs = require('fs');

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connecté à la base de données');

    // Lire le fichier de migration
    const migrationSQL = fs.readFileSync('backend/src/database/migrations/add_description_to_marketplace_listings.sql', 'utf8');

    console.log('📄 Migration SQL chargée');
    console.log('--- Contenu de la migration ---');
    console.log(migrationSQL);
    console.log('--- Fin de la migration ---');

    // Exécuter la migration
    await client.query(migrationSQL);
    console.log('✅ Migration exécutée avec succès');

    // Vérifier que la colonne a été ajoutée
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'marketplace_listings'
      AND column_name = 'description'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Colonne description ajoutée:', result.rows[0]);
    } else {
      console.log('❌ Colonne description non trouvée');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  } finally {
    await client.end();
    console.log('🔌 Connexion fermée');
  }
}

runMigration();