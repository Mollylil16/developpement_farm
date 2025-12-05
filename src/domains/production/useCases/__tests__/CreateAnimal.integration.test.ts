/**
 * Tests d'intégration pour CreateAnimalUseCase
 * 
 * Teste l'orchestration complète de la création d'un animal
 */

import { CreateAnimalUseCase, type CreateAnimalInput } from '../CreateAnimal';
import type { IAnimalRepository } from '../repositories/IAnimalRepository';
import type { Animal } from '../entities/Animal';

// Mocks
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('CreateAnimalUseCase - Integration', () => {
  let useCase: CreateAnimalUseCase;
  let mockRepository: jest.Mocked<IAnimalRepository>;

  const mockAnimal: Animal = {
    id: 'animal-1',
    code: 'TR-001',
    nom: 'Truie Test',
    projetId: 'projet-1',
    sexe: 'femelle',
    dateNaissance: '2024-01-01',
    poidsInitial: 150,
    dateEntree: '2024-01-01',
    actif: true,
    statut: 'actif',
    race: 'Large White',
    reproducteur: true,
    pereId: undefined,
    mereId: undefined,
    notes: 'Test animal',
    photoUri: undefined,
    dateCreation: '2024-01-01T00:00:00Z',
    derniereModification: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByProjet: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    useCase = new CreateAnimalUseCase(mockRepository);
  });

  describe('execute', () => {
    it('devrait créer un animal avec succès', async () => {
      const input: CreateAnimalInput = {
        code: 'TR-002',
        nom: 'Nouvelle Truie',
        projetId: 'projet-1',
        sexe: 'femelle',
        dateNaissance: '2024-01-01',
        race: 'Large White',
      };

      mockRepository.findByProjet.mockResolvedValueOnce([]);
      mockRepository.create.mockResolvedValueOnce({
        ...mockAnimal,
        code: 'TR-002',
        nom: 'Nouvelle Truie',
      });

      const result = await useCase.execute(input);

      expect(mockRepository.findByProjet).toHaveBeenCalledWith('projet-1');
      expect(mockRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.code).toBe('TR-002');
    });

    it('devrait rejeter si le code est vide', async () => {
      const input: CreateAnimalInput = {
        code: '',
        projetId: 'projet-1',
        sexe: 'femelle',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Le code de l\'animal est requis'
      );
    });

    it('devrait rejeter si le projet n\'est pas fourni', async () => {
      const input: CreateAnimalInput = {
        code: 'TR-002',
        projetId: '',
        sexe: 'femelle',
      };

      await expect(useCase.execute(input)).rejects.toThrow('Le projet est requis');
    });

    it('devrait rejeter si le code existe déjà', async () => {
      const input: CreateAnimalInput = {
        code: 'TR-001',
        projetId: 'projet-1',
        sexe: 'femelle',
      };

      mockRepository.findByProjet.mockResolvedValueOnce([mockAnimal]);

      await expect(useCase.execute(input)).rejects.toThrow(
        'Un animal avec le code TR-001 existe déjà dans ce projet'
      );
    });

    it('devrait valider le père si spécifié', async () => {
      const pere: Animal = {
        ...mockAnimal,
        id: 'pere-1',
        code: 'VR-001',
        sexe: 'male',
      };

      const input: CreateAnimalInput = {
        code: 'TR-002',
        projetId: 'projet-1',
        sexe: 'femelle',
        pereId: 'pere-1',
      };

      mockRepository.findByProjet.mockResolvedValueOnce([]);
      mockRepository.findById.mockResolvedValueOnce(pere);
      mockRepository.create.mockResolvedValueOnce({
        ...mockAnimal,
        code: 'TR-002',
        pereId: 'pere-1',
      });

      const result = await useCase.execute(input);

      expect(mockRepository.findById).toHaveBeenCalledWith('pere-1');
      expect(result).toBeDefined();
    });

    it('devrait rejeter si le père n\'existe pas', async () => {
      const input: CreateAnimalInput = {
        code: 'TR-002',
        projetId: 'projet-1',
        sexe: 'femelle',
        pereId: 'pere-inexistant',
      };

      mockRepository.findByProjet.mockResolvedValueOnce([]);
      mockRepository.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute(input)).rejects.toThrow(
        'Le père spécifié n\'existe pas'
      );
    });

    it('devrait rejeter si le père n\'est pas un mâle', async () => {
      const pere: Animal = {
        ...mockAnimal,
        id: 'pere-1',
        sexe: 'femelle',
      };

      const input: CreateAnimalInput = {
        code: 'TR-002',
        projetId: 'projet-1',
        sexe: 'femelle',
        pereId: 'pere-1',
      };

      mockRepository.findByProjet.mockResolvedValueOnce([]);
      mockRepository.findById.mockResolvedValueOnce(pere);

      await expect(useCase.execute(input)).rejects.toThrow(
        'Le père doit être un mâle'
      );
    });

    it('devrait valider la mère si spécifiée', async () => {
      const mere: Animal = {
        ...mockAnimal,
        id: 'mere-1',
        code: 'TR-001',
        sexe: 'femelle',
      };

      const input: CreateAnimalInput = {
        code: 'TR-002',
        projetId: 'projet-1',
        sexe: 'femelle',
        mereId: 'mere-1',
      };

      mockRepository.findByProjet.mockResolvedValueOnce([]);
      mockRepository.findById.mockResolvedValueOnce(mere);
      mockRepository.create.mockResolvedValueOnce({
        ...mockAnimal,
        code: 'TR-002',
        mereId: 'mere-1',
      });

      const result = await useCase.execute(input);

      expect(mockRepository.findById).toHaveBeenCalledWith('mere-1');
      expect(result).toBeDefined();
    });

    it('devrait rejeter si la mère n\'est pas une femelle', async () => {
      const mere: Animal = {
        ...mockAnimal,
        id: 'mere-1',
        sexe: 'male',
      };

      const input: CreateAnimalInput = {
        code: 'TR-002',
        projetId: 'projet-1',
        sexe: 'femelle',
        mereId: 'mere-1',
      };

      mockRepository.findByProjet.mockResolvedValueOnce([]);
      mockRepository.findById.mockResolvedValueOnce(mere);

      await expect(useCase.execute(input)).rejects.toThrow(
        'La mère doit être une femelle'
      );
    });

    it('devrait rejeter si un reproducteur est trop jeune', async () => {
      const dateNaissance = new Date();
      dateNaissance.setDate(dateNaissance.getDate() - 200); // Moins de 8 mois

      const input: CreateAnimalInput = {
        code: 'TR-002',
        projetId: 'projet-1',
        sexe: 'femelle',
        dateNaissance: dateNaissance.toISOString().split('T')[0],
        reproducteur: true,
      };

      mockRepository.findByProjet.mockResolvedValueOnce([]);

      await expect(useCase.execute(input)).rejects.toThrow(
        'L\'animal est trop jeune pour être reproducteur (minimum 8 mois)'
      );
    });
  });
});

