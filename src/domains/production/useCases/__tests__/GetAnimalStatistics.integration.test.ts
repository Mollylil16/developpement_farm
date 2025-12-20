/**
 * Tests d'intégration pour GetAnimalStatisticsUseCase
 */

import { GetAnimalStatisticsUseCase } from '../GetAnimalStatistics';
import type { IAnimalRepository } from '../repositories/IAnimalRepository';
import type { Animal } from '../entities/Animal';

describe('GetAnimalStatisticsUseCase - Integration', () => {
  let useCase: GetAnimalStatisticsUseCase;
  let mockRepository: jest.Mocked<IAnimalRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      findByProjet: jest.fn(),
      findActifsByProjet: jest.fn(),
      findReproducteursActifs: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    useCase = new GetAnimalStatisticsUseCase(mockRepository);
  });

  describe('execute', () => {
    it('devrait calculer les statistiques avec succès', async () => {
      const projetId = 'projet-1';

      // Créer des animaux mockés avec des dates de naissance pour calculer l'âge
      const dateNaissance = new Date('2023-01-01');
      const mockAnimaux: Animal[] = Array.from({ length: 10 }, (_, i) => ({
        id: `animal-${i}`,
        code: `AN-${i}`,
        projetId,
        sexe: i < 2 ? 'male' : 'femelle',
        actif: i < 8,
        statut: i < 8 ? 'actif' : 'vendu',
        reproducteur: i < 2,
        dateNaissance: dateNaissance.toISOString().split('T')[0],
        dateEntree: dateNaissance.toISOString().split('T')[0],
        dateCreation: '2024-01-01T00:00:00Z',
        derniereModification: '2024-01-01T00:00:00Z',
      }));

      mockRepository.findByProjet.mockResolvedValueOnce(mockAnimaux);

      const result = await useCase.execute(projetId);

      expect(result).toBeDefined();
      expect(result.total).toBe(10);
      expect(result.actifs).toBe(8);
      expect(result.males).toBe(2);
      expect(result.femelles).toBe(8);
      expect(mockRepository.findByProjet).toHaveBeenCalledWith(projetId);
    });

    it("devrait rejeter si le projet n'est pas fourni", async () => {
      await expect(useCase.execute('')).rejects.toThrow('Le projet est requis');
    });
  });
});
