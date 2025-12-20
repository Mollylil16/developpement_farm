/**
 * Service pour les temps d'attente avant abattage
 * Utilise l'API backend pour récupérer les animaux en période d'attente
 */

import apiClient from '../api/apiClient';
import type { Traitement } from '../../types';

export interface AnimalTempsAttente {
  animal_id: string;
  traitement: Traitement;
  date_fin_attente: string;
  jours_restants: number;
}

export class SanteTempsAttenteService {
  /**
   * Obtenir les animaux en période d'attente avant abattage via l'API backend
   */
  static async getAnimauxEnAttente(projetId: string): Promise<AnimalTempsAttente[]> {
    return apiClient.get<AnimalTempsAttente[]>('/sante/animaux-en-attente', {
      params: { projet_id: projetId },
    });
  }
}
