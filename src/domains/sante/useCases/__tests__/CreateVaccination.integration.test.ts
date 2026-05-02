/**
 * Tests d'intégration pour CreateVaccinationUseCase
 *
 * Teste l'orchestration complète de la création d'une vaccination
 */

import { CreateVaccinationUseCase, type CreateVaccinationInput } from '../CreateVaccination';
import type { ISanteRepository } from '../repositories/ISanteRepository';
import type { Vaccination } from '../entities/Vaccination';

// Mocks
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('CreateVaccinationUseCase - Integration', () => {
  let useCase: CreateVaccinationUseCase;
  let mockRepository: jest.Mocked<ISanteRepository>;

  const mockVaccination: Vaccination = {
    id: 'vaccination-1',
    projetId: 'projet-1',
    animalId: 'animal-1',
    vaccin: 'vaccin-test',
    nomVaccin: 'Vaccin Test',
    dateVaccination: '2024-01-15',
    dateRappel: '2024-02-15',
    statut: 'planifie',
    dateCreation: '2024-01-15T00:00:00Z',
    derniereModification: '2024-01-15T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      createVaccination: jest.fn(),
      createMaladie: jest.fn(),
      findVaccinationById: jest.fn(),
      findVaccinationsByProjet: jest.fn(),
      findVaccinationsByAnimal: jest.fn(),
      findVaccinationsEnRetard: jest.fn(),
      updateVaccination: jest.fn(),
      deleteVaccination: jest.fn(),
      findMaladieById: jest.fn(),
      findMaladiesByProjet: jest.fn(),
      findMaladiesByAnimal: jest.fn(),
      findMaladiesEnCours: jest.fn(),
      updateMaladie: jest.fn(),
      deleteMaladie: jest.fn(),
    } as any;

    useCase = new CreateVaccinationUseCase(mockRepository);
  });

  describe('execute', () => {
    it('devrait créer une vaccination avec succès', async () => {
      const input: CreateVaccinationInput = {
        projetId: 'projet-1',
        animalId: 'animal-1',
        dateVaccination: '2024-01-15',
        nomVaccin: 'Vaccin Test',
      };

      mockRepository.createVaccination.mockResolvedValueOnce(mockVaccination);

      const result = await useCase.execute(input);

      expect(mockRepository.createVaccination).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.animalId).toBe('animal-1');
    });

    it("devrait rejeter si le projet n'est pas fourni", async () => {
      const input: CreateVaccinationInput = {
        projetId: '',
        animalId: 'animal-1',
        dateVaccination: '2024-01-15',
      };

      await expect(useCase.execute(input)).rejects.toThrow('Le projet est requis');
    });

    it("devrait rejeter si la date de vaccination n'est pas fournie", async () => {
      const input: CreateVaccinationInput = {
        projetId: 'projet-1',
        animalId: 'animal-1',
        dateVaccination: '',
      };

      await expect(useCase.execute(input)).rejects.toThrow('La date de vaccination est requise');
    });

    it("devrait rejeter si ni animalId ni lotId n'est fourni", async () => {
      const input: CreateVaccinationInput = {
        projetId: 'projet-1',
        dateVaccination: '2024-01-15',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Un animal ou un lot doit être spécifié'
      );
    });

    it("devrait accepter un lotId au lieu d'un animalId", async () => {
      const input: CreateVaccinationInput = {
        projetId: 'projet-1',
        lotId: 'lot-1',
        dateVaccination: '2024-01-15',
      };

      mockRepository.createVaccination.mockResolvedValueOnce({
        ...mockVaccination,
        lotId: 'lot-1',
        animalId: undefined,
      });

      const result = await useCase.execute(input);

      expect(result).toBeDefined();
      expect(result.lotId).toBe('lot-1');
    });

    it('devrait rejeter si la date de rappel est avant la date de vaccination', async () => {
      const input: CreateVaccinationInput = {
        projetId: 'projet-1',
        animalId: 'animal-1',
        dateVaccination: '2024-01-15',
        dateRappel: '2024-01-10',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'La date de rappel doit être après la date de vaccination'
      );
    });

    it('devrait accepter une date de rappel valide', async () => {
      const input: CreateVaccinationInput = {
        projetId: 'projet-1',
        animalId: 'animal-1',
        dateVaccination: '2024-01-15',
        dateRappel: '2024-02-15',
      };

      mockRepository.createVaccination.mockResolvedValueOnce(mockVaccination);

      const result = await useCase.execute(input);

      expect(result).toBeDefined();
      expect(result.dateRappel).toBe('2024-02-15');
    });
  });
});
