# 🐷 Code Complet de Kouakou - Référence Complète

**Version:** 5.1  
**Date:** 2026-01-17  
**Dernière mise à jour:** Après correction endpoints et logging

---

## 📋 Table des Matières

1. [Architecture Globale](#architecture-globale)
2. [Fichiers Frontend Principaux](#fichiers-frontend-principaux)
3. [Fichiers Backend Principaux](#fichiers-backend-principaux)
4. [Structure Complète des Fichiers](#structure-complète-des-fichiers)
5. [Flux de Données Détaillé](#flux-de-données-détaillé)

---

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React Native)                   │
├─────────────────────────────────────────────────────────────┤
│  UI Layer                                                    │
│  ├── ChatAgentScreen.tsx                                     │
│  └── useChatAgent.ts (Hook React)                            │
│                                                              │
│  Service Layer                                               │
│  ├── ChatAgentService.ts (Orchestrateur principal)          │
│  ├── AgentActionExecutor.ts (Exécuteur d'actions)          │
│  └── IntentDetector.ts (Détecteur fallback)                  │
│                                                              │
│  Core Layer                                                  │
│  ├── FastPathDetector.ts (Détection rapide)                 │
│  ├── IntentRAG.ts (Base de connaissances)                   │
│  ├── NaturalLanguageProcessor.ts (NLP)                      │
│  ├── EnhancedParameterExtractor.ts (Extraction)             │
│  ├── DataValidator.ts (Validation)                           │
│  ├── ConfirmationManager.ts (Confirmations)                  │
│  ├── ClarificationService.ts (Clarifications)                │
│  ├── LearningService.ts (Apprentissage)                      │
│  └── ConversationContext.ts (Contexte)                      │
│                                                              │
│  Actions Layer                                               │
│  ├── finance/ (DepenseActions, RevenuActions, etc.)          │
│  ├── marketplace/ (MarketplaceActions)                       │
│  ├── production/ (AnimalActions, PeseeActions)              │
│  ├── sante/ (VaccinationActions, TraitementActions)          │
│  └── knowledge/ (KnowledgeActions)                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS)                          │
├─────────────────────────────────────────────────────────────┤
│  API Layer                                                   │
│  ├── /kouakou/chat (ChatAgentController)                    │
│  │   └── ChatAgentService (Appel direct API Gemini REST)    │
│  └── /api/kouakou/chat (KouakouController)                  │
│      └── KouakouService → GeminiService (SDK)                │
│                                                              │
│  Services                                                     │
│  ├── ChatAgentService (Function calling, streaming)          │
│  ├── KouakouService (Simple chat)                            │
│  └── GeminiService (SDK Google Generative AI)               │
│                                                              │
│  Database                                                     │
│  ├── agent_learnings (Apprentissage persistant)              │
│  └── chat_agent_conversations (Historique)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Fichiers Frontend Principaux

### 1. ChatAgentService.ts (Orchestrateur Principal)

**Fichier:** `src/services/chatAgent/ChatAgentService.ts`

**Responsabilités:**
- Orchestration du pipeline de détection d'intention (3 niveaux)
- Extraction et validation des paramètres
- Exécution des actions via AgentActionExecutor
- Gestion des clarifications et confirmations
- Appel Gemini en fallback (position 2)

**Méthodes clés:**

```typescript
class ChatAgentService {
  // Initialisation
  async initializeContext(context: AgentContext, conversationId?: string): Promise<void>
  loadHistory(messages: ChatMessage[]): void
  
  // Pipeline principal
  async sendMessage(userMessage: string): Promise<ChatMessage> {
    // 1. Prétraitement NLP
    // 2. NIVEAU 1: FastPath + IntentRAG
    // 3. NIVEAU 2: Gemini (si confiance < 0.90)
    // 4. NIVEAU 3: Fallback KB/Default
    // 5. Extraction paramètres
    // 6. Validation
    // 7. Clarification
    // 8. Confirmation
    // 9. Exécution action
    // 10. Génération réponse
  }
  
  // Appel Gemini backend
  private async callBackendGemini(
    message: string,
    systemPrompt: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<string | null>
  
  // Extraction action depuis réponse Gemini
  private extractActionFromGeminiResponse(geminiResponse: string): GeminiParsedAction | null
  
  // Construction prompt système pour Gemini
  private buildGeminiSystemPrompt(): string
}
```

**Seuils de confiance:**
- `FASTPATH_THRESHOLD = 0.95` (cas évidents)
- `INTENTRAG_THRESHOLD = 0.90` (patterns connus)
- `GEMINI_THRESHOLD = 0.90` (appel Gemini si < 0.90)
- `MINIMUM_EXECUTION_CONFIDENCE = 0.85` (minimum pour exécuter)
- `KNOWLEDGE_BASE_THRESHOLD = 5` (pertinence KB)

---

### 2. FastPathDetector.ts (Détection Rapide)

**Fichier:** `src/services/chatAgent/core/FastPathDetector.ts`

**Responsabilités:**
- Détection ultra-rapide (< 20ms) des intentions courantes
- Patterns regex pour cas évidents
- Extraction de paramètres basiques

**Exemples de patterns:**

```typescript
static detectFastPath(message: string): FastPathResult {
  const normalized = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  // 0a. SALUTATIONS
  if (normalized.match(/^(?:bonjour|salut|hello|hi|bonsoir)\s*[!.?]*$/i)) {
    return {
      intent: { action: 'other', params: { isGreeting: true }, confidence: 1.0 },
      confidence: 1.0,
    };
  }
  
  // 0b. REMERCIEMENTS
  if (normalized.match(/^(?:merci|ok|okay|d'accord|parfait)\s*[!.?]*$/i)) {
    return {
      intent: { action: 'other', params: { isThankYou: true }, confidence: 1.0 },
      confidence: 1.0,
    };
  }
  
  // 1. PRIX DU MARCHÉ
  if (normalized.match(/\b(?:prix du marche|prix du marché|tendance.*prix|prix actuel)\b/i)) {
    return {
      intent: {
        action: 'marketplace_get_price_trends',
        confidence: 0.96,
        params: {},
      },
      confidence: 0.96,
    };
  }
  
  // 2. MISE EN VENTE MARKETPLACE
  if (normalized.match(/\b(?:mets|met|mettre)\b/i) && 
      normalized.match(/\b(?:porc|sujet)\b/i) && 
      normalized.match(/\b(?:loge|bande|enclos|marketplace|vente)\b/i)) {
    // Extraction logeName, weightRange, etc.
    return {
      intent: {
        action: 'marketplace_sell_animal',
        confidence: 0.96,
        params: { logeName, weightRange, ... },
      },
      confidence: 0.96,
    };
  }
  
  // 3. DÉPENSE
  const montantMatch = message.match(/(\d+[.,]?\d*)\s*(?:fcfa|f|francs?)/i);
  if (normalized.match(/\b(?:depense|j'ai depense|achete|paye)\b/i) && montantMatch) {
    return {
      intent: {
        action: 'create_depense',
        confidence: 0.95,
        params: { montant: parseFloat(montantMatch[1]) },
      },
      confidence: 0.95,
    };
  }
  
  // ... 50+ autres patterns
}
```

---

### 3. IntentRAG.ts (Base de Connaissances)

**Fichier:** `src/services/chatAgent/core/IntentRAG.ts`

**Responsabilités:**
- Base de connaissances avec 6000+ exemples
- Recherche sémantique (similarité Jaccard)
- Index inversé pour performance

**Structure:**

```typescript
interface TrainingExample {
  text: string;                    // "prix du marché"
  action: AgentActionType;         // "marketplace_get_price_trends"
  params: Record<string, unknown>;  // {}
  confidence: number;              // 0.95
}

// Base fusionnée (6000+ exemples)
const INTENT_KNOWLEDGE_BASE_COMPLETE = [
  ...INTENT_KNOWLEDGE_BASE,           // 440+ exemples manuels
  ...INTENT_KNOWLEDGE_BASE_GENERATED, // 5000+ exemples générés
  ...INTENT_KNOWLEDGE_BASE_LOCAL,     // 500+ exemples locaux
];

// Recherche avec index inversé
static async detectIntent(message: string): Promise<DetectedIntent | null> {
  const normalized = this.normalizeText(message);
  const words = normalized.split(/\s+/);
  
  // Recherche dans l'index inversé
  const candidates = this.searchInvertedIndex(words);
  
  // Calcul similarité Jaccard
  const scored = candidates.map(example => ({
    example,
    score: this.jaccardSimilarity(normalized, example.text),
  }));
  
  // Tri par score décroissant
  scored.sort((a, b) => b.score - a.score);
  
  const bestMatch = scored[0];
  if (bestMatch && bestMatch.score >= 0.70) {
    return {
      action: bestMatch.example.action,
      confidence: bestMatch.example.confidence * bestMatch.score,
      params: bestMatch.example.params,
    };
  }
  
  return null;
}
```

---

### 4. AgentActionExecutor.ts (Exécuteur d'Actions)

**Fichier:** `src/services/chatAgent/AgentActionExecutor.ts`

**Responsabilités:**
- Routage vers les actions spécifiques
- Exécution des actions métier
- Gestion des erreurs

**Structure:**

```typescript
class AgentActionExecutor {
  async execute(action: AgentAction, context: AgentContext): Promise<AgentActionResult> {
    switch (action.type) {
      // MARKETPLACE
      case 'marketplace_get_price_trends':
        return await MarketplaceActions.getPriceTrends(action.params, context);
      case 'marketplace_sell_animal':
        return await MarketplaceActions.sellAnimal(action.params, context);
      case 'marketplace_set_price':
        return await MarketplaceActions.setPrice(action.params, context);
      case 'marketplace_check_offers':
        return await MarketplaceActions.checkOffers(action.params, context);
      case 'marketplace_respond_offer':
        return await MarketplaceActions.respondToOffer(action.params, context);
      case 'marketplace_get_my_listings':
        return await MarketplaceActions.getMyListings(action.params, context);
      
      // FINANCE
      case 'create_depense':
        return await DepenseActions.createDepense(action.params, context);
      case 'create_revenu':
        return await RevenuActions.createRevenu(action.params, context);
      case 'create_charge_fixe':
        return await ChargeFixeActions.createChargeFixe(action.params, context);
      case 'get_bilan_financier':
        return await BilanActions.getBilanFinancier(action.params, context);
      case 'generate_graph_finances':
        return await FinanceGraphActions.generateGraph(action.params, context);
      
      // PRODUCTION
      case 'list_animals':
        return await AnimalActions.listAnimals(action.params, context);
      case 'search_animal':
        return await AnimalActions.searchAnimal(action.params, context);
      case 'create_pesee':
        return await PeseeActions.createPesee(action.params, context);
      
      // SANTÉ
      case 'create_vaccination':
        return await VaccinationActions.createVaccination(action.params, context);
      case 'create_traitement':
        return await TraitementActions.createTraitement(action.params, context);
      case 'create_visite_veterinaire':
        return await VisiteVetoActions.createVisiteVeterinaire(action.params, context);
      case 'get_reminders':
        return await VaccinationActions.getReminders(action.params, context);
      
      // CONNAISSANCES
      case 'answer_knowledge_question':
        return await KnowledgeActions.answerKnowledgeQuestion(action.params, context);
      case 'list_knowledge_topics':
        return await KnowledgeActions.listKnowledgeTopics(action.params, context);
      
      // STATISTIQUES
      case 'get_statistics':
        return await StatsActions.getStatistics(action.params, context);
      case 'get_animal_statistics':
        return await StatsActions.getAnimalStatistics(action.params, context);
      
      // AUTRES
      case 'other':
        return await this.handleOtherAction(action.params, context);
      
      default:
        return {
          success: false,
          message: `Action "${action.type}" non implémentée.`,
        };
    }
  }
}
```

---

### 5. useChatAgent.ts (Hook React)

**Fichier:** `src/hooks/useChatAgent.ts`

**Responsabilités:**
- Gestion de l'état de conversation
- Initialisation de ChatAgentService
- Gestion du refreshHint (rafraîchissement Redux)
- Gestion de la voix (optionnelle)

**Structure:**

```typescript
export function useChatAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const chatAgentServiceRef = useRef<ChatAgentService | null>(null);
  
  // Initialisation
  useEffect(() => {
    const chatAgentService = new ChatAgentService({ ... });
    await chatAgentService.initializeContext(agentContext, conversationId);
    chatAgentServiceRef.current = chatAgentService;
  }, [projetActif?.id, user?.id]);
  
  // Envoi message
  const sendMessage = useCallback(async (content: string) => {
    // 1. Ajouter message utilisateur à l'état
    // 2. Phase "thinking" (délai UX)
    // 3. Appel ChatAgentService.sendMessage()
    // 4. Gestion refreshHint (dispatch Redux)
    // 5. Ajouter réponse à l'état
  }, []);
  
  return {
    messages,
    isLoading,
    isThinking,
    sendMessage,
    // ...
  };
}
```

---

## 🔧 Fichiers Backend Principaux

### 1. ChatAgentController.ts (Endpoint Principal)

**Fichier:** `backend/src/chat-agent/chat-agent.controller.ts`

**Endpoint:** `POST /kouakou/chat`

**Caractéristiques:**
- ✅ Utilisé par le frontend
- ✅ Appel direct à l'API REST Gemini
- ✅ Support function calling (tools)
- ✅ Support streaming (`/kouakou/chat/stream`)
- ✅ Validation stricte de `projectId`

**Code:**

```typescript
@Controller('kouakou')
@UseGuards(JwtAuthGuard, KouakouRateLimitGuard)
export class ChatAgentController {
  @Post('chat')
  async chat(
    @Body() body: {
      message?: string;
      history?: any[];
      projectId?: string;
      projetId?: string;
      conversationId?: string;
      generationConfig?: Record<string, unknown>;
    },
    @Request() req: any,
  ) {
    // Validation
    if (!body?.message || typeof body.message !== 'string' || !body.message.trim()) {
      throw new BadRequestException('message est requis');
    }
    
    const projectId = body.projectId || body.projetId || req.user?.projetId;
    if (!projectId) {
      throw new BadRequestException('projectId est requis');
    }
    
    // Appel service avec function calling
    return this.chatAgentService.handleFunctionCallingMessage(
      {
        message: body.message,
        history: Array.isArray(body.history) ? body.history : undefined,
        projectId,
        generationConfig: body.generationConfig,
        conversationId: body.conversationId,
      },
      req.user,
    );
  }
}
```

---

### 2. ChatAgentService.ts (Backend - Function Calling)

**Fichier:** `backend/src/chat-agent/chat-agent.service.ts`

**Responsabilités:**
- Appel direct à l'API REST Gemini
- Gestion des function calls (tools)
- Exécution des fonctions métier
- Streaming des réponses

**Code clé:**

```typescript
@Injectable()
export class ChatAgentService {
  private readonly geminiApiKey: string;
  private readonly geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
  
  async handleFunctionCallingMessage(
    request: ChatAgentFunctionRequest,
    user: { id: string; email?: string; roles?: string[] },
  ): Promise<{
    response: string;
    metadata: { model: string; executedActions: ExecutedActionMetadata[] };
  }> {
    // 1. Construction conversation
    const conversation: GeminiContent[] = [...sanitizedHistory];
    conversation.push({
      role: 'user',
      parts: [{ text: sanitizedMessage }],
    });
    
    // 2. Appel Gemini avec tools
    const firstResponse = await this.callGemini({
      contents: conversation,
      tools: [{ function_declarations: this.toolDeclarations }],
      system_instruction: systemInstruction,
      generationConfig,
    });
    
    // 3. Traitement function calls
    const functionCalls = firstParts.filter((part) => part.functionCall);
    
    if (functionCalls.length > 0) {
      // Exécuter les fonctions
      const functionResults = await this.executeFunctions(functionCalls, request.projectId, user);
      
      // Réponse avec résultats
      conversation.push({
        role: 'function',
        parts: functionResults.map(result => ({
          functionResponse: {
            name: result.name,
            response: result.result,
          },
        })),
      });
      
      // Appel final pour réponse textuelle
      const finalResponse = await this.callGemini({ ... });
      return {
        response: finalResponse.candidates[0].content.parts[0].text,
        metadata: { ... },
      };
    }
    
    // Pas de function call → réponse directe
    return {
      response: firstResponse.candidates[0].content.parts[0].text,
      metadata: { ... },
    };
  }
}
```

---

### 3. KouakouController.ts (Endpoint Simple)

**Fichier:** `backend/src/kouakou/kouakou.controller.ts`

**Endpoint:** `POST /api/kouakou/chat`

**Caractéristiques:**
- ❌ Non utilisé par le frontend actuellement
- ✅ Utilise SDK Google Generative AI
- ✅ Simple et direct
- ❌ Pas de function calling

**Code:**

```typescript
@Controller('api/kouakou')
export class KouakouController {
  @Post('chat')
  async chat(@Body() chatRequest: ChatRequestDto) {
    const response = await this.kouakouService.processMessage(
      chatRequest.message,
      chatRequest.userId,
      chatRequest.context,
    );
    
    return {
      success: true,
      data: response,
    };
  }
}
```

---

### 4. GeminiService.ts (SDK Gemini)

**Fichier:** `backend/src/gemini/gemini.service.ts`

**Responsabilités:**
- Wrapper autour du SDK `@google/generative-ai`
- Gestion de la clé API
- Configuration du modèle

**Code:**

```typescript
@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model;
  
  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });
  }
  
  async chat(prompt: string, systemInstruction?: string) {
    const chat = this.model.startChat({
      history: [],
      systemInstruction: systemInstruction || this.getDefaultSystemInstruction(),
    });
    
    const result = await chat.sendMessage(prompt);
    return result.response.text();
  }
}
```

---

## 📂 Structure Complète des Fichiers

```
src/services/chatAgent/
├── ChatAgentService.ts              # Orchestrateur principal (1200+ lignes)
├── AgentActionExecutor.ts           # Exécuteur d'actions (750+ lignes)
├── IntentDetector.ts                 # Détecteur fallback
├── ChatAgentAPI.ts                  # API backend (fallback)
│
├── core/                             # Composants core
│   ├── FastPathDetector.ts          # Détection rapide (600+ lignes)
│   ├── IntentRAG.ts                 # Base de connaissances (2000+ lignes)
│   ├── NaturalLanguageProcessor.ts  # Prétraitement NLP
│   ├── EnhancedParameterExtractor.ts # Extraction paramètres (800+ lignes)
│   ├── DataValidator.ts             # Validation données (500+ lignes)
│   ├── ConfirmationManager.ts       # Gestion confirmations (300+ lignes)
│   ├── ClarificationService.ts      # Service clarification (400+ lignes)
│   ├── ConversationContext.ts       # Gestion contexte
│   ├── LearningService.ts           # Apprentissage continu (600+ lignes)
│   ├── ConversationStorage.ts       # Persistance conversations
│   ├── ParameterExtractor.ts        # Extracteur de base
│   ├── ActionParser.ts              # Parser d'actions
│   ├── QueueManager.ts             # Gestion de queue
│   ├── FewShotExamples.ts          # Exemples few-shot
│   │
│   ├── extractors/                  # Extracteurs spécialisés
│   │   ├── MontantExtractor.ts     # Extraction montants
│   │   ├── DateExtractor.ts        # Extraction dates
│   │   └── CategoryNormalizer.ts   # Normalisation catégories
│   │
│   ├── INTENT_KNOWLEDGE_BASE_GENERATED.ts  # 5000+ exemples générés
│   └── INTENT_KNOWLEDGE_BASE_LOCAL.ts      # 500+ exemples locaux
│
├── actions/                          # Actions métier
│   ├── finance/
│   │   ├── DepenseActions.ts        # create_depense, update_depense, delete_depense
│   │   ├── RevenuActions.ts         # create_revenu, update_revenu, delete_revenu
│   │   ├── ChargeFixeActions.ts    # create_charge_fixe
│   │   ├── BilanActions.ts          # get_bilan_financier
│   │   └── FinanceGraphActions.ts   # generate_graph_finances
│   │
│   ├── marketplace/
│   │   └── MarketplaceActions.ts    # marketplace_get_price_trends, marketplace_sell_animal, etc.
│   │
│   ├── production/
│   │   ├── AnimalActions.ts         # search_animal, list_animals
│   │   └── PeseeActions.ts         # create_pesee, update_pesee
│   │
│   ├── sante/
│   │   ├── VaccinationActions.ts   # create_vaccination, get_reminders
│   │   ├── TraitementActions.ts    # create_traitement
│   │   └── VisiteVetoActions.ts    # create_visite_veterinaire
│   │
│   ├── knowledge/
│   │   └── KnowledgeActions.ts     # answer_knowledge_question, list_knowledge_topics
│   │
│   ├── info/
│   │   ├── StatsActions.ts         # get_statistics, get_animal_statistics
│   │   └── AnalyseActions.ts       # analyse_rentabilite, etc.
│   │
│   ├── batch/
│   │   └── BatchActions.ts         # Actions sur les bandes
│   │
│   ├── reproduction/
│   │   └── ReproductionActions.ts  # Actions reproduction
│   │
│   ├── nutrition/
│   │   └── StockAlimentActions.ts  # Gestion stocks alimentaires
│   │
│   ├── mortalite/
│   │   └── MortaliteActions.ts     # Enregistrement mortalités
│   │
│   └── index.ts                     # Export centralisé
│
├── knowledge/                        # Base de connaissances
│   ├── KnowledgeBaseAPI.ts          # API recherche KB
│   ├── TrainingKnowledgeBase.ts     # KB d'entraînement
│   └── markdown/                    # Documents Markdown (53 fichiers)
│       ├── 01-introduction.md
│       ├── 02-choix-race.md
│       ├── 03-alimentation.md
│       └── ... (50 autres fichiers)
│
├── prompts/
│   └── systemPrompt.ts              # Prompt système pour Gemini
│
├── monitoring/
│   └── PerformanceMonitor.ts        # Monitoring performance
│
├── ProactiveRemindersService.ts     # Rappels proactifs
├── VoiceService.ts                  # Service vocal (TTS/STT)
├── VoiceServiceV2.ts                # Service vocal v2
├── SpeechTranscriptionService.ts    # Transcription vocale
├── kouakouCache.ts                  # Cache Kouakou
└── index.ts                          # Export centralisé

src/hooks/
└── useChatAgent.ts                   # Hook React principal (550+ lignes)

src/components/chatAgent/
├── ChatAgentScreen.tsx              # UI principale (600+ lignes)
├── ChatAgentFAB.tsx                 # Bouton flottant
└── TypingIndicator.tsx              # Indicateur de frappe

backend/src/
├── chat-agent/
│   ├── chat-agent.controller.ts     # Endpoint /kouakou/chat (125 lignes)
│   ├── chat-agent.service.ts        # Service function calling (1500+ lignes)
│   ├── chat-agent.module.ts
│   └── guards/
│       └── kouakou-rate-limit.guard.ts
│
├── kouakou/
│   ├── kouakou.controller.ts        # Endpoint /api/kouakou/chat (35 lignes)
│   ├── kouakou.service.ts           # Service simple (45 lignes)
│   ├── kouakou.module.ts
│   └── dto/
│       ├── chat-request.dto.ts
│       └── chat-response.dto.ts
│
└── gemini/
    ├── gemini.service.ts            # SDK Gemini wrapper (85 lignes)
    └── gemini.module.ts
```

---

## 🔄 Flux de Données Détaillé

### Flux Complet: Message → Réponse

```
1. UTILISATEUR
   "Quel est le prix du marché ?"
   │
   ▼
2. ChatAgentScreen.tsx
   handleSend() → sendMessage(content)
   │
   ▼
3. useChatAgent.ts
   sendMessage(content)
   ├── Créer ChatMessage (user)
   ├── setMessages([...prev, userMessage])
   ├── setIsThinking(true)
   ├── Délai UX (thinkingTime)
   ├── setIsThinking(false)
   ├── setIsLoading(true)
   └── chatAgentService.sendMessage(content)
   │
   ▼
4. ChatAgentService.ts
   sendMessage(userMessage)
   ├── Prétraitement NLP
   │   └── NaturalLanguageProcessor.process()
   │
   ├── NIVEAU 1: Détection Rapide
   │   ├── FastPathDetector.detectFastPath()
   │   │   └── Pattern: /prix du marche/ → ✅ marketplace_get_price_trends (0.96)
   │   │
   │   └── Si pas détecté:
   │       └── IntentRAG.detectIntent()
   │           └── Recherche dans 6000+ exemples
   │
   ├── NIVEAU 2: Gemini (si confiance < 0.90)
   │   └── callBackendGemini()
   │       ├── POST /kouakou/chat
   │       ├── ChatAgentController.chat()
   │       ├── ChatAgentService.handleFunctionCallingMessage()
   │       ├── Appel API REST Gemini
   │       └── Extraction action ou réponse conversationnelle
   │
   ├── NIVEAU 3: Fallback (si Gemini échoue)
   │   ├── KnowledgeBaseAPI.search()
   │   └── Message par défaut
   │
   ├── Extraction Paramètres
   │   └── EnhancedParameterExtractor.extractAllEnhanced()
   │
   ├── Validation
   │   └── DataValidator.validateAction()
   │
   ├── Clarification (si nécessaire)
   │   └── ClarificationService.analyzeAction()
   │
   ├── Confirmation (si nécessaire)
   │   └── ConfirmationManager.shouldConfirmAndExecute()
   │
   └── Exécution Action
       └── AgentActionExecutor.execute()
           │
           ▼
5. MarketplaceActions.ts
   getPriceTrends(params, context)
   ├── getPorkPriceTrendService()
   ├── getLastWeeksTrends(4)
   ├── Calcul moyenne prix
   └── Formatage réponse
   │
   ▼
6. ChatAgentService.ts
   Créer ChatMessage (assistant)
   ├── content: réponse formatée
   ├── metadata: {
   │     actionExecuted: 'marketplace_get_price_trends',
   │     refreshHint: 'marketplace',
   │     source: 'FastPath',
   │   }
   └── Retourner message
   │
   ▼
7. useChatAgent.ts
   Réception assistantMessage
   ├── Gestion refreshHint
   │   └── Si refreshHint === 'marketplace':
   │       └── dispatch(loadMarketplaceData())
   │
   ├── setMessages([...prev, assistantMessage])
   ├── setIsLoading(false)
   └── VoiceService.speak() (si activé)
   │
   ▼
8. ChatAgentScreen.tsx
   Affichage réponse
   └── FlatList renderItem → MessageBubble
```

---

## 📊 Statistiques du Code

- **Lignes de code totales:** ~15 000+ lignes
- **Fichiers TypeScript:** 93 fichiers
- **Actions métier:** 50+ actions
- **Exemples IntentRAG:** 6000+ exemples
- **Documents KB:** 53 fichiers Markdown
- **Tests:** 10+ fichiers de tests

---

## 🔑 Points Clés

1. **Détection en 3 niveaux:** FastPath → IntentRAG → Gemini
2. **Performance:** < 100ms pour 95% des cas (FastPath)
3. **Fallback intelligent:** Gemini en position 2 (pas en dernier)
4. **Function calling:** Backend supporte les tools Gemini
5. **RefreshHint:** Rafraîchissement automatique Redux après actions
6. **Apprentissage continu:** Enregistrement des succès/échecs
7. **Base de connaissances:** 53 documents Markdown + recherche sémantique

---

**Document généré le:** 2026-01-17  
**Version Kouakou:** 5.1  
**Dernière mise à jour:** Après correction endpoints et logging
