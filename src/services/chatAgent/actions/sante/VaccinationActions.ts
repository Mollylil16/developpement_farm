/**
 * Actions liées aux vaccinations
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { format } from 'date-fns';
import apiClient from '../../../api/apiClient';

export class VaccinationActions {
  /**
   * Crée une vaccination
   */
  static async createVaccination(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Calculer la date de rappel (généralement 21 jours pour la plupart des vaccins)
    const dateRappel =
      (paramsTyped.date_rappel && typeof paramsTyped.date_rappel === 'string'
        ? paramsTyped.date_rappel
        : undefined) ||
      this.calculateDateRappel(
        (paramsTyped.date && typeof paramsTyped.date === 'string'
          ? paramsTyped.date
          : new Date().toISOString()) || new Date().toISOString()
      );

    // Créer la vaccination via l'API backend
    const vaccination = await apiClient.post<any>('/sante/vaccinations', {
      projet_id: context.projetId,
      animal_id:
        paramsTyped.animal_id && typeof paramsTyped.animal_id === 'string'
          ? paramsTyped.animal_id
          : undefined,
      lot_id:
        paramsTyped.lot_id && typeof paramsTyped.lot_id === 'string'
          ? paramsTyped.lot_id
          : undefined,
      vaccin:
        (paramsTyped.vaccin && typeof paramsTyped.vaccin === 'string'
          ? paramsTyped.vaccin
          : undefined) ||
        (paramsTyped.type_vaccin && typeof paramsTyped.type_vaccin === 'string'
          ? paramsTyped.type_vaccin
          : undefined),
      nom_vaccin:
        (paramsTyped.nom_vaccin && typeof paramsTyped.nom_vaccin === 'string'
          ? paramsTyped.nom_vaccin
          : undefined) ||
        (paramsTyped.vaccin && typeof paramsTyped.vaccin === 'string'
          ? paramsTyped.vaccin
          : undefined),
      date_vaccination:
        (paramsTyped.date && typeof paramsTyped.date === 'string'
          ? paramsTyped.date
          : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
      date_rappel: dateRappel,
      veterinaire:
        paramsTyped.veterinaire && typeof paramsTyped.veterinaire === 'string'
          ? paramsTyped.veterinaire
          : undefined,
      cout: (paramsTyped.cout as number) || undefined,
      notes:
        paramsTyped.notes && typeof paramsTyped.notes === 'string' ? paramsTyped.notes : undefined,
      animal_ids:
        paramsTyped.animal_ids && Array.isArray(paramsTyped.animal_ids)
          ? paramsTyped.animal_ids
          : undefined,
    });

    const message = `Enregistré ! Vaccination ${vaccination.nom_vaccin || vaccination.vaccin} effectuée le ${format(new Date(vaccination.date_vaccination), 'dd/MM/yyyy')}. Rappel prévu le ${dateRappel ? format(new Date(dateRappel), 'dd/MM/yyyy') : 'non programmé'}.`;

    return {
      success: true,
      data: vaccination,
      message,
    };
  }

  /**
   * Calcule la date de rappel (21 jours par défaut)
   */
  private static calculateDateRappel(dateVaccination: string, jours: number = 21): string {
    const date = new Date(dateVaccination);
    date.setDate(date.getDate() + jours);
    return date.toISOString().split('T')[0];
  }
}

