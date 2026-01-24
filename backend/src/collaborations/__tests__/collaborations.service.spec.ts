/**
 * Tests unitaires pour CollaborationsService
 * Priorité 1 : Tests critiques pour permissions et gestion collaborateurs
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CollaborationsService } from '../collaborations.service';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateCollaborateurDto } from '../dto/create-collaborateur.dto';
import { UpdateCollaborateurDto } from '../dto/update-collaborateur.dto';

describe('CollaborationsService', () => {
  let service: CollaborationsService;
  let databaseService: jest.Mocked<DatabaseService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockProjet = {
    id: 'projet_123',
    proprietaire_id: 'owner_123',
    nom: 'Ferme Test',
  };

  const mockCollaborateur = {
    id: 'collab_123',
    projet_id: 'projet_123',
    user_id: 'user_123',
    nom: 'Doe',
    prenom: 'John',
    email: 'john.doe@example.com',
    telephone: '+2250712345678',
    role: 'veterinarian',
    statut: 'active',
    permission_reproduction: true,
    permission_nutrition: true,
    permission_finance: false,
    permission_rapports: true,
    permission_planification: false,
    permission_mortalites: true,
    permission_sante: true,
    date_creation: new Date().toISOString(),
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      query: jest.fn(),
      transaction: jest.fn(),
    };

    const mockNotificationsService = {
      createNotification: jest.fn(),
      notifyCollaborationInvitation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationsService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<CollaborationsService>(CollaborationsService);
    databaseService = module.get(DatabaseService);
    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('devrait créer un collaborateur avec succès', async () => {
      // Arrange
      const createDto: CreateCollaborateurDto = {
        projet_id: 'projet_123',
        nom: 'Doe',
        prenom: 'John',
        email: 'john.doe@example.com',
        role: 'veterinarian',
        permissions: {
          reproduction: true,
          nutrition: true,
          finance: false,
          rapports: true,
          planification: false,
          mortalites: true,
          sante: true,
        },
      };

      const userId = 'owner_123';

      // Le service fait plusieurs requêtes dans create :
      // 1. checkProjetOwnership
      // 2. validateUserId (si user_id fourni)
      // 3. checkDuplicateCollaborateur
      // 4. checkCollaborateurLimit
      // 5. INSERT avec transaction
      databaseService.query
        .mockResolvedValueOnce({ rows: [mockProjet] }) // checkProjetOwnership
        .mockResolvedValueOnce({ rows: [] }) // checkDuplicateCollaborateur
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // checkCollaborateurLimit
        .mockResolvedValueOnce({ rows: [mockCollaborateur] }); // INSERT

      // Mock transaction pour create
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [mockCollaborateur] }),
      };
      (databaseService.transaction as any) = jest.fn(async (callback: any) => {
        return callback(mockClient);
      });

      // Act
      const result = await service.create(createDto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.nom).toBe('Doe');
      expect(result.role).toBe('veterinarian');
    });

    it('devrait lancer ForbiddenException si le projet n\'appartient pas à l\'utilisateur', async () => {
      // Arrange
      const createDto: CreateCollaborateurDto = {
        projet_id: 'projet_123',
        nom: 'Doe',
        prenom: 'John',
        email: 'john.doe@example.com',
        role: 'veterinarian',
        permissions: {
          reproduction: true,
          nutrition: true,
          finance: false,
          rapports: true,
          planification: false,
          mortalites: true,
          sante: true,
        },
      };

      const userId = 'other_user';

      databaseService.query.mockResolvedValueOnce({
        rows: [{ ...mockProjet, proprietaire_id: 'owner_123' }],
      });

      // Act & Assert
      try {
        await service.create(createDto, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('devrait lancer ConflictException si le collaborateur existe déjà', async () => {
      // Arrange
      const createDto: CreateCollaborateurDto = {
        projet_id: 'projet_123',
        nom: 'Doe',
        prenom: 'John',
        email: 'john.doe@example.com',
        role: 'veterinarian',
        permissions: {
          reproduction: true,
          nutrition: true,
          finance: false,
          rapports: true,
          planification: false,
          mortalites: true,
          sante: true,
        },
      };

      const userId = 'owner_123';

      databaseService.query
        .mockResolvedValueOnce({ rows: [mockProjet] }) // checkProjetOwnership
        .mockResolvedValueOnce({ rows: [{ id: 'existing_collab' }] }); // checkDuplicateCollaborateur

      // Act & Assert
      try {
        await service.create(createDto, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
      }
    });

    it('devrait lancer BadRequestException si la limite de collaborateurs est atteinte', async () => {
      // Arrange
      const createDto: CreateCollaborateurDto = {
        projet_id: 'projet_123',
        nom: 'Doe',
        prenom: 'John',
        email: 'john.doe@example.com',
        role: 'veterinarian',
        permissions: {
          reproduction: true,
          nutrition: true,
          finance: false,
          rapports: true,
          planification: false,
          mortalites: true,
          sante: true,
        },
      };

      const userId = 'owner_123';

      // create fait plusieurs requêtes :
      // 1. checkProjetOwnership
      // 2. checkDuplicateCollaborateur
      // 3. checkCollaborateurLimit
      // 4. INSERT (dans transaction)
      // 5. logCollaborationAction
      // 6. SELECT projets (pour notification)
      databaseService.query
        .mockResolvedValueOnce({ rows: [mockProjet] }) // checkProjetOwnership
        .mockResolvedValueOnce({ rows: [] }) // checkDuplicateCollaborateur
        .mockResolvedValueOnce({ rows: [{ count: '50' }] }); // checkCollaborateurLimit (limite atteinte)

      // Act & Assert
      try {
        await service.create(createDto, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Limite');
      }
    });
  });

  describe('findOne', () => {
    it('devrait retourner un collaborateur existant', async () => {
      // Arrange
      const collabId = 'collab_123';
      const userId = 'owner_123';

      // findOne fait une jointure avec projets et vérifie proprietaire_id
      databaseService.query.mockResolvedValueOnce({
        rows: [{ ...mockCollaborateur, proprietaire_id: userId }],
      });

      // Act
      const result = await service.findOne(collabId, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(collabId);
      expect(result?.permissions).toBeDefined();
    });

    it('devrait retourner null si le collaborateur n\'existe pas', async () => {
      // Arrange
      const collabId = 'collab_inexistant';
      const userId = 'owner_123';

      databaseService.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await service.findOne(collabId, userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('devrait mettre à jour un collaborateur avec succès', async () => {
      // Arrange
      const collabId = 'collab_123';
      const updateDto: UpdateCollaborateurDto = {
        nom: 'Doe Updated',
        permissions: {
          reproduction: false,
          nutrition: true,
          finance: true,
          rapports: true,
          planification: true,
          mortalites: true,
          sante: true,
        },
      };

      const userId = 'owner_123';

      // update appelle findOne qui fait une jointure avec projets
      // Puis UPDATE directement (pas de transaction)
      // Puis logCollaborationAction si permissions changées
      const updatedRow = {
        ...mockCollaborateur,
        nom: 'Doe Updated',
        permission_reproduction: false,
        permission_finance: true,
      };
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ ...mockCollaborateur, proprietaire_id: userId }] }) // findOne (jointure)
        .mockResolvedValueOnce({ rows: [updatedRow] }) // UPDATE
        .mockResolvedValueOnce({ rowCount: 1 }); // logCollaborationAction (permissions changées)

      // Act
      const result = await service.update(collabId, updateDto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.nom).toBe('Doe Updated');
      expect(result.permissions.reproduction).toBe(false);
      expect(result.permissions.finance).toBe(true);
    });

    it('devrait lancer ForbiddenException si l\'utilisateur n\'est pas propriétaire', async () => {
      // Arrange
      const collabId = 'collab_123';
      const updateDto: UpdateCollaborateurDto = {
        nom: 'Doe Updated',
      };

      const userId = 'other_user';

      // findOne fait une jointure et vérifie proprietaire_id
      databaseService.query.mockResolvedValueOnce({
        rows: [{ ...mockCollaborateur, proprietaire_id: 'owner_123' }],
      });

      // Act & Assert
      try {
        await service.update(collabId, updateDto, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('delete', () => {
    it('devrait supprimer un collaborateur avec succès', async () => {
      // Arrange
      const collabId = 'collab_123';
      const userId = 'owner_123';

      // delete appelle findOne (qui fait une jointure) puis DELETE
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ ...mockCollaborateur, proprietaire_id: userId }] }) // findOne (jointure)
        .mockResolvedValueOnce({ rowCount: 1 }) // logCollaborationAction
        .mockResolvedValueOnce({ rowCount: 1 }); // DELETE

      // Act
      await service.delete(collabId, userId);

      // Assert
      const deleteCall = databaseService.query.mock.calls.find(
        (call) => call[0].includes('DELETE FROM collaborations')
      );
      expect(deleteCall).toBeDefined();
    });

    it('devrait lancer NotFoundException si le collaborateur n\'existe pas', async () => {
      // Arrange
      const collabId = 'collab_inexistant';
      const userId = 'owner_123';

      // findOne retourne null si pas trouvé
      databaseService.query.mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      try {
        await service.delete(collabId, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('accepterInvitation', () => {
    it('devrait accepter une invitation avec succès', async () => {
      // Arrange
      const collabId = 'collab_123';
      const userId = 'user_123';

      const pendingCollaborateur = {
        ...mockCollaborateur,
        statut: 'en_attente',
        date_invitation: new Date().toISOString(),
        expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // accepterInvitation fait plusieurs requêtes :
      // 1. SELECT users (email, telephone)
      // 2. SELECT collaborations (invitation)
      // 3. UPDATE collaborations
      // 4. logCollaborationAction
      // 5. SELECT projets (pour notification)
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ email: 'john.doe@example.com', telephone: '+2250712345678' }] }) // SELECT users
        .mockResolvedValueOnce({ rows: [pendingCollaborateur] }) // SELECT collaborations
        .mockResolvedValueOnce({ rows: [{ ...pendingCollaborateur, statut: 'actif', user_id: userId }] }) // UPDATE
        .mockResolvedValueOnce({ rowCount: 1 }) // logCollaborationAction
        .mockResolvedValueOnce({ rows: [{ proprietaire_id: 'owner_123', nom: 'Ferme Test' }] }); // SELECT projets

      // Act
      const result = await service.accepterInvitation(collabId, userId);

      // Assert
      expect(result).toBeDefined();
      expect((result as any).statut).toBe('actif');
      expect((result as any).user_id).toBe(userId);
    });

    it('devrait lancer BadRequestException si l\'invitation est déjà acceptée', async () => {
      // Arrange
      const collabId = 'collab_123';
      const userId = 'user_123';

      databaseService.query
        .mockResolvedValueOnce({ rows: [{ email: 'john.doe@example.com', telephone: '+2250712345678' }] }) // SELECT users
        .mockResolvedValueOnce({ rows: [{ ...mockCollaborateur, statut: 'actif' }] }); // SELECT collaborations

      // Act & Assert
      try {
        await service.accepterInvitation(collabId, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe('rejeterInvitation', () => {
    it('devrait rejeter une invitation avec succès', async () => {
      // Arrange
      const collabId = 'collab_123';
      const userId = 'user_123';
      const reason = 'Pas intéressé';

      const pendingCollaborateur = {
        ...mockCollaborateur,
        statut: 'en_attente',
        date_invitation: new Date().toISOString(),
      };

      // rejeterInvitation fait :
      // 1. SELECT users (email, telephone)
      // 2. SELECT collaborations
      // 3. UPDATE collaborations
      // 4. logCollaborationAction
      // 5. SELECT projets (pour notification)
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ email: 'john.doe@example.com', telephone: '+2250712345678' }] }) // SELECT users
        .mockResolvedValueOnce({ rows: [pendingCollaborateur] }) // SELECT collaborations
        .mockResolvedValueOnce({
          rows: [{ ...pendingCollaborateur, statut: 'rejete', rejection_reason: reason }],
        }) // UPDATE
        .mockResolvedValueOnce({ rowCount: 1 }) // logCollaborationAction
        .mockResolvedValueOnce({ rows: [{ proprietaire_id: 'owner_123', nom: 'Ferme Test' }] }); // SELECT projets (pour notification)

      // Act
      const result = await service.rejeterInvitation(collabId, userId, reason);

      // Assert
      expect(result).toBeDefined();
      expect((result as any).statut).toBe('rejete');
      expect((result as any).rejection_reason).toBe(reason);
    });
  });

  describe('findCollaborateurActuel', () => {
    it('devrait retourner le collaborateur actuel pour un utilisateur et projet', async () => {
      // Arrange
      const userId = 'user_123';
      const projetId = 'projet_123';

      databaseService.query.mockResolvedValueOnce({
        rows: [{ ...mockCollaborateur, statut: 'active' }],
      });

      // Act
      const result = await service.findCollaborateurActuel(userId, projetId);

      // Assert
      expect(result).toBeDefined();
      expect(result.user_id).toBe(userId);
      expect(result.projet_id).toBe(projetId);
      expect(result.statut).toBe('active');
    });

    it('devrait retourner null si aucun collaborateur actif n\'existe', async () => {
      // Arrange
      const userId = 'user_123';
      const projetId = 'projet_123';

      databaseService.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await service.findCollaborateurActuel(userId, projetId);

      // Assert
      expect(result).toBeNull();
    });
  });
});
