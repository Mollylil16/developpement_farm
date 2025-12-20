/**
 * Tests pour VaccinationInitializationService
 */

import { VaccinationInitializationService } from '../VaccinationInitializationService';
import { CalendrierVaccinationRepository } from '../../database/repositories/CalendrierVaccinationRepository';
import { PROTOCOLES_VACCINATION_STANDARD } from '../../types/sante';

jest.mock('../../database/repositories/CalendrierVaccinationRepository');
jest.mock('../../types/sante', () => ({
  PROTOCOLES_VACCINATION_STANDARD: [
    {
      nom: 'Protocole Test 1',
      maladie: 'Maladie Test 1',
      age_jours: 30,
      rappel_jours: 60,
      notes: 'Notes test 1',
    },
    {
      nom: 'Protocole Test 2',
      maladie: 'Maladie Test 2',
      age_jours: 45,
      rappel_jours: 90,
      notes: 'Notes test 2',
    },
  ],
}));

describe('VaccinationInitializationService', () => {
  let service: VaccinationInitializationService;
  let mockDb: any;
  let mockCalendrierRepo: jest.Mocked<CalendrierVaccinationRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      runAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };

    mockCalendrierRepo = {
      create: jest.fn(),
    } as any;

    (CalendrierVaccinationRepository as jest.Mock).mockImplementation(() => mockCalendrierRepo);
    service = new VaccinationInitializationService(mockDb);
  });

  describe('initProtocolesVaccinationStandard', () => {
    const projetId = 'projet-123';

    it('devrait créer tous les protocoles de vaccination standard', async () => {
      mockCalendrierRepo.create.mockResolvedValue({} as any);

      await service.initProtocolesVaccinationStandard(projetId);

      // Vérifier que tous les protocoles sont créés
      expect(mockCalendrierRepo.create).toHaveBeenCalledTimes(
        PROTOCOLES_VACCINATION_STANDARD.length
      );

      // Vérifier que chaque protocole est créé avec le bon projet_id
      PROTOCOLES_VACCINATION_STANDARD.forEach((protocole, index) => {
        const call = mockCalendrierRepo.create.mock.calls[index];
        expect(call[0]).toMatchObject({
          projet_id: projetId,
          nom: protocole.nom,
          maladie: protocole.maladie,
          age_jours: protocole.age_jours,
          rappel_jours: protocole.rappel_jours,
          notes: protocole.notes,
        });
      });
    });

    it("devrait créer les protocoles dans l'ordre", async () => {
      mockCalendrierRepo.create.mockResolvedValue({} as any);

      await service.initProtocolesVaccinationStandard(projetId);

      // Vérifier l'ordre des appels
      expect(mockCalendrierRepo.create.mock.calls[0][0].nom).toBe('Protocole Test 1');
      expect(mockCalendrierRepo.create.mock.calls[1][0].nom).toBe('Protocole Test 2');
    });

    it('devrait propager les erreurs si la création échoue', async () => {
      const error = new Error('Erreur de création');
      mockCalendrierRepo.create.mockRejectedValue(error);

      await expect(service.initProtocolesVaccinationStandard(projetId)).rejects.toThrow(
        'Erreur de création'
      );
    });

    it('devrait créer un nouveau repository pour chaque appel', async () => {
      mockCalendrierRepo.create.mockResolvedValue({} as any);

      await service.initProtocolesVaccinationStandard(projetId);

      // Vérifier que CalendrierVaccinationRepository est instancié avec la bonne DB
      expect(CalendrierVaccinationRepository).toHaveBeenCalledWith(mockDb);
    });

    it('devrait créer les protocoles avec toutes les propriétés', async () => {
      mockCalendrierRepo.create.mockResolvedValue({} as any);

      await service.initProtocolesVaccinationStandard(projetId);

      // Vérifier que chaque protocole contient toutes les propriétés nécessaires
      const firstCall = mockCalendrierRepo.create.mock.calls[0][0];
      expect(firstCall).toHaveProperty('projet_id');
      expect(firstCall).toHaveProperty('nom');
      expect(firstCall).toHaveProperty('maladie');
      expect(firstCall).toHaveProperty('age_jours');
      expect(firstCall).toHaveProperty('rappel_jours');
      expect(firstCall).toHaveProperty('notes');
    });
  });
});
