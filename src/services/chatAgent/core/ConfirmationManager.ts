/**
 * Gestionnaire de confirmations avec seuils adaptatifs
 * V4.0 - Avec messages unifiés et détection mots-clés
 */

import { AgentAction } from '../../../types/chatAgent';
import { STANDARD_MISUNDERSTANDING_MESSAGE } from './constants';

export interface ConfirmationDecision {
  requiresConfirmation: boolean;
  shouldExecute: boolean;
  message?: string;
  confidence: number;
}

export interface UserPreferences {
  /**
   * Historique des corrections utilisateur (pour ajustement dynamique)
   */
  corrections: Array<{
    originalCategory?: string;
    correctedCategory?: string;
    originalValue?: string;
    correctedValue?: string;
    timestamp: string;
    count: number;
  }>;
  /**
   * Seuils personnalisés (ajustés selon l'historique)
   */
  customThresholds?: {
    highConfidence?: number; // Défaut: 0.95
    mediumConfidence?: number; // Défaut: 0.80
  };
}

/**
 * Gestionnaire de confirmations avec seuils adaptatifs
 */
export class ConfirmationManager {
  private userPreferences: UserPreferences;

  constructor(userPreferences?: UserPreferences) {
    this.userPreferences = userPreferences || { corrections: [] };
  }

  /**
   * Détermine si une action nécessite confirmation et si elle doit être exécutée
   * @param action - Action à évaluer
   * @param confidence - Niveau de confiance (0-1)
   * @param userMessage - Message original de l'utilisateur
   * @returns Décision de confirmation
   */
  shouldConfirmAndExecute(
    action: AgentAction,
    confidence: number,
    userMessage?: string
  ): ConfirmationDecision {
    const highThreshold = this.userPreferences.customThresholds?.highConfidence || 0.95;
    const mediumThreshold = this.userPreferences.customThresholds?.mediumConfidence || 0.80;

    // Cas critiques : TOUJOURS demander confirmation
    if (this.isCriticalAction(action)) {
      return {
        requiresConfirmation: true,
        shouldExecute: false,
        message: this.buildCriticalConfirmationMessage(action, userMessage),
        confidence,
      };
    }

    // Confiance très élevée (> 95%) : Exécution automatique + message positif
    if (confidence >= highThreshold) {
      return {
        requiresConfirmation: false,
        shouldExecute: true,
        message: this.buildPositiveMessage(action),
        confidence,
      };
    }

    // Confiance moyenne (80-95%) : Exécution automatique + demande de correction légère
    if (confidence >= mediumThreshold && confidence < highThreshold) {
      return {
        requiresConfirmation: false,
        shouldExecute: true,
        message: this.buildLightCorrectionMessage(action),
        confidence,
      };
    }

    // Confiance faible (< 80%) : Demander confirmation claire
    return {
      requiresConfirmation: true,
      shouldExecute: false,
      message: this.buildClarificationMessage(action, userMessage),
      confidence,
    };
  }

