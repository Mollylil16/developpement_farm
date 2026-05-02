/**
 * Service de clarification intelligent
 * Génère des questions contextuelles pour obtenir les paramètres manquants
 * Utilise l'historique conversationnel et les données disponibles pour proposer des suggestions
 */

import { AgentAction, AgentActionType } from '../../../types/chatAgent';
import { ConversationContextManager } from './ConversationContext';
import { logger } from '../../../utils/logger';

// Type étendu pour le contexte d'extraction avec toutes les propriétés disponibles
interface ExtendedExtractionContext {
  conversationHistory?: Array<{ role: string; content: string }>;
  lastAcheteur?: string;
  lastAnimal?: string;
  lastMontant?: number;
  lastDate?: string;
  lastCategorie?: string;
  recentTransactions?: Array<{ 
    acheteur?: string; 
    montant?: number;
    date?: string;
    categorie?: string;
  }>;
  recentEntities?: {
    acheteurs: string[];
    animaux: string[];
    montants: number[];
    dates: string[];
    categories: string[];
  };
}

export interface ClarificationRequest {
  question: string;
  missingParams: string[];
  suggestions?: Array<{
    label: string;
    value: unknown;
    context?: string;
  }>;
  examples?: string[];
  requiresUserInput: boolean;
}

export interface ClarificationResult {
  needsClarification: boolean;
  clarification?: ClarificationRequest;
  canUseContext?: boolean; // Si on peut utiliser le contexte pour remplir automatiquement
  contextSuggestions?: Record<string, unknown>; // Suggestions basées sur le contexte
}

export class ClarificationService {
  private conversationContext: ConversationContextManager;
  private clarificationHistory: Array<{
    actionType: string;
    missingParams: string[];
    timestamp: string;
    resolved: boolean;
  }> = [];

  constructor(conversationContext: ConversationContextManager) {
    this.conversationContext = conversationContext;
  }

  /**
   * Analyse une action et détermine si une clarification est nécessaire
   */
  analyzeAction(
    action: AgentAction,
    extractionContext?: ExtendedExtractionContext
  ): ClarificationResult {
    const missingParams = this.detectMissingParams(action);
    
    if (missingParams.length === 0) {
      return { needsClarification: false };
    }

    // Vérifier si on peut utiliser le contexte pour remplir automatiquement
    const contextSuggestions = this.suggestFromContext(
      action.type,
      missingParams,
      extractionContext
    );

    const canUseContext = Object.keys(contextSuggestions).length > 0;

    // Si on peut utiliser le contexte, on propose plutôt que de demander
    if (canUseContext) {
      return {
        needsClarification: true,
        canUseContext: true,
        contextSuggestions,
        clarification: this.buildClarificationRequest(
          action,
          missingParams,
          contextSuggestions,
          extractionContext
        ),
      };
    }

    // Sinon, on demande clarification
    return {
      needsClarification: true,
      clarification: this.buildClarificationRequest(
        action,
        missingParams,
        {},
        extractionContext
      ),
    };
  }

  /**
   * Détecte les paramètres manquants pour une action
   */
  private detectMissingParams(action: AgentAction): string[] {
    const missing: string[] = [];
    const params = action.params || {};

    switch (action.type) {
      case 'create_revenu':
        if (!params.montant) missing.push('montant');
        // Acheteur n'est pas critique mais peut être demandé
        break;

      case 'create_depense':
        if (!params.montant) missing.push('montant');
        // Catégorie n'est pas critique mais peut être suggérée
        break;

      case 'create_pesee':
        if (!params.poids_kg && !params.poids) missing.push('poids_kg');
        if (!params.animal_code && !params.animal_id) missing.push('animal_code');
        break;

      case 'create_vaccination':
        if (!params.animal_code && !params.animal_id && !params.animal_ids) {
          missing.push('animal_code');
        }
        if (!params.vaccin && !params.nom_vaccin) {
          missing.push('vaccin');
        }
        break;

      case 'create_visite_veterinaire':
        // Date et vétérinaire peuvent être optionnels mais suggérés
        if (!params.veterinaire && !params.nom_veterinaire) {
          missing.push('veterinaire');
        }
        break;

      case 'update_revenu':
      case 'update_depense':
      case 'update_pesee':
      case 'update_vaccination':
      case 'update_visite_veterinaire':
        if (!params.id && !params.revenu_id && !params.depense_id && 
            !params.pesee_id && !params.vaccination_id && !params.visite_id) {
          missing.push('id');
        }
        // Vérifier qu'au moins un champ à modifier est fourni
        const updateFields = ['montant', 'date', 'poids_kg', 'vaccin', 'veterinaire', 
                             'categorie', 'commentaire', 'description'];
        const hasUpdateField = updateFields.some(field => params[field] !== undefined);
        if (!hasUpdateField) {
          missing.push('champ_a_modifier');
        }
        break;
    }

    return missing;
  }

