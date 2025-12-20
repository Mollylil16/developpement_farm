/**
 * Tests E2E pour le flux financier
 *
 * Couvre:
 * - Création d'une dépense
 * - Création d'un revenu
 * - Calcul du bilan financier
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UserRepository } from '../../src/database/repositories/UserRepository';
import { ProjetRepository } from '../../src/database/repositories/ProjetRepository';
import {
  RevenuRepository,
  DepensePonctuelleRepository,
} from '../../src/database/repositories/FinanceRepository';
import type { DepensePonctuelle, Revenu } from '../../src/types/finance';
import { CreateDepenseUseCase } from '../../src/domains/finance/useCases/CreateDepense';
import { CreateRevenuUseCase } from '../../src/domains/finance/useCases/CreateRevenu';
import { CalculateFinancialBalanceUseCase } from '../../src/domains/finance/useCases/CalculateFinancialBalance';
import { TEST_DEPENSE, TEST_REVENU } from '../setup/fixtures';
import { E2E_CONFIG } from '../setup/setup';

// Mock de la base de données
jest.mock('../../src/services/database', () => ({
  databaseService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getDatabase: jest.fn().mockReturnValue({
      execAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    }),
  },
}));

// Mock des données en mémoire
const mockUsers: any[] = [];
const mockProjets: any[] = [];
const mockDepenses: any[] = [];
const mockRevenus: any[] = [];

jest.mock('../../src/database/repositories/UserRepository', () => {
  return {
    UserRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation(async (data: any) => {
        const user = {
          id: `user-${Date.now()}-${Math.random()}`,
          ...data,
          dateCreation: new Date().toISOString(),
          derniereModification: new Date().toISOString(),
        };
        mockUsers.push(user);
        return user;
      }),
      deleteById: jest.fn().mockImplementation(async (id: string) => {
        const index = mockUsers.findIndex((u) => u.id === id);
        if (index >= 0) mockUsers.splice(index, 1);
      }),
    })),
  };
});

jest.mock('../../src/database/repositories/ProjetRepository', () => {
  return {
    ProjetRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation(async (data: any) => {
        const projet = {
          id: `projet-${Date.now()}-${Math.random()}`,
          ...data,
          dateCreation: new Date().toISOString(),
          derniereModification: new Date().toISOString(),
        };
        mockProjets.push(projet);
        return projet;
      }),
      deleteById: jest.fn().mockImplementation(async (id: string) => {
        const index = mockProjets.findIndex((p) => p.id === id);
        if (index >= 0) mockProjets.splice(index, 1);
      }),
    })),
  };
});

jest.mock('../../src/database/repositories/FinanceRepository', () => {
  return {
    RevenuRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation(async (data: any) => {
        const revenu = {
          id: `revenu-${Date.now()}-${Math.random()}`,
          ...data,
          dateCreation: new Date().toISOString(),
          derniereModification: new Date().toISOString(),
        };
        mockRevenus.push(revenu);
        return revenu;
      }),
      findByProjet: jest.fn().mockImplementation(async (projetId: string) => {
        return mockRevenus.filter((r) => r.projetId === projetId);
      }),
      findRevenusByPeriod: jest
        .fn()
        .mockImplementation(async (projetId: string, dateDebut: string, dateFin: string) => {
          return mockRevenus.filter(
            (r) => r.projetId === projetId && r.date >= dateDebut && r.date <= dateFin
          );
        }),
      deleteById: jest.fn().mockImplementation(async (id: string) => {
        const index = mockRevenus.findIndex((r) => r.id === id);
        if (index >= 0) mockRevenus.splice(index, 1);
      }),
    })),
    DepensePonctuelleRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation(async (data: any) => {
        const depense = {
          id: `depense-${Date.now()}-${Math.random()}`,
          ...data,
          dateCreation: new Date().toISOString(),
          derniereModification: new Date().toISOString(),
        };
        mockDepenses.push(depense);
        return depense;
      }),
      findByProjet: jest.fn().mockImplementation(async (projetId: string) => {
        return mockDepenses.filter((d) => d.projetId === projetId);
      }),
      findDepensesByPeriod: jest
        .fn()
        .mockImplementation(async (projetId: string, dateDebut: string, dateFin: string) => {
          return mockDepenses.filter(
            (d) => d.projetId === projetId && d.date >= dateDebut && d.date <= dateFin
          );
        }),
      findChargesFixesActives: jest.fn().mockResolvedValue([]),
      deleteById: jest.fn().mockImplementation(async (id: string) => {
        const index = mockDepenses.findIndex((d) => d.id === id);
        if (index >= 0) mockDepenses.splice(index, 1);
      }),
    })),
  };
});

describe('E2E: Flux Finance', () => {
  let userRepository: UserRepository;
  let projetRepository: ProjetRepository;
  let depenseRepository: DepensePonctuelleRepository;
  let revenuRepository: RevenuRepository;
  let createDepenseUseCase: CreateDepenseUseCase;
  let createRevenuUseCase: CreateRevenuUseCase;
  let calculateBalanceUseCase: CalculateFinancialBalanceUseCase;
  let createdUserId: string | null = null;
  let createdProjetId: string | null = null;
  let createdDepenseIds: string[] = [];
  let createdRevenuIds: string[] = [];

  beforeEach(async () => {
    // Réinitialiser les mocks
    mockUsers.length = 0;
    mockProjets.length = 0;
    mockDepenses.length = 0;
    mockRevenus.length = 0;
    // Note: Dans les tests e2e, les repositories sont mockés
    // Ces lignes sont conservées pour la compatibilité mais ne sont pas utilisées
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userRepository = null as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projetRepository = null as any;
    // Créer des mocks pour les repositories selon IFinanceRepository
    const mockFinanceRepo = {
      // Depenses
      createDepense: jest.fn().mockImplementation(async (data: any) => {
        const depense = {
          id: `depense-${Date.now()}-${Math.random()}`,
          ...data,
          dateCreation: new Date().toISOString(),
          derniereModification: new Date().toISOString(),
        };
        mockDepenses.push(depense);
        return depense;
      }),
      findDepensesByProjet: jest.fn().mockImplementation(async (projetId: string) => {
        return mockDepenses.filter((d) => d.projetId === projetId);
      }),
      findDepensesByPeriod: jest
        .fn()
        .mockImplementation(async (projetId: string, dateDebut: string, dateFin: string) => {
          return mockDepenses.filter(
            (d) => d.projetId === projetId && d.date >= dateDebut && d.date <= dateFin
          );
        }),
      findDepenseById: jest.fn().mockResolvedValue(null),
      updateDepense: jest.fn(),
      deleteDepense: jest.fn(),
      // Revenus
      createRevenu: jest.fn().mockImplementation(async (data: any) => {
        const revenu = {
          id: `revenu-${Date.now()}-${Math.random()}`,
          ...data,
          dateCreation: new Date().toISOString(),
          derniereModification: new Date().toISOString(),
        };
        mockRevenus.push(revenu);
        return revenu;
      }),
      findRevenusByProjet: jest.fn().mockImplementation(async (projetId: string) => {
        return mockRevenus.filter((r) => r.projetId === projetId);
      }),
      findRevenusByPeriod: jest
        .fn()
        .mockImplementation(async (projetId: string, dateDebut: string, dateFin: string) => {
          return mockRevenus.filter(
            (r) => r.projetId === projetId && r.date >= dateDebut && r.date <= dateFin
          );
        }),
      findRevenuById: jest.fn().mockResolvedValue(null),
      updateRevenu: jest.fn(),
      deleteRevenu: jest.fn(),
      // Charges fixes
      findChargesFixesActives: jest.fn().mockResolvedValue([]),
      findChargeFixeById: jest.fn().mockResolvedValue(null),
      findChargesFixesByProjet: jest.fn().mockResolvedValue([]),
      createChargeFixe: jest.fn(),
      updateChargeFixe: jest.fn(),
      deleteChargeFixe: jest.fn(),
    };

    depenseRepository = mockFinanceRepo as any;
    revenuRepository = mockFinanceRepo as any;
    createDepenseUseCase = new CreateDepenseUseCase(mockFinanceRepo as any);
    createRevenuUseCase = new CreateRevenuUseCase(mockFinanceRepo as any);
    calculateBalanceUseCase = new CalculateFinancialBalanceUseCase(mockFinanceRepo as any);
  });

  afterEach(async () => {
    // Nettoyer les dépenses
    for (const id of createdDepenseIds) {
      try {
        await depenseRepository.deleteById(id);
      } catch (error) {
        // Ignorer
      }
    }
    createdDepenseIds = [];

    // Nettoyer les revenus
    for (const id of createdRevenuIds) {
      try {
        await revenuRepository.deleteById(id);
      } catch (error) {
        // Ignorer
      }
    }
    createdRevenuIds = [];

    // Nettoyer le projet
    if (createdProjetId) {
      try {
        await projetRepository.deleteById(createdProjetId);
      } catch (error) {
        // Ignorer
      }
      createdProjetId = null;
    }

    // Nettoyer l'utilisateur
    if (createdUserId) {
      try {
        await userRepository.deleteById(createdUserId);
      } catch (error) {
        // Ignorer
      }
      createdUserId = null;
    }
  });

  const setupTestProject = async () => {
    const user = await userRepository.create({
      email: `finance-${Date.now()}@test.com`,
      nom: 'Test',
      prenom: 'Finance',
      provider: 'email',
      provider_id: `test-${Date.now()}`,
    });

    createdUserId = user.id;

    const projet = await projetRepository.create({
      proprietaire_id: user.id,
      nom: 'Ferme Test Finance',
      localisation: 'Cotonou, Bénin',
      nombre_truies: 5,
      nombre_verrats: 1,
      nombre_porcelets: 10,
      nombre_croissance: 0,
      poids_moyen_actuel: 50,
      age_moyen_actuel: 120,
    });

    createdProjetId = projet.id;
    return { user, projet };
  };

  describe("Création d'une dépense", () => {
    it('devrait permettre de créer une dépense', async () => {
      const { projet } = await setupTestProject();

      // 1. Créer une dépense via le use case
      const depense = await createDepenseUseCase.execute({
        projetId: projet.id,
        montant: TEST_DEPENSE.montant,
        categorie: TEST_DEPENSE.type,
        date: TEST_DEPENSE.date,
        commentaire: TEST_DEPENSE.description,
      });

      createdDepenseIds.push(depense.id);

      // 2. Vérifier que la dépense est créée
      expect(depense).toBeDefined();
      expect(depense.montant).toBe(TEST_DEPENSE.montant);
      expect(depense.projetId).toBe(projet.id);
      expect(depense.categorie).toBe(TEST_DEPENSE.type);

      // 3. Vérifier que la dépense apparaît dans la liste
      const depenses = await depenseRepository.findByProjet(projet.id);
      expect(depenses.length).toBeGreaterThan(0);
      expect(depenses.some((d: DepensePonctuelle) => d.id === depense.id)).toBe(true);
    });

    it('devrait valider les champs requis', async () => {
      const { projet } = await setupTestProject();

      // Tester avec montant invalide
      await expect(
        createDepenseUseCase.execute({
          projetId: projet.id,
          montant: 0,
          categorie: 'aliment',
          date: TEST_DEPENSE.date,
        })
      ).rejects.toThrow('supérieur à 0');
    });
  });

  describe("Création d'un revenu", () => {
    it('devrait permettre de créer un revenu', async () => {
      const { projet } = await setupTestProject();

      // 1. Créer un revenu via le use case
      const revenu = await createRevenuUseCase.execute({
        projetId: projet.id,
        montant: TEST_REVENU.montant,
        categorie: 'vente_porc' as const, // TEST_REVENU.type est 'vente_animaux' mais doit être 'vente_porc' | 'vente_autre' | 'subvention' | 'autre'
        date: TEST_REVENU.date,
        description: TEST_REVENU.description,
        poidsKg: TEST_REVENU.poids_kg,
      });

      createdRevenuIds.push(revenu.id);

      // 2. Vérifier que le revenu est créé
      expect(revenu).toBeDefined();
      expect(revenu.montant).toBe(TEST_REVENU.montant);
      expect(revenu.projetId).toBe(projet.id);
      expect(revenu.categorie).toBe(TEST_REVENU.type);

      // 3. Vérifier que le revenu apparaît dans la liste
      const revenus = await revenuRepository.findByProjet(projet.id);
      expect(revenus.length).toBeGreaterThan(0);
      expect(revenus.some((r: Revenu) => r.id === revenu.id)).toBe(true);
    });
  });

  describe('Calcul du bilan financier', () => {
    it('devrait calculer correctement le solde financier', async () => {
      const { projet } = await setupTestProject();

      const dateDebut = '2024-01-01';
      const dateFin = '2024-01-31';

      // 1. Créer des dépenses
      const depense1 = await createDepenseUseCase.execute({
        projetId: projet.id,
        montant: 50000,
        categorie: 'aliment',
        date: '2024-01-15',
      });
      createdDepenseIds.push(depense1.id);

      const depense2 = await createDepenseUseCase.execute({
        projetId: projet.id,
        montant: 30000,
        categorie: 'autre',
        date: '2024-01-20',
      });
      createdDepenseIds.push(depense2.id);

      // 2. Créer des revenus
      const revenu1 = await createRevenuUseCase.execute({
        projetId: projet.id,
        montant: 200000,
        categorie: 'vente_porc',
        date: '2024-01-10',
        poidsKg: 100,
      });
      createdRevenuIds.push(revenu1.id);

      const revenu2 = await createRevenuUseCase.execute({
        projetId: projet.id,
        montant: 150000,
        categorie: 'vente_porc',
        date: '2024-01-25',
        poidsKg: 75,
      });
      createdRevenuIds.push(revenu2.id);

      // 3. Calculer le bilan
      const balance = await calculateBalanceUseCase.execute({
        projetId: projet.id,
        dateDebut,
        dateFin,
      });

      // 4. Vérifier les calculs
      expect(balance).toBeDefined();
      expect(balance.revenus).toBe(350000); // 200000 + 150000
      expect(balance.depenses).toBe(80000); // 50000 + 30000
      expect(balance.margeBrute).toBe(270000); // 350000 - 80000
      expect(balance.solde).toBeGreaterThan(0);
    });
  });
});
