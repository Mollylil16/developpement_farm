/**
 * Service pour le calcul et recalcul du GMQ (Gain Moyen Quotidien)
 * Centralise la logique de calcul du GMQ et de recalcul en cascade
 */

import { getDatabase } from '../database';
import { AnimalRepository, PeseeRepository } from '../../database/repositories';
import { getStandardGMQ, type ProductionPesee } from '../../types';

export class ProductionGMQService {
  /**
   * Calculer la différence en jours entre deux dates (format YYYY-MM-DD)
   */
  private static calculateDayDifference(start: string, end: string): number {
    // Parser les dates en ignorant l'heure pour éviter les problèmes de timezone
    const parseDateOnly = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const startDate = parseDateOnly(start);
    const endDate = parseDateOnly(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    // Utiliser Math.floor pour avoir le nombre exact de jours complets
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays <= 0 ? 0 : diffDays;
  }

  /**
   * Recalculer le GMQ pour toutes les pesées suivantes après une modification
   * Cette méthode est appelée automatiquement quand une pesée est modifiée
   */
  static async recalculerGMQ(animalId: string, dateModifiee: string): Promise<void> {
    const db = await getDatabase();
    const animalRepo = new AnimalRepository(db);
    const peseeRepo = new PeseeRepository(db);

    // Récupérer toutes les pesées après la date modifiée
    const peseesASuivantes = await peseeRepo.query<ProductionPesee>(
      'SELECT * FROM production_pesees WHERE animal_id = ? AND date > ? ORDER BY date ASC',
      [animalId, dateModifiee]
    );

    const animal = await animalRepo.findById(animalId);
    if (!animal) {
      throw new Error('Animal introuvable');
    }

    // Recalculer le GMQ pour chaque pesée suivante
    for (const peseeSuivante of peseesASuivantes) {
      const previous = await peseeRepo.findLastBeforeDate(animalId, peseeSuivante.date);

      let gmq: number | null = null;
      let difference_standard: number | null = null;

      let poidsReference = animal.poids_initial ?? null;
      let dateReference = animal.date_entree ?? null;

      if (previous && previous.id !== peseeSuivante.id) {
        poidsReference = previous.poids_kg;
        dateReference = previous.date;
      }

      if (poidsReference !== null && dateReference) {
        const diffJours = this.calculateDayDifference(dateReference, peseeSuivante.date);
        if (diffJours > 0) {
          gmq = ((peseeSuivante.poids_kg - poidsReference) * 1000) / diffJours;
          const standard = getStandardGMQ(peseeSuivante.poids_kg);
          if (standard) {
            difference_standard = gmq - standard.gmq_cible;
          }
        }
      }

      // Mettre à jour le GMQ de cette pesée
      await db.runAsync(
        'UPDATE production_pesees SET gmq = ?, difference_standard = ? WHERE id = ?',
        [gmq ?? null, difference_standard ?? null, peseeSuivante.id]
      );
    }
  }
}


