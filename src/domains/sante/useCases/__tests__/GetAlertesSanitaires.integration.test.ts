/**
 * Tests d'intégration pour GetAlertesSanitairesUseCase
 */

import { GetAlertesSanitairesUseCase } from '../GetAlertesSanitaires';
import type { ISanteRepository } from '../repositories/ISanteRepository';
import type { Vaccination } from '../entities/Vaccination';
import type { Maladie } from '../entities/Maladie';

describe('GetAlertesSanitairesUseCase - Integration', () => {
  let useCase: GetAlertesSanitairesUseCase;
  let mockRepository: jest.Mocked<ISanteRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      findVaccinationsEnRetard: jest.fn(),
      findVaccinationsByProjet: jest.fn(),
      findMaladiesEnCours: jest.fn(),
    } as any;

    useCase = new GetAlertesSanitairesUseCase(mockRepository);
  });

  describe('execute', () => {
    it('devrait retourner les alertes de vaccination en retard', async () => {
      const projetId = 'projet-1';
      const dateVaccination = new Date();
      dateVaccination.setDate(dateVaccination.getDate() - 10);

      const vaccinationEnRetard: Vaccination = {
        id: 'vacc-1',
        projetId,
        animalId: 'animal-1',
        nomVaccin: 'Vaccin Test',
        dateVaccination: dateVaccination.toISOString().split('T')[0],
        statut: 'en_retard',
        dateCreation: '2024-01-01T00:00:00Z',
        derniereModification: '2024-01-01T00:00:00Z',
      };

      mockRepository.findVaccinationsEnRetard.mockResolvedValueOnce([
        vaccinationEnRetard,
      ]);
      mockRepository.findVaccinationsByProjet.mockResolvedValueOnce([]);
      mockRepository.findMaladiesEnCours.mockResolvedValueOnce([]);

      const result = await useCase.execute(projetId);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('vaccination_retard');
      expect(result[0].priorite).toBe('haute');
    });

    it('devrait retourner les alertes de rappel de vaccination', async () => {
      const projetId = 'projet-1';
      const dateRappel = new Date();
      dateRappel.setDate(dateRappel.getDate() - 1);

      const vaccination: Vaccination = {
        id: 'vacc-1',
        projetId,
        animalId: 'animal-1',
        nomVaccin: 'Vaccin Test',
        dateVaccination: '2024-01-01',
        dateRappel: dateRappel.toISOString().split('T')[0],
        statut: 'planifie',
        dateCreation: '2024-01-01T00:00:00Z',
        derniereModification: '2024-01-01T00:00:00Z',
      };

      mockRepository.findVaccinationsEnRetard.mockResolvedValueOnce([]);
      mockRepository.findVaccinationsByProjet.mockResolvedValueOnce([vaccination]);
      mockRepository.findMaladiesEnCours.mockResolvedValueOnce([]);

      const result = await useCase.execute(projetId);

      expect(result.length).toBeGreaterThan(0);
      const rappelAlerte = result.find(a => a.type === 'vaccination_rappel');
      expect(rappelAlerte).toBeDefined();
      expect(rappelAlerte?.priorite).toBe('moyenne');
    });

    it('devrait retourner les alertes de maladie critique', async () => {
      const projetId = 'projet-1';

      const maladieCritique: Maladie = {
        id: 'maladie-1',
        projetId,
        animalId: 'animal-1',
        type: 'respiratoire',
        nomMaladie: 'Maladie critique',
        gravite: 'critique',
        dateDebut: '2024-01-15',
        symptomes: 'Symptômes graves',
        contagieux: false,
        gueri: false,
        dateCreation: '2024-01-15T00:00:00Z',
        derniereModification: '2024-01-15T00:00:00Z',
      };

      mockRepository.findVaccinationsEnRetard.mockResolvedValueOnce([]);
      mockRepository.findVaccinationsByProjet.mockResolvedValueOnce([]);
      mockRepository.findMaladiesEnCours.mockResolvedValueOnce([maladieCritique]);

      const result = await useCase.execute(projetId);

      expect(result.length).toBeGreaterThan(0);
      const maladieAlerte = result.find(a => a.type === 'maladie_critique');
      expect(maladieAlerte).toBeDefined();
      expect(maladieAlerte?.priorite).toBe('haute');
    });

    it('devrait trier les alertes par priorité', async () => {
      const projetId = 'projet-1';

      mockRepository.findVaccinationsEnRetard.mockResolvedValueOnce([]);
      mockRepository.findVaccinationsByProjet.mockResolvedValueOnce([]);
      mockRepository.findMaladiesEnCours.mockResolvedValueOnce([]);

      const result = await useCase.execute(projetId);

      // Vérifier que les alertes sont triées (haute < moyenne < basse)
      for (let i = 0; i < result.length - 1; i++) {
        const prioriteOrder = { haute: 0, moyenne: 1, basse: 2 };
        expect(prioriteOrder[result[i].priorite]).toBeLessThanOrEqual(
          prioriteOrder[result[i + 1].priorite]
        );
      }
    });
  });
});

