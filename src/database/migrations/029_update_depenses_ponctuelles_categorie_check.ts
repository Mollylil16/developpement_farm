/**
 * Migration 029: Mise à jour de la contrainte CHECK pour la catégorie dans depenses_ponctuelles
 *
 * Problème: La contrainte CHECK existante autorise des valeurs obsolètes:
 *   - 'aliment', 'medicament', 'equipement', 'maintenance', 'transport', 'autre'
 *
 * Solution: Recréer la table avec la nouvelle contrainte qui autorise:
 *   - 'vaccins', 'medicaments', 'alimentation', 'veterinaire', 'entretien',
 *     'equipements', 'amenagement_batiment', 'equipement_lourd', 'achat_sujet', 'autre'
 */

import * as SQLite from 'expo-sqlite';
import { migrationLogger } from '../../utils/logger';

export async function updateDepensesPonctuellesCategorieCheck(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  migrationLogger.step(
    'Migration 029: Mise à jour de la contrainte CHECK pour depenses_ponctuelles.categorie'
  );

  try {
    // Vérifier si la table existe
    const tableInfo = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='depenses_ponctuelles'"
    );

    if (tableInfo.length === 0) {
      migrationLogger.info(
        "Table depenses_ponctuelles n'existe pas, la migration sera appliquée lors de la création du schéma."
      );
      return;
    }

    // Sauvegarder les données existantes
    const existingData = await db.getAllAsync<unknown>('SELECT * FROM depenses_ponctuelles');

    migrationLogger.log(`Sauvegarde de ${existingData.length} dépenses ponctuelles existantes`);

    // Créer une table temporaire avec la nouvelle structure
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS depenses_ponctuelles_new (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        montant REAL NOT NULL CHECK (montant >= 0),
        categorie TEXT NOT NULL CHECK (categorie IN ('vaccins', 'medicaments', 'alimentation', 'veterinaire', 'entretien', 'equipements', 'amenagement_batiment', 'equipement_lourd', 'achat_sujet', 'autre')),
        libelle_categorie TEXT,
        type_opex_capex TEXT CHECK (type_opex_capex IN ('opex', 'capex')),
        duree_amortissement_mois INTEGER CHECK (duree_amortissement_mois IS NULL OR duree_amortissement_mois > 0),
        date TEXT NOT NULL,
        commentaire TEXT,
        photos TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
      );
    `);

    // Migrer les données en mappant les anciennes catégories vers les nouvelles
    const categorieMapping: Record<string, string> = {
      aliment: 'alimentation',
      medicament: 'medicaments',
      equipement: 'equipements',
      maintenance: 'entretien',
      transport: 'autre', // Pas de catégorie équivalente, utiliser 'autre'
    };

    let migratedCount = 0;
    let skippedCount = 0;

    for (const row of existingData) {
      let newCategorie = row.categorie;

      // Mapper les anciennes catégories vers les nouvelles
      if (categorieMapping[row.categorie]) {
        newCategorie = categorieMapping[row.categorie];
        migrationLogger.log(`Migration catégorie: "${row.categorie}" → "${newCategorie}"`);
      }

      // Vérifier que la nouvelle catégorie est valide
      const validCategories = [
        'vaccins',
        'medicaments',
        'alimentation',
        'veterinaire',
        'entretien',
        'equipements',
        'amenagement_batiment',
        'equipement_lourd',
        'achat_sujet',
        'autre',
      ];

      if (!validCategories.includes(newCategorie)) {
        migrationLogger.warn(
          `Catégorie invalide "${row.categorie}" pour l'enregistrement ${row.id}, utilisation de "autre"`
        );
        newCategorie = 'autre';
        skippedCount++;
      }

      try {
        await db.runAsync(
          `INSERT INTO depenses_ponctuelles_new (
            id, projet_id, montant, categorie, libelle_categorie, type_opex_capex,
            duree_amortissement_mois, date, commentaire, photos, date_creation, derniere_modification
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            row.projet_id,
            row.montant,
            newCategorie,
            row.libelle_categorie || null,
            row.type_opex_capex || null,
            row.duree_amortissement_mois || null,
            row.date,
            row.commentaire || null,
            row.photos || null,
            row.date_creation || new Date().toISOString(),
            row.derniere_modification || new Date().toISOString(),
          ]
        );
        migratedCount++;
      } catch (error: unknown) {
        migrationLogger.error(
          `Erreur lors de la migration de l'enregistrement ${row.id}:`,
          error.message
        );
        skippedCount++;
      }
    }

    // Supprimer l'ancienne table
    await db.execAsync('DROP TABLE depenses_ponctuelles;');

    // Renommer la nouvelle table
    await db.execAsync('ALTER TABLE depenses_ponctuelles_new RENAME TO depenses_ponctuelles;');

    migrationLogger.success(
      `✅ Migration 029 terminée: ${migratedCount} enregistrements migrés, ${skippedCount} ignorés`
    );
  } catch (error: unknown) {
    migrationLogger.error('❌ Erreur lors de la migration 029:', error.message);
    throw error;
  }
}
