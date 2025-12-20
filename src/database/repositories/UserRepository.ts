/**
 * UserRepository - Gestion des utilisateurs
 *
 * Responsabilités:
 * - CRUD des utilisateurs
 * - Recherche par email, téléphone, identifiant
 * - Gestion de l'authentification
 * 
 * Utilise maintenant l'API REST du backend (PostgreSQL)
 */

import { BaseRepository } from './BaseRepository';
import { User, AuthProvider } from '../../types/auth';
import { UserRoles, RoleType } from '../../types/roles';
import apiClient from '../../services/api/apiClient';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users', '/users');
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
      try {
        const existing = await this.findByEmail(normalizedEmail);
        if (existing) {
          throw new Error('Un compte existe déjà avec cet email');
        }
      } catch (error) {
        // Si l'erreur est "compte existe déjà", la propager
        if (error instanceof Error && error.message.includes('existe déjà')) {
          throw error;
        }
        // Sinon, continuer (l'email n'existe pas)
      }
    }

    // Vérifier si le téléphone existe déjà (si fourni)
    if (input.telephone) {
      const cleanPhone = input.telephone.trim().replace(/\s+/g, '');
      try {
        const existing = await this.findByTelephone(cleanPhone);
        if (existing) {
          throw new Error('Un compte existe déjà avec ce numéro de téléphone');
        }
      } catch (error) {
        // Si l'erreur est "compte existe déjà", la propager
        if (error instanceof Error && error.message.includes('existe déjà')) {
          throw error;
        }
        // Sinon, continuer (le téléphone n'existe pas)
      }
    }

    // Créer l'utilisateur via l'API
    const userData = {
      email: input.email?.trim().toLowerCase() || null,
      telephone: input.telephone?.trim().replace(/\s+/g, '') || null,
      nom: input.nom,
      prenom: input.prenom,
      provider: input.provider || (input.telephone ? 'telephone' : 'email'),
      provider_id: input.provider_id || null,
      photo: input.photo || null,
      roles: input.roles || null,
      active_role: input.activeRole || null,
      is_onboarded: input.isOnboarded || false,
      onboarding_completed_at: input.onboardingCompletedAt || null,
    };

    const created = await this.executePost<User>('/users', userData);
    return created;
  }

  /**
   * Mettre à jour un utilisateur
   */
  async update(
    id: string,
    updates: {
      nom?: string;
      prenom?: string;
      email?: string;
      telephone?: string;
      photo?: string;
      roles?: unknown; // UserRoles
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

    // Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {};

    if (updates.nom !== undefined) {
      updateData.nom = updates.nom;
    }
    if (updates.prenom !== undefined) {
      updateData.prenom = updates.prenom;
    }
    if (updates.email !== undefined) {
      updateData.email = updates.email.trim().toLowerCase();
    }
    if (updates.telephone !== undefined) {
      updateData.telephone = updates.telephone.trim().replace(/\s+/g, '');
    }
    if (updates.photo !== undefined) {
      updateData.photo = updates.photo;
    }
    if (updates.roles !== undefined) {
      updateData.roles = updates.roles;
    }
    if (updates.activeRole !== undefined) {
      updateData.active_role = updates.activeRole;
    }
    if (updates.isOnboarded !== undefined) {
      updateData.is_onboarded = updates.isOnboarded;
    }
    if (updates.onboardingCompletedAt !== undefined) {
      updateData.onboarding_completed_at = updates.onboardingCompletedAt;
    }

    if (Object.keys(updateData).length === 0) {
      return existingUser;
    }

    const updated = await this.executePatch<User>(`/users/${id}`, updateData);
    return updated;
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async findById(id: string): Promise<User | null> {
    if (!id) {
      return null;
    }

    try {
      const user = await this.queryOne<User>(`/users/${id}`);
      return user || null;
    } catch (error) {
      console.error('Error finding user by id:', error);
      return null;
    }
  }

  /**
   * Récupérer un utilisateur par email
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const user = await this.queryOne<User>(`/users/email/${encodeURIComponent(normalizedEmail)}`);
      return user || null;
    } catch (error: any) {
      // Si c'est une erreur réseau (status 0), la propager
      if (error?.status === 0 || error?.message?.includes('Network request failed')) {
        console.error('Error finding user by email (network error):', error);
        throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion Internet.');
      }
      // Si c'est une erreur 404, l'utilisateur n'existe pas
      if (error?.status === 404) {
        return null;
      }
      // Pour les autres erreurs, logger et retourner null
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  /**
   * Récupérer un utilisateur par téléphone
   */
  async findByTelephone(telephone: string): Promise<User | null> {
    const cleanPhone = telephone.trim().replace(/\s+/g, '');

    try {
      const user = await this.queryOne<User>(`/users/telephone/${encodeURIComponent(cleanPhone)}`);
      return user || null;
    } catch (error: any) {
      // Si c'est une erreur réseau (status 0), la propager
      if (error?.status === 0 || error?.message?.includes('Network request failed')) {
        console.error('Error finding user by telephone (network error):', error);
        throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion Internet.');
      }
      // Si c'est une erreur 404, l'utilisateur n'existe pas
      if (error?.status === 404) {
        return null;
      }
      // Pour les autres erreurs, logger et retourner null
      console.error('Error finding user by telephone:', error);
      return null;
    }
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
    try {
      const users = await this.query<User>('/users');
      return users || [];
    } catch (error) {
      console.error('Error finding all users:', error);
      return [];
    }
  }

  /**
   * Mettre à jour la dernière connexion
   */
  async updateLastConnection(id: string): Promise<void> {
    await this.executePatch(`/users/${id}`, {
      derniere_connexion: new Date().toISOString(),
    });
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
    const updated = await this.executePatch<User>(`/users/${userId}`, {
      saved_farms: updatedFarms,
    });

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
    const updatedFarms = currentFarms.filter((id) => id !== farmId);

    const updated = await this.executePatch<User>(`/users/${userId}`, {
      saved_farms: updatedFarms,
    });

    return updated;
  }

  /**
   * Toggle une ferme dans les favoris
   */
  async toggleSavedFarm(
    userId: string,
    farmId: string
  ): Promise<{ user: User; isFavorite: boolean }> {
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
