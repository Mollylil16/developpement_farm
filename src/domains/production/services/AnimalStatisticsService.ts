/**
 * Service de statistiques pour les animaux - Domaine Production
 * 
 * Contient la logique métier complexe pour les statistiques
 */

import type { IAnimalRepository } from '../repositories/IAnimalRepository';
import { AnimalEntity } from '../entities/Animal';

export interface AnimalStatistics {
  total: number;
  actifs: number;
  reproducteurs: number;
  males: number;
  femelles: number;
  moyenneAge: number | null;
  parStatut: Record<string, number>;
}

export class AnimalStatisticsService {
  constructor(private animalRepository: IAnimalRepository) {}

  /**
   * Calcule les statistiques des animaux d'un projet
   */
  async calculateStatistics(projetId: string): Promise<AnimalStatistics> {
    const animaux = await this.animalRepository.findByProjet(projetId);

    const stats: AnimalStatistics = {
      total: animaux.length,
      actifs: 0,
      reproducteurs: 0,
      males: 0,
      femelles: 0,
      moyenneAge: null,
      parStatut: {},
    };

    let totalAge = 0;
    let countAge = 0;

    for (const animal of animaux) {
      const entity = new AnimalEntity(animal);

      if (animal.actif) {
        stats.actifs++;
      }

      if (entity.isReproducteurActif()) {
        stats.reproducteurs++;
      }

      if (animal.sexe === 'male') {
        stats.males++;
      } else if (animal.sexe === 'femelle') {
        stats.femelles++;
      }

      stats.parStatut[animal.statut] = (stats.parStatut[animal.statut] || 0) + 1;

      const age = entity.getAgeEnJours();
      if (age !== null) {
        totalAge += age;
        countAge++;
      }
    }

    if (countAge > 0) {
      stats.moyenneAge = Math.round(totalAge / countAge);
    }

    return stats;
  }
}

