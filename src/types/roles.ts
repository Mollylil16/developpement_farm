/**
 * Types pour le système multi-rôles
 * Extension non-destructive de l'architecture existante
 */

/**
 * Types de rôles disponibles dans l'application
 */
export type RoleType = 'producer' | 'buyer' | 'veterinarian' | 'technician';

/**
 * Use Role.X instead of raw strings to avoid silent typo bugs.
 * Values match the RoleType union — this is the single source of truth.
 */
export const Role = {
  PRODUCER: 'producer',
  BUYER: 'buyer',
  VETERINARIAN: 'veterinarian',
  TECHNICIAN: 'technician',
} as const satisfies Record<string, RoleType>;

/**
 * Statut de validation d'un profil
 */
export type ProfileStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

/**
 * Profil Producteur
 */
export interface ProducerProfile {
  isActive: boolean;
  activatedAt: string; // ISO date string

  // Données de la ferme
  farmName: string;
  farmType: 'individual' | 'cooperative' | 'company';
  registrationNumber?: string;

  // Capacité
  capacity: {
    totalCapacity: number;
    currentOccupancy: number;
  };

  // Statistiques
  stats: {
    totalSales: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
  };

  // Paramètres marketplace
  marketplaceSettings: {
    defaultPricePerKg: number;
    autoAcceptOffers: boolean;
    minimumOfferPercentage: number;
    notificationsEnabled: boolean;
  };
}

/**
 * Profil Acheteur
 */
export interface BuyerProfile {
  isActive: boolean;
  activatedAt: string; // ISO date string

  buyerType: 'individual' | 'restaurant' | 'butcher' | 'wholesaler' | 'retailer';
  businessName?: string;

  // 🆕 Informations commerciales (complément)
  businessInfo?: {
    companyName: string;
    contactPhone: string;
    businessRegistration?: string;
    taxId?: string;
    address?: string;
  };

  // Historique d'achats
  purchaseHistory: {
    totalPurchases: number;
    totalSpent: number;
    averageOrderValue: number;
    preferredRaces?: string[];
  };

  // Préférences
  preferences: {
    preferredWeightRange: { min: number; max: number };
    maxDistance: number; // en km
    notifyNewListings: boolean;
    notifyPriceDrops?: boolean;
  };

  // Notation
  rating?: {
    asReviewer: number;
    totalReviewsGiven: number;
  };

  // Paiement
  paymentMethods?: {
    type: 'cash' | 'mobile_money' | 'bank_transfer' | 'check';
    details?: unknown;
  }[];
}

/**
 * Profil Vétérinaire
 */
export interface VeterinarianProfile {
  isActive: boolean;
  activatedAt: string; // ISO date string

  // 🆕 Statut de validation
  validationStatus?: ProfileStatus;
  submittedAt?: string; // ISO date string
  validatedAt?: string; // ISO date string
  validatedBy?: string; // Admin ID
  rejectionReason?: string;

  // Qualifications
  qualifications: {
    degree: string;
    university?: string;
    graduationYear?: number;
    licenseNumber: string;
    licenseIssuedBy?: string;
    licenseValidUntil: string; // ISO date string

    // 🆕 Documents obligatoires
    documents?: {
      identityCard: {
        url: string;
        uploadedAt: string; // ISO date string
        verified: boolean;
      };
      professionalProof: {
        url: string; // Diplôme, licence, etc.
        uploadedAt: string; // ISO date string
        verified: boolean;
      };
    };
  };

  // 🆕 Lieu de fonction
  workLocation?: {
    address: string;
    city: string;
    region: string;
    latitude: number;
    longitude: number;
    serviceRadius: number; // En km (défaut: 50)
  };

  specializations: string[];

  // 🆕 Expérience
  experience?: {
    yearsOfPractice: number;
    previousPositions?: {
      position: string;
      organization: string;
      from: string; // ISO date string
      to?: string; // ISO date string
    }[];
  };

  // 🆕 Propositions de service
  serviceProposals?: {
    farmId: string;
    farmName: string;
    status: 'pending' | 'accepted' | 'rejected';
    proposedAt: string; // ISO date string
    respondedAt?: string; // ISO date string
    message?: string;
  }[];

  // Clients (fermes)
  clients: {
    farmId: string;
    farmName: string;
    since: string; // ISO date string
    status?: 'active' | 'inactive';
    contractType?: 'permanent' | 'consultation' | 'emergency';
  }[];

  // Statistiques
  stats: {
    totalConsultations: number;
    totalVaccinations: number;
    totalTreatments?: number;
    averageResponseTime?: number;
    averageRating?: number;
    totalReviews?: number;
  };

  // 🆕 Disponibilité
  availability?: {
    workingHours: {
      [day: string]: { start: string; end: string } | null;
    };
    emergencyAvailable: boolean;
  };

  // 🆕 Tarifs
  fees?: {
    consultation: number;
    vaccination: number;
    emergency: number;
    travel: number;
  };
}

/**
 * Permissions du technicien pour une ferme
 */
export interface TechnicianPermissions {
  canViewHerd: boolean;
  canEditHerd: boolean;
  canAddAnimals: boolean;
  canViewHealthRecords: boolean;
  canEditHealthRecords: boolean;
  canViewFinances: boolean;
  canEditFinances: boolean;
}

/**
 * Profil Technicien
 */
export interface TechnicianProfile {
  isActive: boolean;
  activatedAt: string; // ISO date string

  // Qualifications
  qualifications: {
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  };

  skills: string[];

  // Fermes assistées
  assistedFarms: {
    farmId: string;
    farmName: string;
    permissions: TechnicianPermissions;
    since: string; // ISO date string
  }[];
}

/**
 * Tous les profils de rôles d'un utilisateur
 */
export interface UserRoles {
  producer?: ProducerProfile;
  buyer?: BuyerProfile;
  veterinarian?: VeterinarianProfile;
  technician?: TechnicianProfile;
}

/**
 * Localisation de l'utilisateur
 */
export interface UserLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  region: string;
}

/**
 * Préférences utilisateur (communes à tous les rôles)
 */
export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    enabled: boolean;
    email: boolean;
    push: boolean;
  };
}
