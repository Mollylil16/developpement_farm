/**
 * Tests pour SanteCoutsService
 */

import { SanteCoutsService } from '../sante/SanteCoutsService';
import { getDatabase } from '../database';
import {
  VaccinationRepository,
  TraitementRepository,
  VisiteVeterinaireRepository,
} from '../../database/repositories';

jest.mock('../database');
jest.mock('../../database/repositories');

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('SanteCoutsService', () => {
  let mockDb: any;
  let mockVaccinationRepo: jest.Mocked<VaccinationRepository>;
  let mockTraitementRepo: jest.Mocked<TraitementRepository>;
  let mockVisiteRepo: jest.Mocked<VisiteVeterinaireRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      runAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };
    mockGetDatabase.mockResolvedValue(mockDb);

    mockVaccinationRepo = {
      findByProjet: jest.fn(),
      query: jest.fn(),
    } as any;

    mockTraitementRepo = {
      findByProjet: jest.fn(),
      query: jest.fn(),
    } as any;

    mockVisiteRepo = {
      findByProjet: jest.fn(),
      query: jest.fn(),
    } as any;

    (VaccinationRepository as jest.Mock).mockImplementation(() => mockVaccinationRepo);
    (TraitementRepository as jest.Mock).mockImplementation(() => mockTraitementRepo);
    (VisiteVeterinaireRepository as jest.Mock).mockImplementation(() => mockVisiteRepo);
  });

  describe('getCouts', () => {
    const projetId = 'projet-123';

    it('devrait calculer les coûts totaux correctement', async () => {
      const mockVaccinations = [
        { id: 'v1', cout: 5000 },
        { id: 'v2', cout: 3000 },
        { id: 'v3', cout: null }, // Doit être ignoré
      ];

      const mockTraitements = [
        { id: 't1', cout: 10000 },
        { id: 't2', cout: 5000 },
      ];

      const mockVisites = [
        { id: 'vis1', cout: 15000 },
        { id: 'vis2', cout: 20000 },
      ];

      mockVaccinationRepo.findByProjet.mockResolvedValue(mockVaccinations as any);
      mockTraitementRepo.findByProjet.mockResolvedValue(mockTraitements as any);
      mockVisiteRepo.findByProjet.mockResolvedValue(mockVisites as any);

      const result = await SanteCoutsService.getCouts(projetId);

      expect(result.vaccinations).toBe(8000); // 5000 + 3000
      expect(result.traitements).toBe(15000); // 10000 + 5000
      expect(result.visites).toBe(35000); // 15000 + 20000
      expect(result.total).toBe(58000); // 8000 + 15000 + 35000
    });

    it('devrait retourner zéro si aucun coût', async () => {
      mockVaccinationRepo.findByProjet.mockResolvedValue([]);
      mockTraitementRepo.findByProjet.mockResolvedValue([]);
      mockVisiteRepo.findByProjet.mockResolvedValue([]);

      const result = await SanteCoutsService.getCouts(projetId);

      expect(result.vaccinations).toBe(0);
      expect(result.traitements).toBe(0);
      expect(result.visites).toBe(0);
      expect(result.total).toBe(0);
    });

    it('devrait ignorer les coûts null ou undefined', async () => {
      const mockVaccinations = [
        { id: 'v1', cout: 5000 },
        { id: 'v2', cout: null },
        { id: 'v3', cout: undefined },
      ];

      mockVaccinationRepo.findByProjet.mockResolvedValue(mockVaccinations as any);
      mockTraitementRepo.findByProjet.mockResolvedValue([]);
      mockVisiteRepo.findByProjet.mockResolvedValue([]);

      const result = await SanteCoutsService.getCouts(projetId);

      expect(result.vaccinations).toBe(5000);
      expect(result.total).toBe(5000);
    });

    it('devrait gérer les valeurs de coût à zéro', async () => {
      const mockVaccinations = [{ id: 'v1', cout: 0 }];
      const mockTraitements = [{ id: 't1', cout: 0 }];
      const mockVisites = [{ id: 'vis1', cout: 0 }];

      mockVaccinationRepo.findByProjet.mockResolvedValue(mockVaccinations as any);
      mockTraitementRepo.findByProjet.mockResolvedValue(mockTraitements as any);
      mockVisiteRepo.findByProjet.mockResolvedValue(mockVisites as any);

      const result = await SanteCoutsService.getCouts(projetId);

      expect(result.vaccinations).toBe(0);
      expect(result.traitements).toBe(0);
      expect(result.visites).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getCoutsPeriode', () => {
    const projetId = 'projet-123';
    const dateDebut = '2024-01-01';
    const dateFin = '2024-01-31';

    it('devrait calculer les coûts sur une période avec détails', async () => {
      const mockVaccinations = [
        { id: 'v1', cout: 5000, date_vaccination: '2024-01-15' },
        { id: 'v2', cout: 3000, date_vaccination: '2024-01-20' },
      ];

      const mockTraitements = [
        { id: 't1', cout: 10000, date_debut: '2024-01-10' },
      ];

      const mockVisites = [
        { id: 'vis1', cout: 15000, date_visite: '2024-01-05' },
      ];

      mockVaccinationRepo.query.mockResolvedValue(mockVaccinations as any);
      mockTraitementRepo.query.mockResolvedValue(mockTraitements as any);
      mockVisiteRepo.query.mockResolvedValue(mockVisites as any);

      const result = await SanteCoutsService.getCoutsPeriode(projetId, dateDebut, dateFin);

      expect(result.vaccinations).toBe(8000);
      expect(result.traitements).toBe(10000);
      expect(result.visites).toBe(15000);
      expect(result.total).toBe(33000);
      expect(result.details.vaccinations).toEqual(mockVaccinations);
      expect(result.details.traitements).toEqual(mockTraitements);
      expect(result.details.visites).toEqual(mockVisites);
    });

    it('devrait filtrer les éléments sans coût', async () => {
      const mockVaccinations = [
        { id: 'v1', cout: 5000, date_vaccination: '2024-01-15' },
        { id: 'v2', cout: null, date_vaccination: '2024-01-20' }, // Ignoré par la requête SQL
      ];

      mockVaccinationRepo.query.mockResolvedValue(mockVaccinations.filter(v => v.cout !== null) as any);
      mockTraitementRepo.query.mockResolvedValue([]);
      mockVisiteRepo.query.mockResolvedValue([]);

      const result = await SanteCoutsService.getCoutsPeriode(projetId, dateDebut, dateFin);

      expect(result.vaccinations).toBe(5000);
      expect(result.details.vaccinations).toHaveLength(1);
    });

    it('devrait utiliser les bonnes requêtes SQL avec les dates', async () => {
      mockVaccinationRepo.query.mockResolvedValue([]);
      mockTraitementRepo.query.mockResolvedValue([]);
      mockVisiteRepo.query.mockResolvedValue([]);

      await SanteCoutsService.getCoutsPeriode(projetId, dateDebut, dateFin);

      expect(mockVaccinationRepo.query).toHaveBeenCalledWith(
        expect.stringContaining('date_vaccination BETWEEN'),
        [projetId, dateDebut, dateFin]
      );

      expect(mockTraitementRepo.query).toHaveBeenCalledWith(
        expect.stringContaining('date_debut BETWEEN'),
        [projetId, dateDebut, dateFin]
      );

      expect(mockVisiteRepo.query).toHaveBeenCalledWith(
        expect.stringContaining('date_visite BETWEEN'),
        [projetId, dateDebut, dateFin]
      );
    });

    it('devrait retourner un objet vide si aucune donnée dans la période', async () => {
      mockVaccinationRepo.query.mockResolvedValue([]);
      mockTraitementRepo.query.mockResolvedValue([]);
      mockVisiteRepo.query.mockResolvedValue([]);

      const result = await SanteCoutsService.getCoutsPeriode(projetId, dateDebut, dateFin);

      expect(result.vaccinations).toBe(0);
      expect(result.traitements).toBe(0);
      expect(result.visites).toBe(0);
      expect(result.total).toBe(0);
      expect(result.details.vaccinations).toEqual([]);
      expect(result.details.traitements).toEqual([]);
      expect(result.details.visites).toEqual([]);
    });

    it('devrait gérer les coûts à zéro dans les détails', async () => {
      const mockVaccinations = [
        { id: 'v1', cout: 0, date_vaccination: '2024-01-15' },
      ];

      mockVaccinationRepo.query.mockResolvedValue(mockVaccinations as any);
      mockTraitementRepo.query.mockResolvedValue([]);
      mockVisiteRepo.query.mockResolvedValue([]);

      const result = await SanteCoutsService.getCoutsPeriode(projetId, dateDebut, dateFin);

      expect(result.vaccinations).toBe(0);
      expect(result.details.vaccinations).toHaveLength(1);
      expect(result.details.vaccinations[0].cout).toBe(0);
    });
  });
});

