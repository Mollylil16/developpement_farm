/**
 * Script d'analyse du bundle size pour React Native
 * Identifie les dépendances lourdes et les opportunités d'optimisation
 * 
 * Usage: node scripts/analyze-bundle-size.js
 */

const fs = require('fs');
const path = require('path');

// Dépendances connues pour être lourdes
const HEAVY_DEPENDENCIES = {
  'lodash': {
    size: '~70KB (minified)',
    optimization: 'Utiliser des imports ciblés: import debounce from "lodash/debounce"',
    impact: 'high'
  },
  'date-fns': {
    size: '~70KB (minified)',
    optimization: 'Utiliser des imports ciblés: import { format } from "date-fns/format"',
    impact: 'medium'
  },
  'react-native-chart-kit': {
    size: '~50KB',
    optimization: 'Lazy load si possible',
    impact: 'medium'
  },
  'react-native-calendars': {
    size: '~100KB',
    optimization: 'Lazy load si possible',
    impact: 'medium'
  },
  'expo': {
    size: '~500KB+',
    optimization: 'N/A - Core dependency',
    impact: 'low'
  }
};

// Patterns d'imports non optimisés
const NON_OPTIMIZED_PATTERNS = [
  {
    pattern: /import\s+\*\s+as\s+\w+\s+from\s+['"]lodash['"]/g,
    description: 'Import complet de lodash',
    fix: 'Utiliser des imports ciblés: import debounce from "lodash/debounce"'
  },
  {
    pattern: /import\s+\{[^}]*\}\s+from\s+['"]lodash['"]/g,
    description: 'Import nommé de lodash',
    fix: 'Utiliser des imports ciblés: import debounce from "lodash/debounce"'
  },
  {
    pattern: /import\s+\*\s+as\s+\w+\s+from\s+['"]date-fns['"]/g,
    description: 'Import complet de date-fns',
    fix: 'Utiliser des imports ciblés: import { format } from "date-fns/format"'
  }
];

/**
 * Analyse un fichier pour trouver des imports non optimisés
 */
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const issues = [];

    NON_OPTIMIZED_PATTERNS.forEach(({ pattern, description, fix }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            file: filePath,
            match,
            description,
            fix
          });
        });
      }
    });

    return issues;
  } catch (error) {
    console.error(`Erreur lors de l'analyse de ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Parcourt récursivement un répertoire
 */
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Ignorer node_modules, .git, etc.
      if (!['node_modules', '.git', 'dist', 'build', '.expo'].includes(file)) {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Analyse le package.json pour identifier les dépendances lourdes
 */
function analyzeDependencies() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error('package.json non trouvé');
    return [];
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const heavyDeps = [];

  Object.keys(dependencies).forEach(dep => {
    if (HEAVY_DEPENDENCIES[dep]) {
      heavyDeps.push({
        name: dep,
        version: dependencies[dep],
        ...HEAVY_DEPENDENCIES[dep]
      });
    }
  });

  return heavyDeps;
}

/**
 * Génère un rapport d'analyse
 */
function generateReport(issues, heavyDeps) {
  console.log('\n📦 ============================================');
  console.log('   ANALYSE DU BUNDLE SIZE - RAPPORT');
  console.log('============================================\n');

  // Dépendances lourdes
  console.log('🔍 DÉPENDANCES LOURDES IDENTIFIÉES:\n');
  if (heavyDeps.length === 0) {
    console.log('  ✅ Aucune dépendance lourde identifiée\n');
  } else {
    heavyDeps.forEach(dep => {
      console.log(`  📦 ${dep.name} (${dep.version})`);
      console.log(`     Taille: ${dep.size}`);
      console.log(`     Impact: ${dep.impact === 'high' ? '🔴 Élevé' : dep.impact === 'medium' ? '🟡 Moyen' : '🟢 Faible'}`);
      console.log(`     Optimisation: ${dep.optimization}\n`);
    });
  }

  // Imports non optimisés
  console.log('⚠️  IMPORTS NON OPTIMISÉS:\n');
  if (issues.length === 0) {
    console.log('  ✅ Aucun import non optimisé trouvé\n');
  } else {
    // Grouper par fichier
    const issuesByFile = {};
    issues.forEach(issue => {
      if (!issuesByFile[issue.file]) {
        issuesByFile[issue.file] = [];
      }
      issuesByFile[issue.file].push(issue);
    });

    Object.keys(issuesByFile).forEach(file => {
      const relativePath = path.relative(process.cwd(), file);
      console.log(`  📄 ${relativePath}`);
      issuesByFile[file].forEach(issue => {
        console.log(`     ❌ ${issue.description}`);
        console.log(`        Ligne: ${issue.match}`);
        console.log(`        Fix: ${issue.fix}\n`);
      });
    });
  }

  // Résumé
  console.log('📊 RÉSUMÉ:\n');
  console.log(`  • Dépendances lourdes: ${heavyDeps.length}`);
  console.log(`  • Imports non optimisés: ${issues.length}`);
  console.log(`  • Fichiers concernés: ${new Set(issues.map(i => i.file)).size}\n`);

  // Recommandations
  console.log('💡 RECOMMANDATIONS:\n');
  if (issues.length > 0) {
    console.log('  1. Remplacer les imports complets par des imports ciblés:');
    console.log('     ❌ import { debounce } from "lodash"');
    console.log('     ✅ import debounce from "lodash/debounce"\n');
    console.log('  2. Pour date-fns, utiliser des imports ciblés:');
    console.log('     ❌ import { format } from "date-fns"');
    console.log('     ✅ import { format } from "date-fns/format"\n');
  }
  if (heavyDeps.length > 0) {
    console.log('  3. Considérer le lazy loading pour:');
    heavyDeps.filter(d => d.impact === 'medium').forEach(dep => {
      console.log(`     • ${dep.name} (si utilisé conditionnellement)\n`);
    });
  }
  console.log('  4. Utiliser react-native-bundle-visualizer pour une analyse détaillée:');
  console.log('     npx react-native-bundle-visualizer\n');

  console.log('============================================\n');
}

// Exécution
const srcDir = path.join(process.cwd(), 'src');
if (!fs.existsSync(srcDir)) {
  console.error('Répertoire src/ non trouvé');
  process.exit(1);
}

console.log('🔍 Analyse du bundle size en cours...\n');
console.log('Parcours des fichiers source...');

const files = walkDir(srcDir);
console.log(`✓ ${files.length} fichiers trouvés\n`);

console.log('Analyse des imports...');
const allIssues = [];
files.forEach(file => {
  const issues = analyzeFile(file);
  allIssues.push(...issues);
});

console.log('Analyse des dépendances...');
const heavyDeps = analyzeDependencies();

generateReport(allIssues, heavyDeps);

// Écrire un rapport JSON pour référence
const report = {
  timestamp: new Date().toISOString(),
  heavyDependencies: heavyDeps,
  nonOptimizedImports: allIssues.map(issue => ({
    file: path.relative(process.cwd(), issue.file),
    description: issue.description,
    fix: issue.fix
  })),
  summary: {
    totalFiles: files.length,
    filesWithIssues: new Set(allIssues.map(i => i.file)).size,
    totalIssues: allIssues.length
  }
};

const reportPath = path.join(process.cwd(), 'bundle-analysis-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`📄 Rapport JSON sauvegardé: ${reportPath}\n`);

