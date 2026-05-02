/**
 * CollaborateurRepository - Gestion des collaborateurs
 *
 * Responsabilités:
 * - CRUD des collaborateurs
 * - Gestion des invitations
 * - Recherche par email, statut, rôle
 * 
 * Utilise maintenant l'API REST du backend (PostgreSQL)
 */

import { BaseRepository } from './BaseRepository';
import { Collaborateur, UpdateCollaborateurInput } from '../../types/collaboration';

// Type pour les données brutes de la base de données
interface CollaborateurRow {
  id: string;
  projet_id: string;
  user_id?: string | null;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  role: string;
  statut?: string | null;
  permission_reproduction?: boolean | number | null;
  permission_nutrition?: boolean | number | null;
  permission_finance?: boolean | number | null;
  permission_rapports?: boolean | number | null;
  permission_planification?: boolean | number | null;
  permission_mortalites?: boolean | number | null;
  permission_sante?: boolean | number | null;
  date_invitation: string;
  date_acceptation?: string | null;
  notes?: string | null;
  date_creation: string;
  derniere_modification: string;
}

export class CollaborateurRepository extends BaseRepository<Collaborateur> {
  constructor() {
    super('collaborations', '/collaborations');
  }

  private mapRowToCollaborateur(row: CollaborateurRow): Collaborateur {
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
  async create(
    data: Omit<Collaborateur, 'id' | 'date_creation' | 'derniere_modification'>
  ): Promise<Collaborateur> {
    const collaborateurData = {
      projet_id: data.projet_id,
      user_id: data.user_id || null,
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      telephone: data.telephone || null,
      role: data.role,
      statut: data.statut || 'en_attente',
      permission_reproduction: data.permissions.reproduction ? 1 : 0,
      permission_nutrition: data.permissions.nutrition ? 1 : 0,
      permission_finance: data.permissions.finance ? 1 : 0,
      permission_rapports: data.permissions.rapports ? 1 : 0,
      permission_planification: data.permissions.planification ? 1 : 0,
      permission_mortalites: data.permissions.mortalites ? 1 : 0,
      permission_sante: data.permissions.sante ? 1 : 0,
      date_invitation: data.date_invitation,
      date_acceptation: data.date_acceptation || null,
      notes: data.notes || null,
    };

    const created = await this.executePost<CollaborateurRow>('/collaborations', collaborateurData);
    return this.mapRowToCollaborateur(created);
  }

  /**
   * Récupérer un collaborateur par ID
   */
  async findById(id: string): Promise<Collaborateur | null> {
    try {
      const row = await this.queryOne<CollaborateurRow>(`/collaborations/${id}`);
      return row ? this.mapRowToCollaborateur(row) : null;
    } catch (error) {
      console.error('Error finding collaborateur by id:', error);
      return null;
    }
  }

  /**
   * Récupérer tous les collaborateurs d'un projet
   */
  async findByProjet(projetId: string): Promise<Collaborateur[]> {
    try {
      const rows = await this.query<CollaborateurRow>('/collaborations', { projet_id: projetId });
      return rows.map((row) => this.mapRowToCollaborateur(row));
    } catch (error) {
      console.error('Error finding collaborateurs by projet:', error);
      return [];
    }
  }

  /**
   * Récupérer les collaborateurs par statut
   */
  async findByStatut(statut: string): Promise<Collaborateur[]> {
    try {
      const rows = await this.query<CollaborateurRow>('/collaborations', { statut });
      return rows.map((row) => this.mapRowToCollaborateur(row));
    } catch (error) {
      console.error('Error finding collaborateurs by statut:', error);
      return [];
    }
  }

  /**
   * Récupérer les collaborateurs par rôle
   */
  async findByRole(role: string): Promise<Collaborateur[]> {
    try {
      const rows = await this.query<CollaborateurRow>('/collaborations', { role });
      return rows.map((row) => this.mapRowToCollaborateur(row));
    } catch (error) {
      console.error('Error finding collaborateurs by role:', error);
      return [];
    }
  }

  /**
   * Récupérer les collaborateurs par email
   */
  async findByEmail(email: string): Promise<Collaborateur[]> {
    try {
      const emailNormalized = email.trim().toLowerCase();
      const rows = await this.query<CollaborateurRow>('/collaborations', {});
      return rows
        .filter((row) => (row.email || '').toLowerCase().trim() === emailNormalized)
        .map((row) => this.mapRowToCollaborateur(row));
    } catch (error) {
      console.error('Error finding collaborateurs by email:', error);
      return [];
    }
  }

  /**
   * Récupérer le collaborateur actif par email
   */
  async findActifByEmail(email: string): Promise<Collaborateur | null> {
    try {
      const collaborateurs = await this.findByEmail(email);
      return collaborateurs.find(c => c.statut === 'actif') || null;
    } catch (error) {
      console.error('Error finding collaborateur actif by email:', error);
      return null;
    }
  }

  /**
   * Récupérer les collaborateurs actifs par user_id
   */
  async findActifsByUserId(userId: string): Promise<Collaborateur[]> {
    try {
      const rows = await this.query<CollaborateurRow>('/collaborations', {});
      return rows
        .filter((row) => row.user_id === userId && row.statut === 'actif')
        .map((row) => this.mapRowToCollaborateur(row));
    } catch (error) {
      console.error('Error finding collaborateurs actifs by user id:', error);
      return [];
    }
  }

  /**
   * Récupérer les invitations en attente par user_id
   */
  async findInvitationsEnAttenteByUserId(userId: string): Promise<Collaborateur[]> {
    try {
      const rows = await this.query<CollaborateurRow>('/collaborations/invitations', {});
      return rows
        .filter((row) => row.user_id === userId && row.statut === 'en_attente')
        .map((row) => this.mapRowToCollaborateur(row));
    } catch (error) {
      console.error('Error finding invitations en attente:', error);
      return [];
    }
  }

  /**
   * Récupérer les invitations en attente par email
   */
  async findInvitationsEnAttenteByEmail(email: string): Promise<Collaborateur[]> {
    try {
      const emailNormalized = email.trim().toLowerCase();
      const rows = await this.query<CollaborateurRow>('/collaborations/invitations', {});
      return rows
        .filter(
          (row) =>
            (row.email || '').toLowerCase().trim() === emailNormalized && row.statut === 'en_attente'
        )
        .map((row) => this.mapRowToCollaborateur(row));
    } catch (error) {
      console.error('Error finding invitations en attente by email:', error);
      return [];
    }
  }

  /**
   * Mettre à jour un collaborateur
   */
  async update(id: string, updates: UpdateCollaborateurInput): Promise<Collaborateur> {
    const currentCollaborateur = await this.findById(id);
    if (!currentCollaborateur) {
      throw new Error('Collaborateur introuvable');
    }

    const updateData: Record<string, unknown> = {};

    if (updates.nom !== undefined) updateData.nom = updates.nom;
    if (updates.prenom !== undefined) updateData.prenom = updates.prenom;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.telephone !== undefined) updateData.telephone = updates.telephone || null;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.statut !== undefined) updateData.statut = updates.statut;
    if (updates.user_id !== undefined) updateData.user_id = updates.user_id || null;
    if (updates.date_acceptation !== undefined) updateData.date_acceptation = updates.date_acceptation || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;

