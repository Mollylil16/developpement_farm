/**
 * Processeur de langage naturel pour Kouakou
 * Améliore la compréhension des messages utilisateur
 * - Correction orthographique courante
 * - Gestion des synonymes
 * - Expressions ivoiriennes
 * - Stemmatisation basique
 */

/**
 * Dictionnaire de synonymes groupés par concept
 */
const SYNONYMS: Record<string, string[]> = {
  // Actions
  'acheter': ['achete', 'acheter', 'pris', 'prendre', 'acquis', 'procure'],
  'vendre': ['vendu', 'vente', 'vendre', 'cede', 'ceder', 'ecouler', 'liquider'],
  'depenser': ['depense', 'depenser', 'paye', 'payer', 'debourse', 'claque', 'sorti'],
  'peser': ['pese', 'peser', 'pesee', 'poids', 'balance'],
  'vacciner': ['vaccine', 'vacciner', 'vaccination', 'pique', 'piquer', 'injecte', 'injection'],
  
  // Animaux
  'porc': ['porc', 'porcs', 'cochon', 'cochons', 'goret', 'gorets', 'pourceau', 'truie', 'verrat'],
  'porcelet': ['porcelet', 'porcelets', 'petit', 'petits', 'bebe', 'bebes', 'nouveau ne'],
  'truie': ['truie', 'truies', 'femelle', 'femelles', 'mere', 'meres', 'reproductrice'],
  'verrat': ['verrat', 'verrats', 'male', 'males', 'reproducteur', 'geniteur'],
  
  // Alimentation  
  'nourriture': ['nourriture', 'aliment', 'aliments', 'provende', 'granule', 'farine', 'ration', 'bouffe'],
  'mais': ['mais', 'maïs', 'corn'],
  'soja': ['soja', 'tourteau'],
  
  // Santé
  'maladie': ['maladie', 'maladies', 'malade', 'malades', 'pathologie', 'probleme', 'souci'],
  'medicament': ['medicament', 'medicaments', 'medoc', 'medocs', 'traitement', 'remede'],
  'veterinaire': ['veterinaire', 'veto', 'docteur', 'toubib'],
  
  // Finance
  'argent': ['argent', 'sous', 'fric', 'oseille', 'thune', 'monnaie', 'francs', 'fcfa', 'cfa'],
  'cout': ['cout', 'couts', 'prix', 'tarif', 'montant', 'valeur'],
  'benefice': ['benefice', 'profit', 'gain', 'marge', 'rentabilite'],
  
  // Quantités
  'beaucoup': ['beaucoup', 'plein', 'nombreux', 'plusieurs', 'masse', 'tas'],
  'peu': ['peu', 'quelques', 'rare', 'rares'],
  
  // Temps
  'aujourd\'hui': ['aujourd hui', 'aujourdhui', 'ce jour', 'maintenant'],
  'hier': ['hier', 'veille'],
  'demain': ['demain', 'lendemain'],
  'semaine': ['semaine', 'sem', '7 jours'],
  'mois': ['mois', 'mensuel', '30 jours'],
  
  // Questions
  'combien': ['combien', 'quel nombre', 'quelle quantite', 'le nombre'],
  'comment': ['comment', 'de quelle maniere', 'de quelle facon'],
  'pourquoi': ['pourquoi', 'pour quelle raison', 'la raison'],
  'quand': ['quand', 'a quel moment', 'quelle date'],
  'ou': ['ou', 'a quel endroit', 'quel lieu'],
};

/**
 * Corrections orthographiques courantes (fautes de frappe fréquentes)
 */
