/**
 * Gestionnaire de contexte conversationnel
 * Maintient la mémoire des entités et références mentionnées
 */

import { ChatMessage } from '../../../types/chatAgent';

export interface ConversationEntity {
  type: 'acheteur' | 'animal' | 'montant' | 'date' | 'categorie';
  value: unknown;
  mentionedAt: string; // ISO timestamp
  context?: string; // Contexte de mention
}

export interface ConversationContext {
  // Entités mentionnées récemment
  entities: Map<string, ConversationEntity[]>;

  // Dernières valeurs mentionnées (pour résolution de références)
  lastAcheteur?: string;
  lastAnimal?: string;
  lastMontant?: number;
  lastDate?: string;
  lastCategorie?: string;

  // Historique structuré
  history: Array<{
    message: string;
    intent?: string;
    action?: string;
    params?: Record<string, unknown>;
    result?: unknown;
    timestamp: string;
  }>;

  // Action en attente de confirmation
  pendingAction?: {
    action: string;
    params: Record<string, unknown>;
    timestamp: string;
  };

  // Clarification en cours
  clarificationNeeded?: {
    question: string;
    missingParams: string[];
    timestamp: string;
  };

  // État de conversation pour les ventes (nouveau flow)
  venteState?: {
    state: 'demande_loges' | 'affichage_sujets' | 'selection_sujets' | 'demande_montant';
    montant?: number;
    date?: string;
    nombre?: number;
    acheteur?: string;
    loges?: string[];
    sujetsDisponibles?: Array<{
      id: string;
      code?: string;
      nom?: string;
      race?: string;
      poids_kg?: number;
      date_derniere_pesee?: string;
      loge?: string;
    }>;
    sujetsSelectionnes?: string[];
  };

  // Mémorisation des corrections utilisateur (pour apprentissage)
  userCorrections?: Array<{
    originalCategory?: string;
    correctedCategory?: string;
    originalValue?: string;
    correctedValue?: string;
    timestamp: string;
    count: number;
  }>;
}

export class ConversationContextManager {
  private context: ConversationContext;

  constructor() {
    this.context = {
      entities: new Map(),
      history: [],
    };
  }

  /**
   * Met à jour le contexte avec un nouveau message
   */
  updateFromMessage(
    message: ChatMessage,
    intent?: string,
    action?: string,
    params?: Record<string, unknown>
  ): void {
    if (message.role === 'user') {
      // Extraire les entités du message utilisateur
      this.extractEntities(message.content);
    }

    // Ajouter à l'historique
    this.context.history.push({
      message: message.content,
      intent,
      action,
      params,
      timestamp: message.timestamp,
    });

    // Garder seulement les 50 derniers messages
    if (this.context.history.length > 50) {
      this.context.history.shift();
    }
  }

