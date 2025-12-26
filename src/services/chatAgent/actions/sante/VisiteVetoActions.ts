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
}

