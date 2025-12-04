/**
 * Migration 20 : Ajouter colonnes de calcul de marge dans revenus
 * Permet de stocker les calculs de marge OPEX et complète
 * 
 * Version: 20
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function addMargeFieldsToRevenus(db: SQLiteDatabase): Promise<void> {
  const revenusColumns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info('revenus')"
  );
  
  // Colonnes pour les coûts par kg
  const columnsToAdd = [
    { name: 'cout_kg_opex', type: 'REAL', description: 'Coût OPEX par kg' },
    { name: 'cout_kg_complet', type: 'REAL', description: 'Coût complet par kg (OPEX + CAPEX amorti)' },
    { name: 'cout_reel_opex', type: 'REAL', description: 'Coût réel OPEX' },
    { name: 'cout_reel_complet', type: 'REAL', description: 'Coût réel complet' },
    { name: 'marge_opex', type: 'REAL', description: 'Marge OPEX en valeur' },
    { name: 'marge_complete', type: 'REAL', description: 'Marge complète en valeur' },
    { name: 'marge_opex_pourcent', type: 'REAL', description: 'Marge OPEX en %' },
    { name: 'marge_complete_pourcent', type: 'REAL', description: 'Marge complète en %' },
  ];
  
  for (const column of columnsToAdd) {
    const hasColumn = revenusColumns.some((col) => col.name === column.name);
    
    if (!hasColumn) {
      await db.execAsync(`
        ALTER TABLE revenus ADD COLUMN ${column.name} ${column.type};
      `);
      console.log(`✅ Migration: Colonne ${column.name} ajoutée à revenus`);
    }
  }
}

