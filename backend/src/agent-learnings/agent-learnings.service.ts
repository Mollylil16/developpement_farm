import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateLearningDto } from './dto/create-learning.dto';
import { SearchLearningsDto } from './dto/search-learnings.dto';
import { RecordConversationDto } from './dto/record-conversation.dto';
import { v4 as uuidv4 } from 'uuid';

export interface Learning {
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

export interface SearchResult {
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

    // Colonnes nécessaires pour mapRowToLearning (éviter RETURNING * pour éviter colonnes inexistantes)
    const learningColumns = `id, projet_id, learning_type, user_message, keywords,
      detected_intent, correct_intent, params, memorized_response, confidence,
      usage_count, created_at, updated_at`;

    let result;
    try {
      result = await this.databaseService.query(
        `INSERT INTO agent_learnings (
          id, projet_id, learning_type, user_message, keywords,
          detected_intent, correct_intent, params, memorized_response, confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING ${learningColumns}`,
        [
          id,
          dto.projet_id,
          dto.learning_type,
          dto.user_message,
          keywords, // PostgreSQL accepte directement les tableaux JavaScript
          dto.detected_intent || null,
          dto.correct_intent || null,
          dto.params ? JSON.stringify(dto.params) : null,
          dto.memorized_response || null,
          dto.confidence || 0.5,
        ]
      );
    } catch (error) {
      throw error;
    }

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

    return result.rows.map((row: any) => ({
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
    try {
      // Vérifier si un apprentissage similaire existe déjà
      // Note: findSimilarLearning nécessite un projetId et userMessage, mais peut retourner null
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
    } catch (error) {
      this.logger.warn('[AgentLearningsService] Erreur recordSuccessfulIntent:', error);
      // Ne pas propager l'erreur car c'est une opération non-critique
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
    try {
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
    } catch (error) {
      // Si l'erreur indique que la table n'existe pas (code PostgreSQL 42P01), logger en warning
      // mais ne pas lancer d'exception car c'est une opération non-critique (fire-and-forget)
      if ((error as any)?.code === '42P01') {
        this.logger.warn('[AgentLearningsService] Table agent_conversation_memory n\'existe pas encore - migration 050 peut-être non exécutée. Ignoré.');
        return;
      }
      // Pour toute autre erreur, logger mais ne pas lancer d'exception
      this.logger.error('[AgentLearningsService] Erreur recordConversation:', error);
      // Ne pas lancer l'exception car c'est une opération non-critique
    }
  }

  /**
   * Récupère les messages récents d'une conversation
   * Retourne les messages dans le format ChatMessage pour le frontend
   */
  async getConversationHistory(projetId: string, conversationId: string, limit: number = 100): Promise<any[]> {
    // Validation des paramètres
    if (!projetId || !conversationId) {
      this.logger.warn('[AgentLearningsService] getConversationHistory: paramètres manquants');
      return [];
    }
    
    // Colonnes nécessaires (éviter SELECT * pour éviter colonnes inexistantes)
    const columns = `id, projet_id, user_id, conversation_id, message_role, 
      message_content, intent, action_executed, action_success, created_at`;
    
    try {
      const result = await this.databaseService.query(
        `SELECT ${columns} FROM agent_conversation_memory 
         WHERE projet_id = $1 AND conversation_id = $2 
         ORDER BY created_at ASC LIMIT $3`,
        [projetId, conversationId, limit]
      );
      // Mapper les résultats au format ChatMessage
      const mapped = result.rows.map((row: any) => ({
        id: row.id || `msg_${row.created_at}_${Math.random().toString(36).substr(2, 9)}`,
        role: row.message_role === 'user' ? 'user' : 'assistant',
        content: row.message_content || '',
        timestamp: row.created_at || new Date().toISOString(),
        metadata: {
          intent: row.intent || undefined,
          actionExecuted: row.action_executed || undefined,
          actionSuccess: row.action_success !== null && row.action_success !== undefined ? row.action_success : undefined,
        },
      }));
      return mapped;
    } catch (error) {
      // Si l'erreur indique que la table n'existe pas (code PostgreSQL 42P01), retourner un tableau vide
      if ((error as any)?.code === '42P01') {
        this.logger.warn('[AgentLearningsService] Table agent_conversation_memory n\'existe pas encore - migration 050 peut-être non exécutée. Retour d\'un tableau vide.');
        return [];
      }
      
      // Pour toute autre erreur, logger et retourner un tableau vide pour ne pas bloquer l'application
      this.logger.error('[AgentLearningsService] Erreur getConversationHistory:', error);
      return [];
    }
  }

  /**
   * Récupère un apprentissage par ID
   */
  async getLearningById(id: string): Promise<Learning | null> {
    // Colonnes nécessaires pour mapRowToLearning (éviter SELECT * pour éviter colonnes inexistantes)
    const learningColumns = `id, projet_id, learning_type, user_message, keywords,
      detected_intent, correct_intent, params, memorized_response, confidence,
      usage_count, created_at, updated_at`;
    
    const result = await this.databaseService.query(
      `SELECT ${learningColumns} FROM agent_learnings WHERE id = $1`,
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
    // Colonnes nécessaires pour mapRowToLearning (éviter SELECT * pour éviter colonnes inexistantes)
    const learningColumns = `id, projet_id, learning_type, user_message, keywords,
      detected_intent, correct_intent, params, memorized_response, confidence,
      usage_count, created_at, updated_at`;
    
    const result = await this.databaseService.query(
      `SELECT ${learningColumns} FROM agent_learnings 
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

