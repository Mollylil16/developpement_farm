/**
 * Service pour les temps d'attente avant abattage
 * Centralise la logique de calcul des temps d'attente après traitements
 */

import { getDatabase } from '../database';
import { TraitementRepository } from '../../database/repositories';
import type { Traitement } from '../../types';

export interface AnimalTempsAttente {
  animal_id: string;
  traitement: Traitement;
  date_fin_attente: string;
  jours_restants: number;
}

export class SanteTempsAttenteService {
  /**
   * Obtenir les animaux en période d'attente avant abattage
   */
  static async getAnimauxEnAttente(projetId: string): Promise<AnimalTempsAttente[]> {
    const db = await getDatabase();
    const traitementRepo = new TraitementRepository(db);

    const now = new Date();

    // Récupérer tous les traitements avec temps d'attente
    const traitements = await traitementRepo.query<Traitement>(
      `SELECT * FROM traitements 
       WHERE projet_id = ? 
       AND temps_attente_abattage_jours IS NOT NULL 
       AND animal_id IS NOT NULL
       ORDER BY date_debut DESC`,
      [projetId]
    );

    const animauxAvecAttente: AnimalTempsAttente[] = [];

    for (const traitement of traitements) {
      if (!traitement.date_debut || !traitement.temps_attente_abattage_jours || !traitement.animal_id) {
        continue;
      }

      const dateDebut = new Date(traitement.date_debut);
      const tempsAttente = traitement.temps_attente_abattage_jours;
      const dateFinAttente = new Date(dateDebut.getTime() + tempsAttente * 24 * 60 * 60 * 1000);

      // Vérifier si le temps d'attente est toujours actif
      if (dateFinAttente > now) {
        const joursRestants = Math.ceil((dateFinAttente.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        animauxAvecAttente.push({
          animal_id: traitement.animal_id,
          traitement,
          date_fin_attente: dateFinAttente.toISOString(),
          jours_restants: joursRestants,
        });
      }
    }

    // Trier par jours restants (plus urgent en premier)
    return animauxAvecAttente.sort((a, b) => a.jours_restants - b.jours_restants);
  }
}