    if (updates.permissions) {
      const perms = updates.permissions;
      const mergedPerms = {
        reproduction: perms.reproduction ?? currentCollaborateur.permissions.reproduction,
        nutrition: perms.nutrition ?? currentCollaborateur.permissions.nutrition,
        finance: perms.finance ?? currentCollaborateur.permissions.finance,
        rapports: perms.rapports ?? currentCollaborateur.permissions.rapports,
        planification: perms.planification ?? currentCollaborateur.permissions.planification,
        mortalites: perms.mortalites ?? currentCollaborateur.permissions.mortalites,
        sante: perms.sante ?? currentCollaborateur.permissions.sante,
      };
      updateData.permission_reproduction = mergedPerms.reproduction ? 1 : 0;
      updateData.permission_nutrition = mergedPerms.nutrition ? 1 : 0;
      updateData.permission_finance = mergedPerms.finance ? 1 : 0;
      updateData.permission_rapports = mergedPerms.rapports ? 1 : 0;
      updateData.permission_planification = mergedPerms.planification ? 1 : 0;
      updateData.permission_mortalites = mergedPerms.mortalites ? 1 : 0;
      updateData.permission_sante = mergedPerms.sante ? 1 : 0;
    }

    if (Object.keys(updateData).length === 0) {
      return currentCollaborateur;
    }

    const updated = await this.executePatch<CollaborateurRow>(`/collaborations/${id}`, updateData);
    return this.mapRowToCollaborateur(updated);
  }

  /**
   * Lier un collaborateur à un utilisateur par email
   */
  async lierAUserParEmail(email: string, userId: string): Promise<Collaborateur> {
    const collaborateur = await this.findActifByEmail(email);
    if (!collaborateur) {
      throw new Error('Collaborateur actif introuvable avec cet email');
    }

    return this.update(collaborateur.id, { user_id: userId });
  }

  /**
   * Lier un collaborateur à un utilisateur par email (alias pour compatibilité)
   */
  async lierCollaborateurAUtilisateur(userId: string, email: string): Promise<Collaborateur | null> {
    try {
      const emailNormalized = email.trim().toLowerCase();
      const rows = await this.query<CollaborateurRow>('/collaborations', {});
      const collaborateur = rows.find(
        (row) =>
          (row.email || '').toLowerCase().trim() === emailNormalized &&
          (!row.user_id || row.user_id === userId)
      );

      if (!collaborateur) {
        return null;
      }

      return this.update(collaborateur.id, { user_id: userId });
    } catch (error) {
      console.error('Error linking collaborateur to user:', error);
      return null;
    }
  }
}
