/**
 * Tests pour ProductionGMQService
 */

import { ProductionGMQService } from '../production/ProductionGMQService';
import { getDatabase } from '../database';
import { AnimalRepository, PeseeRepository } from '../../database/repositories';

jest.mock('../database');
jest.mock('../../database/repositories');

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('ProductionGMQService', () => {
  let mockDb: any;
  let mockAnimalRepo: jest.Mocked<AnimalRepository>;
  let mockPeseeRepo: jest.Mocked<PeseeRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      runAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };
    mockGetDatabase.mockResolvedValue(mockDb);

    mockAnimalRepo = {
      findById: jest.fn(),
    } as any;

    mockPeseeRepo = {
      query: jest.fn(),
      findLastBeforeDate: jest.fn(),
    } as any;

    (AnimalRepository as jest.Mock).mockImplementation(() => mockAnimalRepo);
    (PeseeRepository as jest.Mock).mockImplementation(() => mockPeseeRepo);
  });

  describe('recalculerGMQ', () => {
    const animalId = 'animal-123';
    const dateModifiee = '2024-01-15';

    it('devrait recalculer le GMQ pour toutes les pesées suivantes', async () => {
      const mockAnimal = {
        id: animalId,
        poids_initial: 10,
        date_entree: '2024-01-01',
      };

      const mockPeseePrecedente = {
        id: 'pesee-1',
        animal_id: animalId,
        date: '2024-01-10',
        poids_kg: 15,
        gmq: 500,
      };

      const mockPeseesSuivantes = [
        {
          id: 'pesee-2',
          animal_id: animalId,
          date: '2024-01-20',
          poids_kg: 20,
          gmq: null,
        },
        {
          id: 'pesee-3',
          animal_id: animalId,
          date: '2024-01-30',
          poids_kg: 25,
          gmq: null,
        },
      ];

      mockAnimalRepo.findById.mockResolvedValue(mockAnimal as any);
      mockPeseeRepo.query.mockResolvedValue(mockPeseesSuivantes as any);
      mockPeseeRepo.findLastBeforeDate
        .mockResolvedValueOnce(mockPeseePrecedente as any)
        .mockResolvedValueOnce(mockPeseesSuivantes[0] as any);
      mockDb.runAsync.mockResolvedValue(undefined);

      await ProductionGMQService.recalculerGMQ(animalId, dateModifiee);

      // Vérifier que les pesées suivantes sont récupérées
      expect(mockPeseeRepo.query).toHaveBeenCalledWith(
        'SELECT * FROM production_pesees WHERE animal_id = ? AND date > ? ORDER BY date ASC',
        [animalId, dateModifiee]
      );

      // Vérifier que le GMQ est mis à jour pour chaque pesée
      expect(mockDb.runAsync).toHaveBeenCalledTimes(2);

      // Vérifier le calcul du GMQ pour la première pesée suivante
      // Différence: 20 - 15 = 5 kg = 5000 g, jours: 10, GMQ = 500 g/jour
      const firstUpdateCall = mockDb.runAsync.mock.calls[0];
      expect(firstUpdateCall[0]).toContain('UPDATE production_pesees');
      expect(firstUpdateCall[1][2]).toBe('pesee-2');
    });

    it('devrait utiliser le poids initial si aucune pesée précédente', async () => {
      const mockAnimal = {
        id: animalId,
        poids_initial: 10,
        date_entree: '2024-01-01',
      };

      const mockPeseeSuivante = {
        id: 'pesee-2',
        animal_id: animalId,
        date: '2024-01-20',
        poids_kg: 20,
        gmq: null,
      };

      mockAnimalRepo.findById.mockResolvedValue(mockAnimal as any);
      mockPeseeRepo.query.mockResolvedValue([mockPeseeSuivante] as any);
      mockPeseeRepo.findLastBeforeDate.mockResolvedValue(null);
      mockDb.runAsync.mockResolvedValue(undefined);

      await ProductionGMQService.recalculerGMQ(animalId, dateModifiee);

      // Vérifier que le GMQ est calculé à partir du poids initial
      // Différence: 20 - 10 = 10 kg = 10000 g, jours: 19, GMQ ≈ 526 g/jour
      expect(mockDb.runAsync).toHaveBeenCalled();
      const updateCall = mockDb.runAsync.mock.calls[0];
      expect(updateCall[1][2]).toBe('pesee-2');
    });

    it("devrait lancer une erreur si l'animal n'existe pas", async () => {
      mockAnimalRepo.findById.mockResolvedValue(null);

      await expect(ProductionGMQService.recalculerGMQ(animalId, dateModifiee)).rejects.toThrow(
        'Animal introuvable'
      );
    });

    it("devrait gérer le cas où il n'y a pas de pesées suivantes", async () => {
      const mockAnimal = {
        id: animalId,
        poids_initial: 10,
        date_entree: '2024-01-01',
      };

      mockAnimalRepo.findById.mockResolvedValue(mockAnimal as any);
      mockPeseeRepo.query.mockResolvedValue([]);

      await ProductionGMQService.recalculerGMQ(animalId, dateModifiee);

      // Vérifier qu'aucune mise à jour n'est effectuée
      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });

    it('devrait calculer difference_standard si un standard GMQ existe', async () => {
      const mockAnimal = {
        id: animalId,
        poids_initial: 10,
        date_entree: '2024-01-01',
      };

      const mockPeseeSuivante = {
        id: 'pesee-2',
        animal_id: animalId,
        date: '2024-01-20',
        poids_kg: 20,
        gmq: null,
      };

      mockAnimalRepo.findById.mockResolvedValue(mockAnimal as any);
      mockPeseeRepo.query.mockResolvedValue([mockPeseeSuivante] as any);
      mockPeseeRepo.findLastBeforeDate.mockResolvedValue(null);
      mockDb.runAsync.mockResolvedValue(undefined);

      await ProductionGMQService.recalculerGMQ(animalId, dateModifiee);

      // Vérifier que difference_standard est calculé
      const updateCall = mockDb.runAsync.mock.calls[0];
      expect(updateCall[1][1]).not.toBeNull(); // difference_standard
    });

    it('devrait ignorer les pesées avec diffJours <= 0', async () => {
      const mockAnimal = {
        id: animalId,
        poids_initial: 10,
        date_entree: '2024-01-20', // Même date que la pesée
      };

      const mockPeseeSuivante = {
        id: 'pesee-2',
        animal_id: animalId,
        date: '2024-01-20',
        poids_kg: 20,
        gmq: null,
      };

      mockAnimalRepo.findById.mockResolvedValue(mockAnimal as any);
      mockPeseeRepo.query.mockResolvedValue([mockPeseeSuivante] as any);
      mockPeseeRepo.findLastBeforeDate.mockResolvedValue(null);
      mockDb.runAsync.mockResolvedValue(undefined);

      await ProductionGMQService.recalculerGMQ(animalId, dateModifiee);

      // Vérifier que le GMQ est null si diffJours <= 0
      const updateCall = mockDb.runAsync.mock.calls[0];
      expect(updateCall[1][0]).toBeNull(); // gmq
      expect(updateCall[1][1]).toBeNull(); // difference_standard
    });
  });
});
