import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateKnowledgeDto, UpdateKnowledgeDto } from './dto/create-knowledge.dto';
import { SearchKnowledgeDto } from './dto/search-knowledge.dto';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { v4 as uuidv4 } from 'uuid';

export interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  keywords: string[];
  content: string;
  summary: string | null;
  priority: number;
  visibility: string;
  projet_id: string | null;
  is_active: boolean;
  view_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  id: string;
  category: string;
  title: string;
  content: string;
  summary: string | null;
  keywords: string[];
  relevance_score: number;
}

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Crée un nouveau contenu dans la base de connaissances
   */
  async create(dto: CreateKnowledgeDto, userId?: string): Promise<KnowledgeItem> {
    const id = `kb_${uuidv4()}`;

    const result = await this.databaseService.query(
      `INSERT INTO knowledge_base (
        id, category, title, keywords, content, summary, 
        priority, visibility, projet_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        dto.category,
        dto.title,
        dto.keywords,
        dto.content,
        dto.summary || null,
        dto.priority || 5,
        dto.visibility || 'global',
        dto.projet_id || null,
        userId || null,
      ]
    );

    this.logger.log(`Contenu créé: ${id} (${dto.title})`);
    return this.mapRowToKnowledge(result.rows[0]);
  }

  /**
   * Met à jour un contenu existant
   */
  async update(id: string, dto: UpdateKnowledgeDto): Promise<KnowledgeItem> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Contenu ${id} non trouvé`);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(dto.category);
    }
    if (dto.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(dto.title);
    }
    if (dto.keywords !== undefined) {
      updates.push(`keywords = $${paramIndex++}`);
      values.push(dto.keywords);
    }
    if (dto.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(dto.content);
    }
    if (dto.summary !== undefined) {
      updates.push(`summary = $${paramIndex++}`);
      values.push(dto.summary);
    }
    if (dto.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(dto.priority);
    }
    if (dto.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(dto.is_active);
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(id);
    const result = await this.databaseService.query(
      `UPDATE knowledge_base SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return this.mapRowToKnowledge(result.rows[0]);
  }

  /**
   * Recherche dans la base de connaissances
   */
  async search(dto: SearchKnowledgeDto): Promise<SearchResult[]> {
    const result = await this.databaseService.query(
      `SELECT * FROM search_knowledge($1, $2, $3, $4)`,
      [dto.query, dto.category || null, dto.projet_id || null, dto.limit || 5]
    );

    return result.rows.map(row => ({
      id: row.id,
      category: row.category,
      title: row.title,
      content: row.content,
      summary: row.summary,
      keywords: row.keywords || [],
      relevance_score: parseFloat(row.relevance_score) || 0,
    }));
  }

  /**
   * Recherche simple par mots-clés (sans fonction PostgreSQL)
   * Fallback si la fonction search_knowledge n'existe pas encore
   */
  async searchSimple(query: string, projetId?: string, limit: number = 5): Promise<SearchResult[]> {
    const normalizedQuery = query.toLowerCase();
    const searchTerms = normalizedQuery.split(/\s+/).filter(t => t.length >= 2);

    if (searchTerms.length === 0) {
      return [];
    }

    // Construire les conditions avec paramètres séparés pour éviter les conflits d'index
    // Chaque terme a son propre paramètre pour keywords ET title
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    for (const term of searchTerms) {
      const termPattern = `%${term}%`;
      // Condition pour keywords
      conditions.push(`EXISTS (SELECT 1 FROM unnest(keywords) AS kw WHERE lower(kw) LIKE $${paramIndex})`);
      params.push(termPattern);
      paramIndex++;
      
      // Condition pour title
      conditions.push(`lower(title) LIKE $${paramIndex}`);
      params.push(termPattern);
      paramIndex++;
    }

    // Filtre projet: éviter "$n IS NOT NULL" (type unknown) => construire la clause selon présence projetId
    let projetFilterSql = `visibility = 'global'`;
    if (projetId) {
      projetFilterSql = `(visibility = 'global' OR (visibility = 'projet' AND projet_id = $${paramIndex}::text))`;
      params.push(projetId);
      paramIndex++;
    }

    // Paramètre pour limit (caster pour éviter ambiguïtés)
    const limitParamIndex = paramIndex;
    params.push(limit);

    const result = await this.databaseService.query(
      `SELECT id, category, title, content, summary, keywords
       FROM knowledge_base
       WHERE is_active = true
         AND ${projetFilterSql}
         AND (${conditions.join(' OR ')})
       ORDER BY priority DESC, view_count DESC
       LIMIT $${limitParamIndex}::int`,
      params
    );

    return result.rows.map(row => ({
      id: row.id,
      category: row.category,
      title: row.title,
      content: row.content,
      summary: row.summary,
      keywords: row.keywords || [],
      relevance_score: 1.0, // Score simplifié
    }));
  }

  /**
   * Récupère un contenu par ID
   */
  async findById(id: string): Promise<KnowledgeItem | null> {
    const result = await this.databaseService.query(
      `SELECT * FROM knowledge_base WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToKnowledge(result.rows[0]);
  }

  /**
   * Récupère un contenu par ID et incrémente le compteur de vues
   */
  async findByIdAndIncrementViews(id: string): Promise<KnowledgeItem | null> {
    const result = await this.databaseService.query(
      `UPDATE knowledge_base 
       SET view_count = view_count + 1 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToKnowledge(result.rows[0]);
  }

  /**
   * Liste tous les contenus par catégorie
   */
  async findByCategory(category: string, projetId?: string): Promise<KnowledgeItem[]> {
    const result = await this.databaseService.query(
      `SELECT * FROM knowledge_base 
       WHERE category = $1 
         AND is_active = true
         AND (visibility = 'global' OR projet_id = $2)
       ORDER BY priority DESC, title ASC`,
      [category, projetId || null]
    );

    return result.rows.map(row => this.mapRowToKnowledge(row));
  }

  /**
   * Liste toutes les catégories avec le nombre de contenus
   */
  async getCategories(projetId?: string): Promise<Array<{ category: string; count: number; titles: string[] }>> {
    const result = await this.databaseService.query(
      `SELECT category, COUNT(*) as count, array_agg(title ORDER BY priority DESC) as titles
       FROM knowledge_base
       WHERE is_active = true
         AND (visibility = 'global' OR projet_id = $1)
       GROUP BY category
       ORDER BY count DESC`,
      [projetId || null]
    );

    return result.rows.map(row => ({
      category: row.category,
      count: parseInt(row.count),
      titles: row.titles.slice(0, 5), // Max 5 titres par catégorie
    }));
  }

  /**
   * Liste tous les contenus (avec pagination)
   */
  async findAll(projetId?: string, limit: number = 100, offset: number = 0): Promise<KnowledgeItem[]> {
    const result = await this.databaseService.query(
      `SELECT * FROM knowledge_base 
       WHERE is_active = true
         AND (visibility = 'global' OR projet_id = $1)
       ORDER BY category, priority DESC, title ASC
       LIMIT $2 OFFSET $3`,
      [projetId || null, limit, offset]
    );

    return result.rows.map(row => this.mapRowToKnowledge(row));
  }

  /**
   * Supprime un contenu (soft delete)
   */
  async delete(id: string): Promise<void> {
    await this.databaseService.query(
      `UPDATE knowledge_base SET is_active = false WHERE id = $1`,
      [id]
    );
  }

  /**
   * Enregistre un feedback utilisateur
   */
  async createFeedback(dto: CreateFeedbackDto, userId: string): Promise<void> {
    const id = `fb_${uuidv4()}`;

    await this.databaseService.query(
      `INSERT INTO knowledge_feedback (
        id, knowledge_id, projet_id, user_id, feedback_type, comment, original_question
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, dto.knowledge_id, dto.projet_id, userId, dto.feedback_type, dto.comment || null, dto.original_question || null]
    );

    // Si feedback positif, incrémenter le compteur helpful
    if (dto.feedback_type === 'helpful') {
      await this.databaseService.query(
        `UPDATE knowledge_base SET helpful_count = helpful_count + 1 WHERE id = $1`,
        [dto.knowledge_id]
      );
    }

    this.logger.log(`Feedback enregistré pour ${dto.knowledge_id}: ${dto.feedback_type}`);
  }

  /**
   * Compte le nombre total de contenus
   */
  async count(projetId?: string): Promise<number> {
    const result = await this.databaseService.query(
      `SELECT COUNT(*) FROM knowledge_base 
       WHERE is_active = true
         AND (visibility = 'global' OR projet_id = $1)`,
      [projetId || null]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Mappe une ligne de la BDD vers un objet KnowledgeItem
   */
  private mapRowToKnowledge(row: any): KnowledgeItem {
    return {
      id: row.id,
      category: row.category,
      title: row.title,
      keywords: row.keywords || [],
      content: row.content,
      summary: row.summary,
      priority: row.priority || 5,
      visibility: row.visibility || 'global',
      projet_id: row.projet_id,
      is_active: row.is_active !== false,
      view_count: row.view_count || 0,
      helpful_count: row.helpful_count || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