  /**
   * Vérifie si une action est critique (toujours besoin de confirmation)
   */
  private isCriticalAction(action: AgentAction): boolean {
    // Suppression de données
    if (
      action.type.includes('delete') ||
      action.type.includes('supprimer') ||
      action.type.includes('effacer')
    ) {
      return true;
    }

    // Montants très élevés (> 5 millions FCFA)
    const montant = action.params.montant || action.params.prix || action.params.cout;
    if (montant && typeof montant === 'number' && montant > 5000000) {
      return true;
    }

    // Décisions sanitaires graves
    const paramsStr = JSON.stringify(action.params).toLowerCase();
    if (
      paramsStr.includes('abattage') ||
      paramsStr.includes('euthanasie') ||
      paramsStr.includes('quarantaine totale')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Construit un message positif pour confiance élevée
   */
  private buildPositiveMessage(action: AgentAction): string {
    const montant = action.params.montant as number | undefined;
    const categorie = action.params.categorie as string | undefined;

    switch (action.type) {
      case 'create_depense':
        if (montant && categorie) {
          const categoryLabel = this.getCategoryLabel(categorie);
          return `C'est enregistré, mon frère ! Dépense de ${montant.toLocaleString('fr-FR')} FCFA en ${categoryLabel}.`;
        }
        return "C'est enregistré, mon frère !";
      case 'create_revenu':
        if (montant) {
          return `C'est enregistré ! Vente de ${montant.toLocaleString('fr-FR')} FCFA enregistrée.`;
        }
        return "C'est enregistré !";
      case 'create_pesee':
        return 'Pesée enregistrée, bien reçu !';
      case 'create_vaccination':
        return 'Vaccination enregistrée, bien noté !';
      // Actions qui ne nécessitent PAS de message de confirmation
      // (laisser actionResult.message prendre le relais)
      case 'other':
      case 'get_statistics':
      case 'get_stock_status':
      case 'calculate_costs':
      case 'get_reminders':
      case 'analyze_data':
      case 'search_animal':
      case 'search_lot':
      case 'answer_knowledge_question':
      case 'list_knowledge_topics':
      case 'get_cheptel_details':
      case 'get_weighing_details':
      case 'describe_capabilities':
      // Marketplace - toutes les actions de lecture/consultation
      case 'marketplace_get_price_trends':
      case 'marketplace_check_offers':
      case 'marketplace_get_my_listings':
      case 'marketplace_sell_animal':
      case 'marketplace_set_price':
      case 'marketplace_respond_offer':
        return ''; // Retourner vide pour que actionResult.message soit utilisé
      default:
        return "C'est enregistré, bien reçu !";
    }
  }

  /**
   * Construit un message de correction légère pour confiance moyenne
   */
  private buildLightCorrectionMessage(action: AgentAction): string {
    const montant = action.params.montant as number | undefined;
    const categorie = action.params.categorie as string | undefined;

    switch (action.type) {
      case 'create_depense':
        if (montant && categorie) {
          const categoryLabel = this.getCategoryLabel(categorie);
          return `J'ai noté ${montant.toLocaleString('fr-FR')} FCFA en ${categoryLabel}. Si c'est pas ça, corrige-moi.`;
        }
        if (montant) {
          return `J'ai noté ${montant.toLocaleString('fr-FR')} FCFA. Si c'est pas ça, dis-moi.`;
        }
        return "J'ai enregistré. Si c'est pas bon, corrige-moi.";
      case 'create_revenu':
        if (montant) {
          return `J'ai noté ${montant.toLocaleString('fr-FR')} FCFA pour la vente. Si c'est pas ça, corrige-moi.`;
        }
        return "J'ai enregistré la vente. Si c'est pas bon, corrige-moi.";
      // Actions de consultation - ne pas ajouter de message de confirmation
      case 'other':
      case 'get_statistics':
      case 'get_stock_status':
      case 'calculate_costs':
      case 'get_reminders':
      case 'analyze_data':
      case 'search_animal':
      case 'search_lot':
      case 'answer_knowledge_question':
      case 'list_knowledge_topics':
      case 'get_cheptel_details':
      case 'get_weighing_details':
      case 'describe_capabilities':
      case 'marketplace_get_price_trends':
      case 'marketplace_check_offers':
      case 'marketplace_get_my_listings':
      case 'marketplace_sell_animal':
      case 'marketplace_set_price':
      case 'marketplace_respond_offer':
        return ''; // Retourner vide pour que actionResult.message soit utilisé
      default:
        return "J'ai enregistré. Si c'est pas bon, corrige-moi.";
    }
  }

  /**
   * Construit un message de clarification pour confiance faible
   * V4.0 - Utilise le message standardisé avec détection de mots-clés
   */
  private buildClarificationMessage(action: AgentAction, userMessage?: string): string {
    const montant = action.params.montant;
    const categorie = action.params.categorie;

    // Identifier ce qui manque ou est ambigu
    const missing: string[] = [];
    if (!montant && (action.type === 'create_depense' || action.type === 'create_revenu')) {
      missing.push('le montant');
    }
    if (!categorie && action.type === 'create_depense') {
      missing.push('la catégorie');
    }

    if (missing.length > 0) {
      // V4.0 - Utiliser les mots-clés détectés pour une clarification plus précise
      const keywords = this.extractKeywords(userMessage || '');
      const keywordsStr = keywords.length > 0 ? ` J'ai compris "${keywords.slice(0, 3).join(', ')}" mais` : '';
      
      return `${keywordsStr} il me manque ${missing.join(' et ')}. Par exemple : "Dépense Aliment 100 000".`;
    }

    // V4.0 - Message standardisé pour cas général
    return STANDARD_MISUNDERSTANDING_MESSAGE;
  }

  /**
   * Extrait les mots-clés d'un message (V4.0)
   */
  private extractKeywords(message: string): string[] {
    const normalized = message
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .trim();

    const stopWords = new Set([
      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
      'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'a', 'au', 'aux',
      'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui', 'quoi',
      'pour', 'par', 'sur', 'sous', 'dans', 'avec', 'sans', 'chez',
      'est', 'sont', 'ai', 'as', 'avons', 'avez', 'ont', 'etre', 'avoir',
      'fait', 'faire', 'fais', 'peux', 'peut', 'veux', 'veut', 'vouloir',
    ]);

    return normalized
      .split(/\s+/)
      .filter(word => word.length >= 3 && !stopWords.has(word))
      .slice(0, 5);
  }

  /**
   * Construit un message de confirmation pour cas critiques
   */
  private buildCriticalConfirmationMessage(action: AgentAction, userMessage?: string): string {
    const montant = action.params.montant || action.params.prix || action.params.cout;

    if (montant && typeof montant === 'number' && montant > 5000000) {
      return `Attention patron ! C'est un montant important : ${montant.toLocaleString('fr-FR')} FCFA. Tu confirmes que je peux enregistrer ça ?`;
    }

    if (action.type.includes('delete') || action.type.includes('supprimer')) {
      return `Attention ! Tu veux vraiment supprimer cette donnée ? C'est une action irréversible. Tu confirmes ?`;
    }

    const paramsStr = JSON.stringify(action.params).toLowerCase();
    if (paramsStr.includes('abattage') || paramsStr.includes('euthanasie')) {
      return `Yako ! C'est une décision sanitaire grave. Tu confirmes vraiment qu'il faut procéder à l'abattage ?`;
    }

    return `Je veux juste confirmer avant d'enregistrer. C'est bon pour toi ?`;
  }

  /**
   * Retourne le label d'une catégorie
   */
  private getCategoryLabel(categorie: string): string {
    const labels: Record<string, string> = {
      alimentation: 'Aliment',
      medicaments: 'Médicament',
      veterinaire: 'Vétérinaire',
      vaccins: 'Vaccin',
      entretien: 'Entretien',
      equipements: 'Équipement',
      salaires: 'Salaire',
      autre: 'Autre',
    };
    return labels[categorie] || categorie;
  }

  /**
   * Enregistre une correction utilisateur (pour ajustement dynamique)
   */
  recordCorrection(
    originalCategory?: string,
    correctedCategory?: string,
    originalValue?: string,
    correctedValue?: string
  ): void {
    const existingCorrection = this.userPreferences.corrections.find(
      (c) =>
        c.originalCategory === originalCategory &&
        c.correctedCategory === correctedCategory &&
        c.originalValue === originalValue &&
        c.correctedValue === correctedValue
    );

    if (existingCorrection) {
      existingCorrection.count++;
      existingCorrection.timestamp = new Date().toISOString();
    } else {
      this.userPreferences.corrections.push({
        originalCategory,
        correctedCategory,
        originalValue,
        correctedValue,
        timestamp: new Date().toISOString(),
        count: 1,
      });
    }

    // Ajuster les seuils si beaucoup de corrections (utilisateur préfère être plus prudent)
    const recentCorrections = this.userPreferences.corrections.filter(
      (c) => new Date().getTime() - new Date(c.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000 // 7 jours
    );

    if (recentCorrections.length > 5) {
      // Ajuster les seuils vers plus de prudence
      this.userPreferences.customThresholds = {
        highConfidence: 0.97, // Augmenté de 0.95 à 0.97
        mediumConfidence: 0.85, // Augmenté de 0.80 à 0.85
      };
    }
  }

  /**
   * Récupère les préférences utilisateur
   */
  getUserPreferences(): UserPreferences {
    return { ...this.userPreferences };
  }

  /**
   * Définit les préférences utilisateur
   */
  setUserPreferences(preferences: UserPreferences): void {
    this.userPreferences = preferences;
  }
}

