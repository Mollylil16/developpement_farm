/**
 * Script pour analyser les erreurs TypeScript et générer un rapport
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 Analyse des erreurs TypeScript...\n');

try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ Aucune erreur TypeScript trouvée !');
} catch (error) {
  const output = error.stdout.toString();
  const errors = output.split('\n').filter(line => line.includes('error TS'));
  
  console.log(`❌ ${errors.length} erreurs TypeScript trouvées\n`);
  
  // Grouper par fichier
  const errorsByFile = {};
  errors.forEach(error => {
    const match = error.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
    if (match) {
      const [, file, line, col, code, message] = match;
      if (!errorsByFile[file]) {
        errorsByFile[file] = [];
      }
      errorsByFile[file].push({ line, col, code, message });
    }
  });
  
  // Afficher le rapport
  Object.entries(errorsByFile).forEach(([file, errors]) => {
    console.log(`\n📄 ${file} (${errors.length} erreur${errors.length > 1 ? 's' : ''})`);
    errors.forEach(err => {
      console.log(`   L${err.line}:${err.col} [${err.code}] ${err.message}`);
    });
  });
  
  // Générer un fichier rapport
  const report = {
    totalErrors: errors.length,
    files: Object.keys(errorsByFile).length,
    details: errorsByFile,
    timestamp: new Date().toISOString(),
  };
  
  fs.writeFileSync('typescript-errors-report.json', JSON.stringify(report, null, 2));
  console.log('\n📊 Rapport sauvegardé dans typescript-errors-report.json');
}

