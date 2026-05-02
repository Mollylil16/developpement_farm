/**
 * Migration: Ajout des champs OPEX/CAPEX
 *
 * Cette migration ajoute les champs nécessaires pour le système OPEX/CAPEX:
 * - Classification OPEX/CAPEX sur les dépenses
 * - Amortissement des investissements (CAPEX)
 * - Marges réelles sur les ventes
 *
 * @version 1.0.0
 * @date 2025-11-21
 */

import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Vérifie si la migration OPEX/CAPEX a déjà été appliquée
 */
export async function isOpexCapexMigrationApplied(db: SQLiteDatabase): Promise<boolean> {
  try {
    // Vérifier si les nouvelles colonnes existent sur les dépenses
    const depenseColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info('depenses_ponctuelles')"
    );

    const hasTypeDepense = depenseColumns.some((col) => col.name === 'type_depense');
    const hasDureeAmortissement = depenseColumns.some(
      (col) => col.name === 'duree_amortissement_mois'
    );

    // Vérifier si les nouvelles colonnes existent sur les projets
    const projetColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info('projets')");

    const hasDureeAmortissementDefaut = projetColumns.some(
      (col) => col.name === 'duree_amortissement_par_defaut_mois'
    );

    // Vérifier si les nouvelles colonnes existent sur les ventes
    const venteColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info('revenus')");

    const hasCoutReelOpex = venteColumns.some((col) => col.name === 'cout_reel_opex');
    const hasMargeOpex = venteColumns.some((col) => col.name === 'marge_opex');

    // Migration appliquée si tous les champs sont présents
    return (
      hasTypeDepense &&
      hasDureeAmortissement &&
      hasDureeAmortissementDefaut &&
      hasCoutReelOpex &&
      hasMargeOpex
    );
  } catch (error) {
    console.error('Erreur lors de la vérification de la migration OPEX/CAPEX:', error);
    return false;
  }
}

/**
 * Applique la migration OPEX/CAPEX
 */
