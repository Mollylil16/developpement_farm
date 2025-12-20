/**
 * Extracteur de paramètres robuste pour l'agent conversationnel
 * Système multi-couches avec validation contextuelle
 */

import { parse, addDays, startOfDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  private context: ExtractionContext;

  constructor(context: ExtractionContext = {}) {
    this.context = {
      currentDate: new Date().toISOString().split('T')[0],
      ...context,
    };
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
   * Priorité : Montant après "à", "pour", "de" > Montant avec FCFA > Formats "k"/"million" > Plus grand nombre
   * Supporte : "800000", "800 000", "800k", "800 k", "1 million", "1.5 million"
   */
  extractMontant(text: string): number | undefined {
    const normalized = text.toLowerCase();
    // Utiliser normalized pour améliorer la détection (supprimer accents, normaliser)

    // Pattern 1 : Montant après préposition (le plus fiable)
    const prepositionPatterns = [
      /(?:a|pour|de|montant|prix|cout|vendu a|vendu pour|achete a|achete pour|depense de|depense a|paye|paye pour)[:\s]+(\d[\d\s,]+(?:\s*k|\s*million)?)(?:\s*(?:f\s*c\s*f\s*a|fcfa|francs?|f\s*))?/i,
    ];

    for (const pattern of prepositionPatterns) {
      // Utiliser normalized pour la recherche (plus fiable pour les accents)
      const match = normalized.match(pattern);
      if (match && match[1]) {
        const montant = this.parseNumberWithUnits(match[1]);
        if (montant && this.isValidMontant(montant)) {
          return montant;
        }
      }
    }

    // Pattern 2 : Montant avec devise
    const devisePattern = /(\d[\d\s,]+(?:\s*k|\s*million)?)\s*(?:f\s*c\s*f\s*a|fcfa|francs?|f\s*)/i;
    // Utiliser normalized pour la recherche
    const deviseMatch = normalized.match(devisePattern);
    if (deviseMatch && deviseMatch[1]) {
      const montant = this.parseNumberWithUnits(deviseMatch[1]);
      if (montant && this.isValidMontant(montant)) {
        return montant;
      }
    }

    // Pattern 3 : Formats "k" ou "million" (ex: "800k", "1 million")
    const kPattern = /(\d+[\d\s,]*)\s*k\b/i;
    // Utiliser normalized pour la recherche
    const kMatch = normalized.match(kPattern);
    if (kMatch && kMatch[1]) {
      const base = this.parseNumber(kMatch[1]);
      if (base && this.isValidMontant(base * 1000)) {
        return base * 1000;
      }
    }

    const millionPattern = /(\d+[.,]?\d*)\s*million/i;
    // Utiliser normalized pour la recherche
    const millionMatch = normalized.match(millionPattern);
    if (millionMatch && millionMatch[1]) {
      const base = parseFloat(millionMatch[1].replace(',', '.'));
      if (!isNaN(base) && this.isValidMontant(base * 1000000)) {
        return base * 1000000;
      }
    }

    // Pattern 4 : Plus grand nombre (exclure quantités et poids)
    // Utiliser normalized pour la recherche
    const allNumbers = normalized.match(/\b(\d[\d\s,]{3,})\b/g);
    if (allNumbers) {
      const validNumbers = allNumbers
        .map((n) => this.parseNumber(n))
        .filter((n) => this.isValidMontant(n))
        .sort((a, b) => b - a); // Tri décroissant

      if (validNumbers.length > 0) {
        // Prendre le plus grand, mais vérifier qu'il n'est pas une quantité ou un poids
        const maxNumber = validNumbers[0];
        const numberIndex = text.toLowerCase().indexOf(maxNumber.toString());
        const afterNumber = text.substring(numberIndex, numberIndex + 30).toLowerCase();

        // Si suivi de "porc", "kg", "sac" → probablement quantité/poids, pas montant
        if (!afterNumber.match(/\s*(?:porc|porcs|kg|kilogramme|kilo|sac|sacs|tete|tetes)/i)) {
          return maxNumber;
        }
      }
    }

    return undefined;
  }

  /**
   * Parse un nombre avec unités (k, million)
   */
  private parseNumberWithUnits(value: string): number | null {
    const cleaned = value.trim().toLowerCase();

    // Format "k" (ex: "800k", "800 k")
    if (cleaned.includes('k') && !cleaned.includes('kg') && !cleaned.includes('kilo')) {
      const numStr = cleaned.replace(/\s*k\s*$/i, '').replace(/[\s,]/g, '');
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        return num * 1000;
      }
    }

    // Format "million" (ex: "1 million", "1.5 million")
    if (cleaned.includes('million')) {
      const numStr = cleaned
        .replace(/\s*million.*$/i, '')
        .replace(/[\s,]/g, '')
        .replace(',', '.');
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        return num * 1000000;
      }
    }

    // Format normal
    return this.parseNumber(value);
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
   */
  extractDate(text: string): string | undefined {
    const normalized = text.toLowerCase();
    const today = new Date(this.context.currentDate || new Date().toISOString().split('T')[0]);
    today.setHours(0, 0, 0, 0);

    // Dates relatives
    if (normalized.includes("aujourd'hui") || normalized.includes('aujourd hui')) {
      return format(today, 'yyyy-MM-dd');
    }

    if (normalized.includes('demain')) {
      return format(addDays(today, 1), 'yyyy-MM-dd');
    }

    if (normalized.includes('hier')) {
      return format(addDays(today, -1), 'yyyy-MM-dd');
    }

    // Jours de la semaine
    const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    for (let i = 0; i < jours.length; i++) {
      if (normalized.includes(jours[i])) {
        const jourIndex = i; // 0 = lundi
        const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convertir dimanche = 6
        let daysToAdd = jourIndex - todayIndex;
        if (daysToAdd <= 0) daysToAdd += 7; // Prochain jour de la semaine
        return format(addDays(today, daysToAdd), 'yyyy-MM-dd');
      }
    }

    // Dates absolues (DD/MM/YYYY ou DD-MM-YYYY)
    const datePatterns = [
      /(\d{1,2})[/-](\d{1,2})[/-]?(\d{4})?/,
      /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          let day, month, year;
          if (match[3]) {
            // Format DD/MM/YYYY
            day = parseInt(match[1]);
            month = parseInt(match[2]);
            year = parseInt(match[3]);
          } else if (match[1].length === 4) {
            // Format YYYY-MM-DD
            year = parseInt(match[1]);
            month = parseInt(match[2]);
            day = parseInt(match[3]);
          } else {
            // Format DD/MM (année actuelle)
            day = parseInt(match[1]);
            month = parseInt(match[2]);
            year = today.getFullYear();
          }

          // Utiliser parse et startOfDay pour normaliser la date
          const dateStr = `${day}/${month}/${year}`;
          try {
            const parsedDate = parse(dateStr, 'd/M/yyyy', new Date(), { locale: fr });
            const normalizedDate = startOfDay(parsedDate);
            if (!isNaN(normalizedDate.getTime())) {
              return format(normalizedDate, 'yyyy-MM-dd');
            }
          } catch (parseError) {
            // Utiliser parseError pour logger et comprendre pourquoi parse a échoué
            const errorMessage = parseError instanceof Error ? parseError.message : 'Erreur inconnue';
            console.debug(`[ParameterExtractor] Parse date échoué, fallback simple: ${errorMessage}`);
            // Fallback sur la méthode simple si parse échoue
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) {
              return format(date, 'yyyy-MM-dd');
            }
          }
        } catch (error) {
          // Utiliser error pour logger si nécessaire
          console.warn('[ParameterExtractor] Erreur lors de l\'extraction de date:', error instanceof Error ? error.message : 'Erreur inconnue');
        }
      }
    }

    // Par défaut, utiliser la date actuelle normalisée avec startOfDay
    const normalizedToday = startOfDay(today);
    return format(normalizedToday, 'yyyy-MM-dd');
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
   */
  extractCategorie(text: string): string | undefined {
    const normalized = text.toLowerCase();

    const categoryMap: Record<string, string> = {
      aliment: 'alimentation',
      alimentation: 'alimentation',
      provende: 'alimentation',
      nourriture: 'alimentation',
      ration: 'alimentation',
      mais: 'alimentation',
      soja: 'alimentation',
      medicament: 'medicaments',
      medicaments: 'medicaments',
      vaccin: 'vaccins',
      vaccins: 'vaccins',
      veterinaire: 'veterinaire',
      veto: 'veterinaire',
      consultation: 'veterinaire',
      entretien: 'entretien',
      reparation: 'entretien',
      maintenance: 'entretien',
      equipement: 'equipements',
      materiel: 'equipements',
      salaire: 'salaires',
      salaires: 'salaires',
    };

    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (normalized.includes(keyword)) {
        return category;
      }
    }

    return 'autre';
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
   * Valide qu'un nombre est un montant valide (pas une quantité ou un poids)
   */
  private isValidMontant(value: number): boolean {
    return !isNaN(value) && value >= 100 && value < 1000000000; // Entre 100 FCFA et 1 milliard
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