const SPELLING_CORRECTIONS: Record<string, string> = {
  // Fautes courantes
  'depance': 'depense',
  'depences': 'depenses',
  'depanse': 'depense',
  'depanses': 'depenses',
  'achete': 'achete',
  'acheté': 'achete',
  'achetter': 'acheter',
  'vendue': 'vendu',
  'vandu': 'vendu',
  'vandre': 'vendre',
  'porc': 'porc',
  'porce': 'porc',
  'por': 'porc',
  'pork': 'porc',
  'cochont': 'cochon',
  'kochon': 'cochon',
  'kokochon': 'cochon',
  'truies': 'truie',
  'troie': 'truie',
  'trui': 'truie',
  'vacin': 'vaccin',
  'vacine': 'vaccine',
  'vaksin': 'vaccin',
  'vaksine': 'vaccine',
  'medikaman': 'medicament',
  'medicamen': 'medicament',
  'provande': 'provende',
  'provendes': 'provende',
  'provande': 'provende',
  'alimant': 'aliment',
  'alliment': 'aliment',
  'statistique': 'statistique',
  'statistik': 'statistique',
  'stats': 'statistique',
  'stat': 'statistique',
  'combient': 'combien',
  'conbien': 'combien',
  'kombie': 'combien',
  'coment': 'comment',
  'komen': 'comment',
  'koman': 'comment',
  'pourqoi': 'pourquoi',
  'pourkoi': 'pourquoi',
  'pk': 'pourquoi',
  'merci': 'merci',
  'mersi': 'merci',
  'bonjour': 'bonjour',
  'bonjourr': 'bonjour',
  'bjr': 'bonjour',
  'slt': 'salut',
  'salu': 'salut',
  
  // Abréviations courantes
  'kg': 'kilogramme',
  'kgs': 'kilogrammes',
  'kilo': 'kilogramme',
  'kilos': 'kilogrammes',
  'g': 'gramme',
  'fcfa': 'francs',
  'cfa': 'francs',
  'f': 'francs',
  'fr': 'francs',
  
  // Expressions SMS/raccourcis
  'c': 'c\'est',
  'g': 'j\'ai',
  'vs': 'vous',
  'ns': 'nous',
  'ds': 'dans',
  'pr': 'pour',
  'ac': 'avec',
  'ss': 'sans',
  'tt': 'tout',
  'tjs': 'toujours',
  'bcp': 'beaucoup',
  'qd': 'quand',
  'pcq': 'parce que',
  'pck': 'parce que',
};

/**
 * Expressions ivoiriennes et leur équivalent standard
 */
const IVORIAN_EXPRESSIONS: Record<string, string> = {
  'les porcs la': 'les porcs',
  'les cochons la': 'les cochons',
  'la la': '',
  'deh': '',
  'hein': '',
  'bon': '',
  'donc': '',
  'ca va aller': '',
  'on dit quoi': 'bonjour',
  'ya foro': 'il n\'y a pas',
  'y a pas': 'il n\'y a pas',
  'y\'a pas': 'il n\'y a pas',
  'c bon': 'c\'est bon',
  'c\'est bon': '',
  'c\'est ca meme': 'exactement',
  'tu as compris': '',
  'wari': 'argent',
  'gbese': 'dette',
  'kpakpato': 'bavardage',
  'djassa': 'probleme',
  'gaou': 'naive',
  'go': 'femme',
  'gars': 'homme',
  'mon gars': 'mon ami',
  'mon type': 'mon ami',
  'type la': 'cette personne',
  'affaire': 'chose',
  'yako': 'desole',
  'akwaba': 'bienvenue',
  'aller on dit': 'au revoir',
};

/**
 * Mots vides à ignorer pour la recherche sémantique
 */
const STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'a', 'au', 'aux',
  'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'me', 'te', 'se', 'lui', 'y', 'en',
  'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui', 'quoi',
  'pour', 'par', 'sur', 'sous', 'dans', 'avec', 'sans', 'chez', 'vers',
  'est', 'sont', 'ai', 'as', 'avons', 'avez', 'ont', 'etre', 'avoir',
  'fait', 'faire', 'fais', 'peux', 'peut', 'veux', 'veut', 'vouloir',
  'bien', 'tres', 'plus', 'moins', 'aussi', 'encore', 'deja', 'toujours',
  'si', 'ne', 'pas', 'non', 'oui', 'ok',
]);

