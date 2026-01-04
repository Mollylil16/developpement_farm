/**
 * Service Google Gemini pour améliorer la détection d'intention
 * Utilise l'API Google Gemini pour une classification d'intentions précise
 */

import { AgentActionType } from '../../../types/chatAgent';
import { logger } from '../../../utils/logger';
import { generateFewShotPromptForIntents } from './FewShotExamples';

export interface GeminiEmbedding {
  embedding: number[];
  text: string;
}

/**
 * Service pour utiliser Google Gemini pour améliorer la détection d'intention
 * Implémente la même interface que OpenAIIntentService pour compatibilité
 */
export class GeminiIntentService {
  private apiKey: string;
  private readonly model = 'gemini-2.5-flash';
  private apiUrl: string;
  private cache: Map<string, number[]> = new Map();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // Utiliser l'API v1beta avec gemini-2.5-flash
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  }

  /**
   * Vérifie si Gemini est configuré
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Calcule l'embedding d'un texte via Gemini
   * NOTE: Gemini n'a pas d'endpoint d'embedding direct, cette méthode lance une erreur
   * pour indiquer que cette fonctionnalité n'est pas disponible avec Gemini
   */
  async getEmbedding(text: string): Promise<number[]> {
    throw new Error('Les embeddings ne sont pas disponibles avec Google Gemini. Utilisez OpenAI pour cette fonctionnalité.');
  }

  /**
   * Calcule les embeddings pour plusieurs textes (batch)
   * NOTE: Gemini n'a pas d'endpoint d'embedding direct, cette méthode lance une erreur
   */
  async getEmbeddings(texts: string[]): Promise<number[][]> {
    throw new Error('Les embeddings ne sont pas disponibles avec Google Gemini. Utilisez OpenAI pour cette fonctionnalité.');
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
   * Classifie une intention en utilisant Google Gemini
   */
  async classifyIntent(
    userMessage: string,
    availableActions: AgentActionType[]
  ): Promise<{ action: AgentActionType; confidence: number; reasoning?: string } | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      // Générer les exemples few-shot pour les intents clés
      const keyIntents: AgentActionType[] = [
        'create_revenu',
        'create_depense',
        'create_pesee',
        'get_statistics',
        'get_stock_status',
        'calculate_costs',
        'create_vaccination',
      ].filter((intent) => availableActions.includes(intent)) as AgentActionType[];

      const fewShotExamples = generateFewShotPromptForIntents(keyIntents);

      const prompt = `Tu es un expert en classification d'intentions pour une application d'élevage de porcs en Côte d'Ivoire.

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

${fewShotExamples}

              Message utilisateur à classifier: "${userMessage}"

              IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, SANS markdown, SANS backticks, SANS texte supplémentaire.
              Format attendu (JSON pur):
              {"action": "nom_action", "confidence": 0.0-1.0, "reasoning": "explication brève optionnelle"}

              Confiance minimale requise: 0.85 pour exécution automatique.
              L'action doit être une des actions disponibles listées ci-dessus.
              
              Réponds SEULEMENT le JSON, rien d'autre.`;

      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('[GeminiIntentService] Erreur API Gemini:', errorData);
        throw new Error(
          `Erreur Gemini classification: ${errorData.error?.message || response.status}`
        );
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        logger.warn('[GeminiIntentService] Aucune réponse texte de Gemini');
        return null;
      }

      // Parser le JSON de la réponse
      try {
        // Extraire le JSON de la réponse (peut être dans du markdown ou texte brut)
        let jsonText = text.trim();
        
        // Nettoyer les backticks markdown
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Extraire le JSON si entouré de texte
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }
        
        // Essayer de réparer un JSON potentiellement tronqué
        jsonText = jsonText.trim();
        if (!jsonText.endsWith('}')) {
          // Si le JSON est tronqué, essayer de le compléter
          const openBraces = (jsonText.match(/\{/g) || []).length;
          const closeBraces = (jsonText.match(/\}/g) || []).length;
          const missingBraces = openBraces - closeBraces;
          if (missingBraces > 0) {
            // Trouver la dernière virgule ou deux-points et compléter
            const lastComma = jsonText.lastIndexOf(',');
            const lastColon = jsonText.lastIndexOf(':');
            const lastKey = Math.max(lastComma, lastColon);
            if (lastKey > 0) {
              // Si on a une valeur incomplète, la compléter avec null
              const beforeLastKey = jsonText.substring(0, lastKey + 1);
              const afterLastKey = jsonText.substring(lastKey + 1).trim();
              if (afterLastKey && !afterLastKey.match(/^["\d\[\{]/)) {
                // Valeur incomplète, la compléter
                jsonText = beforeLastKey + ' null' + '}'.repeat(missingBraces);
              } else {
                jsonText = jsonText + '}'.repeat(missingBraces);
              }
            } else {
              jsonText = jsonText + '}'.repeat(missingBraces);
            }
          }
        }

        const result = JSON.parse(jsonText);
        
        // Valider que l'action existe dans availableActions
        if (result.action && availableActions.includes(result.action as AgentActionType)) {
          return {
            action: result.action as AgentActionType,
            confidence: result.confidence || 0.8,
            reasoning: result.reasoning,
          };
        } else {
          logger.warn(
            `[GeminiIntentService] Action "${result.action}" n'est pas dans les actions disponibles`
          );
        }
      } catch (parseError) {
        logger.error('[GeminiIntentService] Erreur parsing JSON:', parseError, 'Réponse:', text);
      }

      return null;
    } catch (error: unknown) {
      logger.error('[GeminiIntentService] Erreur lors de la classification:', error);
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

