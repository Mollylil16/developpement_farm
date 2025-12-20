/**
 * Service de calcul de la performance globale de l'élevage
 * Utilise l'API backend pour calculer la performance globale
 * Compare le coût de production avec le prix du marché et génère des diagnostics
 */

import apiClient from './api/apiClient';
import { Projet } from '../types';

export interface PerformanceGlobale {
  // Données brutes
  total_kg_vendus_global: number;
  total_opex_global: number;
  total_amortissement_capex_global: number;

  // Coûts par kg
  cout_kg_opex_global: number;
  cout_kg_complet_global: number;

  // Prix du marché
  prix_kg_marche: number;

  // Écarts
  ecart_absolu: number;
  ecart_pourcentage: number;

  // Diagnostic
  statut: 'rentable' | 'fragile' | 'perte';
  message_diagnostic: string;

  // Suggestions
  suggestions: string[];
}

class PerformanceGlobaleService {

  /**
   * Calcule la performance globale de l'élevage via l'API backend
   */
  async calculatePerformanceGlobale(
    projetId: string,
    projet?: Projet
  ): Promise<PerformanceGlobale | null> {
    try {
      const result = await apiClient.get<PerformanceGlobale>('/reports/performance-globale', {
        params: { projet_id: projetId },
      });
      return result;
    } catch (error: any) {
      // Si l'erreur indique qu'il n'y a pas assez de données, retourner null
      if (error?.status === 404 || error?.message?.includes('pas assez de données')) {
        return null;
      }
      // Pour les autres erreurs, les propager
      throw error;
    }
  }
}

// Export singleton
export default new PerformanceGlobaleService();
