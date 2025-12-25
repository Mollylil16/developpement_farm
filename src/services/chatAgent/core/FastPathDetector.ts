/**
 * Détecteur rapide d'intentions pour les cas courants
 * Bypass RAG/OpenAI si confiance > 0.95 pour accélérer les réponses
 * Détecte les intentions les plus fréquentes : dépenses, ventes, pesées, vaccins
 */

import { AgentActionType } from '../../../types/chatAgent';
import { MontantExtractor } from './extractors/MontantExtractor';
import { CategoryNormalizer } from './extractors/CategoryNormalizer';
import { DateExtractor } from './extractors/DateExtractor';
import type { DetectedIntent } from '../IntentDetector';

export interface FastPathResult {
  intent: DetectedIntent | null;
  confidence: number;
}

/**
 * Détecteur rapide d'intentions pour les cas courants
 */
export class FastPathDetector {
  /**
   * Détecte rapidement une intention avec confiance élevée (> 0.95)
   * Utilise des mots-clés forts et l'extraction de paramètres pour une détection instantanée
   */
  static detectFastPath(message: string): FastPathResult {
    const normalized = message
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    // 1. DÉPENSE - Mots-clés forts : "dépense", "dep", "j'ai dépensé", "j'ai acheté", "claqué", "bouffe", etc.
    if (
      normalized.match(
        /\b(?:depense|dep|depenses|j'ai depense|j'ai achete|achete|paye|claque|bouffe|aliment|provende|medicament|medoc|veto|veterinaire)\b/i
      )
    ) {
      const montant = MontantExtractor.extract(message);
      const categoryNormalizer = new CategoryNormalizer();
      const categorie = categoryNormalizer.extractFromText(message);

      // Si montant détecté, confiance très élevée
      if (montant && montant > 100) {
        return {
          intent: {
            action: 'create_depense' as AgentActionType,
            confidence: 0.98,
            params: {
              montant,
              categorie: categorie || undefined,
            },
          },
          confidence: 0.98,
        };
      }
    }

    // 2. VENTE - Mots-clés forts : "vendu", "vente", "j'ai vendu"
    if (normalized.match(/\b(?:vendu|vente|j'ai vendu|vendre)\b/i)) {
      const montant = MontantExtractor.extract(message);
      // Chercher nombre de porcs
      const nombreMatch = message.match(/(\d+)\s*(?:porc|porcs|tete|tetes)/i);
      const nombre = nombreMatch ? parseInt(nombreMatch[1]) : undefined;

      if (montant && montant > 100) {
        return {
          intent: {
            action: 'create_revenu' as AgentActionType,
            confidence: 0.97,
            params: {
              montant,
              nombre,
              categorie: 'vente_porc',
            },
          },
          confidence: 0.97,
        };
      }
    }

    // 3. PESÉE - Mots-clés forts : "peser", "pesée", "pèse", "fait X kg"
    if (normalized.match(/\b(?:peser|pesee|pese|fait|il fait|il pese)\b/i)) {
      const poidsMatch = message.match(/(\d+[.,]?\d*)\s*(?:kg|kilogramme|kilo)\b/i);
      const poids = poidsMatch ? parseFloat(poidsMatch[1].replace(',', '.')) : undefined;
      // Chercher code animal (P001, etc.)
      const codeMatch = message.match(/\b(p\d+)\b/i);
      const animal_code = codeMatch ? codeMatch[1].toUpperCase() : undefined;

      if (poids && poids > 0 && poids < 1000) {
        return {
          intent: {
            action: 'create_pesee' as AgentActionType,
            confidence: animal_code ? 0.98 : 0.95,
            params: {
              poids_kg: poids,
              animal_code,
            },
          },
          confidence: animal_code ? 0.98 : 0.95,
        };
      }
    }

    // 4. VACCINATION - Mots-clés forts : "vaccin", "vacciner", "j'ai vacciné"
    if (normalized.match(/\b(?:vaccin|vacciner|j'ai vaccine|vaccination)\b/i)) {
      const codeMatch = message.match(/\b(p\d+)\b/i);
      const animal_code = codeMatch ? codeMatch[1].toUpperCase() : undefined;

      return {
        intent: {
          action: 'create_vaccination' as AgentActionType,
          confidence: animal_code ? 0.97 : 0.92,
          params: {
            animal_code,
          },
        },
        confidence: animal_code ? 0.97 : 0.92,
      };
    }

    // 5. STATISTIQUES - Mots-clés forts : "statistique", "combien de porc", "nombre"
    if (
      normalized.match(
        /\b(?:statistique|statistiques|bilan|combien de porc|nombre de porc|nombre porcs|cheptel)\b/i
      )
    ) {
      return {
        intent: {
          action: 'get_statistics' as AgentActionType,
          confidence: 0.96,
          params: {},
        },
        confidence: 0.96,
      };
    }

    // 6. STOCKS - Mots-clés forts : "stock", "provende", "nourriture"
    if (normalized.match(/\b(?:stock|stocks|provende|nourriture|aliment|combien de provende)\b/i)) {
      return {
        intent: {
          action: 'get_stock_status' as AgentActionType,
          confidence: 0.96,
          params: {},
        },
        confidence: 0.96,
      };
    }

    // 7. COÛTS - Mots-clés forts : "coût", "dépense totale", "mes dépenses"
    if (normalized.match(/\b(?:cout|couts|depense totale|mes depenses|combien j'ai depense)\b/i)) {
      return {
        intent: {
          action: 'calculate_costs' as AgentActionType,
          confidence: 0.95,
          params: {},
        },
        confidence: 0.95,
      };
    }

    // Aucune détection rapide
    return {
      intent: null,
      confidence: 0,
    };
  }
}

