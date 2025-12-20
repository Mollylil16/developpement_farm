/**
 * Service pour le calcul et recalcul du GMQ (Gain Moyen Quotidien)
 * Utilise l'API backend pour recalculer le GMQ en cascade
 */

import apiClient from '../api/apiClient';

export class ProductionGMQService {
  /**
   * Recalculer le GMQ pour toutes les pesées suivantes après une modification via l'API backend
   * Cette méthode est appelée automatiquement quand une pesée est modifiée
   */
  static async recalculerGMQ(animalId: string, dateModifiee: string): Promise<void> {
    await apiClient.post(`/production/animaux/${animalId}/recalculer-gmq`, null, {
      params: { date_modifiee: dateModifiee },
    });
  }
}