  /**
   * Suggère des valeurs depuis le contexte conversationnel
   */
  private suggestFromContext(
    actionType: AgentActionType,
    missingParams: string[],
    extractionContext?: ExtendedExtractionContext
  ): Record<string, unknown> {
    const suggestions: Record<string, unknown> = {};

    if (!extractionContext) {
      return suggestions;
    }

    for (const param of missingParams) {
      switch (param) {
        case 'montant':
          if (extractionContext.lastMontant) {
            suggestions.montant = extractionContext.lastMontant;
          }
          break;

        case 'animal_code':
          if (extractionContext.lastAnimal) {
            suggestions.animal_code = extractionContext.lastAnimal;
          } else if (extractionContext.recentEntities?.animaux?.length > 0) {
            suggestions.animal_code = extractionContext.recentEntities.animaux[0];
          }
          break;

        case 'acheteur':
          if (extractionContext.lastAcheteur) {
            suggestions.acheteur = extractionContext.lastAcheteur;
          } else if (extractionContext.recentEntities?.acheteurs?.length > 0) {
            suggestions.acheteur = extractionContext.recentEntities.acheteurs[0];
          }
          break;

        case 'date':
          if (extractionContext.lastDate) {
            suggestions.date = extractionContext.lastDate;
          }
          break;

        case 'categorie':
          if (extractionContext.lastCategorie) {
            suggestions.categorie = extractionContext.lastCategorie;
          } else if (extractionContext.recentEntities?.categories?.length > 0) {
            suggestions.categorie = extractionContext.recentEntities.categories[0];
          }
          break;

        case 'veterinaire':
          // Chercher dans l'historique récent
          if (extractionContext.recentTransactions) {
            // Pas directement disponible, mais on peut suggérer depuis l'historique
          }
          break;
      }
    }

    return suggestions;
  }

  /**
   * Construit une demande de clarification avec suggestions
   */
  private buildClarificationRequest(
    action: AgentAction,
    missingParams: string[],
    contextSuggestions: Record<string, unknown>,
    extractionContext?: ExtendedExtractionContext
  ): ClarificationRequest {
    const suggestions: Array<{ label: string; value: unknown; context?: string }> = [];
    const examples: string[] = [];

    // Ajouter les suggestions depuis le contexte
    for (const [param, value] of Object.entries(contextSuggestions)) {
      const label = this.getParamLabel(param);
      suggestions.push({
        label: `${label} récent(e)`,
        value,
        context: `Utilisé précédemment`,
      });
    }

    // Construire la question selon l'action et les paramètres manquants
    const question = this.buildQuestion(action.type, missingParams, suggestions.length > 0);
    
    // Générer des exemples selon l'action
    examples.push(...this.generateExamples(action.type, missingParams));

    return {
      question,
      missingParams,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      examples: examples.length > 0 ? examples : undefined,
      requiresUserInput: true,
    };
  }

  /**
   * Construit une question de clarification selon l'action
   */
  private buildQuestion(
    actionType: AgentActionType,
    missingParams: string[],
    hasSuggestions: boolean
  ): string {
    const paramLabels = missingParams.map(p => this.getParamLabel(p));
    const paramStr = paramLabels.join(paramLabels.length === 2 ? ' et ' : ', ');

    // Messages selon l'action
    switch (actionType) {
      case 'create_revenu':
        if (missingParams.includes('montant')) {
          return hasSuggestions
            ? `J'ai besoin du montant de la vente. Tu veux utiliser ${paramStr} récent(e) ?`
            : `Combien ça fait en FCFA ? Par exemple : "800 000 FCFA" ou "800000".`;
        }
        break;

      case 'create_depense':
        if (missingParams.includes('montant')) {
          return hasSuggestions
            ? `Quel est le montant ? Tu veux utiliser ${paramStr} récent(e) ?`
            : `Quel montant ? Par exemple : "50 000 FCFA" pour une dépense.`;
        }
        if (missingParams.includes('categorie')) {
          return `Quelle catégorie ? (alimentation, medicaments, veterinaire, equipements, autre)`;
        }
        break;

      case 'create_pesee':
        if (missingParams.includes('poids_kg')) {
          return `Quel est le poids ? Par exemple : "45 kg".`;
        }
        if (missingParams.includes('animal_code')) {
          return hasSuggestions
            ? `Quel animal ? Tu veux peser ${paramStr} récent ?`
            : `Quel animal peser ? Donne le code (ex: P001).`;
        }
        break;

      case 'create_vaccination':
        if (missingParams.includes('animal_code')) {
          return `Quel(s) animal(aux) vacciner ? Donne le(s) code(s) (ex: P001) ou dis "tous".`;
        }
        if (missingParams.includes('vaccin')) {
          return `Quel vaccin ? (ex: Mycoplasme, Rouget, Parvovirose, etc.)`;
        }
        break;

      case 'create_visite_veterinaire':
        if (missingParams.includes('veterinaire')) {
          return `Quel vétérinaire ? Donne le nom ou dis "pas besoin".`;
        }
        break;

      case 'update_revenu':
      case 'update_depense':
      case 'update_pesee':
      case 'update_vaccination':
      case 'update_visite_veterinaire':
        if (missingParams.includes('id')) {
          return `Quel enregistrement modifier ? Donne l'ID ou une référence.`;
        }
        if (missingParams.includes('champ_a_modifier')) {
          return `Qu'est-ce que tu veux modifier ? (montant, date, poids, etc.)`;
        }
        break;
    }

    // Message générique
    return `Il me manque ${paramStr}. Peux-tu me donner ces informations ?`;
  }

