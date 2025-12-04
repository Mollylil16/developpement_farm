/**
 * Script pour remplacer automatiquement catch (error: any) par catch (error: unknown)
 * et utiliser getErrorMessage() pour extraire les messages
 * 
 * Usage: node scripts/replace-catch-any.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

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

function findFiles(dir, extensions = ['.ts', '.tsx']) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '__tests__', '__mocks__', 'coverage'].includes(item.name)) {
        files.push(...findFiles(fullPath, extensions));
      }
    } else if (extensions.some(ext => item.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

function replaceCatchAny(content, filePath) {
  let modified = content;
  let changes = 0;
  const changesList = [];

  // Pattern 1: catch (error: any) -> catch (error: unknown)
  const catchAnyPattern = /catch\s*\(([^:)]+):\s*any\)/g;
  modified = modified.replace(catchAnyPattern, (match, varName) => {
    changes++;
    changesList.push(`catch (${varName.trim()}: any) -> catch (${varName.trim()}: unknown)`);
    return `catch (${varName.trim()}: unknown)`;
  });

  // Pattern 2: error?.message -> getErrorMessage(error)
  // Pattern 3: error.message -> getErrorMessage(error)
  // Mais seulement dans les catch blocks
  const lines = modified.split('\n');
  const newLines = [];
  let inCatchBlock = false;
  let catchVarName = 'error';
  let needsImport = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Détecter le début d'un catch block
    const catchMatch = line.match(/catch\s*\(([^:)]+):\s*unknown\)/);
    if (catchMatch) {
      inCatchBlock = true;
      catchVarName = catchMatch[1].trim();
      newLines.push(line);
      continue;
    }

    // Détecter la fin du catch block (ligne suivante qui n'est pas dans le bloc)
    if (inCatchBlock && (line.trim().startsWith('}') || line.trim().startsWith('} catch') || line.trim().startsWith('} finally'))) {
      inCatchBlock = false;
      newLines.push(line);
      continue;
    }

    // Dans un catch block, remplacer error?.message et error.message
    if (inCatchBlock) {
      // Remplacer error?.message par getErrorMessage(error)
      if (line.includes(`${catchVarName}?.message`)) {
        const newLine = line.replace(
          new RegExp(`${catchVarName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?\\.message`, 'g'),
          `getErrorMessage(${catchVarName})`
        );
        newLines.push(newLine);
        changes++;
        needsImport = true;
        changesList.push(`${line.trim()} -> ${newLine.trim()}`);
        continue;
      }

      // Remplacer error.message par getErrorMessage(error)
      if (line.includes(`${catchVarName}.message`) && !line.includes('getErrorMessage')) {
        const newLine = line.replace(
          new RegExp(`${catchVarName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.message`, 'g'),
          `getErrorMessage(${catchVarName})`
        );
        newLines.push(newLine);
        changes++;
        needsImport = true;
        changesList.push(`${line.trim()} -> ${newLine.trim()}`);
        continue;
      }
    }

    newLines.push(line);
  }

  modified = newLines.join('\n');

  // Ajouter l'import si nécessaire
  if (needsImport && !modified.includes("from '../types/common'") && !modified.includes("from './types/common'") && !modified.includes("from '../../types/common'")) {
    // Trouver le dernier import
    const importMatch = modified.match(/(import\s+.*?from\s+['"].*?['"];?\s*\n)/g);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      const lastImportIndex = modified.lastIndexOf(lastImport);
      const relativePath = calculateRelativePath(filePath, path.join(process.cwd(), 'src', 'types', 'common.ts'));
      const importStatement = `import { getErrorMessage } from '${relativePath}';\n`;
      modified = modified.slice(0, lastImportIndex + lastImport.length) + importStatement + modified.slice(lastImportIndex + lastImport.length);
      changes++;
      changesList.push('Added import for getErrorMessage');
    }
  }

  return { modified, changes, changesList };
}

function calculateRelativePath(from, to) {
  const fromDir = path.dirname(from);
  const relative = path.relative(fromDir, to).replace(/\\/g, '/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { modified, changes, changesList } = replaceCatchAny(content, filePath);

  if (changes > 0) {
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, modified, 'utf-8');
    }
    return { file: filePath, changes, changesList };
  }

  return null;
}

function main() {
  log('🔄 Remplacement des catch (error: any) par catch (error: unknown)', colors.bright + colors.blue);
  if (DRY_RUN) {
    log('🔍 Mode dry-run activé (aucun fichier ne sera modifié)', colors.yellow);
  }

  const srcDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    log('❌ Le dossier src/ n\'existe pas', colors.red);
    process.exit(1);
  }

  const files = findFiles(srcDir);
  log(`\n📁 ${files.length} fichiers trouvés`, colors.cyan);

  const results = [];
  for (const file of files) {
    const result = processFile(file);
    if (result) {
      results.push(result);
    }
  }

  if (results.length === 0) {
    log('\n✅ Aucun changement nécessaire!', colors.green);
    return;
  }

  log(`\n📊 ${results.length} fichiers modifiés`, colors.cyan);
  log(`📝 ${results.reduce((sum, r) => sum + r.changes, 0)} changements au total`, colors.cyan);

  if (DRY_RUN) {
    log('\n🔍 Changements qui seraient effectués:', colors.yellow);
    results.forEach(result => {
      log(`\n${result.file}:`, colors.cyan);
      result.changesList.forEach(change => {
        log(`  - ${change}`, colors.reset);
      });
    });
  } else {
    log('\n✅ Fichiers modifiés:', colors.green);
    results.forEach(result => {
      log(`  - ${result.file} (${result.changes} changements)`, colors.reset);
    });
  }
}

main();

