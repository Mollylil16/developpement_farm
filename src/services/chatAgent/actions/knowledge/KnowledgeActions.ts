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
      return this.searchLocalKnowledge(topic, question);
    }
  }
  
  /**
   * Recherche dans la base de connaissances locale (statique)
   */
  private static searchLocalKnowledge(topic: string | undefined, question: string): AgentActionResult {
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
