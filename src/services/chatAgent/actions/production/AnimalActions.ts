/**
 * Actions liées aux animaux
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import apiClient from '../../../api/apiClient';

export class AnimalActions {
  /**
   * Recherche un animal
   */
  static async searchAnimal(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Récupérer les animaux depuis l'API backend
    const animaux = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: context.projetId },
    });
    const result = animaux.filter((a) => {
      const searchTerm = ((paramsTyped.nom && typeof paramsTyped.nom === 'string' ? paramsTyped.nom : undefined) || (paramsTyped.search && typeof paramsTyped.search === 'string' ? paramsTyped.search : undefined) || '').toLowerCase();
      return (
        a.nom?.toLowerCase().includes(searchTerm) || a.code?.toLowerCase().includes(searchTerm)
      );
    });

    return {
      success: true,
      message:
        result.length > 0
          ? `J'ai trouvé ${result.length} animal(aux) correspondant(s).`
          : 'Aucun animal trouvé.',
      data: result,
    };
  }

  /**
   * Liste tous les animaux actifs
   */
  static async listAnimals(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    try {
      // Récupérer tous les animaux depuis l'API backend
      const animaux = await apiClient.get<any[]>(`/production/animaux`, {
        params: { projet_id: context.projetId },
      });

      // Filtrer seulement les animaux actifs
      const animauxActifs = animaux.filter((a) => a.statut === 'actif');

      return {
        success: true,
        message:
          animauxActifs.length > 0
            ? `Tu as ${animauxActifs.length} animal(aux) actif(s) dans ton élevage.`
            : 'Aucun animal actif trouvé.',
        data: {
          total: animauxActifs.length,
          animaux: animauxActifs,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la récupération des animaux.',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Recherche un lot d'animaux
   */
  static async searchLot(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Rechercher les lots dans les vaccinations et traitements depuis l'API backend
    const vaccinations = await apiClient.get<any[]>(`/sante/vaccinations`, {
      params: { projet_id: context.projetId },
    });
    const traitements = await apiClient.get<any[]>(`/sante/traitements`, {
      params: { projet_id: context.projetId },
    });

    // Extraire les lot_id uniques
    const lotsVaccination = new Set(vaccinations.map((v) => v.lot_id).filter(Boolean) as string[]);
    const lotsTraitement = new Set(traitements.map((t) => t.lot_id).filter(Boolean) as string[]);

    const tousLesLots = new Set([...lotsVaccination, ...lotsTraitement]);

    let result: unknown[] = [];

    if (paramsTyped.lot_id && typeof paramsTyped.lot_id === 'string') {
      // Recherche spécifique par lot_id
      const lotId = paramsTyped.lot_id;
      const vaccsLot = vaccinations.filter((v) => v.lot_id === lotId);
      const traitesLot = traitements.filter((t) => t.lot_id === lotId);

      result = [
        {
          lot_id: lotId,
          vaccinations: vaccsLot.length,
          traitements: traitesLot.length,
          activites: [...vaccsLot, ...traitesLot],
        },
      ];
    } else if (paramsTyped.search || paramsTyped.nom) {
      // Recherche par terme
      const searchTerm = ((paramsTyped.search && typeof paramsTyped.search === 'string' ? paramsTyped.search : undefined) || (paramsTyped.nom && typeof paramsTyped.nom === 'string' ? paramsTyped.nom : undefined) || '').toLowerCase();
      result = Array.from(tousLesLots)
        .filter((lotId) => lotId?.toLowerCase().includes(searchTerm))
        .map((lotId) => {
          const vaccs = vaccinations.filter((v) => v.lot_id === lotId);
          const traites = traitements.filter((t) => t.lot_id === lotId);
          return {
            lot_id: lotId,
            vaccinations: vaccs.length,
            traitements: traites.length,
            activites: [...vaccs, ...traites],
          };
        });
    } else {
      // Lister tous les lots
      result = Array.from(tousLesLots).map((lotId) => {
        const vaccs = vaccinations.filter((v) => v.lot_id === lotId);
        const traites = traitements.filter((t) => t.lot_id === lotId);
        return {
          lot_id: lotId,
          vaccinations: vaccs.length,
          traitements: traites.length,
          activites: [...vaccs, ...traites],
        };
      });
    }

    const message =
      result.length > 0
        ? `J'ai trouvé ${result.length} lot(s) correspondant(s).`
        : 'Aucun lot trouvé. Les lots sont identifiés via les vaccinations et traitements.';

    return {
      success: true,
      message,
      data: result,
    };
  }
}

