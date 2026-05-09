/**
 * Agent conversationnel Gemini utilisant function calling
 * Version moderne utilisant l'API Gemini avec tools/functions
 * 
 * Cet agent permet à Gemini de décider directement quelles fonctions appeler
 * et génère des réponses naturelles basées sur les résultats.
 */

import { AgentContext } from '../../types/chatAgent';
import { AgentActionExecutor } from '../chatAgent/AgentActionExecutor';
import { logger } from '../../utils/logger';
import apiClient from '../api/apiClient';

interface GeminiContent {
  role: 'user' | 'model' | 'function';
  parts: Array<{
    text?: string;
    functionCall?: {
      name: string;
      args: Record<string, unknown>;
    };
    functionResponse?: {
      name: string;
      response: unknown;
    };
  }>;
}

interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required?: string[];
  };
}

export class GeminiConversationalAgent {
  private context: AgentContext;
  private actionExecutor: AgentActionExecutor;
  private conversationHistory: GeminiContent[] = [];
  private readonly model = 'gemini-2.5-flash';
  private lastFunctionCalls: string[] = []; // Pour le debugging/testing

  constructor(apiKey: string | null, context: AgentContext) {
    // apiKey n'est plus utilisé directement (appels via backend)
    // Conservé pour compatibilité avec le code existant
    if (!apiKey) {
      logger.warn('[GeminiConversationalAgent] apiKey est null - les appels passeront par le backend');
    }
    this.context = context;
    this.actionExecutor = new AgentActionExecutor();
  }

  /**
   * Initialise l'agent (initialise l'executor)
   */
  async initialize(): Promise<void> {
    await this.actionExecutor.initialize(this.context);
  }

  /**
   * Définit les tools (fonctions) disponibles pour Gemini
   */
  private getTools(): Array<{ function_declarations: GeminiFunctionDeclaration[] }> {
    return [
      {
        function_declarations: [
          {
            name: 'creer_vente',
            description: "Enregistre une vente de porc. Utilise cette fonction quand l'utilisateur dit qu'il a vendu un ou des porcs.",
            parameters: {
              type: 'object',
              properties: {
                montant: {
                  type: 'number',
                  description: 'Montant de la vente en FCFA (obligatoire)',
                },
                acheteur: {
                  type: 'string',
                  description: "Nom de l'acheteur (optionnel)",
                },
                date: {
                  type: 'string',
                  description: 'Date de la vente au format ISO YYYY-MM-DD (optionnel, défaut: aujourd\'hui)',
                },
                description: {
                  type: 'string',
                  description: 'Description ou notes sur la vente (optionnel)',
                },
                animal_ids: {
                  type: 'string',
                  description: 'IDs des animaux vendus, séparés par des virgules (optionnel, requiert clarification si absent)',
                },
              },
              required: ['montant'],
            },
          },
          {
            name: 'creer_depense',
            description: "Enregistre une dépense. Utilise cette fonction quand l'utilisateur mentionne une dépense ou un achat.",
            parameters: {
              type: 'object',
              properties: {
                montant: {
                  type: 'number',
                  description: 'Montant de la dépense en FCFA (obligatoire)',
                },
                categorie: {
                  type: 'string',
                  description: 'Catégorie de dépense: alimentation, medicaments, veterinaire, entretien, salaires, autre (optionnel)',
                },
                date: {
                  type: 'string',
                  description: 'Date de la dépense au format ISO YYYY-MM-DD (optionnel, défaut: aujourd\'hui)',
                },
                description: {
                  type: 'string',
                  description: 'Description de la dépense (optionnel)',
                },
              },
              required: ['montant'],
            },
          },
          {
            name: 'creer_pesee',
            description: "Enregistre une pesée d'animal. Utilise cette fonction quand l'utilisateur mentionne peser un porc.",
            parameters: {
              type: 'object',
              properties: {
                animal_code: {
                  type: 'string',
                  description: "Code de l'animal (ex: P001) (optionnel, requiert clarification si absent)",
                },
                poids: {
                  type: 'number',
                  description: 'Poids en kilogrammes (obligatoire)',
                },
                date: {
                  type: 'string',
                  description: 'Date de la pesée au format ISO YYYY-MM-DD (optionnel, défaut: aujourd\'hui)',
                },
                notes: {
                  type: 'string',
                  description: 'Notes supplémentaires (optionnel)',
                },
              },
              required: ['poids'],
            },
          },
          {
            name: 'obtenir_statistiques',
            description: "Obtient les statistiques du cheptel (nombre d'animaux, répartition, etc.). Utilise cette fonction pour les questions sur le nombre de porcs, le bilan du cheptel.",
            parameters: {
              type: 'object',
              properties: {
                periode: {
                  type: 'string',
                  description: 'Période pour les statistiques (optionnel: 7j, 30j, 90j, 1an)',
                },
              },
              required: [],
            },
          },
          {
            name: 'rechercher_animal',
            description: "Recherche un animal par son code ou nom. Utilise cette fonction quand l'utilisateur demande des informations sur un porc spécifique.",
            parameters: {
              type: 'object',
              properties: {
                code_ou_nom: {
                  type: 'string',
                  description: 'Code ou nom de l\'animal (obligatoire)',
                },
              },
              required: ['code_ou_nom'],
            },
          },
          {
            name: 'liste_animaux',
            description: "Liste les animaux actifs du cheptel. Utilise cette fonction quand l'utilisateur demande la liste des porcs.",
            parameters: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'repondre_question_elevage',
            description: "Répond à une question générale sur l'élevage porcin (conseils, explications, bonnes pratiques). Utilise cette fonction pour les questions théoriques ou de conseil.",
            parameters: {
              type: 'object',
              properties: {
                question: {
                  type: 'string',
                  description: 'La question posée par l\'utilisateur (obligatoire)',
                },
              },
              required: ['question'],
            },
          },
        ],
      },
    ];
  }


