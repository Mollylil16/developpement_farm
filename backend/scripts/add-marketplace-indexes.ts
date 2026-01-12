/**
 * Script pour ajouter les index optimisés pour le marketplace
 * 
 * Usage: npx ts-node backend/scripts/add-marketplace-indexes.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { DatabaseService } from '../src/database/database.service';

async function main() {
  console.log('📊 Ajout des index pour optimiser le marketplace...\n');

  try {
    // Lire le fichier SQL
    const sqlPath = join(__dirname, '../src/marketplace/migrations/add-marketplace-indexes.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    // Initialiser la connexion à la base de données
    const databaseService = new DatabaseService();

    // Exécuter le script SQL (diviser par ';' et exécuter chaque commande)
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`Exécution de ${statements.length} commandes SQL...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await databaseService.query(statement);
        console.log(`✅ Commande ${i + 1}/${statements.length} exécutée avec succès`);
      } catch (error: any) {
        // Si l'index existe déjà, c'est OK (IF NOT EXISTS)
        if (error.message?.includes('already exists') || error.message?.includes('déjà existe')) {
          console.log(`⚠️  Commande ${i + 1}/${statements.length} : Index déjà existant (ignoré)`);
        } else {
          console.error(`❌ Erreur sur la commande ${i + 1}/${statements.length}:`, error.message);
          throw error;
        }
      }
    }

    console.log('\n✅ Tous les index ont été créés avec succès !');
    console.log('\n📈 Index créés :');
    console.log('  - idx_marketplace_listings_subject_id');
    console.log('  - idx_marketplace_listings_pig_ids_gin');
    console.log('  - idx_marketplace_listings_status_type');
    console.log('  - idx_marketplace_listings_animal_check');

  } catch (error: any) {
    console.error('\n❌ Erreur lors de l\'ajout des index:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

main();