/**
 * Classe principale de traitement du langage naturel
 */
export class NaturalLanguageProcessor {
  
  /**
   * Traite un message utilisateur pour améliorer la compréhension
   * Applique: correction orthographique, normalisation, synonymes
   */
  static process(message: string): ProcessedMessage {
    let text = message.trim();
    
    // 1. Convertir en minuscules
    text = text.toLowerCase();
    
    // 2. Remplacer les expressions ivoiriennes
    text = this.replaceIvorianExpressions(text);
    
    // 3. Corriger l'orthographe
    text = this.correctSpelling(text);
    
    // 4. Normaliser (accents, caractères spéciaux)
    const normalized = this.normalize(text);
    
    // 5. Extraire les mots-clés significatifs
    const keywords = this.extractKeywords(normalized);
    
    // 6. Détecter les synonymes et enrichir
    const enrichedKeywords = this.enrichWithSynonyms(keywords);
    
    // 7. Détecter l'intention probable basée sur les mots-clés
    const intentHints = this.detectIntentHints(enrichedKeywords);
    
    return {
      original: message,
      processed: text,
      normalized,
      keywords,
      enrichedKeywords,
      intentHints,
    };
  }
  
  /**
   * Remplace les expressions ivoiriennes par leur équivalent standard
   */
  private static replaceIvorianExpressions(text: string): string {
    let result = text;
    for (const [expr, replacement] of Object.entries(IVORIAN_EXPRESSIONS)) {
      const regex = new RegExp(expr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = result.replace(regex, replacement);
    }
    return result.replace(/\s+/g, ' ').trim();
  }
  
  /**
   * Corrige les fautes d'orthographe courantes
   */
  private static correctSpelling(text: string): string {
    const words = text.split(/\s+/);
    const corrected = words.map(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (SPELLING_CORRECTIONS[cleanWord]) {
        return word.replace(cleanWord, SPELLING_CORRECTIONS[cleanWord]);
      }
      return word;
    });
    return corrected.join(' ');
  }
  
