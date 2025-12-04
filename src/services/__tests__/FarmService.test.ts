/**
 * Tests pour FarmService
 */

import FarmService from '../FarmService';
import { getDatabase } from '../database';
import { ProjetRepository } from '../../database/repositories/ProjetRepository';
import { UserRepository } from '../../database/repositories/UserRepository';
import { CollaborateurRepository } from '../../database/repositories/CollaborateurRepository';
import { getServiceProposalNotificationService } from '../ServiceProposalNotificationService';

// Mock dependencies
jest.mock('../database');
jest.mock('../../database/repositories/ProjetRepository');
jest.mock('../../database/repositories/UserRepository');
jest.mock('../../database/repositories/CollaborateurRepository');
jest.mock('../ServiceProposalNotificationService');

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockGetServiceProposalNotificationService = getServiceProposalNotificationService as jest.MockedFunction<typeof getServiceProposalNotificationService>;

describe('FarmService', () => {
  let service: FarmService;
  let mockDb: any;
  let mockProjetRepo: jest.Mocked<ProjetRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockCollaborateurRepo: jest.Mocked<CollaborateurRepository>;
  let mockNotificationService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };

    mockProjetRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
    } as any;

    mockUserRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as any;

    mockCollaborateurRepo = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      findByProjet: jest.fn(),
      update: jest.fn(),
    } as any;

    mockNotificationService = {
      createNotification: jest.fn(),
      notifyProducerOfProposal: jest.fn(),
      notifyVetOfAcceptance: jest.fn(),
      notifyVetOfRejection: jest.fn(),
    };

    mockGetDatabase.mockResolvedValue(mockDb);
    (ProjetRepository as jest.Mock).mockImplementation(() => mockProjetRepo);
    (UserRepository as jest.Mock).mockImplementation(() => mockUserRepo);
    (CollaborateurRepository as jest.Mock).mockImplementation(() => mockCollaborateurRepo);
    mockGetServiceProposalNotificationService.mockReturnValue(mockNotificationService);

    service = new FarmService();
  });

  describe('getFarmsNearLocation', () => {
    it('devrait retourner les fermes dans un rayon donné', async () => {
      const mockProjects = [
        {
          id: '1',
          nom: 'Ferme 1',
          ville: 'City1',
          region: 'Region1',
          latitude: 10.0,
          longitude: 20.0,
          capacite_animaux: 100,
          type_elevage: 'Intensif',
          proprietaire_id: 'user-1',
        },
        {
          id: '2',
          nom: 'Ferme 2',
          ville: 'City2',
          region: 'Region2',
          latitude: 10.1,
          longitude: 20.1,
          capacite_animaux: 200,
          type_elevage: 'Extensif',
          proprietaire_id: 'user-2',
        },
      ] as any;

      const mockUsers = [
        { id: 'user-1', prenom: 'John', nom: 'Doe' },
        { id: 'user-2', prenom: 'Jane', nom: 'Smith' },
      ] as any;

      mockProjetRepo.findAll.mockResolvedValue(mockProjects);
      mockUserRepo.findById.mockImplementation((id: string) => {
        return Promise.resolve(mockUsers.find((u: any) => u.id === id) || null);
      });

      const result = await service.getFarmsNearLocation(10.0, 20.0, 50);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Ferme 1');
      expect(result[0].producer.name).toBe('John Doe');
    });

    it('devrait filtrer les fermes hors du rayon', async () => {
      const mockProjects = [
        {
          id: '1',
          nom: 'Ferme Proche',
          latitude: 10.0,
          longitude: 20.0,
          proprietaire_id: 'user-1',
        },
        {
          id: '2',
          nom: 'Ferme Loin',
          latitude: 50.0,
          longitude: 50.0,
          proprietaire_id: 'user-2',
        },
      ] as any;

      mockProjetRepo.findAll.mockResolvedValue(mockProjects);
      mockUserRepo.findById.mockResolvedValue({ id: 'user-1', prenom: 'John', nom: 'Doe' } as any);

      const result = await service.getFarmsNearLocation(10.0, 20.0, 10);

      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('devrait retourner un tableau vide si aucune ferme', async () => {
      mockProjetRepo.findAll.mockResolvedValue([]);

      const result = await service.getFarmsNearLocation(10.0, 20.0, 50);

      expect(result).toEqual([]);
    });
  });

  describe('proposeServiceToFarm', () => {
    it('devrait créer une proposition de service', async () => {
      const mockVet = {
        id: 'vet-1',
        roles: {
          veterinarian: {
            validationStatus: 'approved',
            serviceProposals: [],
          },
        },
      } as any;

      const mockFarm = {
        id: 'farm-1',
        user_id: 'producer-1',
      } as any;

      mockUserRepo.findById.mockResolvedValueOnce(mockVet).mockResolvedValueOnce({ id: 'producer-1' } as any);
      mockProjetRepo.findById.mockResolvedValue(mockFarm);
      mockNotificationService.notifyProducerOfProposal.mockResolvedValue(undefined);

      const result = await service.proposeServiceToFarm('vet-1', 'farm-1', 'Message test');

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('devrait lancer une erreur si vétérinaire non trouvé', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.proposeServiceToFarm('vet-1', 'farm-1', 'Message')).rejects.toThrow('Vétérinaire non trouvé');
    });

    it('devrait lancer une erreur si profil non validé', async () => {
      const mockVet = {
        id: 'vet-1',
        roles: {
          veterinarian: {
            validationStatus: 'pending',
          },
        },
      } as any;

      mockUserRepo.findById.mockResolvedValue(mockVet);

      await expect(service.proposeServiceToFarm('vet-1', 'farm-1', 'Message')).rejects.toThrow('profil doit être validé');
    });
  });

  describe('respondToServiceProposal', () => {
    it('devrait accepter une proposition de service', async () => {
      const mockVet = {
        id: 'vet-1',
        roles: {
          veterinarian: {
            serviceProposals: [
              { farmId: 'farm-1', status: 'pending' },
            ],
            clients: [],
          },
        },
      } as any;

      const mockFarm = {
        id: 'farm-1',
        nom: 'Test Farm',
        user_id: 'producer-1',
      } as any;

      mockUserRepo.findById.mockResolvedValueOnce(mockVet).mockResolvedValueOnce({ id: 'producer-1' } as any);
      mockProjetRepo.findById.mockResolvedValue(mockFarm);
      mockCollaborateurRepo.findByProjet = jest.fn().mockResolvedValue([]);
      mockCollaborateurRepo.create.mockResolvedValue({
        id: 'collab-1',
        user_id: 'vet-1',
        projet_id: 'farm-1',
        statut: 'actif',
      } as any);

      await service.respondToServiceProposal('proposal-1', 'farm-1', 'vet-1', 'accepted');

      expect(mockCollaborateurRepo.create).toHaveBeenCalled();
    });

    it('devrait refuser une proposition de service', async () => {
      const mockVet = {
        id: 'vet-1',
        roles: {
          veterinarian: {
            serviceProposals: [
              { farmId: 'farm-1', status: 'pending' },
            ],
            clients: [],
          },
        },
      } as any;

      const mockFarm = {
        id: 'farm-1',
        nom: 'Test Farm',
        user_id: 'producer-1',
      } as any;

      mockUserRepo.findById.mockResolvedValueOnce(mockVet).mockResolvedValueOnce({ id: 'producer-1' } as any);
      mockProjetRepo.findById.mockResolvedValue(mockFarm);

      await service.respondToServiceProposal('proposal-1', 'farm-1', 'vet-1', 'rejected');

      expect(mockCollaborateurRepo.create).not.toHaveBeenCalled();
    });

    it('devrait lancer une erreur si données introuvables', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(
        service.respondToServiceProposal('proposal-1', 'farm-1', 'vet-1', 'accepted')
      ).rejects.toThrow('Données introuvables');
    });
  });

  describe('calculateDistance', () => {
    it('devrait calculer la distance entre deux points', () => {
      const distance = (service as any).calculateDistance(10.0, 20.0, 10.1, 20.1);

      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    });

    it('devrait retourner 0 pour le même point', () => {
      const distance = (service as any).calculateDistance(10.0, 20.0, 10.0, 20.0);

      expect(distance).toBe(0);
    });
  });
});

