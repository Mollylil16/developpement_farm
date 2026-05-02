/**
 * Service de diagnostic des pathologies porcines
 * Analyse les symptômes décrits ou les images pour identifier les maladies
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import porcineDiseasesData from '../../data/porcineDiseases.json';

export interface PorcineDisease {
  id: number;
  name: string;
  symptoms: string[];
  causes: string;
  gravity: 'Haut' | 'Moyen-Haut' | 'Moyen' | 'Bas-Moyen';
  keywords: string[];
}

export interface DiagnosticResult {
  disease: PorcineDisease | null;
  confidence: number; // 0-1
  matchedSymptoms: string[];
  matchedKeywords: string[];
  recommendation: string;
  requiresVetAlert: boolean;
  urgency: 'critique' | 'urgent' | 'normal';
  contextualQuestions?: string[]; // Questions contextuelles pour affiner le diagnostic
}

const DISEASES_STORAGE_KEY = '@porcine_diseases_data';

export class DiagnosticService {
  private diseases: PorcineDisease[] = [];

  /**
   * Initialise le service en chargeant les maladies depuis AsyncStorage ou le JSON
   */
  async initialize(): Promise<void> {
    try {
      // Essayer de charger depuis AsyncStorage
      const stored = await AsyncStorage.getItem(DISEASES_STORAGE_KEY);
      if (stored) {
        this.diseases = JSON.parse(stored);
      } else {
        // Charger depuis le JSON et sauvegarder
        this.diseases = porcineDiseasesData as PorcineDisease[];
        await AsyncStorage.setItem(DISEASES_STORAGE_KEY, JSON.stringify(this.diseases));
      }
    } catch (error) {
      console.error('[DiagnosticService] Erreur initialisation:', error);
      // Fallback sur le JSON
      this.diseases = porcineDiseasesData as PorcineDisease[];
    }
  }

  /**
   * Analyse les symptômes décrits dans un message texte
   * @param message Message de l'utilisateur décrivant les symptômes
   * @returns Résultat du diagnostic avec maladie probable, confiance et recommandations
   */
  analyzeSymptoms(message: string): DiagnosticResult {
    if (!this.diseases.length) {
      // Si pas encore initialisé, utiliser le JSON directement
      this.diseases = porcineDiseasesData as PorcineDisease[];
    }

    // Normaliser le message (minuscules, supprimer accents)
    const normalized = this.normalizeText(message.toLowerCase());
    
    // Créer un dictionnaire de variantes de mots pour un matching plus flexible
    const wordVariants: Record<string, string[]> = {
      'gratte': ['gratte', 'grattait', 'gratter', 'gratte', 'se gratte', 'se grattait', 'grattage'],
      'plaques': ['plaques', 'plaque', 'taches', 'tache', 'lesions', 'lesion', 'boutons', 'bouton'],
      'rouge': ['rouge', 'rouges', 'rougeur', 'rougeurs', 'rougeatre'],
      'fièvre': ['fievre', 'fievre', 'temperature', 'chaud'],
      'diarrhée': ['diarrhee', 'diarrhee', 'caca', 'selles'],
      'vomir': ['vomir', 'vomit', 'vomissement', 'vomissements'],
      'tousse': ['tousse', 'toux', 'tousser', 'toussant'],
      'boite': ['boite', 'boiter', 'boitait', 'boiterie', 'boitement'],
    };

    // Fonction pour trouver les variantes d'un mot
    const findVariants = (word: string): string[] => {
      const normalizedWord = this.normalizeText(word.toLowerCase());
      for (const [key, variants] of Object.entries(wordVariants)) {
        if (variants.includes(normalizedWord) || normalizedWord.includes(key)) {
          return variants;
        }
      }
      return [normalizedWord];
    };

    // Scores pour chaque maladie
    const diseaseScores: Array<{ disease: PorcineDisease; score: number; matchedKeywords: string[]; matchedSymptoms: string[] }> = [];

    for (const disease of this.diseases) {
      let score = 0;
      const matchedKeywords: string[] = [];
      const matchedSymptoms: string[] = [];

      // Vérifier les mots-clés (poids 2) - matching plus flexible
      for (const keyword of disease.keywords) {
        const normalizedKeyword = this.normalizeText(keyword);
        
        // Matching exact
        if (normalized.includes(normalizedKeyword)) {
          score += 2;
          matchedKeywords.push(keyword);
          continue;
        }
        
        // Matching par mots individuels avec variantes
        const keywordWords = normalizedKeyword.split(' ');
        let allWordsMatch = true;
        for (const word of keywordWords) {
          if (word.length > 2) {
            const variants = findVariants(word);
            const wordMatches = variants.some(variant => normalized.includes(variant));
            if (!wordMatches) {
              allWordsMatch = false;
              break;
            }
          }
        }
        if (allWordsMatch && keywordWords.length > 0) {
          score += 2;
          matchedKeywords.push(keyword);
        }
      }

      // Vérifier les symptômes (poids 3) - matching amélioré
      for (const symptom of disease.symptoms) {
        const normalizedSymptom = this.normalizeText(symptom);
        
        // Matching exact
        if (normalized.includes(normalizedSymptom)) {
          score += 3;
          matchedSymptoms.push(symptom);
          continue;
        }
        
        // Matching par mots avec variantes
        const symptomWords = normalizedSymptom.split(' ').filter(w => w.length > 2);
        let matchedWords = 0;
        for (const word of symptomWords) {
          const variants = findVariants(word);
          if (variants.some(variant => normalized.includes(variant))) {
            matchedWords++;
          }
        }
        // Si au moins 50% des mots matchent, considérer comme match
        if (matchedWords >= Math.ceil(symptomWords.length * 0.5)) {
          score += 3;
          matchedSymptoms.push(symptom);
        }
      }

      if (score > 0) {
        diseaseScores.push({
          disease,
          score,
          matchedKeywords,
          matchedSymptoms,
        });
      }
    }

    // Trier par score décroissant
    diseaseScores.sort((a, b) => b.score - a.score);

    // Si aucun match, générer des questions contextuelles basées sur les mots détectés
    if (diseaseScores.length === 0) {
      const contextualQuestions = this.generateContextualQuestions(normalized, message);
      return {
        disease: null,
        confidence: 0,
        matchedSymptoms: [],
        matchedKeywords: [],
        recommendation: 'Je n\'ai pas reconnu de symptômes spécifiques avec les informations fournies.',
        requiresVetAlert: false,
        urgency: 'normal',
        contextualQuestions,
      };
    }

    // Prendre la meilleure correspondance
    const bestMatch = diseaseScores[0];
    
    // Calcul de confiance amélioré : basé sur le score réel
    // Score minimum = 2 (un mot-clé) ou 3 (un symptôme)
    // Score maximum théorique = (nombre_keywords * 2) + (nombre_symptoms * 3)
    // Mais on utilise un calcul plus simple basé sur le nombre de matches
    const minScoreForMatch = 2; // Au moins un mot-clé
    const maxReasonableScore = 10; // Score raisonnable pour une bonne correspondance
    
    // Confiance basée sur le score : 
    // - Score 2-3 = confiance 0.3-0.4 (faible mais acceptable)
    // - Score 4-6 = confiance 0.5-0.7 (moyenne)
    // - Score 7+ = confiance 0.7+ (bonne)
    const confidence = Math.min(1, Math.max(0.3, bestMatch.score / maxReasonableScore));
    
    // Log pour déboguer
    console.log('[DiagnosticService] Analyse:', {
      message: message.substring(0, 50),
      bestMatch: bestMatch.disease.name,
      score: bestMatch.score,
      confidence,
      matchedKeywords: bestMatch.matchedKeywords,
      matchedSymptoms: bestMatch.matchedSymptoms,
    });

    // Si la confiance est faible (< 0.5), générer des questions contextuelles
    let contextualQuestions: string[] | undefined = undefined;
    if (confidence < 0.5) {
      contextualQuestions = this.generateContextualQuestions(normalized, message, bestMatch);
    }

    // Déterminer l'urgence et si alerte vétérinaire nécessaire
    const gravity = bestMatch.disease.gravity;
    const requiresVetAlert = gravity === 'Haut' || gravity === 'Moyen-Haut' || confidence > 0.6;
    const urgency: 'critique' | 'urgent' | 'normal' = 
      gravity === 'Haut' ? 'critique' :
      gravity === 'Moyen-Haut' || confidence > 0.7 ? 'urgent' :
      'normal';

    // Générer la recommandation
    let recommendation = '';
    if (confidence > 0.7) {
      recommendation = `Au vu des symptômes décrits, cela ressemble fortement à la **${bestMatch.disease.name}**. `;
    } else if (confidence > 0.4) {
      recommendation = `Les symptômes décrits pourraient correspondre à la **${bestMatch.disease.name}**. `;
    } else {
      recommendation = `Il est possible que ce soit la **${bestMatch.disease.name}**, mais la correspondance est faible. `;
    }

    // Ajouter les actions recommandées selon la gravité
    if (gravity === 'Haut') {
      recommendation += `⚠️ **URGENCE CRITIQUE** : Isole l'animal immédiatement et contacte un vétérinaire en urgence ! Cette maladie est très grave. `;
    } else if (gravity === 'Moyen-Haut') {
      recommendation += `⚠️ **URGENT** : Isole l'animal et contacte un vétérinaire rapidement. `;
    } else {
      recommendation += `Isole l'animal et surveille-le de près. Consulte un vétérinaire si les symptômes s'aggravent. `;
    }

    recommendation += `\n\n**Causes possibles** : ${bestMatch.disease.causes}\n`;
    recommendation += `**Symptômes correspondants** : ${bestMatch.matchedSymptoms.join(', ')}\n\n`;
    recommendation += `⚠️ **IMPORTANT** : Ceci est une indication basée sur les symptômes décrits. Seul un vétérinaire peut confirmer le diagnostic !`;

    return {
      disease: bestMatch.disease,
      confidence,
      matchedSymptoms: bestMatch.matchedSymptoms,
      matchedKeywords: bestMatch.matchedKeywords,
      recommendation,
      requiresVetAlert,
      urgency,
      contextualQuestions,
    };
  }

  /**
   * Génère des questions contextuelles basées sur les mots-clés détectés
   * pour affiner le diagnostic
   */
  private generateContextualQuestions(
    normalizedMessage: string,
    originalMessage: string,
    bestMatch?: { disease: PorcineDisease; matchedKeywords: string[]; matchedSymptoms: string[] }
  ): string[] {
    const questions: string[] = [];
    
    // Analyser les mots-clés présents dans le message
    const hasPlaques = normalizedMessage.includes('plaque') || normalizedMessage.includes('tache') || normalizedMessage.includes('lesion');
    const hasGratte = normalizedMessage.includes('gratte') || normalizedMessage.includes('gratt') || normalizedMessage.includes('demange');
    const hasRouge = normalizedMessage.includes('rouge') || normalizedMessage.includes('rougeur');
    const hasFievre = normalizedMessage.includes('fievre') || normalizedMessage.includes('chaud') || normalizedMessage.includes('temperature');
    const hasDiarrhee = normalizedMessage.includes('diarrhee') || normalizedMessage.includes('caca') || normalizedMessage.includes('selles');
    const hasTousse = normalizedMessage.includes('tousse') || normalizedMessage.includes('toux');
    const hasVomir = normalizedMessage.includes('vomir') || normalizedMessage.includes('vomit');
    const hasBoite = normalizedMessage.includes('boite') || normalizedMessage.includes('boiter');
    const hasSaigne = normalizedMessage.includes('saigne') || normalizedMessage.includes('sang') || normalizedMessage.includes('hemorragie');

    // Si on a un match partiel, poser des questions spécifiques pour cette maladie
    if (bestMatch) {
      const disease = bestMatch.disease;
      const matchedKeywords = bestMatch.matchedKeywords;
      
      // Questions spécifiques selon la maladie potentielle
      if (disease.name.includes('Erysipélas')) {
        if (!hasRouge && !matchedKeywords.includes('rouge')) {
          questions.push('De quelle couleur sont les plaques ? (rouge, rose, violette)');
        }
        if (!hasGratte && !matchedKeywords.includes('gratte')) {
          questions.push('L\'animal se gratte-t-il ou présente-t-il des démangeaisons ?');
        }
        if (!hasFievre) {
          questions.push('L\'animal a-t-il de la fièvre ?');
        }
        if (!matchedKeywords.includes('losange')) {
          questions.push('Les plaques ont-elles une forme particulière ? (losange, ronde, irrégulière)');
        }
      } else if (disease.name.includes('Aujeszky')) {
        if (!hasGratte) {
          questions.push('L\'animal se gratte-t-il intensément ?');
        }
        if (!hasFievre) {
          questions.push('Y a-t-il de la fièvre ?');
        }
        questions.push('Y a-t-il des signes nerveux ? (convulsions, tremblements, salivation excessive)');
      } else if (disease.name.includes('Dysenterie') || disease.name.includes('Diarrhée')) {
        if (!hasSaigne) {
          questions.push('Y a-t-il du sang dans les selles ?');
        }
        if (!hasFievre) {
          questions.push('L\'animal a-t-il de la fièvre ?');
        }
        questions.push('Combien d\'animaux sont affectés ?');
        questions.push('Depuis combien de temps observez-vous ces symptômes ?');
      } else if (disease.name.includes('Grippe') || disease.name.includes('Pneumonie')) {
        if (!hasTousse) {
          questions.push('L\'animal tousse-t-il ?');
        }
        if (!hasFievre) {
          questions.push('Y a-t-il de la fièvre ?');
        }
        questions.push('La respiration est-elle difficile ou laborieuse ?');
        questions.push('Combien d\'animaux sont affectés ?');
      }
    } else {
      // Pas de match, questions générales basées sur ce qui a été mentionné
      if (hasPlaques) {
        questions.push('De quelle couleur sont les plaques ou lésions ? (rouge, rose, violette, noire)');
        questions.push('Quelle est leur forme ? (losange, ronde, irrégulière)');
        if (!hasGratte) {
          questions.push('L\'animal se gratte-t-il ?');
        }
      }
      
      if (hasGratte && !hasPlaques) {
        questions.push('Y a-t-il des lésions visibles sur la peau ? (plaques, taches, boutons)');
        questions.push('L\'animal a-t-il de la fièvre ?');
        questions.push('Y a-t-il d\'autres signes ? (convulsions, tremblements, salivation)');
      }
      
      if (hasDiarrhee) {
        questions.push('Y a-t-il du sang dans les selles ?');
        questions.push('Les selles sont-elles liquides ou contiennent-elles du mucus ?');
        questions.push('Combien d\'animaux sont affectés ?');
      }
      
      if (hasTousse) {
        questions.push('Y a-t-il de la fièvre ?');
        questions.push('La respiration est-elle difficile ?');
        questions.push('Combien d\'animaux sont affectés ?');
      }
      
      // Si rien de spécifique n'a été mentionné
      if (questions.length === 0) {
        questions.push('Pouvez-vous décrire les symptômes observés ? (lésions, comportement, température)');
        questions.push('Depuis combien de temps observez-vous ces symptômes ?');
        questions.push('Combien d\'animaux sont affectés ?');
      }
    }

    // Limiter à 3-4 questions pour ne pas submerger l'utilisateur
    return questions.slice(0, 4);
  }

  /**
   * Analyse une image pour détecter des lésions ou symptômes visuels
   * @param imageUri URI de l'image à analyser
   * @param apiKey Clé API pour Google Vision (optionnel)
   * @returns Résultat du diagnostic basé sur l'analyse d'image
   */
  async analyzeImage(imageUri: string, apiKey?: string): Promise<DiagnosticResult> {
    // Pour l'instant, on utilise une analyse basique
    // TODO: Intégrer avec Google Vision API ou autre service d'analyse d'image
    
    if (!apiKey) {
      // Fallback : retourner un message générique
      return {
        disease: null,
        confidence: 0,
        matchedSymptoms: [],
        matchedKeywords: [],
        recommendation: 'Je vois que tu as partagé une photo. Pour une analyse précise, j\'aurais besoin d\'une clé API pour l\'analyse d\'images. En attendant, peux-tu décrire ce que tu vois sur la photo ? (lésions, couleur, localisation, etc.)',
        requiresVetAlert: false,
        urgency: 'normal',
      };
    }

    try {
      // TODO: Implémenter l'appel à Google Vision API
      // Pour l'instant, on retourne un message indiquant qu'il faut décrire
      return {
        disease: null,
        confidence: 0,
        matchedSymptoms: [],
        matchedKeywords: [],
        recommendation: 'Analyse d\'image en cours... En attendant, peux-tu décrire ce que tu observes sur la photo ? (plaques rouges, lésions, diarrhée visible, etc.)',
        requiresVetAlert: false,
        urgency: 'normal',
      };
    } catch (error) {
      console.error('[DiagnosticService] Erreur analyse image:', error);
      return {
        disease: null,
        confidence: 0,
        matchedSymptoms: [],
        matchedKeywords: [],
        recommendation: 'Erreur lors de l\'analyse de l\'image. Peux-tu décrire ce que tu vois ?',
        requiresVetAlert: false,
        urgency: 'normal',
      };
    }
  }

  /**
   * Normalise un texte (supprime accents, caractères spéciaux)
   */
  private normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
      .replace(/[^\w\s]/g, ' ') // Remplacer caractères spéciaux par espaces
      .replace(/\s+/g, ' ') // Normaliser espaces
      .trim();
  }

  /**
   * Obtient toutes les maladies
   */
  getAllDiseases(): PorcineDisease[] {
    return this.diseases;
  }

  /**
   * Obtient une maladie par ID
   */
  getDiseaseById(id: number): PorcineDisease | undefined {
    return this.diseases.find(d => d.id === id);
  }
}

