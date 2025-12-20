/**
 * AnimalRepository - Gestion des animaux de production
 *
 * Responsabilités:
 * - CRUD des animaux (truies, verrats, porcelets)
 * - Recherche et filtrage
 * - Statistiques du cheptel
 * 
 * Utilise maintenant l'API REST du backend (PostgreSQL)
 */

import { BaseRepository } from './BaseRepository';
import { ProductionAnimal } from '../../types/production';

export class AnimalRepository extends BaseRepository<ProductionAnimal> {
  constructor() {
    super('production_animaux', '/production/animaux');
  }

  /**
   * Créer un nouvel animal
   */
  async create(data: Partial<ProductionAnimal>): Promise<ProductionAnimal> {
    const animalData = {
      projet_id: data.projet_id,
      code: data.code,
      nom: data.nom || null,
      sexe: data.sexe,
      race: data.race || null,
      date_naissance: data.date_naissance || null,
      reproducteur: data.reproducteur || false,
      statut: data.statut || 'actif',
      photo_uri: data.photo_uri || null,
      origine: data.origine || null,
      date_entree: data.date_entree || null,
      poids_initial: data.poids_initial || null,
      categorie_poids: data.categorie_poids || null,
      notes: data.notes || null,
      pere_id: data.pere_id || null,
      mere_id: data.mere_id || null,
    };

    const created = await this.executePost<ProductionAnimal>('/production/animaux', animalData);
    return created;
  }

  /**
   * Mettre à jour un animal
   */
  async update(id: string, data: Partial<ProductionAnimal>): Promise<ProductionAnimal> {
    const updateData: Record<string, unknown> = {};

    // Construire les données de mise à jour
    if (data.code !== undefined) updateData.code = data.code;
    if (data.nom !== undefined) updateData.nom = data.nom;
    if (data.sexe !== undefined) updateData.sexe = data.sexe;
    if (data.race !== undefined) updateData.race = data.race;
    if (data.date_naissance !== undefined) updateData.date_naissance = data.date_naissance;
    if (data.reproducteur !== undefined) updateData.reproducteur = data.reproducteur;
    if (data.statut !== undefined) updateData.statut = data.statut;
    if (data.photo_uri !== undefined) updateData.photo_uri = data.photo_uri;
    if (data.pere_id !== undefined) updateData.pere_id = data.pere_id;
    if (data.mere_id !== undefined) updateData.mere_id = data.mere_id;
    if (data.origine !== undefined) updateData.origine = data.origine;
    if (data.date_entree !== undefined) updateData.date_entree = data.date_entree;
    if (data.poids_initial !== undefined) {
      updateData.poids_initial = data.poids_initial === 0 || data.poids_initial === null ? null : data.poids_initial;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.categorie_poids !== undefined) updateData.categorie_poids = data.categorie_poids;

    if (Object.keys(updateData).length === 0) {
      throw new Error('Aucune donnée à mettre à jour');
    }

    const updated = await this.executePatch<ProductionAnimal>(`/production/animaux/${id}`, updateData);
    return updated;
  }

  /**
   * Récupérer tous les animaux d'un projet
   */
  async findByProjet(projetId: string, inclureInactifs: boolean = true): Promise<ProductionAnimal[]> {
    try {
      const animaux = await this.query<ProductionAnimal>('/production/animaux', {
        projet_id: projetId,
        inclure_inactifs: inclureInactifs,
      });
      return animaux || [];
    } catch (error) {
      console.error('Error finding animaux by projet:', error);
      return [];
    }
  }

  /**
   * Récupérer les animaux d'un projet avec pagination
   */
  async findByProjetPaginated(
    projetId: string,
    options: {
      limit?: number;
      offset?: number;
      actif?: boolean;
      statut?: string;
    } = {}
  ): Promise<{
    data: ProductionAnimal[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    const { limit = 50, offset = 0, actif, statut } = options;

    const params: Record<string, unknown> = {
      projet_id: projetId,
      limit,
      offset,
    };

    if (actif !== undefined) params.actif = actif;
    if (statut) params.statut = statut;

    const result = await this.query<ProductionAnimal>('/production/animaux', params);
    
    return {
      data: result,
      total: result.length,
      limit,
      offset,
      hasMore: result.length === limit,
    };
  }

  /**
   * Récupérer les animaux actifs d'un projet
   */
  async findActiveByProjet(projetId: string): Promise<ProductionAnimal[]> {
    return this.findByProjet(projetId, false);
  }

  /**
   * Récupérer les reproducteurs (truies et verrats)
   */
  async findReproducteursByProjet(
    projetId: string,
    sexe?: 'male' | 'femelle'
  ): Promise<ProductionAnimal[]> {
    const params: Record<string, unknown> = {
      projet_id: projetId,
      reproducteur: true,
      actif: true,
    };

    if (sexe) {
      params.sexe = sexe;
    }

    return this.query<ProductionAnimal>('/production/animaux', params);
  }

  /**
   * Rechercher un animal par son code
   */
  async findByCode(code: string, projetId?: string): Promise<ProductionAnimal | null> {
    try {
      const params: Record<string, unknown> = { code };
      if (projetId) params.projet_id = projetId;

      const animaux = await this.query<ProductionAnimal>('/production/animaux', params);
      return animaux.length > 0 ? animaux[0] : null;
    } catch (error) {
      console.error('Error finding animal by code:', error);
      return null;
    }
  }

  /**
   * Vérifier si un code existe déjà
   */
  async codeExists(code: string, projetId?: string, excludeId?: string): Promise<boolean> {
    try {
      const animal = await this.findByCode(code, projetId);
      if (!animal) return false;
      if (excludeId && animal.id === excludeId) return false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Statistiques du cheptel
   */
  async getStats(projetId: string): Promise<{
    total: number;
    actifs: number;
    truies: number;
    verrats: number;
    porcelets: number;
    vendus: number;
    morts: number;
  }> {
    try {
      // Le backend devrait exposer un endpoint pour les stats
      // Pour l'instant, on calcule côté client
      const animaux = await this.findByProjet(projetId, true);
      
      return {
        total: animaux.length,
        actifs: animaux.filter(a => a.statut === 'actif').length,
        truies: animaux.filter(a => a.sexe === 'femelle' && a.reproducteur && a.statut === 'actif').length,
        verrats: animaux.filter(a => a.sexe === 'male' && a.reproducteur && a.statut === 'actif').length,
        porcelets: animaux.filter(a => !a.reproducteur && a.statut === 'actif').length,
        vendus: animaux.filter(a => a.statut === 'vendu').length,
        morts: animaux.filter(a => a.statut === 'mort').length,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        total: 0,
        actifs: 0,
        truies: 0,
        verrats: 0,
        porcelets: 0,
        vendus: 0,
        morts: 0,
      };
    }
  }

  /**
   * Marquer un animal comme vendu
   */
  async markAsSold(id: string, dateVente?: string): Promise<ProductionAnimal> {
    return this.update(id, {
      statut: 'vendu',
    });
  }

  /**
   * Marquer un animal comme mort
   */
  async markAsDead(id: string): Promise<ProductionAnimal> {
    return this.update(id, {
      statut: 'mort',
    });
  }

  /**
   * Récupérer les animaux par statut
   */
  async findByStatut(
    projetId: string,
    statut: 'actif' | 'vendu' | 'mort'
  ): Promise<ProductionAnimal[]> {
    return this.query<ProductionAnimal>('/production/animaux', {
      projet_id: projetId,
      statut,
    });
  }
}
