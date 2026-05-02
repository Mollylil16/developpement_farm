/**
 * Actions liées aux traitements
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { format } from 'date-fns';
import apiClient from '../../../api/apiClient';

export class TraitementActions {
  /**
   * Crée un traitement
   */
  static async createTraitement(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Créer le traitement via l'API backend
    const traitement = await apiClient.post<any>('/sante/traitements', {
      projet_id: context.projetId,
      maladie_id: paramsTyped.maladie_id && typeof paramsTyped.maladie_id === 'string' ? paramsTyped.maladie_id : undefined,
      animal_id: paramsTyped.animal_id && typeof paramsTyped.animal_id === 'string' ? paramsTyped.animal_id : undefined,
      lot_id: paramsTyped.lot_id && typeof paramsTyped.lot_id === 'string' ? paramsTyped.lot_id : undefined,
      type: (paramsTyped.type && typeof paramsTyped.type === 'string' ? paramsTyped.type : undefined) || 'autre',
      nom_medicament: (paramsTyped.nom_medicament && typeof paramsTyped.nom_medicament === 'string' ? paramsTyped.nom_medicament : undefined) || (paramsTyped.medicament && typeof paramsTyped.medicament === 'string' ? paramsTyped.medicament : undefined),
      voie_administration: (paramsTyped.voie_administration && typeof paramsTyped.voie_administration === 'string' ? paramsTyped.voie_administration : undefined) || 'orale',
      dosage: (paramsTyped.dosage && typeof paramsTyped.dosage === 'string' ? paramsTyped.dosage : undefined) || 'Selon prescription',
      frequence: (paramsTyped.frequence && typeof paramsTyped.frequence === 'string' ? paramsTyped.frequence : undefined) || '1 fois par jour',
      date_debut: (paramsTyped.date_debut && typeof paramsTyped.date_debut === 'string' ? paramsTyped.date_debut : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
      date_fin: paramsTyped.date_fin && typeof paramsTyped.date_fin === 'string' ? paramsTyped.date_fin : undefined,
      duree_jours: paramsTyped.duree_jours && typeof paramsTyped.duree_jours === 'number' ? paramsTyped.duree_jours : undefined,
      veterinaire: paramsTyped.veterinaire && typeof paramsTyped.veterinaire === 'string' ? paramsTyped.veterinaire : undefined,
      cout: paramsTyped.cout && typeof paramsTyped.cout === 'number' ? paramsTyped.cout : undefined,
      notes: paramsTyped.notes && typeof paramsTyped.notes === 'string' ? paramsTyped.notes : undefined,
    });

    const message = `Traitement enregistré ! ${traitement.nom_medicament} administré à partir du ${format(new Date(traitement.date_debut), 'dd/MM/yyyy')}.`;

    return {
      success: true,
      data: traitement,
      message,
    };
  }
}

