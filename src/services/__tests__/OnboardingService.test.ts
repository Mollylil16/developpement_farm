/**
 * Tests pour OnboardingService
 */

import OnboardingService, { getOnboardingService } from '../OnboardingService';
import { getDatabase } from '../database';
import { UserRepository } from '../../database/repositories/UserRepository';
import { ProjetRepository } from '../../database/repositories/ProjetRepository';

// Mock des dépendances
jest.mock('../database');
jest.mock('../../database/repositories/UserRepository');
jest.mock('../../database/repositories/ProjetRepository');

const mockGetDatabase = getDatabase as jest.Mock;
const mockUserRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  findByEmail: jest.fn(),
  findByTelephone: jest.fn(),
};
const mockProjetRepository = {
  findByProprietaireId: jest.fn(),
};

describe('OnboardingService', () => {
  let service: OnboardingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockDb = {
      runAsync: jest.fn(),
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
    };
    mockGetDatabase.mockResolvedValue(mockDb as any);
    mockUserRepository.findByEmail = jest.fn().mockResolvedValue(null);
    mockUserRepository.findByTelephone = jest.fn().mockResolvedValue(null);
    (UserRepository as jest.Mock).mockImplementation(() => mockUserRepository);
    (ProjetRepository as jest.Mock).mockImplementation(
      () => mockProjetRepository
    );
    service = await getOnboardingService();
  });

  describe('createUser', () => {
    it('devrait créer un utilisateur avec les données fournies', async () => {
      const userInput = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        profileType: 'producer' as const,
      };

      const mockUser = {
        id: 'user-1',
        ...userInput,
        roles: { producer: {} },
        activeRole: 'producer',
      };

      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await service.createUser(userInput);

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userInput.email,
          prenom: userInput.firstName,
          nom: userInput.lastName,
          telephone: userInput.phone,
        })
      );
      expect(result).toEqual(mockUser);
    });

    it('devrait gérer les erreurs lors de la création', async () => {
      const userInput = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        profileType: 'producer' as const,
      };

      const error = new Error('Erreur de création');
      mockUserRepository.create.mockRejectedValue(error);

      await expect(service.createUser(userInput)).rejects.toThrow('Erreur de création');
    });
  });

  describe('createBuyerProfile', () => {
    it('devrait créer un profil acheteur', async () => {
      const userId = 'user-1';
      const buyerInput = {
        buyerType: 'restaurant' as const,
        businessInfo: {
          companyName: 'Restaurant Test',
          contactPhone: '+1234567890',
          address: '123 Test St',
        },
      };

      const mockUser = {
        id: userId,
        roles: {},
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({
        ...mockUser,
        roles: {
          buyer: {
            buyerType: buyerInput.buyerType,
            businessInfo: buyerInput.businessInfo,
          },
        },
      });

      const result = await service.createBuyerProfile(userId, buyerInput);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalled();
      expect(result.roles.buyer).toBeDefined();
      expect(result.roles.buyer?.buyerType).toBe(buyerInput.buyerType);
    });
  });

  describe('createVeterinarianProfile', () => {
    it('devrait créer un profil vétérinaire avec validation pending', async () => {
      const userId = 'user-1';
      const vetInput = {
        qualifications: {
          degree: 'DVM',
          university: 'Test University',
          graduationYear: 2020,
          licenseNumber: 'VET-123',
          licenseIssuedBy: 'Test Board',
          licenseValidUntil: '2025-12-31',
          documents: {
            identityCard: {
              url: 'https://example.com/id.jpg',
              uploadedAt: '2024-01-01',
              verified: false,
            },
            professionalProof: {
              url: 'https://example.com/proof.jpg',
              uploadedAt: '2024-01-01',
              verified: false,
            },
          },
        },
        workLocation: {
          address: '123 Vet St',
          city: 'Test City',
          country: 'Test Country',
          coordinates: { latitude: 0, longitude: 0 },
        },
        serviceRadius: 50,
        experience: 5,
        serviceProposals: [],
        clients: [],
        stats: {
          totalConsultations: 0,
          totalClients: 0,
          averageRating: 0,
        },
        availability: {
          monday: { start: '09:00', end: '17:00', available: true },
        },
        fees: {
          consultation: 10000,
          emergency: 20000,
        },
      };

      const mockUser = {
        id: userId,
        roles: {},
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({
        ...mockUser,
        roles: {
          veterinarian: {
            ...vetInput,
            validationStatus: 'pending',
            submittedAt: expect.any(String),
          },
        },
      });

      const result = await service.createVeterinarianProfile(userId, vetInput);

      expect(result.roles.veterinarian).toBeDefined();
      expect(result.roles.veterinarian?.validationStatus).toBe('pending');
    });
  });

  describe('completeOnboarding', () => {
    it('devrait marquer l\'utilisateur comme onboarded', async () => {
      const userId = 'user-1';
      const mockUser = {
        id: userId,
        isOnboarded: false,
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({
        ...mockUser,
        isOnboarded: true,
        onboardingCompletedAt: expect.any(String),
      });

      const result = await service.completeOnboarding(userId);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          is_onboarded: true,
          onboarding_completed_at: expect.any(String),
        })
      );
      expect(result.isOnboarded).toBe(true);
    });
  });

  describe('uploadDocument', () => {
    it('devrait retourner une URL de document mockée', async () => {
      const userId = 'user-1';
      const documentType = 'identityCard';
      const fileUri = 'file://test.jpg';

      const result = await service.uploadDocument(userId, documentType, fileUri);

      expect(result).toMatchObject({
        url: expect.stringContaining('http'),
        uploadedAt: expect.any(String),
        verified: false,
      });
    });
  });
});

