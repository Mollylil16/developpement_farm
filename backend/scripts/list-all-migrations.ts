/**
 * Script pour lister toutes les migrations disponibles
 * Usage: tsx scripts/list-all-migrations.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const scriptDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(process.argv[1] || '');
const migrationsDir = path.resolve(scriptDir, '../database/migrations');

// Lire tous les fichiers .sql et les trier
const migrations = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .filter(file => /^\d+_/.test(file)) // Seulement les fichiers qui commencent par un nombre
  .sort((a, b) => {
    const numA = parseInt(a.split('_')[0]);
    const numB = parseInt(b.split('_')[0]);
    return numA - numB;
  });

console.log('\n========================================');
console.log(`  Liste des migrations (${migrations.length} total)`);
console.log('========================================\n');

migrations.forEach((migration, index) => {
  const num = migration.split('_')[0];
  const name = migration.substring(num.length + 1).replace('.sql', '');
  console.log(`${String(num).padStart(3, '0')}. ${name}`);
});

console.log('\n========================================');
console.log(`  Total: ${migrations.length} migrations`);
console.log('========================================\n');

console.log('💡 Pour vérifier si elles sont appliquées sur Render:');
console.log('   npm run migrate:check\n');

