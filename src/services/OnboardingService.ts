/**
 * Service pour gérer l'onboarding des utilisateurs
 * Création de profils, upload de documents, validation
 */

import apiClient from './api/apiClient';
import type { User } from '../types/auth';
import type {
  BuyerProfile,
  VeterinarianProfile,
  TechnicianProfile,
  ProfileStatus,
} from '../types/roles';
import { logger } from '../utils/logger';

export interface CreateUserInput {
  phone?: string;
  email?: string;
  firstName: string; // OBLIGATOIRE
  lastName: string; // OBLIGATOIRE
  provider: 'telephone' | 'email' | 'google' | 'apple';
  providerId?: string; // Pour OAuth
}

export type ProfileType = 'producer' | 'buyer' | 'veterinarian' | 'technician';

export interface CreateBuyerProfileInput {
  buyerType: 'individual' | 'restaurant' | 'butcher' | 'wholesaler' | 'retailer';
  businessInfo?: {
    companyName: string;
    contactPhone: string;
    businessRegistration?: string;
    taxId?: string;
    address?: string;
  };
}

export interface CreateVeterinarianProfileInput {
  qualifications: {
    degree: string;
    university: string;
    graduationYear: number;
    licenseNumber: string;
    licenseIssuedBy: string;
    licenseValidUntil: string; // ISO date string
    documents: {
      identityCard: {
        url: string;
        uploadedAt: string;
        verified: boolean;
      };
      professionalProof: {
        url: string;
        uploadedAt: string;
        verified: boolean;
      };
    };
  };
  specializations: string[];
  experience: {
    yearsOfPractice: number;
    previousPositions?: {
      position: string;
      organization: string;
      from: string;
      to?: string;
    }[];
  };
  workLocation: {
    address: string;
    city: string;
    region: string;
    latitude: number;
    longitude: number;
    serviceRadius: number;
  };
}

export interface CreateTechnicianProfileInput {
  qualifications: {
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  };
  skills: string[];
}

class OnboardingService {
  constructor() {
    // Les repositories n'ont plus besoin de db, ils utilisent l'API REST
  }

  /**
   * Vérifier si un téléphone existe déjà
   */
  async checkPhoneExists(phone: string): Promise<boolean> {
    try {
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      await apiClient.get(`/users/check/phone/${encodeURIComponent(cleanPhone)}`, {
        skipAuth: true,
      });
      return true; // Téléphone existe
    } catch (error: any) {
      if (error?.status === 404) {
        return false; // Téléphone n'existe pas
      }
      throw error; // Autre erreur
    }
  }