export async function migrateOpexCapexFields(db: SQLiteDatabase): Promise<void> {
  console.log('🔄 Début de la migration OPEX/CAPEX...');

  try {
    // ========================================
    // ÉTAPE 1: Modifier la table depenses_ponctuelles
    // ========================================
    console.log('📝 Étape 1/5: Ajout champs OPEX/CAPEX sur depenses_ponctuelles...');

    // Vérifier si type_depense existe
    const depenseColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info('depenses_ponctuelles')"
    );
    const hasTypeDepense = depenseColumns.some((col) => col.name === 'type_depense');

    if (!hasTypeDepense) {
      await db.execAsync(`
        ALTER TABLE depenses_ponctuelles 
        ADD COLUMN type_depense TEXT DEFAULT 'OPEX' 
        CHECK (type_depense IN ('OPEX', 'CAPEX'));
      `);
      console.log('  ✅ Colonne type_depense ajoutée');
    }

    // Vérifier si duree_amortissement_mois existe
    const hasDureeAmortissement = depenseColumns.some(
      (col) => col.name === 'duree_amortissement_mois'
    );

    if (!hasDureeAmortissement) {
      await db.execAsync(`
        ALTER TABLE depenses_ponctuelles 
        ADD COLUMN duree_amortissement_mois INTEGER DEFAULT 36;
      `);
      console.log('  ✅ Colonne duree_amortissement_mois ajoutée');
    }

    // Vérifier si montant_amortissement_mensuel existe
    const hasMontantAmortissement = depenseColumns.some(
      (col) => col.name === 'montant_amortissement_mensuel'
    );

    if (!hasMontantAmortissement) {
      await db.execAsync(`
        ALTER TABLE depenses_ponctuelles 
        ADD COLUMN montant_amortissement_mensuel REAL;
      `);
      console.log('  ✅ Colonne montant_amortissement_mensuel ajoutée');
    }

    // ========================================
    // ÉTAPE 2: Modifier la table projets (durée amortissement par défaut)
    // ========================================
    console.log('📝 Étape 2/6: Ajout durée amortissement par défaut sur projets...');

    const projetColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info('projets')");
    const hasDureeAmortissementDefaut = projetColumns.some(
      (col) => col.name === 'duree_amortissement_par_defaut_mois'
    );

    if (!hasDureeAmortissementDefaut) {
      await db.execAsync(`
        ALTER TABLE projets 
        ADD COLUMN duree_amortissement_par_defaut_mois INTEGER DEFAULT 36;
      `);
      console.log('  ✅ Colonne duree_amortissement_par_defaut_mois ajoutée sur projets');
    }

    // ========================================
    // ÉTAPE 3: Modifier la table charges_fixes
    // ========================================
    console.log('📝 Étape 3/6: Ajout champs OPEX/CAPEX sur charges_fixes...');

    const chargeColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info('charges_fixes')"
    );
    const hasTypeDepenseCharge = chargeColumns.some((col) => col.name === 'type_depense');

    if (!hasTypeDepenseCharge) {
      await db.execAsync(`
        ALTER TABLE charges_fixes 
        ADD COLUMN type_depense TEXT DEFAULT 'OPEX' 
        CHECK (type_depense IN ('OPEX', 'CAPEX'));
      `);
      console.log('  ✅ Colonne type_depense ajoutée sur charges_fixes');
    }

    const hasDureeAmortissementCharge = chargeColumns.some(
      (col) => col.name === 'duree_amortissement_mois'
    );

    if (!hasDureeAmortissementCharge) {
      await db.execAsync(`
        ALTER TABLE charges_fixes 
        ADD COLUMN duree_amortissement_mois INTEGER DEFAULT 36;
      `);
      console.log('  ✅ Colonne duree_amortissement_mois ajoutée sur charges_fixes');
    }

    const hasMontantAmortissementCharge = chargeColumns.some(
      (col) => col.name === 'montant_amortissement_mensuel'
    );

    if (!hasMontantAmortissementCharge) {
      await db.execAsync(`
        ALTER TABLE charges_fixes 
        ADD COLUMN montant_amortissement_mensuel REAL;
      `);
      console.log('  ✅ Colonne montant_amortissement_mensuel ajoutée sur charges_fixes');
    }

    // ========================================
    // ÉTAPE 4: Modifier la table revenus (ventes porcs)
    // ========================================
    console.log('📝 Étape 4/6: Ajout champs marges sur revenus...');

    const venteColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info('revenus')");

    const columnsToAdd = [
      { name: 'cout_reel_opex', type: 'REAL', description: 'Coût réel OPEX' },
      {
        name: 'cout_reel_complet',
        type: 'REAL',
        description: 'Coût réel complet (OPEX + amortissement CAPEX)',
      },
      { name: 'marge_opex', type: 'REAL', description: 'Marge OPEX (prix - coût OPEX)' },
      { name: 'marge_complete', type: 'REAL', description: 'Marge complète (prix - coût complet)' },
      { name: 'marge_opex_pourcent', type: 'REAL', description: 'Marge OPEX en %' },
      { name: 'marge_complete_pourcent', type: 'REAL', description: 'Marge complète en %' },
    ];

    for (const column of columnsToAdd) {
      const hasColumn = venteColumns.some((col) => col.name === column.name);

      if (!hasColumn) {
        await db.execAsync(`
          ALTER TABLE revenus ADD COLUMN ${column.name} ${column.type};
        `);
        console.log(`  ✅ Colonne ${column.name} ajoutée`);
      }
    }

    // ========================================
    // ÉTAPE 5: Initialiser les valeurs par défaut
    // ========================================
    console.log('📝 Étape 5/6: Initialisation des valeurs par défaut...');

    // Définir type_depense = 'OPEX' pour toutes les dépenses existantes (sauf si déjà CAPEX)
    await db.execAsync(`
      UPDATE depenses_ponctuelles 
      SET type_depense = 'OPEX' 
      WHERE type_depense IS NULL OR type_depense = '';
    `);

    await db.execAsync(`
      UPDATE charges_fixes 
      SET type_depense = 'OPEX' 
      WHERE type_depense IS NULL OR type_depense = '';
    `);

    console.log('  ✅ Type OPEX défini par défaut sur dépenses existantes');

    // Calculer montant_amortissement_mensuel pour les CAPEX existants
    await db.execAsync(`
      UPDATE depenses_ponctuelles 
      SET montant_amortissement_mensuel = montant / COALESCE(duree_amortissement_mois, 36)
      WHERE type_depense = 'CAPEX' 
        AND montant_amortissement_mensuel IS NULL
        AND montant IS NOT NULL;
    `);

    await db.execAsync(`
      UPDATE charges_fixes 
      SET montant_amortissement_mensuel = montant / COALESCE(duree_amortissement_mois, 36)
      WHERE type_depense = 'CAPEX' 
        AND montant_amortissement_mensuel IS NULL
        AND montant IS NOT NULL;
    `);

    console.log("  ✅ Montants d'amortissement calculés pour CAPEX existants");

    // ========================================
    // ÉTAPE 6: Créer les index pour performances
    // ========================================
    console.log('📝 Étape 6/6: Création des index...');

    try {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_depenses_type_depense 
        ON depenses_ponctuelles(type_depense);
      `);
      console.log('  ✅ Index idx_depenses_type_depense créé');
    } catch (error) {
      console.warn('  ⚠️  Impossible de créer idx_depenses_type_depense:', error);
    }

    try {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_charges_type_depense 
        ON charges_fixes(type_depense);
      `);
      console.log('  ✅ Index idx_charges_type_depense créé');
    } catch (error) {
      console.warn('  ⚠️  Impossible de créer idx_charges_type_depense:', error);
    }

    try {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_revenus_marges 
        ON revenus(marge_complete, marge_complete_pourcent);
      `);
      console.log('  ✅ Index idx_revenus_marges créé');
    } catch (error) {
      console.warn('  ⚠️  Impossible de créer idx_revenus_marges:', error);
    }

    console.log('✅ Migration OPEX/CAPEX terminée avec succès !');
    console.log('📊 Statistiques:');
    console.log('   - 3 colonnes ajoutées sur depenses_ponctuelles');
    console.log('   - 3 colonnes ajoutées sur charges_fixes');
    console.log('   - 1 colonne ajoutée sur projets');
    console.log('   - 6 colonnes ajoutées sur revenus');
    console.log('   - 3 index créés pour performances');
    console.log('   - Total: 13 champs + 3 index');
  } catch (error) {
    console.error('❌ Erreur lors de la migration OPEX/CAPEX:', error);
    throw error;
  }
}

/**
 * Fonction de rollback (optionnelle, pour tests)
 *
 * ⚠️ ATTENTION: Cette fonction supprime les colonnes ajoutées.
 * À utiliser UNIQUEMENT pour les tests ou rollback d'urgence.
 */
export async function rollbackOpexCapexMigration(db: SQLiteDatabase): Promise<void> {
  console.warn('⚠️  ROLLBACK de la migration OPEX/CAPEX...');

  try {
    // SQLite ne supporte pas DROP COLUMN directement
    // Il faut recréer les tables sans les colonnes

    // Pour depenses_ponctuelles
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS depenses_ponctuelles_backup AS 
      SELECT 
        id, projet_id, description, montant, date, 
        categorie, payment_method, notes, created_at, updated_at
      FROM depenses_ponctuelles;
    `);

    await db.execAsync(`DROP TABLE depenses_ponctuelles;`);
    await db.execAsync(`ALTER TABLE depenses_ponctuelles_backup RENAME TO depenses_ponctuelles;`);

    // Pour charges_fixes
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS charges_fixes_backup AS 
      SELECT 
        id, projet_id, nom, montant, frequence, 
        date_debut, date_fin, actif, description, created_at, updated_at
      FROM charges_fixes;
    `);

    await db.execAsync(`DROP TABLE charges_fixes;`);
    await db.execAsync(`ALTER TABLE charges_fixes_backup RENAME TO charges_fixes;`);

    // Pour revenus
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS revenus_backup AS 
      SELECT 
        id, projet_id, type, description, montant, 
        date, payment_method, notes, created_at, updated_at
      FROM revenus;
    `);

    await db.execAsync(`DROP TABLE revenus;`);
    await db.execAsync(`ALTER TABLE revenus_backup RENAME TO revenus;`);

    console.log('✅ Rollback OPEX/CAPEX terminé');
  } catch (error) {
    console.error('❌ Erreur lors du rollback OPEX/CAPEX:', error);
    throw error;
  }
}
