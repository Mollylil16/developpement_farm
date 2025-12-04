#!/usr/bin/env node

/**
 * Script pour identifier les fichiers non testés
 * 
 * Analyse le codebase et identifie les fichiers qui n'ont pas de tests correspondants
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(title, colors.cyan);
  log('='.repeat(60), colors.cyan);
}

function getAllSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Ignorer certains dossiers
      if (!['node_modules', '.git', 'coverage', '__tests__', '__mocks__', 'e2e'].includes(file)) {
        getAllSourceFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      // Ignorer les fichiers de test et les déclarations
      if (!file.endsWith('.test.ts') && 
          !file.endsWith('.test.tsx') && 
          !file.endsWith('.spec.ts') && 
          !file.endsWith('.spec.tsx') &&
          !file.endsWith('.d.ts') &&
          !file.endsWith('.e2e.ts')) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function getTestFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'coverage'].includes(file)) {
        getTestFiles(filePath, fileList);
      }
    } else if (file.endsWith('.test.ts') || 
               file.endsWith('.test.tsx') || 
               file.endsWith('.spec.ts') || 
               file.endsWith('.spec.tsx') ||
               file.endsWith('.e2e.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function getTestFileForSource(sourceFile) {
  const dir = path.dirname(sourceFile);
  const basename = path.basename(sourceFile, path.extname(sourceFile));
  const ext = path.extname(sourceFile);
  
  // Chercher dans le même répertoire
  const sameDirTest = path.join(dir, `${basename}.test${ext}`);
  if (fs.existsSync(sameDirTest)) {
    return sameDirTest;
  }

  // Chercher dans __tests__
  const testDir = path.join(dir, '__tests__');
  if (fs.existsSync(testDir)) {
    const testFile = path.join(testDir, `${basename}.test${ext}`);
    if (fs.existsSync(testFile)) {
      return testFile;
    }
  }

  // Chercher dans le répertoire parent __tests__
  const parentDir = path.dirname(dir);
  const parentTestDir = path.join(parentDir, '__tests__');
  if (fs.existsSync(parentTestDir)) {
    const testFile = path.join(parentTestDir, `${basename}.test${ext}`);
    if (fs.existsSync(testFile)) {
      return testFile;
    }
  }

  return null;
}

function categorizeFiles(files) {
  const categories = {
    services: [],
    repositories: [],
    entities: [],
    useCases: [],
    hooks: [],
    components: [],
    screens: [],
    utils: [],
    others: [],
  };

  files.forEach(file => {
    if (file.includes('/services/') && !file.includes('/__tests__/')) {
      categories.services.push(file);
    } else if (file.includes('/repositories/') && !file.includes('/__tests__/')) {
      categories.repositories.push(file);
    } else if (file.includes('/entities/')) {
      categories.entities.push(file);
    } else if (file.includes('/useCases/')) {
      categories.useCases.push(file);
    } else if (file.includes('/hooks/') && !file.includes('/__tests__/')) {
      categories.hooks.push(file);
    } else if (file.includes('/components/') && !file.includes('/__tests__/')) {
      categories.components.push(file);
    } else if (file.includes('/screens/') && !file.includes('/__tests__/')) {
      categories.screens.push(file);
    } else if (file.includes('/utils/') && !file.includes('/__tests__/')) {
      categories.utils.push(file);
    } else {
      categories.others.push(file);
    }
  });

  return categories;
}

function main() {
  log('🔍 Identification des fichiers non testés', colors.cyan);

  const srcDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    log('❌ Le dossier src/ n\'existe pas', colors.red);
    process.exit(1);
  }

  logSection('📂 Analyse des fichiers source');
  const sourceFiles = getAllSourceFiles(srcDir);
  log(`Total fichiers source: ${sourceFiles.length}`, colors.blue);

  logSection('📋 Analyse des fichiers de test');
  const testFiles = getTestFiles(process.cwd());
  log(`Total fichiers de test: ${testFiles.length}`, colors.blue);

  logSection('🔎 Identification des fichiers non testés');
  
  const untestedFiles = [];
  const testedFiles = [];

  sourceFiles.forEach(sourceFile => {
    const testFile = getTestFileForSource(sourceFile);
    if (testFile) {
      testedFiles.push({ source: sourceFile, test: testFile });
    } else {
      untestedFiles.push(sourceFile);
    }
  });

  log(`✅ Fichiers testés: ${testedFiles.length}`, colors.green);
  log(`❌ Fichiers non testés: ${untestedFiles.length}`, colors.red);
  log(`📊 Taux de couverture: ${((testedFiles.length / sourceFiles.length) * 100).toFixed(1)}%`, colors.yellow);

  // Catégoriser les fichiers non testés
  const untestedCategories = categorizeFiles(untestedFiles);

  logSection('📊 Fichiers non testés par catégorie');

  Object.entries(untestedCategories).forEach(([category, files]) => {
    if (files.length > 0) {
      log(`\n${category.toUpperCase()}: ${files.length} fichiers`, colors.yellow);
      files.slice(0, 10).forEach(file => {
        const relativePath = path.relative(process.cwd(), file);
        log(`  - ${relativePath}`, colors.red);
      });
      if (files.length > 10) {
        log(`  ... et ${files.length - 10} autres`, colors.yellow);
      }
    }
  });

  // Prioriser les fichiers critiques
  logSection('🔴 Fichiers critiques non testés (Priorité P0)');

  const criticalFiles = untestedFiles.filter(file => {
    const fileName = path.basename(file);
    return file.includes('/services/database.ts') ||
           file.includes('/repositories/AnimalRepository') ||
           file.includes('/repositories/FinanceRepository') ||
           file.includes('/repositories/ProjetRepository') ||
           file.includes('/repositories/UserRepository') ||
           fileName === 'database.ts';
  });

  if (criticalFiles.length > 0) {
    criticalFiles.forEach(file => {
      const relativePath = path.relative(process.cwd(), file);
      log(`  ⚠️  ${relativePath}`, colors.red);
    });
  } else {
    log('  ✅ Tous les fichiers critiques sont testés', colors.green);
  }

  // Générer un rapport JSON
  const report = {
    total: sourceFiles.length,
    tested: testedFiles.length,
    untested: untestedFiles.length,
    coverage: ((testedFiles.length / sourceFiles.length) * 100).toFixed(1),
    categories: Object.fromEntries(
      Object.entries(untestedCategories).map(([cat, files]) => [
        cat,
        files.map(f => path.relative(process.cwd(), f))
      ])
    ),
    critical: criticalFiles.map(f => path.relative(process.cwd(), f)),
  };

  const reportPath = path.join(process.cwd(), 'coverage-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Rapport JSON généré: ${reportPath}`, colors.blue);

  logSection('📈 Résumé');
  log(`Couverture actuelle: ${report.coverage}%`, colors.yellow);
  log(`Objectif: 90%`, colors.cyan);
  log(`Fichiers à tester: ${untestedFiles.length}`, colors.red);
  
  if (parseFloat(report.coverage) < 90) {
    log(`\n⚠️  La couverture est en dessous de l'objectif de 90%`, colors.yellow);
    log(`   Commencez par tester les fichiers critiques listés ci-dessus`, colors.yellow);
    process.exit(1);
  } else {
    log(`\n✅ La couverture est au-dessus de l'objectif de 90%`, colors.green);
    process.exit(0);
  }
}

main();

