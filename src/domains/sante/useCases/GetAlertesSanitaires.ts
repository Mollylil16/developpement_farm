/**
 * Use Case : Obtenir les alertes sanitaires
 * 
 * Identifie les alertes sanitaires nécessitant une attention
 */

import type { ISanteRepository } from '../repositories/ISanteRepository';
import { VaccinationEntity } from '../entities/Vaccination';
import { MaladieEntity } from '../entities/Maladie';

export interface AlerteSanitaire {
  type: 'vaccination_retard' | 'vaccination_rappel' | 'maladie_critique' | 'maladie_contagieuse';
  priorite: 'haute' | 'moyenne' | 'basse';
  message: string;
  data?: any;
}

export class GetAlertesSanitairesUseCase {
  constructor(private santeRepository: ISanteRepository) {}

  async execute(projetId: string): Promise<AlerteSanitaire[]> {
    const alertes: AlerteSanitaire[] = [];

    // Récupérer les vaccinations en retard
    const vaccinationsEnRetard = await this.santeRepository.findVaccinationsEnRetard(projetId);
    for (const vaccination of vaccinationsEnRetard) {
      const entity = new VaccinationEntity(vaccination);
      if (entity.isEnRetard()) {
        alertes.push({
          type: 'vaccination_retard',
          priorite: 'haute',
          message: `Vaccination en retard: ${vaccination.nomVaccin || vaccination.vaccin}`,
          data: vaccination,
        });
      }
    }

    // Récupérer toutes les vaccinations pour vérifier les rappels
    const vaccinations = await this.santeRepository.findVaccinationsByProjet(projetId);
    for (const vaccination of vaccinations) {
      const entity = new VaccinationEntity(vaccination);
      if (entity.isRappelNecessaire()) {
        alertes.push({
          type: 'vaccination_rappel',
          priorite: 'moyenne',
          message: `Rappel de vaccination nécessaire: ${vaccination.nomVaccin || vaccination.vaccin}`,
          data: vaccination,
        });
      }
    }

    // Récupérer les maladies en cours
    const maladiesEnCours = await this.santeRepository.findMaladiesEnCours(projetId);
    for (const maladie of maladiesEnCours) {
      const entity = new MaladieEntity(maladie);
      
      if (entity.isCritique()) {
        alertes.push({
          type: 'maladie_critique',
          priorite: 'haute',
          message: `Maladie critique détectée: ${maladie.nomMaladie}`,
          data: maladie,
        });
      }

      if (entity.necessiteInterventionUrgente()) {
        alertes.push({
          type: 'maladie_contagieuse',
          priorite: 'haute',
          message: `Maladie contagieuse nécessitant une intervention urgente: ${maladie.nomMaladie}`,
          data: maladie,
        });
      }
    }

    // Trier par priorité
    return alertes.sort((a, b) => {
      const prioriteOrder = { haute: 0, moyenne: 1, basse: 2 };
      return prioriteOrder[a.priorite] - prioriteOrder[b.priorite];
    });
  }
}

