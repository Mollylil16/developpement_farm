/**
 * Tests d'intégration pour CreateRevenuUseCase
 */

import { CreateRevenuUseCase, type CreateRevenuInput } from '../CreateRevenu';
import type { IFinanceRepository } from '../repositories/IFinanceRepository';
import type { Revenu } from '../entities/Revenu';

// Mocks
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('CreateRevenuUseCase - Integration', () => {
  let useCase: CreateRevenuUseCase;
  let mockRepository: jest.Mocked<IFinanceRepository>;

  const mockRevenu: Revenu = {
    id: 'revenu-1',
    projetId: 'projet-1',
    montant: 200000,
    categorie: 'vente_porc',
    date: '2024-01-15',
    poidsKg: 100,
    dateCreation: '2024-01-15T00:00:00Z',
    derniereModification: '2024-01-15T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      createRevenu: jest.fn(),
    } as any;

    useCase = new CreateRevenuUseCase(mockRepository);
  });

  describe('execute', () => {
    it('devrait créer un revenu avec succès', async () => {
      const input: CreateRevenuInput = {
        projetId: 'projet-1',
        montant: 200000,
        categorie: 'vente_porc',
        date: '2024-01-15',
        poidsKg: 100,
      };

      mockRepository.createRevenu.mockResolvedValueOnce(mockRevenu);

      const result = await useCase.execute(input);

      expect(mockRepository.createRevenu).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.montant).toBe(200000);
    });

    it('devrait rejeter si le projet n\'est pas fourni', async () => {
      const input: CreateRevenuInput = {
        projetId: '',
        montant: 200000,
        categorie: 'vente_porc',
        date: '2024-01-15',
      };

      await expect(useCase.execute(input)).rejects.toThrow('Le projet est requis');
    });

    it('devrait rejeter si le montant est <= 0', async () => {
      const input: CreateRevenuInput = {
        projetId: 'projet-1',
        montant: 0,
        categorie: 'vente_porc',
        date: '2024-01-15',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Le montant doit être supérieur à 0'
      );
    });

    it('devrait rejeter si la date est dans le futur', async () => {
      const dateFutur = new Date();
      dateFutur.setDate(dateFutur.getDate() + 10);

      const input: CreateRevenuInput = {
        projetId: 'projet-1',
        montant: 200000,
        categorie: 'vente_porc',
        date: dateFutur.toISOString().split('T')[0],
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'La date du revenu ne peut pas être dans le futur'
      );
    });
  });
});

