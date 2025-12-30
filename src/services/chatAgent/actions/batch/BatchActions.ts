/**
 * Actions liées à la gestion des loges en mode bande
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import apiClient from '../../../api/apiClient';

export class BatchActions {
  /**
   * Créer une nouvelle loge
   */
  static async creerLoge(
    params: Record<string, unknown>,
    context: AgentContext,
  ): Promise<AgentActionResult> {
    try {
      const payload: any = {
        projet_id: context.projetId,
        pen_name: params.pen_name || undefined, // Si non fourni, le backend générera automatiquement
        position: params.position || 'droite', // Par défaut: droite (A)
        category: params.category as string,
        notes: params.notes as string || null,
      };

      // Si population fournie, ajouter les détails
      if (params.population && typeof params.population === 'object') {
        const pop = params.population as Record<string, unknown>;
        payload.population = {
          male_count: pop.male_count || 0,
          female_count: pop.female_count || 0,
          castrated_count: pop.castrated_count || 0,
        };
        payload.average_age_months = params.average_age_months as number;
        payload.average_weight_kg = params.average_weight_kg as number;
      }

      const result = await apiClient.post('/batch-pigs/create-batch', payload);

      const totalCount = payload.population
        ? (payload.population.male_count +
            payload.population.female_count +
            payload.population.castrated_count)
        : 0;

      return {
        success: true,
        data: result,
        message: totalCount > 0
          ? `Loge ${result.pen_name} créée avec ${totalCount} sujets`
          : `Loge ${result.pen_name} créée (vide)`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erreur lors de la création de la loge: ${error.message || 'Erreur inconnue'}`,
        error: error.message,
      };
    }
  }

  /**
   * Déplacer un animal d'une loge vers une autre
   */
  static async deplacerAnimaux(
    params: Record<string, unknown>,
    context: AgentContext,
  ): Promise<AgentActionResult> {
    try {
      const payload = {
        pig_id: params.pig_id as string,
        from_batch_id: params.from_batch_id as string,
        to_batch_id: params.to_batch_id as string,
        notes: (params.notes as string) || null,
      };

      await apiClient.post('/batch-pigs/transfer', payload);

      return {
        success: true,
        message: 'Animal déplacé avec succès',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erreur lors du déplacement: ${error.message || 'Erreur inconnue'}`,
        error: error.message,
      };
    }
  }

  /**
   * Récupérer les animaux d'une loge
   */
  static async getAnimauxParLoge(
    params: Record<string, unknown>,
    context: AgentContext,
  ): Promise<AgentActionResult> {
    try {
      const batchId = params.batch_id as string;
      const pigs = await apiClient.get(`/batch-pigs/batch/${batchId}`);

      const total = Array.isArray(pigs) ? pigs.length : 0;
      const bySex = {
        male: Array.isArray(pigs)
          ? pigs.filter((p: any) => p.sex === 'male').length
          : 0,
        female: Array.isArray(pigs)
          ? pigs.filter((p: any) => p.sex === 'female').length
          : 0,
        castrated: Array.isArray(pigs)
          ? pigs.filter((p: any) => p.sex === 'castrated').length
          : 0,
      };

      return {
        success: true,
        data: {
          total,
          by_sex: bySex,
          pigs,
        },
        message: `La loge contient ${total} sujet${total > 1 ? 's' : ''} (${bySex.male} mâles, ${bySex.female} femelles, ${bySex.castrated} castrés)`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erreur lors de la récupération des animaux: ${error.message || 'Erreur inconnue'}`,
        error: error.message,
      };
    }
  }
}

