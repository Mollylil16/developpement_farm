/**
 * Service pour les alertes sanitaires
 * Centralise la logique de détection et génération d'alertes sanitaires
 */

import { getDatabase } from '../database';
import {
  RappelVaccinationRepository,
  MaladieRepository,
  MortaliteRepository,
  VisiteVeterinaireRepository,
} from '../../database/repositories';

export interface AlerteSanitaire {
  type: 'rappel_retard' | 'maladie_critique' | 'epidemie' | 'mortalite_elevee';
  gravite: 'critique' | 'elevee' | 'moyenne';
  message: string;
  date: string;
  data?: any;
}

export class SanteAlertesService {
  /**
   * Obtenir les alertes sanitaires urgentes
   */
  static async getAlertesSanitaires(projetId: string): Promise<AlerteSanitaire[]> {
    const db = await getDatabase();
    const rappelRepo = new RappelVaccinationRepository(db);
    const maladieRepo = new MaladieRepository(db);
    const mortaliteRepo = new MortaliteRepository(db);

    const alertes: AlerteSanitaire[] = [];

    // Rappels en retard
    const rappelsEnRetard = await rappelRepo.findEnRetard(projetId);
    if (rappelsEnRetard.length > 0) {
      alertes.push({
        type: 'rappel_retard',
        gravite: 'elevee',
        message: `${rappelsEnRetard.length} rappel(s) de vaccination en retard`,
        date: new Date().toISOString(),
        data: { rappels: rappelsEnRetard },
      });
    }

    // Maladies critiques
    const maladiesEnCours = await maladieRepo.findEnCours(projetId);
    const maladiesCritiques = maladiesEnCours.filter((m) => m.gravite === 'critique');
    if (maladiesCritiques.length > 0) {
      alertes.push({
        type: 'maladie_critique',
        gravite: 'critique',
        message: `${maladiesCritiques.length} maladie(s) critique(s) nécessitant une attention immédiate`,
        date: new Date().toISOString(),
        data: { maladies: maladiesCritiques },
      });
    }

    // Détection d'épidémie (maladies contagieuses multiples)
    const maladiesContagieuses = maladiesEnCours.filter((m) => m.contagieux === true);
    if (maladiesContagieuses.length >= 3) {
      alertes.push({
        type: 'epidemie',
        gravite: 'critique',
        message: `Risque d'épidémie détecté : ${maladiesContagieuses.length} cas de maladies contagieuses actives`,
        date: new Date().toISOString(),
        data: { nombre: maladiesContagieuses.length },
      });
    }

    // Mortalité élevée (derniers 30 jours)
    const date30JoursAvant = new Date();
    date30JoursAvant.setDate(date30JoursAvant.getDate() - 30);
    const mortalitesRecentes = await mortaliteRepo.findByPeriod(
      projetId,
      date30JoursAvant.toISOString(),
      new Date().toISOString()
    );
    const nombreMortalites = mortalitesRecentes.reduce((sum, m) => sum + m.nombre_porcs, 0);
    if (nombreMortalites >= 5) {
      alertes.push({
        type: 'mortalite_elevee',
        gravite: 'elevee',
        message: `Taux de mortalité élevé : ${nombreMortalites} décès dans les 30 derniers jours`,
        date: new Date().toISOString(),
        data: { nombre: nombreMortalites },
      });
    }

    return alertes;
  }
}

