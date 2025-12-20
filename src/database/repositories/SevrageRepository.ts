/**
 * SevrageRepository - Gestion des sevrages
 *
 * Responsabilités:
 * - CRUD des sevrages
 * - Suivi post-mise bas
 * - Calculs de performance (taux de survie)
 * - Alertes de sevrage imminent
 * 
 * Utilise maintenant l'API REST du backend (PostgreSQL)
 */

import { BaseRepository } from './BaseRepository';
import { Sevrage } from '../../types/reproduction';

export class SevrageRepository extends BaseRepository<Sevrage> {
  constructor() {
    super('sevrages', '/reproduction/sevrages');
  }

  /**
   * Créer un nouveau sevrage
   */
  async create(data: Partial<Sevrage>): Promise<Sevrage> {
    const sevrageData = {
      projet_id: data.projet_id,
      gestation_id: data.gestation_id,
      date_sevrage: data.date_sevrage || new Date().toISOString(),
      nombre_porcelets: data.nombre_porcelets || 0,
      poids_moyen_kg: data.poids_moyen_kg || null,
      notes: data.notes || null,
    };

    return this.executePost<Sevrage>('/reproduction/sevrages', sevrageData);
  }

  /**
   * Mettre à jour un sevrage
   */
  async update(id: string, data: Partial<Sevrage>): Promise<Sevrage> {
    const updateData: Record<string, unknown> = {};

    if (data.date_sevrage !== undefined) updateData.date_sevrage = data.date_sevrage;
    if (data.nombre_porcelets !== undefined) updateData.nombre_porcelets = data.nombre_porcelets;
    if (data.poids_moyen_kg !== undefined) updateData.poids_moyen_kg = data.poids_moyen_kg;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.executePatch<Sevrage>(`/reproduction/sevrages/${id}`, updateData);
  }

  /**
   * Récupérer tous les sevrages d'un projet
   */
  async findByProjet(projetId: string): Promise<Sevrage[]> {
    try {
      return this.query<Sevrage>('/reproduction/sevrages', {
        projet_id: projetId,
      });
    } catch (error) {
      console.error('Error finding sevrages by projet:', error);
      return [];
    }
  }

  /**
   * Récupérer le sevrage d'une gestation
   */
  async findByGestation(gestationId: string): Promise<Sevrage | null> {
    try {
      const sevrages = await this.query<Sevrage>('/reproduction/sevrages', {
        gestation_id: gestationId,
      });
      return sevrages.length > 0 ? sevrages[0] : null;
    } catch (error) {
      console.error('Error finding sevrage by gestation:', error);
      return null;
    }
  }

  /**
   * Vérifier si une gestation a déjà un sevrage
   */
  async gestationASevrage(gestationId: string): Promise<boolean> {
    const sevrage = await this.findByGestation(gestationId);
    return sevrage !== null;
  }

  /**
   * Récupérer les sevrages par période
   */
  async findByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<Sevrage[]> {
    try {
      const sevrages = await this.findByProjet(projetId);
      return sevrages.filter(s => s.date_sevrage >= dateDebut && s.date_sevrage <= dateFin)
        .sort((a, b) => new Date(b.date_sevrage).getTime() - new Date(a.date_sevrage).getTime());
    } catch (error) {
      console.error('Error finding sevrages by period:', error);
      return [];
    }
  }

  /**
   * Statistiques des sevrages
   */
  async getStats(projetId: string): Promise<{
    total: number;
    totalPorceletsSevrages: number;
    moyennePorceletsParSevrage: number;
    poidsMoyenGlobal: number;
  }> {
    try {
      // Utiliser l'endpoint backend si disponible
      const result = await this.queryOne<{
        total: number;
        total_porcelets_sevrages: number;
        moyenne_porcelets_par_sevrage: number;
        poids_moyen_global: number;
      }>(`/reproduction/stats/sevrages`, { projet_id: projetId });

      if (result) {
        return {
          total: result.total,
          totalPorceletsSevrages: result.total_porcelets_sevrages,
          moyennePorceletsParSevrage: result.moyenne_porcelets_par_sevrage || 0,
          poidsMoyenGlobal: result.poids_moyen_global || 0,
        };
      }

      // Fallback: calculer côté client
      const sevrages = await this.findByProjet(projetId);
      
      const total = sevrages.length;
      const totalPorceletsSevrages = sevrages.reduce((sum, s) => sum + (s.nombre_porcelets || 0), 0);
      const moyennePorceletsParSevrage = total > 0 ? totalPorceletsSevrages / total : 0;
      const poidsMoyenGlobal = sevrages.length > 0
        ? sevrages.reduce((sum, s) => sum + (s.poids_moyen_kg || 0), 0) / sevrages.length
        : 0;

      return {
        total,
        totalPorceletsSevrages,
        moyennePorceletsParSevrage,
        poidsMoyenGlobal,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        total: 0,
        totalPorceletsSevrages: 0,
        moyennePorceletsParSevrage: 0,
        poidsMoyenGlobal: 0,
      };
    }
  }

  /**
   * Calculer le taux de survie (porcelets sevrés / porcelets nés)
   */
  async getTauxSurvie(projetId: string): Promise<number> {
    try {
      // Utiliser l'endpoint backend si disponible
      const result = await this.queryOne<{ taux_survie: number }>(
        `/reproduction/stats/taux-survie`,
        { projet_id: projetId }
      );

      if (result?.taux_survie !== undefined) {
        return result.taux_survie;
      }

      // Fallback: calculer côté client (nécessite d'accéder aux gestations)
      const sevrages = await this.findByProjet(projetId);
      const porceletsSevrages = sevrages.reduce((sum, s) => sum + (s.nombre_porcelets || 0), 0);
      
      // Note: Pour calculer porceletsNes, il faudrait accéder aux gestations
      // Pour l'instant, on retourne 0 si l'endpoint backend n'est pas disponible
      return 0;
    } catch (error) {
      console.error('Error getting taux survie:', error);
      return 0;
    }
  }

  /**
   * Récupérer les sevrages récents (X derniers jours)
   */
  async findRecents(projetId: string, nombreJours: number = 30): Promise<Sevrage[]> {
    try {
      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - nombreJours);
      const dateDebutStr = dateDebut.toISOString();

      const sevrages = await this.findByProjet(projetId);
      return sevrages.filter(s => s.date_sevrage >= dateDebutStr)
        .sort((a, b) => new Date(b.date_sevrage).getTime() - new Date(a.date_sevrage).getTime());
    } catch (error) {
      console.error('Error finding recent sevrages:', error);
      return [];
    }
  }

  /**
   * Récupérer les performances par truie (via gestations)
   */
  async getPerformancesByTruie(truieId: string): Promise<{
    nombreSevrages: number;
    totalPorceletsSevrages: number;
    moyennePorceletsParSevrage: number;
    poidsMoyenSevrages: number;
  }> {
    try {
      // Note: Cette méthode nécessite de joindre avec les gestations
      // Pour l'instant, on retourne des valeurs par défaut
      // Le backend devrait exposer un endpoint spécifique pour cela
      return {
        nombreSevrages: 0,
        totalPorceletsSevrages: 0,
        moyennePorceletsParSevrage: 0,
        poidsMoyenSevrages: 0,
      };
    } catch (error) {
      console.error('Error getting performances by truie:', error);
      return {
        nombreSevrages: 0,
        totalPorceletsSevrages: 0,
        moyennePorceletsParSevrage: 0,
        poidsMoyenSevrages: 0,
      };
    }
  }
}
