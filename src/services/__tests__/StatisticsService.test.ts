/**
 * Tests pour StatisticsService
 */

import { StatisticsService, type AnimalStats, type MortalityStats, type WeightStats } from '../StatisticsService';
import type { ProductionAnimal, ProductionPesee, Mortalite } from '../../types';

describe('StatisticsService', () => {
  describe('calculateTotalWeight', () => {
    it('devrait retourner 0 si aucun animal', () => {
      const result = StatisticsService.calculateTotalWeight([], []);
      expect(result).toBe(0);
    });

    it('devrait calculer le poids total avec les pesées', () => {
      const animaux: ProductionAnimal[] = [
        { id: '1', poids_initial: 10 } as any,
        { id: '2', poids_initial: 20 } as any,
      ];

      const pesees: ProductionPesee[] = [
        { id: '1', animal_id: '1', poids_kg: 50, date: '2024-01-01' } as any,
        { id: '2', animal_id: '2', poids_kg: 60, date: '2024-01-02' } as any,
      ];

      const result = StatisticsService.calculateTotalWeight(animaux, pesees);
      expect(result).toBe(110); // 50 + 60
    });

    it('devrait utiliser poids_initial si pas de pesée', () => {
      const animaux: ProductionAnimal[] = [
        { id: '1', poids_initial: 10 } as any,
        { id: '2', poids_initial: 20 } as any,
      ];

      const pesees: ProductionPesee[] = [];

      const result = StatisticsService.calculateTotalWeight(animaux, pesees);
      expect(result).toBe(30); // 10 + 20
    });

    it('devrait utiliser la dernière pesée si plusieurs pesées', () => {
      const animaux: ProductionAnimal[] = [
        { id: '1', poids_initial: 10 } as any,
      ];

      const pesees: ProductionPesee[] = [
        { id: '1', animal_id: '1', poids_kg: 50, date: '2024-01-01' } as any,
        { id: '2', animal_id: '1', poids_kg: 60, date: '2024-01-02' } as any,
        { id: '3', animal_id: '1', poids_kg: 70, date: '2024-01-03' } as any,
      ];

      const result = StatisticsService.calculateTotalWeight(animaux, pesees);
      expect(result).toBe(70); // Dernière pesée
    });
  });

  describe('calculateActiveAnimalsCount', () => {
    it('devrait compter les animaux actifs', () => {
      const animaux: ProductionAnimal[] = [
        { id: '1', statut: 'actif' } as any,
        { id: '2', statut: 'Actif' } as any,
        { id: '3', statut: 'mort' } as any,
        { id: '4', statut: 'vendu' } as any,
      ];

      const result = StatisticsService.calculateActiveAnimalsCount(animaux);
      expect(result).toBe(2); // actif et Actif (case insensitive)
    });

    it('devrait retourner 0 si aucun animal actif', () => {
      const animaux: ProductionAnimal[] = [
        { id: '1', statut: 'mort' } as any,
        { id: '2', statut: 'vendu' } as any,
      ];

      const result = StatisticsService.calculateActiveAnimalsCount(animaux);
      expect(result).toBe(0);
    });
  });

  describe('calculateAnimalStats', () => {
    it('devrait calculer les statistiques complètes', () => {
      const animaux: ProductionAnimal[] = [
        { id: '1', statut: 'actif', sexe: 'male', race: 'Large White', poids_initial: 10 } as any,
        { id: '2', statut: 'actif', sexe: 'femelle', race: 'Large White', poids_initial: 20 } as any,
        { id: '3', statut: 'mort', sexe: 'male', race: 'Landrace', poids_initial: 15 } as any,
        { id: '4', statut: 'vendu', sexe: 'femelle', race: 'Large White', poids_initial: 25 } as any,
      ];

      const pesees: ProductionPesee[] = [
        { id: '1', animal_id: '1', poids_kg: 50, date: '2024-01-01' } as any,
        { id: '2', animal_id: '2', poids_kg: 60, date: '2024-01-02' } as any,
      ];

      const result = StatisticsService.calculateAnimalStats(animaux, pesees);

      expect(result.total).toBe(4);
      expect(result.actifs).toBe(2);
      expect(result.morts).toBe(1);
      expect(result.vendus).toBe(1);
      expect(result.parSexe.males).toBe(2);
      expect(result.parSexe.femelles).toBe(2);
      expect(result.parRace['Large White']).toBe(3);
      expect(result.parRace['Landrace']).toBe(1);
      // poidsTotal calcule pour TOUS les animaux : 50 (animal 1) + 60 (animal 2) + 15 (animal 3 poids_initial) + 25 (animal 4 poids_initial) = 150
      expect(result.poidsTotal).toBe(150);
      // poidsMoyen = poidsTotal / nombre d'animaux actifs = 150 / 2 = 75
      expect(result.poidsMoyen).toBe(75);
    });

    it('devrait gérer les animaux sans statut', () => {
      const animaux: ProductionAnimal[] = [
        { id: '1', poids_initial: 10 } as any,
      ];

      const result = StatisticsService.calculateAnimalStats(animaux, []);

      expect(result.actifs).toBe(0);
      expect(result.morts).toBe(0);
    });
  });

  describe('calculateMortalityStats', () => {
    it('devrait calculer les statistiques de mortalité', () => {
      const mortalites: Mortalite[] = [
        { id: '1', categorie: 'Porcelet', date: '2024-01-15', nombre_porcs: 1 } as any,
        { id: '2', categorie: 'Porcelet', date: '2024-02-20', nombre_porcs: 1 } as any,
        { id: '3', categorie: 'Adulte', date: '2024-01-10', nombre_porcs: 1 } as any,
      ];

      const totalAnimaux = 100;

      const result = StatisticsService.calculateMortalityStats(mortalites, totalAnimaux);

      expect(result.total).toBe(3); // 1 + 1 + 1
      expect(result.taux).toBe(3); // 3 / 100 * 100
      expect(result.parCategorie['Porcelet']).toBe(2); // 1 + 1
      expect(result.parCategorie['Adulte']).toBe(1);
      expect(result.parMois['2024-01']).toBe(2); // 1 + 1
      expect(result.parMois['2024-02']).toBe(1);
    });

    it('devrait gérer le cas sans mortalité', () => {
      const result = StatisticsService.calculateMortalityStats([], 100);

      expect(result.total).toBe(0);
      expect(result.taux).toBe(0);
    });
  });

  describe('calculateWeightStats', () => {
    it('devrait calculer les statistiques de poids', () => {
      const animaux: ProductionAnimal[] = [
        { id: '1', poids_initial: 10 } as any,
        { id: '2', poids_initial: 20 } as any,
        { id: '3', poids_initial: 30 } as any,
      ];

      const pesees: ProductionPesee[] = [
        { id: '1', animal_id: '1', poids_kg: 50, date: '2024-01-01' } as any,
        { id: '2', animal_id: '2', poids_kg: 60, date: '2024-01-02' } as any,
        { id: '3', animal_id: '3', poids_kg: 70, date: '2024-01-03' } as any,
      ];

      const result = StatisticsService.calculateWeightStats(animaux, pesees);

      expect(result.total).toBe(180); // 50 + 60 + 70
      expect(result.moyen).toBe(60); // (50 + 60 + 70) / 3
      expect(result.min).toBe(50);
      expect(result.max).toBe(70);
      expect(result.parAnimal['1']).toBe(50);
      expect(result.parAnimal['2']).toBe(60);
      expect(result.parAnimal['3']).toBe(70);
    });

    it('devrait utiliser poids_initial si pas de pesée', () => {
      const animaux: ProductionAnimal[] = [
        { id: '1', poids_initial: 10 } as any,
        { id: '2', poids_initial: 20 } as any,
      ];

      const result = StatisticsService.calculateWeightStats(animaux, []);

      expect(result.total).toBe(30);
      expect(result.moyen).toBe(15);
      expect(result.min).toBe(10);
      expect(result.max).toBe(20);
    });

    it('devrait gérer le cas sans animal', () => {
      const result = StatisticsService.calculateWeightStats([], []);

      expect(result.total).toBe(0);
      expect(result.moyen).toBe(0);
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
    });
  });

  describe('calculateMortalityRate', () => {
    it('devrait calculer le taux de mortalité', () => {
      const mortalites: Mortalite[] = [
        { id: '1', nombre_porcs: 5 } as any,
        { id: '2', nombre_porcs: 3 } as any,
      ];

      const result = StatisticsService.calculateMortalityRate(mortalites, 100);

      expect(result).toBe(8); // (5 + 3) / 100 * 100
    });

    it('devrait retourner 0 si aucun animal', () => {
      const result = StatisticsService.calculateMortalityRate([], 0);
      expect(result).toBe(0);
    });
  });

  describe('countAnimalsByCategory', () => {
    it('devrait compter les animaux par catégorie', () => {
      const animaux: ProductionAnimal[] = [
        { id: '1', statut: 'actif', sexe: 'femelle', reproducteur: true } as any,
        { id: '2', statut: 'actif', sexe: 'male', reproducteur: true } as any,
        { id: '3', statut: 'actif', sexe: 'male', reproducteur: false } as any,
        { id: '4', statut: 'mort', sexe: 'femelle', reproducteur: true } as any,
      ];

      const result = StatisticsService.countAnimalsByCategory(animaux);

      expect(result.truies).toBe(1);
      expect(result.verrats).toBe(1);
      expect(result.porcelets).toBe(1);
    });

    it('devrait ignorer les animaux non actifs', () => {
      const animaux: ProductionAnimal[] = [
        { id: '1', statut: 'mort', sexe: 'femelle', reproducteur: true } as any,
        { id: '2', statut: 'vendu', sexe: 'male', reproducteur: true } as any,
      ];

      const result = StatisticsService.countAnimalsByCategory(animaux);

      expect(result.truies).toBe(0);
      expect(result.verrats).toBe(0);
      expect(result.porcelets).toBe(0);
    });
  });
});

