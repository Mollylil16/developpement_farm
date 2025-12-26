import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateLearningDto } from './dto/create-learning.dto';
import { SearchLearningsDto } from './dto/search-learnings.dto';
import { RecordConversationDto } from './dto/record-conversation.dto';
import { v4 as uuidv4 } from 'uuid';

interface Learning {
  id: string;
  projet_id: string;
  learning_type: string;
  user_message: string;
  keywords: string[];
  detected_intent: string | null;
  correct_intent: string | null;
  params: Record<string, any> | null;
  memorized_response: string | null;
  confidence: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  learning_id: string;
  user_message: string;
  detected_intent: string | null;
  correct_intent: string | null;
  total_score: number;
  usage_count: number;
  memorized_response?: string;
  keywords?: string[];
}

@Injectable()
export class AgentLearningsService {
  private readonly logger = new Logger(AgentLearningsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Crée un nouvel apprentissage
   */
  async createLearning(dto: CreateLearningDto, userId: string): Promise<Learning> {
    const id = `learn_${uuidv4()}`;
    const keywords = dto.keywords || this.extractKeywords(dto.user_message);

    const result = await this.databaseService.query(
      `INSERT INTO agent_learnings (
        id, projet_id, learning_type, user_message, keywords,
        detected_intent, correct_intent, params, memorized_response, confidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        dto.projet_id,
        dto.learning_type,
        dto.user_message,
        keywords,
        dto.detected_intent || null,
        dto.correct_intent || null,
        dto.params ? JSON.stringify(dto.params) : null,
        dto.memorized_response || null,
        dto.confidence || 0.5,
      ]
    );

    // Indexer les mots-clés
    if (keywords.length > 0 && (dto.detected_intent || dto.correct_intent)) {
      await this.indexKeywords(id, keywords, dto.correct_intent || dto.detected_intent!);
    }

    this.logger.log(`Apprentissage créé: ${id} (type: ${dto.learning_type})`);
    return this.mapRowToLearning(result.rows[0]);
  }

  /**
   * Recherche des apprentissages par mots-clés
   */
  async searchByKeywords(dto: SearchLearningsDto): Promise<SearchResult[]> {
    const keywords = dto.keywords || (dto.user_message ? this.extractKeywords(dto.user_message) : []);
    
    if (keywords.length === 0) {
      return [];
    }

    // Utiliser la fonction PostgreSQL optimisée
    const result = await this.databaseService.query(
      `SELECT * FROM search_learnings_by_keywords($1, $2)`,
      [dto.projet_id, keywords]
    );

    return result.rows.map(row => ({
      learning_id: row.learning_id,
      user_message: row.user_message,
      detected_intent: row.detected_intent,
      correct_intent: row.correct_intent,
      total_score: parseFloat(row.total_score),
      usage_count: row.usage_count,
    }));
  }

  /**
   * Recherche un apprentissage similaire pour réutilisation
   */
  async findSimilarLearning(projetId: string, userMessage: string): Promise<SearchResult | null> {
    const keywords = this.extractKeywords(userMessage);
    
    if (keywords.length === 0) {
      return null;
    }

    const results = await this.searchByKeywords({
      projet_id: projetId,
      keywords,
      limit: 1,
    });

    if (results.length === 0) {
      return null;
    }

    const best = results[0];
    
    // Vérifier si le score est suffisant (seuil de pertinence)
    if (best.total_score < 2.0) {
      return null;
    }

    // Récupérer les détails complets
    const learning = await this.getLearningById(best.learning_id);
    if (learning) {
      return {
        ...best,
        memorized_response: learning.memorized_response || undefined,
        keywords: learning.keywords,
      };
    }

    return best;
  }

  /**
   * Incrémente le compteur d'utilisation d'un apprentissage
   */
  async incrementUsageCount(learningId: string): Promise<void> {
    await this.databaseService.query(
      `UPDATE agent_learnings SET usage_count = usage_count + 1 WHERE id = $1`,
      [learningId]
    );
  }

  /**
   * Enregistre une correction utilisateur
   */
  async recordUserCorrection(
    projetId: string,
    userId: string,
    originalMessage: string,
    detectedIntent: string | null,
    correctIntent: string,
    correctParams?: Record<string, any>
  ): Promise<Learning> {
    return this.createLearning({
      projet_id: projetId,
      learning_type: 'user_correction',
      user_message: originalMessage,
      detected_intent: detectedIntent || undefined,
      correct_intent: correctIntent,
      params: correctParams,
      confidence: 0.9, // Haute confiance car corrigé par l'utilisateur
    }, userId);
  }

  /**
   * Enregistre un succès d'intention
   */
  async recordSuccessfulIntent(
    projetId: string,
    userId: string,
    userMessage: string,
    intent: string,
    params?: Record<string, any>,
    confidence?: number
  ): Promise<void> {
    // Vérifier si un apprentissage similaire existe déjà
    const existing = await this.findSimilarLearning(projetId, userMessage);
    
    if (existing && existing.correct_intent === intent) {
      // Incrémenter le compteur d'utilisation
      await this.incrementUsageCount(existing.learning_id);
    } else {
      // Créer un nouvel apprentissage
      await this.createLearning({
        projet_id: projetId,
        learning_type: 'successful_intent',
        user_message: userMessage,
        detected_intent: intent,
        correct_intent: intent,
        params,
        confidence: confidence || 0.8,
      }, userId);
    }
  }

  /**
   * Enregistre un échec d'intention
   */
  async recordFailedIntent(
    projetId: string,
    userId: string,
    userMessage: string,
    detectedIntent?: string
  ): Promise<Learning> {
    return this.createLearning({
      projet_id: projetId,
      learning_type: 'failed_intent',
      user_message: userMessage,
      detected_intent: detectedIntent,
      confidence: 0.3,
    }, userId);
  }

  /**
   * Enregistre une conversation
   */
  async recordConversation(dto: RecordConversationDto, userId: string): Promise<void> {
    const id = `msg_${uuidv4()}`;

    await this.databaseService.query(
      `INSERT INTO agent_conversation_memory (
        id, projet_id, user_id, conversation_id, message_role, 
        message_content, intent, action_executed, action_success
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        dto.projet_id,
        userId,
        dto.conversation_id,
        dto.message_role,
        dto.message_content,
        dto.intent || null,
        dto.action_executed || null,
        dto.action_success !== undefined ? dto.action_success : null,
      ]
    );
  }

  /**
   * Récupère les messages récents d'une conversation
   */
  async getConversationHistory(projetId: string, conversationId: string, limit: number = 10): Promise<any[]> {
    const result = await this.databaseService.query(
      `SELECT * FROM agent_conversation_memory 
       WHERE projet_id = $1 AND conversation_id = $2 
       ORDER BY created_at DESC LIMIT $3`,
      [projetId, conversationId, limit]
    );

    return result.rows.reverse(); // Ordre chronologique
  }

  /**
   * Récupère un apprentissage par ID
   */
  async getLearningById(id: string): Promise<Learning | null> {
    const result = await this.databaseService.query(
      `SELECT * FROM agent_learnings WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToLearning(result.rows[0]);
  }

  /**
   * Récupère les apprentissages par projet
   */
  async getLearningsByProjet(projetId: string, limit: number = 100): Promise<Learning[]> {
    const result = await this.databaseService.query(
      `SELECT * FROM agent_learnings 
       WHERE projet_id = $1 
       ORDER BY usage_count DESC, updated_at DESC 
       LIMIT $2`,
      [projetId, limit]
    );

    return result.rows.map(row => this.mapRowToLearning(row));
  }

  /**
   * Extrait les mots-clés significatifs d'un message
   */
  extractKeywords(message: string): string[] {
    // Normaliser le message
    const normalized = message
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Retirer les accents
      .replace(/[^\w\s]/g, ' ') // Retirer la ponctuation
      .trim();

    // Liste de mots vides à ignorer
    const stopWords = new Set([
      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
      'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'a', 'au', 'aux',
      'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
      'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui', 'quoi',
      'pour', 'par', 'sur', 'sous', 'dans', 'avec', 'sans', 'chez',
      'est', 'sont', 'ai', 'as', 'avons', 'avez', 'ont', 'etre', 'avoir',
      'fait', 'faire', 'fais', 'peux', 'peut', 'veux', 'veut', 'vouloir',
      'bien', 'tres', 'plus', 'moins', 'aussi', 'encore', 'deja', 'toujours',
      'oui', 'non', 'ok', 'merci', 'sil', 'plait', 'bonjour', 'bonsoir',
      'combien', 'comment', 'quand', 'pourquoi', 'quoi', 'quel', 'quelle',
    ]);

    // Extraire les mots significatifs
    const words = normalized.split(/\s+/).filter(word => 
      word.length >= 3 && !stopWords.has(word)
    );

    // Retirer les doublons et limiter
    return [...new Set(words)].slice(0, 10);
  }

  /**
   * Indexe les mots-clés pour un apprentissage
   */
  private async indexKeywords(learningId: string, keywords: string[], intent: string): Promise<void> {
    for (const keyword of keywords) {
      const id = `kw_${uuidv4()}`;
      try {
        await this.databaseService.query(
          `INSERT INTO agent_keywords_index (id, keyword, learning_id, intent, score)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (keyword, learning_id) DO UPDATE SET score = agent_keywords_index.score + 0.1`,
          [id, keyword, learningId, intent, 1.0]
        );
      } catch (error) {
        this.logger.warn(`Erreur indexation mot-clé "${keyword}":`, error);
      }
    }
  }

  /**
   * Mappe une ligne de la BDD vers un objet Learning
   */
  private mapRowToLearning(row: any): Learning {
    return {
      id: row.id,
      projet_id: row.projet_id,
      learning_type: row.learning_type,
      user_message: row.user_message,
      keywords: row.keywords || [],
      detected_intent: row.detected_intent,
      correct_intent: row.correct_intent,
      params: row.params ? (typeof row.params === 'string' ? JSON.parse(row.params) : row.params) : null,
      memorized_response: row.memorized_response,
      confidence: parseFloat(row.confidence) || 0.5,
      usage_count: row.usage_count || 1,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

