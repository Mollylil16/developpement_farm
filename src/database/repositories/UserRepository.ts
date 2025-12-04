/**
 * UserRepository - Gestion des utilisateurs
 * 
 * Responsabilités:
 * - CRUD des utilisateurs
 * - Recherche par email, téléphone, identifiant
 * - Gestion de l'authentification
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { User, AuthProvider } from '../../types/auth';
import { UserRoles, RoleType } from '../../types/roles';
import uuid from 'react-native-uuid';

export class UserRepository extends BaseRepository<User> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'users');
  }

  /**
   * Créer un nouvel utilisateur
   */
  async create(input: {
    email?: string;
    telephone?: string;
    nom: string;
    prenom: string;
    provider?: AuthProvider;
    provider_id?: string;
    photo?: string;
    roles?: UserRoles;
    activeRole?: RoleType;
    isOnboarded?: boolean;
    onboardingCompletedAt?: string;
  }): Promise<User> {
    // Vérifier qu'au moins email ou téléphone est fourni
    if (!input.email && !input.telephone) {
      throw new Error('Email ou numéro de téléphone requis');
    }

    // Vérifier si l'email existe déjà (si fourni)
    if (input.email) {
      const normalizedEmail = input.email.trim().toLowerCase();
      const existingEmail = await this.queryOne<{ id: string }>(
        'SELECT id FROM users WHERE email = ?',
        [normalizedEmail]
      );

      if (existingEmail) {
        throw new Error('Un compte existe déjà avec cet email');
      }
    }

    // Vérifier si le téléphone existe déjà (si fourni)
    if (input.telephone) {
      const cleanPhone = input.telephone.trim().replace(/\s+/g, '');
      const existingPhone = await this.queryOne<{ id: string }>(
        'SELECT id FROM users WHERE telephone = ?',
        [cleanPhone]
      );

      if (existingPhone) {
        throw new Error('Un compte existe déjà avec ce numéro de téléphone');
      }
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const provider = input.provider || (input.telephone ? 'telephone' : 'email');

    // Normaliser l'email (trim + lowercase) si fourni
    const normalizedEmail = input.email ? input.email.trim().toLowerCase() : null;
    const normalizedTelephone = input.telephone ? input.telephone.trim().replace(/\s+/g, '') : null;

    await this.execute(
      `INSERT INTO users (
        id, email, telephone, nom, prenom, password_hash, provider, provider_id, photo,
        date_creation, derniere_connexion, is_active,
        roles, active_role, is_onboarded, onboarding_completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        normalizedEmail,
        normalizedTelephone,
        input.nom,
        input.prenom,
        null, // Pas de mot de passe
        provider,
        input.provider_id || null,
        input.photo || null,
        now,
        now,
        1,
        input.roles ? JSON.stringify(input.roles) : null,
        input.activeRole || null,
        input.isOnboarded ? 1 : 0,
        input.onboardingCompletedAt || null,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer l\'utilisateur');
    }
    return created;
  }

  /**
   * Mettre à jour un utilisateur
   * 
   * IMPORTANT: Les informations de base (nom, prénom, email, téléphone, photo) sont stockées
   * au niveau User, donc elles sont automatiquement synchronisées entre tous les profils.
   * Lorsqu'un utilisateur modifie ces informations depuis n'importe quel profil, les modifications
   * sont visibles dans tous les profils car elles sont partagées au niveau User.
   * 
   * Seules les informations complémentaires spécifiques à chaque profil (comme farmName pour
   * le producteur, companyName pour l'acheteur, etc.) sont stockées dans roles.{profileType}.
   */
  async update(
    id: string,
    updates: {
      nom?: string;
      prenom?: string;
      email?: string;
      telephone?: string;
      photo?: string;
      roles?: any; // UserRoles
      activeRole?: string; // RoleType
      isOnboarded?: boolean;
      onboardingCompletedAt?: string;
    }
  ): Promise<User> {
    // Vérifier que l'utilisateur existe
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new Error(
        'Profil introuvable dans la base de données. ' +
        'Veuillez vous déconnecter et vous reconnecter.'
      );
    }

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
      values.push(updates.email.trim().toLowerCase());
    }
    if (updates.telephone !== undefined) {
      fields.push('telephone = ?');
      values.push(updates.telephone.trim().replace(/\s+/g, ''));
    }
    if (updates.photo !== undefined) {
      fields.push('photo = ?');
      values.push(updates.photo);
    }
    if (updates.roles !== undefined) {
      fields.push('roles = ?');
      values.push(JSON.stringify(updates.roles));
    }
    if (updates.activeRole !== undefined) {
      fields.push('active_role = ?');
      values.push(updates.activeRole);
    }
    if (updates.isOnboarded !== undefined) {
      fields.push('is_onboarded = ?');
      values.push(updates.isOnboarded ? 1 : 0);
    }
    if (updates.onboardingCompletedAt !== undefined) {
      fields.push('onboarding_completed_at = ?');
      values.push(updates.onboardingCompletedAt);
    }

    if (fields.length === 0) {
      return existingUser;
    }

    values.push(id);

    await this.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Erreur lors de la récupération du profil mis à jour');
    }
    
    return updated;
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async findById(id: string): Promise<User | null> {
    if (!id) {
      return null;
    }

    const row = await this.queryOne<any>(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [id]
    );

    if (!row) {
      return null;
    }

    return this.mapRowToUser(row);
  }

  /**
   * Récupérer un utilisateur par email
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();

    const row = await this.queryOne<any>(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [normalizedEmail]
    );

    if (!row) {
      return null;
    }

    return this.mapRowToUser(row);
  }

  /**
   * Récupérer un utilisateur par téléphone
   */
  async findByTelephone(telephone: string): Promise<User | null> {
    const cleanPhone = telephone.trim().replace(/\s+/g, '');

    const row = await this.queryOne<any>(
      'SELECT * FROM users WHERE telephone = ? AND is_active = 1',
      [cleanPhone]
    );

    if (!row) {
      return null;
    }

    return this.mapRowToUser(row);
  }

  /**
   * Récupérer un utilisateur par email ou téléphone
   */
  async findByIdentifier(identifier: string): Promise<User | null> {
    const normalized = identifier.trim();
    const isEmail = normalized.includes('@');

    if (isEmail) {
      return this.findByEmail(normalized.toLowerCase());
    } else {
      const cleanPhone = normalized.replace(/\s+/g, '');
      return this.findByTelephone(cleanPhone);
    }
  }

  /**
   * Récupérer tous les utilisateurs
   */
  async findAll(): Promise<User[]> {
    const rows = await this.query<any>(
      'SELECT * FROM users WHERE is_active = 1 ORDER BY date_creation DESC'
    );

    return rows.map(row => this.mapRowToUser(row));
  }

  /**
   * Mettre à jour la dernière connexion
   */
  async updateLastConnection(id: string): Promise<void> {
    await this.execute(
      'UPDATE users SET derniere_connexion = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );
  }

  /**
   * Mapper une ligne de la base de données vers un objet User
   */
  private mapRowToUser(row: any): User {
    // Parser saved_farms depuis JSON
    let savedFarms: string[] = [];
    if (row.saved_farms) {
      try {
        savedFarms = JSON.parse(row.saved_farms);
      } catch (e) {
        console.warn('Erreur parsing saved_farms:', e);
        savedFarms = [];
      }
    }

    // Parser roles depuis JSON
    let roles: any = undefined;
    if (row.roles) {
      try {
        roles = JSON.parse(row.roles);
      } catch (e) {
        console.warn('Erreur parsing roles:', e);
        roles = undefined;
      }
    }

    return {
      id: row.id,
      email: row.email || undefined,
      telephone: row.telephone || undefined,
      nom: row.nom,
      prenom: row.prenom,
      provider: row.provider as AuthProvider,
      photo: row.photo || undefined,
      saved_farms: savedFarms.length > 0 ? savedFarms : undefined,
      date_creation: row.date_creation,
      derniere_connexion: row.derniere_connexion || row.date_creation,
      // 🆕 Champs multi-rôles
      roles: roles,
      activeRole: row.active_role || undefined,
      isOnboarded: row.is_onboarded === 1,
      onboardingCompletedAt: row.onboarding_completed_at || undefined,
    };
  }

  /**
   * Ajouter une ferme aux favoris
   */
  async addSavedFarm(userId: string, farmId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const currentFarms = user.saved_farms || [];
    if (currentFarms.includes(farmId)) {
      return user; // Déjà dans les favoris
    }

    const updatedFarms = [...currentFarms, farmId];
    await this.execute(
      'UPDATE users SET saved_farms = ? WHERE id = ?',
      [JSON.stringify(updatedFarms), userId]
    );

    const updated = await this.findById(userId);
    if (!updated) {
      throw new Error('Erreur lors de la mise à jour');
    }
    return updated;
  }

  /**
   * Retirer une ferme des favoris
   */
  async removeSavedFarm(userId: string, farmId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const currentFarms = user.saved_farms || [];
    const updatedFarms = currentFarms.filter(id => id !== farmId);

    await this.execute(
      'UPDATE users SET saved_farms = ? WHERE id = ?',
      [JSON.stringify(updatedFarms), userId]
    );

    const updated = await this.findById(userId);
    if (!updated) {
      throw new Error('Erreur lors de la mise à jour');
    }
    return updated;
  }

  /**
   * Toggle une ferme dans les favoris
   */
  async toggleSavedFarm(userId: string, farmId: string): Promise<{ user: User; isFavorite: boolean }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const currentFarms = user.saved_farms || [];
    const isFavorite = currentFarms.includes(farmId);

    if (isFavorite) {
      const updated = await this.removeSavedFarm(userId, farmId);
      return { user: updated, isFavorite: false };
    } else {
      const updated = await this.addSavedFarm(userId, farmId);
      return { user: updated, isFavorite: true };
    }
  }
}

