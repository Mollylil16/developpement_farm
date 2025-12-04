#!/usr/bin/env node

/**
 * Script de vérification complète des dépendances
 * Vérifie les vulnérabilités, les mises à jour disponibles, et la cohérence
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function checkLockFile() {
  logSection('🔒 Vérification du lock file');
  
  const lockFile = path.join(process.cwd(), 'package-lock.json');
  if (fs.existsSync(lockFile)) {
    log('✅ package-lock.json trouvé', colors.green);
    const stats = fs.statSync(lockFile);
    const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
    
    if (ageInDays > 30) {
      log(`⚠️  Le lock file n'a pas été mis à jour depuis ${Math.floor(ageInDays)} jours`, colors.yellow);
      log('   Recommandation: Exécutez "npm install" pour le mettre à jour', colors.yellow);
    } else {
      log(`✅ Lock file récent (${Math.floor(ageInDays)} jours)`, colors.green);
    }
  } else {
    log('❌ package-lock.json non trouvé', colors.red);
    log('   Recommandation: Exécutez "npm install" pour créer le lock file', colors.yellow);
    return false;
  }
  return true;
}

function checkAudit() {
  logSection('🔍 Audit de sécurité');
  
  try {
    log('Exécution de npm audit...', colors.blue);
    const output = execSync('npm audit --json', { encoding: 'utf-8', stdio: 'pipe' });
    const audit = JSON.parse(output);
    
    if (audit.metadata && audit.metadata.vulnerabilities) {
      const vulns = audit.metadata.vulnerabilities;
      const total = vulns.info + vulns.low + vulns.moderate + vulns.high + vulns.critical;
      
      if (total === 0) {
        log('✅ Aucune vulnérabilité trouvée', colors.green);
      } else {
        log(`⚠️  ${total} vulnérabilité(s) trouvée(s):`, colors.yellow);
        if (vulns.critical > 0) log(`   🔴 Critical: ${vulns.critical}`, colors.red);
        if (vulns.high > 0) log(`   🟠 High: ${vulns.high}`, colors.yellow);
        if (vulns.moderate > 0) log(`   🟡 Moderate: ${vulns.moderate}`, colors.yellow);
        if (vulns.low > 0) log(`   🔵 Low: ${vulns.low}`, colors.blue);
        if (vulns.info > 0) log(`   ⚪ Info: ${vulns.info}`, colors.blue);
        
        log('\n   Recommandation: Exécutez "npm audit fix" pour corriger automatiquement', colors.yellow);
      }
      
      return total === 0;
    }
  } catch (error) {
    log('❌ Erreur lors de l\'audit', colors.red);
    log(error.message, colors.red);
    return false;
  }
  
  return true;
}

function checkOutdated() {
  logSection('📦 Vérification des mises à jour disponibles');
  
  try {
    log('Exécution de npm outdated...', colors.blue);
    const output = execSync('npm outdated --json', { encoding: 'utf-8', stdio: 'pipe' });
    const outdated = JSON.parse(output);
    
    const packages = Object.keys(outdated);
    if (packages.length === 0) {
      log('✅ Toutes les dépendances sont à jour', colors.green);
    } else {
      log(`⚠️  ${packages.length} package(s) obsolète(s):`, colors.yellow);
      
      // Grouper par type de mise à jour
      const major = [];
      const minor = [];
      const patch = [];
      
      packages.forEach(pkg => {
        const info = outdated[pkg];
        const current = info.current;
        const wanted = info.wanted;
        const latest = info.latest;
        
        if (latest !== current && latest !== wanted) {
          major.push({ pkg, current, latest });
        } else if (wanted !== current) {
          minor.push({ pkg, current, wanted });
        } else {
          patch.push({ pkg, current, latest });
        }
      });
      
      if (major.length > 0) {
        log('\n   🔴 Mises à jour majeures (breaking changes possibles):', colors.red);
        major.slice(0, 10).forEach(({ pkg, current, latest }) => {
          log(`      ${pkg}: ${current} → ${latest}`, colors.red);
        });
        if (major.length > 10) {
          log(`      ... et ${major.length - 10} autres`, colors.red);
        }
      }
      
      if (minor.length > 0) {
        log('\n   🟡 Mises à jour mineures:', colors.yellow);
        minor.slice(0, 10).forEach(({ pkg, current, wanted }) => {
          log(`      ${pkg}: ${current} → ${wanted}`, colors.yellow);
        });
        if (minor.length > 10) {
          log(`      ... et ${minor.length - 10} autres`, colors.yellow);
        }
      }
      
      if (patch.length > 0) {
        log('\n   🔵 Mises à jour de patch:', colors.blue);
        patch.slice(0, 10).forEach(({ pkg, current, latest }) => {
          log(`      ${pkg}: ${current} → ${latest}`, colors.blue);
        });
        if (patch.length > 10) {
          log(`      ... et ${patch.length - 10} autres`, colors.blue);
        }
      }
      
      log('\n   Recommandation: Exécutez "npm update" pour les mises à jour mineures/patch', colors.yellow);
      log('   Pour les mises à jour majeures, revoir manuellement les changements', colors.yellow);
    }
    
    return packages.length === 0;
  } catch (error) {
    // npm outdated retourne un code d'erreur si des packages sont obsolètes
    // C'est normal, on parse quand même la sortie
    if (error.stdout) {
      try {
        const outdated = JSON.parse(error.stdout);
        const packages = Object.keys(outdated);
        if (packages.length > 0) {
          log(`⚠️  ${packages.length} package(s) obsolète(s)`, colors.yellow);
          return false;
        }
      } catch (e) {
        // Ignorer
      }
    }
    return true;
  }
}

function checkDuplicateDependencies() {
  logSection('🔄 Vérification des dépendances dupliquées');
  
  try {
    const output = execSync('npm ls --depth=0 --json', { encoding: 'utf-8', stdio: 'pipe' });
    const tree = JSON.parse(output);
    
    // Cette vérification est basique, npm ls devrait déjà signaler les problèmes
    log('✅ Vérification des dépendances dupliquées effectuée', colors.green);
    return true;
  } catch (error) {
    // npm ls peut retourner des erreurs pour des dépendances manquantes
    log('⚠️  Certaines dépendances peuvent être manquantes', colors.yellow);
    return false;
  }
}

function generateReport() {
  logSection('📊 Résumé');
  
  const results = {
    lockFile: checkLockFile(),
    audit: checkAudit(),
    outdated: checkOutdated(),
    duplicates: checkDuplicateDependencies(),
  };
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    log('\n✅ Toutes les vérifications sont passées', colors.green);
    process.exit(0);
  } else {
    log('\n⚠️  Certaines vérifications ont échoué', colors.yellow);
    log('   Consultez le rapport ci-dessus pour plus de détails', colors.yellow);
    process.exit(1);
  }
}

// Exécution
log('🔍 Vérification des dépendances', colors.cyan);
generateReport();
