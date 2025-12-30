/**
 * Extracteur de paramètres robuste pour l'agent conversationnel
 * Système multi-couches avec validation contextuelle
 * Utilise les services dédiés pour éviter les duplications
 */

import { MontantExtractor } from './extractors/MontantExtractor';
import { CategoryNormalizer } from './extractors/CategoryNormalizer';
import { DateExtractor } from './extractors/DateExtractor';

export interface ExtractedParams {
  montant?: number;
  nombre?: number;
  poids_kg?: number;
  date?: string; // Format YYYY-MM-DD
  acheteur?: string;
  animal_code?: string;
  animal_id?: string;
  categorie?: string;
  libelle?: string;
  frequence?: string;
  [key: string]: unknown;
}

export interface ExtractionContext {
  conversationHistory?: Array<{ role: string; content: string }>;
  currentDate?: string;
  availableAnimals?: Array<{ id: string; code: string; nom?: string }>;
  recentTransactions?: Array<{ acheteur?: string; montant?: number }>;
}

export class ParameterExtractor {
  protected context: ExtractionContext;
  protected categoryNormalizer: CategoryNormalizer;

  constructor(context: ExtractionContext = {}) {
    this.context = {
      currentDate: new Date().toISOString().split('T')[0],
      ...context,
    };
    this.categoryNormalizer = new CategoryNormalizer();
  }

  /**
   * Extrait tous les paramètres d'un texte
   */
  extractAll(text: string): ExtractedParams {
    const params: ExtractedParams = {};

    // Extraction par ordre de priorité
    params.montant = this.extractMontant(text);
    params.nombre = this.extractNombre(text);
    params.poids_kg = this.extractPoids(text);
    params.date = this.extractDate(text);
    params.acheteur = this.extractAcheteur(text);
    params.animal_code = this.extractAnimalCode(text);
    params.categorie = this.extractCategorie(text);
    params.libelle = this.extractLibelle(text);
    params.frequence = this.extractFrequence(text);

    // Nettoyer les valeurs undefined
    return this.cleanParams(params);
  }

  /**
   * Extrait un montant avec validation contextuelle
   * Utilise MontantExtractor pour centraliser la logique
   * Supporte : "800000", "800 000", "800k", "1 million", "150 balles" (150000 FCFA)
   */
  extractMontant(text: string): number | undefined {
    // Exclure les nombres déjà extraits comme quantités ou poids
    const excludeNumbers: number[] = [];
    const nombre = this.extractNombre(text);
    if (nombre) excludeNumbers.push(nombre);
    const poids = this.extractPoids(text);
    if (poids) excludeNumbers.push(poids);

    const montant = MontantExtractor.extract(text, {
      excludeNumbers,
      strict: false,
    });

    return montant || undefined;
  }

  /**
   * Extrait un nombre (quantité de porcs, etc.)
   */
  extractNombre(text: string): number | undefined {
    const patterns = [
      /(\d+)\s*(?:porc|porcs|tete|tetes|sujet|sujets|animal|animaux)/i,
      /(?:nombre|quantite|qte)[:\s]+(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const nombre = parseInt(match[1]);
        if (nombre > 0 && nombre < 10000) {
          return nombre;
        }
      }
    }

    return undefined;
  }

  /**
   * Extrait un poids en kg
   * Supporte : "45 kg", "45kg", "45.5 kg", "45,5 kg", "il fait 45", "pèse 45"
   */
  extractPoids(text: string): number | undefined {
    const patterns = [
      // Pattern 1: "45 kg", "45kg", "45.5 kg", "45,5 kg"
      /(\d+[.,]?\d*)\s*(?:kg|kilogramme|kilo)\b/i,

      // Pattern 2: "poids 45", "il fait 45", "il pèse 45", "fait 45"
      /(?:poids|pese|fait|il fait|il pese|pese|fait)[:\s]+(\d+[.,]?\d*)(?:\s*(?:kg|kilogramme|kilo))?/i,

      // Pattern 3: "de 45 kg", "à 45 kg", "pour 45 kg"
      /(?:de|a|pour)\s+(\d+[.,]?\d*)\s*(?:kg|kilogramme|kilo)\b/i,

      // Pattern 4: "P001 fait 45" (code animal suivi de poids)
      /(?:p\d+|porc\s+\w+)\s+(?:fait|pese|a|de)\s+(\d+[.,]?\d*)(?:\s*(?:kg|kilogramme|kilo))?/i,

      // Pattern 5: "peser P001 45" (verbe + code + poids)
      /peser\s+(?:le\s+porc\s+)?(?:p\d+|\w+)\s+(?:il\s+fait|il\s+pese|fait|pese)?\s*(\d+[.,]?\d*)(?:\s*(?:kg|kilogramme|kilo))?/i,

      // Pattern 6: "P001 45 kg" (code directement suivi de poids)
      /(?:p\d+|\w+)\s+(\d+[.,]?\d*)\s*(?:kg|kilogramme|kilo)\b/i,

      // Pattern 7: "pesee de 45 kg" (sans code animal)
      /pesee\s+(?:de|du|pour)?\s*(\d+[.,]?\d*)\s*(?:kg|kilogramme|kilo)\b/i,

      // Pattern 8: Nombre seul après "peser" ou "pesée" (fallback)
      /(?:peser|pesee|pesee)\s+(?:le\s+porc\s+)?(?:p\d+|\w+)?\s*(?:il\s+fait|il\s+pese|fait|pese)?\s*(\d+[.,]?\d*)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const poids = parseFloat(match[1].replace(',', '.'));
        if (poids > 0 && poids < 1000) {
          return poids;
        }
      }
    }

