/**
 * Service dédié pour l'extraction de montants depuis le texte utilisateur
 * Supporte les formats variés incluant les abréviations locales ivoiriennes
 * Centralise toute la logique d'extraction pour éviter les duplications
 */

/**
 * Interface pour les options d'extraction
 */
export interface MontantExtractionOptions {
  /**
   * Contexte pour améliorer l'extraction (ex: exclure les quantités connues)
   */
  excludeNumbers?: number[];
  /**
   * Si true, utilise une validation plus stricte
   */
  strict?: boolean;
}

/**
 * Service d'extraction de montants
 * Supporte : "100000", "100 000", "100k", "1 million", "150 balles" (150000 FCFA), etc.
 */
export class MontantExtractor {
  /**
   * Extrait un montant depuis un texte avec support des formats variés
   * @param text - Texte à analyser
   * @param options - Options d'extraction
   * @returns Montant extrait ou null si non trouvé
   */
  static extract(text: string, options: MontantExtractionOptions = {}): number | null {
    if (!text || typeof text !== 'string') {
      return null;
    }

    const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. Montant après préposition (le plus fiable)
    const montantFromPreposition = this.extractFromPreposition(normalized);
    if (montantFromPreposition && this.isValidMontant(montantFromPreposition, options)) {
      return montantFromPreposition;
    }

    // 2. Montant avec devise explicite (FCFA, francs, etc.)
    const montantFromDevise = this.extractFromDevise(normalized);
    if (montantFromDevise && this.isValidMontant(montantFromDevise, options)) {
      return montantFromDevise;
    }

    // 3. Formats avec abréviations locales ("k", "million", "balles")
    const montantFromAbbreviations = this.extractFromAbbreviations(normalized);
    if (montantFromAbbreviations && this.isValidMontant(montantFromAbbreviations, options)) {
      return montantFromAbbreviations;
    }

    // 4. Plus grand nombre dans le texte (fallback, avec validation contextuelle)
    const montantFromMaxNumber = this.extractMaxNumber(normalized, text, options);
    if (montantFromMaxNumber && this.isValidMontant(montantFromMaxNumber, options)) {
      return montantFromMaxNumber;
    }

    return null;
  }

  /**
   * Extrait un montant après préposition ("à", "pour", "de", etc.)
   */
  private static extractFromPreposition(text: string): number | null {
    // Patterns prioritaires (après prépositions ou mots-clés)
    const patterns = [
      // Pattern 1: Après préposition de montant
      /(?:a|pour|de|montant|prix|cout|vendu\s+a|vendu\s+pour|achete\s+a|achete\s+pour|depense\s+de|depense\s+a|paye|paye\s+pour|claque|claque\s+pour)[:\s]+(\d[\d\s,]+(?:\s*k|\s*million|\s*balles)?)(?:\s*(?:f\s*c\s*f\s*a|fcfa|francs?|f\s*))?/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const montant = this.parseNumberWithUnits(match[1]);
        if (montant && montant > 0) {
          return montant;
        }
      }
    }

