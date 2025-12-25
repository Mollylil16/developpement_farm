/**
 * Parser d'actions depuis les réponses de l'IA
 * Extrait les actions depuis les réponses textuelles ou JSON
 */

import { AgentAction, AgentActionType } from '../../../types/chatAgent';
import { IntentDetector } from '../IntentDetector';
import { MontantExtractor } from './extractors/MontantExtractor';

export class ActionParser {
  /**
   * Parse une action depuis une réponse de l'IA
   */
  static parseActionFromResponse(response: string, userMessage?: string): AgentAction | null {
    // Utiliser userMessage pour améliorer la détection d'intention si la réponse n'est pas claire
    const hasUserMessage = userMessage && userMessage.trim().length > 0;

    // Si le message utilisateur existe, l'utiliser pour améliorer le parsing
    if (hasUserMessage && !response.includes('action')) {
      // Essayer de détecter l'intention depuis le message utilisateur si la réponse IA est vide
      const detectedIntent = IntentDetector.detectIntent(userMessage || '');
      if (detectedIntent) {
        return {
          type: detectedIntent.action,
          params: detectedIntent.params || {},
        };
      }
    }

    try {
      // Chercher un JSON dans la réponse (peut être sur plusieurs lignes)
      // Essayer d'abord avec un match simple
      let jsonMatch = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);

      // Si pas trouvé, essayer avec un match multiligne plus permissif
      if (!jsonMatch) {
        jsonMatch = response.match(/\{[\s\S]*?\}/);
      }

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.action) {
            const params = parsed.params || {};

            // Si c'est une dépense et que le montant n'est pas dans params, essayer de l'extraire depuis la réponse
            if (
              parsed.action === 'create_depense' &&
              (!params.montant || params.montant === null || params.montant === undefined)
            ) {
              const montantExtrait = MontantExtractor.extract(response);
              if (montantExtrait) {
                params.montant = montantExtrait;
              }
            }

            console.log('[ActionParser] Action détectée depuis JSON:', parsed.action, params);

            return {
              type: parsed.action as AgentActionType,
              params,
              requiresConfirmation: parsed.requiresConfirmation || false,
              confirmationMessage: parsed.confirmationMessage,
            };
          }
        } catch (parseError) {
          console.error(
            '[ActionParser] Erreur parsing JSON:',
            parseError,
            'JSON:',
            jsonMatch[0]
          );
        }
      }
    } catch (error) {
      console.error('[ActionParser] Erreur détection action:', error);
    }

    // Dernier fallback : détection basique sur la réponse
    const lowerResponse = response.toLowerCase();

    if (
      lowerResponse.includes('statistique') ||
      lowerResponse.includes('bilan') ||
      lowerResponse.includes('combien de porc') ||
      lowerResponse.includes('nombre de porc') ||
      lowerResponse.includes('porc actif') ||
      lowerResponse.includes('cheptel')
    ) {
      console.log('[ActionParser] Fallback basique: get_statistics');
      return { type: 'get_statistics', params: {} };
    }

    if (
      lowerResponse.includes('stock') &&
      (lowerResponse.includes('actuel') || lowerResponse.includes('état'))
    ) {
      console.log('[ActionParser] Fallback basique: get_stock_status');
      return { type: 'get_stock_status', params: {} };
    }

    return null;
  }

  /**
   * Vérifie si des paramètres critiques manquent pour une action
   */
  static hasMissingCriticalParams(actionType: string, params: Record<string, unknown>): boolean {
    switch (actionType) {
      case 'create_revenu':
        return !params.montant; // Montant est critique
      case 'create_depense':
        return !params.montant; // Montant est critique
      case 'create_pesee':
        return !params.poids_kg || !params.animal_code; // Poids et code sont critiques
      case 'create_vaccination':
      case 'create_traitement':
        return !params.animal_code; // Code animal est critique
      default:
        return false;
    }
  }
}

