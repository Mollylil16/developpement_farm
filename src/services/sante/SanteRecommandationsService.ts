/**
 * Service pour les recommandations sanitaires
 * Centralise la logique de génération de recommandations basées sur l'historique
 */

import { getDatabase } from '../database';
import {
  RappelVaccinationRepository,
  MaladieRepository,
  TraitementRepository,
  VisiteVeterinaireRepository,
  MortaliteRepository,
} from '../../database/repositories';

export interface RecommandationSanitaire {
  type: 'vaccination' | 'traitement' | 'visite' | 'alerte';
  priorite: 'haute' | 'moyenne' | 'basse';
  message: string;
  data?: any;
}

export interface TauxMortaliteParCause {
  cause: string;
  nombre: number;
  pourcentage: number;
}

export class SanteRecommandationsService {
  /**
   * Obtenir des recommandations sanitaires basées sur l'historique
   */
  static async getRecommandations(projetId: string): Promise<RecommandationSanitaire[]> {
    const db = await getDatabase();
    const rappelRepo = new RappelVaccinationRepository(db);
    const maladieRepo = new MaladieRepository(db);
    const traitementRepo = new TraitementRepository(db);
    const visiteRepo = new VisiteVeterinaireRepository(db);

    const recommendations: RecommandationSanitaire[] = [];

    // Vérifier les rappels en retard
    const rappelsEnRetard = await rappelRepo.findEnRetard(projetId);
    if (rappelsEnRetard.length > 0) {
      recommendations.push({
        type: 'vaccination',
        priorite: 'haute',
        message: `${rappelsEnRetard.length} rappel(s) de vaccination en retard`,
        data: { rappels: rappelsEnRetard },
      });
    }

    // Vérifier les rappels à venir
    const rappelsAVenir = await rappelRepo.findAVenir(projetId, 7);
    if (rappelsAVenir.length > 0) {
      recommendations.push({
        type: 'vaccination',
        priorite: 'moyenne',
        message: `${rappelsAVenir.length} vaccination(s) prévue(s) cette semaine`,
        data: { rappels: rappelsAVenir },
      });
    }

    // Vérifier les maladies en cours
    const maladiesEnCours = await maladieRepo.findEnCours(projetId);
    if (maladiesEnCours.length > 0) {
      const critiques = maladiesEnCours.filter((m) => m.gravite === 'critique');
      if (critiques.length > 0) {
        recommendations.push({
          type: 'alerte',
          priorite: 'haute',
          message: `${critiques.length} maladie(s) critique(s) en cours`,
          data: { maladies: critiques },
        });
      }
    }

    // Vérifier les traitements en cours
    const traitementsEnCours = await traitementRepo.findEnCours(projetId);
    if (traitementsEnCours.length > 0) {
      recommendations.push({
        type: 'traitement',
        priorite: 'moyenne',
        message: `${traitementsEnCours.length} traitement(s) en cours`,
        data: { traitements: traitementsEnCours },
      });
    }

    // Vérifier si une visite vétérinaire est prévue
    const prochaineVisite = await visiteRepo.findProchaineVisitePrevue(projetId);
    if (prochaineVisite) {
      recommendations.push({
        type: 'visite',
        priorite: 'basse',
        message: `Visite vétérinaire prévue le ${new Date(prochaineVisite.prochaine_visite || '').toLocaleDateString()}`,
        data: { visite: prochaineVisite },
      });
    }

    return recommendations;
  }

  /**
   * Obtenir le taux de mortalité par cause
   */
  static async getTauxMortaliteParCause(projetId: string): Promise<TauxMortaliteParCause[]> {
    const db = await getDatabase();
    const mortaliteRepo = new MortaliteRepository(db);

    // Récupérer toutes les mortalités du projet
    const mortalites = await mortaliteRepo.findByProjet(projetId);
    const total = mortalites.reduce((sum, m) => sum + m.nombre_porcs, 0);

    // Grouper par cause
    const parCause = new Map<string, number>();
    for (const mortalite of mortalites) {
      const cause = mortalite.cause || 'Non spécifiée';
      const current = parCause.get(cause) || 0;
      parCause.set(cause, current + mortalite.nombre_porcs);
    }

    // Convertir en array et calculer les pourcentages
    const result: TauxMortaliteParCause[] = Array.from(parCause.entries())
      .map(([cause, nombre]) => ({
        cause,
        nombre,
        pourcentage: total > 0 ? (nombre / total) * 100 : 0,
      }))
      .sort((a, b) => b.nombre - a.nombre);

    return result;
  }
}


