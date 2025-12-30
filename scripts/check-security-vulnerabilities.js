#!/usr/bin/env node
/**
 * Script pour vérifier les vulnérabilités de sécurité connues
 * et détecter si des corrections sont disponibles
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SECURITY_FILE = path.join(__dirname, '..', 'SECURITY.md');

console.log('🔍 Vérification des vulnérabilités de sécurité...\n');

// 1. Vérifier npm audit
console.log('1️⃣ Exécution de npm audit...');
try {
  // npm audit retourne un code d'erreur si des vulnérabilités sont trouvées
  // On doit capturer la sortie même en cas d'erreur
  let auditOutput;
  try {
    auditOutput = execSync('npm audit --json', { encoding: 'utf-8', stdio: 'pipe' });
  } catch (e) {
    // npm audit retourne un code d'erreur si des vulnérabilités sont trouvées
    // mais la sortie JSON est toujours valide
    auditOutput = e.stdout || e.toString();
  }
  
  const audit = JSON.parse(auditOutput);
  
  if (audit.vulnerabilities && Object.keys(audit.vulnerabilities).length > 0) {
    console.log(`   ⚠️  ${Object.keys(audit.vulnerabilities).length} vulnérabilité(s) détectée(s)`);
    
    // Vérifier spécifiquement qs
    if (audit.vulnerabilities.qs) {
      const qsVuln = audit.vulnerabilities.qs;
      console.log(`   📦 qs: ${qsVuln.name}@${qsVuln.installedVersion}`);
      console.log(`      Sévérité: ${qsVuln.severity}`);
      console.log(`      Fix disponible: ${qsVuln.fixAvailable ? 'Oui' : 'Non'}`);
    }
  } else {
    console.log('   ✅ Aucune vulnérabilité détectée');
  }
} catch (error) {
  console.log('   ⚠️  Erreur lors de l\'audit:', error.message);
}

// 2. Vérifier la version actuelle de qs
console.log('\n2️⃣ Vérification de la version de qs...');
try {
  const qsVersion = execSync('npm view qs version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
  console.log(`   📦 Version disponible sur npm: ${qsVersion}`);
  
  // Vérifier si une version >= 6.14.1 existe
  try {
    const qsLatest = execSync('npm view qs@latest version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    if (qsLatest !== qsVersion) {
      console.log(`   📦 Dernière version: ${qsLatest}`);
    }
  } catch {
    // Ignorer si la version n'existe pas
  }
} catch (error) {
  console.log('   ⚠️  Erreur:', error.message);
}

// 3. Vérifier @react-native-community/cli
console.log('\n3️⃣ Vérification de @react-native-community/cli...');
try {
  const cliVersion = execSync('npm view @react-native-community/cli version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
  console.log(`   📦 Version disponible: ${cliVersion}`);
  
  // Lire la version installée
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
  const installedVersion = packageJson.devDependencies['@react-native-community/cli'];
  if (installedVersion) {
    console.log(`   📦 Version installée: ${installedVersion}`);
  }
} catch (error) {
  console.log('   ⚠️  Erreur:', error.message);
}

// 4. Vérifier si SECURITY.md existe et afficher un résumé
console.log('\n4️⃣ Résumé:');
if (fs.existsSync(SECURITY_FILE)) {
  console.log('   📄 Fichier SECURITY.md trouvé');
  const securityContent = fs.readFileSync(SECURITY_FILE, 'utf-8');
  if (securityContent.includes('qs < 6.14.1')) {
    console.log('   ⚠️  Vulnérabilité qs documentée dans SECURITY.md');
    console.log('   💡 Vérifiez régulièrement si une correction est disponible');
  }
} else {
  console.log('   ⚠️  Fichier SECURITY.md non trouvé');
}

console.log('\n✅ Vérification terminée');
console.log('💡 Exécutez "npm audit fix" si des corrections sont disponibles');

