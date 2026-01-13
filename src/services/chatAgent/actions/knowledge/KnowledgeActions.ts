/**
 * Actions pour les questions de formation et connaissances
 * V2.0 - Utilise l'API backend avec fallback sur base statique
 */

import { AgentActionResult, AgentContext } from '../../../../types/chatAgent';
import { KnowledgeBaseAPI, SearchResult } from '../../knowledge/KnowledgeBaseAPI';
import { 
  TRAINING_KNOWLEDGE_BASE, 
  searchKnowledge, 
  KnowledgeTopic 
} from '../../knowledge/TrainingKnowledgeBase';
import { logger } from '../../../../utils/logger';

interface KnowledgeParams {
  topic?: string;
  question?: string;
  userMessage?: string;
}

export class KnowledgeActions {
  /**
   * Répond à une question sur l'élevage porcin
   * Utilise l'API backend en priorité, avec fallback sur la base statique
   */
  static async answerKnowledgeQuestion(
    params: KnowledgeParams,
    context: AgentContext
  ): Promise<AgentActionResult> {
    const question = params.question || params.userMessage || '';
    const topic = params.topic;
    
    logger.info('[KnowledgeActions] Question reçue:', { topic, question });
    
    try {
      // Stratégie 1: Essayer l'API backend
      const apiResults = await KnowledgeBaseAPI.search(question, {
        category: topic,
        projetId: context.projetId,
        limit: 3,
      });
      
      if (apiResults && apiResults.length > 0) {
        const bestMatch = apiResults[0];
        const relatedTopics = apiResults.slice(1).map(r => r.title);
        
        // Envoyer un feedback positif si pertinent (fire-and-forget)
        if (bestMatch.relevance_score > 5) {
          KnowledgeBaseAPI.sendFeedback(
            bestMatch.id,
            context.projetId,
            'helpful',
            question
          );
        }
        
        return {
          success: true,
          message: this.formatAPIResponse(bestMatch, question, relatedTopics),
          data: {
            source: 'api',
            topic: bestMatch.id,
            title: bestMatch.title,
            category: bestMatch.category,
            relevanceScore: bestMatch.relevance_score,
            relatedTopics,
          },
        };
      }
      
      // Stratégie 2: Fallback sur la base statique locale
      logger.info('[KnowledgeActions] Fallback sur base statique');
      return this.searchLocalKnowledge(topic, question);
      
    } catch (error) {
      // En cas d'erreur API, utiliser la base statique
      logger.warn('[KnowledgeActions] Erreur API, fallback sur base statique:', error);
      
      // Log détaillé de l'erreur
      if (error instanceof Error) {
        logger.error(`[KnowledgeActions] Type: ${error.constructor.name}, Message: ${error.message}`);
        if (error.stack) {
          logger.error(`[KnowledgeActions] Stack: ${error.stack.substring(0, 300)}`);
        }
      } else {
        logger.error(`[KnowledgeActions] Erreur non-Error: ${JSON.stringify(error)}`);
      }
      
      try {
        return this.searchLocalKnowledge(topic, question);
      } catch (localError) {
        logger.error('[KnowledgeActions] Erreur même avec base locale:', localError);
        return {
          success: false,
          message: "Désolé, je n'ai pas pu récupérer les informations. Peux-tu reformuler ta question ?",
          data: { error: 'Erreur lors de la recherche de connaissances' },
        };
      }
    }
  }
  
