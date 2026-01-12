/**
 * Service pour l'historique médical des animaux
 * Utilise l'API backend pour récupérer l'historique complet
 */

import apiClient, { APIError } from '../api/apiClient';
import type { Vaccination, Maladie, Traitement, VisiteVeterinaire } from '../../types/sante';

export interface HistoriqueMedicalAnimal {
  vaccinations: Vaccination[];
  maladies: Maladie[];
  traitements: Traitement[];
  visites: VisiteVeterinaire[];
}

export class SanteHistoriqueService {
  /**
   * Obtenir l'historique médical complet d'un animal via l'API backend
   * Retourne un historique vide si l'animal n'appartient pas à l'utilisateur (403)
   */
  static async getHistorique(animalId: string): Promise<HistoriqueMedicalAnimal> {
    try {
      const historique = await apiClient.get<HistoriqueMedicalAnimal>(
        `/sante/historique-animal/${animalId}`
      );

      // Trier par date (plus récent en premier)
      const sortByDate = <
        T extends { date_vaccination?: string; date_debut?: string; date_visite?: string },
      >(
        items: T[]
      ): T[] => {
        return items.sort((a, b) => {
          const dateA = a.date_vaccination || a.date_debut || a.date_visite || '';
          const dateB = b.date_vaccination || b.date_debut || b.date_visite || '';
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
      };

      return {
        vaccinations: sortByDate(historique.vaccinations || []),
        maladies: sortByDate(historique.maladies || []),
        traitements: sortByDate(historique.traitements || []),
        visites: sortByDate(historique.visites || []),
      };
    } catch (error) {
      // Si l'animal n'appartient pas à l'utilisateur (403), retourner un historique vide
      // C'est normal dans le contexte du marketplace où on peut voir des animaux d'autres producteurs
      if (error instanceof APIError && error.status === 403) {
        if (__DEV__) {
          console.warn(`[SanteHistoriqueService] L'animal ${animalId} n'appartient pas à l'utilisateur (403). Retour d'un historique vide.`);
        }
        return {
          vaccinations: [],
          maladies: [],
          traitements: [],
          visites: [],
        };
      }
      // Pour les autres erreurs, relancer l'exception
      throw error;
    }
  }
}
