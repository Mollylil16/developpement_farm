/**
 * Use Case : Obtenir les statistiques des animaux
 *
 * Calcule les statistiques des animaux d'un projet
 */

import type { IAnimalRepository } from '../repositories/IAnimalRepository';
import { AnimalStatisticsService } from '../services/AnimalStatisticsService';
import type { AnimalStatistics } from '../services/AnimalStatisticsService';

export class GetAnimalStatisticsUseCase {
  private statisticsService: AnimalStatisticsService;

  constructor(animalRepository: IAnimalRepository) {
    this.statisticsService = new AnimalStatisticsService(animalRepository);
  }

  async execute(projetId: string): Promise<AnimalStatistics> {
    if (!projetId) {
      throw new Error('Le projet est requis');
    }

    return await this.statisticsService.calculateStatistics(projetId);
  }
}
