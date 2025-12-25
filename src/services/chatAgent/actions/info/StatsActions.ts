/**
 * Actions liées aux statistiques
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { format } from 'date-fns';
import apiClient from '../../../api/apiClient';

export class StatsActions {
  /**
   * Récupère les statistiques
   */
  static async getStatistics(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    // Récupérer les données depuis l'API backend
    const animaux = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: context.projetId },
    });

    // Calculer les statistiques des animaux
    const statsAnimaux = {
      actifs: animaux.filter((a) => a.statut === 'actif').length,
      truies: animaux.filter((a) => a.sexe === 'femelle' && a.reproducteur).length,
      verrats: animaux.filter((a) => a.sexe === 'male' && a.reproducteur).length,
      porcelets: animaux.filter((a) => a.categorie_poids === 'porcelet').length,
    };

    // Statistiques financières
    const revenus = await apiClient.get<any[]>(`/finance/revenus`, {
      params: { projet_id: context.projetId },
    });
    const depenses = await apiClient.get<any[]>(`/finance/depenses-ponctuelles`, {
      params: { projet_id: context.projetId },
    });

    const totalRevenus = revenus.reduce((sum, r) => sum + (r.montant || 0), 0);
    const totalDepenses = depenses.reduce((sum, d) => sum + (d.montant || 0), 0);
    const solde = totalRevenus - totalDepenses;

    // Statistiques des pesées
    const pesees = await apiClient.get<any[]>(`/production/pesees`, {
      params: { projet_id: context.projetId },
    });
    const statsPesees = {
      nombrePesees: pesees.length,
      poidsMoyen: pesees.length > 0
        ? pesees.reduce((sum, p) => sum + (p.poids_kg || 0), 0) / pesees.length
        : 0,
    };

    // Statistiques des dépenses par catégorie
    const depensesParCategorie = depenses.reduce(
      (acc, d) => {
        const cat = d.categorie || 'autre';
        acc[cat] = (acc[cat] || 0) + (d.montant || 0);
        return acc;
      },
      {} as Record<string, number>
    );

    const statistics = {
      animaux: statsAnimaux,
      finances: {
        totalRevenus,
        totalDepenses,
        solde,
        nombreVentes: revenus.length,
        nombreDepenses: depenses.length,
        depensesParCategorie,
      },
      pesees: statsPesees,
    };

    const message = `Statistiques de votre cheptel :
• Animaux actifs : ${statsAnimaux.actifs} (${statsAnimaux.truies} truies, ${statsAnimaux.verrats} verrats, ${statsAnimaux.porcelets} porcelets)
• Finances : ${totalRevenus.toLocaleString('fr-FR')} FCFA de revenus, ${totalDepenses.toLocaleString('fr-FR')} FCFA de dépenses
• Solde : ${solde.toLocaleString('fr-FR')} FCFA
• Pesées : ${statsPesees.nombrePesees} pesées effectuées, poids moyen : ${statsPesees.poidsMoyen.toFixed(1)} kg`;

    return {
      success: true,
      message,
      data: statistics,
    };
  }

  /**
   * Calcule les coûts
   */
  static async calculateCosts(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Période de calcul (par défaut : dernier mois)
    const dateFin = (paramsTyped.date_fin && typeof paramsTyped.date_fin === 'string' ? paramsTyped.date_fin : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0];
    const dateDebut =
      (paramsTyped.date_debut && typeof paramsTyped.date_debut === 'string' ? paramsTyped.date_debut : undefined) ||
      (() => {
        const d = new Date(dateFin);
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
      })();

    // Récupérer les dépenses de la période depuis l'API backend
    const allDepenses = await apiClient.get<any[]>(`/finance/depenses-ponctuelles`, {
      params: { projet_id: context.projetId },
    });
    const depenses = allDepenses.filter(
      (d) => d.date >= dateDebut && d.date <= dateFin
    );

    // Récupérer les charges fixes depuis l'API backend
    const chargesFixes = await apiClient.get<any[]>(`/finance/charges-fixes`, {
      params: { projet_id: context.projetId },
    });

    // Calculer les coûts par catégorie
    const coutsParCategorie = depenses.reduce(
      (acc, d) => {
        const cat = d.categorie || 'autre';
        acc[cat] = (acc[cat] || 0) + (d.montant || 0);
        return acc;
      },
      {} as Record<string, number>
    );

    // Total des dépenses ponctuelles
    const totalDepensesPonctuelles = depenses.reduce((sum, d) => sum + (d.montant || 0), 0);

    // Total des charges fixes (convertir en mensuel selon la fréquence)
    const totalChargesFixes = chargesFixes.reduce((sum, c) => {
      let montantMensuel = 0;
      switch (c.frequence) {
        case 'mensuel':
          montantMensuel = c.montant;
          break;
        case 'trimestriel':
          montantMensuel = c.montant / 3;
          break;
        case 'annuel':
          montantMensuel = c.montant / 12;
          break;
      }
      return sum + montantMensuel;
    }, 0);

    // Coût total
    const coutTotal = totalDepensesPonctuelles + totalChargesFixes;

    const message = `Calcul des coûts (${format(new Date(dateDebut), 'dd/MM/yyyy')} - ${format(new Date(dateFin), 'dd/MM/yyyy')}) :
• Dépenses ponctuelles : ${totalDepensesPonctuelles.toLocaleString('fr-FR')} FCFA
• Charges fixes : ${totalChargesFixes.toLocaleString('fr-FR')} FCFA/mois
• Coût total : ${coutTotal.toLocaleString('fr-FR')} FCFA`;

    return {
      success: true,
      message,
      data: {
        periode: { dateDebut, dateFin },
        totalDepensesPonctuelles,
        totalChargesFixes,
        coutTotal,
        coutsParCategorie,
      },
    };
  }
}

