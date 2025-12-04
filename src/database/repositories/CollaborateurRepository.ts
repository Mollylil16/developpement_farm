/**
 * CollaborateurRepository - Gestion des collaborateurs
 * 
 * Responsabilités:
 * - CRUD des collaborateurs
 * - Gestion des invitations
 * - Recherche par email, statut, rôle
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { Collaborateur, UpdateCollaborateurInput } from '../../types/collaboration';
import uuid from 'react-native-uuid';

export class CollaborateurRepository extends BaseRepository<Collaborateur> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'collaborations');
  }

  private mapRowToCollaborateur(row: any): Collaborateur {
    return {
      id: row.id,
      projet_id: row.projet_id,
      user_id: row.user_id || undefined,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      telephone: row.telephone || undefined,
      role: row.role,
      statut: row.statut || 'en_attente',
      permissions: {
        reproduction: Boolean(row.permission_reproduction),
        nutrition: Boolean(row.permission_nutrition),
        finance: Boolean(row.permission_finance),
        rapports: Boolean(row.permission_rapports),
        planification: Boolean(row.permission_planification),
        mortalites: Boolean(row.permission_mortalites),
        sante: Boolean(row.permission_sante),
      },
      date_invitation: row.date_invitation,
      date_acceptation: row.date_acceptation || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  /**
   * Créer un nouveau collaborateur
   */
  async create(data: Omit<Collaborateur, 'id' | 'date_creation' | 'derniere_modification'>): Promise<Collaborateur> {
    const id = uuid.v4() as string;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;

    await this.execute(
      `INSERT INTO collaborations (
        id, projet_id, user_id, nom, prenom, email, telephone, role, statut,
        permission_reproduction, permission_nutrition, permission_finance,
        permission_rapports, permission_planification, permission_mortalites, permission_sante,
        date_invitation, date_acceptation, notes, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id,
        data.user_id || null,
        data.nom,
        data.prenom,
        data.email,
        data.telephone || null,
        data.role,
        data.statut || 'en_attente',
        data.permissions.reproduction ? 1 : 0,
        data.permissions.nutrition ? 1 : 0,
        data.permissions.finance ? 1 : 0,
        data.permissions.rapports ? 1 : 0,
        data.permissions.planification ? 1 : 0,
        data.permissions.mortalites ? 1 : 0,
        data.permissions.sante ? 1 : 0,
        data.date_invitation,
        data.date_acceptation || null,
        data.notes || null,
        date_creation,
        derniere_modification,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer le collaborateur');
    }
    return created;
  }

  /**
   * Récupérer un collaborateur par ID
   */
  async findById(id: string): Promise<Collaborateur | null> {
    const row = await this.queryOne<any>('SELECT * FROM collaborations WHERE id = ?', [id]);
    return row ? this.mapRowToCollaborateur(row) : null;
  }

  /**
   * Récupérer tous les collaborateurs d'un projet
   */
  async findByProjet(projetId: string): Promise<Collaborateur[]> {
    const rows = await this.query<any>(
      'SELECT * FROM collaborations WHERE projet_id = ? ORDER BY nom ASC, prenom ASC',
      [projetId]
    );
    return rows.map(this.mapRowToCollaborateur);
  }

  /**
   * Récupérer les collaborateurs par statut
   */
  async findByStatut(statut: string): Promise<Collaborateur[]> {
    const rows = await this.query<any>(
      'SELECT * FROM collaborations WHERE statut = ? ORDER BY nom ASC, prenom ASC',
      [statut]
    );
    return rows.map(this.mapRowToCollaborateur);
  }

  /**
   * Récupérer les collaborateurs par rôle
   */
  async findByRole(role: string): Promise<Collaborateur[]> {
    const rows = await this.query<any>(
      'SELECT * FROM collaborations WHERE role = ? ORDER BY nom ASC, prenom ASC',
      [role]
    );
    return rows.map(this.mapRowToCollaborateur);
  }

  /**
   * Récupérer les collaborateurs par email
   */
  async findByEmail(email: string): Promise<Collaborateur[]> {
    const emailNormalized = email.trim().toLowerCase();
    const rows = await this.query<any>(
      'SELECT * FROM collaborations WHERE LOWER(TRIM(email)) = ? ORDER BY statut ASC, nom ASC, prenom ASC',
      [emailNormalized]
    );
    return rows.map(this.mapRowToCollaborateur);
  }

  /**
   * Récupérer le collaborateur actif par email
   */
  async findActifByEmail(email: string): Promise<Collaborateur | null> {
    const emailNormalized = email.trim().toLowerCase();
    const row = await this.queryOne<any>(
      'SELECT * FROM collaborations WHERE LOWER(TRIM(email)) = ? AND statut = ?',
      [emailNormalized, 'actif']
    );
    return row ? this.mapRowToCollaborateur(row) : null;
  }

  /**
   * Récupérer les collaborateurs actifs par user_id
   */
  async findActifsByUserId(userId: string): Promise<Collaborateur[]> {
    const rows = await this.query<any>(
      'SELECT * FROM collaborations WHERE user_id = ? AND statut = ? ORDER BY nom ASC, prenom ASC',
      [userId, 'actif']
    );
    return rows.map(this.mapRowToCollaborateur);
  }

  /**
   * Récupérer les invitations en attente par user_id
   */
  async findInvitationsEnAttenteByUserId(userId: string): Promise<Collaborateur[]> {
    const rows = await this.query<any>(
      `SELECT c.*, p.nom as projet_nom 
       FROM collaborations c
       LEFT JOIN projets p ON c.projet_id = p.id
       WHERE c.user_id = ? AND c.statut = ? 
       ORDER BY c.date_invitation DESC`,
      [userId, 'en_attente']
    );
    return rows.map(this.mapRowToCollaborateur);
  }

  /**
   * Récupérer les invitations en attente par email
   */
  async findInvitationsEnAttenteByEmail(email: string): Promise<Collaborateur[]> {
    const emailNormalized = email.trim().toLowerCase();
    const rows = await this.query<any>(
      `SELECT c.*, p.nom as projet_nom 
       FROM collaborations c
       LEFT JOIN projets p ON c.projet_id = p.id
       WHERE LOWER(TRIM(c.email)) = ? AND c.statut = ? 
       ORDER BY c.date_invitation DESC`,
      [emailNormalized, 'en_attente']
    );
    return rows.map(this.mapRowToCollaborateur);
  }

  /**
   * Mettre à jour un collaborateur
   */
  async update(id: string, updates: UpdateCollaborateurInput): Promise<Collaborateur> {
    // Récupérer les permissions actuelles si des permissions partielles sont fournies
    let currentCollaborateur: Collaborateur | null = null;
    if (updates.permissions) {
      currentCollaborateur = await this.findById(id);
      if (!currentCollaborateur) {
        throw new Error('Collaborateur introuvable');
      }
    }

    const derniere_modification = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.nom !== undefined) {
      fields.push('nom = ?');
      values.push(updates.nom);
    }
    if (updates.prenom !== undefined) {
      fields.push('prenom = ?');
      values.push(updates.prenom);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.telephone !== undefined) {
      fields.push('telephone = ?');
      values.push(updates.telephone || null);
    }
    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
    }
    if (updates.statut !== undefined) {
      fields.push('statut = ?');
      values.push(updates.statut);
    }
    if (updates.user_id !== undefined) {
      fields.push('user_id = ?');
      values.push(updates.user_id || null);
    }
    if (updates.permissions) {
      const perms = updates.permissions;
      const mergedPerms = {
        reproduction: perms.reproduction ?? currentCollaborateur!.permissions.reproduction,
        nutrition: perms.nutrition ?? currentCollaborateur!.permissions.nutrition,
        finance: perms.finance ?? currentCollaborateur!.permissions.finance,
        rapports: perms.rapports ?? currentCollaborateur!.permissions.rapports,
        planification: perms.planification ?? currentCollaborateur!.permissions.planification,
        mortalites: perms.mortalites ?? currentCollaborateur!.permissions.mortalites,
        sante: perms.sante ?? currentCollaborateur!.permissions.sante,
      };
      fields.push('permission_reproduction = ?');
      fields.push('permission_nutrition = ?');
      fields.push('permission_finance = ?');
      fields.push('permission_rapports = ?');
      fields.push('permission_planification = ?');
      fields.push('permission_mortalites = ?');
      fields.push('permission_sante = ?');
      values.push(mergedPerms.reproduction ? 1 : 0);
      values.push(mergedPerms.nutrition ? 1 : 0);
      values.push(mergedPerms.finance ? 1 : 0);
      values.push(mergedPerms.rapports ? 1 : 0);
      values.push(mergedPerms.planification ? 1 : 0);
      values.push(mergedPerms.mortalites ? 1 : 0);
      values.push(mergedPerms.sante ? 1 : 0);
    }
    if (updates.date_acceptation !== undefined) {
      fields.push('date_acceptation = ?');
      values.push(updates.date_acceptation || null);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes || null);
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('Collaborateur introuvable');
      return existing;
    }

    fields.push('derniere_modification = ?');
    values.push(derniere_modification);
    values.push(id);

    await this.execute(`UPDATE collaborations SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Collaborateur introuvable après mise à jour');
    }
    return updated;
  }

  /**
   * Lier un collaborateur à un utilisateur par email
   */
  async lierAUserParEmail(email: string, userId: string): Promise<Collaborateur> {
    const collaborateur = await this.findActifByEmail(email);
    if (!collaborateur) {
      throw new Error('Collaborateur actif introuvable avec cet email');
    }

    // Mettre à jour le user_id
    await this.execute(
      'UPDATE collaborations SET user_id = ?, derniere_modification = ? WHERE id = ?',
      [userId, new Date().toISOString(), collaborateur.id]
    );

    const updated = await this.findById(collaborateur.id);
    if (!updated) {
      throw new Error('Collaborateur introuvable après mise à jour');
    }
    return updated;
  }

  /**
   * Lier un collaborateur à un utilisateur par email (alias pour compatibilité)
   * Trouve le collaborateur avec cet email qui n'a pas encore de user_id
   */
  async lierCollaborateurAUtilisateur(
    userId: string,
    email: string
  ): Promise<Collaborateur | null> {
    const emailNormalized = email.trim().toLowerCase();

    // Trouver le collaborateur avec cet email qui n'a pas encore de user_id
    const collaborateur = await this.queryOne<any>(
      'SELECT * FROM collaborations WHERE LOWER(TRIM(email)) = ? AND (user_id IS NULL OR user_id = ?) LIMIT 1',
      [emailNormalized, userId]
    );

    if (!collaborateur) {
      return null;
    }

    // Mettre à jour le user_id
    await this.execute(
      'UPDATE collaborations SET user_id = ?, derniere_modification = ? WHERE id = ?',
      [userId, new Date().toISOString(), collaborateur.id]
    );

    // Retourner le collaborateur mis à jour
    const updated = await this.findById(collaborateur.id);
    return updated;
  }
}

