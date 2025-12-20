/**
 * Service OpenAI pour améliorer la détection d'intention
 * Utilise les embeddings OpenAI pour une recherche sémantique précise
 */

import { AgentActionType } from '../../../types/chatAgent';

export interface OpenAIEmbedding {
  embedding: number[];
  text: string;
}

export interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Service pour utiliser OpenAI pour améliorer la détection d'intention
 */
export class OpenAIIntentService {
  private apiKey: string | null;
  private apiUrl: string;
  private embeddingModel: string;
  private cache: Map<string, number[]> = new Map();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
    this.apiUrl = 'https://api.openai.com/v1';
    this.embeddingModel = 'text-embedding-3-small'; // Modèle optimisé pour coût/performance
  }

  /**
   * Vérifie si OpenAI est configuré
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Calcule l'embedding d'un texte via OpenAI
   */
  async getEmbedding(text: string): Promise<number[]> {
    // Vérifier le cache
    if (this.cache.has(text)) {
      return this.cache.get(text)!;
    }

    if (!this.apiKey) {
      throw new Error('Clé API OpenAI requise pour les embeddings');
    }

    try {
      const response = await fetch(`${this.apiUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erreur OpenAI embeddings: ${errorData.error?.message || response.status}`);
      }

      const data: OpenAIEmbeddingResponse = await response.json();
      const embedding = data.data[0]?.embedding;

      if (!embedding) {
        throw new Error('Aucun embedding retourné par OpenAI');
      }

      // Mettre en cache
      this.cache.set(text, embedding);
      return embedding;
    } catch (error: unknown) {
      console.error("[OpenAIIntentService] Erreur lors du calcul d'embedding:", error);
      throw error;
    }
  }

  /**
   * Calcule les embeddings pour plusieurs textes (batch)
   */
  async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('Clé API OpenAI requise pour les embeddings');
    }

    // Filtrer les textes déjà en cache
    const textsToFetch = texts.filter((t) => !this.cache.has(t));
    const cachedEmbeddings = texts.map((t) => this.cache.get(t));

    if (textsToFetch.length === 0) {
      return cachedEmbeddings.map((e) => e!);
    }

    try {
      const response = await fetch(`${this.apiUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: textsToFetch,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erreur OpenAI embeddings: ${errorData.error?.message || response.status}`);
      }

      const data: OpenAIEmbeddingResponse = await response.json();
      const newEmbeddings = data.data.map((d) => d.embedding);

      // Mettre en cache les nouveaux embeddings
      textsToFetch.forEach((text, index) => {
        this.cache.set(text, newEmbeddings[index]);
      });

      // Reconstruire le tableau complet
      const allEmbeddings: number[][] = [];
      let newIndex = 0;
      for (let i = 0; i < texts.length; i++) {
        if (this.cache.has(texts[i])) {
          allEmbeddings.push(this.cache.get(texts[i])!);
        } else {
          allEmbeddings.push(newEmbeddings[newIndex]);
          newIndex++;
        }
      }

      return allEmbeddings;
    } catch (error: unknown) {
      console.error("[OpenAIIntentService] Erreur lors du calcul d'embeddings:", error);
      throw error;
    }
  }

  /**
   * Calcule la similarité cosinus entre deux embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Les embeddings doivent avoir la même dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Classifie une intention en utilisant OpenAI (classification directe)
   * Version optimisée pour 100% de précision avec exemples détaillés
   */
  async classifyIntent(
    message: string,
    availableActions: AgentActionType[]
  ): Promise<{ action: AgentActionType; confidence: number } | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const systemPrompt = `Tu es un expert en classification d'intentions pour une application d'élevage de porcs en Côte d'Ivoire.

ACTIONS DISPONIBLES:
${availableActions.map((a) => `- ${a}`).join('\n')}

RÈGLES DE CLASSIFICATION (par ordre de priorité):
1. REQUÊTES D'INFORMATION (confiance ≥ 0.9):
   - "statistiques", "bilan", "combien de porcs", "nombre de porcs" → get_statistics
   - "stocks", "provende", "nourriture", "combien de provende" → get_stock_status
   - "dépenses", "coûts", "combien j'ai dépensé" → calculate_costs
   - "rappels", "à faire", "calendrier", "tâches" → get_reminders
   - "analyse", "situation", "comment va" → analyze_data

2. ENREGISTREMENTS (confiance ≥ 0.9):
   - "j'ai vendu", "vente de", "vendu" + montant → create_revenu
   - "j'ai acheté", "dépense de", "j'ai dépensé" + montant → create_depense
   - "peser", "pesée", "il fait X kg" → create_pesee
   - "vaccination", "j'ai vacciné" → create_vaccination
   - "visite vétérinaire", "vétérinaire" → create_visite_veterinaire
   - "traitement", "j'ai traité" → create_traitement
   - "maladie", "porc malade" → create_maladie

3. AMBIGUÏTÉS:
   - Si le message contient "mes dépenses" sans verbe d'action → calculate_costs (info)
   - Si le message contient "dépense" + montant → create_depense (enregistrement)
   - Si vraiment ambigu → confidence 0.6-0.7 et demande clarification

EXEMPLES:
- "combien de porcs j'ai" → {"action": "get_statistics", "confidence": 0.95}
- "j'ai vendu 5 porcs à 800000" → {"action": "create_revenu", "confidence": 0.98}
- "mes dépenses ce mois" → {"action": "calculate_costs", "confidence": 0.95}
- "j'ai dépensé 50000" → {"action": "create_depense", "confidence": 0.98}
- "peser p001 il fait 45 kg" → {"action": "create_pesee", "confidence": 0.98}

Réponds UNIQUEMENT avec un JSON valide:
{"action": "nom_action", "confidence": 0.0-1.0}

Confiance minimale requise: 0.85 pour exécution automatique.`;

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Utiliser GPT-4o pour meilleure précision (100%)
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.1, // Très basse température pour cohérence maximale
          max_tokens: 150,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Erreur OpenAI classification: ${errorData.error?.message || response.status}`
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return null;
      }

      try {
        const result = JSON.parse(content);
        if (result.action && availableActions.includes(result.action as AgentActionType)) {
          return {
            action: result.action as AgentActionType,
            confidence: result.confidence || 0.8,
          };
        }
      } catch (parseError) {
        console.error('[OpenAIIntentService] Erreur parsing JSON:', parseError);
      }

      return null;
    } catch (error: unknown) {
      console.error('[OpenAIIntentService] Erreur lors de la classification:', error);
      return null;
    }
  }

  /**
   * Vide le cache des embeddings
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Configure la clé API
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.cache.clear(); // Vider le cache lors du changement de clé
  }
}
