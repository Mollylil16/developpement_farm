/**
 * Tests d'intégration pour UpdateAnimalUseCase
 */

import { UpdateAnimalUseCase, type UpdateAnimalInput } from '../UpdateAnimal';
import type { IAnimalRepository } from '../repositories/IAnimalRepository';
import type { Animal } from '../entities/Animal';

describe('UpdateAnimalUseCase - Integration', () => {
  let useCase: UpdateAnimalUseCase;
  let mockRepository: jest.Mocked<IAnimalRepository>;

  const mockAnimal: Animal = {
    id: 'animal-1',
    code: 'TR-001',
    nom: 'Truie Test',
    projetId: 'projet-1',
    sexe: 'femelle',
    dateNaissance: '2023-01-01', // Plus de 8 mois
    poidsInitial: 150,
    dateEntree: '2023-01-01',
    actif: true,
    statut: 'actif',
    race: 'Large White',
    reproducteur: false,
    pereId: undefined,
    mereId: undefined,
    notes: 'Test animal',
    photoUri: undefined,
    dateCreation: '2023-01-01T00:00:00Z',
    derniereModification: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      findById: jest.fn(),
      findByProjet: jest.fn(),
      update: jest.fn(),
    } as any;

    useCase = new UpdateAnimalUseCase(mockRepository);
  });

  describe('execute', () => {
    it('devrait mettre à jour un animal avec succès', async () => {
      const input: UpdateAnimalInput = {
        id: 'animal-1',
        nom: 'Truie Modifiée',
      };

      mockRepository.findById.mockResolvedValueOnce(mockAnimal);
      mockRepository.update.mockResolvedValueOnce({
        ...mockAnimal,
        nom: 'Truie Modifiée',
      });

      const result = await useCase.execute(input);

      expect(mockRepository.findById).toHaveBeenCalledWith('animal-1');
      expect(mockRepository.update).toHaveBeenCalled();
      expect(result.nom).toBe('Truie Modifiée');
    });

    it('devrait rejeter si l\'animal n\'existe pas', async () => {
      const input: UpdateAnimalInput = {
        id: 'animal-inexistant',
        nom: 'Nouveau nom',
      };

      mockRepository.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute(input)).rejects.toThrow(
        'Animal avec l\'ID animal-inexistant introuvable'
      );
    });

    it('devrait rejeter si le code est vide (après trim)', async () => {
      const input: UpdateAnimalInput = {
        id: 'animal-1',
        code: '   ', // Espaces qui seront trimés
      };

      mockRepository.findById.mockResolvedValueOnce(mockAnimal);

      await expect(useCase.execute(input)).rejects.toThrow(
        'Le code de l\'animal ne peut pas être vide'
      );
    });

    it('devrait rejeter si le code existe déjà', async () => {
      const input: UpdateAnimalInput = {
        id: 'animal-1',
        code: 'TR-002',
      };

      const autreAnimal: Animal = {
        ...mockAnimal,
        id: 'animal-2',
        code: 'TR-002',
      };

      mockRepository.findById.mockResolvedValueOnce(mockAnimal);
      mockRepository.findByProjet.mockResolvedValueOnce([mockAnimal, autreAnimal]);

      await expect(useCase.execute(input)).rejects.toThrow(
        'Un animal avec le code TR-002 existe déjà dans ce projet'
      );
    });

    it('devrait désactiver l\'animal si actif = false', async () => {
      const input: UpdateAnimalInput = {
        id: 'animal-1',
        actif: false,
      };

      mockRepository.findById.mockResolvedValueOnce(mockAnimal);
      mockRepository.update.mockResolvedValueOnce({
        ...mockAnimal,
        actif: false,
        statut: 'autre',
      });

      const result = await useCase.execute(input);

      expect(result.actif).toBe(false);
      expect(result.statut).toBe('autre');
    });

    it('devrait désactiver si le statut est "mort"', async () => {
      const input: UpdateAnimalInput = {
        id: 'animal-1',
        statut: 'mort',
      };

      mockRepository.findById.mockResolvedValueOnce(mockAnimal);
      mockRepository.update.mockResolvedValueOnce({
        ...mockAnimal,
        statut: 'mort',
        actif: false,
      });

      const result = await useCase.execute(input);

      expect(result.statut).toBe('mort');
      expect(result.actif).toBe(false);
    });
  });
});

