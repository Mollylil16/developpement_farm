/**
 * ProjetRepository - Gestion des projets
 *
 * Responsabilités:
 * - CRUD des projets
 * - Recherche par propriétaire
 * - Gestion du projet actif
 * 
 * Utilise maintenant l'API REST du backend (PostgreSQL)
 */

import { BaseRepository } from './BaseRepository';
import { Projet, CreateProjetInput } from '../../types/projet';

export class ProjetRepository extends BaseRepository<Projet> {
  constructor() {
    super('projets', '/projets');
  }

  /**
   * Créer un nouveau projet avec ses animaux initiaux
   */
  async create(input: CreateProjetInput & { proprietaire_id: string }): Promise<Projet> {
    const projetData = {
      nom: input.nom,
      localisation: input.localisation,
      nombre_truies: input.nombre_truies,
      nombre_verrats: input.nombre_verrats,
      nombre_porcelets: input.nombre_porcelets,
      nombre_croissance: input.nombre_croissance || 0,
      poids_moyen_actuel: input.poids_moyen_actuel,
      age_moyen_actuel: input.age_moyen_actuel,
      prix_kg_vif: input.prix_kg_vif || null,
      prix_kg_carcasse: input.prix_kg_carcasse || null,
      notes: input.notes || null,
      duree_amortissement_par_defaut_mois: input.duree_amortissement_par_defaut_mois || null,
    };

    // Utiliser un timeout plus long pour la création de projet (60 secondes)
    const created = await this.executePost<Projet>('/projets', projetData, { timeout: 60000 });
    return created;
  }

  /**
   * Mettre à jour un projet
   */
  async update(id: string, updates: Partial<Projet>, userId?: string): Promise<Projet> {
    // Exclure les champs qui ne doivent pas être mis à jour
    const excludedFields = ['id', 'date_creation', 'proprietaire_id'];
    const updateData: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (!excludedFields.includes(key) && value !== undefined) {
        updateData[key] = value;
      }
    });

    if (Object.keys(updateData).length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Projet avec l'id ${id} non trouvé`);
      }
      return existing;
    }

    const updated = await this.executePatch<Projet>(`/projets/${id}`, updateData);
    return updated;
  }

  /**
   * Récupérer un projet par ID
   */
  async findById(id: string): Promise<Projet | null> {
    try {
      const projet = await this.queryOne<Projet>(`/projets/${id}`);
      return projet || null;
    } catch (error) {
      console.error('Error finding projet by id:', error);
      return null;
    }
  }

  /**
   * Récupérer un projet par ID (lance une erreur si non trouvé)
   */
  async getById(id: string): Promise<Projet> {
    const projet = await this.findById(id);
    if (!projet) {
      throw new Error(`Projet avec l'id ${id} non trouvé`);
    }
    return projet;
  }

  /**
   * Obtenir tous les projets d'un utilisateur (propriétaire + collaborateur)
   */
  async findAllByUserId(userId: string): Promise<Projet[]> {
    try {
      // Le backend retourne automatiquement les projets de l'utilisateur connecté
      const projets = await this.query<Projet>('/projets');
      return projets || [];
    } catch (error) {
      console.error('Error finding projets by user id:', error);
      return [];
    }
  }

  /**
   * Obtenir tous les projets (pour admin)
   */
  async findAll(): Promise<Projet[]> {
    try {
      const projets = await this.query<Projet>('/projets');
      return projets || [];
    } catch (error) {
      console.error('Error finding all projets:', error);
      return [];
    }
  }

  /**
   * Obtenir le projet actif d'un utilisateur (propriétaire ou collaborateur)
   */
  async findActiveByUserId(userId: string): Promise<Projet | null> {
    try {
      const projet = await this.queryOne<Projet>('/projets/actif');
      return projet || null;
    } catch (error) {
      console.error('Error finding active projet:', error);
      return null;
    }
  }

  /**
   * Obtenir tous les projets d'un propriétaire
   */
  async findByOwnerId(ownerId: string): Promise<Projet[]> {
    // Le backend filtre automatiquement par utilisateur connecté
    return this.findAllByUserId(ownerId);
  }

  /**
   * Activer un projet (et archiver les autres)
   */
  async switchActive(id: string): Promise<Projet> {
    const updated = await this.executePatch<Projet>(`/projets/${id}/activer`, {});
    return updated;
  }
}
