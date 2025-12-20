/**
 * Service centralisé pour tous les calculs statistiques
 * Évite la duplication de code dans les composants
 */

import { ProductionAnimal, ProductionPesee, Mortalite } from '../types';

export interface AnimalStats {
  total: number;
  actifs: number;
  morts: number;
  vendus: number;
  offerts: number;
  parSexe: {
    males: number;
    femelles: number;
    indetermines: number;
  };
  parRace: Record<string, number>;
  poidsTotal: number;
  poidsMoyen: number;
}

export interface MortalityStats {
  total: number;
  taux: number; // Pourcentage
  parCategorie: Record<string, number>;
  parMois: Record<string, number>;
}

export interface WeightStats {
  total: number;
  moyen: number;
  min: number;
  max: number;
  parAnimal: Record<string, number>;
}

/**
 * Service de calculs statistiques
 */
export class StatisticsService {
  /**
   * Calcule le poids total d'une liste d'animaux
   */
  static calculateTotalWeight(animaux: ProductionAnimal[], pesees: ProductionPesee[]): number {
    if (animaux.length === 0) return 0;

    let total = 0;
    for (const animal of animaux) {
      // Trouver la dernière pesée pour cet animal
      const dernierePesee = pesees
        .filter((p) => p.animal_id === animal.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      if (dernierePesee) {
        total += dernierePesee.poids_kg;
      } else if (animal.poids_initial) {
        total += animal.poids_initial;
      }
    }

    return total;
  }

  /**
   * Compte les animaux actifs
   */
  static calculateActiveAnimalsCount(animaux: ProductionAnimal[]): number {
    return animaux.filter((animal) => animal.statut?.toLowerCase() === 'actif').length;
  }

  /**
   * Calcule les statistiques complètes d'animaux
   */
  static calculateAnimalStats(animaux: ProductionAnimal[], pesees: ProductionPesee[]): AnimalStats {
    const actifs = animaux.filter((a) => a.statut?.toLowerCase() === 'actif');
    const morts = animaux.filter((a) => a.statut?.toLowerCase() === 'mort');
    const vendus = animaux.filter((a) => a.statut?.toLowerCase() === 'vendu');
    const offerts = animaux.filter((a) => a.statut?.toLowerCase() === 'offert');

    const parSexe = {
      males: animaux.filter((a) => a.sexe === 'male').length,
      femelles: animaux.filter((a) => a.sexe === 'femelle').length,
      indetermines: animaux.filter((a) => a.sexe === 'indetermine').length,
    };

    const parRace: Record<string, number> = {};
    animaux.forEach((animal) => {
      const race = animal.race || 'Non spécifiée';
      parRace[race] = (parRace[race] || 0) + 1;
    });

    const poidsTotal = this.calculateTotalWeight(animaux, pesees);
    const poidsMoyen = actifs.length > 0 ? poidsTotal / actifs.length : 0;

    return {
      total: animaux.length,
      actifs: actifs.length,
      morts: morts.length,
      vendus: vendus.length,
      offerts: offerts.length,
      parSexe,
      parRace,
      poidsTotal,
      poidsMoyen,
    };
  }

  /**
   * Calcule le taux de mortalité
   */
  static calculateMortalityRate(mortalites: Mortalite[], totalAnimals: number): number {
    if (totalAnimals === 0) return 0;
    const totalMorts = mortalites.reduce((sum, m) => sum + (m.nombre_porcs || 0), 0);
    return (totalMorts / totalAnimals) * 100;
  }

  /**
   * Calcule les statistiques de mortalité
   */
  static calculateMortalityStats(mortalites: Mortalite[], totalAnimals: number): MortalityStats {
    const total = mortalites.reduce((sum, m) => sum + (m.nombre_porcs || 0), 0);
    const taux = this.calculateMortalityRate(mortalites, totalAnimals);

    const parCategorie: Record<string, number> = {};
    mortalites.forEach((m) => {
      const cat = m.categorie || 'Non spécifiée';
      parCategorie[cat] = (parCategorie[cat] || 0) + (m.nombre_porcs || 0);
    });

    const parMois: Record<string, number> = {};
    mortalites.forEach((m) => {
      if (m.date) {
        const mois = new Date(m.date).toISOString().substring(0, 7); // YYYY-MM
        parMois[mois] = (parMois[mois] || 0) + (m.nombre_porcs || 0);
      }
    });

    return {
      total,
      taux,
      parCategorie,
      parMois,
    };
  }

  /**
   * Calcule les statistiques de poids
   */
  static calculateWeightStats(animaux: ProductionAnimal[], pesees: ProductionPesee[]): WeightStats {
    const poidsParAnimal: Record<string, number> = {};
    const poidsList: number[] = [];

    animaux.forEach((animal) => {
      const dernierePesee = pesees
        .filter((p) => p.animal_id === animal.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      const poids = dernierePesee?.poids_kg || animal.poids_initial || 0;
      poidsParAnimal[animal.id] = poids;
      if (poids > 0) {
        poidsList.push(poids);
      }
    });

    const total = poidsList.reduce((sum, p) => sum + p, 0);
    const moyen = poidsList.length > 0 ? total / poidsList.length : 0;
    const min = poidsList.length > 0 ? Math.min(...poidsList) : 0;
    const max = poidsList.length > 0 ? Math.max(...poidsList) : 0;

    return {
      total,
      moyen,
      min,
      max,
      parAnimal: poidsParAnimal,
    };
  }

  /**
   * Calcule le nombre d'animaux par catégorie
   */
  static countAnimalsByCategory(animaux: ProductionAnimal[]): {
    truies: number;
    verrats: number;
    porcelets: number;
  } {
    let truies = 0;
    let verrats = 0;
    let porcelets = 0;

    animaux.forEach((animal) => {
      if (animal.statut?.toLowerCase() !== 'actif') return;

      if (animal.sexe === 'femelle' && animal.reproducteur) {
        truies++;
      } else if (animal.sexe === 'male' && animal.reproducteur) {
        verrats++;
      } else {
        porcelets++;
      }
    });

    return { truies, verrats, porcelets };
  }
}
