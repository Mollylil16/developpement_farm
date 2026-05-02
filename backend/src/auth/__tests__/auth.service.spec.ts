/**
 * Tests unitaires pour AuthService
 * Priorité 1 : Sécurité et authentification
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { DatabaseService } from '../../database/database.service';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let databaseService: jest.Mocked<DatabaseService>;

  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    telephone: '+221771234567',
    password_hash: 'hashed_password',
    roles: ['producer'],
    nom: 'Test User',
  };

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      findByTelephone: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      updateLastConnection: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockDatabaseService = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    databaseService = module.get(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('devrait valider un utilisateur avec email et mot de passe corrects', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);

      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
      });

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
      expect(result.password_hash).toBeUndefined(); // Ne doit pas être retourné
      expect(usersService.findByEmail).toHaveBeenCalledWith(email, true);
    });

    it('devrait retourner null si l\'utilisateur n\'existe pas', async () => {
      // Arrange
      usersService.findByEmail.mockResolvedValue(null);

      // Act
      const result = await service.validateUser('nonexistent@example.com', 'password');

      // Assert
      expect(result).toBeNull();
    });

    it('devrait retourner null si le mot de passe est incorrect', async () => {
      // Arrange
      const wrongPassword = 'wrong_password';
      const hashedPassword = await bcrypt.hash('correct_password', 10);

      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
      });

      // Act
      const result = await service.validateUser('test@example.com', wrongPassword);

      // Assert
      expect(result).toBeNull();
    });

    it('devrait retourner null si l\'utilisateur n\'a pas de password_hash', async () => {
      // Arrange
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        password_hash: null,
      });

      // Act
      const result = await service.validateUser('test@example.com', 'password');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('devrait connecter un utilisateur avec email et mot de passe valides', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const hashedPassword = await bcrypt.hash(loginDto.password, 10);

      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
      });

      jwtService.sign.mockReturnValue('access_token_123');
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ id: 'refresh_token_123', token: 'refresh_token_123' }] }) // createRefreshToken
        .mockResolvedValueOnce({ rowCount: 1 }); // updateLastLogin

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.access_token).toBe('access_token_123');
      expect(result.refresh_token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('devrait connecter un utilisateur avec téléphone et mot de passe valides', async () => {
      // Arrange
      const loginDto = {
        telephone: '+221771234567',
        password: 'password123',
      };
      const hashedPassword = await bcrypt.hash(loginDto.password, 10);

      usersService.findByTelephone.mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
      });

      jwtService.sign.mockReturnValue('access_token_123');
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ id: 'refresh_token_123', token: 'refresh_token_123' }] })
        .mockResolvedValueOnce({ rowCount: 1 });

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.access_token).toBe('access_token_123');
      expect(usersService.findByTelephone).toHaveBeenCalledWith(loginDto.telephone, true);
    });

    it('devrait lancer UnauthorizedException si les identifiants sont incorrects', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'wrong_password',
      };

      usersService.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Identifiants incorrects');
    });

    it('devrait lancer BadRequestException si ni email ni téléphone ne sont fournis', async () => {
      // Arrange
      const loginDto = {
        password: 'password123',
      } as any;

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(BadRequestException);
      await expect(service.login(loginDto)).rejects.toThrow('Email ou téléphone requis');
    });
  });

  describe('register', () => {
    it('devrait créer un nouvel utilisateur avec succès', async () => {
      // Arrange
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        nom: 'New',
        prenom: 'User',
        telephone: '+221771234568',
      };

      usersService.findByEmail.mockResolvedValue(null); // Email n'existe pas
      usersService.findByTelephone.mockResolvedValue(null); // Téléphone n'existe pas
      usersService.create.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
        nom: registerDto.nom,
      });

      jwtService.sign.mockReturnValue('access_token_123');
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ id: 'refresh_token_123', token: 'refresh_token_123' }] })
        .mockResolvedValueOnce({ rowCount: 1 });

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.access_token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(usersService.create).toHaveBeenCalled();
    });

    it('devrait lancer ConflictException si l\'email existe déjà', async () => {
      // Arrange
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        nom: 'Existing',
        prenom: 'User',
      };

      usersService.findByEmail.mockResolvedValue(mockUser); // Email existe déjà

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('devrait lancer ConflictException si le téléphone existe déjà', async () => {
      // Arrange
      const registerDto = {
        email: 'new@example.com',
        password: 'password123',
        nom: 'New',
        prenom: 'User',
        telephone: '+221771234567', // Téléphone existe déjà
      };

      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByTelephone.mockResolvedValue(mockUser); // Téléphone existe déjà

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });
});
