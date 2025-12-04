/**
 * Service pour les coûts vétérinaires
 * Centralise la logique de calcul des coûts sanitaires
 */

import { getDatabase } from '../database';
import {
  VaccinationRepository,
  TraitementRepository,
  VisiteVeterinaireRepository,
} from '../../database/repositories';
import type { Vaccination, Traitement, VisiteVeterinaire } from '../../types';

export interface CoutsVeterinaires {
  vaccinations: number;
  traitements: number;
  visites: number;
  total: number;
}

export interface CoutsVeterinairesPeriode extends CoutsVeterinaires {
  details: {
    vaccinations: Vaccination[];
    traitements: Traitement[];
    visites: VisiteVeterinaire[];
  };
}

export class SanteCoutsService {
  /**
   * Obtenir les coûts vétérinaires totaux pour un projet
   */
  static async getCouts(projetId: string): Promise<CoutsVeterinaires> {
    const db = await getDatabase();
    const vaccinationRepo = new VaccinationRepository(db);
    const traitementRepo = new TraitementRepository(db);
    const visiteRepo = new VisiteVeterinaireRepository(db);

    // Récupérer toutes les vaccinations avec coût
    const vaccinations = await vaccinationRepo.findByProjet(projetId);
    const coutVaccinations = vaccinations
      .filter((v) => v.cout !== undefined && v.cout !== null)
      .reduce((sum, v) => sum + (v.cout || 0), 0);

    // Récupérer tous les traitements avec coût
    const traitements = await traitementRepo.findByProjet(projetId);
    const coutTraitements = traitements
      .filter((t) => t.cout !== undefined && t.cout !== null)
      .reduce((sum, t) => sum + (t.cout || 0), 0);

    // Récupérer toutes les visites avec coût
    const visites = await visiteRepo.findByProjet(projetId);
    const coutVisites = visites
      .filter((v) => v.cout !== undefined && v.cout !== null)
      .reduce((sum, v) => sum + (v.cout || 0), 0);

    return {
      vaccinations: coutVaccinations,
      traitements: coutTraitements,
      visites: coutVisites,
      total: coutVaccinations + coutTraitements + coutVisites,
    };
  }

  /**
   * Obtenir les coûts vétérinaires sur une période donnée
   */
  static async getCoutsPeriode(
    projetId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<CoutsVeterinairesPeriode> {
    const db = await getDatabase();
    const vaccinationRepo = new VaccinationRepository(db);
    const traitementRepo = new TraitementRepository(db);
    const visiteRepo = new VisiteVeterinaireRepository(db);

    // Vaccinations dans la période
    const vaccinations = await vaccinationRepo.query<Vaccination>(
      `SELECT * FROM vaccinations 
       WHERE projet_id = ? AND date_vaccination BETWEEN ? AND ? AND cout IS NOT NULL
       ORDER BY date_vaccination DESC`,
      [projetId, dateDebut, dateFin]
    );

    // Traitements dans la période
    const traitements = await traitementRepo.query<Traitement>(
      `SELECT * FROM traitements 
       WHERE projet_id = ? AND date_debut BETWEEN ? AND ? AND cout IS NOT NULL
       ORDER BY date_debut DESC`,
      [projetId, dateDebut, dateFin]
    );

    // Visites dans la période
    const visites = await visiteRepo.query<VisiteVeterinaire>(
      `SELECT * FROM visites_veterinaires 
       WHERE projet_id = ? AND date_visite BETWEEN ? AND ? AND cout IS NOT NULL
       ORDER BY date_visite DESC`,
      [projetId, dateDebut, dateFin]
    );

    const coutVaccinations = vaccinations.reduce((sum, v) => sum + (v.cout || 0), 0);
    const coutTraitements = traitements.reduce((sum, t) => sum + (t.cout || 0), 0);
    const coutVisites = visites.reduce((sum, v) => sum + (v.cout || 0), 0);

    return {
      vaccinations: coutVaccinations,
      traitements: coutTraitements,
      visites: coutVisites,
      total: coutVaccinations + coutTraitements + coutVisites,
      details: {
        vaccinations,
        traitements,
        visites,
      },
    };
  }
}


