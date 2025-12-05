/**
 * Tests d'intégration pour CalculateFinancialBalanceUseCase
 */

import { CalculateFinancialBalanceUseCase, type CalculateFinancialBalanceInput } from '../CalculateFinancialBalance';
import type { IFinanceRepository } from '../repositories/IFinanceRepository';
import type { Revenu } from '../entities/Revenu';
import type { Depense } from '../entities/Depense';
import type { ChargeFixe } from '../entities/ChargeFixe';

describe('CalculateFinancialBalanceUseCase - Integration', () => {
  let useCase: CalculateFinancialBalanceUseCase;
  let mockRepository: jest.Mocked<IFinanceRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      findRevenusByPeriod: jest.fn(),
      findDepensesByPeriod: jest.fn(),
      findChargesFixesActives: jest.fn(),
    } as any;

    useCase = new CalculateFinancialBalanceUseCase(mockRepository);
  });

  describe('execute', () => {
    it('devrait calculer le solde financier correctement', async () => {
      const input: CalculateFinancialBalanceInput = {
        projetId: 'projet-1',
        dateDebut: '2024-01-01',
        dateFin: '2024-01-31',
      };

      const revenus: Revenu[] = [
        { id: 'rev-1', projetId: 'projet-1', montant: 200000, categorie: 'vente_porc', date: '2024-01-15', dateCreation: '2024-01-15T00:00:00Z', derniereModification: '2024-01-15T00:00:00Z' },
        { id: 'rev-2', projetId: 'projet-1', montant: 150000, categorie: 'vente_porc', date: '2024-01-20', dateCreation: '2024-01-20T00:00:00Z', derniereModification: '2024-01-20T00:00:00Z' },
      ];

      const depenses: Depense[] = [
        { id: 'dep-1', projetId: 'projet-1', montant: 50000, categorie: 'aliment', date: '2024-01-10', dateCreation: '2024-01-10T00:00:00Z', derniereModification: '2024-01-10T00:00:00Z' },
        { id: 'dep-2', projetId: 'projet-1', montant: 30000, categorie: 'autre', date: '2024-01-15', dateCreation: '2024-01-15T00:00:00Z', derniereModification: '2024-01-15T00:00:00Z' },
      ];

      const chargesFixes: ChargeFixe[] = [
        { id: 'charge-1', projetId: 'projet-1', categorie: 'loyer', libelle: 'Loyer', montant: 50000, dateDebut: '2024-01-01', frequence: 'mensuel', statut: 'actif', dateCreation: '2024-01-01T00:00:00Z', derniereModification: '2024-01-01T00:00:00Z' },
      ];

      mockRepository.findRevenusByPeriod.mockResolvedValueOnce(revenus);
      mockRepository.findDepensesByPeriod.mockResolvedValueOnce(depenses);
      mockRepository.findChargesFixesActives.mockResolvedValueOnce(chargesFixes);

      const result = await useCase.execute(input);

      expect(result.revenus).toBe(350000);
      expect(result.depenses).toBe(80000);
      expect(result.chargesFixes).toBe(50000);
      expect(result.margeBrute).toBe(270000); // 350000 - 80000
      expect(result.solde).toBe(220000); // 350000 - 80000 - 50000
    });

    it('devrait gérer les charges fixes trimestrielles', async () => {
      const input: CalculateFinancialBalanceInput = {
        projetId: 'projet-1',
        dateDebut: '2024-01-01',
        dateFin: '2024-03-31',
      };

      const chargesFixes: ChargeFixe[] = [
        { id: 'charge-1', projetId: 'projet-1', categorie: 'autre', libelle: 'Charge trimestrielle', montant: 150000, dateDebut: '2024-01-01', frequence: 'trimestriel', statut: 'actif', dateCreation: '2024-01-01T00:00:00Z', derniereModification: '2024-01-01T00:00:00Z' },
      ];

      mockRepository.findRevenusByPeriod.mockResolvedValueOnce([]);
      mockRepository.findDepensesByPeriod.mockResolvedValueOnce([]);
      mockRepository.findChargesFixesActives.mockResolvedValueOnce(chargesFixes);

      const result = await useCase.execute(input);

      // 3 mois = 1 trimestre
      expect(result.chargesFixes).toBe(150000);
    });
  });
});

