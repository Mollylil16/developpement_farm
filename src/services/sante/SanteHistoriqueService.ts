/**
 * Service pour l'historique médical des animaux
 * Centralise la logique de récupération de l'historique complet
 */

import { getDatabase } from '../database';
import {
  VaccinationRepository,
  MaladieRepository,
  TraitementRepository,
  VisiteVeterinaireRepository,
} from '../../database/repositories';
import type { Vaccination, Maladie, Traitement, VisiteVeterinaire } from '../../types';

export interface HistoriqueMedicalAnimal {
  vaccinations: Vaccination[];
  maladies: Maladie[];
  traitements: Traitement[];
  visites: VisiteVeterinaire[];
}

export class SanteHistoriqueService {
  /**
   * Obtenir l'historique médical complet d'un animal
   */
  static async getHistorique(animalId: string): Promise<HistoriqueMedicalAnimal> {
    const db = await getDatabase();
    const vaccinationRepo = new VaccinationRepository(db);
    const maladieRepo = new MaladieRepository(db);
    const traitementRepo = new TraitementRepository(db);
    const visiteRepo = new VisiteVeterinaireRepository(db);

    // Récupérer toutes les données médicales de l'animal
    const [vaccinations, maladies, traitements, visites] = await Promise.all([
      vaccinationRepo.findByAnimal(animalId),
      maladieRepo.findByAnimal(animalId),
      traitementRepo.findByAnimal(animalId),
      visiteRepo.findByAnimal(animalId),
    ]);

    // Trier par date (plus récent en premier)
    const sortByDate = <T extends { date_vaccination?: string; date_debut?: string; date_visite?: string }>(
      items: T[]
    ): T[] => {
      return items.sort((a, b) => {
        const dateA = a.date_vaccination || a.date_debut || a.date_visite || '';
        const dateB = b.date_vaccination || b.date_debut || b.date_visite || '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    };

    return {
      vaccinations: sortByDate(vaccinations),
      maladies: sortByDate(maladies),
      traitements: sortByDate(traitements),
      visites: sortByDate(visites),
    };
  }
}