  /**
   * Génère des exemples pour aider l'utilisateur
   */
  private generateExamples(actionType: AgentActionType, missingParams: string[]): string[] {
    const examples: string[] = [];

    if (missingParams.includes('montant')) {
      examples.push('"50 000 FCFA"', '"50000"', '"5 millions"');
    }

    if (missingParams.includes('animal_code')) {
      examples.push('"P001"', '"P123"', '"animal P045"');
    }

    if (missingParams.includes('date')) {
      examples.push('"aujourd\'hui"', '"demain"', '"15/01/2024"');
    }

    if (missingParams.includes('categorie')) {
      examples.push('"alimentation"', '"medicaments"', '"veterinaire"');
    }

    if (missingParams.includes('vaccin')) {
      examples.push('"Mycoplasme"', '"Rouget"', '"Parvovirose"');
    }

    // Exemples spécifiques par action
    switch (actionType) {
      case 'create_revenu':
        if (missingParams.includes('montant')) {
          examples.push('Exemple complet: "Vendu 5 porcs à 800 000 FCFA"');
        }
        break;

      case 'create_depense':
        if (missingParams.includes('montant')) {
          examples.push('Exemple complet: "Dépense alimentation 150 000 FCFA"');
        }
        break;

      case 'create_pesee':
        if (missingParams.length > 0) {
          examples.push('Exemple complet: "Peser P001, il fait 45 kg"');
        }
        break;
    }

    return examples;
  }

  /**
   * Retourne le label d'un paramètre
   */
  private getParamLabel(param: string): string {
    const labels: Record<string, string> = {
      montant: 'le montant',
      animal_code: "l'animal",
      animal_id: "l'animal",
      poids_kg: 'le poids',
      poids: 'le poids',
      categorie: 'la catégorie',
      date: 'la date',
      acheteur: "l'acheteur",
      veterinaire: 'le vétérinaire',
      vaccin: 'le vaccin',
      id: "l'ID",
      revenu_id: "l'ID du revenu",
      depense_id: "l'ID de la dépense",
      pesee_id: "l'ID de la pesée",
      vaccination_id: "l'ID de la vaccination",
      visite_id: "l'ID de la visite",
      champ_a_modifier: 'le champ à modifier',
    };

    return labels[param] || param;
  }

  /**
   * Enregistre une clarification dans l'historique
   */
  recordClarification(
    actionType: string,
    missingParams: string[],
    resolved: boolean = false
  ): void {
    this.clarificationHistory.push({
      actionType,
      missingParams: [...missingParams],
      timestamp: new Date().toISOString(),
      resolved,
    });

    // Garder seulement les 20 dernières clarifications
    if (this.clarificationHistory.length > 20) {
      this.clarificationHistory.shift();
    }
  }

  /**
   * Récupère les clarifications fréquentes (pour apprentissage)
   */
  getFrequentClarifications(): Array<{
    actionType: string;
    param: string;
    count: number;
  }> {
    const paramCounts = new Map<string, number>();

    this.clarificationHistory.forEach(clar => {
      clar.missingParams.forEach(param => {
        const key = `${clar.actionType}:${param}`;
        paramCounts.set(key, (paramCounts.get(key) || 0) + 1);
      });
    });

    return Array.from(paramCounts.entries())
      .map(([key, count]) => {
        const [actionType, param] = key.split(':');
        return { actionType, param, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Résout une clarification en utilisant les suggestions du contexte
   */
  resolveWithContext(
    action: AgentAction,
    contextSuggestions: Record<string, unknown>
  ): AgentAction {
    const resolvedParams = { ...action.params };

    for (const [param, value] of Object.entries(contextSuggestions)) {
      if (!resolvedParams[param]) {
        resolvedParams[param] = value;
        logger.debug(`[ClarificationService] Rempli ${param} depuis le contexte: ${value}`);
      }
    }

    return {
      ...action,
      params: resolvedParams,
    };
  }
}