    return null;
  }

  /**
   * Extrait un montant avec devise explicite (FCFA, francs, etc.)
   */
  private static extractFromDevise(text: string): number | null {
    const devisePattern = /(\d[\d\s,]+(?:\s*k|\s*million)?)\s*(?:f\s*c\s*f\s*a|fcfa|francs?|f\s*)/i;
    const match = text.match(devisePattern);
    
    if (match && match[1]) {
      return this.parseNumberWithUnits(match[1]);
    }

    return null;
  }

  /**
   * Extrait un montant depuis des abréviations locales
   * Supporte : "k" (1000), "million", "balles" (1000 en argot ivoirien)
   */
  private static extractFromAbbreviations(text: string): number | null {
    // Format "k" (ex: "150k" = 150000)
    const kPattern = /(\d+[\d\s,]*)\s*k\b/i;
    const kMatch = text.match(kPattern);
    if (kMatch && kMatch[1]) {
      const base = this.parseNumber(kMatch[1]);
      if (base && base > 0) {
        return base * 1000;
      }
    }

    // Format "million" (ex: "1 million" = 1000000, "1.5 million" = 1500000)
    const millionPattern = /(\d+[.,]?\d*)\s*million/i;
    const millionMatch = text.match(millionPattern);
    if (millionMatch && millionMatch[1]) {
      const base = parseFloat(millionMatch[1].replace(',', '.'));
      if (!isNaN(base) && base > 0) {
        return base * 1000000;
      }
    }

    // Format "balles" (argot ivoirien pour 1000, ex: "150 balles" = 150000)
    const ballesPattern = /(\d+[\d\s,]*)\s*balles/i;
    const ballesMatch = text.match(ballesPattern);
    if (ballesMatch && ballesMatch[1]) {
      const base = this.parseNumber(ballesMatch[1]);
      if (base && base > 0) {
        return base * 1000;
      }
    }

    return null;
  }

  /**
   * Extrait le plus grand nombre du texte (fallback)
   * Exclut les quantités et poids connus
   */
  private static extractMaxNumber(
    normalized: string,
    original: string,
    options: MontantExtractionOptions
  ): number | null {
    const allNumbers = normalized.match(/\b(\d[\d\s,]{3,})\b/g);
    if (!allNumbers || allNumbers.length === 0) {
      return null;
    }

    const validNumbers = allNumbers
      .map((n) => this.parseNumber(n))
      .filter((n) => {
        // Exclure les nombres explicitement exclus
        if (options.excludeNumbers?.includes(n)) {
          return false;
        }

        // Validation de base
        if (n <= 100 || n > 100000000) {
          return false;
        }

        // Vérifier qu'il n'est pas suivi d'un mot indiquant une quantité ou un poids
        const numberStr = n.toString();
        const indexInOriginal = original.toLowerCase().indexOf(numberStr);
        if (indexInOriginal >= 0) {
          const afterNumber = original.substring(indexInOriginal, indexInOriginal + 30).toLowerCase();
          // Si suivi de "porc", "kg", "sac" → probablement quantité/poids, pas montant
          if (afterNumber.match(/\s*(?:porc|porcs|kg|kilogramme|kilo|sac|sacs|tete|tetes)/i)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => b - a); // Tri décroissant

    return validNumbers.length > 0 ? validNumbers[0] : null;
  }

  /**
   * Parse un nombre avec unités (k, million, balles)
   */
  private static parseNumberWithUnits(value: string): number | null {
    const cleaned = value.trim().toLowerCase();

    // Format "k"
    if (cleaned.includes('k') && !cleaned.includes('kg') && !cleaned.includes('kilo')) {
      const numStr = cleaned.replace(/\s*k\s*$/i, '').replace(/[\s,]/g, '');
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0) {
        return num * 1000;
      }
    }

    // Format "million"
    if (cleaned.includes('million')) {
      const numStr = cleaned.replace(/\s*million.*$/i, '').replace(/[\s,]/g, '').replace(',', '.');
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0) {
        return num * 1000000;
      }
    }

    // Format "balles"
    if (cleaned.includes('balles')) {
      const numStr = cleaned.replace(/\s*balles.*$/i, '').replace(/[\s,]/g, '');
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0) {
        return num * 1000;
      }
    }

    // Format normal
    return this.parseNumber(value);
  }

  /**
   * Parse un nombre simple (retire espaces et virgules)
   */
  private static parseNumber(value: string): number | null {
    const cleaned = value.replace(/[\s,]/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? null : num;
  }

  /**
   * Valide qu'un montant est valide
   */
  private static isValidMontant(montant: number, options: MontantExtractionOptions): boolean {
    // Exclusion explicite
    if (options.excludeNumbers?.includes(montant)) {
      return false;
    }

    // Montant doit être > 100 (ignore les petites quantités)
    if (montant <= 100) {
      return false;
    }

    // Montant doit être raisonnable (< 1 milliard)
    if (montant > 1000000000) {
      return false;
    }

    // Validation stricte si demandée
    if (options.strict && montant < 1000) {
      return false;
    }

    return true;
  }

  /**
   * Normalise un montant (utilisé pour la comparaison)
   */
  static normalize(montant: number): number {
    return Math.round(montant);
  }
}

