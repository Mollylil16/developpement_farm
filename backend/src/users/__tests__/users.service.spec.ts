/**
 * Tests unitaires pour UsersService
 * Priorité 1 : Tests critiques pour gestion utilisateurs
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { DatabaseService } from '../../database/database.service';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let databaseService: jest.Mocked<DatabaseService>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;

  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    telephone: '+2250712345678',
    nom: 'Doe',
    prenom: 'John',
    provider: 'email',
    photo: 'https://example.com/photo.jpg',
    date_creation: new Date().toISOString(),
    is_active: true,
    roles: ['producer'],
    active_role: 'producer',
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      query: jest.fn(),
    };

    const mockCloudinaryService = {
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    databaseService = module.get(DatabaseService);
    cloudinaryService = module.get(CloudinaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('devrait créer un utilisateur avec email avec succès', async () => {
      // Arrange
      const createDto = {
        email: 'test@example.com',
        nom: 'Doe',
        prenom: 'John',
        password_hash: 'hashed_password',
      };

      databaseService.query
        .mockResolvedValueOnce({ rows: [] }) // findByEmail (pas de doublon)
        .mockResolvedValueOnce({ rows: [mockUser] }); // INSERT

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.nom).toBe('Doe');
      expect(databaseService.query).toHaveBeenCalledTimes(2);
    });

    it('devrait créer un utilisateur avec téléphone avec succès', async () => {
      // Arrange
      const createDto = {
        telephone: '+225 07 12 34 56 78',
        nom: 'Doe',
        prenom: 'John',
      };

      // Le service fait findByTelephone qui peut faire 2 requêtes si le téléphone commence par +
      databaseService.query
        .mockResolvedValueOnce({ rows: [] }) // findByTelephone (première tentative avec +)
        .mockResolvedValueOnce({ rows: [] }) // findByTelephone (seconde tentative sans + si nécessaire)
        .mockResolvedValueOnce({ rows: [{ ...mockUser, telephone: '+2250712345678', provider: 'telephone' }] }); // INSERT

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.telephone).toBe('+2250712345678'); // Normalisé
      expect(result.provider).toBe('telephone');
    });

    it('devrait lancer une erreur si email et téléphone sont absents', async () => {
      // Arrange
      const createDto = {
        nom: 'Doe',
        prenom: 'John',
      };

      // Act & Assert
      try {
        await service.create(createDto);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('Email ou numéro de téléphone requis');
      }
    });

    it('devrait lancer une erreur si l\'email existe déjà', async () => {
      // Arrange
      const createDto = {
        email: 'test@example.com',
        nom: 'Doe',
        prenom: 'John',
      };

      databaseService.query.mockResolvedValueOnce({ rows: [mockUser] }); // findByEmail (doublon)

      // Act & Assert
      try {
        await service.create(createDto);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('compte existe déjà');
      }
    });
  });

  describe('findByEmail', () => {
    it('devrait retourner un utilisateur par email', async () => {
      // Arrange
      const email = 'test@example.com';

      databaseService.query.mockResolvedValueOnce({ rows: [mockUser] });

      // Act
      const result = await service.findByEmail(email);

      // Assert
      expect(result).toBeDefined();
      expect(result?.email).toBe(email);
    });

    it('devrait retourner null si l\'utilisateur n\'existe pas', async () => {
      // Arrange
      const email = 'nonexistent@example.com';

      databaseService.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await service.findByEmail(email);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByTelephone', () => {
    it('devrait retourner un utilisateur par téléphone', async () => {
      // Arrange
      const telephone = '+2250712345678';

      databaseService.query.mockResolvedValueOnce({ rows: [mockUser] });

      // Act
      const result = await service.findByTelephone(telephone);

      // Assert
      expect(result).toBeDefined();
      expect(result?.telephone).toBe(telephone);
    });

    it('devrait normaliser le téléphone avant la recherche', async () => {
      // Arrange
      const telephone = '+225 07 12 34 56 78'; // Avec espaces

      databaseService.query.mockResolvedValueOnce({ rows: [mockUser] });

      // Act
      const result = await service.findByTelephone(telephone);

      // Assert
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('telephone'),
        ['+2250712345678'] // Normalisé
      );
    });
  });

  describe('findOne', () => {
    it('devrait retourner un utilisateur par ID', async () => {
      // Arrange
      const userId = 'user_123';

      databaseService.query.mockResolvedValueOnce({ rows: [mockUser] });

      // Act
      const result = await service.findOne(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(userId);
    });

    it('devrait retourner null si l\'utilisateur n\'existe pas', async () => {
      // Arrange
      const userId = 'user_inexistant';

      databaseService.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await service.findOne(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('devrait mettre à jour un utilisateur avec succès', async () => {
      // Arrange
      const userId = 'user_123';
      const updateDto = {
        nom: 'Doe Updated',
        prenom: 'Jane',
      };

      databaseService.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // findOne
        .mockResolvedValueOnce({ rows: [{ ...mockUser, ...updateDto }] }); // UPDATE

      // Act
      const result = await service.update(userId, updateDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.nom).toBe('Doe Updated');
      expect(result.prenom).toBe('Jane');
    });

    it('devrait lancer une erreur si l\'utilisateur n\'existe pas', async () => {
      // Arrange
      const userId = 'user_inexistant';
      const updateDto = {
        nom: 'Doe Updated',
      };

      databaseService.query.mockResolvedValueOnce({ rows: [] }); // findOne

      // Act & Assert
      try {
        await service.update(userId, updateDto);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('introuvable');
      }
    });
  });

  describe('updateLastConnection', () => {
    it('devrait mettre à jour la dernière connexion', async () => {
      // Arrange
      const userId = 'user_123';

      databaseService.query.mockResolvedValueOnce({ rowCount: 1 });

      // Act
      await service.updateLastConnection(userId);

      // Assert
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('derniere_connexion'),
        expect.arrayContaining([userId])
      );
    });
  });

  describe('normalizeTelephone', () => {
    it('devrait normaliser un téléphone avec espaces', () => {
      // Arrange
      const telephone = '+225 07 12 34 56 78';

      // Act
      const result = (service as any).normalizeTelephone(telephone);

      // Assert
      expect(result).toBe('+2250712345678');
    });

    it('devrait normaliser un téléphone sans indicatif', () => {
      // Arrange
      const telephone = '07 12 34 56 78';

      // Act
      const result = (service as any).normalizeTelephone(telephone);

      // Assert
      expect(result).toBe('0712345678');
    });

    it('devrait retourner null si le téléphone est vide', () => {
      // Arrange
      const telephone = '';

      // Act
      const result = (service as any).normalizeTelephone(telephone);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('normalizeEmail', () => {
    it('devrait normaliser un email (trim + lowercase)', () => {
      // Arrange
      const email = '  TEST@EXAMPLE.COM  ';

      // Act
      const result = (service as any).normalizeEmail(email);

      // Assert
      expect(result).toBe('test@example.com');
    });

    it('devrait retourner null si l\'email est vide', () => {
      // Arrange
      const email = '';

      // Act
      const result = (service as any).normalizeEmail(email);

      // Assert
      expect(result).toBeNull();
    });
  });
});
