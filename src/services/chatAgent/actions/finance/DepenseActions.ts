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
  private static readonly BACKEND_CATEGORIES = new Set([
    'vaccins',
    'medicaments',
    'alimentation',
    'veterinaire',
    'entretien',
    'equipements',
    'amenagement_batiment',
    'equipement_lourd',
    'achat_sujet',
    'autre',
  ]);

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
    const normalizedCategory = categoryNormalizer.normalize(
      (paramsTyped.categorie && typeof paramsTyped.categorie === 'string'
        ? paramsTyped.categorie
        : undefined) ||
        (paramsTyped.type && typeof paramsTyped.type === 'string' ? paramsTyped.type : undefined) ||
        '',
      false
    );

    // Adapter au backend (enum strict). Si la catégorie n'est pas supportée côté backend,
    // on bascule en "autre" et on conserve l'étiquette utilisateur.
    const categorie =
      normalizedCategory && this.BACKEND_CATEGORIES.has(normalizedCategory)
        ? normalizedCategory
        : 'autre';

    const libelleCategorieFromUser =
      (paramsTyped.libelle && typeof paramsTyped.libelle === 'string'
        ? paramsTyped.libelle
        : undefined) ||
      (paramsTyped.description && typeof paramsTyped.description === 'string'
        ? paramsTyped.description
        : undefined) ||
      // Si on a normalisé vers une catégorie non supportée backend (ex: "salaires"),
      // on garde cette info en libellé.
      (normalizedCategory && !this.BACKEND_CATEGORIES.has(normalizedCategory)
        ? String(normalizedCategory)
        : undefined);

    // Créer la dépense via l'API backend
    try {
      const depense = await apiClient.post<any>('/finance/depenses-ponctuelles', {
        projet_id: context.projetId,
        montant,
        categorie,
        libelle_categorie: categorie === 'autre' ? libelleCategorieFromUser : undefined,
        date:
          (paramsTyped.date && typeof paramsTyped.date === 'string'
            ? paramsTyped.date
            : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
        commentaire:
          paramsTyped.commentaire && typeof paramsTyped.commentaire === 'string'
            ? paramsTyped.commentaire
            : undefined,
      });

      // Vérifier que la dépense a bien été créée
      if (!depense || !depense.id) {
        throw new Error('La dépense n\'a pas été créée correctement. Veuillez réessayer.');
      }

      const categoryLabel = this.getCategorieLabel(categorie || 'autre');
      const message = `C'est enregistré, mon frère ! Dépense de ${montant.toLocaleString('fr-FR')} FCFA en ${categoryLabel}.`;

      return {
        success: true,
        data: depense,
        message: `${message} Tu peux la voir dans le menu Dépenses.`,
      };
    } catch (error: any) {
      // Extraire le message d'erreur
      const errorMessage = error?.message || error?.errorData?.message || 'Erreur lors de la création de la dépense';
      
      throw new Error(`Impossible de créer la dépense : ${errorMessage}`);
    }
  }

  /**
   * Parse un montant depuis différents formats
   * Supporte : "500000", "500 000", "500,000", "500.000" (format milliers)
   */
  private static parseMontant(value: string | number): number {
    if (typeof value === 'number') {
      return isNaN(value) ? NaN : value;
    }

    if (typeof value !== 'string') {
      return NaN;
    }

    let cleaned = value
      .replace(/[^\d\s,.]/g, '') // Retirer tout sauf chiffres, espaces, virgules, points
      .replace(/\s/g, ''); // Retirer les espaces

    // Détecter si c'est un format décimal ou un séparateur de milliers
    const hasDecimalSeparator = /[.,]/.test(cleaned);
    
    if (hasDecimalSeparator) {
      const parts = cleaned.split(/[.,]/);
      
      if (parts.length === 2) {
        const beforeSeparator = parts[0];
        const afterSeparator = parts[1];
        
        // Si après le séparateur il y a exactement 3 chiffres, c'est un séparateur de milliers
        // Ex: "500.000" → 500000
        if (afterSeparator.length === 3 && /^\d{3}$/.test(afterSeparator)) {
          cleaned = beforeSeparator + afterSeparator;
          const parsed = parseInt(cleaned, 10);
          return isNaN(parsed) ? NaN : parsed;
        } else {
          // Format décimal : remplacer virgule par point
          cleaned = cleaned.replace(',', '.');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? NaN : parsed;
        }
      } else {
        // Plusieurs séparateurs : séparateurs de milliers
        cleaned = cleaned.replace(/[.,]/g, '');
        const parsed = parseInt(cleaned, 10);
        return isNaN(parsed) ? NaN : parsed;
      }
    } else {
      // Pas de séparateur : nombre entier
      const parsed = parseInt(cleaned, 10);
      return isNaN(parsed) ? NaN : parsed;
    }
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

  /**
   * Met à jour une dépense
   */
  static async updateDepense(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // ID de la dépense à modifier (requis)
    const depenseId = paramsTyped.id || paramsTyped.depense_id;
    if (!depenseId || typeof depenseId !== 'string') {
      throw new Error('L\'ID de la dépense à modifier est requis. Veuillez préciser quelle dépense modifier.');
    }

    // Construire l'objet de mise à jour avec seulement les champs fournis
    const updateData: Record<string, unknown> = {};

    if (paramsTyped.montant !== undefined) {
      const montant = this.parseMontant(
        typeof paramsTyped.montant === 'string' || typeof paramsTyped.montant === 'number'
          ? paramsTyped.montant
          : String(paramsTyped.montant)
      );
      if (!isNaN(montant) && montant > 0) {
        updateData.montant = montant;
      }
    }

    if (paramsTyped.date && typeof paramsTyped.date === 'string') {
      updateData.date = paramsTyped.date;
    }

    // Normaliser la catégorie si fournie
    if (paramsTyped.categorie || paramsTyped.type) {
      const categoryNormalizer = new CategoryNormalizer();
      const normalizedCategory = categoryNormalizer.normalize(
        (paramsTyped.categorie && typeof paramsTyped.categorie === 'string' ? paramsTyped.categorie : undefined) ||
        (paramsTyped.type && typeof paramsTyped.type === 'string' ? paramsTyped.type : undefined) || '',
        false
      );
      
      if (normalizedCategory && this.BACKEND_CATEGORIES.has(normalizedCategory)) {
        updateData.categorie = normalizedCategory;
      } else if (normalizedCategory) {
        updateData.categorie = 'autre';
        updateData.libelle_categorie = normalizedCategory;
      }
    }

    if (paramsTyped.commentaire && typeof paramsTyped.commentaire === 'string') {
      updateData.commentaire = paramsTyped.commentaire;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('Aucune modification à apporter. Veuillez préciser ce que tu veux modifier (montant, date, catégorie, etc.).');
    }

    // Appeler l'API backend pour mettre à jour
    const depense = await apiClient.patch<any>(`/finance/depenses-ponctuelles/${depenseId}`, updateData);

    const categoryLabel = updateData.categorie ? this.getCategorieLabel(updateData.categorie as string) : '';
    const message = `✅ Dépense modifiée avec succès ! ${updateData.montant ? `Nouveau montant : ${(updateData.montant as number).toLocaleString('fr-FR')} FCFA.` : ''} ${categoryLabel ? `Catégorie : ${categoryLabel}.` : ''}`;

    return {
      success: true,
      data: depense,
      message,
    };
  }
}

