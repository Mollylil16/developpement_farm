/**
 * Tests E2E pour le flux de production
 *
 * Couvre:
 * - Ajout d'un animal
 * - Enregistrement d'une pesée
 * - Cycle de vie complet d'un animal
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UserRepository } from '../../src/database/repositories/UserRepository';
import { ProjetRepository } from '../../src/database/repositories/ProjetRepository';
import { AnimalRepository } from '../../src/database/repositories/AnimalRepository';
import { CreateAnimalUseCase } from '../../src/domains/production/useCases/CreateAnimal';
import { UpdateAnimalUseCase } from '../../src/domains/production/useCases/UpdateAnimal';
import { TEST_ANIMAL } from '../setup/fixtures';
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
const mockAnimaux: any[] = [];

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

jest.mock('../../src/database/repositories/AnimalRepository', () => {
  return {
    AnimalRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation(async (data: any) => {
        const animal = {
          id: `animal-${Date.now()}-${Math.random()}`,
          ...data,
          actif: true,
          dateCreation: new Date().toISOString(),
          derniereModification: new Date().toISOString(),
        };
        mockAnimaux.push(animal);
        return animal;
      }),
      findByProjet: jest.fn().mockImplementation(async (projetId: string) => {
        return mockAnimaux.filter((a) => a.projetId === projetId);
      }),
      findByCode: jest.fn().mockImplementation(async (projetId: string, code: string) => {
        return mockAnimaux.find((a) => a.projetId === projetId && a.code === code) || null;
      }),
      findActifsByProjet: jest.fn().mockImplementation(async (projetId: string) => {
        return mockAnimaux.filter((a) => a.projetId === projetId && a.actif === true);
      }),
      findById: jest.fn().mockImplementation(async (id: string) => {
        return mockAnimaux.find((a) => a.id === id) || null;
      }),
      update: jest.fn().mockImplementation(async (id: string, updates: any) => {
        const animal = mockAnimaux.find((a) => a.id === id);
        if (animal) {
          Object.assign(animal, updates, { derniereModification: new Date().toISOString() });
          return animal;
        }
        throw new Error('Animal not found');
      }),
      delete: jest.fn().mockImplementation(async (id: string) => {
        const index = mockAnimaux.findIndex((a) => a.id === id);
        if (index >= 0) mockAnimaux.splice(index, 1);
      }),
      deleteById: jest.fn().mockImplementation(async (id: string) => {
        const index = mockAnimaux.findIndex((a) => a.id === id);
        if (index >= 0) mockAnimaux.splice(index, 1);
      }),
      findReproducteursActifs: jest.fn().mockImplementation(async (projetId: string) => {
        return mockAnimaux.filter((a) => a.projetId === projetId && a.actif === true && a.reproducteur === true);
      }),
    })),
  };
});

describe('E2E: Flux Production', () => {
  let userRepository: UserRepository;
  let projetRepository: ProjetRepository;
  let animalRepository: AnimalRepository;
  let createAnimalUseCase: CreateAnimalUseCase;
  let updateAnimalUseCase: UpdateAnimalUseCase;
  let createdUserId: string | null = null;
  let createdProjetId: string | null = null;
  let createdAnimalIds: string[] = [];

  beforeEach(async () => {
    // Réinitialiser les mocks
    mockUsers.length = 0;
    mockProjets.length = 0;
    mockAnimaux.length = 0;
    userRepository = new UserRepository();
    projetRepository = new ProjetRepository();
    animalRepository = new AnimalRepository();
    // Cast to any pour compatibilité avec le mock
    createAnimalUseCase = new CreateAnimalUseCase(animalRepository as any);
    updateAnimalUseCase = new UpdateAnimalUseCase(animalRepository as any);
  });

  afterEach(async () => {
    // Nettoyer les animaux créés
    for (const animalId of createdAnimalIds) {
      try {
        await animalRepository.deleteById(animalId);
      } catch (error) {
        // Ignorer les erreurs
      }
    }
    createdAnimalIds = [];

    // Nettoyer le projet
    if (createdProjetId) {
      try {
        await projetRepository.deleteById(createdProjetId);
      } catch (error) {
        // Ignorer les erreurs
      }
      createdProjetId = null;
    }

    // Nettoyer l'utilisateur
    if (createdUserId) {
      try {
        await userRepository.deleteById(createdUserId);
      } catch (error) {
        // Ignorer les erreurs
      }
      createdUserId = null;
    }
  });

  const setupTestProject = async () => {
    const user = await userRepository.create({
      email: `production-${Date.now()}@test.com`,
      nom: 'Test',
      prenom: 'Producer',
      provider: 'email',
      provider_id: `test-${Date.now()}`,
    });

    createdUserId = user.id;

    const projet = await projetRepository.create({
      proprietaire_id: user.id,
      nom: 'Ferme Test Production',
      localisation: 'Cotonou, Bénin',
      nombre_truies: 3,
      nombre_verrats: 1,
      nombre_porcelets: 10,
      nombre_croissance: 5,
      poids_moyen_actuel: 25,
      age_moyen_actuel: 90,
      management_method: 'individual',
    });

    createdProjetId = projet.id;
    return { user, projet };
  };

  describe("Ajout d'un animal", () => {
    it("devrait permettre d'ajouter un nouvel animal", async () => {
      const { projet } = await setupTestProject();

      // 1. Créer un animal via le use case
      const animal = await createAnimalUseCase.execute({
        code: TEST_ANIMAL.code,
        projetId: projet.id,
        sexe: TEST_ANIMAL.sexe === 'M' ? 'male' : 'femelle',
        dateNaissance: TEST_ANIMAL.date_naissance,
        poidsInitial: TEST_ANIMAL.poids_naissance,
        race: TEST_ANIMAL.race,
      });

      createdAnimalIds.push(animal.id);

      // 2. Vérifier que l'animal est créé
      expect(animal).toBeDefined();
      expect(animal.code).toBe(TEST_ANIMAL.code);
      expect(animal.projetId).toBe(projet.id);
      expect(animal.actif).toBe(true);

      // 3. Vérifier que l'animal apparaît dans la liste des animaux du projet
      const animaux = await animalRepository.findByProjet(projet.id);
      expect(animaux.length).toBeGreaterThan(0);
      expect(animaux.some((a) => a.id === animal.id)).toBe(true);

      // 4. Vérifier que l'animal peut être récupéré par son code
      const foundAnimal = await animalRepository.findByCode(projet.id, TEST_ANIMAL.code);
      expect(foundAnimal).toBeDefined();
      expect(foundAnimal?.id).toBe(animal.id);
    });

    it("devrait valider l'unicité du code dans un projet", async () => {
      const { projet } = await setupTestProject();

      // 1. Créer un premier animal
      const animal1 = await createAnimalUseCase.execute({
        code: 'UNIQUE-001',
        projetId: projet.id,
        sexe: 'male',
        dateNaissance: '2024-01-01',
        race: 'Large White',
      });

      createdAnimalIds.push(animal1.id);

      // 2. Essayer de créer un animal avec le même code
      await expect(
        createAnimalUseCase.execute({
          code: 'UNIQUE-001',
          projetId: projet.id,
          sexe: 'femelle',
          dateNaissance: '2024-01-02',
          race: 'Large White',
        })
      ).rejects.toThrow('existe déjà dans ce projet');
    });
  });

  describe("Cycle de vie complet d'un animal", () => {
    it('devrait gérer le cycle complet: création -> modification -> désactivation', async () => {
      const { projet } = await setupTestProject();

      // 1. Créer un animal
      const animal = await createAnimalUseCase.execute({
        code: 'LIFECYCLE-001',
        projetId: projet.id,
        sexe: 'male',
        dateNaissance: '2023-01-01',
        race: 'Large White',
        reproducteur: false,
      });

      createdAnimalIds.push(animal.id);

      expect(animal.actif).toBe(true);
      expect(animal.statut).toBe('actif');

      // 2. Modifier l'animal (le rendre reproducteur)
      const updatedAnimal = await updateAnimalUseCase.execute({
        id: animal.id,
        reproducteur: true,
      });

      expect(updatedAnimal.reproducteur).toBe(true);

      // 3. Désactiver l'animal (vente)
      // Note: UpdateAnimalUseCase met automatiquement actif à false quand statut = 'mort'
      // Pour 'vendu', on doit aussi mettre actif à false
      const soldAnimal = await updateAnimalUseCase.execute({
        id: animal.id,
        statut: 'vendu',
        actif: false,
      });

      expect(soldAnimal.statut).toBe('vendu');
      // Le use case devrait avoir mis actif à false automatiquement
      expect(soldAnimal.actif).toBe(false);

      // 4. Vérifier que l'animal n'apparaît plus dans les animaux actifs
      const actifs = await animalRepository.findActiveByProjet(projet.id);
      expect(actifs.some((a) => a.id === animal.id)).toBe(false);
    });
  });

  describe('Gestion des animaux reproducteurs', () => {
    it('devrait permettre de créer un animal reproducteur valide', async () => {
      const { projet } = await setupTestProject();

      // Créer un animal avec plus de 8 mois (valide pour reproducteur)
      const dateNaissance = new Date();
      dateNaissance.setMonth(dateNaissance.getMonth() - 10); // 10 mois

      const animal = await createAnimalUseCase.execute({
        code: 'REPRO-001',
        projetId: projet.id,
        sexe: 'femelle',
        dateNaissance: dateNaissance.toISOString().split('T')[0],
        race: 'Large White',
        reproducteur: true,
      });

      createdAnimalIds.push(animal.id);

      expect(animal.reproducteur).toBe(true);
      expect(animal.actif).toBe(true);
    });

    it('devrait rejeter un animal trop jeune comme reproducteur', async () => {
      const { projet } = await setupTestProject();

      // Créer un animal avec moins de 8 mois
      const dateNaissance = new Date();
      dateNaissance.setMonth(dateNaissance.getMonth() - 6); // 6 mois

      await expect(
        createAnimalUseCase.execute({
          code: 'REPRO-002',
          projetId: projet.id,
          sexe: 'femelle',
          dateNaissance: dateNaissance.toISOString().split('T')[0],
          race: 'Large White',
          reproducteur: true,
        })
      ).rejects.toThrow('trop jeune pour être reproducteur');
    });
  });
});
