/**
 * Actions liées aux visites vétérinaires
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { format } from 'date-fns';
import apiClient from '../../../api/apiClient';

export class VisiteVetoActions {
  /**
   * Crée une visite vétérinaire
   */
  static async createVisiteVeterinaire(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Créer la visite vétérinaire via l'API backend
    const visite = await apiClient.post<any>('/sante/visites-veterinaires', {
      projet_id: context.projetId,
      date_visite:
        (paramsTyped.date && typeof paramsTyped.date === 'string'
          ? paramsTyped.date
          : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
      veterinaire:
        (paramsTyped.veterinaire && typeof paramsTyped.veterinaire === 'string'
          ? paramsTyped.veterinaire
          : undefined) ||
        (paramsTyped.nom_veterinaire && typeof paramsTyped.nom_veterinaire === 'string'
          ? paramsTyped.nom_veterinaire
          : undefined),
      motif:
        (paramsTyped.motif && typeof paramsTyped.motif === 'string' ? paramsTyped.motif : undefined) ||
        (paramsTyped.raison && typeof paramsTyped.raison === 'string' ? paramsTyped.raison : undefined) ||
        'Consultation',
      animaux_examines:
        paramsTyped.animaux_ids && Array.isArray(paramsTyped.animaux_ids)
          ? paramsTyped.animaux_ids.join(',')
          : undefined,
      diagnostic:
        paramsTyped.diagnostic && typeof paramsTyped.diagnostic === 'string'
          ? paramsTyped.diagnostic
          : undefined,
      prescriptions:
        paramsTyped.prescriptions && typeof paramsTyped.prescriptions === 'string'
          ? paramsTyped.prescriptions
          : undefined,
      recommandations:
        paramsTyped.recommandations && typeof paramsTyped.recommandations === 'string'
          ? paramsTyped.recommandations
          : undefined,
      cout:
        (paramsTyped.cout as number) || (paramsTyped.montant as number) || undefined,
      prochaine_visite:
        paramsTyped.prochaine_visite && typeof paramsTyped.prochaine_visite === 'string'
          ? paramsTyped.prochaine_visite
          : undefined,
      notes:
        paramsTyped.notes && typeof paramsTyped.notes === 'string' ? paramsTyped.notes : undefined,
    });

    const message = `Parfait ! J'ai enregistré la visite vétérinaire du ${format(new Date(visite.date_visite), 'dd/MM/yyyy')}${visite.veterinaire ? ` avec ${visite.veterinaire}` : ''}.`;

    return {
      success: true,
      data: visite,
      message,
    };
  }

  /**
   * Met à jour une visite vétérinaire
   */
  static async updateVisiteVeterinaire(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // ID de la visite à modifier (requis)
    const visiteId = paramsTyped.id || paramsTyped.visite_id;
    if (!visiteId || typeof visiteId !== 'string') {
      throw new Error('L\'ID de la visite vétérinaire à modifier est requis. Veuillez préciser quelle visite modifier.');
    }

    // Construire l'objet de mise à jour avec seulement les champs fournis
    const updateData: Record<string, unknown> = {};

    if (paramsTyped.date_visite || paramsTyped.date) {
      const date = paramsTyped.date_visite || paramsTyped.date;
      if (typeof date === 'string') {
        updateData.date_visite = date;
      }
    }

    if (paramsTyped.veterinaire || paramsTyped.nom_veterinaire) {
      const veterinaire = paramsTyped.veterinaire || paramsTyped.nom_veterinaire;
      if (typeof veterinaire === 'string') {
        updateData.veterinaire = veterinaire;
      }
    }

    if (paramsTyped.motif || paramsTyped.raison) {
      const motif = paramsTyped.motif || paramsTyped.raison;
      if (typeof motif === 'string') {
        updateData.motif = motif;
      }
    }

    if (paramsTyped.diagnostic && typeof paramsTyped.diagnostic === 'string') {
      updateData.diagnostic = paramsTyped.diagnostic;
    }

    if (paramsTyped.prescriptions && typeof paramsTyped.prescriptions === 'string') {
      updateData.prescriptions = paramsTyped.prescriptions;
    }

    if (paramsTyped.notes && typeof paramsTyped.notes === 'string') {
      updateData.notes = paramsTyped.notes;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('Aucune modification à apporter. Veuillez préciser ce que tu veux modifier (date, vétérinaire, motif, etc.).');
    }

    // Appeler l'API backend pour mettre à jour
    try {
      const visite = await apiClient.patch<any>(`/sante/visites-veterinaires/${visiteId}`, updateData);
      
      const message = `✅ Visite vétérinaire modifiée avec succès ! ${updateData.date_visite ? `Nouvelle date : ${format(new Date(updateData.date_visite as string), 'dd/MM/yyyy')}.` : ''}`;

      return {
        success: true,
        data: visite,
        message,
      };
    } catch (error: any) {
      // Si l'endpoint n'existe pas, on informe l'utilisateur
      if (error?.status === 404 || error?.message?.includes('404')) {
        throw new Error('La modification des visites vétérinaires n\'est pas encore disponible. Veuillez créer une nouvelle visite.');
      }
      throw error;
    }
  }
}

