/**
 * Détecteur d'intentions pour améliorer la reconnaissance des requêtes utilisateur
 * Identifie les actions à exécuter à partir du texte de l'utilisateur
 */

import { AgentActionType } from '../../types/chatAgent';

export interface DetectedIntent {
  action: AgentActionType;
  confidence: number;
  params: Record<string, any>;
}

export class IntentDetector {
  /**
   * Détecte l'intention de l'utilisateur à partir de son message
   * Mode autonome : détection plus agressive et confiance plus élevée
   */
  static detectIntent(message: string): DetectedIntent | null {
    const lowerMessage = message.toLowerCase().trim();
    
    // Normaliser le message (supprimer accents, caractères spéciaux)
    const normalized = this.normalizeText(lowerMessage);

    // Détecter les requêtes d'information (priorité haute)
    const infoIntent = this.detectInfoRequest(normalized, lowerMessage);
    if (infoIntent) {
      // Augmenter la confiance pour les requêtes d'information
      infoIntent.confidence = Math.min(0.95, infoIntent.confidence + 0.1);
      return infoIntent;
    }

    // Détecter les enregistrements (priorité haute aussi)
    const createIntent = this.detectCreateRequest(normalized, lowerMessage);
    if (createIntent) {
      // Augmenter la confiance pour les enregistrements clairs
      createIntent.confidence = Math.min(0.95, createIntent.confidence + 0.1);
      return createIntent;
    }

    // Détecter les recherches
    const searchIntent = this.detectSearchRequest(normalized, lowerMessage);
    if (searchIntent) return searchIntent;

    return null;
  }