  /**
   * Normalise le texte (accents, caractères spéciaux)
   */
  private static normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
      .replace(/[^\w\s]/g, ' ')        // Remplacer caractères spéciaux
      .replace(/\s+/g, ' ')            // Normaliser espaces
      .trim();
  }
  
  /**
   * Extrait les mots-clés significatifs (sans stop words)
   */
  private static extractKeywords(text: string): string[] {
    return text
      .split(/\s+/)
      .filter(word => word.length >= 2 && !STOP_WORDS.has(word));
  }
  
  /**
   * Enrichit les mots-clés avec leurs synonymes
   */
  private static enrichWithSynonyms(keywords: string[]): string[] {
    const enriched = new Set<string>(keywords);
    
    for (const keyword of keywords) {
      // Chercher dans quel groupe de synonymes ce mot apparaît
      for (const [canonical, synonyms] of Object.entries(SYNONYMS)) {
        if (synonyms.includes(keyword)) {
          // Ajouter le mot canonique
          enriched.add(canonical);
          // Ajouter quelques synonymes clés
          synonyms.slice(0, 3).forEach(s => enriched.add(s));
          break;
        }
      }
    }
    
    return Array.from(enriched);
  }
  
  /**
   * Détecte des indices d'intention basés sur les mots-clés
   */
  private static detectIntentHints(keywords: string[]): IntentHint[] {
    const hints: IntentHint[] = [];
    const keywordSet = new Set(keywords);
    
    // Patterns d'intention
    const intentPatterns: { intent: string; required: string[]; optional: string[]; weight: number }[] = [
      // Ventes
      { intent: 'create_revenu', required: ['vendre'], optional: ['porc', 'argent', 'francs'], weight: 0.8 },
      { intent: 'create_revenu', required: ['vendu'], optional: ['porc', 'argent', 'francs'], weight: 0.85 },
      
      // Dépenses
      { intent: 'create_depense', required: ['acheter'], optional: ['nourriture', 'aliment', 'medicament'], weight: 0.8 },
      { intent: 'create_depense', required: ['depenser'], optional: ['argent', 'francs'], weight: 0.85 },
      { intent: 'create_depense', required: ['paye', 'payer'], optional: ['argent', 'francs'], weight: 0.8 },
      
      // Pesées
      { intent: 'create_pesee', required: ['peser'], optional: ['porc', 'kilogramme'], weight: 0.85 },
      { intent: 'create_pesee', required: ['poids'], optional: ['porc', 'kilogramme'], weight: 0.75 },
      
      // Vaccinations
      { intent: 'create_vaccination', required: ['vacciner'], optional: ['porc', 'porcelet'], weight: 0.85 },
      { intent: 'create_vaccination', required: ['vaccin'], optional: ['porc', 'porcelet'], weight: 0.8 },
      
      // Statistiques
      { intent: 'get_statistics', required: ['combien'], optional: ['porc', 'animal'], weight: 0.75 },
      { intent: 'get_statistics', required: ['statistique'], optional: [], weight: 0.9 },
      { intent: 'get_statistics', required: ['bilan'], optional: [], weight: 0.85 },
      
      // Stocks
      { intent: 'get_stock_status', required: ['stock'], optional: ['nourriture', 'aliment'], weight: 0.85 },
      { intent: 'get_stock_status', required: ['nourriture', 'reste'], optional: [], weight: 0.75 },
      
      // Coûts
      { intent: 'calculate_costs', required: ['cout'], optional: ['total', 'depense'], weight: 0.8 },
      { intent: 'calculate_costs', required: ['depense', 'total'], optional: [], weight: 0.85 },
      
      // Questions de connaissances
      { intent: 'answer_knowledge_question', required: ['comment'], optional: [], weight: 0.6 },
      { intent: 'answer_knowledge_question', required: ['pourquoi'], optional: [], weight: 0.6 },
      { intent: 'answer_knowledge_question', required: ['quoi'], optional: [], weight: 0.5 },
    ];
    
    for (const pattern of intentPatterns) {
      const hasRequired = pattern.required.some(r => keywordSet.has(r));
      if (hasRequired) {
        const optionalCount = pattern.optional.filter(o => keywordSet.has(o)).length;
        const confidence = pattern.weight + (optionalCount * 0.05);
        hints.push({
          intent: pattern.intent,
          confidence: Math.min(confidence, 0.95),
          matchedKeywords: [...pattern.required.filter(r => keywordSet.has(r)), 
                           ...pattern.optional.filter(o => keywordSet.has(o))],
        });
      }
    }
    
    // Trier par confiance décroissante
    hints.sort((a, b) => b.confidence - a.confidence);
    
    return hints.slice(0, 3); // Top 3 hints
  }
  
  /**
   * Calcule la similarité entre deux messages traités
   * Utilise les mots-clés enrichis pour une meilleure correspondance
   */
  static calculateSimilarity(msg1: ProcessedMessage, msg2: ProcessedMessage): number {
    const set1 = new Set(msg1.enrichedKeywords);
    const set2 = new Set(msg2.enrichedKeywords);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }
  
  /**
   * Obtient le mot canonique pour un synonyme
   */
  static getCanonicalWord(word: string): string {
    const cleanWord = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    for (const [canonical, synonyms] of Object.entries(SYNONYMS)) {
      if (synonyms.includes(cleanWord)) {
        return canonical;
      }
    }
    
    return cleanWord;
  }
}

/**
 * Interface pour un message traité
 */
export interface ProcessedMessage {
  original: string;
  processed: string;
  normalized: string;
  keywords: string[];
  enrichedKeywords: string[];
  intentHints: IntentHint[];
}

/**
 * Interface pour un indice d'intention
 */
export interface IntentHint {
  intent: string;
  confidence: number;
  matchedKeywords: string[];
}

export default NaturalLanguageProcessor;

