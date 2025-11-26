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
    try {
      const countByType = await db.getAllAsync<{ type_depense: string | null; count: number; total: number | null }>(
        `SELECT 
          type_depense, 
          COUNT(*) as count,
          COALESCE(SUM(montant), 0) as total
        FROM depenses_ponctuelles 
        WHERE projet_id = ?
        GROUP BY type_depense`,
        [projetId]
      );
      
      if (countByType && countByType.length > 0) {
        countByType.forEach(row => {
          const type = row.type_depense || 'NULL';
          const count = row.count || 0;
          const total = row.total || 0;
          console.log(`  ${type}: ${count} dépenses, Total: ${total.toLocaleString()} FCFA`);
        });
      } else {
        console.log('  ⚠️  Aucune dépense trouvée');
      }
    } catch (groupByError) {
      console.log('  ⚠️  Impossible d\'analyser par type (erreur GROUP BY), continuons...');
    }
    
    // 3. Total général
    const total = await db.getFirstAsync<{ count: number; total: number | null }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(montant), 0) as total 
       FROM depenses_ponctuelles 
       WHERE projet_id = ?`,
      [projetId]
    );
    const totalCount = total?.count || 0;
    const totalMontant = total?.total || 0;
    console.log(`\n💰 TOTAL DÉPENSES PONCTUELLES: ${totalCount} dépenses, ${totalMontant.toLocaleString()} FCFA`);
    
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
      const date = d.date ? String(d.date).substring(0, 10) : 'Date inconnue';
      const montant = d.montant != null ? d.montant.toLocaleString() : '0';
      const type = d.type_depense || 'NULL';
      console.log(`  ${i + 1}. ${date} - ${montant} FCFA - ${type} - ${libelle}`);
    });
    
    // 4. Vérifier les ventes
    console.log('\n🐷 Ventes de porcs:');
    const ventes = await db.getAllAsync<{ count: number; total_kg: number | null }>(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(poids_kg), 0) as total_kg
      FROM revenus 
      WHERE projet_id = ? AND categorie = 'vente_porc'`,
      [projetId]
    );
    
    if (ventes && ventes.length > 0 && ventes[0].count > 0) {
      const totalKg = ventes[0].total_kg || 0;
      console.log(`  ${ventes[0].count} ventes, Total: ${totalKg} kg`);
    } else {
      console.log('  ⚠️  Aucune vente enregistrée');
    }
    
    console.log('\n🔍 ========================================\n');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  }
}

