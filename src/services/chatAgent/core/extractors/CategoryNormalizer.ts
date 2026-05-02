/**
 * Service de normalisation de catégories avec support des synonymes ivoiriens
 * Mappe les expressions locales vers les catégories système
 * Supporte l'apprentissage progressif des préférences utilisateur
 */

/**
 * Mapping de catégories avec synonymes ivoiriens
 * Structure : synonyme -> catégorie système
 */
const CATEGORY_MAPPING: Record<string, string> = {
  // ========== ALIMENTATION ==========
  aliment: 'alimentation',
  alimentation: 'alimentation',
  provende: 'alimentation',
  nourriture: 'alimentation',
  ration: 'alimentation',
  rations: 'alimentation',
  mais: 'alimentation',
  maïs: 'alimentation',
  soja: 'alimentation',
  bouffe: 'alimentation', // Argot ivoirien
  manger: 'alimentation', // Argot ivoirien
  'la bouffe': 'alimentation',
  'de la bouffe': 'alimentation',
  'de bouffe': 'alimentation',
  'pour manger': 'alimentation',
  'pour la bouffe': 'alimentation',
  'en bouffe': 'alimentation',
  'en manger': 'alimentation',

  // ========== MÉDICAMENTS ==========
  medicament: 'medicaments',
  medicaments: 'medicaments',
  médicament: 'medicaments',
  médicaments: 'medicaments',
  medoc: 'medicaments', // Abréviation locale
  médoc: 'medicaments',
  medic: 'medicaments',
  'pour médicament': 'medicaments',
  'en médicament': 'medicaments',

  // ========== VÉTÉRINAIRE ==========
  veterinaire: 'veterinaire',
  vétérinaire: 'veterinaire',
  veto: 'veterinaire', // Abréviation courante
  véto: 'veterinaire',
  consultation: 'veterinaire',
  consultations: 'veterinaire',
  'visite veterinaire': 'veterinaire',
  'visite vétérinaire': 'veterinaire',
  'consultation veterinaire': 'veterinaire',
  'consultation vétérinaire': 'veterinaire',

  // ========== VACCINS ==========
  vaccin: 'vaccins',
  vaccins: 'vaccins',
  vaccination: 'vaccins',
  vaccinations: 'vaccins',
  'pour vaccin': 'vaccins',
  'en vaccin': 'vaccins',
  'pour vaccination': 'vaccins',

  // ========== ENTRETIEN ==========
  entretien: 'entretien',
  reparation: 'entretien',
  réparation: 'entretien',
  reparations: 'entretien',
  réparations: 'entretien',
  maintenance: 'entretien',
  'pour entretien': 'entretien',
  'en entretien': 'entretien',

  // ========== ÉQUIPEMENTS ==========
  equipement: 'equipements',
  équipement: 'equipements',
  equipements: 'equipements',
  équipements: 'equipements',
  materiel: 'equipements',
  matériel: 'equipements',
  'pour equipement': 'equipements',
  'pour équipement': 'equipements',

  // ========== SALAIRES ==========
  salaire: 'salaires',
  salaires: 'salaires',
  'pour salaire': 'salaires',
  'pour salaires': 'salaires',
  'en salaire': 'salaires',
  'en salaires': 'salaires',
  paye: 'salaires',
  paie: 'salaires',
  'pour payer': 'salaires',
  'pour paie': 'salaires',

  // ========== VENTE ==========
  vente: 'vente_porc',
  ventes: 'vente_porc',
  'vente de porc': 'vente_porc',
  'vente de porcs': 'vente_porc',
  'vendu': 'vente_porc',
  'j ai vendu': 'vente_porc',
};

/**
 * Catégories système valides
 */
export const VALID_CATEGORIES = [
  'alimentation',
  'medicaments',
  'veterinaire',
  'vaccins',
  'entretien',
  'equipements',
  'salaires',
  'vente_porc',
  'autre',
] as const;

export type SystemCategory = (typeof VALID_CATEGORIES)[number];

/**
 * Interface pour les préférences utilisateur (apprentissage)
 */
export interface UserCategoryPreferences {
  /**
   * Mapping personnalisé utilisateur (ex: "bouffe" -> "alimentation")
   */
  customMappings: Record<string, string>;
  /**
   * Historique des corrections utilisateur (pour apprentissage)
   */
  corrections: Array<{ original: string; corrected: string; count: number }>;
}

/**
 * Service de normalisation de catégories
 */
export class CategoryNormalizer {
  private userPreferences: UserCategoryPreferences | null = null;

