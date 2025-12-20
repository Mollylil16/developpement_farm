/**
 * Script pour générer un schéma SQL PostgreSQL à partir des schémas SQLite
 * Usage: npx ts-node scripts/generate-postgresql-schema.ts > database/postgresql_schema.sql
 */

import * as fs from 'fs';
import * as path from 'path';

// Fonction pour convertir SQLite vers PostgreSQL (conservée pour usage futur)
// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
function _convertSQLiteToPostgreSQL(_sqliteSQL: string): string {
  let pgSQL = _sqliteSQL;

  // Remplacer les types SQLite par PostgreSQL
  pgSQL = pgSQL.replace(/TEXT\s+/gi, 'VARCHAR(255) ');
  pgSQL = pgSQL.replace(/INTEGER\s+/gi, 'INTEGER ');
  pgSQL = pgSQL.replace(/REAL\s+/gi, 'NUMERIC(10, 2) ');

  // Remplacer CURRENT_TIMESTAMP par NOW()
  pgSQL = pgSQL.replace(/CURRENT_TIMESTAMP/gi, 'NOW()');

  // Remplacer CREATE TABLE IF NOT EXISTS (PostgreSQL le supporte)
  // Pas besoin de changement

  // Ajouter SERIAL pour les auto-increment (si nécessaire)
  // Pour l'instant, on garde les TEXT PRIMARY KEY

  return pgSQL;
}

// Lire tous les schémas
const schemasDir = path.join(__dirname, '../src/database/schemas');
const outputFile = path.join(__dirname, '../database/postgresql_schema.sql');

let output = `-- Schéma PostgreSQL pour Fermier Pro
-- Généré automatiquement depuis les schémas SQLite
-- Date: ${new Date().toISOString()}

-- ============================================
-- CORE TABLES
-- ============================================

`;

// Fonction pour lire et convertir un fichier de schéma
function processSchemaFile(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extraire les CREATE TABLE statements
  const createTableRegex = /CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(([\s\S]*?)\);/gi;
  let match;
  let result = '';

  while ((match = createTableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const tableDef = match[2];

    // Convertir la définition
    const pgTableDef = tableDef
      .replace(/TEXT/gi, 'VARCHAR(255)')
      .replace(/REAL/gi, 'NUMERIC(10, 2)')
      .replace(/CURRENT_TIMESTAMP/gi, 'NOW()')
      .replace(/INTEGER/gi, 'INTEGER');

    result += `-- Table: ${tableName}\n`;
    result += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
    result += pgTableDef
      .split(',')
      .map((line) => '  ' + line.trim())
      .join(',\n');
    result += '\n);\n\n';
  }

  return result;
}

// Traiter tous les fichiers de schéma
const schemaFiles = [
  'core/users.schema.ts',
  'core/projets.schema.ts',
  'core/regional_pork_price.schema.ts',
  'finance/charges_fixes.schema.ts',
  'finance/depenses_ponctuelles.schema.ts',
  'finance/revenus.schema.ts',
  'production/animaux.schema.ts',
  'production/pesees.schema.ts',
  'production/gestations.schema.ts',
  'production/sevrages.schema.ts',
  'production/mortalites.schema.ts',
  'production/planifications.schema.ts',
  'nutrition/ingredients.schema.ts',
  'nutrition/rations.schema.ts',
  'nutrition/ingredients_ration.schema.ts',
  'nutrition/rations_budget.schema.ts',
  'nutrition/stocks_aliments.schema.ts',
  'nutrition/stocks_mouvements.schema.ts',
  'nutrition/rapports_croissance.schema.ts',
  'sante/calendrier_vaccinations.schema.ts',
  'sante/vaccinations.schema.ts',
  'sante/maladies.schema.ts',
  'sante/traitements.schema.ts',
  'sante/visites_veterinaires.schema.ts',
  'sante/rappels_vaccinations.schema.ts',
  'collaboration/collaborations.schema.ts',
  'chatAgent/chat_agent_conversations.schema.ts',
  'veterinarians.schema.ts',
];

for (const schemaFile of schemaFiles) {
  const fullPath = path.join(schemasDir, schemaFile);
  if (fs.existsSync(fullPath)) {
    output += `-- ============================================\n`;
    output += `-- ${schemaFile}\n`;
    output += `-- ============================================\n\n`;
    output += processSchemaFile(fullPath);
  }
}

// Ajouter les index (basiques)
output += `-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projets_proprietaire ON projets(proprietaire_id);
CREATE INDEX IF NOT EXISTS idx_animaux_projet ON animaux(projet_id);
CREATE INDEX IF NOT EXISTS idx_revenus_projet ON revenus(projet_id);
CREATE INDEX IF NOT EXISTS idx_depenses_projet ON depenses_ponctuelles(projet_id);
CREATE INDEX IF NOT EXISTS idx_charges_fixes_projet ON charges_fixes(projet_id);

`;

// Écrire le fichier
fs.writeFileSync(outputFile, output, 'utf-8');
console.log(`✅ Schéma PostgreSQL généré: ${outputFile}`);
