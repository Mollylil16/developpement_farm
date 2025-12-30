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

  /**
   * Met à jour une vaccination
   */
  static async updateVaccination(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // ID de la vaccination à modifier (requis)
    const vaccinationId = paramsTyped.id || paramsTyped.vaccination_id;
    if (!vaccinationId || typeof vaccinationId !== 'string') {
      throw new Error('L\'ID de la vaccination à modifier est requis. Veuillez préciser quelle vaccination modifier.');
    }

    // Construire l'objet de mise à jour avec seulement les champs fournis
    const updateData: Record<string, unknown> = {};

    if (paramsTyped.vaccin || paramsTyped.nom_vaccin) {
      const vaccin = paramsTyped.vaccin || paramsTyped.nom_vaccin;
      if (typeof vaccin === 'string') {
        updateData.vaccin = vaccin;
        updateData.nom_vaccin = vaccin;
      }
    }

    if (paramsTyped.date_vaccination || paramsTyped.date) {
      const date = paramsTyped.date_vaccination || paramsTyped.date;
      if (typeof date === 'string') {
        updateData.date_vaccination = date;
        // Recalculer la date de rappel si date change
        const dateRappel = this.calculateDateRappel(date);
        updateData.date_rappel = dateRappel;
      }
    }

    if (paramsTyped.date_rappel && typeof paramsTyped.date_rappel === 'string') {
      updateData.date_rappel = paramsTyped.date_rappel;
    }

    if (paramsTyped.notes && typeof paramsTyped.notes === 'string') {
      updateData.notes = paramsTyped.notes;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('Aucune modification à apporter. Veuillez préciser ce que tu veux modifier (vaccin, date, notes).');
    }

    // Appeler l'API backend pour mettre à jour
    const vaccination = await apiClient.patch<any>(`/sante/vaccinations/${vaccinationId}`, updateData);

    const message = `✅ Vaccination modifiée avec succès ! ${updateData.vaccin ? `Vaccin : ${updateData.vaccin}.` : ''}`;

    return {
      success: true,
      data: vaccination,
      message,
    };
  }
}

