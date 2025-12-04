/**
 * Tests pour SanteRecommandationsService
 */

import { SanteRecommandationsService } from '../sante/SanteRecommandationsService';
import { getDatabase } from '../database';
import {
  RappelVaccinationRepository,
  MaladieRepository,
  TraitementRepository,
  VisiteVeterinaireRepository,
  MortaliteRepository,
} from '../../database/repositories';

jest.mock('../database');
jest.mock('../../database/repositories');

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('SanteRecommandationsService', () => {
  let mockDb: any;
  let mockRappelRepo: jest.Mocked<RappelVaccinationRepository>;
  let mockMaladieRepo: jest.Mocked<MaladieRepository>;
  let mockTraitementRepo: jest.Mocked<TraitementRepository>;
  let mockVisiteRepo: jest.Mocked<VisiteVeterinaireRepository>;
  let mockMortaliteRepo: jest.Mocked<MortaliteRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      runAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };
    mockGetDatabase.mockResolvedValue(mockDb);

    mockRappelRepo = {
      findEnRetard: jest.fn(),
      findAVenir: jest.fn(),
    } as any;

    mockMaladieRepo = {
      findEnCours: jest.fn(),
    } as any;

    mockTraitementRepo = {
      findEnCours: jest.fn(),
    } as any;

    mockVisiteRepo = {
      findProchaineVisitePrevue: jest.fn(),
    } as any;

    mockMortaliteRepo = {
      findByProjet: jest.fn(),
    } as any;

    (RappelVaccinationRepository as jest.Mock).mockImplementation(() => mockRappelRepo);
    (MaladieRepository as jest.Mock).mockImplementation(() => mockMaladieRepo);
    (TraitementRepository as jest.Mock).mockImplementation(() => mockTraitementRepo);
    (VisiteVeterinaireRepository as jest.Mock).mockImplementation(() => mockVisiteRepo);
    (MortaliteRepository as jest.Mock).mockImplementation(() => mockMortaliteRepo);
  });

  describe('getRecommandations', () => {
    const projetId = 'projet-123';

    it('devrait retourner des recommandations pour les rappels en retard', async () => {
      const mockRappelsEnRetard = [
        { id: 'r1', date_rappel: '2024-01-01' },
        { id: 'r2', date_rappel: '2024-01-02' },
      ];

      mockRappelRepo.findEnRetard.mockResolvedValue(mockRappelsEnRetard as any);
      mockRappelRepo.findAVenir.mockResolvedValue([]);
      mockMaladieRepo.findEnCours.mockResolvedValue([]);
      mockTraitementRepo.findEnCours.mockResolvedValue([]);
      mockVisiteRepo.findProchaineVisitePrevue.mockResolvedValue(null);

      const result = await SanteRecommandationsService.getRecommandations(projetId);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('vaccination');
      expect(result[0].priorite).toBe('haute');
      expect(result[0].message).toContain('2 rappel(s) de vaccination en retard');
      expect(result[0].data?.rappels).toEqual(mockRappelsEnRetard);
    });

    it('devrait retourner des recommandations pour les rappels à venir', async () => {
      const mockRappelsAVenir = [
        { id: 'r1', date_rappel: '2024-01-15' },
      ];

      mockRappelRepo.findEnRetard.mockResolvedValue([]);
      mockRappelRepo.findAVenir.mockResolvedValue(mockRappelsAVenir as any);
      mockMaladieRepo.findEnCours.mockResolvedValue([]);
      mockTraitementRepo.findEnCours.mockResolvedValue([]);
      mockVisiteRepo.findProchaineVisitePrevue.mockResolvedValue(null);

      const result = await SanteRecommandationsService.getRecommandations(projetId);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('vaccination');
      expect(result[0].priorite).toBe('moyenne');
      expect(result[0].message).toContain('1 vaccination(s) prévue(s) cette semaine');
    });

    it('devrait retourner une alerte pour les maladies critiques', async () => {
      const mockMaladiesEnCours = [
        { id: 'm1', gravite: 'critique' },
        { id: 'm2', gravite: 'moderee' },
        { id: 'm3', gravite: 'critique' },
      ];

      mockRappelRepo.findEnRetard.mockResolvedValue([]);
      mockRappelRepo.findAVenir.mockResolvedValue([]);
      mockMaladieRepo.findEnCours.mockResolvedValue(mockMaladiesEnCours as any);
      mockTraitementRepo.findEnCours.mockResolvedValue([]);
      mockVisiteRepo.findProchaineVisitePrevue.mockResolvedValue(null);

      const result = await SanteRecommandationsService.getRecommandations(projetId);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('alerte');
      expect(result[0].priorite).toBe('haute');
      expect(result[0].message).toContain('2 maladie(s) critique(s) en cours');
    });

    it('ne devrait pas créer d\'alerte si aucune maladie critique', async () => {
      const mockMaladiesEnCours = [
        { id: 'm1', gravite: 'moderee' },
        { id: 'm2', gravite: 'legere' },
      ];

      mockRappelRepo.findEnRetard.mockResolvedValue([]);
      mockRappelRepo.findAVenir.mockResolvedValue([]);
      mockMaladieRepo.findEnCours.mockResolvedValue(mockMaladiesEnCours as any);
      mockTraitementRepo.findEnCours.mockResolvedValue([]);
      mockVisiteRepo.findProchaineVisitePrevue.mockResolvedValue(null);

      const result = await SanteRecommandationsService.getRecommandations(projetId);

      expect(result).toHaveLength(0);
    });

    it('devrait retourner des recommandations pour les traitements en cours', async () => {
      const mockTraitementsEnCours = [
        { id: 't1' },
        { id: 't2' },
        { id: 't3' },
      ];

      mockRappelRepo.findEnRetard.mockResolvedValue([]);
      mockRappelRepo.findAVenir.mockResolvedValue([]);
      mockMaladieRepo.findEnCours.mockResolvedValue([]);
      mockTraitementRepo.findEnCours.mockResolvedValue(mockTraitementsEnCours as any);
      mockVisiteRepo.findProchaineVisitePrevue.mockResolvedValue(null);

      const result = await SanteRecommandationsService.getRecommandations(projetId);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('traitement');
      expect(result[0].priorite).toBe('moyenne');
      expect(result[0].message).toContain('3 traitement(s) en cours');
    });

    it('devrait retourner une recommandation pour la prochaine visite', async () => {
      const mockProchaineVisite = {
        id: 'vis1',
        prochaine_visite: '2024-01-20',
      };

      mockRappelRepo.findEnRetard.mockResolvedValue([]);
      mockRappelRepo.findAVenir.mockResolvedValue([]);
      mockMaladieRepo.findEnCours.mockResolvedValue([]);
      mockTraitementRepo.findEnCours.mockResolvedValue([]);
      mockVisiteRepo.findProchaineVisitePrevue.mockResolvedValue(mockProchaineVisite as any);

      const result = await SanteRecommandationsService.getRecommandations(projetId);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('visite');
      expect(result[0].priorite).toBe('basse');
      expect(result[0].message).toContain('Visite vétérinaire prévue');
      expect(result[0].data?.visite).toEqual(mockProchaineVisite);
    });

    it('devrait retourner toutes les recommandations combinées', async () => {
      const mockRappelsEnRetard = [{ id: 'r1' }];
      const mockRappelsAVenir = [{ id: 'r2' }];
      const mockMaladiesCritiques = [{ id: 'm1', gravite: 'critique' }];
      const mockTraitementsEnCours = [{ id: 't1' }];
      const mockProchaineVisite = { id: 'vis1', prochaine_visite: '2024-01-20' };

      mockRappelRepo.findEnRetard.mockResolvedValue(mockRappelsEnRetard as any);
      mockRappelRepo.findAVenir.mockResolvedValue(mockRappelsAVenir as any);
      mockMaladieRepo.findEnCours.mockResolvedValue(mockMaladiesCritiques as any);
      mockTraitementRepo.findEnCours.mockResolvedValue(mockTraitementsEnCours as any);
      mockVisiteRepo.findProchaineVisitePrevue.mockResolvedValue(mockProchaineVisite as any);

      const result = await SanteRecommandationsService.getRecommandations(projetId);

      expect(result).toHaveLength(5);
      expect(result.filter(r => r.type === 'vaccination')).toHaveLength(2);
      expect(result.filter(r => r.type === 'alerte')).toHaveLength(1);
      expect(result.filter(r => r.type === 'traitement')).toHaveLength(1);
      expect(result.filter(r => r.type === 'visite')).toHaveLength(1);
    });

    it('devrait retourner un tableau vide si aucune recommandation', async () => {
      mockRappelRepo.findEnRetard.mockResolvedValue([]);
      mockRappelRepo.findAVenir.mockResolvedValue([]);
      mockMaladieRepo.findEnCours.mockResolvedValue([]);
      mockTraitementRepo.findEnCours.mockResolvedValue([]);
      mockVisiteRepo.findProchaineVisitePrevue.mockResolvedValue(null);

      const result = await SanteRecommandationsService.getRecommandations(projetId);

      expect(result).toEqual([]);
    });
  });

  describe('getTauxMortaliteParCause', () => {
    const projetId = 'projet-123';

    it('devrait calculer le taux de mortalité par cause', async () => {
      const mockMortalites = [
        { id: 'm1', cause: 'Maladie', nombre_porcs: 5 },
        { id: 'm2', cause: 'Maladie', nombre_porcs: 3 },
        { id: 'm3', cause: 'Accident', nombre_porcs: 2 },
        { id: 'm4', cause: null, nombre_porcs: 1 }, // Cause non spécifiée
      ];

      mockMortaliteRepo.findByProjet.mockResolvedValue(mockMortalites as any);

      const result = await SanteRecommandationsService.getTauxMortaliteParCause(projetId);

      expect(result).toHaveLength(3);
      
      const maladie = result.find(r => r.cause === 'Maladie');
      expect(maladie).toBeDefined();
      expect(maladie?.nombre).toBe(8); // 5 + 3
      expect(maladie?.pourcentage).toBeCloseTo(72.73, 1); // 8/11 * 100

      const accident = result.find(r => r.cause === 'Accident');
      expect(accident).toBeDefined();
      expect(accident?.nombre).toBe(2);
      expect(accident?.pourcentage).toBeCloseTo(18.18, 1); // 2/11 * 100

      const nonSpecifiee = result.find(r => r.cause === 'Non spécifiée');
      expect(nonSpecifiee).toBeDefined();
      expect(nonSpecifiee?.nombre).toBe(1);
      expect(nonSpecifiee?.pourcentage).toBeCloseTo(9.09, 1); // 1/11 * 100
    });

    it('devrait trier par nombre décroissant', async () => {
      const mockMortalites = [
        { id: 'm1', cause: 'Cause A', nombre_porcs: 2 },
        { id: 'm2', cause: 'Cause B', nombre_porcs: 5 },
        { id: 'm3', cause: 'Cause C', nombre_porcs: 3 },
      ];

      mockMortaliteRepo.findByProjet.mockResolvedValue(mockMortalites as any);

      const result = await SanteRecommandationsService.getTauxMortaliteParCause(projetId);

      expect(result[0].cause).toBe('Cause B');
      expect(result[1].cause).toBe('Cause C');
      expect(result[2].cause).toBe('Cause A');
    });

    it('devrait retourner un tableau vide si aucune mortalité', async () => {
      mockMortaliteRepo.findByProjet.mockResolvedValue([]);

      const result = await SanteRecommandationsService.getTauxMortaliteParCause(projetId);

      expect(result).toEqual([]);
    });

    it('devrait gérer le cas où total est zéro', async () => {
      const mockMortalites = [
        { id: 'm1', cause: 'Cause A', nombre_porcs: 0 },
      ];

      mockMortaliteRepo.findByProjet.mockResolvedValue(mockMortalites as any);

      const result = await SanteRecommandationsService.getTauxMortaliteParCause(projetId);

      expect(result[0].pourcentage).toBe(0);
    });

    it('devrait grouper correctement les causes identiques', async () => {
      const mockMortalites = [
        { id: 'm1', cause: 'Maladie infectieuse', nombre_porcs: 10 },
        { id: 'm2', cause: 'Maladie infectieuse', nombre_porcs: 5 },
        { id: 'm3', cause: 'Maladie infectieuse', nombre_porcs: 3 },
      ];

      mockMortaliteRepo.findByProjet.mockResolvedValue(mockMortalites as any);

      const result = await SanteRecommandationsService.getTauxMortaliteParCause(projetId);

      expect(result).toHaveLength(1);
      expect(result[0].nombre).toBe(18); // 10 + 5 + 3
      expect(result[0].pourcentage).toBe(100);
    });
  });
});

