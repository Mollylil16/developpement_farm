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
  // Support multi-intentions
  intents?: DetectedIntent[];
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

    // 0. SALUTATIONS - "bonjour", "salut", "bonsoir", "hello", "coucou"
    // Répondre poliment aux salutations (action "other" avec réponse conversationnelle)
    if (normalized.match(/^(?:bonjour|salut|bonsoir|hello|coucou|hey|hi|yo)\b/i)) {
      return {
        intent: {
          action: 'other' as AgentActionType,
          confidence: 1.0,
          params: { isGreeting: true },
        },
        confidence: 1.0,
      };
    }

    // 1. DÉPENSE - Mots-clés forts : "dépense", "dep", "j'ai dépensé", "j'ai acheté", "claqué", "bouffe", etc.
    // IMPORTANT: Exclure les REQUÊTES d'information (mots-clés de requête)
    const isQueryRequest = normalized.match(/\b(?:du mois|en cours|ce mois|total|combien|quel est|mes depenses|bilan|cout|recap)\b/i);
    
    if (
      !isQueryRequest && // Ne PAS traiter comme create_depense si c'est une requête
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

    // 7. COÛTS / REQUÊTES D'INFORMATION SUR LES DÉPENSES
    // Amélioré pour capturer: "dépenses du mois", "total des dépenses", "mes dépenses", "en cours"
    if (
      normalized.match(/\b(?:cout|couts|depense totale|mes depenses|combien j'ai depense)\b/i) ||
      normalized.match(/\b(?:depenses?)\b.*\b(?:du mois|en cours|ce mois|total|combien|quel est)\b/i) ||
      normalized.match(/\b(?:total|quel est|combien)\b.*\b(?:depenses?)\b/i)
    ) {
      return {
        intent: {
          action: 'calculate_costs' as AgentActionType,
          confidence: 0.95,
          params: {},
        },
        confidence: 0.95,
      };
    }

    // 8. QUESTIONS D'IDENTITÉ - Détection des questions sur Kouakou
    // Note: keep this broad because "other" is the safe response path.
    if (
      normalized.match(
        /\b(?:qui es[- ]tu|qui es tu|tu es qui|c'?est quoi ton nom|quel est ton nom|ton nom|comment tu t'appelles|tu t'appelles comment|comment tu te nommes|tu te nommes comment|quel est ton prenom|ton prenom|c'?est quoi ton prenom|t'?appelles comment)\b/i
      )
    ) {
      return {
        intent: {
          action: 'other' as AgentActionType,
          confidence: 1.0,
          params: {},
        },
        confidence: 1.0,
      };
    }

    // 9. QUESTIONS DE FORMATION - Détection des questions éducatives
    const knowledgePatterns = [
      // Questions génériques (améliorées pour capturer "est quoi", "c'est quoi", etc.)
      { pattern: /\b(?:c'est quoi|qu'est[- ]ce que|qu'est ce qu'un|c est quoi|est quoi|qu'?est[- ]ce qu'?un)\b/i, topic: null },
      { pattern: /\b(?:explique|explique[- ]moi|apprends[- ]moi)\b/i, topic: null },
      { pattern: /\b(?:comment|pourquoi|difference entre)\b/i, topic: null },
      { pattern: /\b(?:conseils?|recommandations?|avantages?|inconvenients?)\b/i, topic: null },
      
      // Types d'élevage (amélioré pour capturer "naisseur" seul)
      { pattern: /\b(?:naisseur|engraisseur|cycle complet|charcuterie|types? d'?elevage)\b/i, topic: 'types_elevage' },
      
      // Races
      { pattern: /\b(?:race|races|large white|landrace|duroc|pietrain|croisement)\b/i, topic: 'races' },
      { pattern: /\b(?:quelle race|meilleure race|choisir une race)\b/i, topic: 'races' },
      
      // Alimentation
      { pattern: /\b(?:comment nourrir|alimentation|ration|indice de consommation|fabriquer son aliment)\b/i, topic: 'alimentation' },
      { pattern: /\b(?:combien coute l'?alimentation|cout alimentation)\b/i, topic: 'alimentation' },
      
      // Santé (amélioré pour capturer "gestation", "temps de gestation", etc.)
      { pattern: /\b(?:comment vacciner|calendrier vaccination|maladies? des porcs|prophylaxie|biosecurite)\b/i, topic: 'sante' },
      { pattern: /\b(?:peste porcine|rouget|parasitage)\b/i, topic: 'sante' },
      { pattern: /\b(?:gestation|temps de gestation|duree de gestation|duree gestation|combien de temps gestation|combien de jours gestation)\b/i, topic: 'sante' },
      
      // Finance
      { pattern: /\b(?:rentabilite|combien gagner|marge par porc|investissement initial|seuil de rentabilite)\b/i, topic: 'finance' },
      { pattern: /\b(?:combien pour demarrer|capital necessaire|budget elevage)\b/i, topic: 'finance' },
      
      // Commerce
      { pattern: /\b(?:ou vendre|comment vendre|prix de vente|canaux de commercialisation|trouver des clients)\b/i, topic: 'commerce' },
      
      // Objectifs / Démarrage
      { pattern: /\b(?:demarrer un elevage|par ou commencer|definir son objectif)\b/i, topic: 'objectifs' },
      
      // Emplacement
      { pattern: /\b(?:ou construire|emplacement|terrain pour elevage|distance habitations)\b/i, topic: 'emplacement' },
      
      // Eau
      { pattern: /\b(?:besoin en eau|combien d'?eau|qualite de l'?eau|forage ou puits)\b/i, topic: 'eau' },
      
      // Réglementation
      { pattern: /\b(?:reglementation|obligations? legales?|normes? sanitaires?|declaration d'?elevage)\b/i, topic: 'reglementation' },
    ];

    for (const { pattern, topic } of knowledgePatterns) {
      if (normalized.match(pattern)) {
        return {
          intent: {
            action: 'answer_knowledge_question' as AgentActionType,
            confidence: topic ? 0.96 : 0.92,
            params: {
              topic: topic || undefined,
              question: message,
            },
          },
          confidence: topic ? 0.96 : 0.92,
        };
      }
    }

    // Aucune détection rapide
    return {
      intent: null,
      confidence: 0,
    };
  }

  /**
   * Détecte plusieurs intentions dans un même message
   * Exemple : "j'ai vendu 5 porcs à 800000 et pesé P001 à 45kg" → 2 intentions
   */
  static detectMultiIntentions(message: string): FastPathResult {
    const intents: DetectedIntent[] = [];
    let maxConfidence = 0;

    // Séparer le message par des connecteurs courants
    const connectors = [' et ', ' puis ', ' aussi ', ' ensuite ', ' après ', ', '];
    let parts = [message];
    
    for (const connector of connectors) {
      const newParts: string[] = [];
      for (const part of parts) {
        if (part.includes(connector)) {
          newParts.push(...part.split(connector).map(p => p.trim()).filter(p => p.length > 0));
        } else {
          newParts.push(part);
        }
      }
      parts = newParts;
    }

    // Détecter une intention pour chaque partie
    for (const part of parts) {
      if (part.length < 3) continue; // Ignorer les parties trop courtes
      
      const result = this.detectFastPath(part);
      if (result.intent && result.confidence > 0.85) {
        intents.push(result.intent);
        maxConfidence = Math.max(maxConfidence, result.confidence);
      }
    }

    // Si plusieurs intentions détectées, retourner la première avec la liste complète
    if (intents.length > 1) {
      return {
        intent: intents[0], // Première intention comme principale
        confidence: maxConfidence,
        intents, // Liste complète des intentions
      };
    }

    // Si une seule intention, retourner le résultat normal
    if (intents.length === 1) {
      return {
        intent: intents[0],
        confidence: maxConfidence,
      };
    }

    // Aucune intention détectée
    return {
      intent: null,
      confidence: 0,
    };
  }
}

