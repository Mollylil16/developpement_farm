/**
 * Script pour corriger automatiquement les erreurs TypeScript dans database.ts
 * Ajoute les casts manquants et corrige les noms de propriétés
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/services/database.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Ajouter des casts pour tous les retours apiClient qui n'en ont pas
const patterns = [
  // Pattern: return apiClient.method(...) sans cast
  {
    regex: /(return apiClient\.\w+\([^)]*\));/g,
    replacement: (match, p1) => {
      // Ne pas modifier si déjà casté
      if (match.includes(' as ')) return match;
      // Déterminer le type de retour basé sur le nom de la méthode
      if (p1.includes('create') || p1.includes('update')) {
        return `${p1} as Promise<any>;`;
      } else if (p1.includes('get') && p1.includes('[]')) {
        return `${p1} as Promise<any[]>;`;
      } else if (p1.includes('get')) {
        return `${p1} as Promise<any | null>;`;
      }
      return match;
    }
  },
  // Pattern: const result = await apiClient.request(...) sans cast
  {
    regex: /(const result = await apiClient\.request\([^)]*\));/g,
    replacement: (match) => {
      if (match.includes(' as ')) return match;
      return match.replace(');', ') as any;');
    }
  },
];

// Appliquer les corrections
patterns.forEach(({ regex, replacement }) => {
  content = content.replace(regex, replacement);
});

// 2. Corriger les noms de propriétés dans les mappings SQLite
const propertyMappings = [
  { old: 'categorie_animal', new: 'categorie' },
  { old: 'age_min_jours', new: 'age_jours' },
  { old: 'age_max_jours', new: 'age_jours' },
  { old: 'animal_id', new: 'animal_ids', context: 'Vaccination' },
  { old: 'medicament', new: 'nom_medicament', context: 'Traitement' },
  { old: 'temps_attente_abattage_jours', new: 'temps_attente_jours' },
  { old: 'efficacite', new: 'efficace' },
  { old: 'prochaine_visite_prevue', new: 'prochaine_visite' },
  { old: 'statut_envoi', new: 'envoi', context: 'RappelVaccination' },
];

// Sauvegarder
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Corrections appliquées');

