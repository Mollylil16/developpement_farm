import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from './src/database/database.service';

async function executeMigration() {
  let db: DatabaseService;
  try {
    console.log('🔄 Initialisation du service de base de données...');
    db = new DatabaseService();

    console.log('📖 Lecture du fichier de migration...');
    const migrationPath = path.join(__dirname, 'src/database/migrations/add_description_to_marketplace_listings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL à exécuter:');
    console.log('=====================================');
    console.log(migrationSQL);
    console.log('=====================================');

    console.log('🚀 Exécution de la migration...');
    await db.query(migrationSQL);

    console.log('✅ Migration exécutée avec succès!');

    // Vérification que la colonne a été ajoutée
    console.log('🔍 Vérification de la colonne ajoutée...');
    const checkResult = await db.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'marketplace_listings'
      AND column_name = 'description'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Colonne description ajoutée avec succès:');
      console.log(checkResult.rows[0]);
    } else {
      console.log('❌ Colonne description non trouvée après migration');
    }

    // Vérification du nombre total de colonnes
    const countResult = await db.query(`
      SELECT COUNT(*) as total_columns
      FROM information_schema.columns
      WHERE table_name = 'marketplace_listings'
    `);

    console.log(`📊 Table marketplace_listings a maintenant ${countResult.rows[0].total_columns} colonnes`);

    // Test d'une requête pour vérifier que tout fonctionne
    console.log('🧪 Test de requête sur la table...');
    const testResult = await db.query(`
      SELECT id, description, calculated_price, status
      FROM marketplace_listings
      LIMIT 1
    `);

    console.log('✅ Requêtes SQL fonctionnelles sur la table mise à jour');

  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution de la migration:', error);
    throw error;
  }
}

executeMigration()
  .then(() => {
    console.log('🎉 Migration terminée avec succès!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Échec de la migration:', error);
    process.exit(1);
  });