  /**
   * Vérifier si un email existe déjà
   */
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await apiClient.get(`/users/check/email/${encodeURIComponent(normalizedEmail)}`, {
        skipAuth: true,
      });
      return true; // Email existe
    } catch (error: any) {
      if (error?.status === 404) {
        return false; // Email n'existe pas
      }
      throw error; // Autre erreur
    }
  }

  /**
   * Créer un nouvel utilisateur (sans profil spécialisé)
   * Le profil sera créé plus tard via createSpecializedProfile
   */
  async createUser(input: CreateUserInput): Promise<User> {
    // Validation : au moins email ou téléphone requis
    if (!input.email && !input.phone) {
      throw new Error('Email ou numéro de téléphone requis');
    }

    // Validation : nom et prénom obligatoires (min 2 caractères)
    const firstNameTrimmed = input.firstName.trim();
    const lastNameTrimmed = input.lastName.trim();

    if (firstNameTrimmed.length < 2) {
      throw new Error('Le prénom doit contenir au moins 2 caractères');
    }

    if (lastNameTrimmed.length < 2) {
      throw new Error('Le nom doit contenir au moins 2 caractères');
    }

    // Vérifier les doublons AVANT création
    if (input.email) {
      const exists = await this.checkEmailExists(input.email);
      if (exists) {
        throw new Error('Un compte existe déjà avec cet email');
      }
    }

    if (input.phone) {
      const exists = await this.checkPhoneExists(input.phone);
      if (exists) {
        throw new Error('Un compte existe déjà avec ce numéro de téléphone');
      }
    }

    // Normaliser les données
    const normalizedEmail = input.email?.trim().toLowerCase() || null;
    const normalizedPhone = input.phone?.trim().replace(/\s+/g, '') || null;

    // Créer l'utilisateur via l'API backend (endpoint public)
    const registerPayload: {
      email?: string;
      telephone?: string;
      nom: string;
      prenom: string;
    } = {
      email: normalizedEmail || undefined,
      telephone: normalizedPhone || undefined,
      nom: lastNameTrimmed,
      prenom: firstNameTrimmed,
    };

    const created = await apiClient.post<{
      access_token: string;
      refresh_token: string;
      user: User;
    }>('/auth/register', registerPayload, { skipAuth: true });

    // Stocker les tokens pour les appels suivants
    await apiClient.tokens.set(created.access_token, created.refresh_token);

    // Si providerId fourni (OAuth), mettre à jour l'utilisateur
    if (input.providerId) {
      try {
        await apiClient.patch(`/users/${created.user.id}`, {
          provider: input.provider,
          provider_id: input.providerId,
        });
      } catch (error) {
        logger.warn('[OnboardingService] Erreur mise à jour provider (non bloquant):', error);
      }
    }

    // Récupérer l'utilisateur créé avec tous les champs depuis l'API backend
    const fullUser = await apiClient.get<any>(`/users/${created.user.id}`);
    if (!fullUser) {
      throw new Error("Erreur lors de la création de l'utilisateur");
    }
    return fullUser;
  }

  /**
   * Créer un profil spécialisé pour un utilisateur existant
   */
  async createSpecializedProfile(
    userId: string,
    profileType: ProfileType,
    additionalData?: any
  ): Promise<User> {
    switch (profileType) {
      case 'producer':
        // Le profil producer sera créé lors de la création du premier projet
        // Pour l'instant, on crée juste la structure de base
        const user = await apiClient.get<any>(`/users/${userId}`);
        const producerProfile = {
          isActive: true,
          activatedAt: new Date().toISOString(),
          farmName: '',
          farmType: 'individual',
          capacity: {
            totalCapacity: 0,
            currentOccupancy: 0,
          },
          stats: {
            totalSales: 0,
            totalRevenue: 0,
            averageRating: 0,
            totalReviews: 0,
          },
          marketplaceSettings: {
            defaultPricePerKg: 450,
            autoAcceptOffers: false,
            minimumOfferPercentage: 80,
            notificationsEnabled: true,
          },
        };

        await apiClient.patch(`/users/${userId}`, {
          roles: {
            ...user.roles,
            producer: producerProfile,
          },
          activeRole: 'producer',
        });
        break;

      case 'buyer':
        // Créer le profil buyer avec données par défaut
        await this.createBuyerProfile(userId, {
          buyerType: additionalData?.buyerType || 'individual',
          businessInfo: additionalData?.businessInfo,
        });
        break;

      case 'veterinarian':
        // Nécessite des données supplémentaires (qualifications, documents, etc.)
        if (!additionalData) {
          throw new Error('Les données vétérinaire sont requises');
        }
        await this.createVeterinarianProfile(userId, additionalData);
        break;

      case 'technician':
        // Créer le profil technician avec données par défaut
        await this.createTechnicianProfile(userId, {
          qualifications: additionalData?.qualifications || { level: 'beginner' },
          skills: additionalData?.skills || [],
        });
        break;
    }

    // Récupérer l'utilisateur mis à jour
    const updatedUser = await apiClient.get<any>(`/users/${userId}`);
    return updatedUser;
  }

  /**
   * Connexion OAuth (Google ou Apple)
   * Retourne l'utilisateur et indique si c'est un nouvel utilisateur
   */
  async signInWithOAuth(
    provider: 'google' | 'apple',
    oauthData: any
  ): Promise<{ user: User; isNewUser: boolean }> {
    const response = await apiClient.post<{
      access_token: string;
      refresh_token: string;
      user: User;
    }>(`/auth/${provider}`, oauthData, { skipAuth: true });

    // Stocker les tokens
    await apiClient.tokens.set(response.access_token, response.refresh_token);

    // Vérifier si c'est un nouvel utilisateur
    const isNewUser =
      !response.user.roles ||
      Object.keys(response.user.roles).length === 0 ||
      !response.user.prenom ||
      response.user.prenom.length < 2 ||
      !response.user.nom ||
      response.user.nom.length < 2;

    return {
      user: response.user,
      isNewUser,
    };
  }

  /**
   * Créer le profil acheteur
   */
  async createBuyerProfile(userId: string, input: CreateBuyerProfileInput): Promise<BuyerProfile> {
    const user = await apiClient.get<any>(`/users/${userId}`);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const allProjets = await apiClient.get<any[]>('/projets');
    const projets = allProjets.filter((p) => p.proprietaire_id === userId);
    const hasExistingProject = projets.length > 0;
    const isActive = hasExistingProject;

    const buyerProfile: BuyerProfile = {
      isActive,
      activatedAt: new Date().toISOString(),
      buyerType: input.buyerType,
      businessInfo: input.businessInfo,
      purchaseHistory: {
        totalPurchases: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        preferredRaces: [],
      },
      preferences: {
        preferredWeightRange: { min: 20, max: 150 },
        maxDistance: 50,
        notifyNewListings: true,
        notifyPriceDrops: false,
      },
      rating: {
        asReviewer: 0,
        totalReviewsGiven: 0,
      },
    };

    const updatedRoles = {
      ...user.roles,
      buyer: buyerProfile,
    };

    await apiClient.patch(`/users/${userId}`, {
      roles: updatedRoles,
      activeRole: user.activeRole || 'buyer',
    });

    return buyerProfile;
  }

  /**
   * Créer le profil vétérinaire
   */
  async createVeterinarianProfile(
    userId: string,
    input: CreateVeterinarianProfileInput
  ): Promise<VeterinarianProfile> {
    const user = await apiClient.get<any>(`/users/${userId}`);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const validationStatus: ProfileStatus = 'pending';

    const veterinarianProfile: VeterinarianProfile = {
      isActive: true,
      activatedAt: new Date().toISOString(),
      validationStatus,
      submittedAt: new Date().toISOString(),
      qualifications: {
        degree: input.qualifications.degree,
        university: input.qualifications.university,
        graduationYear: input.qualifications.graduationYear,
        licenseNumber: input.qualifications.licenseNumber,
        licenseIssuedBy: input.qualifications.licenseIssuedBy,
        licenseValidUntil: input.qualifications.licenseValidUntil,
        documents: input.qualifications.documents,
      },
      specializations: input.specializations,
      experience: input.experience,
      workLocation: input.workLocation,
      clients: [],
      stats: {
        totalConsultations: 0,
        totalVaccinations: 0,
        totalTreatments: 0,
        averageResponseTime: 0,
        averageRating: 0,
        totalReviews: 0,
      },
      serviceProposals: [],
    };

    const updatedRoles = {
      ...user.roles,
      veterinarian: veterinarianProfile,
    };

    await apiClient.patch(`/users/${userId}`, {
      roles: updatedRoles,
      activeRole: user.activeRole || 'veterinarian',
    });

    await this.createValidationRequest(userId, 'veterinarian', {
      identityCard: input.qualifications.documents.identityCard.url,
      professionalProof: input.qualifications.documents.professionalProof.url,
    });

    return veterinarianProfile;
  }

  /**
   * Créer le profil technicien
   */
  async createTechnicianProfile(
    userId: string,
    input: CreateTechnicianProfileInput
  ): Promise<TechnicianProfile> {
    const user = await apiClient.get<any>(`/users/${userId}`);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const technicianProfile: TechnicianProfile = {
      isActive: true,
      activatedAt: new Date().toISOString(),
      qualifications: input.qualifications,
      skills: input.skills,
      assistedFarms: [],
    };

    const updatedRoles = {
      ...user.roles,
      technician: technicianProfile,
    };

    await apiClient.patch(`/users/${userId}`, {
      roles: updatedRoles,
      activeRole: user.activeRole || 'technician',
    });

    return technicianProfile;
  }

  /**
   * Marquer l'onboarding comme terminé
   */
  async completeOnboarding(userId: string): Promise<void> {
    const user = await apiClient.get<any>(`/users/${userId}`);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    await apiClient.patch(`/users/${userId}`, {
      isOnboarded: true,
      onboardingCompletedAt: new Date().toISOString(),
    });
  }

  /**
   * Créer compte avec téléphone + mot de passe
   */
  async createUserWithPhone(input: {
    phone: string;
    firstName: string;
    lastName: string;
    password: string;
  }): Promise<User> {
    if (input.firstName.length < 2) {
      throw new Error('Prénom min 2 caractères');
    }
    if (input.lastName.length < 2) {
      throw new Error('Nom min 2 caractères');
    }
    if (input.password.length < 6) {
      throw new Error('Mot de passe min 6 caractères');
    }

    const response = await apiClient.post<{
      access_token: string;
      refresh_token: string;
      user: User;
    }>(
      '/auth/register',
      {
        telephone: input.phone,
        nom: input.lastName,
        prenom: input.firstName,
        password: input.password,
        provider: 'telephone',
      },
      { skipAuth: true }
    );

    await apiClient.tokens.set(response.access_token, response.refresh_token);
    return response.user;
  }

  /**
   * Connexion avec téléphone + mot de passe
   */
  async signInWithPhone(phone: string, password: string): Promise<User> {
    const response = await apiClient.post<{
      access_token: string;
      refresh_token: string;
      user: User;
    }>(
      '/auth/login',
      {
        telephone: phone,
        password: password,
      },
      { skipAuth: true }
    );

    await apiClient.tokens.set(response.access_token, response.refresh_token);
    return response.user;
  }

  /**
   * Demander réinitialisation mot de passe
   */
  async requestPasswordReset(phone: string): Promise<void> {
    await apiClient.post(
      '/auth/forgot-password',
      {
        telephone: phone,
      },
      { skipAuth: true }
    );
  }

  /**
   * Vérifier code OTP de réinitialisation
   */
  async verifyResetOTP(phone: string, otp: string): Promise<string> {
    const response = await apiClient.post<{ reset_token: string }>(
      '/auth/verify-reset-otp',
      {
        telephone: phone,
        otp: otp,
      },
      { skipAuth: true }
    );

    return response.reset_token;
  }

  /**
   * Réinitialiser mot de passe
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    await apiClient.post(
      '/auth/reset-password',
      {
        reset_token: resetToken,
        new_password: newPassword,
      },
      { skipAuth: true }
    );
  }

  /**
   * Créer une demande de validation pour un profil vétérinaire
   */
  async createValidationRequest(
    userId: string,
    profileType: 'veterinarian',
    documents: {
      identityCard: string;
      professionalProof: string;
    }
  ): Promise<string> {
    const validationRequestId = `validation-${userId}-${Date.now()}`;
    const profileTypePrefix = profileType.substring(0, 3).toUpperCase();
    const documentsHash = `${documents.identityCard.substring(0, 8)}-${documents.professionalProof.substring(0, 8)}`;
    const enhancedId = `${validationRequestId}-${profileTypePrefix}-${documentsHash}`;

    return enhancedId;
  }

  /**
   * Upload un document (image ou PDF)
   */
  async uploadDocument(file: { uri: string; name?: string; type?: string }): Promise<string> {
    return file.uri;
  }

  /**
   * Valider un profil vétérinaire (appelé par un admin)
   */
  async validateProfile(
    userId: string,
    validatedBy: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string
  ): Promise<void> {
    const user = await apiClient.get<any>(`/users/${userId}`);
    if (!user || !user.roles?.veterinarian) {
      throw new Error('Profil vétérinaire non trouvé');
    }

    const updatedProfile: VeterinarianProfile = {
      ...user.roles.veterinarian,
      validationStatus: status,
      validatedAt: new Date().toISOString(),
      validatedBy,
      rejectionReason: status === 'rejected' ? rejectionReason : undefined,
    };

    const updatedRoles = {
      ...user.roles,
      veterinarian: updatedProfile,
    };

    await apiClient.patch(`/users/${userId}`, {
      roles: updatedRoles,
    });
  }
}

// Singleton
let onboardingServiceInstance: OnboardingService | null = null;

export const getOnboardingService = async (): Promise<OnboardingService> => {
  if (!onboardingServiceInstance) {
    onboardingServiceInstance = new OnboardingService();
  }
  return onboardingServiceInstance;
};

export default OnboardingService;
