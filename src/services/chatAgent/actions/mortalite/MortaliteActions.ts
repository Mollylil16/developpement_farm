/**
 * Actions liées aux mortalités
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { format, subDays } from 'date-fns';
import apiClient from '../../../api/apiClient';

export class MortaliteActions {
  /**
   * Récupère les mortalités
   */
  static async getMortalites(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;
    const joursRecents = (paramsTyped.jours && typeof paramsTyped.jours === 'number' ? paramsTyped.jours : undefined) || 90;

    // Récupérer les mortalités depuis l'API backend
    const mortalites = await apiClient.get<any[]>(`/mortalites`, {
      params: {
        projet_id: context.projetId,
      },
    });

    // Filtrer par période si nécessaire
    const dateLimite = subDays(new Date(), joursRecents);
    const mortalitesRecentes = mortalites.filter((m) => {
      if (m.date) {
        const dateMortalite = new Date(m.date);
        return dateMortalite >= dateLimite;
      }
      return true;
    });

    if (mortalitesRecentes.length === 0) {
      return {
        success: true,
        message: `Aucune mortalité enregistrée dans les ${joursRecents} derniers jours.`,
        data: [],
      };
    }

    // Calculer les totaux
    const totalMortalites = mortalitesRecentes.reduce((sum, m) => sum + (m.nombre_porcs || 1), 0);
    const mortalitesParCause = mortalitesRecentes.reduce(
      (acc, m) => {
        const cause = m.cause || m.categorie || 'non_specifiee';
        acc[cause] = (acc[cause] || 0) + (m.nombre_porcs || 1);
        return acc;
      },
      {} as Record<string, number>
    );

    let message = `Mortalités (${joursRecents} derniers jours) : ${totalMortalites} porc(s)\n`;
    message += `\nRépartition par cause :\n`;
    Object.entries(mortalitesParCause).forEach(([cause, nombre]) => {
      message += `• ${cause} : ${nombre} porc(s)\n`;
    });

    return {
      success: true,
      message,
      data: {
        mortalites: mortalitesRecentes,
        total: totalMortalites,
        par_cause: mortalitesParCause,
      },
    };
  }

  /**
   * Calcule le taux de mortalité
   */
  static async getTauxMortalite(
    params: unknown,
    context: AgentContext
  ): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;
    const periode = (paramsTyped.periode && typeof paramsTyped.periode === 'string' ? paramsTyped.periode : undefined) || '30j';

    // Déterminer la période
    let jours: number;
    switch (periode) {
      case '7j':
        jours = 7;
        break;
      case '30j':
        jours = 30;
        break;
      case '90j':
        jours = 90;
        break;
      case '1an':
        jours = 365;
        break;
      default:
        jours = 30;
    }

    // Récupérer les mortalités
    const mortalites = await apiClient.get<any[]>(`/mortalites`, {
      params: {
        projet_id: context.projetId,
      },
    });

    const dateLimite = subDays(new Date(), jours);
    const mortalitesRecentes = mortalites.filter((m) => {
      if (m.date) {
        const dateMortalite = new Date(m.date);
        return dateMortalite >= dateLimite;
      }
      return true;
    });

    const totalMortalites = mortalitesRecentes.reduce((sum, m) => sum + (m.nombre_porcs || 1), 0);

    // Récupérer le nombre total d'animaux actifs
    const animaux = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: context.projetId },
    });

    const animauxActifs = animaux.filter((a) => a.statut === 'actif').length;

    // Calculer le taux de mortalité
    let tauxMortalite = 0;
    if (animauxActifs > 0) {
      tauxMortalite = (totalMortalites / animauxActifs) * 100;
    }

    let message = `Taux de mortalité (${jours} derniers jours) :\n`;
    message += `• Mortalités : ${totalMortalites} porc(s)\n`;
    message += `• Animaux actifs : ${animauxActifs}\n`;
    message += `• Taux : ${tauxMortalite.toFixed(2)}%`;

    if (tauxMortalite > 5) {
      message += `\n\n⚠️ Attention : Taux de mortalité élevé. Il est recommandé de consulter un vétérinaire.`;
    } else if (tauxMortalite > 2) {
      message += `\n\n⚠️ Taux de mortalité modéré. Surveillez bien vos animaux.`;
    } else {
      message += `\n\n✅ Taux de mortalité normal.`;
    }

    return {
      success: true,
      message,
      data: {
        periode_jours: jours,
        total_mortalites: totalMortalites,
        animaux_actifs: animauxActifs,
        taux_mortalite: tauxMortalite,
      },
    };
  }

  /**
   * Analyse les causes de mortalité
   */
  static async analyzeCausesMortalite(
    params: unknown,
    context: AgentContext
  ): Promise<AgentActionResult> {
    // Récupérer les mortalités
    const mortalites = await apiClient.get<any[]>(`/mortalites`, {
      params: {
        projet_id: context.projetId,
      },
    });

    if (mortalites.length === 0) {
      return {
        success: true,
        message: 'Aucune mortalité enregistrée pour analyser.',
        data: null,
      };
    }

    // Analyser les causes
    const causes = mortalites.reduce(
      (acc, m) => {
        const cause = m.cause || m.categorie || 'non_specifiee';
        if (!acc[cause]) {
          acc[cause] = {
            nombre: 0,
            pourcentage: 0,
            exemples: [] as any[],
          };
        }
        acc[cause].nombre += m.nombre_porcs || 1;
        if (m.notes || m.description) {
          acc[cause].exemples.push({
            date: m.date,
            notes: m.notes || m.description,
          });
        }
        return acc;
      },
      {} as Record<
        string,
        {
          nombre: number;
          pourcentage: number;
          exemples: Array<{ date: string; notes: string }>;
        }
      >
    );

    const totalMortalites = Object.values(causes).reduce((sum, c) => sum + c.nombre, 0);

    // Calculer les pourcentages
    Object.keys(causes).forEach((cause) => {
      causes[cause].pourcentage = (causes[cause].nombre / totalMortalites) * 100;
    });

    // Trier par nombre décroissant
    const causesTriees = Object.entries(causes).sort((a, b) => b[1].nombre - a[1].nombre);

    let message = `Analyse des causes de mortalité :\n`;
    message += `• Total : ${totalMortalites} porc(s)\n\n`;
    message += `Causes principales :\n`;

    causesTriees.slice(0, 5).forEach(([cause, data]) => {
      message += `\n• ${cause} : ${data.nombre} porc(s) (${data.pourcentage.toFixed(1)}%)`;
    });

    // Recommandations
    const recommandations: string[] = [];
    if (causesTriees[0] && causesTriees[0][1].pourcentage > 50) {
      recommandations.push(`La cause "${causesTriees[0][0]}" représente plus de 50% des mortalités. Il est urgent d'agir.`);
    }
    if (causesTriees.find(([cause]) => cause.includes('maladie') || cause.includes('infection'))) {
      recommandations.push('Des maladies/infections sont détectées. Consultez un vétérinaire et renforcez les mesures sanitaires.');
    }
    if (causesTriees.find(([cause]) => cause.includes('stress') || cause.includes('chaleur'))) {
      recommandations.push('Le stress ou la chaleur sont des causes. Améliorez les conditions d\'élevage (ventilation, ombrage).');
    }

    if (recommandations.length > 0) {
      message += `\n\nRecommandations :\n`;
      recommandations.forEach((rec) => {
        message += `• ${rec}\n`;
      });
    }

    return {
      success: true,
      message,
      data: {
        causes: causesTriees.map(([cause, data]) => ({
          cause,
          nombre: data.nombre,
          pourcentage: data.pourcentage,
          exemples: data.exemples.slice(0, 3), // Limiter à 3 exemples
        })),
        total: totalMortalites,
        recommandations,
      },
    };
  }
}

