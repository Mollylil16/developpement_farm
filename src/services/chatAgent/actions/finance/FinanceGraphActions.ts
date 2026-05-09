/**
 * Actions liées aux graphiques financiers
 */

import { AgentActionResult, AgentContext } from '../../../../types/chatAgent';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import apiClient from '../../../api/apiClient';

export class FinanceGraphActions {
  /**
   * Génère les données de graphique financier
   */
  static async generateGraphFinances(
    params: unknown,
    context: AgentContext
  ): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;
    const nombreMois = (paramsTyped.mois && typeof paramsTyped.mois === 'number' ? paramsTyped.mois : undefined) || 6;

    // Récupérer les données financières
    const revenus = await apiClient.get<any[]>(`/finance/revenus`, {
      params: { projet_id: context.projetId },
    });

    const depenses = await apiClient.get<any[]>(`/finance/depenses-ponctuelles`, {
      params: { projet_id: context.projetId },
    });

    const chargesFixes = await apiClient.get<any[]>(`/finance/charges-fixes`, {
      params: { projet_id: context.projetId },
    });

    // Calculer les données pour les N derniers mois
    const now = new Date();
    const monthsData: Array<{
      mois: string;
      revenus: number;
      depenses: number;
      solde: number;
    }> = [];

    for (let i = nombreMois - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, 'MMM yyyy', { locale: fr });

      // Revenus du mois
      const revenusMois = revenus
        .filter((r) => {
          const rDate = parseISO(r.date);
          return rDate >= monthStart && rDate <= monthEnd;
        })
        .reduce((sum, r) => sum + (r.montant || 0), 0);

      // Dépenses ponctuelles du mois
      const depensesPonctuellesMois = depenses
        .filter((d) => {
          const dDate = parseISO(d.date);
          return dDate >= monthStart && dDate <= monthEnd;
        })
        .reduce((sum, d) => sum + (d.montant || 0), 0);

      // Charges fixes du mois
      const chargesFixesMois = chargesFixes
        .filter((cf) => cf.statut === 'actif')
        .reduce((sum, cf) => {
          const cfDate = parseISO(cf.date_debut);
          if (cfDate <= monthEnd) {
            let montantMensuel = 0;
            switch (cf.frequence) {
              case 'mensuel':
                montantMensuel = cf.montant;
                break;
              case 'trimestriel':
                // Calculer si ce mois est dans le trimestre
                const moisDansAnnee = monthDate.getMonth();
                if (moisDansAnnee % 3 === 0) {
                  montantMensuel = cf.montant / 3;
                }
                break;
              case 'annuel':
                if (i === nombreMois - 1) {
                  montantMensuel = cf.montant / 12;
                }
                break;
            }
            return sum + montantMensuel;
          }
          return sum;
        }, 0);

      const depensesMois = depensesPonctuellesMois + chargesFixesMois;
      const solde = revenusMois - depensesMois;

