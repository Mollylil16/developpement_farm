import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FinanceService } from '../finance/finance.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';

type GeminiRole = 'user' | 'model' | 'function';

interface GeminiFunctionCall {
  name: string;
  args?: Record<string, unknown> | string;
}

interface GeminiFunctionResponsePart {
  name: string;
  response: unknown;
}

interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: GeminiFunctionResponsePart;
}

interface GeminiContent {
  role: GeminiRole;
  parts: GeminiPart[];
}

interface ChatAgentFunctionRequest {
  message: string;
  history?: GeminiContent[];
  projectId: string;
  generationConfig?: Record<string, unknown>;
  conversationId?: string;
}

export interface ExecutedActionMetadata {
  name: string;
  args: Record<string, unknown>;
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
  durationMs?: number;
}

interface FunctionExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

interface TransactionFilter {
  type?: 'expense' | 'revenue';
  category?: string;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

interface TransactionView {
  id: string;
  type: 'expense' | 'revenue';
  amount: number;
  category: string;
  description?: string;
  date: string;
}

interface StreamEmitters {
  onTextChunk?: (payload: { text: string }) => void;
  onFunctionCall?: (payload: { name: string; args: Record<string, unknown> }) => void;
  onFunctionResult?: (
    payload: { name: string; args: Record<string, unknown>; result: FunctionExecutionResult }
  ) => void;
}

@Injectable()
export class ChatAgentService {
  private readonly logger = new Logger(ChatAgentService.name);
  private readonly geminiApiKey: string;
  private readonly geminiApiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
  private readonly geminiStreamApiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?alt=sse';
  private readonly geminiRequestTimeoutMs = 30_000;
  private readonly defaultGenerationConfig = {
    temperature: 0.7,
    maxOutputTokens: 1024,
  };
  private readonly toolDeclarations = [
    {
      name: 'create_expense',
      description:
        'Crée une dépense ponctuelle pour le projet actif. Utilise cette fonction lorsqu’un utilisateur mentionne un achat, une facture ou une dépense.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Montant de la dépense en FCFA',
          },
          category: {
            type: 'string',
            description:
              'Catégorie (ex: alimentation, medicaments, veterinaire, equipements, salaires, entretien, autre)',
          },
          description: {
            type: 'string',
            description: 'Notes ou contexte sur la dépense',
          },
          date: {
            type: 'string',
            description: 'Date ISO (YYYY-MM-DD). Défaut: date du jour.',
          },
        },
        required: ['amount', 'category', 'description'],
      },
    },
    {
      name: 'create_revenue',
      description:
        'Crée un revenu (vente, subvention, prestation). Utilise cette fonction pour enregistrer tout encaissement.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Montant reçu en FCFA',
          },
          source: {
            type: 'string',
            description: 'Origine du revenu (ex: vente de porcs, subvention, location, fumier, etc.)',
          },
          description: {
            type: 'string',
            description: 'Détails supplémentaires (acheteur, quantité, remarques…)',
          },
          date: {
            type: 'string',
            description: 'Date ISO (YYYY-MM-DD). Défaut: date du jour.',
          },
        },
        required: ['amount', 'source', 'description'],
      },
    },
    {
      name: 'get_transactions',
      description:
        'Récupère les transactions du projet (revenus et dépenses) avec possibilité de filtrer.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'object',
            description: 'Filtres optionnels',
            properties: {
              type: {
                type: 'string',
                description: 'Filtrer par type: expense ou revenue',
              },
              category: {
                type: 'string',
                description: 'Filtrer par catégorie',
              },
              dateRange: {
                type: 'object',
                description: 'Plage de dates (format ISO YYYY-MM-DD)',
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    {
      name: 'modify_transaction',
      description:
        'Modifie une transaction existante à partir de son identifiant (revenu ou dépense).',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Identifiant de la transaction (ex: depense_..., revenu_...)',
          },
          updates: {
            type: 'object',
            description: 'Champs à mettre à jour',
            properties: {
              amount: { type: 'number' },
              category: { type: 'string' },
              description: { type: 'string' },
              date: { type: 'string' },
              source: { type: 'string' },
            },
          },
        },
        required: ['id', 'updates'],
      },
    },
    {
      name: 'search_knowledge_base',
      description:
        'Recherche des articles dans la base de connaissances (conseils techniques, bonnes pratiques).',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Question ou mots-clés à rechercher',
          },
          category: {
            type: 'string',
            description: 'Catégorie spécifique (optionnel)',
          },
          limit: {
            type: 'number',
            description: 'Nombre maximal de résultats (entre 1 et 10)',
          },
        },
        required: ['query'],
      },
    },
  ];
  private readonly allowedFunctionNames = new Set(
    this.toolDeclarations.map((declaration) => declaration.name),
  );

  constructor(
    private readonly configService: ConfigService,
    private readonly financeService: FinanceService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {
    this.geminiApiKey =
      this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    
    if (!this.geminiApiKey) {
      this.logger.warn('GEMINI_API_KEY non configurée. Le service chat-agent ne fonctionnera pas.');
    }
  }

  async handleFunctionCallingMessage(
    request: ChatAgentFunctionRequest,
    user: { id: string; email?: string; roles?: string[] },
  ): Promise<{
    response: string;
    metadata: { model: string; executedActions: ExecutedActionMetadata[] };
  }> {
    if (!request?.message || typeof request.message !== 'string' || !request.message.trim()) {
      throw new BadRequestException('message est requis');
    }

    if (!request.projectId) {
      throw new BadRequestException('projectId est requis');
    }

    if (!this.geminiApiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY non configurée');
    }

    const sanitizedMessage = this.sanitizeUserInput(request.message);
    if (!sanitizedMessage) {
      throw new BadRequestException('message invalide');
    }

    const sanitizedHistory = this.sanitizeHistory(request.history);
    const conversation: GeminiContent[] = [...sanitizedHistory];

    conversation.push({
      role: 'user',
      parts: [{ text: sanitizedMessage }],
    });

    const systemInstruction = {
      parts: [{ text: this.buildSystemPrompt(user.email) }],
    };

    const generationConfig = request.generationConfig || this.defaultGenerationConfig;

    const firstResponse = await this.callGemini({
      contents: conversation,
      tools: [
        {
          function_declarations: this.toolDeclarations,
        },
      ],
      system_instruction: systemInstruction,
      generationConfig,
    });

    const firstCandidate = firstResponse?.candidates?.[0];
    const firstParts: GeminiPart[] = firstCandidate?.content?.parts || [];
    const functionCalls = firstParts.filter((part) => part.functionCall);
    const executedActions: ExecutedActionMetadata[] = [];

    if (functionCalls.length === 0) {
      const reply = this.extractTextFromParts(firstParts);
      if (!reply) {
        throw new ServiceUnavailableException('Aucune réponse de Gemini');
      }
      return {
        response: reply,
        metadata: {
          model: 'gemini-2.0-flash-exp',
          executedActions,
        },
      };
    }

    const functionResponseParts: GeminiPart[] = [];

    for (const callPart of functionCalls) {
      const functionCall = callPart.functionCall!;
      const args = this.parseFunctionArgs(functionCall.args);
      const start = Date.now();
      const executionResult = await this.executeFunctionCall(
        functionCall.name,
        args,
        request.projectId,
        user.id,
      );

      executedActions.push({
        name: functionCall.name,
        args,
        success: executionResult.success,
        message: executionResult.message,
        data: executionResult.data,
        error: executionResult.error,
        durationMs: Date.now() - start,
      });

      functionResponseParts.push({
        functionResponse: {
          name: functionCall.name,
          response: executionResult,
        },
      });
    }

    conversation.push({
      role: 'model',
      parts: functionCalls.map((call) => ({
        functionCall: call.functionCall,
      })),
    });

    conversation.push({
      role: 'function',
      parts: functionResponseParts,
    });

    const followUpResponse = await this.callGemini({
      contents: conversation,
      system_instruction: systemInstruction,
      generationConfig,
    });

    const finalParts: GeminiPart[] =
      followUpResponse?.candidates?.[0]?.content?.parts || [];
    const finalText = this.extractTextFromParts(finalParts);

    if (!finalText) {
      throw new ServiceUnavailableException(
        'Aucune réponse générée après exécution des fonctions',
      );
    }

    return {
      response: finalText,
      metadata: {
        model: 'gemini-2.0-flash-exp',
        executedActions,
      },
    };
  }

  async streamResponse(
    request: ChatAgentFunctionRequest,
    user: { id: string; email?: string; roles?: string[] },
    emitters: StreamEmitters,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!request?.message || typeof request.message !== 'string' || !request.message.trim()) {
      throw new BadRequestException('message est requis');
    }
    if (!request.projectId) {
      throw new BadRequestException('projectId est requis');
    }
    if (!this.geminiApiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY non configurée');
    }

    const safeEmitters = emitters || {};
    const sanitizedMessage = this.sanitizeUserInput(request.message);
    if (!sanitizedMessage) {
      throw new BadRequestException('message invalide');
    }

    const sanitizedHistory = this.sanitizeHistory(request.history);
    const conversation: GeminiContent[] = [...sanitizedHistory];
    conversation.push({
      role: 'user',
      parts: [{ text: sanitizedMessage }],
    });

    const systemInstruction = {
      parts: [{ text: this.buildSystemPrompt(user.email) }],
    };
    const generationConfig = request.generationConfig || this.defaultGenerationConfig;

    const maxIterations = 3;
    let allowTools = true;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const { functionCalls, streamedParts } = await this.streamModelIteration(
        {
          contents: conversation,
          system_instruction: systemInstruction,
          generationConfig,
          tools: allowTools ? [{ function_declarations: this.toolDeclarations }] : undefined,
        },
        safeEmitters,
        signal,
      );

      if (streamedParts.length > 0) {
        conversation.push({
          role: 'model',
          parts: streamedParts,
        });
      }

      if (!functionCalls.length) {
        return;
      }

      const functionResponses: GeminiPart[] = [];
      for (const functionCall of functionCalls) {
        const parsedArgs = this.parseFunctionArgs(functionCall.args);

        const result = await this.executeFunctionCall(
          functionCall.name,
          parsedArgs,
          request.projectId,
          user.id,
        );

            safeEmitters.onFunctionResult?.({
          name: functionCall.name,
          args: parsedArgs,
          result,
        });

        functionResponses.push({
          functionResponse: {
            name: functionCall.name,
            response: result,
          },
        });
      }

      if (functionResponses.length > 0) {
        conversation.push({
          role: 'function',
          parts: functionResponses,
        });
      }

      allowTools = false;
    }

    throw new ServiceUnavailableException(
      'Cycle de function calling trop long. Réessayez avec une demande plus précise.',
    );
  }

  private async streamModelIteration(
    payload: Record<string, unknown>,
    emitters: StreamEmitters,
    signal?: AbortSignal,
  ): Promise<{ functionCalls: GeminiFunctionCall[]; streamedParts: GeminiPart[] }> {
    const collectedFunctionCalls: GeminiFunctionCall[] = [];
    const streamedParts: GeminiPart[] = [];

    await this.streamGemini(
      payload,
      async (chunk) => {
        if (chunk?.error) {
          throw new BadRequestException(chunk.error?.message || 'Erreur Gemini (streaming)');
        }
        const candidates = Array.isArray(chunk?.candidates) ? chunk.candidates : [];
        if (!candidates.length) {
          return;
        }

        const parts: GeminiPart[] = candidates[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.text) {
            streamedParts.push({ text: part.text });
            emitters.onTextChunk?.({ text: part.text });
          }

          if (part.functionCall?.name) {
            const fnCall: GeminiFunctionCall = {
              name: part.functionCall.name,
              args: part.functionCall.args,
            };
            collectedFunctionCalls.push(fnCall);
            streamedParts.push({ functionCall: fnCall });

            const parsedArgs = this.parseFunctionArgs(fnCall.args);
            emitters.onFunctionCall?.({
              name: fnCall.name,
              args: parsedArgs,
            });
          }
        }
      },
      signal,
    );

    return { functionCalls: collectedFunctionCalls, streamedParts };
  }

  private async streamGemini(
    payload: Record<string, unknown>,
    onChunk: (chunk: any) => Promise<void> | void,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!this.geminiApiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY non configurée');
    }

    const requestPayload: Record<string, unknown> = { ...payload };
    
    // ✅ Ajouter la recherche Google aux tools (si tools présents)
    if (requestPayload.tools && Array.isArray(requestPayload.tools)) {
      const tools = [...requestPayload.tools];
      const hasGoogleSearch = tools.some((tool: any) => tool.google_search_retrieval);
      if (!hasGoogleSearch) {
        tools.push({
          google_search_retrieval: {
            dynamic_retrieval_config: {
              mode: 'MODE_DYNAMIC',
              dynamic_threshold: 0.7,
            },
          },
        });
        requestPayload.tools = tools;
      }
    } else if (!requestPayload.tools) {
      // Si pas de tools, ajouter seulement google_search_retrieval
      requestPayload.tools = [
        {
          google_search_retrieval: {
            dynamic_retrieval_config: {
              mode: 'MODE_DYNAMIC',
              dynamic_threshold: 0.7,
            },
          },
        },
      ];
    }

    const streamUrl = `${this.geminiStreamApiUrl}&key=${this.geminiApiKey}`;

    const { signal: abortSignal, clear } = this.createTimeoutController(signal);
    try {
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: abortSignal,
      });

      if (!response.ok) {
        this.logger.error(`Erreur stream Gemini: ${response.status}`);
        throw new BadRequestException('Erreur Gemini (streaming)');
      }

      if (!response.body) {
        throw new ServiceUnavailableException('Flux Gemini indisponible');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const processEvent = async (rawEvent: string) => {
        if (!rawEvent || !rawEvent.trim()) {
          return;
        }

        const lines = rawEvent.split('\n');
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const content = line.slice(5).trim();
            if (content === '' || content === '[DONE]') {
              continue;
            }
            dataLines.push(content);
          }
        }

        if (!dataLines.length) {
          return;
        }

        const payloadText = dataLines.join('\n');
        try {
          const parsed = JSON.parse(payloadText);
          await onChunk(parsed);
        } catch (error) {
          this.logger.warn('Chunk SSE Gemini non parsable', error);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.length > 0) {
            await processEvent(buffer);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        let separatorIndex: number;
        while ((separatorIndex = buffer.indexOf('\n\n')) >= 0) {
          const rawEvent = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);
          await processEvent(rawEvent);
        }
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        this.logger.debug('Streaming Gemini interrompu (client déconnecté)');
        return;
      }
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Erreur lors du streaming Gemini: ${message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException('Erreur lors de la communication avec Gemini (stream)');
    } finally {
      clear();
    }
  }

  /**
   * Proxie un appel à l'API Gemini
   * @param payload - Payload complet pour l'API Gemini
   * @returns Réponse de l'API Gemini
   */
  async callGemini(payload: {
    contents: any[];
    tools?: any[];
    system_instruction?: any;
    generationConfig?: any;
  }): Promise<any> {
    if (!this.geminiApiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY non configurée');
    }

    const { signal, clear } = this.createTimeoutController();
    try {
      // ✅ Construire les tools avec recherche Google
      const tools = payload.tools ? [...payload.tools] : [];
      
      // ✅ Ajouter la recherche Google (si pas déjà présente)
      const hasGoogleSearch = tools.some(tool => tool.google_search_retrieval);
      if (!hasGoogleSearch) {
        tools.push({
          google_search_retrieval: {
            dynamic_retrieval_config: {
              mode: 'MODE_DYNAMIC',
              dynamic_threshold: 0.7,
            },
          },
        });
      }
      
      // Construire le payload final avec tools modifiés
      const finalPayload = {
        ...payload,
        tools: tools.length > 0 ? tools : undefined,
      };
      
      this.logger.debug('[ChatAgent] 🌐 Outils Gemini activés:', {
        functionCalling: payload.tools?.length || 0,
        googleSearch: true,
        totalTools: tools.length,
      });
      
      const response = await fetch(`${this.geminiApiUrl}?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalPayload),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorSummary = errorData?.error?.status || response.statusText || 'Unknown';
        this.logger.error(`Erreur API Gemini: ${response.status} - ${errorSummary}`);
        throw new BadRequestException(
          `Erreur Gemini: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Erreur lors de l'appel Gemini: ${message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException('Erreur lors de la communication avec Gemini');
    } finally {
      clear();
    }
  }

  private createTimeoutController(
    externalSignal?: AbortSignal,
  ): { signal: AbortSignal; clear: () => void } {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.geminiRequestTimeoutMs);

    let removeExternalListener: (() => void) | undefined;

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        const abortHandler = () => controller.abort();
        externalSignal.addEventListener('abort', abortHandler);
        removeExternalListener = () => externalSignal.removeEventListener('abort', abortHandler);
      }
    }

    const clear = () => {
      clearTimeout(timeoutId);
      removeExternalListener?.();
    };

    return {
      signal: controller.signal,
      clear,
    };
  }

  private sanitizeUserInput(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .replace(/<[^>]+>/g, '')
      .trim()
      .slice(0, 4000);
  }

  private sanitizeHistory(history?: GeminiContent[]): GeminiContent[] {
    if (!Array.isArray(history)) {
      return [];
    }

    return history
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const role = entry.role as GeminiRole;
        if (!['user', 'model', 'function'].includes(role)) {
          return null;
        }

        if (!Array.isArray(entry.parts)) {
          return null;
        }

        const sanitizedParts = entry.parts.reduce<GeminiPart[]>((acc, part) => {
          if (part?.text && typeof part.text === 'string') {
            acc.push({ text: this.sanitizeUserInput(part.text) });
            return acc;
          }

          if (part?.functionCall?.name) {
            acc.push({
              functionCall: {
                name: part.functionCall.name,
                args: part.functionCall.args,
              },
            });
            return acc;
          }

          if (part?.functionResponse?.name) {
            acc.push({
              functionResponse: {
                name: part.functionResponse.name,
                response: part.functionResponse.response,
              },
            });
          }

          return acc;
        }, []);

        if (!sanitizedParts.length) {
          return null;
        }

        return {
          role,
          parts: sanitizedParts,
        };
      })
      .filter((entry): entry is GeminiContent => Boolean(entry));
  }

  private buildSystemPrompt(userEmail?: string): string {
    // Pour compatibilité, on appelle buildSystemInstruction sans contexte projet détaillé
    // Le contexte projet peut être ajouté plus tard si nécessaire
    return this.buildSystemInstruction();
  }

  private buildSystemInstruction(projectContext?: {
    projectId: string;
    projectName?: string;
    totalAnimals?: number;
    userId: string;
  }): string {
    const contextInfo = projectContext
      ? `
**CONTEXTE DU PROJET :**
- Projet : ${projectContext.projectName || 'Non spécifié'}
- Nombre d'animaux : ${projectContext.totalAnimals || 0}
- ID Projet : ${projectContext.projectId}
- ID Utilisateur : ${projectContext.userId}
`
      : '';

    return `Tu es Kouakou, assistant intelligent spécialisé dans la gestion d'élevage porcin en Afrique de l'Ouest.

${contextInfo}

# TES CAPACITÉS

## 1. RECHERCHE D'INFORMATIONS (Priorité : TOUJOURS chercher si incertain)

**Quand chercher en ligne :**
- Prix du marché (porc, aliment, médicaments)
- Informations récentes sur l'élevage
- Réglementations locales
- Vétérinaires ou fournisseurs dans une région
- Conseils techniques que tu ne connais pas avec certitude
- Tout ce qui nécessite des données actualisées

**Exemples :**
- "Quel est le prix du porc au Bénin ?" → 🌐 CHERCHE EN LIGNE
- "Trouve-moi des vétérinaires à Abidjan" → 🌐 CHERCHE EN LIGNE
- "Quel est le prix de l'aliment actuellement ?" → 🌐 CHERCHE EN LIGNE

## 2. ACTIONS SUR LES DONNÉES (Utilise les fonctions disponibles)

**Quand utiliser les fonctions :**
- L'utilisateur veut ENREGISTRER quelque chose (dépense, revenu, vaccination, etc.)
- L'utilisateur veut CONSULTER ses données (bilan, animaux, statistiques)
- L'utilisateur veut MODIFIER ou SUPPRIMER quelque chose
- L'utilisateur veut METTRE EN VENTE un animal

**Exemples :**
- "J'ai dépensé 50000 FCFA pour l'aliment" → 🔧 create_expense()
- "Montre-moi mon bilan financier" → 🔧 get_financial_summary()
- "Mets mon porc en vente" → 🔧 create_marketplace_listing()

**IMPORTANT :** Toujours extraire TOUS les paramètres nécessaires du message de l'utilisateur.

## 3. CONSEILS ET FORMATION (Utilise tes connaissances + recherche)

**Quand donner des conseils :**
- Questions sur l'alimentation, la santé, la reproduction
- Bonnes pratiques d'élevage
- Problèmes courants et solutions

**Approche :**
1. Utilise tes connaissances de base
2. Si besoin de données récentes/locales → 🌐 CHERCHE EN LIGNE
3. Donne des conseils pratiques et actionnables

**Exemples :**
- "Comment améliorer la croissance de mes porcs ?" → Conseils + recherche si besoin
- "Mon porc est malade, que faire ?" → Conseils + cherche vétérinaires locaux

## 4. CONVERSATION NATURELLE

**Reste conversationnel et amical :**
- Salutations : "Bonjour ! Comment puis-je vous aider aujourd'hui ?"
- Remerciements : "De rien, je suis là pour vous aider !"
- Clarifications : Si tu ne comprends pas, demande des précisions

# RÈGLES IMPORTANTES

1. **PRIORITÉ À LA RECHERCHE WEB** : En cas de doute, CHERCHE EN LIGNE
2. **TOUJOURS extraire les paramètres** : Ne demande pas si l'info est dans le message
3. **SOIS PRÉCIS** : Donne des montants, dates, noms exacts
4. **ADAPTE-TOI AU CONTEXTE** : Utilise les infos du projet
5. **RESTE PROFESSIONNEL** : Tu es un expert en élevage

# FORMAT DE RÉPONSE

- **Pour les recherches** : Cite tes sources et donne des infos récentes
- **Pour les actions** : Confirme ce qui a été fait et donne un résumé
- **Pour les conseils** : Sois structuré (utilise des listes, des étapes)

# EXEMPLE DE CONVERSATION

User: "Quel est le prix du porc au Bénin actuellement ?"
Assistant: [Recherche en ligne] D'après les dernières informations trouvées, le prix du porc au Bénin est actuellement de 2200-2500 FCFA/kg pour le poids vif. Les prix varient selon les régions et la saison.

User: "J'ai dépensé 75000 FCFA pour acheter de l'aliment hier"
Assistant: [Appel create_expense avec montant=75000, categorie="aliment", date="2026-01-16"] ✅ J'ai enregistré votre dépense de 75 000 FCFA pour l'aliment en date du 16 janvier 2026.

User: "Comment réduire mes coûts d'alimentation ?"
Assistant: Voici quelques stratégies pour réduire vos coûts d'alimentation :

1. **Acheter en gros** : Négociez avec les fournisseurs pour des remises sur volume
2. **Produire localement** : Cultivez du maïs ou manioc pour compléter
3. **Optimiser les rations** : Adaptez selon l'âge et le poids des animaux
4. **Comparer les prix** : Utilisez le marketplace pour comparer

Voulez-vous que je recherche les prix actuels des fournisseurs d'aliment dans votre région ?

---

Maintenant, aide l'utilisateur avec sa demande.`;
  }

  private extractTextFromParts(parts: GeminiPart[]): string | null {
    if (!Array.isArray(parts) || parts.length === 0) {
      return null;
    }

    const texts = parts
      .map((part) => (typeof part.text === 'string' ? part.text.trim() : null))
      .filter((text): text is string => Boolean(text));

    return texts.length ? texts.join('\n').trim() : null;
  }

  private parseFunctionArgs(rawArgs: GeminiFunctionCall['args']): Record<string, unknown> {
    if (!rawArgs) {
      return {};
    }

    if (typeof rawArgs === 'string') {
      try {
        return JSON.parse(rawArgs);
      } catch (error) {
        this.logger.warn('Impossible de parser les arguments JSON renvoyés par Gemini', error as Error);
        return {};
      }
    }

    return rawArgs;
  }

  private async executeFunctionCall(
    name: string,
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      if (!this.allowedFunctionNames.has(name)) {
        this.logger.warn(`Function call non autorisée: ${name}`);
        return {
          success: false,
          message: `La fonction "${name}" n'est pas autorisée.`,
          error: 'function_not_allowed',
        };
      }
      switch (name) {
        case 'create_expense':
          return await this.handleCreateExpense(args, projectId, userId);
        case 'create_revenue':
          return await this.handleCreateRevenue(args, projectId, userId);
        case 'get_transactions':
          return await this.handleGetTransactions(args, projectId, userId);
        case 'modify_transaction':
          return await this.handleModifyTransaction(args, userId);
        case 'search_knowledge_base':
          return await this.handleSearchKnowledgeBase(args, projectId);
        default:
          this.logger.warn(`Fonction inconnue demandée par Gemini: ${name}`);
          return {
            success: false,
            message: `La fonction "${name}" n'est pas disponible`,
            error: `fonction inconnue: ${name}`,
          };
      }
    } catch (error) {
      this.logger.error(`Erreur lors de l'exécution de ${name}`, error);
      return {
        success: false,
        message: `Erreur lors de l'exécution de ${name}`,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCreateExpense(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    const amount = this.normalizeAmount(args.amount);
    if (amount === null) {
      return {
        success: false,
        message: 'Montant invalide pour la dépense',
        error: 'amount invalide',
      };
    }

    const categoryInfo = this.mapExpenseCategory(args.category);
    const description =
      typeof args.description === 'string' && args.description.trim()
        ? args.description.trim()
        : 'Dépense enregistrée via Kouakou';
    const date = this.normalizeDateInput(args.date);

    const dto: Record<string, unknown> = {
      projet_id: projectId,
      montant: amount,
      categorie: categoryInfo.categorie,
      date,
      commentaire: description,
    };

    if (categoryInfo.libelle_categorie) {
      dto.libelle_categorie = categoryInfo.libelle_categorie;
    }

    const depense = await this.financeService.createDepensePonctuelle(dto as any, userId);

    return {
      success: true,
      message: `Dépense de ${amount.toLocaleString('fr-FR')} FCFA enregistrée`,
      data: depense,
    };
  }

  private async handleCreateRevenue(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    const amount = this.normalizeAmount(args.amount);
    if (amount === null) {
      return {
        success: false,
        message: 'Montant invalide pour le revenu',
        error: 'amount invalide',
      };
    }

    const source =
      typeof args.source === 'string' && args.source.trim()
        ? args.source.trim()
        : 'vente';
    const description =
      typeof args.description === 'string' && args.description.trim()
        ? args.description.trim()
        : `Revenu: ${source}`;
    const date = this.normalizeDateInput(args.date);
    const categoryInfo = this.mapRevenueCategory(source);

    const dto: Record<string, unknown> = {
      projet_id: projectId,
      montant: amount,
      categorie: categoryInfo.categorie,
      date,
      description,
    };

    if (categoryInfo.libelle_categorie) {
      dto.libelle_categorie = categoryInfo.libelle_categorie;
    }

    const revenu = await this.financeService.createRevenu(dto as any, userId);

    return {
      success: true,
      message: `Revenu de ${amount.toLocaleString('fr-FR')} FCFA enregistré`,
      data: revenu,
    };
  }

  private async handleGetTransactions(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    const filterInput =
      args && typeof args === 'object' && 'filter' in args
        ? (args as Record<string, unknown>).filter
        : undefined;
    const filter = this.parseTransactionFilter(filterInput);

    const expenses = await this.financeService.findAllDepensesPonctuelles(projectId, userId);
    const revenues = await this.financeService.findAllRevenus(projectId, userId);

    const transactions: TransactionView[] = [
      ...expenses.map((depense: any) => ({
        id: depense.id,
        type: 'expense' as const,
        amount: Number(depense.montant) || 0,
        category: depense.categorie || 'autre',
        description: depense.commentaire || depense.libelle_categorie || depense.categorie,
        date: depense.date,
      })),
      ...revenues.map((revenu: any) => ({
        id: revenu.id,
        type: 'revenue' as const,
        amount: Number(revenu.montant) || 0,
        category: revenu.categorie || 'vente_autre',
        description: revenu.description || revenu.libelle_categorie || revenu.categorie,
        date: revenu.date,
      })),
    ];

    const filtered = this.applyTransactionFilters(transactions, filter);

    const totalExpenses = filtered
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalRevenues = filtered
      .filter((tx) => tx.type === 'revenue')
      .reduce((sum, tx) => sum + tx.amount, 0);

    filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return {
      success: true,
      message: `J'ai trouvé ${filtered.length} transaction(s).`,
      data: {
        transactions: filtered,
        summary: {
          totalExpenses,
          totalRevenues,
          balance: totalRevenues - totalExpenses,
          appliedFilters: filter,
        },
      },
    };
  }

  private async handleModifyTransaction(
    args: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    const id = typeof args.id === 'string' ? args.id.trim() : '';
    if (!id) {
      return {
        success: false,
        message: 'Identifiant de transaction manquant',
        error: 'id requis',
      };
    }

    const updates =
      args.updates && typeof args.updates === 'object'
        ? (args.updates as Record<string, unknown>)
        : null;

    if (!updates || Object.keys(updates).length === 0) {
      return {
        success: false,
        message: 'Aucune mise à jour fournie',
        error: 'updates vides',
      };
    }

    if (id.startsWith('depense_')) {
      return this.updateExpenseTransaction(id, updates, userId);
    }
    if (id.startsWith('revenu_')) {
      return this.updateRevenueTransaction(id, updates, userId);
    }

    const typeHint = typeof updates.type === 'string' ? updates.type.toLowerCase() : '';
    if (typeHint.startsWith('dep') || typeHint.startsWith('exp')) {
      return this.updateExpenseTransaction(id, updates, userId);
    }
    if (
      typeHint.startsWith('rev') ||
      typeHint.startsWith('rec') ||
      typeHint.startsWith('inc')
    ) {
      return this.updateRevenueTransaction(id, updates, userId);
    }

    return {
      success: false,
      message: `Impossible d'identifier le type de transaction "${id}"`,
      error: 'type inconnu',
    };
  }

  private async handleSearchKnowledgeBase(
    args: Record<string, unknown>,
    projectId: string,
  ): Promise<FunctionExecutionResult> {
    const query = typeof args.query === 'string' ? args.query.trim() : '';
    if (!query) {
      return {
        success: false,
        message: 'La requête est obligatoire pour rechercher dans la base de connaissances',
        error: 'query manquant',
      };
    }

    const category =
      typeof args.category === 'string' && args.category.trim()
        ? args.category.trim()
        : undefined;
    const limit = this.coerceLimit(args.limit);

    try {
      const results = await this.knowledgeBaseService.search({
        query,
        category,
        projet_id: projectId,
        limit,
      });

      return {
        success: true,
        message: `${results.length} résultat(s) trouvé(s)`,
        data: results,
      };
    } catch (error) {
      this.logger.warn('search_knowledge_base: fallback sur searchSimple', error as Error);
      const results = await this.knowledgeBaseService.searchSimple(query, projectId, limit);
      return {
        success: true,
        message: `${results.length} résultat(s) trouvé(s)`,
        data: results,
      };
    }
  }

  private async updateExpenseTransaction(
    id: string,
    updates: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    const dto: Record<string, unknown> = {};

    if ('amount' in updates) {
      const amount = this.normalizeAmount(updates.amount);
      if (amount === null) {
        return {
          success: false,
          message: 'Montant invalide pour la dépense',
          error: 'amount invalide',
        };
      }
      dto.montant = amount;
    }

    if (updates.category) {
      const categoryInfo = this.mapExpenseCategory(updates.category);
      dto.categorie = categoryInfo.categorie;
      if (categoryInfo.libelle_categorie) {
        dto.libelle_categorie = categoryInfo.libelle_categorie;
      }
    }

    if (updates.description) {
      dto.commentaire = String(updates.description);
    }

    if (updates.date) {
      dto.date = this.normalizeDateInput(updates.date);
    }

    if (Object.keys(dto).length === 0) {
      return {
        success: false,
        message: 'Aucune donnée valide pour mettre à jour la dépense',
        error: 'updates invalides',
      };
    }

    const depense = await this.financeService.updateDepensePonctuelle(id, dto as any, userId);

    return {
      success: true,
      message: 'Dépense mise à jour avec succès',
      data: depense,
    };
  }

  private async updateRevenueTransaction(
    id: string,
    updates: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    const dto: Record<string, unknown> = {};

    if ('amount' in updates) {
      const amount = this.normalizeAmount(updates.amount);
      if (amount === null) {
        return {
          success: false,
          message: 'Montant invalide pour le revenu',
          error: 'amount invalide',
        };
      }
      dto.montant = amount;
    }

    if (updates.source || updates.category) {
      const categoryInfo = this.mapRevenueCategory(updates.source || updates.category);
      dto.categorie = categoryInfo.categorie;
      if (categoryInfo.libelle_categorie) {
        dto.libelle_categorie = categoryInfo.libelle_categorie;
      }
    }

    if (updates.description) {
      dto.description = String(updates.description);
    }

    if (updates.date) {
      dto.date = this.normalizeDateInput(updates.date);
    }

    if (Object.keys(dto).length === 0) {
      return {
        success: false,
        message: 'Aucune donnée valide pour mettre à jour le revenu',
        error: 'updates invalides',
      };
    }

    const revenu = await this.financeService.updateRevenu(id, dto as any, userId);

    return {
      success: true,
      message: 'Revenu mis à jour avec succès',
      data: revenu,
    };
  }

  private mapExpenseCategory(
    input: unknown,
  ): { categorie: string; libelle_categorie?: string } {
    const normalized = this.normalizeCategoryInput(input);
    if (!normalized) {
      return { categorie: 'autre' };
    }

    if (
      normalized.includes('aliment') ||
      normalized.includes('nourrit') ||
      normalized.includes('feed')
    ) {
      return { categorie: 'alimentation' };
    }
    if (normalized.includes('vaccin')) {
      return { categorie: 'vaccins' };
    }
    if (normalized.includes('medic') || normalized.includes('antibio')) {
      return { categorie: 'medicaments' };
    }
    if (normalized.includes('veto') || normalized.includes('soin')) {
      return { categorie: 'veterinaire' };
    }
    if (normalized.includes('entretien') || normalized.includes('nettoy')) {
      return { categorie: 'entretien' };
    }
    if (normalized.includes('equip') || normalized.includes('materiel')) {
      return { categorie: 'equipements' };
    }
    if (normalized.includes('batiment') || normalized.includes('construction')) {
      return { categorie: 'amenagement_batiment' };
    }
    if (normalized.includes('machine') || normalized.includes('tracteur') || normalized.includes('lourd')) {
      return { categorie: 'equipement_lourd' };
    }
    if (
      normalized.includes('achat') ||
      normalized.includes('porcelet') ||
      normalized.includes('reproducteur') ||
      normalized.includes('truie')
    ) {
      return { categorie: 'achat_sujet' };
    }

    return {
      categorie: 'autre',
      libelle_categorie:
        typeof input === 'string' && input.trim() ? input.trim() : undefined,
    };
  }

  private mapRevenueCategory(
    input: unknown,
  ): { categorie: string; libelle_categorie?: string } {
    const normalized = this.normalizeCategoryInput(input);
    if (!normalized) {
      return { categorie: 'autre' };
    }

    if (normalized.includes('porc') || normalized.includes('vente')) {
      return { categorie: 'vente_porc' };
    }
    if (
      normalized.includes('subvention') ||
      normalized.includes('aide') ||
      normalized.includes('don') ||
      normalized.includes('prime')
    ) {
      return { categorie: 'subvention' };
    }
    if (
      normalized.includes('fumier') ||
      normalized.includes('engrais') ||
      normalized.includes('service') ||
      normalized.includes('prestation') ||
      normalized.includes('location')
    ) {
      return { categorie: 'vente_autre' };
    }

    return {
      categorie: 'autre',
      libelle_categorie:
        typeof input === 'string' && input.trim() ? input.trim() : undefined,
    };
  }

  private normalizeCategoryInput(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private normalizeDateInput(value: unknown): string {
    if (typeof value === 'string' && value.trim()) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }

      const parts = value.trim().split(/[\/\-]/);
      if (parts.length === 3) {
        const [first, second, third] = parts;
        const isYearFirst = first.length === 4;
        const year = isYearFirst ? first : third.length === 4 ? third : `20${third}`;
        const month = isYearFirst ? second : first;
        const day = isYearFirst ? third : second;
        const fallback = new Date(
          `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        );
        if (!Number.isNaN(fallback.getTime())) {
          return fallback.toISOString().split('T')[0];
        }
      }
    }
    return new Date().toISOString().split('T')[0];
  }

  private normalizeAmount(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.round(value * 100) / 100;
    }
    if (typeof value === 'string') {
      const sanitized = Number(
        value.replace(/[^0-9,.-]/g, '').replace(',', '.'),
      );
      if (!Number.isNaN(sanitized)) {
        return Math.round(sanitized * 100) / 100;
      }
    }
    return null;
  }

  private parseTransactionFilter(rawFilter: unknown): TransactionFilter | undefined {
    if (!rawFilter || typeof rawFilter !== 'object') {
      return undefined;
    }

    const obj = rawFilter as Record<string, unknown>;
    const filter: TransactionFilter = {};

    if (typeof obj.type === 'string') {
      const normalized = obj.type.toLowerCase();
      if (normalized.startsWith('dep') || normalized.startsWith('exp')) {
        filter.type = 'expense';
      } else if (
        normalized.startsWith('rev') ||
        normalized.startsWith('rec') ||
        normalized.startsWith('inc')
      ) {
        filter.type = 'revenue';
      }
    }

    if (typeof obj.category === 'string' && obj.category.trim()) {
      filter.category = obj.category.trim();
    }

    if (obj.dateRange) {
      filter.dateRange = this.parseDateRange(obj.dateRange);
    }

    return Object.keys(filter).length ? filter : undefined;
  }

  private parseDateRange(value: unknown): { from?: string; to?: string } | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      const now = new Date();
      const from = new Date(now);

      if (normalized.includes('7')) {
        from.setDate(from.getDate() - 7);
      } else if (normalized.includes('30') || normalized.includes('mois')) {
        from.setDate(from.getDate() - 30);
      } else if (normalized.includes('90')) {
        from.setDate(from.getDate() - 90);
      } else {
        return undefined;
      }

      return {
        from: from.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      };
    }

    if (typeof value === 'object') {
      const range = value as Record<string, unknown>;
      const from = this.tryParseDate(range.from ?? range.start);
      const to = this.tryParseDate(range.to ?? range.end);
      if (from || to) {
        return { from, to };
      }
    }

    return undefined;
  }

  private tryParseDate(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return undefined;
  }

  private applyTransactionFilters(
    transactions: TransactionView[],
    filter?: TransactionFilter,
  ): TransactionView[] {
    if (!filter) {
      return [...transactions];
    }

    return transactions.filter((tx) => {
      if (filter.type && tx.type !== filter.type) {
        return false;
      }
      if (filter.category && tx.category !== filter.category) {
        return false;
      }
      if (filter.dateRange) {
        const txDate = new Date(tx.date);
        if (filter.dateRange.from) {
          const from = new Date(filter.dateRange.from);
          if (txDate < from) {
            return false;
          }
        }
        if (filter.dateRange.to) {
          const to = new Date(filter.dateRange.to);
          to.setHours(23, 59, 59, 999);
          if (txDate > to) {
            return false;
          }
        }
      }
      return true;
    });
  }

  private coerceLimit(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.min(Math.max(Math.round(value), 1), 10);
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return Math.min(Math.max(Math.round(parsed), 1), 10);
      }
    }
    return 5;
  }
}