  /**
   * Normalise le texte pour améliorer la détection
   */
  private static normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^\w\s]/g, ' ') // Remplacer caractères spéciaux par espaces
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim();
  }

  /**
   * Détecte les requêtes d'information
   */
  private static detectInfoRequest(normalized: string, original: string): DetectedIntent | null {
    // Statistiques / Bilan
    const statsKeywords = [
      'statistique', 'statistiques', 'bilan', 'bilans',
      'combien de porc', 'nombre de porc', 'nombre porc',
      'combien porc', 'nombre porcs', 'combien porcs',
      'porc actif', 'porcs actifs', 'actif', 'actifs',
      'cheptel', 'elevage', 'elevages',
      'resume', 'resumes', 'apercu', 'apercus',
      'donnees', 'donnee', 'data', 'chiffres',
      'total', 'totaux', 'compte', 'comptage',
      'combien ai je', 'ai je combien', 'j ai combien',
      'mon cheptel', 'mes animaux', 'mes porcs',
      'etat du cheptel', 'situation du cheptel',
    ];

    if (this.matchesKeywords(normalized, statsKeywords)) {
      return {
        action: 'get_statistics',
        confidence: 0.9,
        params: {},
      };
    }

    // Stocks
    const stockKeywords = [
      'stock', 'stocks', 'stock actuel', 'stocks actuels',
      'nourriture', 'aliment', 'aliments', 'alimentation',
      'provende', 'provendes', 'ration', 'rations',
      'quantite', 'quantites', 'reste', 'restes',
      'disponible', 'disponibles', 'disponibilite',
      'etat des stocks', 'statut des stocks',
      'combien de nourriture', 'combien d aliment',
      'il reste', 'il me reste', 'j ai combien de',
      'niveau de stock', 'niveaux de stock',
    ];

    if (this.matchesKeywords(normalized, stockKeywords)) {
      return {
        action: 'get_stock_status',
        confidence: 0.9,
        params: {},
      };
    }

    // Coûts / Dépenses (uniquement pour les requêtes d'information)
    // Exclure si le message contient des verbes d'action (enregistrement)
    const actionVerbs = [
      'enregistre', 'enregistrer', 'enregistres', 'enregistrez',
      'j ai depense', 'j ai achete', 'j ai paye', 'j ai payee',
      'achete', 'paye', 'payee', 'depense',
    ];
    
    const hasActionVerb = this.matchesKeywords(normalized, actionVerbs);
    
    // Si le message contient un verbe d'action, ce n'est pas une requête d'information
    if (!hasActionVerb) {
      const costKeywords = [
        'cout', 'couts', 'cout total', 'couts totaux',
        'depense totale', 'depenses totales',
        'combien j ai depense', 'j ai depense combien',
        'mes depenses', 'total depenses',
        'calculer', 'calcul', 'calcule',
        'budget', 'budgets',
        'prix', 'prix total',
        'argent depense', 'argent depenses',
        'recap', 'recapitulatif', 'bilan des depenses',
      ];

      if (this.matchesKeywords(normalized, costKeywords)) {
        return {
          action: 'calculate_costs',
          confidence: 0.85,
          params: {},
        };
      }
    }

    // Rappels
    const reminderKeywords = [
      'rappel', 'rappels', 'rappel a venir', 'rappels a venir',
      'a faire', 'a faire aujourd hui', 'taches', 'tache',
      'programme', 'programmes', 'planifie', 'planifiee',
      'vaccination a venir', 'vaccination prevue',
      'traitement a venir', 'visite prevue',
      'prochaine', 'prochaines', 'prochain',
      'calendrier', 'agenda',
    ];

    if (this.matchesKeywords(normalized, reminderKeywords)) {
      return {
        action: 'get_reminders',
        confidence: 0.85,
        params: {},
      };
    }

    // Analyse
    const analyzeKeywords = [
      'analyse', 'analyses', 'analyser', 'analyser mes donnees',
      'situation', 'situations', 'etat', 'etats',
      'evaluation', 'evaluations', 'diagnostic',
      'performance', 'performances', 'resultats', 'resultat',
      'evolution', 'evolutions', 'tendance', 'tendances',
      'comment va', 'comment ca va', 'ca va comment',
      'mon exploitation', 'mon elevage',
    ];

    if (this.matchesKeywords(normalized, analyzeKeywords)) {
      return {
        action: 'analyze_data',
        confidence: 0.85,
        params: {},
      };
    }

    return null;
  }

  /**
   * Détecte les requêtes de création/enregistrement
   */
  private static detectCreateRequest(normalized: string, original: string): DetectedIntent | null {
    // Vente
    if (this.matchesKeywords(normalized, [
      'j ai vendu', 'j ai venu', 'je vends', 'je vend',
      'vente', 'vendu', 'vendre', 'ventes',
      'vendre des porcs', 'vendre un porc',
    ])) {
      return {
        action: 'create_revenu',
        confidence: 0.85,
        params: this.extractVenteParams(original),
      };
    }

    // Dépense
    if (this.matchesKeywords(normalized, [
      'j ai achete', 'j ai achete', 'achete', 'achetes',
      'depense', 'depenses', 'j ai depense',
      'achat', 'achats', 'payer', 'paye', 'payee',
      'j ai paye', 'j ai payee',
    ])) {
      return {
        action: 'create_depense',
        confidence: 0.85,
        params: this.extractDepenseParams(original),
      };
    }

    // Charge fixe
    if (this.matchesKeywords(normalized, [
      'charge fixe', 'charges fixes', 'charge permanente',
      'depense mensuelle', 'depense reguliere',
      'abonnement', 'abonnements',
    ])) {
      return {
        action: 'create_charge_fixe',
        confidence: 0.8,
        params: this.extractChargeFixeParams(original),
      };
    }

    // Pesée
    if (this.matchesKeywords(normalized, [
      'pesee', 'pesees', 'peser', 'peser un porc',
      'poids', 'peser le porc', 'enregistrer le poids',
      'ajouter une pesee', 'nouvelle pesee',
    ])) {
      return {
        action: 'create_pesee',
        confidence: 0.85,
        params: this.extractPeseeParams(original),
      };
    }

    // Ingrédient
    if (this.matchesKeywords(normalized, [
      'ingredient', 'ingredients', 'creer un ingredient',
      'nouvel ingredient', 'ajouter un ingredient',
    ])) {
      return {
        action: 'create_ingredient',
        confidence: 0.8,
        params: this.extractIngredientParams(original),
      };
    }

    // Rappel personnalisé (doit être détecté AVANT visite vétérinaire)
    if (this.matchesKeywords(normalized, [
      'rappelle moi', 'rappelle moi de', 'rappelle moi d',
      'rappelle', 'rappel moi', 'rappel moi de', 'rappel moi d',
      'me rappeler', 'me rappelle', 'me rappelles',
      'souviens toi', 'souviens moi', 'n oublie pas',
      'n oublie pas de', 'n oublie pas d',
    ])) {
      return {
        action: 'create_planification',
        confidence: 0.9,
        params: this.extractRappelParams(original),
      };
    }

    // Vaccination
    if (this.matchesKeywords(normalized, [
      'vaccination', 'vaccinations', 'vaccine', 'vaccines',
      'vacciner', 'j ai vaccine', 'vaccine',
    ])) {
      return {
        action: 'create_vaccination',
        confidence: 0.8,
        params: {},
      };
    }

    // Visite vétérinaire (uniquement si ce n'est pas un rappel)
    if (this.matchesKeywords(normalized, [
      'visite veterinaire', 'visite veterinaire',
      'veterinaire', 'veto', 'vet',
      'consultation', 'consultations',
    ]) && !normalized.includes('rappelle') && !normalized.includes('rappel')) {
      return {
        action: 'create_visite_veterinaire',
        confidence: 0.8,
        params: {},
      };
    }

    // Traitement
    if (this.matchesKeywords(normalized, [
      'traitement', 'traitements', 'medicament', 'medicaments',
      'soin', 'soins', 'traiter', 'traite',
    ])) {
      return {
        action: 'create_traitement',
        confidence: 0.8,
        params: {},
      };
    }

    // Maladie
    if (this.matchesKeywords(normalized, [
      'maladie', 'maladies', 'malade', 'malades',
      'symptome', 'symptomes', 'tousse', 'tousse',
      'fievre', 'diarrhee', 'probleme de sante',
    ])) {
      return {
        action: 'create_maladie',
        confidence: 0.8,
        params: {},
      };
    }

    return null;
  }

  /**
   * Détecte les requêtes de recherche
   */
  private static detectSearchRequest(normalized: string, original: string): DetectedIntent | null {
    const searchKeywords = [
      'chercher', 'cherche', 'trouver', 'trouve',
      'recherche', 'rechercher', 'recherches',
      'ou est', 'ou sont', 'localiser', 'localise',
      'montre moi', 'montre', 'affiche', 'afficher',
    ];

    if (this.matchesKeywords(normalized, searchKeywords)) {
      // Extraire le terme de recherche
      const searchTerm = this.extractSearchTerm(original, searchKeywords);
      return {
        action: 'search_animal',
        confidence: 0.75,
        params: { search: searchTerm },
      };
    }

    // Recherche de lot
    if (normalized.includes('lot') && this.matchesKeywords(normalized, ['chercher', 'trouver', 'recherche'])) {
      const searchTerm = this.extractSearchTerm(original, ['lot']);
      return {
        action: 'search_lot',
        confidence: 0.75,
        params: { search: searchTerm },
      };
    }

    return null;
  }

  /**
   * Vérifie si le texte contient au moins un des mots-clés
   */
  private static matchesKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => {
      // Recherche exacte du mot-clé
      const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i');
      return regex.test(text);
    });
  }

  /**
   * Extrait les paramètres d'une vente
   */
  private static extractVenteParams(text: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extraire le nombre (plusieurs patterns)
    const nombreMatch = text.match(/(\d+)\s*(?:porc|porcs|tete|tetes|sujet|sujets)/i);
    if (nombreMatch) {
      params.nombre = parseInt(nombreMatch[1]);
    }

    // Extraire le poids si mentionné (AVANT le montant pour l'exclure)
    const poidsMatch = text.match(/(\d+[.,]?\d*)\s*(?:kg|kilogramme|kilo)/i);
    if (poidsMatch) {
      params.poids_kg = parseFloat(poidsMatch[1].replace(',', '.'));
    }

    // Extraire le montant (plusieurs patterns, en PRIORITÉ après "à", "pour", "montant", "prix")
    // Pattern 1: Montant après "à" ou "pour" (le plus fiable)
    let montantMatch = text.match(/(?:a|pour|de|montant|prix|vendu a|vendu pour|au prix de|pour la somme de)[:\s]+(\d[\d\s,]+)(?:\s*(?:f\s*c\s*f\s*a|fcfa|francs?|f\s*))?/i);
    
    if (!montantMatch) {
      // Pattern 2: "800 000 FCFA", "800000 FCFA" (mais pas si c'est un poids ou une quantité)
      montantMatch = text.match(/(\d[\d\s,]{3,})\s*(?:f\s*c\s*f\s*a|f\s*c\s*f\s*a|fcfa|f\s*cfa|francs?|f\s*)/i);
    }
    
    if (!montantMatch) {
      // Pattern 3: Chercher le plus grand nombre qui n'est pas une quantité ou un poids
      // Exclure les nombres de 1-2 chiffres (probablement des quantités)
      // Exclure les nombres suivis de "kg", "porc", etc.
      const allNumbers = text.match(/\b(\d[\d\s,]{3,})\b/g);
      if (allNumbers) {
        // Prendre le plus grand nombre qui n'est pas une quantité ou un poids
        const validNumbers = allNumbers
          .map(n => parseInt(n.replace(/[\s,]/g, '')))
          .filter(n => n > 100); // Ignorer les petits montants (probablement des quantités)
        
        if (validNumbers.length > 0) {
          // Prendre le plus grand nombre (probablement le montant)
          const maxNumber = Math.max(...validNumbers);
          // Vérifier qu'il n'est pas suivi de "kg", "porc", etc.
          const numberIndex = text.indexOf(maxNumber.toString());
          const afterNumber = text.substring(numberIndex + maxNumber.toString().length, numberIndex + maxNumber.toString().length + 10);
          if (!afterNumber.match(/\s*(?:kg|kilogramme|kilo|porc|porcs|tete|tetes)/i)) {
            params.montant = maxNumber;
            montantMatch = [maxNumber.toString()];
          }
        }
      }
    }
    
    if (montantMatch && montantMatch[1]) {
      const montantStr = montantMatch[1].replace(/[\s,]/g, '');
      const montant = parseInt(montantStr);
      // Valider que ce n'est pas une quantité ou un poids
      if (!isNaN(montant) && montant > 0 && montant !== params.nombre && montant !== params.poids_kg) {
        params.montant = montant;
      }
    }

    // Extraire l'acheteur (plusieurs patterns)
    const acheteurPatterns = [
      /(?:a|pour|chez|vendu a|vendu pour)\s+([a-z\s]+?)(?:\s+(?:pour|a|le|la|\d)|$)/i,
      /acheteur[:\s]+([a-z\s]+?)(?:\s|$)/i,
      /client[:\s]+([a-z\s]+?)(?:\s|$)/i,
    ];
    
    for (const pattern of acheteurPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && !match[1].match(/\d/) && match[1].trim().length > 0) {
        params.acheteur = match[1].trim();
        break;
      }
    }

    return params;
  }

  /**
   * Extrait les paramètres d'une dépense
   */
  private static extractDepenseParams(text: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extraire le montant (plusieurs patterns, en PRIORITÉ après "de", "pour", "à", "montant")
    // Pattern 1: Montant après "de", "pour", "à", "montant", "prix", "coût" (le plus fiable)
    let montantMatch = text.match(/(?:de|pour|a|montant|prix|cout|depense|achete|paye|payee)[:\s]+(\d[\d\s,]+)(?:\s*(?:f\s*c\s*f\s*a|fcfa|francs?|f\s*))?/i);
    
    if (!montantMatch) {
      // Pattern 2: "50 000 FCFA", "50000 FCFA" (mais pas si c'est une quantité)
      montantMatch = text.match(/(\d[\d\s,]{3,})\s*(?:f\s*c\s*f\s*a|f\s*c\s*f\s*a|fcfa|f\s*cfa|francs?|f\s*)/i);
    }
    
    if (!montantMatch) {
      // Pattern 3: Calcul si quantité × prix unitaire mentionnés
      const calculMatch = text.match(/(\d+)\s*(?:x|\*|fois|par)\s*(\d[\d\s,]+)/i);
      if (calculMatch) {
        const qte = parseInt(calculMatch[1]);
        const prix = parseInt(calculMatch[2].replace(/[\s,]/g, ''));
        params.montant = qte * prix;
      } else {
        // Pattern 4: Chercher le plus grand nombre qui n'est pas une quantité
        const allNumbers = text.match(/\b(\d[\d\s,]{3,})\b/g);
        if (allNumbers) {
          const validNumbers = allNumbers
            .map(n => parseInt(n.replace(/[\s,]/g, '')))
            .filter(n => n > 100); // Ignorer les petits montants
          
          if (validNumbers.length > 0) {
            params.montant = Math.max(...validNumbers);
          }
        }
      }
    } else {
      const montantStr = montantMatch[1].replace(/[\s,]/g, '');
      const montant = parseInt(montantStr);
      if (!isNaN(montant) && montant > 0) {
        params.montant = montant;
      }
    }

    // Détecter la catégorie (plus de patterns)
    if (text.match(/aliment|provende|nourriture|ration|sacs?|mais|soja/i)) {
      params.categorie = 'alimentation';
    } else if (text.match(/medicament|vaccin|soin|antibiotique/i)) {
      params.categorie = 'medicaments';
    } else if (text.match(/veterinaire|veto|consultation|visite vet/i)) {
      params.categorie = 'veterinaire';
    } else if (text.match(/entretien|reparation|maintenance/i)) {
      params.categorie = 'entretien';
    } else if (text.match(/equipement|materiel|outil/i)) {
      params.categorie = 'equipements';
    }

    // Extraire la description/libellé
    const descMatch = text.match(/(?:pour|de|depense|achat)\s+(.+?)(?:\s+\d|$)/i);
    if (descMatch && !descMatch[1].match(/^\d/)) {
      params.description = descMatch[1].trim();
    }

    return params;
  }

  /**
   * Extrait le terme de recherche
   */
  private static extractSearchTerm(text: string, keywords: string[]): string {
    // Supprimer les mots-clés de recherche
    let cleaned = text.toLowerCase();
    keywords.forEach(keyword => {
      cleaned = cleaned.replace(new RegExp(keyword, 'gi'), '');
    });
    
    // Supprimer les mots vides
    const stopWords = ['un', 'une', 'le', 'la', 'les', 'de', 'du', 'des', 'mon', 'ma', 'mes'];
    stopWords.forEach(word => {
      cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    });

    return cleaned.trim();
  }

  /**
   * Extrait les paramètres d'une charge fixe
   */
  private static extractChargeFixeParams(text: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extraire le montant
    const montantMatch = text.match(/(\d[\d\s]+)\s*(?:f\s*c\s*f\s*a|f\s*c\s*f\s*a|fcfa|f\s*cfa)?/i);
    if (montantMatch) {
      params.montant = parseInt(montantMatch[1].replace(/\s/g, ''));
    }

    // Extraire le libellé (texte avant le montant)
    const libelleMatch = text.match(/(?:charge fixe|charge|depense)\s+(.+?)(?:\s+\d|$)/i);
    if (libelleMatch) {
      params.libelle = libelleMatch[1].trim();
    }

    // Détecter la fréquence
    if (text.match(/mensuel|mois/i)) {
      params.frequence = 'mensuel';
    } else if (text.match(/trimestriel|trimestre/i)) {
      params.frequence = 'trimestriel';
    } else if (text.match(/annuel|an|annee/i)) {
      params.frequence = 'annuel';
    }

    return params;
  }

  /**
   * Extrait les paramètres d'une pesée
   */
  private static extractPeseeParams(text: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extraire le poids
    const poidsMatch = text.match(/(\d+[.,]?\d*)\s*(?:kg|kilogramme|kilo)/i);
    if (poidsMatch) {
      params.poids_kg = parseFloat(poidsMatch[1].replace(',', '.'));
    }

    // Extraire le code de l'animal
    const codeMatch = text.match(/(?:porc|animal)\s+([A-Z0-9]+)/i);
    if (codeMatch) {
      params.animal_code = codeMatch[1];
    }

    // Extraire l'ID de l'animal si mentionné
    const idMatch = text.match(/animal[_\s]?id[:\s]+([a-z0-9-]+)/i);
    if (idMatch) {
      params.animal_id = idMatch[1];
    }

    return params;
  }

  /**
   * Extrait les paramètres d'un ingrédient
   */
  private static extractIngredientParams(text: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extraire le nom (texte après "ingrédient" ou "créer")
    const nomMatch = text.match(/(?:ingredient|creer|ajouter)\s+(.+?)(?:\s+\d|$)/i);
    if (nomMatch) {
      params.nom = nomMatch[1].trim();
    }

    // Extraire le prix
    const prixMatch = text.match(/(\d[\d\s]+)\s*(?:f\s*c\s*f\s*a|fcfa)?\s*(?:par|\/)?\s*(kg|sac|g|tonne)/i);
    if (prixMatch) {
      params.prix_unitaire = parseInt(prixMatch[1].replace(/\s/g, ''));
      params.unite = prixMatch[2].toLowerCase();
    }

    return params;
  }

  /**
   * Extrait les paramètres d'un rappel personnalisé
   */
  private static extractRappelParams(text: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extraire le titre/description du rappel (après "rappelle-moi de/d'")
    const rappelMatch = text.match(/(?:rappelle|rappel|souviens|oublie).*?(?:de|d'|de me|d)\s+(.+?)(?:\s+(?:demain|aujourd'hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d)|$)/i);
    if (rappelMatch && rappelMatch[1]) {
      params.titre = rappelMatch[1].trim();
    } else {
      // Fallback : extraire tout ce qui suit "rappelle-moi"
      const fallbackMatch = text.match(/(?:rappelle|rappel|souviens|oublie).*?(?:de|d'|de me|d)\s+(.+)/i);
      if (fallbackMatch && fallbackMatch[1]) {
        params.titre = fallbackMatch[1].trim();
      }
    }

    // Extraire la date
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    if (text.match(/demain/i)) {
      const demain = new Date(aujourdhui);
      demain.setDate(demain.getDate() + 1);
      params.date_prevue = demain.toISOString().split('T')[0];
    } else if (text.match(/aujourd'hui|aujourd hui/i)) {
      params.date_prevue = aujourdhui.toISOString().split('T')[0];
    } else {
      // Par défaut, demain si pas de date spécifiée
      const demain = new Date(aujourdhui);
      demain.setDate(demain.getDate() + 1);
      params.date_prevue = demain.toISOString().split('T')[0];
    }

    // Déterminer le type selon le contenu
    if (text.match(/veterinaire|veto|vet/i)) {
      params.type = 'veterinaire';
    } else {
      params.type = 'autre';
    }

    return params;
  }
}