    return undefined;
  }

  /**
   * Extrait une date (relative ou absolue)
   * Utilise DateExtractor pour centraliser la logique
   */
  extractDate(text: string): string | undefined {
    const refDate = this.context.currentDate || new Date().toISOString().split('T')[0];
    return DateExtractor.extract(text, {
      referenceDate: refDate,
      allowFuture: true,
      allowPast: true,
    });
  }

  /**
   * Extrait un nom d'acheteur
   */
  extractAcheteur(text: string): string | undefined {
    // Chercher dans l'historique de conversation d'abord
    if (this.context.conversationHistory) {
      for (const msg of this.context.conversationHistory.reverse()) {
        const lastAcheteur = this.extractAcheteurFromText(msg.content);
        if (lastAcheteur) return lastAcheteur;
      }
    }

    // Chercher dans les transactions récentes
    if (this.context.recentTransactions && this.context.recentTransactions.length > 0) {
      const lastTransaction = this.context.recentTransactions[0];
      if (lastTransaction.acheteur) {
        // Si le texte mentionne "le même", "celui-là", etc.
        if (text.match(/(?:le\s+meme|celui\s+la|le\s+meme\s+acheteur)/i)) {
          return lastTransaction.acheteur;
        }
      }
    }

    // Extraire depuis le texte
    return this.extractAcheteurFromText(text);
  }

  private extractAcheteurFromText(text: string): string | undefined {
    const patterns = [
      /(?:a|pour|chez|vendu a|vendu pour|acheteur|client|buyer|vendu chez)[:\s]+([A-Za-zÀ-ÿ\s-]+?)(?:\s+(?:pour|a|le|la|un|une|des|\d|fcfa|francs?|au|du|de|en)|$)/i,
      /(?:acheteur|client|buyer)[:\s]+([A-Za-zÀ-ÿ\s-]+?)(?:\s|$)/i,
      /vendu\s+([A-Za-zÀ-ÿ]+)\s+(?:pour|a|au)/i, // "vendu Kouamé pour"
      /(?:a|pour)\s+([A-Za-zÀ-ÿ]+)\s+(?:\d|fcfa|francs?)/i, // "à Kouamé 800000"
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const acheteur = match[1].trim();
        // Vérifier que ce n'est pas un nombre, un mot vide, ou un mot-clé
        const excludedWords = [
          'le',
          'la',
          'les',
          'un',
          'une',
          'des',
          'pour',
          'a',
          'au',
          'de',
          'du',
        ];
        if (
          acheteur.length > 1 &&
          !acheteur.match(/^\d+$/) &&
          !excludedWords.includes(acheteur.toLowerCase())
        ) {
          // Nettoyer les espaces multiples et caractères indésirables
          return acheteur.replace(/\s+/g, ' ').trim();
        }
      }
    }

    return undefined;
  }

  /**
   * Extrait un code d'animal
   * Supporte : P001, PORC001, p001, porc001, P-001, etc.
   */
  extractAnimalCode(text: string): string | undefined {
    // Chercher dans l'historique d'abord
    if (this.context.conversationHistory) {
      for (const msg of this.context.conversationHistory.reverse()) {
        const code = this.extractAnimalCodeFromText(msg.content);
        if (code) return code;
      }
    }

    return this.extractAnimalCodeFromText(text);
  }

  private extractAnimalCodeFromText(text: string): string | undefined {
    // Pattern amélioré pour extraire les codes animaux
    // Supporte: P001, P002, p001, porc P001, le porc P001, animal P001, etc.
    const patterns = [
      // Pattern 1: "P001", "P002", etc. (code seul)
      /\b([Pp]\d{1,4})\b/,

      // Pattern 2: "porc P001", "le porc P001", "animal P001"
      /(?:porc|animal|le\s+porc|l\s+animal)\s+([Pp]\d{1,4})\b/i,

      // Pattern 3: "peser P001", "pesee de P001"
      /(?:peser|pesee|pesee)\s+(?:le\s+porc\s+)?([Pp]\d{1,4})\b/i,

      // Pattern 4: "P001 fait", "P001 pese"
      /\b([Pp]\d{1,4})\s+(?:fait|pese|a|de)\b/i,

      // Pattern 5: "P001 45 kg" (code directement suivi de poids)
      /\b([Pp]\d{1,4})\s+\d+/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Normaliser le code (majuscule)
        const code = match[1].toUpperCase();
        // Valider que c'est bien un code (P suivi de chiffres)
        if (/^P\d{1,4}$/.test(code)) {
          return code;
        }
      }
    }

    // Chercher dans les animaux disponibles
    if (this.context.availableAnimals) {
      for (const animal of this.context.availableAnimals) {
        if (!animal) continue;
        // Chercher par nom
        if (animal.nom && text.toLowerCase().includes(animal.nom.toLowerCase())) {
          return animal.code;
        }
        // Chercher par code (insensible à la casse)
        const animalCodeUpper = animal.code.toUpperCase();
        const textUpper = text.toUpperCase();
        if (textUpper.includes(animalCodeUpper)) {
          return animal.code;
        }
      }
    }

    // Pattern 1 : Code animal explicite (P001, PORC001, etc.)
    const codePatterns = [
      /(?:porc|animal|code)[:\s]*([A-Z0-9-]{3,})/i,
      /\b([Pp]-?[0-9]{1,})\b/, // P001, P-001, p001
      /\b([Pp][Oo][Rr][Cc]-?[0-9]{1,})\b/i, // PORC001, porc001
      /\b([A-Z]{2,}[0-9]{1,})\b/, // Codes génériques (AB001, etc.)
    ];

    for (const pattern of codePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const code = match[1].toUpperCase().replace(/-/g, '');
        // Valider que c'est un code valide (au moins 3 caractères)
        if (code.length >= 3) {
          return code;
        }
      }
    }

    // Chercher dans les animaux disponibles
    if (this.context.availableAnimals) {
      for (const animal of this.context.availableAnimals) {
        // Chercher par nom
        if (animal.nom && text.toLowerCase().includes(animal.nom.toLowerCase())) {
          return animal.code;
        }
        // Chercher par code (insensible à la casse)
        const animalCodeUpper = animal.code.toUpperCase();
        const textUpper = text.toUpperCase();
        if (textUpper.includes(animalCodeUpper)) {
          return animal.code;
        }
      }
    }

    return undefined;
  }

  /**
   * Extrait une catégorie de dépense
   * Utilise CategoryNormalizer pour centraliser la logique et supporter les synonymes ivoiriens
   */
  extractCategorie(text: string): string | undefined {
    const category = this.categoryNormalizer.extractFromText(text);
    return category || undefined;
  }

  /**
   * Définit les préférences utilisateur pour la normalisation de catégories
   */
  setCategoryPreferences(preferences: import('./extractors/CategoryNormalizer').UserCategoryPreferences): void {
    this.categoryNormalizer.setUserPreferences(preferences);
  }

  /**
   * Extrait un libellé/description
   */
  extractLibelle(text: string): string | undefined {
    // Chercher après "pour", "de", "charge fixe", etc.
    const patterns = [
      /(?:charge fixe|charge|depense|pour|de)\s+(.+?)(?:\s+\d|$)/i,
      /libelle[:\s]+(.+?)(?:\s|$)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1] && !match[1].match(/^\d/)) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Extrait une fréquence
   */
  extractFrequence(text: string): string | undefined {
    const normalized = text.toLowerCase();

    if (normalized.match(/mensuel|mois|chaque mois/i)) {
      return 'mensuel';
    }
    if (normalized.match(/trimestriel|trimestre/i)) {
      return 'trimestriel';
    }
    if (normalized.match(/annuel|an|annee/i)) {
      return 'annuel';
    }

    return 'mensuel'; // Par défaut
  }

  /**
   * Parse un nombre depuis différents formats
   */
  private parseNumber(value: string): number {
    const cleaned = value
      .replace(/[^\d,.]/g, '') // Garder seulement chiffres, virgules, points
      .replace(/\s/g, '') // Supprimer espaces
      .replace(/,/g, '.'); // Remplacer virgule par point

    return parseFloat(cleaned);
  }

  /**
   * Nettoie les paramètres (supprime undefined)
   */
  private cleanParams(params: ExtractedParams): ExtractedParams {
    const cleaned: ExtractedParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
}
