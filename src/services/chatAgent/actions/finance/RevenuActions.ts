/**
 * Actions liées aux revenus (ventes)
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { format } from 'date-fns';
import { parseMontant, extractMontantFromText } from '../../../../utils/formatters';
import { MontantExtractor } from '../../core/extractors/MontantExtractor';
import apiClient from '../../../api/apiClient';

export class RevenuActions {
  /**
   * Crée un revenu (vente)
   */
  static async createRevenu(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Extraire le montant (plusieurs méthodes)
    let montant = 0;
    if (paramsTyped.montant) {
      montant =
        typeof paramsTyped.montant === 'string'
          ? parseMontant(paramsTyped.montant)
          : (paramsTyped.montant as number);
    } else {
      // Essayer de calculer ou extraire depuis le texte
      montant = this.calculateMontant(paramsTyped);
      if (isNaN(montant) || montant <= 0) {
        // Si on a un texte de description, essayer d'extraire le montant
        if (paramsTyped.description || paramsTyped.commentaire) {
          const text = `${paramsTyped.description || ''} ${paramsTyped.commentaire || ''}`;
          const extracted = extractMontantFromText(text);
          if (extracted) montant = extracted;
        }
        // Si toujours pas de montant, essayer depuis le message utilisateur original (si disponible)
        if (
          (isNaN(montant) || montant <= 0) &&
          paramsTyped.userMessage &&
          typeof paramsTyped.userMessage === 'string'
        ) {
          const extracted = extractMontantFromText(paramsTyped.userMessage);
          if (extracted && extracted > 100) {
            // Ignorer les petits nombres (probablement des quantités)
            montant = extracted;
          }
        }
      }
    }

    if (isNaN(montant) || montant <= 0) {
      throw new Error(
        'Le montant de la vente est requis. Veuillez préciser le montant (ex: "800 000 FCFA" ou "800000").'
      );
    }

    const date =
      (paramsTyped.date && typeof paramsTyped.date === 'string'
        ? paramsTyped.date
        : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0];
    const nombre =
      (paramsTyped.nombre as number) ||
      (paramsTyped.nombre_porcs as number) ||
      (paramsTyped.quantite as number) ||
      1;
    const acheteur =
      (paramsTyped.acheteur && typeof paramsTyped.acheteur === 'string'
        ? paramsTyped.acheteur
        : undefined) ||
      (paramsTyped.client && typeof paramsTyped.client === 'string' ? paramsTyped.client : undefined) ||
      (paramsTyped.buyer && typeof paramsTyped.buyer === 'string' ? paramsTyped.buyer : undefined) ||
      'client';

    const revenu = await apiClient.post<any>('/finance/revenus', {
      projet_id: context.projetId,
      montant,
      categorie: (paramsTyped.categorie && typeof paramsTyped.categorie === 'string'
        ? paramsTyped.categorie
        : 'vente_porc') || 'vente_porc',
      date,
      description:
        (paramsTyped.description && typeof paramsTyped.description === 'string'
          ? paramsTyped.description
          : undefined) || `Vente de ${nombre} porc(s) à ${acheteur}`,
      commentaire:
        paramsTyped.commentaire && typeof paramsTyped.commentaire === 'string'
          ? paramsTyped.commentaire
          : undefined,
      poids_kg:
        (paramsTyped.poids_total as number) ||
        (paramsTyped.poids as number) ||
        (paramsTyped.poids_kg as number) ||
        undefined,
      animal_id:
        paramsTyped.animal_id && typeof paramsTyped.animal_id === 'string'
          ? paramsTyped.animal_id
          : undefined,
    });

    const message = `Vente enregistrée : ${nombre} porc(s) vendu(s) à ${acheteur} pour ${montant.toLocaleString('fr-FR')} FCFA le ${format(new Date(date), 'dd/MM/yyyy')}.`;

    return {
      success: true,
      data: revenu,
      message,
    };
  }

  /**
   * Calcule un montant depuis différents paramètres
   */
  private static calculateMontant(params: unknown): number {
    const paramsTyped = params as Record<string, unknown>;

    // Montant direct
    if (paramsTyped.montant_total) return Number(paramsTyped.montant_total);
    if (paramsTyped.montant) return Number(paramsTyped.montant);

    // Calcul pour les ventes (nombre × poids × prix)
    if (paramsTyped.nombre && paramsTyped.poids && paramsTyped.prix_unitaire) {
      return Number(paramsTyped.nombre) * Number(paramsTyped.poids) * Number(paramsTyped.prix_unitaire);
    }

    // Calcul pour les ventes (poids total × prix)
    if (paramsTyped.poids_total && paramsTyped.prix_unitaire) {
      return Number(paramsTyped.poids_total) * Number(paramsTyped.prix_unitaire);
    }

    throw new Error('Impossible de calculer le montant. Informations manquantes.');
  }
}

