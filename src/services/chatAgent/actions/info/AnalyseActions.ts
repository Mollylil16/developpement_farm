/**
 * Actions liées aux analyses de données
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { format } from 'date-fns';
import apiClient from '../../../api/apiClient';

export class AnalyseActions {
  /**
   * Analyse les données de l'exploitation
   */
  static async analyzeData(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    // Utiliser params pour déterminer le type d'analyse demandé
    let analysisType = 'general';
    if (params && typeof params === 'object') {
      const analysisParams = params as Record<string, unknown>;
      if (analysisParams.type && typeof analysisParams.type === 'string') {
        analysisType = analysisParams.type;
      }
    }

    const analysisConfig = {
      type: analysisType,
      includePerformance: analysisType === 'performance' || analysisType === 'general',
      includeFinancial: analysisType === 'financial' || analysisType === 'general',
      includeProduction: analysisType === 'production' || analysisType === 'general',
    };

    const analysisResults: Record<string, unknown> = {};

    // Récupérer toutes les données depuis l'API backend
    const animaux = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: context.projetId },
    });

    // Statistiques des animaux (toujours incluses)
    const statsAnimaux = {
      actifs: animaux.filter((a) => a.statut === 'actif').length,
      truies: animaux.filter((a) => a.sexe === 'femelle' && a.reproducteur).length,
      verrats: animaux.filter((a) => a.sexe === 'male' && a.reproducteur).length,
      porcelets: animaux.filter((a) => a.categorie_poids === 'porcelet').length,
    };
    analysisResults.animaux = statsAnimaux;

    // Revenus et dépenses (30 derniers jours)
    let totalRevenus = 0;
    let totalDepenses = 0;
    if (analysisConfig.includeFinancial) {
      const dateFin = new Date();
      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - 30);

      const allRevenus = await apiClient.get<any[]>(`/finance/revenus`, {
        params: { projet_id: context.projetId },
      });
      const revenus = allRevenus.filter(
        (r) => r.date >= dateDebut.toISOString().split('T')[0] && r.date <= dateFin.toISOString().split('T')[0]
      );
      const allDepenses = await apiClient.get<any[]>(`/finance/depenses-ponctuelles`, {
        params: { projet_id: context.projetId },
      });
      const depenses = allDepenses.filter(
        (d) => d.date >= dateDebut.toISOString().split('T')[0] && d.date <= dateFin.toISOString().split('T')[0]
      );

      totalRevenus = revenus.reduce((sum, r) => sum + (r.montant || 0), 0);
      totalDepenses = depenses.reduce((sum, d) => sum + (d.montant || 0), 0);
      analysisResults.finances = { totalRevenus, totalDepenses, solde: totalRevenus - totalDepenses };
    }

    // Statistiques des pesées
    let statsPesees = null;
    if (analysisConfig.includePerformance) {
      const allPesees = await apiClient.get<any[]>(`/production/pesees`, {
        params: { projet_id: context.projetId },
      });
      statsPesees = {
        nombrePesees: allPesees.length,
        poidsMoyen: allPesees.length > 0
          ? allPesees.reduce((sum, p) => sum + (p.poids_kg || 0), 0) / allPesees.length
          : 0,
      };
      analysisResults.performance = statsPesees;
    }

    // Construire le message
    let message = `Analyse de ton exploitation (type: ${analysisConfig.type}) :\n`;
    message += `- Animaux : ${statsAnimaux.actifs} actifs (${statsAnimaux.truies} truies, ${statsAnimaux.verrats} verrats, ${statsAnimaux.porcelets} porcelets)\n`;

    if (analysisConfig.includeFinancial) {
      message += `- Finances (30j) : ${totalRevenus.toLocaleString('fr-FR')} FCFA revenus, ${totalDepenses.toLocaleString('fr-FR')} FCFA dépenses\n`;
    }

    if (analysisConfig.includePerformance && statsPesees) {
      message += `- Poids moyen : ${statsPesees.poidsMoyen.toFixed(1)} kg\n`;
    }

    // Vaccinations et maladies récentes
    const allVaccinations = await apiClient.get<any[]>(`/sante/vaccinations`, {
      params: { projet_id: context.projetId },
    });
    const vaccinationsRecentes = allVaccinations.filter((v) => {
      const dateVacc = new Date(v.date_vaccination);
      const dateLimite = new Date();
      dateLimite.setDate(dateLimite.getDate() - 30);
      return dateVacc >= dateLimite;
    });

    const allMaladies = await apiClient.get<any[]>(`/sante/maladies`, {
      params: { projet_id: context.projetId },
    });
    const maladiesRecentes = allMaladies.filter((m) => {
      const dateDebut = new Date(m.date_debut);
      const dateLimite = new Date();
      dateLimite.setDate(dateLimite.getDate() - 30);
      return dateDebut >= dateLimite;
    });

    message += `- Vaccinations (30j) : ${vaccinationsRecentes.length}\n`;
    message += `- Maladies (30j) : ${maladiesRecentes.length}\n`;

    // Recommandations
    const recommandations: string[] = [];
    if (statsAnimaux.porcelets > 0 && vaccinationsRecentes.length === 0) {
      recommandations.push('Pense à vacciner tes porcelets-là');
    }

    if (analysisConfig.includeFinancial && totalDepenses > totalRevenus) {
      recommandations.push('Attention, tes dépenses dépassent tes revenus ce mois-ci');
    }

    if (maladiesRecentes.length > 0) {
      recommandations.push(
        `${maladiesRecentes.length} maladie(s) récente(s) détectée(s), surveille bien tes animaux`
      );
    }

    if (recommandations.length > 0) {
      message += '\nRecommandations :\n' + recommandations.map((r) => `- ${r}`).join('\n');
    }

    return {
      success: true,
      message,
      data: {
        ...analysisResults,
        vaccinationsRecentes: vaccinationsRecentes.length,
        maladiesRecentes: maladiesRecentes.length,
        recommandations,
      },
    };
  }

  /**
   * Crée une planification (tâche/rappel)
   */
  static async createPlanification(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    if (!paramsTyped.titre || typeof paramsTyped.titre !== 'string') {
      throw new Error('Le titre de la tâche est requis.');
    }

    const type = (paramsTyped.type && typeof paramsTyped.type === 'string' ? paramsTyped.type : undefined) || 'autre';

    const datePrevue = (paramsTyped.date_prevue && typeof paramsTyped.date_prevue === 'string' ? paramsTyped.date_prevue : undefined) || (paramsTyped.date && typeof paramsTyped.date === 'string' ? paramsTyped.date : undefined) || new Date().toISOString().split('T')[0];

    // Calculer la date de rappel (1 jour avant par défaut)
    const dateRappel = new Date(datePrevue);
    dateRappel.setDate(dateRappel.getDate() - 1);
    const rappel = dateRappel.toISOString().split('T')[0];

    // Créer la planification via l'API backend
    const planification = await apiClient.post<any>('/planifications', {
      projet_id: context.projetId,
      type: type,
      titre: paramsTyped.titre,
      description: (paramsTyped.description && typeof paramsTyped.description === 'string' ? paramsTyped.description : undefined) || `Rappel : ${paramsTyped.titre}`,
      date_prevue: datePrevue,
      date_echeance: (paramsTyped.date_echeance && typeof paramsTyped.date_echeance === 'string' ? paramsTyped.date_echeance : undefined) || datePrevue,
      rappel: rappel,
      statut: 'a_faire',
      notes: paramsTyped.notes && typeof paramsTyped.notes === 'string' ? paramsTyped.notes : undefined,
    });

    const dateFormatee = format(new Date(datePrevue), 'dd/MM/yyyy');
    const message = `C'est noté ! Rappel créé dans le planning : "${paramsTyped.titre}" pour le ${dateFormatee}.`;

    return {
      success: true,
      message,
      data: planification,
    };
  }
}

