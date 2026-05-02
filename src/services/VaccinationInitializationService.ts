/**
 * Service pour initialiser les protocoles de vaccination standard
 *
 * Responsabilités:
 * - Créer les protocoles de vaccination standard pour un nouveau projet
 */

import { CalendrierVaccinationRepository } from '../database/repositories/CalendrierVaccinationRepository';
import { PROTOCOLES_VACCINATION_STANDARD } from '../types/sante';
import apiClient from './api/apiClient';

export class VaccinationInitializationService {
  /**
   * Initialise les protocoles de vaccination standard pour un projet
   */
  async initProtocolesVaccinationStandard(projetId: string): Promise<void> {
    // Utiliser l'endpoint backend pour initialiser les protocoles
    // Note: L'endpoint backend gère déjà l'initialisation des protocoles standard
    await apiClient.post(`/sante/init-protocoles-vaccination-standard`, null, {
      params: { projet_id: projetId },
    });
  }
}
