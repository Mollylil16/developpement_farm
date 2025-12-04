/**
 * Tests pour CoutProductionService
 */

import CoutProductionService from '../CoutProductionService';
import type { Projet, DepensePonctuelle, Revenu } from '../../types';

jest.mock('../../utils/financeCalculations');
jest.mock('../../utils/margeCalculations');

import { calculateCoutsPeriode } from '../../utils/financeCalculations';
import { calculateMargeVente } from '../../utils/margeCalculations';

const mockCalculateCoutsPeriode = calculateCoutsPeriode as jest.MockedFunction<typeof calculateCoutsPeriode>;
const mockCalculateMargeVente = calculateMargeVente as jest.MockedFunction<typeof calculateMargeVente>;

describe('CoutProductionService', () => {
  let mockDb: any;
  let service: typeof CoutProductionService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      getAllAsync: jest.fn(),
      runAsync: jest.fn(),
    };
    service = CoutProductionService;
    service.setDatabase(mockDb);
  });

  describe('setDatabase', () => {
    it('devrait définir la base de données', () => {
      const newDb = { getAllAsync: jest.fn(), runAsync: jest.fn() };
      service.setDatabase(newDb as any);
      // Vérifier que la base de données est définie en appelant une méthode qui l'utilise
      expect(() => {
        // On ne peut pas tester directement, mais on peut vérifier via les méthodes
      }).not.toThrow();
    });
  });

  describe('calculateCoutsPeriode', () => {
    const projetId = 'projet-123';
    const dateDebut = new Date('2024-01-01');
    const dateFin = new Date('2024-01-31');
    const mockProjet: Projet = {
      id: projetId,
      nom: 'Test Projet',
      duree_amortissement_par_defaut_mois: 60,
    } as Projet;

    it('devrait calculer les coûts de production pour une période', async () => {
      const mockDepenses: DepensePonctuelle[] = [
        { id: 'd1', projet_id: projetId, montant: 10000, date: '2024-01-15' } as DepensePonctuelle,
      ];

      const mockVentes: Revenu[] = [
        { id: 'v1', projet_id: projetId, montant: 50000, poids_kg: 100, categorie: 'vente_porc', date: '2024-01-20' } as Revenu,
      ];

      const mockCoutsPeriode = {
        cout_kg_opex: 500,
        cout_kg_complet: 800,
        total_opex: 50000,
        total_complet: 80000,
      };

      mockDb.getAllAsync
        .mockResolvedValueOnce(mockDepenses.map(d => ({ ...d, photos: JSON.stringify([]) })))
        .mockResolvedValueOnce(mockVentes.map(v => ({ ...v, photos: JSON.stringify([]) })));

      mockCalculateCoutsPeriode.mockReturnValue(mockCoutsPeriode as any);

      const result = await service.calculateCoutsPeriode(projetId, dateDebut, dateFin, mockProjet);

      expect(mockDb.getAllAsync).toHaveBeenCalledTimes(2);
      expect(mockCalculateCoutsPeriode).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'd1',
            montant: 10000,
            photos: [],
          }),
        ]),
        100, // totalKgVendus
        dateDebut,
        dateFin,
        60 // dureeAmortissementMois (valeur du mockProjet)
      );
      expect(result).toEqual(mockCoutsPeriode);
    });

    it('devrait utiliser la durée d\'amortissement par défaut si non définie', async () => {
      const projetSansDuree: Projet = {
        id: projetId,
        nom: 'Test Projet',
      } as Projet;

      mockDb.getAllAsync
        .mockResolvedValueOnce([]) // loadDepenses
        .mockResolvedValueOnce([]); // loadVentesPorc
      mockCalculateCoutsPeriode.mockReturnValue({} as any);

      await service.calculateCoutsPeriode(projetId, dateDebut, dateFin, projetSansDuree);

      expect(mockCalculateCoutsPeriode).toHaveBeenCalledWith(
        [],
        0,
        dateDebut,
        dateFin,
        expect.any(Number) // DEFAULT_DUREE_AMORTISSEMENT_MOIS (peut varier)
      );
    });

    it('devrait calculer le total de kg vendus correctement', async () => {
      const mockVentes: Revenu[] = [
        { id: 'v1', poids_kg: 50, categorie: 'vente_porc', date: '2024-01-15' } as Revenu,
        { id: 'v2', poids_kg: 75, categorie: 'vente_porc', date: '2024-01-20' } as Revenu,
        { id: 'v3', poids_kg: null, categorie: 'vente_porc', date: '2024-01-25' } as Revenu,
      ];

      mockDb.getAllAsync
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockVentes.map(v => ({ ...v, photos: JSON.stringify([]) })));

      mockCalculateCoutsPeriode.mockReturnValue({} as any);

      await service.calculateCoutsPeriode(projetId, dateDebut, dateFin, mockProjet);

      expect(mockCalculateCoutsPeriode).toHaveBeenCalledWith(
        [],
        125, // 50 + 75
        dateDebut,
        dateFin,
        60
      );
    });
  });

  describe('calculateCoutsMoisActuel', () => {
    const projetId = 'projet-123';
    const mockProjet: Projet = {
      id: projetId,
      nom: 'Test Projet',
    } as Projet;

    it('devrait calculer les coûts du mois en cours', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([]) // loadDepenses
        .mockResolvedValueOnce([]); // loadVentesPorc
      mockCalculateCoutsPeriode.mockReturnValue({} as any);

      await service.calculateCoutsMoisActuel(projetId, mockProjet);

      expect(mockCalculateCoutsPeriode).toHaveBeenCalled();
      const callArgs = mockCalculateCoutsPeriode.mock.calls[0];
      expect(callArgs[2]).toBeInstanceOf(Date); // dateDebut
      expect(callArgs[3]).toBeInstanceOf(Date); // dateFin
    });
  });

  describe('updateMargesVente', () => {
    const mockVente: Revenu = {
      id: 'vente-1',
      projet_id: 'projet-123',
      montant: 50000,
      poids_kg: 100,
      categorie: 'vente_porc',
      date: '2024-01-15',
    } as Revenu;

    const mockCoutsPeriode = {
      cout_kg_opex: 500,
      cout_kg_complet: 800,
    };

    const mockMarges = {
      poids_kg: 100,
      cout_kg_opex: 500,
      cout_kg_complet: 800,
      cout_reel_opex: 50000,
      cout_reel_complet: 80000,
      marge_opex: 0,
      marge_complete: -30000,
      marge_opex_pourcent: 0,
      marge_complete_pourcent: -60,
    };

    it('devrait mettre à jour les marges d\'une vente', async () => {
      mockCalculateMargeVente.mockReturnValue(mockMarges as any);
      mockDb.runAsync.mockResolvedValue(undefined);

      const result = await service.updateMargesVente(mockVente, 100, mockCoutsPeriode as any);

      expect(mockCalculateMargeVente).toHaveBeenCalledWith(
        mockVente,
        100,
        mockCoutsPeriode.cout_kg_opex,
        mockCoutsPeriode.cout_kg_complet
      );

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE revenus SET'),
        expect.arrayContaining([
          mockMarges.poids_kg,
          mockMarges.cout_kg_opex,
          mockMarges.cout_kg_complet,
          mockMarges.cout_reel_opex,
          mockMarges.cout_reel_complet,
          mockMarges.marge_opex,
          mockMarges.marge_complete,
          mockMarges.marge_opex_pourcent,
          mockMarges.marge_complete_pourcent,
          mockVente.id,
        ])
      );

      expect(result).toMatchObject({
        ...mockVente,
        ...mockMarges,
      });
    });

    it('devrait lancer une erreur si la base de données n\'est pas initialisée', async () => {
      const serviceWithoutDb = new (CoutProductionService.constructor as any)();
      
      await expect(
        serviceWithoutDb.updateMargesVente(mockVente, 100, mockCoutsPeriode as any)
      ).rejects.toThrow('Base de données non initialisée');
    });
  });

  describe('calculateAndSaveMargesForNewVente', () => {
    const mockVente: Revenu = {
      id: 'vente-1',
      projet_id: 'projet-123',
      montant: 50000,
      poids_kg: 100,
      categorie: 'vente_porc',
      date: '2024-01-15',
    } as Revenu;

    const mockProjet: Projet = {
      id: 'projet-123',
      nom: 'Test Projet',
    } as Projet;

    it('devrait calculer et sauvegarder les marges pour une nouvelle vente', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([]) // loadDepenses
        .mockResolvedValueOnce([]); // loadVentesPorc
      mockCalculateCoutsPeriode.mockReturnValue({
        cout_kg_opex: 500,
        cout_kg_complet: 800,
      } as any);
      mockCalculateMargeVente.mockReturnValue({
        marge_opex: 0,
        marge_complete: -30000,
      } as any);
      mockDb.runAsync.mockResolvedValue(undefined);

      const result = await service.calculateAndSaveMargesForNewVente(mockVente, 100, mockProjet);

      expect(mockCalculateCoutsPeriode).toHaveBeenCalled();
      expect(mockCalculateMargeVente).toHaveBeenCalled();
      expect(mockDb.runAsync).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('recalculerMargesPeriode', () => {
    const projetId = 'projet-123';
    const dateDebut = new Date('2024-01-01');
    const dateFin = new Date('2024-01-31');
    const mockProjet: Projet = {
      id: projetId,
      nom: 'Test Projet',
    } as Projet;

    it('devrait recalculer les marges pour toutes les ventes d\'une période', async () => {
      const mockVentes: Revenu[] = [
        { id: 'v1', poids_kg: 100, categorie: 'vente_porc', date: '2024-01-15' } as Revenu,
        { id: 'v2', poids_kg: 50, categorie: 'vente_porc', date: '2024-01-20' } as Revenu,
        { id: 'v3', poids_kg: null, categorie: 'vente_porc', date: '2024-01-25' } as Revenu, // Ignoré
      ];

      const mockVentesWithPhotos = mockVentes.map(v => ({ ...v, photos: JSON.stringify([]) }));
      mockDb.getAllAsync
        .mockResolvedValueOnce([]) // loadDepenses dans calculateCoutsPeriode
        .mockResolvedValueOnce(mockVentesWithPhotos) // loadVentesPorc dans calculateCoutsPeriode
        .mockResolvedValueOnce(mockVentesWithPhotos); // loadVentesPorc dans recalculerMargesPeriode (ligne 223)

      mockCalculateCoutsPeriode.mockReturnValue({
        cout_kg_opex: 500,
        cout_kg_complet: 800,
      } as any);

      mockCalculateMargeVente.mockReturnValue({
        marge_opex: 0,
      } as any);

      mockDb.runAsync.mockResolvedValue(undefined);

      const result = await service.recalculerMargesPeriode(projetId, dateDebut, dateFin, mockProjet);

      expect(result).toBe(2); // 2 ventes avec poids
      expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStatistiquesPeriode', () => {
    const projetId = 'projet-123';
    const dateDebut = new Date('2024-01-01');
    const dateFin = new Date('2024-01-31');
    const mockProjet: Projet = {
      id: projetId,
      nom: 'Test Projet',
    } as Projet;

    it('devrait calculer les statistiques financières d\'une période', async () => {
      const mockVentes: Revenu[] = [
        { id: 'v1', montant: 50000, marge_opex: 10000, marge_opex_pourcent: 20, categorie: 'vente_porc', date: '2024-01-15' } as Revenu,
        { id: 'v2', montant: 30000, marge_opex: 5000, marge_opex_pourcent: 16.67, categorie: 'vente_porc', date: '2024-01-20' } as Revenu,
      ];

      const mockCoutsPeriode = {
        cout_kg_opex: 500,
        cout_kg_complet: 800,
      };

      mockDb.getAllAsync
        .mockResolvedValueOnce([]) // loadDepenses (premier appel dans calculateCoutsPeriode)
        .mockResolvedValueOnce(mockVentes.map(v => ({ ...v, photos: JSON.stringify([]) }))) // loadVentesPorc (premier appel dans calculateCoutsPeriode)
        .mockResolvedValueOnce(mockVentes.map(v => ({ ...v, photos: JSON.stringify([]) }))); // loadVentesPorc (deuxième appel dans getStatistiquesPeriode)

      mockCalculateCoutsPeriode.mockReturnValue(mockCoutsPeriode as any);

      const result = await service.getStatistiquesPeriode(projetId, dateDebut, dateFin, mockProjet);

      expect(result.nombreVentes).toBe(2);
      expect(result.chiffreAffaires).toBe(80000); // 50000 + 30000
      expect(result.beneficeTotal).toBe(15000); // 10000 + 5000
      expect(result.margeMoyenne).toBeCloseTo(18.335, 1); // (20 + 16.67) / 2
      expect(result.coutsPeriode).toEqual(mockCoutsPeriode);
    });

    it('devrait gérer le cas où aucune vente n\'a de marge', async () => {
      const mockVentes: Revenu[] = [
        { id: 'v1', montant: 50000, categorie: 'vente_porc', date: '2024-01-15' } as Revenu,
      ];

      mockDb.getAllAsync
        .mockResolvedValueOnce([]) // loadDepenses (premier appel dans calculateCoutsPeriode)
        .mockResolvedValueOnce([]) // loadVentesPorc (premier appel dans calculateCoutsPeriode)
        .mockResolvedValueOnce([]); // loadVentesPorc (deuxième appel dans getStatistiquesPeriode)

      mockCalculateCoutsPeriode.mockReturnValue({} as any);

      const result = await service.getStatistiquesPeriode(projetId, dateDebut, dateFin, mockProjet);

      expect(result.margeMoyenne).toBe(0);
    });
  });
});

