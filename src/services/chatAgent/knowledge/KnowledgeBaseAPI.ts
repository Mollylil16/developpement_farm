/**
 * Service API pour la base de connaissances
 * Communique avec le backend pour récupérer et gérer le contenu éducatif
 */

import apiClient from '../../api/apiClient';

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

export interface CategoryInfo {
  category: string;
  count: number;
  titles: string[];
}

/**
 * Cache local pour les résultats de recherche
 */
class KnowledgeCache {
  private cache: Map<string, { data: SearchResult[]; timestamp: number }> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  get(key: string): SearchResult[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: SearchResult[]): void {
    // Limiter la taille du cache
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const searchCache = new KnowledgeCache();

/**
 * Service API pour la base de connaissances Kouakou
 */
export class KnowledgeBaseAPI {
  /**
   * Recherche dans la base de connaissances
   */
  static async search(
    query: string,
    options?: {
      category?: string;
      projetId?: string;
      limit?: number;
    }
  ): Promise<SearchResult[]> {
    const cacheKey = `${query}_${options?.category || ''}_${options?.projetId || ''}`;
    
    // Vérifier le cache
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const results = await apiClient.get<SearchResult[]>('/knowledge-base/search', {
        params: {
          query,
          category: options?.category,
          projet_id: options?.projetId,
          limit: options?.limit || 5,
        },
      });

      // Mettre en cache
      if (results && results.length > 0) {
        searchCache.set(cacheKey, results);
      }

      return results || [];
    } catch (error) {
      console.warn('[KnowledgeBaseAPI] Erreur recherche:', error);
      return [];
    }
  }

  /**
   * Récupère un contenu par ID
   */
  static async getById(id: string): Promise<KnowledgeItem | null> {
    try {
      return await apiClient.get<KnowledgeItem>(`/knowledge-base/${id}`);
    } catch (error) {
      console.warn('[KnowledgeBaseAPI] Erreur getById:', error);
      return null;
    }
  }

  /**
   * Récupère tous les contenus d'une catégorie
   */
  static async getByCategory(category: string, projetId?: string): Promise<KnowledgeItem[]> {
    try {
      return await apiClient.get<KnowledgeItem[]>(`/knowledge-base/by-category/${category}`, {
        params: { projet_id: projetId },
      });
    } catch (error) {
      console.warn('[KnowledgeBaseAPI] Erreur getByCategory:', error);
      return [];
    }
  }

  /**
   * Liste les catégories disponibles
   */
  static async getCategories(projetId?: string): Promise<CategoryInfo[]> {
    try {
      return await apiClient.get<CategoryInfo[]>('/knowledge-base/categories', {
        params: { projet_id: projetId },
      });
    } catch (error) {
      console.warn('[KnowledgeBaseAPI] Erreur getCategories:', error);
      return [];
    }
  }

  /**
   * Récupère tous les contenus
   */
  static async getAll(projetId?: string, limit?: number): Promise<KnowledgeItem[]> {
    try {
      return await apiClient.get<KnowledgeItem[]>('/knowledge-base', {
        params: { projet_id: projetId, limit },
      });
    } catch (error) {
      console.warn('[KnowledgeBaseAPI] Erreur getAll:', error);
      return [];
    }
  }

  /**
   * Enregistre un feedback utilisateur
   */
  static async sendFeedback(
    knowledgeId: string,
    projetId: string,
    feedbackType: 'helpful' | 'not_helpful' | 'incomplete' | 'incorrect',
    originalQuestion?: string,
    comment?: string
  ): Promise<void> {
    try {
      await apiClient.post('/knowledge-base/feedback', {
        knowledge_id: knowledgeId,
        projet_id: projetId,
        feedback_type: feedbackType,
        original_question: originalQuestion,
        comment,
      });
    } catch (error) {
      console.warn('[KnowledgeBaseAPI] Erreur sendFeedback:', error);
    }
  }

  /**
   * Vide le cache local
   */
  static clearCache(): void {
    searchCache.clear();
  }
}

export default KnowledgeBaseAPI;

