/**
 * Service pour les coûts vétérinaires
 * Utilise l'API backend pour calculer les coûts sanitaires
 */

import apiClient from '../api/apiClient';
import type { Vaccination, Traitement, VisiteVeterinaire } from '../../types/sante';

export interface CoutsVeterinaires {
  vaccinations: number;
  traitements: number;
  visites: number;
  total: number;
}

export interface CoutsVeterinairesPeriode extends CoutsVeterinaires {
  details: {
    vaccinations: Vaccination[];
    traitements: Traitement[];
    visites: VisiteVeterinaire[];
  };
}

export class SanteCoutsService {
  /**
   * Obtenir les coûts vétérinaires totaux pour un projet via l'API backend
   */
  static async getCouts(projetId: string): Promise<CoutsVeterinaires> {
    return apiClient.get<CoutsVeterinaires>('/sante/couts-veterinaires', {
      params: { projet_id: projetId },
    });
  }

  /**
   * Obtenir les coûts vétérinaires sur une période donnée via l'API backend
   */
  static async getCoutsPeriode(
    projetId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<CoutsVeterinairesPeriode> {
    return apiClient.get<CoutsVeterinairesPeriode>('/sante/couts-veterinaires/periode', {
      params: {
        projet_id: projetId,
        date_debut: dateDebut,
        date_fin: dateFin,
      },
    });
  }
}
