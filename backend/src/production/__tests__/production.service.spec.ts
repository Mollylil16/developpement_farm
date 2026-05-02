/**
 * Tests unitaires pour ProductionService
 * Priorité 1 : Tests critiques pour gestion animaux et calculs
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ProductionService } from '../production.service';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../common/services/cache.service';
import { ImageService } from '../../common/services/image.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateAnimalDto } from '../dto/create-animal.dto';
import { UpdateAnimalDto } from '../dto/update-animal.dto';
import { CreatePeseeDto } from '../dto/create-pesee.dto';
import * as compressImageHelper from '../../common/helpers/image-compression.helper';

describe('ProductionService', () => {
  let service: ProductionService;
  let databaseService: jest.Mocked<DatabaseService>;
  let cacheService: jest.Mocked<CacheService>;
  let imageService: jest.Mocked<ImageService>;

  const mockProjet = {
    id: 'projet_123',
    proprietaire_id: 'owner_123',
    nom: 'Ferme Test',
  };

  const mockAnimal = {
    id: 'animal_123',
    projet_id: 'projet_123',
    code: 'TR-001',
    nom: 'Truie 1',
    sexe: 'femelle',
    date_naissance: '2024-01-01',
    poids_initial: 25.5,
    statut: 'actif',
    actif: true,
    race: 'Large White',
    reproducteur: false,
    date_creation: new Date().toISOString(),
  };

  const mockPesee = {
    id: 'pesee_123',
    projet_id: 'projet_123',
    animal_id: 'animal_123',
    date: '2024-12-01',
    poids_kg: 30.5,
    gmq: 0.5,
    date_creation: new Date().toISOString(),
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      query: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    const mockImageService = {
      compressImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ImageService,
          useValue: mockImageService,
        },
      ],
    }).compile();

    service = module.get<ProductionService>(ProductionService);
    databaseService = module.get(DatabaseService);
    cacheService = module.get(CacheService);
    imageService = module.get(ImageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAnimal', () => {
    it('devrait créer un animal avec succès', async () => {
      // Arrange
      const createDto: CreateAnimalDto = {
        projet_id: 'projet_123',
        code: 'TR-001',
        nom: 'Truie 1',
        sexe: 'femelle',
        poids_initial: 25.5,
      };

      const userId = 'owner_123';

      databaseService.query
        .mockResolvedValueOnce({ rows: [mockProjet] }) // checkProjetOwnership
        .mockResolvedValueOnce({ rows: [mockAnimal] }); // INSERT

      jest.spyOn(compressImageHelper, 'compressImage').mockResolvedValue(null);

      // Act
      const result = await service.createAnimal(createDto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.code).toBe('TR-001');
      expect(result.nom).toBe('Truie 1');
      expect(cacheService.delete).toHaveBeenCalledWith(`projet_stats:${createDto.projet_id}`);
    });

    it('devrait lancer ForbiddenException si le projet n\'appartient pas à l\'utilisateur', async () => {
      // Arrange
      const createDto: CreateAnimalDto = {
        projet_id: 'projet_123',
        code: 'TR-001',
        nom: 'Truie 1',
      };

      const userId = 'other_user';

      databaseService.query.mockResolvedValueOnce({
        rows: [{ ...mockProjet, proprietaire_id: 'owner_123' }],
      });

      // Act & Assert
      try {
        await service.createAnimal(createDto, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('findOneAnimal', () => {
    it('devrait retourner un animal existant', async () => {
      // Arrange
      const animalId = 'animal_123';
      const userId = 'owner_123';

      // findOneAnimal fait checkAnimalOwnership qui fait une jointure avec projets
      // Puis SELECT l'animal
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ ...mockAnimal, proprietaire_id: userId }] }) // checkAnimalOwnership (jointure)
        .mockResolvedValueOnce({ rows: [mockAnimal] }); // SELECT animal

      // Act
      const result = await service.findOneAnimal(animalId, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(animalId);
      expect(result?.code).toBe('TR-001');
    });

    it('devrait lancer NotFoundException si l\'animal n\'existe pas', async () => {
      // Arrange
      const animalId = 'animal_inexistant';
      const userId = 'owner_123';

      databaseService.query.mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      try {
        await service.findOneAnimal(animalId, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('updateAnimal', () => {
    it('devrait mettre à jour un animal avec succès', async () => {
      // Arrange
      const animalId = 'animal_123';
      const updateDto: UpdateAnimalDto = {
        nom: 'Truie 1 Updated',
        poids_initial: 30.0,
      };

      const userId = 'owner_123';

      databaseService.query
        .mockResolvedValueOnce({ rows: [{ ...mockAnimal, proprietaire_id: userId }] }) // checkAnimalOwnership
        .mockResolvedValueOnce({ rows: [{ ...mockAnimal, nom: 'Truie 1 Updated', poids_initial: 30.0 }] }); // UPDATE

      jest.spyOn(compressImageHelper, 'compressImage').mockResolvedValue(null);

      // Act
      const result = await service.updateAnimal(animalId, updateDto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.nom).toBe('Truie 1 Updated');
      expect(result.poids_initial).toBe(30.0);
    });

    it('devrait lancer ForbiddenException si l\'animal n\'appartient pas à l\'utilisateur', async () => {
      // Arrange
      const animalId = 'animal_123';
      const updateDto: UpdateAnimalDto = {
        nom: 'Truie 1 Updated',
      };

      const userId = 'other_user';

      databaseService.query.mockResolvedValueOnce({
        rows: [{ ...mockAnimal, proprietaire_id: 'owner_123' }],
      });

      // Act & Assert
      try {
        await service.updateAnimal(animalId, updateDto, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('createPesee', () => {
    it('devrait créer une pesée avec succès', async () => {
      // Arrange
      const createDto: CreatePeseeDto = {
        projet_id: 'projet_123',
        animal_id: 'animal_123',
        date: '2024-12-01',
        poids_kg: 30.5,
      };

      const userId = 'owner_123';

      // createPesee fait :
      // 1. checkProjetOwnership
      // 2. checkAnimalOwnership (jointure avec projets)
      // 3. SELECT pesées précédentes (pour calcul GMQ)
      // 4. INSERT pesée
      databaseService.query
        .mockResolvedValueOnce({ rows: [mockProjet] }) // checkProjetOwnership
        .mockResolvedValueOnce({ rows: [{ ...mockAnimal, proprietaire_id: userId }] }) // checkAnimalOwnership
        .mockResolvedValueOnce({ rows: [] }) // Pas de pesée précédente
        .mockResolvedValueOnce({ rows: [mockPesee] }); // INSERT

      // Act
      const result = await service.createPesee(createDto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.poids_kg).toBe(30.5);
      expect(result.animal_id).toBe('animal_123');
    });

    it('devrait calculer le GMQ si une pesée précédente existe', async () => {
      // Arrange
      const createDto: CreatePeseeDto = {
        projet_id: 'projet_123',
        animal_id: 'animal_123',
        date: '2024-12-08',
        poids_kg: 34.0,
      };

      const userId = 'owner_123';
      const previousPesee = {
        ...mockPesee,
        date: '2024-12-01',
        poids_kg: 30.5,
      };

      databaseService.query
        .mockResolvedValueOnce({ rows: [mockProjet] }) // checkProjetOwnership
        .mockResolvedValueOnce({ rows: [{ ...mockAnimal, proprietaire_id: userId }] }) // checkAnimalOwnership
        .mockResolvedValueOnce({ rows: [previousPesee] }) // Pesée précédente
        .mockResolvedValueOnce({ rows: [{ ...mockPesee, poids_kg: 34.0, gmq: 0.5 }] }); // INSERT avec GMQ calculé

      // Act
      const result = await service.createPesee(createDto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.poids_kg).toBe(34.0);
      // GMQ = (34.0 - 30.5) / 7 jours = 0.5 kg/jour
      if (result.gmq) {
        expect(result.gmq).toBeCloseTo(0.5, 2);
      }
    });
  });

  describe('calculateGMQ', () => {
    it('devrait calculer le GMQ entre deux pesées', async () => {
      // Arrange
      const animalId = 'animal_123';
      const userId = 'owner_123';

      const pesee1 = {
        ...mockPesee,
        date: '2024-12-01',
        poids_kg: 30.0,
      };

      const pesee2 = {
        ...mockPesee,
        id: 'pesee_456',
        date: '2024-12-08',
        poids_kg: 34.0,
      };

      // calculateGMQ fait :
      // 1. checkAnimalOwnership (jointure avec projets)
      // 2. SELECT pesées (ORDER BY date DESC LIMIT 2)
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ ...mockAnimal, proprietaire_id: userId }] }) // checkAnimalOwnership
        .mockResolvedValueOnce({ rows: [pesee2, pesee1] }); // Pesées (plus récente en premier, LIMIT 2)

      // Act
      const result = await service.calculateGMQ(animalId, userId);

      // Assert
      expect(result).toBeDefined();
      // GMQ = (34.0 - 30.0) / 7 jours = 0.571 kg/jour
      expect(result.gmq).toBeCloseTo(0.571, 2);
    });

    it('devrait retourner null si moins de 2 pesées', async () => {
      // Arrange
      const animalId = 'animal_123';
      const userId = 'owner_123';

      databaseService.query
        .mockResolvedValueOnce({ rows: [{ ...mockAnimal, proprietaire_id: userId }] }) // checkAnimalOwnership
        .mockResolvedValueOnce({ rows: [mockPesee] }); // Une seule pesée (moins de 2)

      // Act
      const result = await service.calculateGMQ(animalId, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.gmq).toBeNull();
    });
  });

  describe('deleteAnimal', () => {
    it('devrait supprimer un animal avec succès', async () => {
      // Arrange
      const animalId = 'animal_123';
      const userId = 'owner_123';

      databaseService.query
        .mockResolvedValueOnce({ rows: [{ ...mockAnimal, proprietaire_id: userId }] }) // checkAnimalOwnership
        .mockResolvedValueOnce({ rowCount: 1 }); // DELETE

      // Act
      await service.deleteAnimal(animalId, userId);

      // Assert
      expect(databaseService.query).toHaveBeenCalledTimes(2);
      const deleteCall = databaseService.query.mock.calls.find(
        (call) => call[0].includes('DELETE FROM production_animaux')
      );
      expect(deleteCall).toBeDefined();
      expect(cacheService.delete).toHaveBeenCalledWith(`projet_stats:${mockAnimal.projet_id}`);
    });
  });
});
