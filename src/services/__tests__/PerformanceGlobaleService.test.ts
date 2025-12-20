/**
 * Tests pour PerformanceGlobaleService
 */

import PerformanceGlobaleService from '../PerformanceGlobaleService';

// Mock de la base de données
const mockDb = {
  getAllAsync: jest.fn(),
} as any;

describe('PerformanceGlobaleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PerformanceGlobaleService.setDatabase(mockDb);
  });

  describe('getPerformanceGlobale', () => {
    const mockProjet = {
      id: 'test-projet',
      nom: 'Test',
      prix_kg_carcasse: 3000,
      duree_amortissement_par_defaut_mois: 36,
    };

    it('retourne null si aucune vente', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([]) // Dépenses
        .mockResolvedValueOnce([]); // Ventes

      const result = await PerformanceGlobaleService.calculatePerformanceGlobale(
        'test-projet',
        mockProjet as any
      );

      expect(result).toBeNull();
    });

    it('calcule correctement le coût OPEX global', async () => {
      const depenses = [
        {
          id: '1',
          montant: 100000,
          type_depense: 'OPEX',
          date: '2024-01-01',
        },
        {
          id: '2',
          montant: 50000,
          type_depense: 'OPEX',
          date: '2024-01-15',
        },
      ];

      const ventes = [
        {
          id: '1',
          poids_kg: 100,
          date: '2024-02-01',
        },
      ];

      mockDb.getAllAsync
        .mockResolvedValueOnce(depenses) // Dépenses
        .mockResolvedValueOnce(ventes); // Ventes

      const result = await PerformanceGlobaleService.calculatePerformanceGlobale(
        'test-projet',
        mockProjet as any
      );

      expect(result).not.toBeNull();
      expect(result!.total_opex_global).toBe(150000);
      expect(result!.total_kg_vendus_global).toBe(100);
      expect(result!.cout_kg_opex_global).toBe(1500);
    });

    it('ignore les dépenses CAPEX dans le calcul OPEX', async () => {
      const depenses = [
        {
          id: '1',
          montant: 100000,
          type_depense: 'OPEX',
          date: '2024-01-01',
        },
        {
          id: '2',
          montant: 500000,
          type_depense: 'CAPEX',
          date: '2024-01-01',
        },
      ];

      const ventes = [
        {
          id: '1',
          poids_kg: 100,
          date: '2024-02-01',
        },
      ];

      mockDb.getAllAsync.mockResolvedValueOnce(depenses).mockResolvedValueOnce(ventes);

      const result = await PerformanceGlobaleService.calculatePerformanceGlobale(
        'test-projet',
        mockProjet as any
      );

      expect(result!.total_opex_global).toBe(100000);
      expect(result!.cout_kg_opex_global).toBe(1000);
    });

    it('calcule le coût complet avec amortissement CAPEX', async () => {
      const depenses = [
        {
          id: '1',
          montant: 100000,
          type_depense: 'OPEX',
          date: '2024-01-01',
        },
        {
          id: '2',
          montant: 360000,
          type_depense: 'CAPEX',
          date: '2024-01-01',
          duree_amortissement_mois: 36,
        },
      ];

      const ventes = [
        {
          id: '1',
          poids_kg: 100,
          date: '2024-02-01',
        },
      ];

      mockDb.getAllAsync.mockResolvedValueOnce(depenses).mockResolvedValueOnce(ventes);

      const result = await PerformanceGlobaleService.calculatePerformanceGlobale(
        'test-projet',
        mockProjet as any
      );

      expect(result).not.toBeNull();
      // OPEX = 100000, CAPEX amorti pour 1 mois = 10000
      expect(result!.total_opex_global).toBe(100000);
      expect(result!.total_amortissement_capex_global).toBeGreaterThan(0);
    });

    it('détermine le statut "rentable" correctement', async () => {
      const depenses = [
        {
          id: '1',
          montant: 100000,
          type_depense: 'OPEX',
          date: '2024-01-01',
        },
      ];

      const ventes = [
        {
          id: '1',
          poids_kg: 100,
          date: '2024-02-01',
        },
      ];

      mockDb.getAllAsync.mockResolvedValueOnce(depenses).mockResolvedValueOnce(ventes);

      const result = await PerformanceGlobaleService.getPerformanceGlobale('test-projet', {
        ...mockProjet,
        prix_kg_carcasse: 3000,
      } as any);

      // Coût = 1000 FCFA/kg, Prix marché = 3000 FCFA/kg
      expect(result!.cout_kg_opex_global).toBe(1000);
      expect(result!.statut).toBe('rentable');
    });

    it('détermine le statut "perte" correctement', async () => {
      const depenses = [
        {
          id: '1',
          montant: 400000,
          type_depense: 'OPEX',
          date: '2024-01-01',
        },
      ];

      const ventes = [
        {
          id: '1',
          poids_kg: 100,
          date: '2024-02-01',
        },
      ];

      mockDb.getAllAsync.mockResolvedValueOnce(depenses).mockResolvedValueOnce(ventes);

      const result = await PerformanceGlobaleService.getPerformanceGlobale('test-projet', {
        ...mockProjet,
        prix_kg_carcasse: 3000,
      } as any);

      // Coût = 4000 FCFA/kg, Prix marché = 3000 FCFA/kg
      expect(result!.cout_kg_complet_global).toBeGreaterThan(3000);
      expect(result!.statut).toBe('perte');
    });

    it("calcule l'écart correctement", async () => {
      const depenses = [
        {
          id: '1',
          montant: 200000,
          type_depense: 'OPEX',
          date: '2024-01-01',
        },
      ];

      const ventes = [
        {
          id: '1',
          poids_kg: 100,
          date: '2024-02-01',
        },
      ];

      mockDb.getAllAsync.mockResolvedValueOnce(depenses).mockResolvedValueOnce(ventes);

      const result = await PerformanceGlobaleService.getPerformanceGlobale('test-projet', {
        ...mockProjet,
        prix_kg_carcasse: 3000,
      } as any);

      // Coût = 2000 FCFA/kg, Prix = 3000 FCFA/kg
      expect(result!.ecart_absolu).toBe(1000);
      expect(result!.ecart_pourcentage).toBeCloseTo(33.33, 1);
    });

    it('génère des suggestions appropriées', async () => {
      const depenses = [
        {
          id: '1',
          montant: 100000,
          type_depense: 'OPEX',
          date: '2024-01-01',
        },
      ];

      const ventes = [
        {
          id: '1',
          poids_kg: 100,
          date: '2024-02-01',
        },
      ];

      mockDb.getAllAsync.mockResolvedValueOnce(depenses).mockResolvedValueOnce(ventes);

      const result = await PerformanceGlobaleService.calculatePerformanceGlobale(
        'test-projet',
        mockProjet as any
      );

      expect(result!.suggestions).toBeDefined();
      expect(Array.isArray(result!.suggestions)).toBe(true);
      expect(result!.suggestions.length).toBeGreaterThan(0);
    });

    it('gère les type_depense undefined en les traitant comme OPEX', async () => {
      const depenses = [
        {
          id: '1',
          montant: 100000,
          type_depense: undefined,
          date: '2024-01-01',
        },
        {
          id: '2',
          montant: 50000,
          type_depense: null,
          date: '2024-01-15',
        },
      ];

      const ventes = [
        {
          id: '1',
          poids_kg: 100,
          date: '2024-02-01',
        },
      ];

      mockDb.getAllAsync.mockResolvedValueOnce(depenses).mockResolvedValueOnce(ventes);

      const result = await PerformanceGlobaleService.calculatePerformanceGlobale(
        'test-projet',
        mockProjet as any
      );

      // Les dépenses sans type doivent être comptées comme OPEX
      expect(result!.total_opex_global).toBe(150000);
    });

    it('gère les erreurs de base de données', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('DB Error'));

      await expect(
        PerformanceGlobaleService.getPerformanceGlobale('test-projet', mockProjet as any)
      ).rejects.toThrow('DB Error');
    });
  });
});
