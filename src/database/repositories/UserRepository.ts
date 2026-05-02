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
import * as FileSystem from 'expo-file-system';
import { API_CONFIG } from '../../config/api.config';

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

  /**
   * Upload une photo de profil vers le backend
   * @param userId ID de l'utilisateur
   * @param fileUri URI locale du fichier (file://, content://, ph://, etc.)
   * @returns URL complète de la photo uploadée
   */
  async uploadPhoto(userId: string, fileUri: string): Promise<string> {
    try {
      // Vérifier que le fichier existe
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      if (!fileInfo.exists) {
        throw new Error('Le fichier sélectionné n\'existe plus');
      }

      // Extraire l'extension du fichier pour déterminer le type MIME
      const uriParts = fileUri.split('/');
      const fileName = uriParts[uriParts.length - 1];
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';

      // Déterminer le type MIME
      let mimeType = 'image/jpeg';
      if (fileExtension === 'png') {
        mimeType = 'image/png';
      } else if (fileExtension === 'webp') {
        mimeType = 'image/webp';
      }

      // Récupérer le token d'authentification
      const token = await apiClient.tokens.getAccess();
      if (!token) {
        throw new Error('Vous devez être connecté pour modifier votre photo de profil');
      }

      // Construire l'URL de l'API
      const uploadUrl = `${API_CONFIG.baseURL}/users/${userId}/photo`;

      // Utiliser FileSystem.uploadAsync (plus fiable dans Expo Go que fetch+FormData)
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, fileUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'photo',
        mimeType,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Vérifier le statut HTTP
      if (uploadResult.status !== 200 && uploadResult.status !== 201) {
        let errorMessage = 'Erreur lors de l\'upload de la photo';
        try {
          const errorData = JSON.parse(uploadResult.body);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Si le body n'est pas du JSON, utiliser le message par défaut
        }
        
        if (uploadResult.status === 413) {
          throw new Error('Le fichier est trop volumineux (maximum 5MB)');
        }
        if (uploadResult.status === 400) {
          throw new Error(errorMessage);
        }
        if (uploadResult.status === 401) {
          throw new Error('Votre session a expiré. Veuillez vous reconnecter.');
        }
        if (uploadResult.status === 403) {
          throw new Error('Vous n\'avez pas la permission de modifier cette photo');
        }
        
        throw new Error(errorMessage);
      }

      // Parser la réponse JSON
      let response: { photoUrl: string; message: string };
      try {
        response = JSON.parse(uploadResult.body);
      } catch {
        throw new Error('Réponse du serveur invalide');
      }

      if (!response || !response.photoUrl) {
        throw new Error('Le serveur n\'a pas retourné l\'URL de la photo');
      }

      return response.photoUrl;
    } catch (error: any) {
      // Gérer les erreurs spécifiques
      if (error?.message?.includes('timeout') || error?.message?.includes('aborted')) {
        throw new Error('Le téléchargement a pris trop de temps. Vérifiez votre connexion et réessayez.');
      }
      
      // Erreur de connexion réseau (FileSystem.uploadAsync)
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network request failed') || error?.message?.includes('Unable to resolve host')) {
        throw new Error('Erreur de connexion. Vérifiez votre connexion Internet et que le serveur est accessible.');
      }
      
      if (error?.status === 400) {
        const errorMessage = error?.data?.message || error?.message || 'Fichier invalide';
        if (errorMessage.includes('trop volumineux') || errorMessage.includes('too large')) {
          throw new Error('Le fichier est trop volumineux (maximum 5MB)');
        }
        if (errorMessage.includes('format') || errorMessage.includes('Format')) {
          throw new Error('Format de fichier non supporté. Utilisez JPG, PNG ou WEBP.');
        }
        throw new Error(errorMessage);
      }
      if (error?.status === 403) {
        throw new Error('Vous n\'êtes pas autorisé à modifier cette photo');
      }
      if (error?.status === 404) {
        throw new Error('Utilisateur introuvable');
      }
      // Gérer les erreurs réseau (status 0, pas de status, ou erreurs réseau)
      if (!error?.status || error?.status === 0 || 
          error?.message?.includes('Network request failed') || 
          error?.message?.includes('Failed to fetch') ||
          error?.message?.includes('connexion')) {
        throw new Error('Erreur de connexion. Vérifiez votre connexion Internet.');
      }

      // Erreur générique
      const errorMessage = error?.message || 'Erreur lors du téléchargement de la photo';
      throw new Error(errorMessage);
    }
  }

  /**
   * Supprime la photo de profil
   * @param userId L'ID de l'utilisateur
   */
  async deletePhoto(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID est requis pour supprimer une photo.');
    }

    try {
      await apiClient.delete(`/users/${userId}/photo`, {
        timeout: 10000,
        retry: {
          attempts: 2,
          delay: 1000,
        },
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de la photo de profil:', error);
      throw new Error(`Échec de la suppression de la photo: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }
}
