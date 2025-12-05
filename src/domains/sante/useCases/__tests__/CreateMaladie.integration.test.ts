/**
 * Tests d'intégration pour CreateMaladieUseCase
 */

import { CreateMaladieUseCase, type CreateMaladieInput } from '../CreateMaladie';
import type { ISanteRepository } from '../repositories/ISanteRepository';
import type { Maladie } from '../entities/Maladie';

// Mocks
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('CreateMaladieUseCase - Integration', () => {
  let useCase: CreateMaladieUseCase;
  let mockRepository: jest.Mocked<ISanteRepository>;

  const mockMaladie: Maladie = {
    id: 'maladie-1',
    projetId: 'projet-1',
    animalId: 'animal-1',
    type: 'respiratoire',
    nomMaladie: 'Grippe porcine',
    gravite: 'moderee',
    dateDebut: '2024-01-15',
    symptomes: 'Toux, fièvre',
    contagieux: false,
    gueri: false,
    dateCreation: '2024-01-15T00:00:00Z',
    derniereModification: '2024-01-15T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      createMaladie: jest.fn(),
      findVaccinationById: jest.fn(),
      findVaccinationsByProjet: jest.fn(),
      findVaccinationsByAnimal: jest.fn(),
      findVaccinationsEnRetard: jest.fn(),
      createVaccination: jest.fn(),
      updateVaccination: jest.fn(),
      deleteVaccination: jest.fn(),
      findMaladieById: jest.fn(),
      findMaladiesByProjet: jest.fn(),
      findMaladiesByAnimal: jest.fn(),
      findMaladiesEnCours: jest.fn(),
      updateMaladie: jest.fn(),
      deleteMaladie: jest.fn(),
    } as any;

    useCase = new CreateMaladieUseCase(mockRepository);
  });

  describe('execute', () => {
    it('devrait créer une maladie avec succès', async () => {
      const input: CreateMaladieInput = {
        projetId: 'projet-1',
        animalId: 'animal-1',
        type: 'respiratoire',
        nomMaladie: 'Grippe porcine',
        gravite: 'moderee',
        dateDebut: '2024-01-15',
        symptomes: 'Toux, fièvre',
      };

      mockRepository.createMaladie.mockResolvedValueOnce(mockMaladie);

      const result = await useCase.execute(input);

      expect(mockRepository.createMaladie).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.nomMaladie).toBe('Grippe porcine');
    });

    it('devrait rejeter si le projet n\'est pas fourni', async () => {
      const input: CreateMaladieInput = {
        projetId: '',
        animalId: 'animal-1',
        type: 'respiratoire',
        nomMaladie: 'Grippe',
        gravite: 'moderee',
        dateDebut: '2024-01-15',
        symptomes: 'Toux',
      };

      await expect(useCase.execute(input)).rejects.toThrow('Le projet est requis');
    });

    it('devrait rejeter si le nom de la maladie est vide', async () => {
      const input: CreateMaladieInput = {
        projetId: 'projet-1',
        animalId: 'animal-1',
        type: 'respiratoire',
        nomMaladie: '',
        gravite: 'moderee',
        dateDebut: '2024-01-15',
        symptomes: 'Toux',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Le nom de la maladie est requis'
      );
    });

    it('devrait rejeter si les symptômes sont vides', async () => {
      const input: CreateMaladieInput = {
        projetId: 'projet-1',
        animalId: 'animal-1',
        type: 'respiratoire',
        nomMaladie: 'Grippe',
        gravite: 'moderee',
        dateDebut: '2024-01-15',
        symptomes: '',
      };

      await expect(useCase.execute(input)).rejects.toThrow('Les symptômes sont requis');
    });

    it('devrait rejeter si ni animalId ni lotId n\'est fourni', async () => {
      const input: CreateMaladieInput = {
        projetId: 'projet-1',
        type: 'respiratoire',
        nomMaladie: 'Grippe',
        gravite: 'moderee',
        dateDebut: '2024-01-15',
        symptomes: 'Toux',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Un animal ou un lot doit être spécifié'
      );
    });

    it('devrait rejeter si la date est dans le futur', async () => {
      const dateFutur = new Date();
      dateFutur.setDate(dateFutur.getDate() + 10);

      const input: CreateMaladieInput = {
        projetId: 'projet-1',
        animalId: 'animal-1',
        type: 'respiratoire',
        nomMaladie: 'Grippe',
        gravite: 'moderee',
        dateDebut: dateFutur.toISOString().split('T')[0],
        symptomes: 'Toux',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'La date de début ne peut pas être dans le futur'
      );
    });

    it('devrait exiger un vétérinaire pour une maladie critique', async () => {
      const input: CreateMaladieInput = {
        projetId: 'projet-1',
        animalId: 'animal-1',
        type: 'respiratoire',
        nomMaladie: 'Maladie critique',
        gravite: 'critique',
        dateDebut: '2024-01-15',
        symptomes: 'Symptômes graves',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Une maladie critique nécessite l\'intervention d\'un vétérinaire'
      );
    });
  });
});

