/**
 * Service pour les recommandations sanitaires
 * Utilise l'API backend pour générer des recommandations basées sur l'historique
 */

import apiClient from '../api/apiClient';

export interface RecommandationSanitaire {
  type: 'vaccination' | 'traitement' | 'visite' | 'alerte';
  priorite: 'haute' | 'moyenne' | 'basse';
  message: string;
  data?: unknown;
}

export interface TauxMortaliteParCause {
  cause: string;
  nombre: number;
  pourcentage: number;
}

export class SanteRecommandationsService {
  /**
   * Obtenir des recommandations sanitaires basées sur l'historique via l'API backend
   */
  static async getRecommandations(projetId: string): Promise<RecommandationSanitaire[]> {
    return apiClient.get<RecommandationSanitaire[]>('/sante/recommandations', {
      params: { projet_id: projetId },
    });
  }

  /**
   * Obtenir le taux de mortalité par cause via l'API backend
   */
  static async getTauxMortaliteParCause(projetId: string): Promise<TauxMortaliteParCause[]> {
    return apiClient.get<TauxMortaliteParCause[]>('/sante/taux-mortalite-par-cause', {
      params: { projet_id: projetId },
    });
  }
}