      monthsData.push({
        mois: monthKey,
        revenus: revenusMois,
        depenses: depensesMois,
        solde,
      });
    }

    // Construire le message descriptif
    let message = `Évolution financière (${nombreMois} derniers mois) :\n\n`;
    monthsData.forEach((data) => {
      message += `${data.mois} :\n`;
      message += `  • Revenus : ${data.revenus.toLocaleString('fr-FR')} FCFA\n`;
      message += `  • Dépenses : ${data.depenses.toLocaleString('fr-FR')} FCFA\n`;
      message += `  • Solde : ${data.solde >= 0 ? '+' : ''}${data.solde.toLocaleString('fr-FR')} FCFA\n\n`;
    });

    // Calculer les tendances
    const totalRevenus = monthsData.reduce((sum, d) => sum + d.revenus, 0);
    const totalDepenses = monthsData.reduce((sum, d) => sum + d.depenses, 0);
    const soldeTotal = totalRevenus - totalDepenses;

    message += `Totaux (${nombreMois} mois) :\n`;
    message += `• Revenus : ${totalRevenus.toLocaleString('fr-FR')} FCFA\n`;
    message += `• Dépenses : ${totalDepenses.toLocaleString('fr-FR')} FCFA\n`;
    message += `• Solde : ${soldeTotal >= 0 ? '+' : ''}${soldeTotal.toLocaleString('fr-FR')} FCFA`;

    return {
      success: true,
      message,
      data: {
        monthsData,
        totalRevenus,
        totalDepenses,
        soldeTotal,
        nombreMois,
      },
    };
  }

  /**
   * Décrit les tendances des graphiques financiers
   */
  static async describeGraphTrends(
    params: unknown,
    context: AgentContext
  ): Promise<AgentActionResult> {
    // Générer les données de graphique
    const graphResult = await this.generateGraphFinances(params, context);

    if (!graphResult.success || !graphResult.data) {
      return graphResult;
    }

    const data = graphResult.data as {
      monthsData: Array<{ mois: string; revenus: number; depenses: number; solde: number }>;
      totalRevenus: number;
      totalDepenses: number;
      soldeTotal: number;
    };

    // Analyser les tendances
    const tendances: string[] = [];

    // Tendance des revenus
    if (data.monthsData.length >= 2) {
      const revenusPremier = data.monthsData[0].revenus;
      const revenusDernier = data.monthsData[data.monthsData.length - 1].revenus;
      const evolutionRevenus = ((revenusDernier - revenusPremier) / revenusPremier) * 100;

      if (evolutionRevenus > 10) {
        tendances.push(`📈 Revenus en hausse de ${evolutionRevenus.toFixed(1)}% sur la période`);
      } else if (evolutionRevenus < -10) {
        tendances.push(`📉 Revenus en baisse de ${Math.abs(evolutionRevenus).toFixed(1)}% sur la période`);
      } else {
        tendances.push(`➡️ Revenus stables (variation de ${evolutionRevenus.toFixed(1)}%)`);
      }
    }

    // Tendance des dépenses
    if (data.monthsData.length >= 2) {
      const depensesPremier = data.monthsData[0].depenses;
      const depensesDernier = data.monthsData[data.monthsData.length - 1].depenses;
      const evolutionDepenses = ((depensesDernier - depensesPremier) / depensesPremier) * 100;

      if (evolutionDepenses > 10) {
        tendances.push(`📈 Dépenses en hausse de ${evolutionDepenses.toFixed(1)}% sur la période`);
      } else if (evolutionDepenses < -10) {
        tendances.push(`📉 Dépenses en baisse de ${Math.abs(evolutionDepenses).toFixed(1)}% sur la période`);
      } else {
        tendances.push(`➡️ Dépenses stables (variation de ${evolutionDepenses.toFixed(1)}%)`);
      }
    }

    // Analyse du solde
    if (data.soldeTotal > 0) {
      tendances.push(`✅ Bénéfice net de ${data.soldeTotal.toLocaleString('fr-FR')} FCFA sur la période`);
    } else if (data.soldeTotal < 0) {
      tendances.push(`⚠️ Perte nette de ${Math.abs(data.soldeTotal).toLocaleString('fr-FR')} FCFA sur la période`);
    } else {
      tendances.push(`➡️ Équilibre financier (solde nul)`);
    }

    // Mois le plus rentable
    const moisPlusRentable = data.monthsData.reduce((max, m) => (m.solde > max.solde ? m : max), data.monthsData[0]);
    if (moisPlusRentable.solde > 0) {
      tendances.push(`🏆 Meilleur mois : ${moisPlusRentable.mois} avec un solde de ${moisPlusRentable.solde.toLocaleString('fr-FR')} FCFA`);
    }

    let message = `Analyse des tendances financières :\n\n`;
    tendances.forEach((tendance) => {
      message += `${tendance}\n`;
    });

    return {
      success: true,
      message,
      data: {
        tendances,
        graphData: data,
      },
    };
  }
}

