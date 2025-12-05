/**
 * ProjetRepository - Gestion des projets
 * 
 * Responsabilités:
 * - CRUD des projets
 * - Recherche par propriétaire
 * - Gestion du projet actif
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { Projet, CreateProjetInput } from '../../types/projet';
import uuid from 'react-native-uuid';

export class ProjetRepository extends BaseRepository<Projet> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'projets');
  }

  /**
   * Créer un nouveau projet avec ses animaux initiaux
   */
  async create(input: CreateProjetInput & { proprietaire_id: string }): Promise<Projet> {
    const id = `projet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO projets (
        id, nom, localisation, nombre_truies, nombre_verrats, nombre_porcelets, nombre_croissance,
        poids_moyen_actuel, age_moyen_actuel, prix_kg_vif, prix_kg_carcasse, notes, statut, proprietaire_id,
        duree_amortissement_par_defaut_mois, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.nom,
        input.localisation,
        input.nombre_truies,
        input.nombre_verrats,
        input.nombre_porcelets,
        input.nombre_croissance || 0,
        input.poids_moyen_actuel,
        input.age_moyen_actuel,
        input.prix_kg_vif || null,
        input.prix_kg_carcasse || null,
        input.notes || null,
        'actif',
        input.proprietaire_id,
        input.duree_amortissement_par_defaut_mois || null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer le projet');
    }

    // Créer automatiquement les animaux initiaux si nécessaire
    if (
      created.nombre_truies > 0 ||
      created.nombre_verrats > 0 ||
      created.nombre_porcelets > 0 ||
      (created.nombre_croissance || 0) > 0
    ) {
      const { ProjetInitializationService } = await import('../../services/ProjetInitializationService');
      const initService = new ProjetInitializationService(this.db);
      await initService.createAnimauxInitials(created.id, {
        nombre_truies: created.nombre_truies,
        nombre_verrats: created.nombre_verrats,
        nombre_porcelets: created.nombre_porcelets,
        nombre_croissance: created.nombre_croissance || 0,
      });
    }

    return created;
  }

  /**
   * Mettre à jour un projet
   */
  async update(id: string, updates: Partial<Projet>, userId?: string): Promise<Projet> {
    // Vérifier que le projet appartient à l'utilisateur si userId est fourni
    if (userId) {
      const projet = await this.findById(id);
      if (!projet) {
        throw new Error(`Projet avec l'id ${id} non trouvé`);
      }
      if (projet.proprietaire_id !== userId) {
        throw new Error('Ce projet ne vous appartient pas');
      }
    }

    const derniere_modification = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    // Exclure les champs qui ne doivent pas être mis à jour
    const excludedFields = ['id', 'date_creation', 'proprietaire_id'];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (!excludedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Projet avec l'id ${id} non trouvé`);
      }
      return existing;
    }

    fields.push('derniere_modification = ?');
    values.push(derniere_modification);
    values.push(id);

    await this.execute(
      `UPDATE projets SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Erreur lors de la récupération du projet mis à jour');
    }
    return updated;
  }

  /**
   * Récupérer un projet par ID
   */
  async findById(id: string): Promise<Projet | null> {
    const row = await this.queryOne<Projet>(
      'SELECT * FROM projets WHERE id = ?',
      [id]
    );

    if (!row) {
      return null;
    }

    return row;
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
    return this.query<Projet>(
      `SELECT DISTINCT p.* 
       FROM projets p
       LEFT JOIN collaborations c ON p.id = c.projet_id AND c.user_id = ? AND c.statut = 'actif'
       WHERE p.proprietaire_id = ? OR c.user_id = ?
       ORDER BY p.date_creation DESC`,
      [userId, userId, userId]
    );
  }

  /**
   * Obtenir tous les projets (pour admin)
   */
  async findAll(): Promise<Projet[]> {
    return this.query<Projet>(
      'SELECT * FROM projets ORDER BY date_creation DESC'
    );
  }

  /**
   * Obtenir le projet actif d'un utilisateur (propriétaire ou collaborateur)
   */
  async findActiveByUserId(userId: string): Promise<Projet | null> {
    return this.queryOne<Projet>(
      `SELECT DISTINCT p.* 
       FROM projets p
       LEFT JOIN collaborations c ON p.id = c.projet_id AND c.user_id = ? AND c.statut = 'actif'
       WHERE p.statut = 'actif' AND (p.proprietaire_id = ? OR c.user_id = ?)
       ORDER BY p.date_creation DESC 
       LIMIT 1`,
      [userId, userId, userId]
    );
  }

  /**
   * Obtenir tous les projets d'un propriétaire
   */
  async findByOwnerId(ownerId: string): Promise<Projet[]> {
    return this.query<Projet>(
      'SELECT * FROM projets WHERE proprietaire_id = ? ORDER BY date_creation DESC',
      [ownerId]
    );
  }
}

