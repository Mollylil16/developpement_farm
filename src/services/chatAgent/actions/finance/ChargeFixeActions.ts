/**
 * Actions liées aux charges fixes
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { format } from 'date-fns';
import { parseMontant } from '../../../../utils/formatters';
import apiClient from '../../../api/apiClient';

export class ChargeFixeActions {
  /**
   * Crée une charge fixe
   */
  static async createChargeFixe(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Extraire le montant
    let montant = 0;
    if (paramsTyped.montant) {
      montant = typeof paramsTyped.montant === 'string' ? parseMontant(paramsTyped.montant) : (paramsTyped.montant as number);
    } else {
      throw new Error('Le montant de la charge fixe est requis.');
    }

    if (isNaN(montant) || montant <= 0) {
      throw new Error('Le montant doit être un nombre positif.');
    }

    // Mapper la catégorie
    const categorieMap: Record<string, string> = {
      salaires: 'salaires',
      alimentation: 'alimentation',
      entretien: 'entretien',
      vaccins: 'vaccins',
      eau_electricite: 'eau_electricite',
      eau: 'eau_electricite',
      électricité: 'eau_electricite',
      electricite: 'eau_electricite',
    };
    const categorie = (paramsTyped.categorie && typeof paramsTyped.categorie === 'string' ? categorieMap[paramsTyped.categorie.toLowerCase()] : undefined) || 'autre';

    // Mapper la fréquence
    const frequenceMap: Record<string, string> = {
      mensuel: 'mensuel',
      mensuelle: 'mensuel',
      mois: 'mensuel',
      trimestriel: 'trimestriel',
      trimestrielle: 'trimestriel',
      trimestre: 'trimestriel',
      annuel: 'annuel',
      annuelle: 'annuel',
      an: 'annuel',
      année: 'annuel',
      annee: 'annuel',
    };
    const frequence = (paramsTyped.frequence && typeof paramsTyped.frequence === 'string' ? frequenceMap[paramsTyped.frequence.toLowerCase()] : undefined) || 'mensuel';

    const chargeFixe = await apiClient.post<any>('/finance/charges-fixes', {
      projet_id: context.projetId,
      categorie: categorie as string,
      libelle: (paramsTyped.libelle && typeof paramsTyped.libelle === 'string' ? paramsTyped.libelle : undefined) || (paramsTyped.nom && typeof paramsTyped.nom === 'string' ? paramsTyped.nom : undefined) || (paramsTyped.description && typeof paramsTyped.description === 'string' ? paramsTyped.description : undefined) || 'Charge fixe',
      montant,
      date_debut: (paramsTyped.date_debut && typeof paramsTyped.date_debut === 'string' ? paramsTyped.date_debut : undefined) || (paramsTyped.date && typeof paramsTyped.date === 'string' ? paramsTyped.date : undefined) || new Date().toISOString().split('T')[0],
      frequence: frequence as string,
      jour_paiement: paramsTyped.jour_paiement && typeof paramsTyped.jour_paiement === 'number' ? paramsTyped.jour_paiement : undefined,
      notes: (paramsTyped.notes && typeof paramsTyped.notes === 'string' ? paramsTyped.notes : undefined) || (paramsTyped.commentaire && typeof paramsTyped.commentaire === 'string' ? paramsTyped.commentaire : undefined),
      statut: 'actif',
    });

    const message = `Charge fixe enregistrée : ${chargeFixe.libelle} - ${montant.toLocaleString('fr-FR')} FCFA/${frequence} à partir du ${format(new Date(chargeFixe.date_debut), 'dd/MM/yyyy')}.`;

    return {
      success: true,
      data: chargeFixe,
      message,
    };
  }
}

