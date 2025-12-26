/**
 * Actions liées aux pesées
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { format } from 'date-fns';
import apiClient from '../../../api/apiClient';

export class PeseeActions {
  /**
   * Crée une pesée
   */
  static async createPesee(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Trouver l'animal par code ou ID depuis l'API backend
    let animalId = paramsTyped.animal_id && typeof paramsTyped.animal_id === 'string' ? paramsTyped.animal_id : undefined;
    if (!animalId && paramsTyped.animal_code && typeof paramsTyped.animal_code === 'string') {
      const animaux = await apiClient.get<any[]>(`/production/animaux`, {
        params: { projet_id: context.projetId },
      });
      const animalCode = paramsTyped.animal_code as string;
      const animal = animaux.find((a) => a.code.toLowerCase() === animalCode.toLowerCase());
      if (animal) {
        animalId = animal.id;
      } else {
        throw new Error(`Animal avec le code "${paramsTyped.animal_code}" introuvable.`);
      }
    }

    if (!animalId) {
      throw new Error("L'identifiant de l'animal est requis (animal_id ou animal_code).");
    }

    // Extraire le poids
    const poids = paramsTyped.poids || paramsTyped.poids_kg || paramsTyped.poidsKg;
    if (!poids || isNaN(Number(poids)) || Number(poids) <= 0) {
      throw new Error('Le poids est requis et doit être supérieur à 0 (en kg).');
    }

    // Créer la pesée via l'API backend
    const pesee = await apiClient.post<any>('/production/pesees', {
      projet_id: context.projetId,
      animal_id: animalId,
      date: (paramsTyped.date && typeof paramsTyped.date === 'string' ? paramsTyped.date : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
      poids_kg: typeof poids === 'string' ? parseFloat(poids.replace(',', '.')) : (poids as number),
      commentaire: (paramsTyped.commentaire && typeof paramsTyped.commentaire === 'string' ? paramsTyped.commentaire : undefined) || (paramsTyped.notes && typeof paramsTyped.notes === 'string' ? paramsTyped.notes : undefined),
    });

    const animaux = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: context.projetId },
    });
    const animal = animaux.find((a) => a.id === animalId);
    const message = `Pesée enregistrée : ${animal?.code || 'Animal'} - ${pesee.poids_kg} kg le ${format(new Date(pesee.date), 'dd/MM/yyyy')}.`;

    return {
      success: true,
      data: pesee,
      message,
    };
  }
}