  /**
   * Extrait les entités d'un message
   * Amélioré pour capturer plus de patterns et contextes
   */
  private extractEntities(text: string): void {
    const normalized = text.toLowerCase();
    
    // Extraire acheteur (patterns améliorés)
    const acheteurPatterns = [
      /(?:vendu|vente|vendre)\s+(?:à|pour|chez)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]+?)(?:\s+(?:pour|à|\d)|$)/i,
      /(?:a|pour|chez|avec|client|acheteur)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]+?)(?:\s+(?:pour|à|\d|fcfa|francs)|$)/i,
      /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ]+)\s+(?:a\s+achete|a\s+pris|vient\s+d'acheter)/i,
    ];
    
    for (const pattern of acheteurPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const acheteur = match[1].trim();
        // Exclure les mots communs qui ne sont pas des noms
        if (acheteur.length > 1 && !/^(le|la|les|un|une|des|du|de|pour|avec|à)$/i.test(acheteur)) {
          this.context.lastAcheteur = acheteur;
          this.addEntity('acheteur', acheteur, text);
          break;
        }
      }
    }

    // Extraire montant (patterns améliorés)
    const montantPatterns = [
      /(\d[\d\s,.]{3,})\s*(?:fcfa|francs?|f\s*)/i,
      /(?:montant|prix|cout|coût|somme)\s*[:\s]*(\d[\d\s,.]{3,})/i,
      /(\d{4,})/i, // Montants >= 1000 sans unité (probablement FCFA)
    ];
    
    for (const pattern of montantPatterns) {
      const montantMatch = text.match(pattern);
      if (montantMatch && montantMatch[1]) {
        const montant = parseInt(montantMatch[1].replace(/[\s,.]/g, ''));
        if (montant > 100 && montant < 100000000) { // Plage raisonnable
          this.context.lastMontant = montant;
          this.addEntity('montant', montant, text);
          break;
        }
      }
    }

    // Extraire animal (patterns améliorés)
    const animalPatterns = [
      /(?:porc|animal|sujet)\s+(?:code|numero|numéro)?\s*[:\s]?([A-Z0-9]{2,})/i,
      /(?:code|numero|numéro)\s*[:\s]?([A-Z0-9]{2,})/i, // Code seul si contexte animal
      /\b([P][0-9]{2,})\b/i, // Format P001, P123, etc.
    ];
    
    for (const pattern of animalPatterns) {
      const animalMatch = text.match(pattern);
      if (animalMatch && animalMatch[1]) {
        const animalCode = animalMatch[1].toUpperCase();
        this.context.lastAnimal = animalCode;
        this.addEntity('animal', animalCode, text);
        break;
      }
    }

    // Extraire date (patterns améliorés)
    const datePatterns = [
      /(?:le|au|du|date|jour)\s+(\d{1,2}[\/\-]\d{1,2}(?:\/\d{2,4})?)/i,
      /(\d{1,2}[\/\-]\d{1,2}(?:\/\d{2,4})?)/i,
    ];
    
    for (const pattern of datePatterns) {
      const dateMatch = text.match(pattern);
      if (dateMatch && dateMatch[1]) {
        this.context.lastDate = dateMatch[1];
        this.addEntity('date', dateMatch[1], text);
        break;
      }
    }
    
    // Dates spéciales
    if (normalized.includes('aujourd') || normalized.includes('maintenant')) {
      const today = new Date().toISOString().split('T')[0];
      this.context.lastDate = today;
      this.addEntity('date', today, text);
    } else if (normalized.includes('demain')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.context.lastDate = tomorrow.toISOString().split('T')[0];
      this.addEntity('date', this.context.lastDate, text);
    } else if (normalized.includes('hier')) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      this.context.lastDate = yesterday.toISOString().split('T')[0];
      this.addEntity('date', this.context.lastDate, text);
    }

    // Extraire catégorie (patterns améliorés)
    const categoriePatterns = [
      /(?:categorie|type|catégorie)\s+[:\s]*([a-z_]+)/i,
      /(?:en|pour|de\s+type)\s+(alimentation|medicaments|vaccins|veterinaire|equipements|entretien|autre)/i,
    ];
    
    for (const pattern of categoriePatterns) {
      const categorieMatch = text.match(pattern);
      if (categorieMatch && categorieMatch[1]) {
        this.context.lastCategorie = categorieMatch[1];
        this.addEntity('categorie', categorieMatch[1], text);
        break;
      }
    }
  }

  /**
   * Ajoute une entité au contexte
   */
  private addEntity(type: ConversationEntity['type'], value: unknown, context: string): void {
    if (!this.context.entities.has(type)) {
      this.context.entities.set(type, []);
    }

    const entities = this.context.entities.get(type)!;

    // Éviter les doublons récents
    const recentEntity = entities.find(
      (e) => e.value === value && new Date().getTime() - new Date(e.mentionedAt).getTime() < 60000 // Moins d'1 minute
    );

    if (!recentEntity) {
      entities.unshift({
        type,
        value,
        mentionedAt: new Date().toISOString(),
        context,
      });

      // Garder seulement les 10 dernières entités de chaque type
      if (entities.length > 10) {
        entities.pop();
      }
    }
  }

  /**
   * Résout une référence ("le même", "celui-là", "il", "elle", "ça", "cela", etc.)
   * Amélioration pour résolution d'anaphores avec plus de patterns
   */
  resolveReference(reference: string, type: ConversationEntity['type']): unknown {
    const normalized = reference.toLowerCase().trim();

    // Anaphores pronominales (il, elle, le, la, lui, leur, ça, cela, etc.)
    const pronominalAnaphora = [
      /^(il|elle|le|la|lui|les|leur|eux|elles)$/,
      /^(celui| celle| ceux| celles)$/,
      /^(ce| cet| cette| ces|ça|cela)$/,
      /^(c'?est|ce\s+sont)$/,
    ];

    for (const pattern of pronominalAnaphora) {
      if (pattern.test(normalized)) {
        // Chercher dans l'historique récent (3 derniers messages)
        const recentHistory = this.context.history.slice(-3).reverse();
        for (const entry of recentHistory) {
          if (entry.params) {
            // Chercher selon le type
            if (type === 'acheteur' && entry.params.acheteur) {
              return entry.params.acheteur;
            }
            if (type === 'animal' && entry.params.animal_code) {
              return entry.params.animal_code;
            }
            if (type === 'montant' && entry.params.montant) {
              return entry.params.montant;
            }
            if (type === 'date' && entry.params.date) {
              return entry.params.date;
            }
            if (type === 'categorie' && entry.params.categorie) {
              return entry.params.categorie;
            }
          }
        }
        // Si pas trouvé dans l'historique, utiliser les dernières valeurs
        if (type === 'acheteur' && this.context.lastAcheteur) {
          return this.context.lastAcheteur;
        }
        if (type === 'animal' && this.context.lastAnimal) {
          return this.context.lastAnimal;
        }
        if (type === 'montant' && this.context.lastMontant) {
          return this.context.lastMontant;
        }
        if (type === 'date' && this.context.lastDate) {
          return this.context.lastDate;
        }
        if (type === 'categorie' && this.context.lastCategorie) {
          return this.context.lastCategorie;
        }
      }
    }

    // Références explicites ("le même", "celui-là", "ça", etc.)
    const explicitReferences = [
      /^(le\s+meme|la\s+meme|les\s+meme|les\s+memes|l'?meme)$/i,
      /^(celui\s+la| celle\s+la| ceux\s+la| celles\s+la)$/i,
      /^(le\s+meme\s+acheteur| la\s+meme\s+acheteur)$/i,
      /^(le\s+meme\s+animal| la\s+meme\s+animal)$/i,
      /^(le\s+meme\s+montant| la\s+meme\s+montant)$/i,
      /^(le\s+meme\s+porc| la\s+meme\s+porc)$/i,
      /^(le\s+dernier| la\s+derniere| les\s+derniers| les\s+dernieres)$/i,
      /^(le\s+precedent| la\s+precedente| les\s+precedents| les\s+precedentes)$/i,
      /^(pour\s+ca|pour\s+cela|pour\s+le\s+meme|pour\s+la\s+meme)$/i,
      /^(avec\s+ca|avec\s+cela|avec\s+le\s+meme)$/i,
    ];

    for (const pattern of explicitReferences) {
      if (pattern.test(normalized)) {
        const entities = this.context.entities.get(type);
        if (entities && entities.length > 0) {
          return entities[0].value; // La plus récente
        }
      }
    }

    // Références spécifiques par type
    if (type === 'acheteur' && this.context.lastAcheteur) {
      return this.context.lastAcheteur;
    }
    if (type === 'animal' && this.context.lastAnimal) {
      return this.context.lastAnimal;
    }
    if (type === 'montant' && this.context.lastMontant) {
      return this.context.lastMontant;
    }
    if (type === 'date' && this.context.lastDate) {
      return this.context.lastDate;
    }
    if (type === 'categorie' && this.context.lastCategorie) {
      return this.context.lastCategorie;
    }

    return undefined;
  }

  /**
   * Résout automatiquement les anaphores dans un texte
   * Extrait et résout "il", "elle", "le", "la", etc.
   */
  resolveAnaphoras(text: string): string {
    let resolved = text;

    // Patterns d'anaphores à résoudre
    const anaphoraPatterns = [
      {
        pattern: /\b(il|elle)\b/gi,
        resolve: (match: string, offset: number) => {
          // Chercher le sujet précédent dans l'historique
          const recentHistory = this.context.history.slice(-2);
          for (const entry of recentHistory) {
            if (entry.params?.animal_code) {
              return entry.params.animal_code as string;
            }
            if (entry.params?.acheteur) {
              return entry.params.acheteur as string;
            }
          }
          return match; // Garder l'original si pas de résolution
        },
      },
      {
        pattern: /\b(le|la|les)\s+(meme|dernier|precedent)\b/gi,
        resolve: (match: string) => {
          // Résoudre selon le contexte
          if (this.context.lastAnimal) {
            return this.context.lastAnimal;
          }
          if (this.context.lastAcheteur) {
            return this.context.lastAcheteur;
          }
          return match;
        },
      },
    ];

    // Appliquer les résolutions
    for (const { pattern, resolve } of anaphoraPatterns) {
      resolved = resolved.replace(pattern, resolve);
    }

    return resolved;
  }

  /**
   * Récupère le contexte pour l'extraction de paramètres
   * Amélioré pour inclure plus de contexte conversationnel
   */
  getExtractionContext(): {
    conversationHistory: Array<{ role: string; content: string }>;
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
  } {
    // Extraire les entités récentes de l'historique
    const recentEntities = {
      acheteurs: [] as string[],
      animaux: [] as string[],
      montants: [] as number[],
      dates: [] as string[],
      categories: [] as string[],
    };

    // Récupérer les entités récentes depuis la Map
    const acheteurs = this.context.entities.get('acheteur') || [];
    recentEntities.acheteurs = acheteurs.slice(0, 5).map(e => String(e.value));
    
    const animaux = this.context.entities.get('animal') || [];
    recentEntities.animaux = animaux.slice(0, 5).map(e => String(e.value));
    
    const montants = this.context.entities.get('montant') || [];
    recentEntities.montants = montants.slice(0, 5).map(e => Number(e.value)).filter(m => !isNaN(m));
    
    const dates = this.context.entities.get('date') || [];
    recentEntities.dates = dates.slice(0, 5).map(e => String(e.value));
    
    const categories = this.context.entities.get('categorie') || [];
    recentEntities.categories = categories.slice(0, 5).map(e => String(e.value));

    return {
      conversationHistory: this.context.history
        .slice(-10)
        .map((h) => ({ role: 'user', content: h.message })),
      lastAcheteur: this.context.lastAcheteur,
      lastAnimal: this.context.lastAnimal,
      lastMontant: this.context.lastMontant,
      lastDate: this.context.lastDate,
      lastCategorie: this.context.lastCategorie,
      recentTransactions: this.context.history
        .filter((h) => 
          (h.action === 'create_revenu' || h.action === 'create_depense') && h.params
        )
        .slice(0, 5)
        .map((h) => ({
          acheteur:
            h.params?.acheteur && typeof h.params.acheteur === 'string'
              ? h.params.acheteur
              : undefined,
          montant:
            h.params?.montant && typeof h.params.montant === 'number'
              ? h.params.montant
              : undefined,
          date:
            h.params?.date && typeof h.params.date === 'string'
              ? h.params.date
              : undefined,
          categorie:
            h.params?.categorie && typeof h.params.categorie === 'string'
              ? h.params.categorie
              : undefined,
        })),
      recentEntities,
    };
  }

  /**
   * Définit une action en attente
   */
  setPendingAction(action: string, params: Record<string, unknown>): void {
    this.context.pendingAction = {
      action,
      params,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Récupère l'action en attente
   */
  getPendingAction(): { action: string; params: Record<string, unknown> } | undefined {
    return this.context.pendingAction;
  }

  /**
   * Définit une clarification nécessaire
   */
  setClarificationNeeded(question: string, missingParams: string[]): void {
    this.context.clarificationNeeded = {
      question,
      missingParams,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Récupère la clarification nécessaire
   */
  getClarificationNeeded(): { question: string; missingParams: string[] } | undefined {
    return this.context.clarificationNeeded;
  }

  /**
   * Réinitialise la clarification nécessaire
   */
  clearClarificationNeeded(): void {
    this.context.clarificationNeeded = undefined;
  }

  /**
   * Définit une action en attente
   */
  setPendingAction(action: string, params: Record<string, unknown>): void {
    this.context.pendingAction = {
      action,
      params,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Réinitialise l'action en attente
   */
  clearPendingAction(): void {
    this.context.pendingAction = undefined;
  }

  /**
   * Réinitialise le contexte
   */
  reset(): void {
    this.context = {
      entities: new Map(),
      history: [],
    };
  }

  /**
   * Récupère le contexte complet
   */
  getContext(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Enregistre une correction utilisateur (pour apprentissage)
   */
  recordCorrection(
    originalCategory?: string,
    correctedCategory?: string,
    originalValue?: string,
    correctedValue?: string
  ): void {
    if (!this.context.userCorrections) {
      this.context.userCorrections = [];
    }

    // Chercher si cette correction existe déjà
    const existingCorrection = this.context.userCorrections.find(
      (c) =>
        c.originalCategory === originalCategory &&
        c.correctedCategory === correctedCategory &&
        c.originalValue === originalValue &&
        c.correctedValue === correctedValue
    );

    if (existingCorrection) {
      existingCorrection.count++;
      existingCorrection.timestamp = new Date().toISOString();
    } else {
      this.context.userCorrections.push({
        originalCategory,
        correctedCategory,
        originalValue,
        correctedValue,
        timestamp: new Date().toISOString(),
        count: 1,
      });
    }

    // Garder seulement les 100 dernières corrections
    if (this.context.userCorrections.length > 100) {
      this.context.userCorrections.shift();
    }
  }

  /**
   * Récupère les corrections utilisateur (pour apprentissage)
   */
  getUserCorrections(): Array<{
    originalCategory?: string;
    correctedCategory?: string;
    originalValue?: string;
    correctedValue?: string;
    timestamp: string;
    count: number;
  }> {
    return this.context.userCorrections || [];
  }

  /**
   * Récupère les préférences utilisateur basées sur les corrections
   */
  getUserPreferences(): {
    categoryMappings: Record<string, string>;
    commonCorrections: Array<{
      original: string;
      corrected: string;
      count: number;
    }>;
  } {
    const categoryMappings: Record<string, string> = {};
    const commonCorrections: Array<{ original: string; corrected: string; count: number }> = [];

    if (this.context.userCorrections) {
      // Mapper les corrections fréquentes (>= 3 fois)
      this.context.userCorrections.forEach((correction) => {
        if (correction.count >= 3) {
          if (correction.originalCategory && correction.correctedCategory) {
            categoryMappings[correction.originalCategory] = correction.correctedCategory;
          }
          if (correction.originalValue && correction.correctedValue) {
            commonCorrections.push({
              original: correction.originalValue,
              corrected: correction.correctedValue,
              count: correction.count,
            });
          }
        }
      });
    }

    return {
      categoryMappings,
      commonCorrections: commonCorrections.sort((a, b) => b.count - a.count).slice(0, 20),
    };
  }

  /**
   * Récupère l'état de vente
   */
  getVenteState(): ConversationContext['venteState'] | undefined {
    return this.context.venteState;
  }

  /**
   * Définit l'état de vente
   */
  setVenteState(venteState: ConversationContext['venteState']): void {
    this.context.venteState = venteState;
  }

  /**
   * Réinitialise l'état de vente
   */
  clearVenteState(): void {
    this.context.venteState = undefined;
  }
}