  /**
   * Construit le system prompt pour Gemini
   */
  private buildSystemPrompt(): string {
    const userName = this.context.userName || 'l\'éleveur';
    const currentDate = this.context.currentDate;
    
    // Formater la liste des animaux disponibles
    let listeAnimaux = 'Aucun animal disponible';
    if (this.context.availableAnimals && this.context.availableAnimals.length > 0) {
      const animauxList = this.context.availableAnimals.slice(0, 10).map((animal: any) => {
        const code = animal.code || animal.id || 'N/A';
        const nom = animal.nom ? ` (${animal.nom})` : '';
        const poids = animal.poids_kg ? ` - ${animal.poids_kg}kg` : '';
        return `- ${code}${nom}${poids}`;
      });
      listeAnimaux = animauxList.join('\n');
      if (this.context.availableAnimals.length > 10) {
        listeAnimaux += `\n... et ${this.context.availableAnimals.length - 10} autre(s)`;
      }
    }

    // Formater les dernières actions/transactions
    let dernieresActions = 'Aucune action récente';
    if (this.context.recentTransactions && this.context.recentTransactions.length > 0) {
      const actionsList = this.context.recentTransactions.slice(0, 5).map((tx: any) => {
        if (tx.acheteur && tx.montant) {
          return `- Vente: ${tx.montant} FCFA à ${tx.acheteur}`;
        } else if (tx.montant && tx.categorie) {
          return `- Dépense: ${tx.montant} FCFA (${tx.categorie})`;
        }
        return `- Action récente`;
      });
      dernieresActions = actionsList.join('\n');
    }

    return `Tu es Kouakou, l'assistant IA des éleveurs de porcs en Côte d'Ivoire. Tu parles français ivoirien simple avec tutoiement.

TON RÔLE :
- Aider à gérer l'élevage (ventes, dépenses, pesées, vaccinations)
- Donner des conseils sur l'élevage porcin
- Répondre aux questions techniques
- Être proactif et prévenant

CONTEXTE ACTUEL :
- Projet : ${this.context.projetId}
- Date du jour : ${currentDate}
- Animaux disponibles :
${listeAnimaux}
- Dernières actions :
${dernieresActions}

COMPORTEMENT :
1. Sois naturel et conversationnel, pas robotique
2. Si l'utilisateur demande une action, utilise les fonctions disponibles
3. Si info manquante, demande naturellement (ex: "Quel montant pour cette vente ?")
4. Confirme les actions importantes (ventes >100k, suppressions)
5. Donne des insights utiles (ex: "Cette vente porte ton CA du mois à X")
6. Utilise des emojis occasionnellement 🐷💰📊
7. Sois bref, sauf si détails demandés

EXEMPLES :
User: "j'ai vendu un porc"
Toi: "Super ! 🎉 C'est pour quel montant cette vente ?"

User: "50000 à Jean"
Toi: [appelle creer_vente] "Parfait ! Vente de 50 000 FCFA à Jean enregistrée. Ton CA du jour est maintenant à X. 💰"

User: "comment traiter la peste porcine ?"
Toi: [appelle repondre_question_elevage] puis donne une réponse détaillée avec sources

IMPORTANT : Utilise TOUJOURS les fonctions quand l'action le permet. Ne dis jamais "je ne peux pas faire ça" si une fonction existe.`;
  }

  /**
   * Envoie un message à l'agent et reçoit une réponse
   */
  async sendMessage(userMessage: string): Promise<string> {
    try {
      // Réinitialiser les appels de fonctions pour ce message (pour tracking)
      this.lastFunctionCalls = [];
      
      // Ajouter le message utilisateur à l'historique
      this.conversationHistory.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });

      // Préparer les contenus pour l'API
      // IMPORTANT: Gemini exige que l'historique soit propre et complet
      // On envoie l'historique complet (pas de slice) pour maintenir la cohérence
      // Gemini gère automatiquement le contexte avec l'historique complet
      const contents = this.conversationHistory;

