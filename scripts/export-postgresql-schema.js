/**
 * Script pour exporter le schéma SQLite vers PostgreSQL
 * Usage: node scripts/export-postgresql-schema.js
 */

const fs = require('fs');
const path = require('path');

// Fonction pour extraire le SQL d'un fichier de schéma TypeScript
function extractSQLFromSchema(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sqlMatches = content.match(/CREATE TABLE IF NOT EXISTS[\s\S]*?;/g);
  return sqlMatches || [];
}

// Fonction pour convertir SQLite vers PostgreSQL
function convertToPostgreSQL(sqliteSQL) {
  let pgSQL = sqliteSQL;

  // Remplacer les types
  pgSQL = pgSQL.replace(/TEXT\b/gi, 'VARCHAR(255)');
  pgSQL = pgSQL.replace(/\bREAL\b/gi, 'NUMERIC(10, 2)');
  pgSQL = pgSQL.replace(/CURRENT_TIMESTAMP/gi, 'NOW()');

  // INTEGER reste INTEGER en PostgreSQL

  return pgSQL;
}

// Liste des fichiers de schéma à traiter
const schemasDir = path.join(__dirname, '../src/database/schemas');
const outputDir = path.join(__dirname, '../database');

// Créer le dossier database s'il n'existe pas
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let output = `-- ============================================
-- SCHÉMA POSTGRESQL POUR FERMIER PRO
-- ============================================
-- Généré le: ${new Date().toISOString()}
-- 
-- INSTRUCTIONS:
-- 1. Créer une base de données: CREATE DATABASE fermier_pro;
-- 2. Se connecter à la base: \\c fermier_pro;
-- 3. Exécuter ce script: \\i postgresql_schema.sql
-- ============================================

-- Activer les extensions si nécessaire
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

`;

// Fonction récursive pour lire tous les fichiers .schema.ts
function processDirectory(dir, relativePath = '') {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath, path.join(relativePath, file));
    } else if (file.endsWith('.schema.ts')) {
      const sqlStatements = extractSQLFromSchema(fullPath);
      if (sqlStatements.length > 0) {
        output += `\n-- ============================================\n`;
        output += `-- ${path.join(relativePath, file)}\n`;
        output += `-- ============================================\n\n`;

        for (const sql of sqlStatements) {
          const pgSQL = convertToPostgreSQL(sql);
          output += pgSQL + '\n\n';
        }
      }
    }
  }
}

// Traiter tous les schémas
processDirectory(schemasDir);

// Ajouter les index de base
output += `-- ============================================
-- INDEXES POUR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projets_proprietaire ON projets(proprietaire_id);
CREATE INDEX IF NOT EXISTS idx_animaux_projet ON production_animaux(projet_id);
CREATE INDEX IF NOT EXISTS idx_animaux_statut ON production_animaux(statut);
CREATE INDEX IF NOT EXISTS idx_revenus_projet ON revenus(projet_id);
CREATE INDEX IF NOT EXISTS idx_revenus_date ON revenus(date);
CREATE INDEX IF NOT EXISTS idx_depenses_projet ON depenses_ponctuelles(projet_id);
CREATE INDEX IF NOT EXISTS idx_depenses_date ON depenses_ponctuelles(date);
CREATE INDEX IF NOT EXISTS idx_charges_fixes_projet ON charges_fixes(projet_id);
CREATE INDEX IF NOT EXISTS idx_pesees_animal ON production_pesees(animal_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_animal ON vaccinations(animal_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_projet ON collaborations(projet_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_user ON collaborations(user_id);

`;

// Écrire le fichier
const outputFile = path.join(outputDir, 'postgresql_schema.sql');
fs.writeFileSync(outputFile, output, 'utf-8');

console.log('✅ Schéma PostgreSQL généré avec succès!');
console.log(`📁 Fichier: ${outputFile}`);
console.log('\n📋 Prochaines étapes:');
console.log('1. Ouvrir pgAdmin ou psql');
console.log('2. Créer une base de données: CREATE DATABASE fermier_pro;');
console.log('3. Se connecter à la base: \\c fermier_pro;');
console.log('4. Exécuter le script: \\i database/postgresql_schema.sql');
