/**
 * Actions liées au bilan financier complet
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import apiClient from '../../../api/apiClient';

interface BilanCompletData {
  periode: {
    date_debut: string;
    date_fin: string;
    nombre_mois: number;
  };
  revenus: {
    total: number;
    par_categorie: Record<string, number>;
    nombre_transactions: number;
  };
  depenses: {
    opex_total: number;
    charges_fixes_total: number;
    total: number;
    par_categorie: Record<string, number>;
    nombre_transactions: number;
  };
  dettes: {
    total: number;
    nombre: number;
    interets_mensuels: number;
    liste: Array<{
      id: string;
      libelle: string;
      montant_restant: number;
      date_echeance: string | null;
      taux_interet: number;
    }>;
  };
  actifs: {
    valeur_cheptel: number;
    valeur_stocks: number;
    total: number;
    nombre_animaux: number;
    poids_moyen_cheptel: number;
  };
  resultats: {
    solde: number;
    marge_brute: number;
    cash_flow: number;
  };
  indicateurs: {
    taux_endettement: number;
    ratio_rentabilite: number;
    cout_kg_opex: number;
    total_kg_vendus: number;
  };
}

export class BilanActions {
  /**
   * Récupère le bilan financier complet
   */
  static async getBilanFinancier(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;
    
    // Déterminer la période
    let dateDebut: string;
    let dateFin: string = new Date().toISOString();
    
    const periode = paramsTyped.periode as string | undefined;
    if (periode === 'mois_precedent' || periode === 'mois précédent') {
      const moisPrecedent = subMonths(new Date(), 1);
      dateDebut = startOfMonth(moisPrecedent).toISOString();
      dateFin = endOfMonth(moisPrecedent).toISOString();
    } else if (periode === 'trimestre') {
      dateDebut = subMonths(new Date(), 3).toISOString();
      dateFin = new Date().toISOString();
    } else if (periode === 'annee' || periode === 'année') {
      const maintenant = new Date();
      dateDebut = new Date(maintenant.getFullYear(), 0, 1).toISOString();
      dateFin = new Date().toISOString();
    } else {
      // Mois actuel par défaut
      dateDebut = startOfMonth(new Date()).toISOString();
      dateFin = endOfMonth(new Date()).toISOString();
    }

    // Récupérer le bilan depuis l'API
    const bilan = await apiClient.get<BilanCompletData>('/finance/bilan-complet', {
      params: {
        projet_id: context.projetId,
        date_debut: dateDebut,
        date_fin: dateFin,
      },
    });

    // Formater le message
    const periodeFormatted = `${format(parseISO(bilan.periode.date_debut), 'dd MMM yyyy', { locale: fr })} - ${format(parseISO(bilan.periode.date_fin), 'dd MMM yyyy', { locale: fr })}`;
    
    let message = `📊 Bilan Financier Complet (${periodeFormatted})\n\n`;
    
    // Résultats
    message += `💰 RÉSULTATS FINANCIERS\n`;
    message += `• Solde Net : ${bilan.resultats.solde >= 0 ? '+' : ''}${bilan.resultats.solde.toLocaleString('fr-FR')} FCFA\n`;
    message += `• Marge Brute : ${bilan.resultats.marge_brute.toLocaleString('fr-FR')} FCFA\n`;
    message += `• Cash Flow : ${bilan.resultats.cash_flow >= 0 ? '+' : ''}${bilan.resultats.cash_flow.toLocaleString('fr-FR')} FCFA\n\n`;
    
    // Revenus
    message += `📈 REVENUS\n`;
    message += `• Total : ${bilan.revenus.total.toLocaleString('fr-FR')} FCFA (${bilan.revenus.nombre_transactions} transaction(s))\n`;
    if (Object.keys(bilan.revenus.par_categorie).length > 0) {
      message += `• Répartition :\n`;
      Object.entries(bilan.revenus.par_categorie).forEach(([cat, montant]) => {
        const pourcentage = bilan.revenus.total > 0 ? ((montant / bilan.revenus.total) * 100).toFixed(1) : '0';
        message += `  - ${cat} : ${montant.toLocaleString('fr-FR')} FCFA (${pourcentage}%)\n`;
      });
    }
    message += '\n';
    
    // Dépenses
    message += `📉 DÉPENSES\n`;
    message += `• OPEX : ${bilan.depenses.opex_total.toLocaleString('fr-FR')} FCFA\n`;
    message += `• Charges Fixes : ${bilan.depenses.charges_fixes_total.toLocaleString('fr-FR')} FCFA\n`;
    message += `• Total : ${bilan.depenses.total.toLocaleString('fr-FR')} FCFA (${bilan.depenses.nombre_transactions} transaction(s))\n`;
    if (Object.keys(bilan.depenses.par_categorie).length > 0) {
      message += `• Répartition :\n`;
      Object.entries(bilan.depenses.par_categorie).slice(0, 5).forEach(([cat, montant]) => {
        const pourcentage = bilan.depenses.total > 0 ? ((montant / bilan.depenses.total) * 100).toFixed(1) : '0';
        message += `  - ${cat} : ${montant.toLocaleString('fr-FR')} FCFA (${pourcentage}%)\n`;
      });
    }
    message += '\n';
    
    // Dettes
    message += `💳 DETTES\n`;
    message += `• Total : ${bilan.dettes.total.toLocaleString('fr-FR')} FCFA (${bilan.dettes.nombre} dette(s))\n`;
    message += `• Intérêts mensuels : ${bilan.dettes.interets_mensuels.toLocaleString('fr-FR')} FCFA\n`;
    if (bilan.dettes.liste.length > 0) {
      message += `• Détail :\n`;
      bilan.dettes.liste.slice(0, 3).forEach((dette) => {
        const echeance = dette.date_echeance ? format(parseISO(dette.date_echeance), 'dd/MM/yyyy') : 'Non définie';
        message += `  - ${dette.libelle} : ${dette.montant_restant.toLocaleString('fr-FR')} FCFA (échéance: ${echeance})\n`;
      });
    }
    message += '\n';
    
    // Actifs
    message += `🏢 ACTIFS\n`;
    message += `• Valeur Cheptel : ${bilan.actifs.valeur_cheptel.toLocaleString('fr-FR')} FCFA (${bilan.actifs.nombre_animaux} animaux, poids moyen: ${bilan.actifs.poids_moyen_cheptel.toFixed(1)} kg)\n`;
    message += `• Valeur Stocks : ${bilan.actifs.valeur_stocks.toLocaleString('fr-FR')} FCFA\n`;
    message += `• Total Actifs : ${bilan.actifs.total.toLocaleString('fr-FR')} FCFA\n\n`;
    
    // Indicateurs
    message += `📊 INDICATEURS CLÉS\n`;
    message += `• Taux d'endettement : ${bilan.indicateurs.taux_endettement.toFixed(2)}%\n`;
    message += `• Ratio de rentabilité : ${bilan.indicateurs.ratio_rentabilite >= 0 ? '+' : ''}${bilan.indicateurs.ratio_rentabilite.toFixed(2)}%\n`;
    message += `• Coût de production : ${bilan.indicateurs.cout_kg_opex.toLocaleString('fr-FR')} FCFA/kg\n`;
    message += `• Total kg vendus : ${bilan.indicateurs.total_kg_vendus.toLocaleString('fr-FR')} kg\n\n`;
    
    // Conclusion
    if (bilan.resultats.solde >= 0) {
      message += `✅ Votre exploitation est BÉNÉFICIAIRE avec une marge brute de ${bilan.resultats.marge_brute.toLocaleString('fr-FR')} FCFA.`;
    } else {
      message += `⚠️ Votre exploitation est DÉFICITAIRE avec un solde de ${bilan.resultats.solde.toLocaleString('fr-FR')} FCFA. Actions correctives recommandées.`;
    }

    return {
      success: true,
      message,
      data: bilan,
    };
  }

  /**
   * Récupère les dettes en cours
   */
  static async getDettesEnCours(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    // Récupérer toutes les dettes
    const dettes = await apiClient.get<any[]>('/finance/dettes', {
      params: {
        projet_id: context.projetId,
      },
    });

    // Filtrer les dettes en cours
    const dettesEnCours = dettes.filter((d) => d.statut === 'en_cours');

    if (dettesEnCours.length === 0) {
      return {
        success: true,
        message: 'Aucune dette en cours.',
        data: [],
      };
    }

    const total = dettesEnCours.reduce((sum, d) => sum + (d.montant_restant || 0), 0);
    const totalInterets = dettesEnCours.reduce((sum, d) => {
      const interetMensuel = ((d.montant_restant || 0) * (d.taux_interet || 0)) / 100 / 12;
      return sum + interetMensuel;
    }, 0);

    let message = `💳 Dettes en cours (${dettesEnCours.length}) :\n\n`;
    message += `• Total restant : ${total.toLocaleString('fr-FR')} FCFA\n`;
    message += `• Intérêts mensuels : ${totalInterets.toLocaleString('fr-FR')} FCFA\n\n`;

    message += `Détail :\n`;
    dettesEnCours.forEach((dette) => {
      const echeance = dette.date_echeance ? format(parseISO(dette.date_echeance), 'dd/MM/yyyy') : 'Non définie';
      message += `• ${dette.libelle} : ${dette.montant_restant.toLocaleString('fr-FR')} FCFA`;
      if (dette.taux_interet > 0) {
        message += ` (taux: ${dette.taux_interet}% annuel)`;
      }
      message += `\n  Échéance : ${echeance}\n`;
    });

    return {
      success: true,
      message,
      data: {
        dettes: dettesEnCours,
        total,
        total_interets_mensuels: totalInterets,
      },
    };
  }
}

