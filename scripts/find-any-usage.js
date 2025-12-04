/**
 * Script pour identifier et analyser l'utilisation de `any` dans le codebase
 * 
 * Usage: node scripts/find-any-usage.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function sectionHeader(title) {
  log(`\n============================================================`, colors.cyan);
  log(` ${title}`, colors.bright + colors.cyan);
  log(`============================================================`, colors.cyan);
}

// Patterns pour détecter les `any`
const patterns = [
  { name: 'Type annotation', regex: /:\s*any\b/g },
  { name: 'Array<any>', regex: /Array<any>/g },
  { name: 'any[]', regex: /\bany\s*\[\]/g },
  { name: 'Record<string, any>', regex: /Record<string,\s*any>/g },
  { name: 'catch (error: any)', regex: /catch\s*\([^:]*:\s*any\)/g },
  { name: 'Function parameter', regex: /\([^)]*:\s*any[^)]*\)/g },
  { name: 'Function return', regex: /\)\s*:\s*any\s*[={]/g },
];

function findFiles(dir, extensions = ['.ts', '.tsx']) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      // Ignorer node_modules, .git, etc.
      if (!['node_modules', '.git', 'dist', 'build', '__tests__', '__mocks__'].includes(item.name)) {
        files.push(...findFiles(fullPath, extensions));
      }
    } else if (extensions.some(ext => item.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const results = {
    file: filePath,
    total: 0,
    byPattern: {},
    lines: [],
  };

  patterns.forEach(pattern => {
    const matches = content.match(pattern.regex);
    if (matches) {
      results.byPattern[pattern.name] = matches.length;
      results.total += matches.length;

      // Extraire les lignes avec les matches
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (pattern.regex.test(line)) {
          results.lines.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.name,
          });
        }
      });
    }
  });

  return results.total > 0 ? results : null;
}

function main() {
  log('🔍 Analyse de l\'utilisation de `any` dans le codebase', colors.bright + colors.blue);

  const srcDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    log('❌ Le dossier src/ n\'existe pas', colors.red);
    process.exit(1);
  }

  sectionHeader('Recherche des fichiers');
  const files = findFiles(srcDir);
  log(`✅ ${files.length} fichiers trouvés`, colors.green);

  sectionHeader('Analyse des occurrences de `any`');
  const results = files
    .map(analyzeFile)
    .filter(result => result !== null)
    .sort((a, b) => b.total - a.total);

  if (results.length === 0) {
    log('✅ Aucune occurrence de `any` trouvée!', colors.green);
    return;
  }

  const totalOccurrences = results.reduce((sum, r) => sum + r.total, 0);
  log(`⚠️  ${totalOccurrences} occurrences trouvées dans ${results.length} fichiers`, colors.yellow);

  sectionHeader('Top 20 fichiers avec le plus de `any`');
  results.slice(0, 20).forEach((result, index) => {
    log(`\n${index + 1}. ${result.file}`, colors.cyan);
    log(`   Total: ${result.total} occurrences`, colors.yellow);
    Object.entries(result.byPattern).forEach(([pattern, count]) => {
      log(`   - ${pattern}: ${count}`, colors.reset);
    });
  });

  sectionHeader('Répartition par pattern');
  const patternStats = {};
  results.forEach(result => {
    Object.entries(result.byPattern).forEach(([pattern, count]) => {
      patternStats[pattern] = (patternStats[pattern] || 0) + count;
    });
  });

  Object.entries(patternStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([pattern, count]) => {
      const percentage = ((count / totalOccurrences) * 100).toFixed(1);
      log(`${pattern}: ${count} (${percentage}%)`, colors.reset);
    });

  sectionHeader('Recommandations');
  log('1. Commencer par les catch blocks (le plus simple)', colors.green);
  log('2. Remplacer les paramètres de fonction par des types précis', colors.green);
  log('3. Typer les retours de fonction', colors.green);
  log('4. Utiliser les types utilitaires de src/types/common.ts', colors.green);
  log('5. Voir docs/guides/TYPESCRIPT_STRICT_MODE.md pour plus de détails', colors.green);

  // Générer un rapport JSON
  const reportPath = path.join(process.cwd(), 'any-usage-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ total: totalOccurrences, files: results }, null, 2)
  );
  log(`\n📄 Rapport détaillé sauvegardé dans: ${reportPath}`, colors.cyan);
}

main();

