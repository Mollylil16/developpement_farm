/**
 * Tests d'intégration pour CreateDepenseUseCase
 * 
 * Teste l'orchestration complète de la création d'une dépense
 */

import { CreateDepenseUseCase, type CreateDepenseInput } from '../CreateDepense';
import type { IFinanceRepository } from '../repositories/IFinanceRepository';
import type { Depense } from '../entities/Depense';

// Mocks
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('CreateDepenseUseCase - Integration', () => {
  let useCase: CreateDepenseUseCase;
  let mockRepository: jest.Mocked<IFinanceRepository>;

  const mockDepense: Depense = {
    id: 'depense-1',
    projetId: 'projet-1',
    montant: 50000,
    categorie: 'aliment',
    libelleCategorie: 'Aliments',
    date: '2024-01-15',
    commentaire: 'Achat d\'aliments',
    photos: [],
    dateCreation: '2024-01-15T00:00:00Z',
    derniereModification: '2024-01-15T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      createDepense: jest.fn(),
      createRevenu: jest.fn(),
      createChargeFixe: jest.fn(),
      findDepenseById: jest.fn(),
      findDepensesByProjet: jest.fn(),
      findDepensesByPeriod: jest.fn(),
      updateDepense: jest.fn(),
      deleteDepense: jest.fn(),
      findRevenuById: jest.fn(),
      findRevenusByProjet: jest.fn(),
      findRevenusByPeriod: jest.fn(),
      updateRevenu: jest.fn(),
      deleteRevenu: jest.fn(),
      findChargeFixeById: jest.fn(),
      findChargesFixesByProjet: jest.fn(),
      findChargesFixesActives: jest.fn(),
      updateChargeFixe: jest.fn(),
      deleteChargeFixe: jest.fn(),
    } as any;

    useCase = new CreateDepenseUseCase(mockRepository);
  });

  describe('execute', () => {
    it('devrait créer une dépense avec succès', async () => {
      const input: CreateDepenseInput = {
        projetId: 'projet-1',
        montant: 50000,
        categorie: 'aliment',
        date: '2024-01-15',
        commentaire: 'Achat d\'aliments',
      };

      mockRepository.createDepense.mockResolvedValueOnce(mockDepense);

      const result = await useCase.execute(input);

      expect(mockRepository.createDepense).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.montant).toBe(50000);
    });

    it('devrait rejeter si le projet n\'est pas fourni', async () => {
      const input: CreateDepenseInput = {
        projetId: '',
        montant: 50000,
        categorie: 'aliment',
        date: '2024-01-15',
      };

      await expect(useCase.execute(input)).rejects.toThrow('Le projet est requis');
    });

    it('devrait rejeter si le montant est <= 0', async () => {
      const input: CreateDepenseInput = {
        projetId: 'projet-1',
        montant: 0,
        categorie: 'aliment',
        date: '2024-01-15',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Le montant doit être supérieur à 0'
      );
    });

    it('devrait rejeter si la date n\'est pas fournie', async () => {
      const input: CreateDepenseInput = {
        projetId: 'projet-1',
        montant: 50000,
        categorie: 'aliment',
        date: '',
      };

      await expect(useCase.execute(input)).rejects.toThrow('La date est requise');
    });

    it('devrait rejeter si la catégorie est vide', async () => {
      const input: CreateDepenseInput = {
        projetId: 'projet-1',
        montant: 50000,
        categorie: '',
        date: '2024-01-15',
      };

      await expect(useCase.execute(input)).rejects.toThrow('La catégorie est requise');
    });

    it('devrait rejeter si la date est dans le futur', async () => {
      const dateFutur = new Date();
      dateFutur.setDate(dateFutur.getDate() + 10);

      const input: CreateDepenseInput = {
        projetId: 'projet-1',
        montant: 50000,
        categorie: 'aliment',
        date: dateFutur.toISOString().split('T')[0],
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'La date de la dépense ne peut pas être dans le futur'
      );
    });
  });
});