  /**
   * Recherche dans la base de connaissances locale (statique)
   */
  private static searchLocalKnowledge(topic: string | undefined, question: string): AgentActionResult {
    try {
    // Si un topic spécifique est fourni
    if (topic) {
      const topicData = TRAINING_KNOWLEDGE_BASE.find(t => t.id === topic);
      if (topicData) {
        return {
          success: true,
          message: this.formatLocalResponse(topicData, question),
          data: {
            source: 'local',
            topic: topicData.id,
            title: topicData.title,
            category: topicData.category,
          },
        };
      }
    }
    
    // Recherche sémantique
    const results = searchKnowledge(question);
    
    if (results.length === 0) {
      return {
        success: true,
        message: this.getNoResultMessage(),
        data: { searchQuery: question, resultsCount: 0, source: 'local' },
      };
    }
    
    const bestMatch = results[0];
    const additionalTopics = results.slice(1).map(t => t.title);
    
    return {
      success: true,
      message: this.formatLocalResponse(bestMatch, question, additionalTopics),
      data: {
        source: 'local',
        topic: bestMatch.id,
        title: bestMatch.title,
        category: bestMatch.category,
        relatedTopics: additionalTopics,
      },
    };
  }
  
  /**
   * Liste tous les thèmes de formation disponibles
   * Utilise l'API backend en priorité
   */
  static async listKnowledgeTopics(
    params: any,
    context: AgentContext
  ): Promise<AgentActionResult> {
    try {
      // Essayer l'API backend
      const categories = await KnowledgeBaseAPI.getCategories(context.projetId);
      
      if (categories && categories.length > 0) {
        const message = `📚 **Thèmes de formation disponibles:**\n\n` +
          categories.map((c, i) => 
            `${i + 1}. **${this.getCategoryLabel(c.category)}** (${c.count} articles)\n   → ${c.titles.slice(0, 2).join(', ')}`
          ).join('\n\n') +
          `\n\n💡 Pose-moi une question sur n'importe quel sujet!`;
        
        return {
          success: true,
          message,
          data: { source: 'api', categories },
        };
      }
    } catch (error) {
      logger.warn('[KnowledgeActions] Erreur API pour listTopics, fallback:', error);
    }
    
    // Fallback sur base locale
    const topics = TRAINING_KNOWLEDGE_BASE.map(t => ({
      id: t.id,
      title: t.title,
      keywords: t.keywords.slice(0, 3),
    }));
    
    const message = `📚 **Thèmes de formation disponibles:**\n\n` +
      topics.map((t, i) => `${i + 1}. **${t.title}** - ${t.keywords.join(', ')}`).join('\n') +
      `\n\n💡 Pose-moi une question sur n'importe quel sujet!`;
    
    return {
      success: true,
      message,
      data: { source: 'local', topics },
    };
  }
  
  /**
   * Formate la réponse depuis l'API
   */
  private static formatAPIResponse(
    result: SearchResult, 
    question: string,
    relatedTopics?: string[]
  ): string {
    const questionLower = question.toLowerCase();
    
    // Réponses spécifiques pour des questions directes
    if (questionLower.includes('naisseur') && !questionLower.includes('engraisseur') && !questionLower.includes('cycle complet')) {
      return this.getNaisseurExplanation();
    }
    
    if (questionLower.includes('engraisseur') && !questionLower.includes('naisseur') && !questionLower.includes('cycle complet')) {
      return this.getEngraisseurExplanation();
    }
    
    const intros = [
      `Ah, bonne question! 📚`,
      `Je vais t'expliquer ça! 🎓`,
      `Voici ce que tu dois savoir: 📖`,
      `Excellente question! 💡`,
      `C'est important de comprendre ça! 🐷`,
    ];
    const intro = intros[Math.floor(Math.random() * intros.length)];
    
    let response = `${intro}\n\n**${result.title}**\n\n`;
    
    // Utiliser le résumé si disponible, sinon le contenu complet
    response += result.summary || result.content;
    
    if (relatedTopics && relatedTopics.length > 0) {
      response += `\n\n---\n📌 **Sujets connexes:** ${relatedTopics.join(', ')}`;
      response += `\n_Demande-moi si tu veux en savoir plus!_`;
    }
    
    response += this.getCategoryTip(result.category);
    
    return response;
  }
  
  /**
   * Formate la réponse depuis la base locale
   */
  private static formatLocalResponse(
    topic: KnowledgeTopic, 
    question: string,
    relatedTopics?: string[]
  ): string {
    const questionLower = question.toLowerCase();
    
    // Réponses spécifiques pour des questions directes
    if (questionLower.includes('naisseur') && !questionLower.includes('engraisseur') && !questionLower.includes('cycle complet')) {
      return this.getNaisseurExplanation();
    }
    
    if (questionLower.includes('engraisseur') && !questionLower.includes('naisseur') && !questionLower.includes('cycle complet')) {
      return this.getEngraisseurExplanation();
    }
    
    const intros = [
      `Ah, bonne question! 📚`,
      `Je vais t'expliquer ça! 🎓`,
      `Voici ce que tu dois savoir: 📖`,
      `Excellente question! 💡`,
      `C'est important de comprendre ça! 🐷`,
    ];
    const intro = intros[Math.floor(Math.random() * intros.length)];
    
    let response = `${intro}\n\n**${topic.title}**\n\n${topic.content}`;
    
    if (relatedTopics && relatedTopics.length > 0) {
      response += `\n\n---\n📌 **Sujets connexes:** ${relatedTopics.join(', ')}`;
      response += `\n_Demande-moi si tu veux en savoir plus!_`;
    }
    
    response += this.getCategoryTip(topic.category);
    
    return response;
  }
  
  /**
   * Explication claire et directe du naisseur
   */
  private static getNaisseurExplanation(): string {
    return `🐷 **C'est quoi un naisseur ?**

Un **naisseur** est un éleveur qui se spécialise dans la **production de porcelets**. Son activité principale consiste à :

**Ce qu'il fait :**
• Élever des truies reproductrices et des verrats
• Faire reproduire ses truies (saillie)
• Suivre les gestations (environ 114 jours)
• Assister les mises bas
• Élever les porcelets jusqu'au sevrage (21-28 jours)
• Vendre les porcelets sevrés à d'autres éleveurs (les engraisseurs)

**En résumé :** Le naisseur produit des bébés porcs (porcelets) qu'il vend ensuite. Il ne garde pas les porcs jusqu'à l'âge adulte pour la vente de viande.

**Avantages :**
✅ Marge bénéficiaire élevée par porcelet
✅ Moins d'espace nécessaire (pas besoin de grands enclos d'engraissement)
✅ Cycle de reproduction rapide (truie peut avoir 2-3 portées par an)

**Inconvénients :**
❌ Expertise technique nécessaire (gestion de la reproduction, soins aux porcelets)
❌ Investissement initial élevé (truies, verrats, équipements de maternité)
❌ Risque de mortalité périnatale (mortalité des porcelets à la naissance)

**Investissement :** Élevé (truies reproductrices, verrats, équipements de maternité)
**Rentabilité :** Bonne si taux de survie > 90%

💡 **Pour info :** Il existe aussi l'**engraisseur** (qui achète des porcelets pour les élever jusqu'à la vente) et le **naisseur-engraisseur** (qui fait les deux). Tu veux que je t'explique ces autres types ?`;
  }
  
  /**
   * Explication claire et directe de l'engraisseur
   */
  private static getEngraisseurExplanation(): string {
    return `🐖 **C'est quoi un engraisseur ?**

Un **engraisseur** est un éleveur qui se spécialise dans l'**engraissement des porcs**. Son activité principale consiste à :

**Ce qu'il fait :**
• Acheter des porcelets sevrés (généralement à des naisseurs)
• Les élever et les nourrir pendant la phase de croissance (environ 180 jours)
• Les amener jusqu'au poids de vente (généralement 80-120 kg)
• Vendre les porcs finis pour la viande

**En résumé :** L'engraisseur achète des bébés porcs et les élève jusqu'à l'âge adulte pour la vente de viande. Il ne fait pas de reproduction.

**Avantages :**
✅ Cycle court et gestion simplifiée
✅ Investissement moyen (pas besoin de truies reproductrices)
✅ Moins de complexité technique (pas de gestion de reproduction)

**Inconvénients :**
❌ Dépendance aux naisseurs (doit acheter les porcelets)
❌ Coût d'achat des porcelets (30 000 - 50 000 FCFA par porcelet)
❌ Besoin de plus d'espace pour l'engraissement

**Investissement :** Moyen (bâtiments d'engraissement, aliments)
**Rentabilité :** Stable avec bon GMQ (>700g/jour)

💡 **Pour info :** Il existe aussi le **naisseur** (qui produit des porcelets) et le **naisseur-engraisseur** (qui fait les deux). Tu veux que je t'explique ces autres types ?`;
  }
  
  /**
   * Message quand aucun résultat n'est trouvé
   */
  private static getNoResultMessage(): string {
    const topics = TRAINING_KNOWLEDGE_BASE.map(t => t.title).slice(0, 5);
    
    return `🤔 Je n'ai pas trouvé d'information précise sur ce sujet.\n\n` +
      `Voici les thèmes sur lesquels je peux t'aider:\n` +
      topics.map(t => `• ${t}`).join('\n') +
      `\n\nEssaie de reformuler ta question ou choisis un de ces thèmes!`;
  }
  
  /**
   * Label lisible pour une catégorie
   */
  private static getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      types_elevage: "Types d'élevage",
      objectifs: 'Objectifs',
      races: 'Races porcines',
      emplacement: 'Emplacement',
      eau: "Gestion de l'eau",
      alimentation: 'Alimentation',
      sante: 'Santé et prophylaxie',
      finance: 'Gestion financière',
      commerce: 'Commercialisation',
      reglementation: 'Réglementation',
      general: 'Général',
    };
    return labels[category] || category;
  }
  
  /**
   * Conseil personnalisé selon la catégorie
   */
  private static getCategoryTip(category: string): string {
    const tips: Record<string, string> = {
      types_elevage: '\n\n💡 _Tu peux utiliser l\'app pour suivre ton type d\'élevage spécifique!_',
      objectifs: '\n\n💡 _Définis ton objectif dans la section "Projet" de l\'app!_',
      races: '\n\n💡 _Tu peux enregistrer la race de chaque animal dans la section "Production"!_',
      emplacement: '\n\n💡 _Indique la localisation de ta ferme dans les paramètres du projet!_',
      eau: '\n\n💡 _Surveille ta consommation d\'eau dans la section "Finance"!_',
      alimentation: '\n\n💡 _Gère tes stocks d\'aliments dans la section "Nutrition"!_',
      sante: '\n\n💡 _Programme tes vaccinations dans la section "Santé"!_',
      finance: '\n\n💡 _Suis ta rentabilité dans la section "Finance"!_',
      commerce: '\n\n💡 _Utilise la Marketplace pour vendre tes porcs!_',
      reglementation: '\n\n💡 _Garde tes documents à jour dans la section "Documents"!_',
    };
    
    return tips[category] || '';
  }
  
  /**
   * Détecte le meilleur topic basé sur la question
   */
  static detectTopicFromQuestion(question: string): string | null {
    const questionLower = question.toLowerCase();
    
    const topicMappings: Record<string, string[]> = {
      types_elevage: ['naisseur', 'engraisseur', 'cycle complet', 'charcuterie', 'type élevage', 'production porcelets'],
      objectifs: ['objectif', 'démarrer', 'commencer', 'capital', 'budget initial', 'surface nécessaire'],
      races: ['race', 'large white', 'landrace', 'duroc', 'piétrain', 'croisement', 'génétique'],
      emplacement: ['emplacement', 'terrain', 'localisation', 'construire', 'bâtiment', 'distance'],
      eau: ['eau', 'abreuvoir', 'forage', 'puits', 'consommation eau'],
      alimentation: ['aliment', 'nourriture', 'provende', 'maïs', 'soja', 'ration', 'nourrir'],
      sante: ['vaccin', 'vaccination', 'maladie', 'santé', 'traitement', 'vétérinaire', 'prophylaxie'],
      finance: ['coût', 'rentabilité', 'investissement', 'marge', 'bénéfice', 'argent', 'prix'],
      commerce: ['vendre', 'vente', 'commercialisation', 'client', 'marché', 'acheteur'],
      reglementation: ['règlement', 'loi', 'norme', 'obligation', 'déclaration', 'légal'],
    };
    
    for (const [topic, keywords] of Object.entries(topicMappings)) {
      if (keywords.some(kw => questionLower.includes(kw))) {
        return topic;
      }
    }
    
    return null;
  }
}
