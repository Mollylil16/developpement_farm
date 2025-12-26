/**
 * Actions liées aux dépenses
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { format } from 'date-fns';
import { parseMontant } from '../../../../utils/formatters';
import { MontantExtractor } from '../../core/extractors/MontantExtractor';
import { CategoryNormalizer } from '../../core/extractors/CategoryNormalizer';
import apiClient from '../../../api/apiClient';

export class DepenseActions {
  /**
   * Crée une dépense
   */
  static async createDepense(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Valider et calculer le montant
    let montant: number;

    // Essayer d'extraire le montant depuis params.montant
    if (paramsTyped.montant !== undefined && paramsTyped.montant !== null) {
      montant = this.parseMontant(
        typeof paramsTyped.montant === 'string' || typeof paramsTyped.montant === 'number'
          ? paramsTyped.montant
          : String(paramsTyped.montant)
      );

      if (isNaN(montant) || montant <= 0) {
        // Si le parsing a échoué, essayer d'extraire depuis d'autres champs
        montant = this.extractMontantFromParams(paramsTyped);
        if (isNaN(montant) || montant <= 0) {
          throw new Error(
            'Le montant doit être un nombre positif. Veuillez préciser le montant de la dépense (ex: "5000 FCFA" ou "5 000 francs").'
          );
        }
      }
    } else {
      // Essayer d'extraire depuis d'autres champs ou calculer
      montant = this.extractMontantFromParams(paramsTyped);

      if (isNaN(montant) || montant <= 0) {
        // Essayer de calculer le montant si possible
        try {
          montant = this.calculateMontant(paramsTyped);
        } catch (error) {
          // Utiliser l'erreur pour fournir un message plus détaillé
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          throw new Error(
            `Le montant de la dépense est requis. Veuillez préciser le montant (ex: "5000 FCFA" ou "5 000 francs"). Détails: ${errorMessage}`
          );
        }
      }
    }

    // Mapper les catégories depuis le langage naturel
    const categoryNormalizer = new CategoryNormalizer();
    const categorie = categoryNormalizer.normalize(
      (paramsTyped.categorie && typeof paramsTyped.categorie === 'string'
        ? paramsTyped.categorie
        : undefined) ||
        (paramsTyped.type && typeof paramsTyped.type === 'string' ? paramsTyped.type : undefined) ||
        '',
      false
    );

    // Créer la dépense via l'API backend
    const depense = await apiClient.post<any>('/finance/depenses-ponctuelles', {
      projet_id: context.projetId,
      montant,
      type_depense: categorie || 'autre',
      libelle_categorie:
        (paramsTyped.libelle && typeof paramsTyped.libelle === 'string'
          ? paramsTyped.libelle
          : undefined) ||
        (paramsTyped.description && typeof paramsTyped.description === 'string'
          ? paramsTyped.description
          : undefined),
      date:
        (paramsTyped.date && typeof paramsTyped.date === 'string'
          ? paramsTyped.date
          : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
      commentaire:
        paramsTyped.commentaire && typeof paramsTyped.commentaire === 'string'
          ? paramsTyped.commentaire
          : undefined,
    });

    const categoryLabel = this.getCategorieLabel(categorie || 'autre');
    const message = `Enregistré ! Dépense de ${montant.toLocaleString('fr-FR')} FCFA en ${categoryLabel} le ${format(new Date(depense.date), 'dd/MM/yyyy')}.`;

    return {
      success: true,
      data: depense,
      message,
    };
  }

  /**
   * Parse un montant depuis différents formats
   */
  private static parseMontant(value: string | number): number {
    if (typeof value === 'number') {
      return isNaN(value) ? NaN : value;
    }

    if (typeof value !== 'string') {
      return NaN;
    }

    // Retirer tous les caractères non numériques sauf les chiffres, espaces, virgules et points
    const cleaned = value
      .replace(/[^\d\s,.]/g, '') // Retirer tout sauf chiffres, espaces, virgules, points
      .replace(/\s/g, '') // Retirer les espaces
      .replace(/,/g, '.'); // Remplacer virgule par point

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? NaN : parsed;
  }

  /**
   * Extrait le montant depuis différents champs des params
   */
  private static extractMontantFromParams(params: unknown): number {
    const paramsTyped = params as Record<string, unknown>;

    // Essayer différents noms de champs possibles
    const possibleFields = [
      'montant',
      'montant_total',
      'prix',
      'cout',
      'coût',
      'amount',
      'price',
      'cost',
      'somme',
      'total',
    ];

    for (const field of possibleFields) {
      if (paramsTyped[field] !== undefined && paramsTyped[field] !== null) {
        const parsed = this.parseMontant(paramsTyped[field] as string | number);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }

    // Essayer d'extraire depuis la description ou commentaire si présent
    const textFields = ['description', 'commentaire', 'libelle', 'details', 'texte'];
    for (const field of textFields) {
      if (paramsTyped[field] && typeof paramsTyped[field] === 'string') {
        // Utiliser MontantExtractor pour extraction depuis texte
        const extracted = MontantExtractor.extract(paramsTyped[field] as string);
        if (extracted && extracted > 0) {
          return extracted;
        }
      }
    }

    return NaN;
  }

  /**
   * Calcule un montant depuis différents paramètres
   */
  private static calculateMontant(params: unknown): number {
    const paramsTyped = params as Record<string, unknown>;

    // Montant direct
    if (paramsTyped.montant_total) return Number(paramsTyped.montant_total);
    if (paramsTyped.montant) return Number(paramsTyped.montant);

    // Calcul pour les dépenses (quantité × prix unitaire)
    if (paramsTyped.quantite && paramsTyped.prix_unitaire) {
      return Number(paramsTyped.quantite) * Number(paramsTyped.prix_unitaire);
    }

    throw new Error('Impossible de calculer le montant. Informations manquantes.');
  }

  /**
   * Retourne le label d'une catégorie
   */
  private static getCategorieLabel(categorie: string): string {
    const labels: Record<string, string> = {
      alimentation: 'Aliment',
      medicaments: 'Médicament',
      vaccins: 'Vaccin',
      veterinaire: 'Vétérinaire',
      equipements: 'Équipement',
      entretien: 'Entretien',
      autre: 'Autre',
    };
    return labels[categorie] || categorie;
  }
}

