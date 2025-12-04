/**
 * Service pour gérer l'onboarding des utilisateurs
 * Création de profils, upload de documents, validation
 */

import { getDatabase } from './database';
import { UserRepository } from '../database/repositories/UserRepository';
import { ProjetRepository } from '../database/repositories/ProjetRepository';
import type { User } from '../types/auth';
import type {
  BuyerProfile,
  VeterinarianProfile,
  TechnicianProfile,
  ProfileStatus,
} from '../types/roles';

export interface CreateUserInput {
  email?: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profileType: 'producer' | 'buyer' | 'veterinarian' | 'technician';
}

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
  private db: any;

  constructor() {
    this.db = null;
  }

  private async getDb() {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  /**
   * Créer un nouvel utilisateur avec le profil de base
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const db = await this.getDb();
    const userRepo = new UserRepository(db);

    // Vérifier si l'email ou le téléphone existe déjà
    if (input.email) {
      const existingUser = await userRepo.findByEmail(input.email);
      if (existingUser) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }
    }
    
    if (input.phone) {
      const existingUser = await userRepo.findByTelephone(input.phone);
      if (existingUser) {
        throw new Error('Un utilisateur avec ce numéro de téléphone existe déjà');
      }
    }

    // Vérifier qu'au moins email ou téléphone est fourni
    if (!input.email && !input.phone) {
      throw new Error('Email ou numéro de téléphone requis');
    }

    // Créer l'utilisateur de base
    const user: Partial<User> = {
      email: input.email,
      telephone: input.phone,
      nom: input.lastName || '',
      prenom: input.firstName || '',
      provider: input.phone ? 'telephone' : 'email',
      date_creation: new Date().toISOString(),
      derniere_connexion: new Date().toISOString(),
      isOnboarded: false,
      roles: {},
      activeRole: input.profileType,
    };

    // Créer le profil selon le type
    if (input.profileType === 'producer') {
      // Le profil producteur sera créé lors de la création du projet
      user.roles = {
        producer: {
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
        },
      };
    }

    const createdUser = await userRepo.create({
      email: user.email,
      telephone: user.telephone,
      nom: user.nom,
      prenom: user.prenom,
      provider: user.provider,
      roles: user.roles,
      activeRole: user.activeRole,
      isOnboarded: user.isOnboarded,
      onboardingCompletedAt: user.onboardingCompletedAt,
    });
    
    // Récupérer l'utilisateur créé avec tous les champs
    const fullUser = await userRepo.findById(createdUser.id);
    if (!fullUser) {
      throw new Error('Erreur lors de la création de l\'utilisateur');
    }
    return fullUser;
  }

  /**
   * Créer le profil acheteur
   */
  async createBuyerProfile(userId: string, input: CreateBuyerProfileInput): Promise<BuyerProfile> {
    const db = await this.getDb();
    const userRepo = new UserRepository(db);

    const user = await userRepo.findById(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const buyerProfile: BuyerProfile = {
      isActive: true,
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

    // Mettre à jour l'utilisateur
    const updatedRoles = {
      ...user.roles,
      buyer: buyerProfile,
    };

    // Synchroniser les informations de base : s'assurer que nom, prénom, email, téléphone, photo
    // sont préservés (ils sont déjà au niveau utilisateur, donc partagés entre tous les profils)
    // Pas besoin de les mettre à jour ici car ils sont déjà synchronisés au niveau User
    await userRepo.update(userId, {
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
    const db = await this.getDb();
    const userRepo = new UserRepository(db);

    const user = await userRepo.findById(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const veterinarianProfile: VeterinarianProfile = {
      isActive: true,
      activatedAt: new Date().toISOString(),
      validationStatus: 'pending',
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

    // Mettre à jour l'utilisateur
    const updatedRoles = {
      ...user.roles,
      veterinarian: veterinarianProfile,
    };

    // Synchroniser les informations de base : s'assurer que nom, prénom, email, téléphone, photo
    // sont préservés (ils sont déjà au niveau utilisateur, donc partagés entre tous les profils)
    // Pas besoin de les mettre à jour ici car ils sont déjà synchronisés au niveau User
    await userRepo.update(userId, {
      roles: updatedRoles,
      activeRole: user.activeRole || 'veterinarian',
    });

    // Créer la demande de validation
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
    const db = await this.getDb();
    const userRepo = new UserRepository(db);

    const user = await userRepo.findById(userId);
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

    // Mettre à jour l'utilisateur
    const updatedRoles = {
      ...user.roles,
      technician: technicianProfile,
    };

    // Synchroniser les informations de base : s'assurer que nom, prénom, email, téléphone, photo
    // sont préservés (ils sont déjà au niveau utilisateur, donc partagés entre tous les profils)
    // Pas besoin de les mettre à jour ici car ils sont déjà synchronisés au niveau User
    await userRepo.update(userId, {
      roles: updatedRoles,
      activeRole: user.activeRole || 'technician',
    });

    return technicianProfile;
  }

  /**
   * Marquer l'onboarding comme terminé
   */
  async completeOnboarding(userId: string, profileType: 'producer' | 'buyer' | 'veterinarian' | 'technician'): Promise<void> {
    const db = await this.getDb();
    const userRepo = new UserRepository(db);

    await userRepo.update(userId, {
      isOnboarded: true,
      onboardingCompletedAt: new Date().toISOString(),
      activeRole: profileType,
    });
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
    // TODO: Créer une entrée dans une table de validation
    // Pour l'instant, on retourne un ID fictif
    const validationRequestId = `validation-${userId}-${Date.now()}`;
    
    // TODO: Stocker la demande dans la base de données
    // await db.validationRequests.create({
    //   id: validationRequestId,
    //   userId,
    //   profileType,
    //   documents,
    //   status: 'pending',
    //   submittedAt: new Date().toISOString(),
    // });

    return validationRequestId;
  }

  /**
   * Upload un document (image ou PDF)
   */
  async uploadDocument(file: { uri: string; name?: string; type?: string }): Promise<string> {
    // TODO: Implémenter l'upload vers un service de stockage (S3, Firebase Storage, etc.)
    // Pour l'instant, on retourne l'URI locale
    // Dans une vraie implémentation, on devrait :
    // 1. Lire le fichier depuis l'URI
    // 2. L'uploader vers le service de stockage
    // 3. Retourner l'URL publique

    // Simulation : on retourne l'URI pour le développement
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
    const db = await this.getDb();
    const userRepo = new UserRepository(db);

    const user = await userRepo.findById(userId);
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

    await userRepo.update(userId, {
      roles: updatedRoles,
    });

    // TODO: Notifier l'utilisateur du résultat de la validation
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

