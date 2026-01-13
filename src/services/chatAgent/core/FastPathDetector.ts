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
    const isQueryRequest = normalized.match(/\b(?:du mois|en cours|ce mois|total|combien|quel est|mes depenses|bilan|cout|recap|montre|affiche|liste)\b/i);
    
    if (
      !isQueryRequest && // Ne PAS traiter comme create_depense si c'est une requête
      normalized.match(
        /\b(?:depense|dep|depenses|j'ai depense|j'ai achete|achete|paye|payé|claque|bouffe|aliment|provende|medicament|medoc|veto|veterinaire|enregistrer depense|nouvelle depense)\b/i
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

    // 2. VENTE ENREGISTRÉE - Mots-clés forts : "vendu", "j'ai vendu" (passé)
    // Priorité donnée aux ventes déjà effectuées (avec montant)
    if (normalized.match(/\b(?:vendu|j'ai vendu|enregistrer vente|nouvelle vente)\b/i)) {
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

    // 2b. MARKETPLACE - Mettre en vente (futur/impératif)
    // Mots-clés : "vends", "mets en vente", "mettre en vente", "vendre au marché", "marketplace"
    // Exclure les ventes passées (vendu, j'ai vendu)
    const isPastSale = normalized.match(/\b(?:vendu|j'?ai vendu|on a vendu|jai vendu)\b/i);
    if (
      !isPastSale && (
        normalized.match(/\b(?:vends|mets en vente|mettre en vente|met en vente|publie.*annonce|publier.*annonce)\b/i) ||
        normalized.match(/\b(?:en vente)\b/i) && normalized.match(/\b(?:marketplace|marche|marché|sujet|porc)\b/i) ||
        (normalized.match(/\b(?:vendre)\b/i) && normalized.match(/\b(?:marketplace|marche|marché)\b/i)) ||
        (normalized.match(/\b(?:vendre|vends|met|mets)\b/i) && normalized.match(/\b(?:porc|le porc|mon porc|sujet|le sujet|un sujet)\b/i)) ||
        (normalized.match(/\b(?:liste|lister)\b/i) && normalized.match(/\b(?:sujet|porc|marketplace|vente)\b/i))
      )
    ) {
      // Chercher code animal (P001, etc.)
      const codeMatch = message.match(/\b(p\d+)\b/i);
      const animalCode = codeMatch ? codeMatch[1].toUpperCase() : undefined;
      
      // Chercher prix au kg
      const prixKgMatch = message.match(/(\d+[.,]?\d*)\s*(?:fcfa|f|francs?)(?:\s*(?:\/|par|le))?\s*(?:kg|kilo)/i);
      const pricePerKg = prixKgMatch ? parseFloat(prixKgMatch[1].replace(/[\s,]/g, '').replace('.', '')) : undefined;
      
      // Chercher poids
      const poidsMatch = message.match(/(\d+[.,]?\d*)\s*(?:kg|kilo)/i);
      const weight = poidsMatch ? parseFloat(poidsMatch[1].replace(',', '.')) : undefined;
      
      // Chercher loge
      const logeMatch = message.match(/(?:loge|bande|enclos)\s*([A-Z0-9]+)/i);
      const logeName = logeMatch ? logeMatch[1] : undefined;

      return {
        intent: {
          action: 'marketplace_sell_animal' as AgentActionType,
          confidence: animalCode ? 0.97 : 0.93,
          params: {
            animalCode,
            pricePerKg,
            weight,
            logeName,
          },
        },
        confidence: animalCode ? 0.97 : 0.93,
      };
    }

    // 2c. PRIX DU MARCHÉ
    if (normalized.match(/\b(?:prix du marche|prix du marché|tendance.*prix|prix.*actuel|a combien vendre|quel prix)\b/i)) {
      return {
        intent: {
          action: 'marketplace_get_price_trends' as AgentActionType,
          confidence: 0.96,
          params: {},
        },
        confidence: 0.96,
      };
    }

    // 2d. RAPPELS ET ALERTES - Vaccins en retard, traitements, pesées
    if (normalized.match(/\b(?:vaccin|vaccination|traitement|pesee|rappel|alerte)s?\s+(?:en\s+)?(?:retard|prevue?s?|a\s+faire|manque)\b/i) ||
        normalized.match(/\b(?:quel|quels?|quelles?)\s+(?:sont\s+les?\s+)?(?:vaccin|vaccination|traitement|pesee|rappel)s?\s+(?:en\s+)?(?:retard|prevue?s?|a\s+faire)\b/i) ||
        normalized.match(/\b(?:prochain|prochaine)s?\s+(?:vaccin|vaccination|traitement|pesee|rappel)s?\b/i) ||
        normalized.match(/\b(?:rappel|alerte)s?\s+(?:sante|sanitaire)s?\b/i)) {
      return {
        intent: {
          action: 'get_reminders' as AgentActionType,
          confidence: 0.95,
          params: {},
        },
        confidence: 0.95,
      };
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
    if (normalized.match(/\b(?:vaccin|vacciner|j'ai vaccine|vaccination|j'ai fait vacciner)\b/i)) {
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

    // 4b. RENDEZ-VOUS VÉTÉRINAIRE - Mots-clés forts : "rdv veto", "prendre rdv", "rendez-vous"
    if (
      normalized.match(/\b(?:rdv|rendez[- ]vous|rendez vous|prendre rdv|fixer rdv|planifier rdv)\b/i) &&
      normalized.match(/\b(?:veterinaire|veto|vet|docteur|toubib)\b/i)
    ) {
      return {
        intent: {
          action: 'create_visite_veterinaire' as AgentActionType,
          confidence: 0.95,
          params: {},
        },
        confidence: 0.95,
      };
    }

    // 4d. MODIFICATIONS - Mots-clés forts : "modifier", "changer", "corriger", "mettre à jour", "edit"
    // Détecter les intentions de modification pour les différentes entités
    // IMPORTANT: Placer APRÈS les patterns de création pour éviter les conflits
    const modificationKeywords = /\b(?:modifier|changer|corriger|mettre a jour|mettre à jour|edit|update|rectifier|ajuster|amender)\b/i;
    if (normalized.match(modificationKeywords)) {
      // Dépense
      if (normalized.match(/\b(?:depense|dep)\b/i)) {
        // Extraire l'ID si présent (nombre, code, ou référence)
        const idMatch = message.match(/\b(id|#|numéro|numero)\s*[:\s]*(\d+|\w+)/i) || message.match(/\b(\d{8,})\b/);
        const id = idMatch ? (idMatch[2] || idMatch[1]) : undefined;
        
        return {
          intent: {
            action: 'update_depense' as AgentActionType,
            confidence: id ? 0.95 : 0.85,
            params: id ? { id } : {},
          },
          confidence: id ? 0.95 : 0.85,
        };
      }
      
      // Revenu/Vente
      if (normalized.match(/\b(?:revenu|vente|ventes)\b/i)) {
        const idMatch = message.match(/\b(id|#|numéro|numero)\s*[:\s]*(\d+|\w+)/i) || message.match(/\b(\d{8,})\b/);
        const id = idMatch ? (idMatch[2] || idMatch[1]) : undefined;
        
        return {
          intent: {
            action: 'update_revenu' as AgentActionType,
            confidence: id ? 0.95 : 0.85,
            params: id ? { id } : {},
          },
          confidence: id ? 0.95 : 0.85,
        };
      }
      
      // Pesée
      if (normalized.match(/\b(?:pesee|pese)\b/i)) {
        const idMatch = message.match(/\b(id|#|numéro|numero)\s*[:\s]*(\d+|\w+)/i) || message.match(/\b(\d{8,})\b/);
        const id = idMatch ? (idMatch[2] || idMatch[1]) : undefined;
        
        return {
          intent: {
            action: 'update_pesee' as AgentActionType,
            confidence: id ? 0.95 : 0.85,
            params: id ? { id } : {},
          },
          confidence: id ? 0.95 : 0.85,
        };
      }
      
      // Vaccination
      if (normalized.match(/\b(?:vaccination|vaccin)\b/i)) {
        const idMatch = message.match(/\b(id|#|numéro|numero)\s*[:\s]*(\d+|\w+)/i) || message.match(/\b(\d{8,})\b/);
        const id = idMatch ? (idMatch[2] || idMatch[1]) : undefined;
        
        return {
          intent: {
            action: 'update_vaccination' as AgentActionType,
            confidence: id ? 0.95 : 0.85,
            params: id ? { id } : {},
          },
          confidence: id ? 0.95 : 0.85,
        };
      }
      
      // Visite vétérinaire
      if (normalized.match(/\b(?:visite veterinaire|visite|rdv)\b/i)) {
        const idMatch = message.match(/\b(id|#|numéro|numero)\s*[:\s]*(\d+|\w+)/i) || message.match(/\b(\d{8,})\b/);
        const id = idMatch ? (idMatch[2] || idMatch[1]) : undefined;
        
        return {
          intent: {
            action: 'update_visite_veterinaire' as AgentActionType,
            confidence: id ? 0.95 : 0.85,
            params: id ? { id } : {},
          },
          confidence: id ? 0.95 : 0.85,
        };
      }
    }
    
    // 4c. VISITE VÉTÉRINAIRE (sans "rdv" explicite) - "visite veto", "vétérinaire est venu"
    if (
      normalized.match(/\b(?:visite|consultation|passage)\b/i) &&
      normalized.match(/\b(?:veterinaire|veto|vet|docteur|toubib)\b/i)
    ) {
      return {
        intent: {
          action: 'create_visite_veterinaire' as AgentActionType,
          confidence: 0.93,
          params: {},
        },
        confidence: 0.93,
      };
    }

    // 5. STATISTIQUES - Mots-clés forts : "statistique", "combien de porc", "nombre"
    if (
      normalized.match(
        /\b(?:statistique|statistiques|bilan|combien de porc|nombre de porc|nombre porcs)\b/i
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

    // 5b. CHEPTEL DÉTAILLÉ - "mon cheptel", "detail cheptel", "liste des porcs"
    if (
      normalized.match(
        /\b(?:mon cheptel|cheptel actuel|detail cheptel|details? du cheptel|liste des porcs|mes porcs|mes animaux|mes loges|mes bandes)\b/i
      )
    ) {
      return {
        intent: {
          action: 'get_cheptel_details' as AgentActionType,
          confidence: 0.96,
          params: {},
        },
        confidence: 0.96,
      };
    }

    // 5c. PESÉES DÉTAILLÉES - "suivi pesee", "mes pesees", "poids des porcs"
    if (
      normalized.match(
        /\b(?:suivi des? pesees?|mes pesees?|pesees? des porcs|poids des porcs|evolution du poids|historique pesees?|dernières? pesees?)\b/i
      )
    ) {
      return {
        intent: {
          action: 'get_weighing_details' as AgentActionType,
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
      // Questions génériques (améliorées pour capturer toutes les formulations)
      { pattern: /\b(?:c'est quoi|qu'est[- ]ce que|qu'est ce qu'un|c est quoi|est quoi|qu'?est[- ]ce qu'?un|c'?est quoi)\b/i, topic: null },
      { pattern: /\b(?:explique|explique[- ]moi|apprends[- ]moi|dis[- ]moi|parle[- ]moi de)\b/i, topic: null },
      { pattern: /\b(?:comment|pourquoi|difference entre|definis?|definition)\b/i, topic: null },
      { pattern: /\b(?:conseils?|recommandations?|avantages?|inconvenients?|astuces?)\b/i, topic: null },
      { pattern: /\b(?:que signifie|que veut dire|ca veut dire quoi|c'est quoi ca)\b/i, topic: null },
      
      // Types d'élevage (amélioré pour capturer "naisseur" seul)
      { pattern: /\b(?:naisseur|engraisseur|cycle complet|charcuterie|types? d'?elevage)\b/i, topic: 'types_elevage' },
      { pattern: /\b(?:sevrage|post[- ]sevrage|engraissement)\b/i, topic: 'types_elevage' },
      
      // Races
      { pattern: /\b(?:race|races|large white|landrace|duroc|pietrain|croisement|hampshire|berkshire)\b/i, topic: 'races' },
      { pattern: /\b(?:quelle race|meilleure race|choisir une race|race locale|race amelioree)\b/i, topic: 'races' },
      
      // Alimentation
      { pattern: /\b(?:comment nourrir|alimentation|ration|indice de consommation|fabriquer son aliment)\b/i, topic: 'alimentation' },
      { pattern: /\b(?:combien coute l'?alimentation|cout alimentation|provende|granule)\b/i, topic: 'alimentation' },
      { pattern: /\b(?:nourrir|manger|farine|mais|soja|tourteau|son de ble)\b/i, topic: 'alimentation' },
      { pattern: /\b(?:quantite aliment|ration journaliere|frequence repas)\b/i, topic: 'alimentation' },
      
      // Santé (amélioré pour capturer "gestation", "temps de gestation", etc.)
      { pattern: /\b(?:comment vacciner|calendrier vaccination|maladies? des porcs|prophylaxie|biosecurite)\b/i, topic: 'sante' },
      { pattern: /\b(?:peste porcine|rouget|parasitage|ppa|gastro|diarrhee|toux)\b/i, topic: 'sante' },
      { pattern: /\b(?:gestation|temps de gestation|duree de gestation|duree gestation|combien de temps gestation|combien de jours gestation)\b/i, topic: 'sante' },
      { pattern: /\b(?:vermifuge|deparasitage|fer|anemie|castration|sevrer)\b/i, topic: 'sante' },
      { pattern: /\b(?:signes? maladie|symptome|fievre|temperature)\b/i, topic: 'sante' },
      
      // Finance
      { pattern: /\b(?:rentabilite|combien gagner|marge par porc|investissement initial|seuil de rentabilite)\b/i, topic: 'finance' },
      { pattern: /\b(?:combien pour demarrer|capital necessaire|budget elevage|cout production)\b/i, topic: 'finance' },
      { pattern: /\b(?:benefice|profit|retour sur investissement|roi|cash flow)\b/i, topic: 'finance' },
      
      // Commerce
      { pattern: /\b(?:ou vendre|comment vendre|prix de vente|canaux de commercialisation|trouver des clients)\b/i, topic: 'commerce' },
      { pattern: /\b(?:marche|client|negocier|prix du porc|poids de vente|abattoir)\b/i, topic: 'commerce' },
      
      // Objectifs / Démarrage
      { pattern: /\b(?:demarrer un elevage|par ou commencer|definir son objectif|debuter|lancer)\b/i, topic: 'objectifs' },
      { pattern: /\b(?:commencer elevage|premier pas|etapes|nouveau eleveur)\b/i, topic: 'objectifs' },
      
      // Emplacement / Infrastructure
      { pattern: /\b(?:ou construire|emplacement|terrain pour elevage|distance habitations)\b/i, topic: 'emplacement' },
      { pattern: /\b(?:batiment|porcherie|loge|enclos|box|abri|ventilation|eclairage)\b/i, topic: 'emplacement' },
      
      // Eau
      { pattern: /\b(?:besoin en eau|combien d'?eau|qualite de l'?eau|forage ou puits)\b/i, topic: 'eau' },
      { pattern: /\b(?:abreuvoir|abreuvement|boire|deshydratation)\b/i, topic: 'eau' },
      
      // Réglementation
      { pattern: /\b(?:reglementation|obligations? legales?|normes? sanitaires?|declaration d'?elevage)\b/i, topic: 'reglementation' },
      { pattern: /\b(?:autorisation|permis|licence|inspection|veterinaire officiel)\b/i, topic: 'reglementation' },
      
      // Reproduction
      { pattern: /\b(?:reproduction|saillie|insemination|truie|verrat|chaleur)\b/i, topic: 'sante' },
      { pattern: /\b(?:mise[- ]bas|portee|porcelet|naissance|allaitement)\b/i, topic: 'sante' },
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

