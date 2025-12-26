/**
 * Actions pour les questions de formation et connaissances
 * Utilise la base de connaissances TrainingKnowledgeBase
 */

import { AgentActionResult, AgentContext } from '../../../../types/chatAgent';
import { 
  TRAINING_KNOWLEDGE_BASE, 
  searchKnowledge, 
  getKnowledgeResponse,
  KnowledgeTopic 
} from '../../knowledge/TrainingKnowledgeBase';
import { logger } from '../../../../utils/logger';

interface KnowledgeParams {
  topic?: string;
  question: string;
}

export class KnowledgeActions {
  /**
   * Répond à une question sur l'élevage porcin
   */
  static async answerKnowledgeQuestion(
    params: KnowledgeParams,
    context: AgentContext
  ): Promise<AgentActionResult> {
    try {
      const { topic, question } = params;
      
      logger.info('[KnowledgeActions] Question reçue:', { topic, question });
      
      // Stratégie 1: Si un topic spécifique est fourni, chercher directement
      if (topic) {
        const topicData = TRAINING_KNOWLEDGE_BASE.find(t => t.id === topic);
        if (topicData) {
          return {
            success: true,
            message: this.formatKnowledgeResponse(topicData, question),
            data: {
              topic: topicData.id,
              title: topicData.title,
              category: topicData.category
            }
          };
        }
      }
      
      // Stratégie 2: Recherche sémantique dans la base de connaissances
      const results = searchKnowledge(question);
      
      if (results.length === 0) {
        // Aucun résultat trouvé - proposer les thèmes disponibles
        return {
          success: true,
          message: this.getNoResultMessage(),
          data: { searchQuery: question, resultsCount: 0 }
        };
      }
      
      // Retourner la meilleure réponse
      const bestMatch = results[0];
      const additionalTopics = results.slice(1).map(t => t.title);
      
      return {
        success: true,
        message: this.formatKnowledgeResponse(bestMatch, question, additionalTopics),
        data: {
          topic: bestMatch.id,
          title: bestMatch.title,
          category: bestMatch.category,
          relatedTopics: additionalTopics
        }
      };
      
    } catch (error) {
      logger.error('[KnowledgeActions] Erreur:', error);
      return {
        success: false,
        message: "Désolé, je n'ai pas pu trouver la réponse à ta question. Peux-tu reformuler?",
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
  
  /**
   * Liste tous les thèmes de formation disponibles
   */
  static async listKnowledgeTopics(
    params: any,
    context: AgentContext
  ): Promise<AgentActionResult> {
    const topics = TRAINING_KNOWLEDGE_BASE.map(t => ({
      id: t.id,
      title: t.title,
      keywords: t.keywords.slice(0, 3)
    }));
    
    const message = `📚 **Thèmes de formation disponibles:**\n\n` +
      topics.map((t, i) => `${i + 1}. **${t.title}** - ${t.keywords.join(', ')}`).join('\n') +
      `\n\n💡 Pose-moi une question sur n'importe quel sujet!`;
    
    return {
      success: true,
      message,
      data: { topics }
    };
  }
  
  /**
   * Formate la réponse de manière conversationnelle
   */
  private static formatKnowledgeResponse(
    topic: KnowledgeTopic, 
    question: string,
    relatedTopics?: string[]
  ): string {
    // Intro conversationnelle
    const intros = [
      `Ah, bonne question! 📚`,
      `Je vais t'expliquer ça! 🎓`,
      `Voici ce que tu dois savoir: 📖`,
      `Excellente question! Voici ma réponse: 💡`,
      `C'est important de comprendre ça! 🐷`
    ];
    const intro = intros[Math.floor(Math.random() * intros.length)];
    
    // Construire la réponse
    let response = `${intro}\n\n**${topic.title}**\n\n${topic.content}`;
    
    // Ajouter les sujets connexes si disponibles
    if (relatedTopics && relatedTopics.length > 0) {
      response += `\n\n---\n📌 **Sujets connexes:** ${relatedTopics.join(', ')}`;
      response += `\n_Demande-moi si tu veux en savoir plus sur ces sujets!_`;
    }
    
    // Ajouter un conseil personnalisé selon la catégorie
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
      reglementation: '\n\n💡 _Garde tes documents à jour dans la section "Documents"!_'
    };
    
    return tips[category] || '';
  }
  
  /**
   * Détecte le meilleur topic basé sur la question
   */
  static detectTopicFromQuestion(question: string): string | null {
    const questionLower = question.toLowerCase();
    
    // Mapping des mots-clés vers les topics
    const topicMappings: Record<string, string[]> = {
      'types_elevage': ['naisseur', 'engraisseur', 'cycle complet', 'charcuterie', 'type élevage', 'production porcelets'],
      'objectifs': ['objectif', 'démarrer', 'commencer', 'capital', 'budget initial', 'surface nécessaire'],
      'races': ['race', 'large white', 'landrace', 'duroc', 'piétrain', 'croisement', 'génétique'],
      'emplacement': ['emplacement', 'terrain', 'localisation', 'construire', 'bâtiment', 'distance'],
      'eau': ['eau', 'abreuvoir', 'forage', 'puits', 'consommation eau'],
      'alimentation': ['aliment', 'nourriture', 'provende', 'maïs', 'soja', 'ration', 'nourrir'],
      'sante': ['vaccin', 'vaccination', 'maladie', 'santé', 'traitement', 'vétérinaire', 'prophylaxie'],
      'finance': ['coût', 'rentabilité', 'investissement', 'marge', 'bénéfice', 'argent', 'prix'],
      'commerce': ['vendre', 'vente', 'commercialisation', 'client', 'marché', 'acheteur'],
      'reglementation': ['règlement', 'loi', 'norme', 'obligation', 'déclaration', 'légal']
    };
    
    for (const [topic, keywords] of Object.entries(topicMappings)) {
      if (keywords.some(kw => questionLower.includes(kw))) {
        return topic;
      }
    }
    
    return null;
  }
}