      // Faire l'appel via le backend (qui proxy vers Gemini)
      // La clé API est sécurisée côté backend (process.env.GEMINI_API_KEY)
      const data = await apiClient.post<{
          candidates?: Array<{
            content?: {
              parts?: Array<{
                text?: string;
                functionCall?: {
                  name: string;
                  args: Record<string, unknown>;
                };
              }>;
            };
          }>;
        }>('/kouakou/chat', {
          contents: contents,
          tools: this.getTools(),
          system_instruction: {
            parts: [{ text: this.buildSystemPrompt() }],
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        });
        const candidate = data.candidates?.[0];
        const content = candidate?.content;

        if (!content) {
          throw new Error('Aucune réponse de Gemini');
        }

        // Vérifier si Gemini veut appeler une fonction
        const functionCalls = content.parts?.filter(part => part.functionCall) || [];

        if (functionCalls.length > 0) {
        // Gemini veut appeler une ou plusieurs fonctions
        const functionResponses: Array<{
          name: string;
          response: unknown;
        }> = [];

        for (const part of functionCalls) {
          const functionCall = part.functionCall!;
          const functionName = functionCall.name;
          const args = functionCall.args || {};

          logger.debug(`[GeminiConversationalAgent] Appel fonction: ${functionName}`, args);
          this.lastFunctionCalls.push(functionName);

          // Exécuter la fonction via executeFromFunctionCall
          try {
            const result = await (this.actionExecutor as any).executeFromFunctionCall(
              functionName,
              args,
              this.context
            );

            // Formater la réponse pour Gemini
            const formattedResponse: Record<string, unknown> = {
              success: result.success,
              message: result.message,
            };

            if (result.data) {
              formattedResponse.data = result.data;
            }

            if (result.error) {
              formattedResponse.error = result.error;
            }

            functionResponses.push({
              name: functionName,
              response: formattedResponse,
            });
          } catch (error) {
            logger.error(`[GeminiConversationalAgent] Erreur exécution fonction ${functionName}:`, error);
            functionResponses.push({
              name: functionName,
              response: {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur inconnue',
              },
            });
          }
        }

        // Ajouter les function calls et responses à l'historique
        const functionCallContent: GeminiContent = {
          role: 'model',
          parts: functionCalls.map(part => ({
            functionCall: part.functionCall,
          })),
        };
        this.conversationHistory.push(functionCallContent);

        const functionResponseContent: GeminiContent = {
          role: 'function',
          parts: functionResponses.map(fr => ({
            functionResponse: {
              name: fr.name,
              response: fr.response,
            },
          })),
        };
        this.conversationHistory.push(functionResponseContent);

        // Faire un second appel à Gemini via le backend pour générer la réponse naturelle
        // IMPORTANT: On envoie l'historique complet (qui contient maintenant user + model(functionCall) + function(response))
        // Gemini va générer la réponse textuelle finale
        // Pas besoin de tools dans le second appel (Gemini génère juste du texte)
        const finalData = await apiClient.post<{
          candidates?: Array<{
            content?: {
              parts?: Array<{
                text?: string;
              }>;
            };
          }>;
        }>('/kouakou/chat', {
          contents: this.conversationHistory, // Historique complet
          system_instruction: {
            parts: [{ text: this.buildSystemPrompt() }],
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
          // Pas de tools dans le second appel (Gemini génère juste du texte)
        });
        const finalCandidate = finalData.candidates?.[0];
        const finalText = finalCandidate?.content?.parts?.[0]?.text;

        if (!finalText) {
          throw new Error('Aucune réponse texte de Gemini après exécution fonction');
        }

        // Ajouter la réponse finale à l'historique
        this.conversationHistory.push({
          role: 'model',
          parts: [{ text: finalText }],
        });

        return finalText;
      } else {
        // Gemini répond directement sans appeler de fonction
        const text = content.parts?.[0]?.text;

        if (!text) {
          throw new Error('Aucune réponse texte de Gemini');
        }

        // Ajouter la réponse à l'historique
        this.conversationHistory.push({
          role: 'model',
          parts: [{ text }],
        });

        return text;
      }
    } catch (error) {
      logger.error('[GeminiConversationalAgent] Erreur sendMessage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return `Désolé, j'ai rencontré une erreur : ${errorMessage}. Peux-tu réessayer ?`;
    }
  }

  /**
   * Réinitialise l'historique de conversation
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Récupère l'historique de conversation
   */
  getHistory(): GeminiContent[] {
    return [...this.conversationHistory];
  }

  /**
   * Récupère les dernières fonctions appelées (pour debugging/testing)
   */
  getLastFunctionCalls(): string[] {
    return [...this.lastFunctionCalls];
  }

  /**
   * Réinitialise l'historique des appels de fonctions
   */
  clearLastFunctionCalls(): void {
    this.lastFunctionCalls = [];
  }
}

