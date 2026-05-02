/**
 * Tests unitaires pour SanteService
 * Priorité 1 : Tests critiques pour vaccinations et maladies
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SanteService } from '../sante.service';
import { DatabaseService } from '../../database/database.service';
import { ImageService } from '../../common/services/image.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateVaccinationDto } from '../dto/create-vaccination.dto';
import { CreateMaladieDto } from '../dto/create-maladie.dto';
import * as compressImageHelper from '../../common/helpers/image-compression.helper';

describe('SanteService', () => {
  let service: SanteService;
  let databaseService: jest.Mocked<DatabaseService>;
  let imageService: jest.Mocked<ImageService>;

  const mockProjet = {
    id: 'projet_123',
    proprietaire_id: 'owner_123',
    nom: 'Ferme Test',
  };

  const mockVaccination = {
    id: 'vaccination_123',
    projet_id: 'projet_123',
    animal_id: 'animal_123',
    calendrier_id: 'calendrier_123',
    date_vaccination: '2024-12-01',
    produit_administre: 'Peste porcine',
    statut: 'effectue',
    date_creation: new Date().toISOString(),
  };

  const mockMaladie = {
    id: 'maladie_123',
    projet_id: 'projet_123',
    animal_id: 'animal_123',
    nom_maladie: 'Grippe',
    date_debut: '2024-12-01',
    date_fin: '2024-12-05',
    gueri: true,
    date_creation: new Date().toISOString(),
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      query: jest.fn(),
    };

    const mockImageService = {
      compressImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SanteService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: ImageService,
          useValue: mockImageService,
        },
      ],
    }).compile();

    service = module.get<SanteService>(SanteService);
    databaseService = module.get(DatabaseService);
    imageService = module.get(ImageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createVaccination', () => {
    it('devrait créer une vaccination avec succès', async () => {
      // Arrange
      const createDto: CreateVaccinationDto = {
        projet_id: 'projet_123',
        animal_ids: ['animal_123'],
        calendrier_id: 'calendrier_123',
        date_vaccination: '2024-12-01',
        type_prophylaxie: 'vaccin_obligatoire',
        produit_administre: 'Peste porcine',
        dosage: '2ml',
        raison_traitement: 'suivi_normal',
        statut: 'effectue',
      };

      const userId = 'owner_123';

      databaseService.query
        .mockResolvedValueOnce({ rows: [mockProjet] }) // checkProjetOwnership
        .mockResolvedValueOnce({ rows: [mockVaccination] }); // INSERT

      jest.spyOn(compressImageHelper, 'compressImage').mockResolvedValue(null);

      // Act
      const result = await service.createVaccination(createDto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.produit_administre).toBe('Peste porcine');
      expect(result.statut).toBe('effectue');
    });

    it('devrait lancer ForbiddenException si le projet n\'appartient pas à l\'utilisateur', async () => {
      // Arrange
      const createDto: CreateVaccinationDto = {
        projet_id: 'projet_123',
        animal_ids: ['animal_123'],
        date_vaccination: '2024-12-01',
        type_prophylaxie: 'vaccin_obligatoire',
        produit_administre: 'Peste porcine',
        dosage: '2ml',
        raison_traitement: 'suivi_normal',
      };

      const userId = 'other_user';

      databaseService.query.mockResolvedValueOnce({
        rows: [{ ...mockProjet, proprietaire_id: 'owner_123' }],
      });

      // Act & Assert
      try {
        await service.createVaccination(createDto, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('findOneVaccination', () => {
    it('devrait retourner une vaccination existante', async () => {
      // Arrange
      const vaccinationId = 'vaccination_123';
      const userId = 'owner_123';

      // findOneVaccination fait une jointure avec projets pour vérifier proprietaire_id
      databaseService.query.mockResolvedValueOnce({
        rows: [{ ...mockVaccination, proprietaire_id: userId }],
      });

      // Act
      const result = await service.findOneVaccination(vaccinationId, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(vaccinationId);
    });

    it('devrait lancer NotFoundException si la vaccination n\'existe pas', async () => {
      // Arrange
      const vaccinationId = 'vaccination_inexistant';
      const userId = 'owner_123';

      databaseService.query.mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      try {
        await service.findOneVaccination(vaccinationId, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('createMaladie', () => {
    it('devrait créer une maladie avec succès', async () => {
      // Arrange
      const createDto: CreateMaladieDto = {
        projet_id: 'projet_123',
        animal_id: 'animal_123',
        type: 'respiratoire',
        nom_maladie: 'Grippe',
        gravite: 'moderee',
        date_debut: '2024-12-01',
        symptomes: 'Toux, fièvre',
        gueri: false,
      };

      const userId = 'owner_123';

      databaseService.query
        .mockResolvedValueOnce({ rows: [mockProjet] }) // checkProjetOwnership
        .mockResolvedValueOnce({ rows: [mockMaladie] }); // INSERT

      jest.spyOn(compressImageHelper, 'compressImage').mockResolvedValue(null);

      // Act
      const result = await service.createMaladie(createDto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.nom_maladie).toBe('Grippe');
      expect(result.gueri).toBe(false);
    });
  });

  describe('findOneMaladie', () => {
    it('devrait retourner une maladie existante', async () => {
      // Arrange
      const maladieId = 'maladie_123';
      const userId = 'owner_123';

      // findOneMaladie fait une jointure avec projets pour vérifier proprietaire_id
      databaseService.query.mockResolvedValueOnce({
        rows: [{ ...mockMaladie, proprietaire_id: userId }],
      });

      // Act
      const result = await service.findOneMaladie(maladieId, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(maladieId);
    });
  });

  describe('findVaccinationsEnRetard', () => {
    it('devrait retourner les vaccinations en retard', async () => {
      // Arrange
      const projetId = 'projet_123';
      const userId = 'owner_123';

      const vaccinationEnRetard = {
        ...mockVaccination,
        date_rappel: '2024-11-01', // Date de rappel passée
        statut: 'en_retard',
      };

      databaseService.query
        .mockResolvedValueOnce({ rows: [mockProjet] }) // checkProjetOwnership
        .mockResolvedValueOnce({ rows: [vaccinationEnRetard] }); // SELECT vaccinations en retard

      // Act
      const result = await service.findVaccinationsEnRetard(projetId, userId);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findMaladiesEnCours', () => {
    it('devrait retourner les maladies en cours', async () => {
      // Arrange
      const projetId = 'projet_123';
      const userId = 'owner_123';

      const maladieEnCours = {
        ...mockMaladie,
        gueri: false,
      };

      databaseService.query
        .mockResolvedValueOnce({ rows: [mockProjet] }) // checkProjetOwnership
        .mockResolvedValueOnce({ rows: [maladieEnCours] }); // SELECT maladies en cours

      // Act
      const result = await service.findMaladiesEnCours(projetId, userId);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