  constructor(userPreferences?: UserCategoryPreferences) {
    this.userPreferences = userPreferences || null;
  }

  /**
   * Normalise une catégorie depuis le texte utilisateur
   * @param text - Texte à analyser
   * @param strict - Si true, retourne null si aucune correspondance (au lieu de "autre")
   * @returns Catégorie système normalisée
   */
  normalize(text: string, strict: boolean = false): SystemCategory | null {
    if (!text || typeof text !== 'string') {
      return strict ? null : 'autre';
    }

    const normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
      .trim();

    // 1. Vérifier les préférences utilisateur personnalisées (priorité)
    if (this.userPreferences?.customMappings) {
      for (const [key, category] of Object.entries(this.userPreferences.customMappings)) {
        if (normalized.includes(key.toLowerCase())) {
          return this.validateCategory(category);
        }
      }
    }

    // 2. Vérifier le mapping standard
    for (const [synonym, category] of Object.entries(CATEGORY_MAPPING)) {
      // Recherche exacte ou partielle selon la longueur
      if (synonym.length <= 3) {
        // Pour les mots courts, recherche exacte
        const words = normalized.split(/\s+/);
        if (words.includes(synonym)) {
          return this.validateCategory(category);
        }
      } else {
        // Pour les mots longs, recherche partielle
        if (normalized.includes(synonym)) {
          return this.validateCategory(category);
        }
      }
    }

    // 3. Fallback : catégorie par défaut
    return strict ? null : 'autre';
  }

  /**
   * Extrait la catégorie depuis un texte complet (cherche les mots-clés dans le texte)
   * @param text - Texte complet à analyser
   * @returns Catégorie système ou null
   */
  extractFromText(text: string): SystemCategory | null {
    if (!text || typeof text !== 'string') {
      return null;
    }

    const normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    // Chercher les synonymes par ordre de priorité (les plus spécifiques d'abord)
    const sortedSynonyms = Object.entries(CATEGORY_MAPPING).sort(
      (a, b) => b[0].length - a[0].length // Plus long en premier
    );

    for (const [synonym, category] of sortedSynonyms) {
      if (normalized.includes(synonym)) {
        return this.validateCategory(category);
      }
    }

    // Vérifier les préférences utilisateur
    if (this.userPreferences?.customMappings) {
      for (const [key, category] of Object.entries(this.userPreferences.customMappings)) {
        if (normalized.includes(key.toLowerCase())) {
          return this.validateCategory(category);
        }
      }
    }

    return null;
  }

  /**
   * Valide qu'une catégorie est valide
   */
  private validateCategory(category: string): SystemCategory {
    if (VALID_CATEGORIES.includes(category as SystemCategory)) {
      return category as SystemCategory;
    }
    return 'autre';
  }

  /**
   * Enregistre une correction utilisateur (pour apprentissage)
   * @param original - Catégorie originale détectée
   * @param corrected - Catégorie corrigée par l'utilisateur
   */
  recordCorrection(original: string, corrected: string): void {
    if (!this.userPreferences) {
      this.userPreferences = { customMappings: {}, corrections: [] };
    }

    // Chercher si cette correction existe déjà
    const existingCorrection = this.userPreferences.corrections.find(
      (c) => c.original === original && c.corrected === corrected
    );

    if (existingCorrection) {
      existingCorrection.count++;
      // Si correction répétée plusieurs fois, l'ajouter au mapping personnalisé
      if (existingCorrection.count >= 3) {
        this.userPreferences.customMappings[original] = corrected;
      }
    } else {
      this.userPreferences.corrections.push({
        original,
        corrected,
        count: 1,
      });
    }
  }

  /**
   * Retourne les préférences utilisateur
   */
  getUserPreferences(): UserCategoryPreferences | null {
    return this.userPreferences;
  }

  /**
   * Met à jour les préférences utilisateur
   */
  setUserPreferences(preferences: UserCategoryPreferences): void {
    this.userPreferences = preferences;
  }

  /**
   * Retourne tous les synonymes pour une catégorie
   */
  static getSynonymsForCategory(category: SystemCategory): string[] {
    return Object.entries(CATEGORY_MAPPING)
      .filter(([_, cat]) => cat === category)
      .map(([synonym]) => synonym);
  }

  /**
   * Vérifie si une chaîne est une catégorie système valide
   */
  static isValidCategory(category: string): category is SystemCategory {
    return VALID_CATEGORIES.includes(category as SystemCategory);
  }
}

