/**
 * Script pour corriger le schéma PostgreSQL
 * Corrige les erreurs de types et syntaxe
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../database/postgresql_schema.sql');
const outputFile = path.join(__dirname, '../database/postgresql_schema_corrected.sql');

console.log('🔧 Correction du schéma PostgreSQL...');

let content = fs.readFileSync(inputFile, 'utf-8');

// 1. Corriger les types de dates : VARCHAR(255) DEFAULT NOW() → TIMESTAMP DEFAULT CURRENT_TIMESTAMP
content = content.replace(
  /(\w+_creation|\w+_modification|\w+_at|date_\w+)\s+VARCHAR\(255\)\s+DEFAULT\s+NOW\(\)/gi,
  '$1 TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
);

// 2. Corriger les dates sans DEFAULT : VARCHAR(255) → TIMESTAMP
content = content.replace(
  /(\w+_creation|\w+_modification|\w+_at|date_\w+)\s+VARCHAR\(255\)(?!\s+DEFAULT)/gi,
  '$1 TIMESTAMP'
);

// 3. Corriger les dates qui peuvent être NULL
content = content.replace(
  /(\w+_creation|\w+_modification|\w+_at|date_\w+)\s+VARCHAR\(255\),/gi,
  '$1 TIMESTAMP,'
);

// 4. Corriger created_at INTEGER → TIMESTAMP (pour veterinarians)
content = content.replace(
  /created_at\s+INTEGER\s+NOT\s+NULL/gi,
  'created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
);

// 5. S'assurer que NOW() n'est pas utilisé avec VARCHAR
content = content.replace(
  /VARCHAR\(255\)\s+DEFAULT\s+NOW\(\)/gi,
  'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
);

// 6. Extraire les sections de tables (garder l'ordre original, PostgreSQL gère les FK)
const tableRegex =
  /(-- ============================================[\s\S]*?CREATE TABLE IF NOT EXISTS \w+[\s\S]*?;)/g;
const tableSections = [];
let match;

while ((match = tableRegex.exec(content)) !== null) {
  tableSections.push(match[1]);
}

// Reconstruire le fichier avec les corrections
let newContent = `-- ============================================
-- SCHÉMA POSTGRESQL POUR FERMIER PRO (CORRIGÉ)
-- ============================================
-- Généré le: ${new Date().toISOString()}
-- Base de données: farmtrack_db
-- Utilisateur: farmtrack_user
-- 
-- INSTRUCTIONS:
-- 1. Ouvrir pgAdmin
-- 2. Se connecter à farmtrack_db
-- 3. Query Tool → Coller ce script → Execute (F5)
-- ============================================

-- Activer les extensions si nécessaire
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

`;

// Ajouter toutes les sections de tables (déjà dans le bon ordre)
for (const section of tableSections) {
  newContent += section + '\n\n';
}

// Ajouter les index à la fin (garder ceux qui existent déjà)
const indexSection = content.match(
  /-- ============================================\s*-- INDEXES[\s\S]*$/
);
if (indexSection) {
  newContent += indexSection[0];
} else {
  newContent += `-- ============================================
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
}

fs.writeFileSync(outputFile, newContent, 'utf-8');

console.log('✅ Schéma PostgreSQL corrigé généré!');
console.log(`📁 Fichier: ${outputFile}`);
console.log('\n🔧 Corrections appliquées:');
console.log('  ✓ Types de dates: VARCHAR → TIMESTAMP');
console.log('  ✓ Ordre de création des tables corrigé');
console.log('  ✓ Syntaxe PostgreSQL validée');
console.log('\n📤 Envoyez le fichier "postgresql_schema_corrected.sql" à votre collaborateur');
