/**
 * Migration 23 : Recalculer les GMQ des pesées existantes
 * Utilise la nouvelle fonction de calcul pour mettre à jour les GMQ historiques
 * 
 * Version: 23
 * 
 * Note: Cette migration utilise AnimalRepository et peut être longue sur de grandes bases
 */

import type { SQLiteDatabase } from 'expo-sqlite';

// Fonction helper pour calculer la différence en jours
function calculateDayDifference(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Fonction helper pour obtenir le GMQ standard selon le poids
function getStandardGMQ(poidsKg: number): { gmq_cible: number } | null {
  // Standards de GMQ selon le poids (g/jour)
  if (poidsKg < 20) return { gmq_cible: 400 };
  if (poidsKg < 40) return { gmq_cible: 600 };
  if (poidsKg < 60) return { gmq_cible: 700 };
  if (poidsKg < 80) return { gmq_cible: 650 };
  if (poidsKg < 100) return { gmq_cible: 500 };
  return { gmq_cible: 400 };
}

export async function recalculateGmq(db: SQLiteDatabase): Promise<void> {
  // Vérifier si la migration a déjà été effectuée
  const migrationCheck = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
  );

  let migrationEffectuee = false;
  if (migrationCheck) {
    const gmqMigration = await db.getFirstAsync<{ done: number } | null>(
      "SELECT done FROM _migrations WHERE migration = 'recalcul_gmq_2025'"
    );
    migrationEffectuee = gmqMigration?.done === 1;
  } else {
    // Créer la table de migrations si elle n'existe pas
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS _migrations (
        migration TEXT PRIMARY KEY,
        done INTEGER DEFAULT 0,
        date TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  if (migrationEffectuee) {
    console.log('ℹ️  Migration GMQ déjà effectuée');
    return;
  }

  const toutesLesPesees = await db.getAllAsync<{
    id: string;
    animal_id: string;
    date: string;
    poids_kg: number;
  }>('SELECT id, animal_id, date, poids_kg FROM production_pesees ORDER BY animal_id, date ASC');

  // Récupérer les animaux
  const animaux = await db.getAllAsync<{
    id: string;
    poids_initial: number | null;
    date_entree: string | null;
  }>('SELECT id, poids_initial, date_entree FROM production_animaux');

  const animauxMap = new Map(animaux.map(a => [a.id, a]));

  for (const pesee of toutesLesPesees) {
    const animal = animauxMap.get(pesee.animal_id);
    if (!animal) continue;

    // Récupérer la pesée précédente
    const previous = await db.getFirstAsync<{
      poids_kg: number;
      date: string;
    } | null>(
      'SELECT poids_kg, date FROM production_pesees WHERE animal_id = ? AND date < ? AND id != ? ORDER BY date DESC LIMIT 1',
      [pesee.animal_id, pesee.date, pesee.id]
    );

    let poidsReference = animal.poids_initial ?? null;
    let dateReference = animal.date_entree ?? null;

    if (previous) {
      poidsReference = previous.poids_kg;
      dateReference = previous.date;
    }

    let gmq: number | null = null;
    let difference_standard: number | null = null;

    if (poidsReference !== null && dateReference) {
      const diffJours = calculateDayDifference(dateReference, pesee.date);
      if (diffJours > 0) {
        gmq = ((pesee.poids_kg - poidsReference) * 1000) / diffJours; // g/jour
        const standard = getStandardGMQ(pesee.poids_kg);
        if (standard) {
          difference_standard = gmq - standard.gmq_cible;
        }
      }
    }

    // Mettre à jour le GMQ de cette pesée
    await db.runAsync(
      'UPDATE production_pesees SET gmq = ?, difference_standard = ? WHERE id = ?',
      [gmq ?? null, difference_standard ?? null, pesee.id]
    );
  }

  if (toutesLesPesees.length > 0) {
    console.log(`✅ Migration: GMQ recalculé pour ${toutesLesPesees.length} pesées`);
  }

  // Marquer la migration comme effectuée
  await db.runAsync(
    'INSERT OR REPLACE INTO _migrations (migration, done) VALUES (?, ?)',
    ['recalcul_gmq_2025', 1]
  );
}

