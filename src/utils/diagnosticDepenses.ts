/**
 * Utilitaire de diagnostic pour les dépenses
 */

import { getDatabase } from '../services/database';

export async function diagnosticDepenses(projetId: string): Promise<void> {
  console.log('');
  console.log('🔍 ========================================');
  console.log('🔍 DIAGNOSTIC DES DÉPENSES');
  console.log('🔍 ========================================');
  
  try {
    const db = await getDatabase();
    
    // 1. Vérifier la structure de la table
    console.log('\n📋 Structure de la table depenses_ponctuelles:');
    const columns = await db.getAllAsync<{ name: string; type: string }>(
      "PRAGMA table_info('depenses_ponctuelles')"
    );
    console.log('  Colonnes:', columns.map(c => `${c.name} (${c.type})`).join(', '));
    
    const hasTypeDepense = columns.some(c => c.name === 'type_depense');
    console.log(`  ✅ Colonne type_depense: ${hasTypeDepense ? 'OUI' : 'NON'}`);
    
    // 2. Compter les dépenses par type
    console.log('\n📊 Répartition des dépenses:');
    const countByType = await db.getAllAsync<{ type_depense: string | null; count: number; total: number }>(
      `SELECT 
        type_depense, 
        COUNT(*) as count,
        SUM(montant) as total
      FROM depenses_ponctuelles 
      WHERE projet_id = ?
      GROUP BY type_depense`,
      [projetId]
    );
    
    countByType.forEach(row => {
      const type = row.type_depense || 'NULL';
      console.log(`  ${type}: ${row.count} dépenses, Total: ${row.total?.toLocaleString()} FCFA`);
    });
    
    // 3. Total général
    const total = await db.getFirstAsync<{ count: number; total: number }>(
      `SELECT COUNT(*) as count, SUM(montant) as total 
       FROM depenses_ponctuelles 
       WHERE projet_id = ?`,
      [projetId]
    );
    console.log(`\n💰 TOTAL DÉPENSES PONCTUELLES: ${total?.count} dépenses, ${total?.total?.toLocaleString()} FCFA`);
    
    // 3b. Lister les 10 dernières dépenses
    console.log('\n📝 Dernières dépenses enregistrées:');
    const dernieres = await db.getAllAsync<{ id: string; date: string; montant: number; type_depense: string | null; categorie?: string; libelle_categorie?: string }>(
      `SELECT id, date, montant, type_depense, categorie, libelle_categorie 
       FROM depenses_ponctuelles 
       WHERE projet_id = ?
       ORDER BY date DESC
       LIMIT 10`,
      [projetId]
    );
    
    dernieres.forEach((d, i) => {
      const libelle = d.libelle_categorie || d.categorie || 'Sans libellé';
      console.log(`  ${i + 1}. ${d.date.substring(0, 10)} - ${d.montant.toLocaleString()} FCFA - ${d.type_depense || 'NULL'} - ${libelle}`);
    });
    
    // 4. Vérifier les ventes
    console.log('\n🐷 Ventes de porcs:');
    const ventes = await db.getAllAsync<{ count: number; total_kg: number }>(
      `SELECT 
        COUNT(*) as count,
        SUM(poids_kg) as total_kg
      FROM revenus 
      WHERE projet_id = ? AND categorie = 'vente_porc'`,
      [projetId]
    );
    
    if (ventes && ventes.length > 0) {
      console.log(`  ${ventes[0].count} ventes, Total: ${ventes[0].total_kg} kg`);
    } else {
      console.log('  ⚠️  Aucune vente enregistrée');
    }
    
    console.log('\n🔍 ========================================\n');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  }
}

