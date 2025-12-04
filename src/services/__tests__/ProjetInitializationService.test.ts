/**
 * Tests pour ProjetInitializationService
 */

import { ProjetInitializationService } from '../ProjetInitializationService';
import { AnimalRepository } from '../../database/repositories/AnimalRepository';
import { genererPlusieursNomsAleatoires } from '../../utils/nameGenerator';

jest.mock('../../database/repositories/AnimalRepository');
jest.mock('../../utils/nameGenerator');

const mockGenererPlusieursNomsAleatoires = genererPlusieursNomsAleatoires as jest.MockedFunction<typeof genererPlusieursNomsAleatoires>;

describe('ProjetInitializationService', () => {
  let service: ProjetInitializationService;
  let mockDb: any;
  let mockAnimalRepo: jest.Mocked<AnimalRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      runAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };

    mockAnimalRepo = {
      findByProjet: jest.fn(),
      create: jest.fn(),
    } as any;

    (AnimalRepository as jest.Mock).mockImplementation(() => mockAnimalRepo);
    service = new ProjetInitializationService(mockDb);
  });

  describe('createAnimauxInitials', () => {
    const projetId = 'projet-123';
    const effectifs = {
      nombre_truies: 2,
      nombre_verrats: 1,
      nombre_porcelets: 5,
    };

    it('devrait créer les animaux initiaux avec des codes uniques', async () => {
      mockAnimalRepo.findByProjet.mockResolvedValue([]);
      mockGenererPlusieursNomsAleatoires
        .mockReturnValueOnce(['Truie1', 'Truie2']) // nomsFeminins
        .mockReturnValueOnce(['Verrat1']) // nomsMasculins
        .mockReturnValueOnce(['Porc1', 'Porc2', 'Porc3', 'Porc4', 'Porc5']); // nomsPorcelets

      mockAnimalRepo.create.mockResolvedValue({} as any);

      await service.createAnimauxInitials(projetId, effectifs);

      // Vérifier que les animaux sont créés
      expect(mockAnimalRepo.create).toHaveBeenCalledTimes(8); // 2 truies + 1 verrat + 5 porcelets

      // Vérifier les truies
      const truieCalls = mockAnimalRepo.create.mock.calls.filter(
        call => call[0].code.startsWith('T')
      );
      expect(truieCalls).toHaveLength(2);
      expect(truieCalls[0][0].code).toBe('T001');
      expect(truieCalls[0][0].sexe).toBe('femelle');
      expect(truieCalls[0][0].reproducteur).toBe(true);
      expect(truieCalls[0][0].nom).toBe('Truie1');

      // Vérifier les verrats
      const verratCalls = mockAnimalRepo.create.mock.calls.filter(
        call => call[0].code.startsWith('V')
      );
      expect(verratCalls).toHaveLength(1);
      expect(verratCalls[0][0].code).toBe('V001');
      expect(verratCalls[0][0].sexe).toBe('male');
      expect(verratCalls[0][0].reproducteur).toBe(true);
      expect(verratCalls[0][0].nom).toBe('Verrat1');

      // Vérifier les porcelets
      const porceletCalls = mockAnimalRepo.create.mock.calls.filter(
        call => call[0].code.startsWith('P')
      );
      expect(porceletCalls).toHaveLength(5);
      expect(porceletCalls[0][0].code).toBe('P001');
      expect(porceletCalls[0][0].sexe).toBe('indetermine');
      expect(porceletCalls[0][0].reproducteur).toBe(false);
    });

    it('devrait générer des codes uniques en évitant les doublons', async () => {
      const animauxExistants = [
        { id: 'a1', code: 'T001', nom: 'TruieExistante' },
        { id: 'a2', code: 'V001', nom: 'VerratExistant' },
        { id: 'a3', code: 'P001', nom: 'PorceletExistant' },
      ];

      mockAnimalRepo.findByProjet.mockResolvedValue(animauxExistants as any);
      mockGenererPlusieursNomsAleatoires
        .mockReturnValueOnce(['Truie1', 'Truie2'])
        .mockReturnValueOnce(['Verrat1'])
        .mockReturnValueOnce(['Porc1', 'Porc2', 'Porc3', 'Porc4', 'Porc5']);

      mockAnimalRepo.create.mockResolvedValue({} as any);

      await service.createAnimauxInitials(projetId, effectifs);

      // Vérifier que les codes commencent après les existants
      const truieCalls = mockAnimalRepo.create.mock.calls.filter(
        call => call[0].code.startsWith('T')
      );
      expect(truieCalls[0][0].code).toBe('T002'); // Après T001
      expect(truieCalls[1][0].code).toBe('T003');

      const verratCalls = mockAnimalRepo.create.mock.calls.filter(
        call => call[0].code.startsWith('V')
      );
      expect(verratCalls[0][0].code).toBe('V002'); // Après V001

      const porceletCalls = mockAnimalRepo.create.mock.calls.filter(
        call => call[0].code.startsWith('P')
      );
      expect(porceletCalls[0][0].code).toBe('P002'); // Après P001
    });

    it('devrait générer des noms uniques par genre', async () => {
      mockAnimalRepo.findByProjet.mockResolvedValue([]);
      mockGenererPlusieursNomsAleatoires
        .mockReturnValueOnce(['Truie1', 'Truie2'])
        .mockReturnValueOnce(['Verrat1'])
        .mockReturnValueOnce(['Porc1', 'Porc2', 'Porc3', 'Porc4', 'Porc5']);

      mockAnimalRepo.create.mockResolvedValue({} as any);

      await service.createAnimauxInitials(projetId, effectifs);

      // Vérifier que genererPlusieursNomsAleatoires est appelé avec les bons paramètres
      expect(mockGenererPlusieursNomsAleatoires).toHaveBeenCalledTimes(3);
      
      // Vérifier l'appel pour les truies (féminins)
      expect(mockGenererPlusieursNomsAleatoires).toHaveBeenNthCalledWith(
        1,
        2, // nombre_truies
        [],
        'tous',
        'femelle'
      );

      // Vérifier l'appel pour les verrats (masculins) - vérifier seulement les paramètres essentiels
      const verratCall = mockGenererPlusieursNomsAleatoires.mock.calls[1];
      expect(verratCall[0]).toBe(1); // nombre_verrats
      expect(verratCall[2]).toBe('tous');
      expect(verratCall[3]).toBe('male');

      // Vérifier l'appel pour les porcelets (indéterminé)
      const porceletCall = mockGenererPlusieursNomsAleatoires.mock.calls[2];
      expect(porceletCall[0]).toBe(5); // nombre_porcelets
      expect(porceletCall[2]).toBe('tous');
      expect(porceletCall[3]).toBe('indetermine');
    });

    it('devrait créer des animaux avec les bonnes propriétés par défaut', async () => {
      mockAnimalRepo.findByProjet.mockResolvedValue([]);
      mockGenererPlusieursNomsAleatoires
        .mockReturnValueOnce(['Truie1'])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      mockAnimalRepo.create.mockResolvedValue({} as any);

      await service.createAnimauxInitials(projetId, {
        nombre_truies: 1,
        nombre_verrats: 0,
        nombre_porcelets: 0,
      });

      const createCall = mockAnimalRepo.create.mock.calls[0][0];
      
      expect(createCall.projet_id).toBe(projetId);
      expect(createCall.code).toBe('T001');
      expect(createCall.nom).toBe('Truie1');
      expect(createCall.sexe).toBe('femelle');
      expect(createCall.reproducteur).toBe(true);
      expect(createCall.statut).toBe('actif');
      expect(createCall.date_naissance).toBeUndefined();
      expect(createCall.poids_initial).toBeUndefined();
      expect(createCall.date_entree).toBeUndefined();
      expect(createCall.race).toBeUndefined();
      expect(createCall.origine).toBeUndefined();
      expect(createCall.notes).toBe("Créé lors de l'initialisation du projet");
      expect(createCall.pere_id).toBeNull();
      expect(createCall.mere_id).toBeNull();
    });

    it('devrait gérer le cas où aucun animal n\'est à créer', async () => {
      mockAnimalRepo.findByProjet.mockResolvedValue([]);
      // Le code appelle genererPlusieursNomsAleatoires même avec 0, donc on doit mocker
      mockGenererPlusieursNomsAleatoires
        .mockReturnValueOnce([]) // nomsFeminins
        .mockReturnValueOnce([]) // nomsMasculins
        .mockReturnValueOnce([]); // nomsPorcelets

      await service.createAnimauxInitials(projetId, {
        nombre_truies: 0,
        nombre_verrats: 0,
        nombre_porcelets: 0,
      });

      expect(mockAnimalRepo.create).not.toHaveBeenCalled();
      // Le code appelle genererPlusieursNomsAleatoires même si les effectifs sont à 0
      expect(mockGenererPlusieursNomsAleatoires).toHaveBeenCalledTimes(3);
    });

    it('devrait gérer les animaux existants avec noms', async () => {
      const animauxExistants = [
        { id: 'a1', code: 'T001', nom: 'TruieExistante' },
        { id: 'a2', code: 'T002', nom: 'TruieExistante2' },
      ];

      mockAnimalRepo.findByProjet.mockResolvedValue(animauxExistants as any);
      mockGenererPlusieursNomsAleatoires
        .mockReturnValueOnce(['NouvelleTruie1', 'NouvelleTruie2'])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      mockAnimalRepo.create.mockResolvedValue({} as any);

      await service.createAnimauxInitials(projetId, {
        nombre_truies: 2,
        nombre_verrats: 0,
        nombre_porcelets: 0,
      });

      // Vérifier que les noms existants sont passés pour éviter les doublons
      expect(mockGenererPlusieursNomsAleatoires).toHaveBeenNthCalledWith(
        1,
        2,
        ['TruieExistante', 'TruieExistante2'],
        'tous',
        'femelle'
      );
    });

    it('devrait gérer les codes avec numéros élevés', async () => {
      const animauxExistants = [
        { id: 'a1', code: 'T099', nom: 'Truie99' },
        { id: 'a2', code: 'V050', nom: 'Verrat50' },
        { id: 'a3', code: 'P200', nom: 'Porcelet200' },
      ];

      mockAnimalRepo.findByProjet.mockResolvedValue(animauxExistants as any);
      mockGenererPlusieursNomsAleatoires
        .mockReturnValueOnce(['Truie1'])
        .mockReturnValueOnce(['Verrat1'])
        .mockReturnValueOnce(['Porc1']);

      mockAnimalRepo.create.mockResolvedValue({} as any);

      await service.createAnimauxInitials(projetId, {
        nombre_truies: 1,
        nombre_verrats: 1,
        nombre_porcelets: 1,
      });

      const truieCall = mockAnimalRepo.create.mock.calls.find(
        call => call[0].code.startsWith('T')
      );
      expect(truieCall?.[0].code).toBe('T100'); // Après T099

      const verratCall = mockAnimalRepo.create.mock.calls.find(
        call => call[0].code.startsWith('V')
      );
      expect(verratCall?.[0].code).toBe('V051'); // Après V050

      const porceletCall = mockAnimalRepo.create.mock.calls.find(
        call => call[0].code.startsWith('P')
      );
      expect(porceletCall?.[0].code).toBe('P201'); // Après P200
    });
  });
});

