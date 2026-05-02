# 🐷 Architecture Complète de Kouakou

**Version:** 5.0  
**Date:** 2026-01-17  
**Auteur:** Équipe de développement

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture en Couches](#architecture-en-couches)
3. [Flux de Données](#flux-de-données)
4. [Composants Principaux](#composants-principaux)
5. [Structure des Fichiers](#structure-des-fichiers)
6. [Détection d'Intention](#détection-dintention)
7. [Exécution d'Actions](#exécution-dactions)
8. [Base de Connaissances](#base-de-connaissances)
9. [API Backend](#api-backend)
10. [Exemples de Code](#exemples-de-code)

---

## 🎯 Vue d'ensemble

Kouakou est un **assistant conversationnel intelligent** pour la gestion d'élevage porcin. Il combine :

- **Détection d'intention locale** (sans dépendance LLM externe)
- **Exécution d'actions** (création/modification de données)
- **Base de connaissances** (formation et conseils)
- **Apprentissage continu** (amélioration de la compréhension)
- **Interface vocale** (optionnelle)

### Stack Technologique

```
Frontend (React Native):
├── TypeScript
├── Redux (state management)
├── React Hooks (useChatAgent)
└── Expo (framework)

Backend (NestJS):
├── PostgreSQL (base de données)
├── Gemini API (LLM pour fallback)
└── REST API

Services:
├── ChatAgentService (cœur de l'agent)
├── IntentRAG (détection d'intention)
├── AgentActionExecutor (exécution)
└── KnowledgeBaseAPI (formation)
```

---

## 🏗️ Architecture en Couches

```
┌─────────────────────────────────────────────────────────────┐
│                    COUCHE PRÉSENTATION                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ChatAgentScreen.tsx (UI)                             │   │
│  │  - Affichage messages                                 │   │
│  │  - Input utilisateur                                  │   │
│  │  - Voice input/output                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    COUCHE HOOKS REACT                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useChatAgent()                                      │   │
│  │  - Gestion état conversation                         │   │
│  │  - Initialisation ChatAgentService                    │   │
│  │  - Gestion refreshHint                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              COUCHE SERVICE (ChatAgentService)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ChatAgentService                                    │   │
│  │  ├── Détection intention                             │   │
│  │  ├── Extraction paramètres                          │   │
│  │  ├── Validation données                             │   │
│  │  ├── Exécution action                                │   │
│  │  └── Génération réponse                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              COUCHE CORE (Composants Métier)                │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐  │
│  │ FastPath     │ IntentRAG    │ NLP          │ Learning│  │
│  │ Detector     │              │ Processor    │ Service │  │
│  └──────────────┴──────────────┴──────────────┴──────────┘  │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐  │
│  │ Parameter    │ Data         │ Confirmation │ Clarif.  │  │
│  │ Extractor    │ Validator    │ Manager      │ Service  │  │
│  └──────────────┴──────────────┴──────────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           COUCHE ACTIONS (Exécution Métier)                 │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐   │
│  │ Finance  │ Production│ Santé  │ Marketplace│ Batch  │   │
│  │ Actions  │ Actions  │ Actions │ Actions   │ Actions │   │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              COUCHE API (Communication)                     │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ apiClient    │ Backend API  │ Knowledge    │            │
│  │ (HTTP)       │ (NestJS)     │ Base API     │            │
│  └──────────────┴──────────────┴──────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flux de Données

### Flux Principal : Message Utilisateur → Réponse

```
┌─────────────────────────────────────────────────────────────┐
│  1. UTILISATEUR ENVOIE UN MESSAGE                           │
│     "Quel est le prix du marché ?"                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. useChatAgent.sendMessage()                              │
│     - Crée ChatMessage (user)                               │
│     - Ajoute à l'état React                                 │
│     - Appelle ChatAgentService.sendMessage()                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. ChatAgentService.sendMessage()                          │
│     ├── NaturalLanguageProcessor.process()                  │
│     │   └── Normalisation, correction orthographique        │
│     │                                                        │
│     ├── DÉTECTION D'INTENTION (5 étapes)                    │
│     │   ├── 1. FastPathDetector (priorité absolue)         │
│     │   ├── 2. NLP Hints                                    │
│     │   ├── 3. LearningService (si score ≥ 4.0)             │
│     │   ├── 4. IntentRAG (base de connaissances)            │
│     │   └── 5. IntentDetector (fallback)                    │
│     │                                                        │
│     ├── EXTRACTION PARAMÈTRES                               │
│     │   └── EnhancedParameterExtractor                      │
│     │                                                        │
│     ├── VALIDATION                                           │
│     │   └── DataValidator.validateAction()                  │
│     │                                                        │
│     ├── CLARIFICATION (si nécessaire)                        │
│     │   └── ClarificationService.analyzeAction()             │
│     │                                                        │
│     └── CONFIRMATION                                        │
│         └── ConfirmationManager.shouldConfirmAndExecute()   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. AgentActionExecutor.execute()                           │
│     └── MarketplaceActions.getPriceTrends()                 │
│         ├── Appel API: GET /marketplace/price-trends        │
│         ├── Calcul moyenne prix                             │
│         └── Formatage réponse                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  5. ChatAgentService construit ChatMessage (assistant)      │
│     - Contenu: réponse formatée                             │
│     - Metadata: actionExecuted, refreshHint, etc.           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  6. useChatAgent gère refreshHint                           │
│     - Si refreshHint === 'marketplace'                      │
│     - Dispatch Redux actions pour rafraîchir données        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  7. ChatAgentScreen affiche la réponse                      │
│     "📊 Tendance des prix du porc..."                       │
└─────────────────────────────────────────────────────────────┘
```

### Flux de Détection d'Intention (Détaillé)

```
Message: "Quel est le prix du marché ?"
         │
         ▼
┌────────────────────────────────────────┐
│ NaturalLanguageProcessor               │
│ Input: "Quel est le prix du marché ?"  │
│ Output: "quel est le prix du marché ?" │
│ Hints: [marketplace_get_price_trends]  │
└────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ ÉTAPE 1: FastPathDetector              │
│ Pattern: /prix du marche|prix.*actuel/│
│ ✅ DÉTECTÉ: marketplace_get_price_    │
│    trends (confiance: 0.96)            │
│ → RETOUR IMMÉDIAT (pas de fallback)   │
└────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ ÉTAPE 2-5: SKIPPÉ (FastPath réussi)   │
│ - NLP Hints: ignoré                    │
│ - LearningService: ignoré              │
│ - IntentRAG: ignoré                    │
│ - IntentDetector: ignoré               │
└────────────────────────────────────────┘
```

---

## 🧩 Composants Principaux

### 1. ChatAgentService

**Fichier:** `src/services/chatAgent/ChatAgentService.ts`

**Responsabilités:**
- Orchestration du flux de traitement
- Détection d'intention
- Extraction de paramètres
- Validation et clarification
- Exécution d'actions
- Génération de réponses

**Méthodes principales:**

```typescript
class ChatAgentService {
  // Initialisation
  async initializeContext(context: AgentContext, conversationId?: string): Promise<void>
  loadHistory(messages: ChatMessage[]): void
  
  // Traitement principal
  async sendMessage(userMessage: string): Promise<ChatMessage>
  
  // Helpers
  private resolveReferences(params: Record<string, unknown>): void
  private enrichParamsFromHistory(params: Record<string, unknown>, action: AgentActionType): Record<string, unknown>
}
```

### 2. FastPathDetector

**Fichier:** `src/services/chatAgent/core/FastPathDetector.ts`

**Responsabilités:**
- Détection rapide d'intentions courantes (confiance ≥ 0.85)
- Patterns regex pour intentions spécifiques
- Extraction de paramètres basiques

**Exemples de patterns:**

```typescript
// Prix du marché
if (normalized.match(/\b(?:prix du marche|prix du marché|tendance.*prix)\b/i)) {
  return { action: 'marketplace_get_price_trends', confidence: 0.96 };
}

// Remerciements
if (normalized.match(/^(?:merci|ok|d'accord|parfait)\s*[!.?]*$/i)) {
  return { action: 'other', params: { isThanks: true }, confidence: 1.0 };
}

// Dépense
if (normalized.match(/\b(?:depense|j'ai depense|achete)\b/i) && montant) {
  return { action: 'create_depense', params: { montant }, confidence: 0.95 };
}
```

### 3. IntentRAG

**Fichier:** `src/services/chatAgent/core/IntentRAG.ts`

**Responsabilités:**
- Base de connaissances avec 6000+ exemples
- Recherche sémantique (Jaccard similarity)
- Index inversé pour performance

**Structure:**

```typescript
interface TrainingExample {
  text: string;           // "prix du marché"
  action: AgentActionType; // "marketplace_get_price_trends"
  params: Record<string, unknown>;
  confidence: number;     // 0.95
}

// Base de connaissances fusionnée
const INTENT_KNOWLEDGE_BASE_COMPLETE = [
  ...INTENT_KNOWLEDGE_BASE,        // 440+ exemples manuels
  ...INTENT_KNOWLEDGE_BASE_GENERATED, // 5000+ exemples générés
  ...INTENT_KNOWLEDGE_BASE_LOCAL,   // 500+ exemples locaux
];
```

### 4. AgentActionExecutor

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
      case 'marketplace_get_price_trends':
        return await MarketplaceActions.getPriceTrends(action.params, context);
      
      case 'create_depense':
        return await DepenseActions.createDepense(action.params, context);
      
      case 'create_revenu':
        return await RevenuActions.createRevenu(action.params, context);
      
      // ... 50+ autres actions
    }
  }
}
```

### 5. Actions Métier

**Structure:** `src/services/chatAgent/actions/`

Chaque module métier a ses propres actions :

```
actions/
├── finance/
│   ├── DepenseActions.ts      # create_depense, update_depense, delete_depense
│   ├── RevenuActions.ts       # create_revenu, update_revenu, delete_revenu
│   ├── ChargeFixeActions.ts   # create_charge_fixe
│   ├── BilanActions.ts        # get_bilan_financier
│   └── FinanceGraphActions.ts # generate_graph_finances
│
├── marketplace/
│   └── MarketplaceActions.ts  # marketplace_get_price_trends, marketplace_sell_animal, etc.
│
├── production/
│   ├── AnimalActions.ts       # search_animal, list_animals
│   └── PeseeActions.ts        # create_pesee, update_pesee
│
├── sante/
│   ├── VaccinationActions.ts  # create_vaccination
│   ├── TraitementActions.ts  # create_traitement
│   └── VisiteVetoActions.ts  # create_visite_veterinaire
│
└── ... (autres modules)
```

**Exemple d'action:**

```typescript
// src/services/chatAgent/actions/marketplace/MarketplaceActions.ts
export class MarketplaceActions {
  static async getPriceTrends(
    params: Record<string, unknown>,
    context: AgentContext
  ): Promise<AgentActionResult> {
    const trendService = getPorkPriceTrendService();
    const trends = await trendService.getLastWeeksTrends(4);
    
    const avgPrice = trends
      .map(t => t.avgPricePlatform || t.avgPriceRegional || 0)
      .filter(p => p > 0)
      .reduce((a, b) => a + b, 0) / trends.length;
    
    return {
      success: true,
      message: `📊 **Tendance des prix du porc poids vif (4 dernières semaines)**
💰 **Prix moyen actuel : ${avgPrice.toLocaleString('fr-FR')} FCFA/kg**`,
      data: { trends, avgPrice },
    };
  }
}
```

---

## 📁 Structure des Fichiers

```
src/
├── hooks/
│   └── useChatAgent.ts                    # Hook React principal
│
├── components/
│   └── chatAgent/
│       ├── ChatAgentScreen.tsx            # UI principale
│       ├── ChatAgentFAB.tsx              # Bouton flottant
│       └── TypingIndicator.tsx            # Indicateur de frappe
│
├── services/
│   └── chatAgent/
│       ├── ChatAgentService.ts            # Service principal (orchestrateur)
│       ├── AgentActionExecutor.ts        # Exécuteur d'actions
│       ├── IntentDetector.ts              # Détecteur d'intention (fallback)
│       ├── ChatAgentAPI.ts                # API backend (fallback LLM)
│       │
│       ├── core/                          # Composants core
│       │   ├── FastPathDetector.ts        # Détection rapide
│       │   ├── IntentRAG.ts                # Base de connaissances
│       │   ├── NaturalLanguageProcessor.ts # Prétraitement NLP
│       │   ├── EnhancedParameterExtractor.ts # Extraction paramètres
│       │   ├── DataValidator.ts           # Validation données
│       │   ├── ConfirmationManager.ts     # Gestion confirmations
│       │   ├── ClarificationService.ts    # Service de clarification
│       │   ├── ConversationContext.ts     # Gestion contexte
│       │   ├── LearningService.ts         # Apprentissage continu
│       │   ├── ConversationStorage.ts     # Persistance conversations
│       │   │
│       │   ├── extractors/                # Extracteurs spécialisés
│       │   │   ├── MontantExtractor.ts    # Extraction montants
│       │   │   ├── DateExtractor.ts       # Extraction dates
│       │   │   └── CategoryNormalizer.ts  # Normalisation catégories
│       │   │
│       │   └── INTENT_KNOWLEDGE_BASE_*.ts # Bases de connaissances
│       │
│       ├── actions/                       # Actions métier
│       │   ├── finance/
│       │   ├── marketplace/
│       │   ├── production/
│       │   ├── sante/
│       │   └── ... (autres modules)
│       │
│       ├── knowledge/                     # Base de connaissances
│       │   ├── KnowledgeBaseAPI.ts        # API recherche KB
│       │   ├── TrainingKnowledgeBase.ts   # KB d'entraînement
│       │   └── markdown/                  # Documents Markdown (53 fichiers)
│       │
│       ├── monitoring/
│       │   └── PerformanceMonitor.ts      # Monitoring performance
│       │
│       └── prompts/
│           └── systemPrompt.ts            # Prompt système (fallback)
│
└── types/
    └── chatAgent.ts                       # Types TypeScript

backend/src/
├── chat-agent/
│   ├── chat-agent.module.ts
│   └── chat-agent.controller.ts           # API REST (fallback)
│
├── kouakou/
│   ├── kouakou.module.ts
│   └── kouakou.controller.ts               # API REST principale
│
└── agent-learnings/
    └── ...                                 # Apprentissage persistant
```

---

## 🎯 Détection d'Intention

### Pipeline de Détection (V5.1 - 3 niveaux)

```typescript
// ChatAgentService.ts - sendMessage() - FLUX OPTIMISÉ

// ═══════════════════════════════════════════════════════════════
// NIVEAU 1 : DÉTECTION RAPIDE (< 100ms)
// ═══════════════════════════════════════════════════════════════

// 1.1 FastPath (seuil strict >= 0.95 pour cas ÉVIDENTS)
const fastPathResult = FastPathDetector.detectFastPath(processedMessage);
if (fastPathResult.intent && fastPathResult.confidence >= 0.95) {
  detectedIntent = fastPathResult.intent; // ✅ RETOUR IMMÉDIAT
}

// 1.2 IntentRAG (seuil strict >= 0.90 pour patterns connus)
if (!detectedIntent) {
  const ragResult = await intentRAG.detectIntent(processedMessage);
  if (ragResult && ragResult.confidence >= 0.90) {
    detectedIntent = ragResult;
  }
}

// ═══════════════════════════════════════════════════════════════
// NIVEAU 2 : GEMINI (si confiance < 0.90)
// ═══════════════════════════════════════════════════════════════

if (!detectedIntent || detectedIntent.confidence < 0.90) {
  const geminiResponse = await callBackendGemini(userMessage, ...);
  
  if (geminiResponse) {
    // Extraire action structurée ou utiliser réponse conversationnelle
    const parsedAction = extractActionFromGeminiResponse(geminiResponse);
    
    if (parsedAction) {
      detectedIntent = { action: parsedAction.action, confidence: 0.95, ... };
    } else {
      // Réponse conversationnelle directe
      return createAssistantMessage(geminiResponse);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// NIVEAU 3 : FALLBACK (si Gemini échoue)
// ═══════════════════════════════════════════════════════════════

if (!detectedIntent) {
  // 3.1 Knowledge Base
  // 3.2 Message par défaut
}
```

### Exemples de Détection

| Message Utilisateur | FastPath | IntentRAG | Action Détectée |
|---------------------|----------|-----------|-----------------|
| "Quel est le prix du marché ?" | ✅ 0.96 | - | `marketplace_get_price_trends` |
| "J'ai dépensé 50000 FCFA" | ✅ 0.95 | - | `create_depense` |
| "Merci" | ✅ 1.0 | - | `other` (isThanks) |
| "Combien de porcs j'ai ?" | ❌ | ✅ 0.95 | `get_statistics` |
| "Vends mon porc P001" | ✅ 0.93 | - | `marketplace_sell_animal` |

---

## ⚙️ Exécution d'Actions

### Flux d'Exécution

```typescript
// AgentActionExecutor.ts
async execute(action: AgentAction, context: AgentContext): Promise<AgentActionResult> {
  switch (action.type) {
    case 'marketplace_get_price_trends':
      return await MarketplaceActions.getPriceTrends(action.params, context);
    
    case 'create_depense':
      return await DepenseActions.createDepense(action.params, context);
    
    // ... 50+ autres actions
  }
}
```

### Format de Retour

```typescript
interface AgentActionResult {
  success: boolean;                    // Succès/échec
  message: string;                     // Message à afficher
  data?: unknown;                      // Données supplémentaires
  error?: string;                      // Message d'erreur
  needsClarification?: boolean;        // Besoin de clarification
  missingParams?: string[];            // Paramètres manquants
  refreshHint?: 'finance' | 'production' | 'marketplace' | 'all'; // Signal refresh
}
```

---

## 📚 Base de Connaissances

### Structure

```
knowledge/
├── KnowledgeBaseAPI.ts              # API de recherche
├── TrainingKnowledgeBase.ts         # KB d'entraînement
└── markdown/                        # Documents Markdown
    ├── 01-introduction.md
    ├── 02-choix-race.md
    ├── 03-alimentation.md
    ├── 09-commercialisation.md
    └── ... (53 fichiers total)
```

### Recherche dans la KB

```typescript
// Si aucune intention détectée, chercher dans la KB
const knowledgeResults = await KnowledgeBaseAPI.search(userMessage, {
  projetId: context.projetId,
  limit: 1,
});

if (knowledgeResults[0]?.relevance_score >= 3) {
  return {
    success: true,
    message: `📚 Voici ce que je sais sur ce sujet:\n\n**${knowledgeResults[0].title}**\n\n${knowledgeResults[0].summary}`,
  };
}
```

---

## 🌐 API Backend

### Endpoints Principaux

```typescript
// backend/src/kouakou/kouakou.controller.ts

POST   /kouakou/chat                    # Chat avec Gemini (fallback)
GET    /kouakou/conversations           # Liste conversations
GET    /kouakou/conversations/:id       # Historique conversation
POST   /agent-learnings                 # Enregistrer apprentissage
GET    /agent-learnings/similar         # Rechercher apprentissage similaire
```

### Format Requête/Réponse

```typescript
// Requête
POST /kouakou/chat
{
  "message": "Quel est le prix du marché ?",
  "conversationId": "conv_123",
  "projetId": "proj_456"
}

// Réponse
{
  "response": "📊 Tendance des prix...",
  "metadata": {
    "model": "gemini-2.5-flash",
    "executedActions": [...]
  }
}
```

---

## 💻 Exemples de Code

### 1. Utilisation dans un Composant React

```typescript
// src/components/chatAgent/ChatAgentScreen.tsx
import { useChatAgent } from '../../hooks/useChatAgent';

function ChatAgentScreen() {
  const {
    messages,
    isLoading,
    isThinking,
    sendMessage,
    reminders,
  } = useChatAgent();

  return (
    <View>
      <FlatList
        data={messages}
        renderItem={({ item }) => <MessageBubble message={item} />}
      />
      <TextInput
        onSubmitEditing={(e) => sendMessage(e.nativeEvent.text)}
        placeholder="Tapez votre message..."
      />
    </View>
  );
}
```

### 2. Création d'une Nouvelle Action

```typescript
// src/services/chatAgent/actions/marketplace/MarketplaceActions.ts
export class MarketplaceActions {
  static async getPriceTrends(
    params: Record<string, unknown>,
    context: AgentContext
  ): Promise<AgentActionResult> {
    try {
      // 1. Récupérer les données
      const trendService = getPorkPriceTrendService();
      const trends = await trendService.getLastWeeksTrends(4);
      
      // 2. Calculer la moyenne
      const avgPrice = trends
        .map(t => t.avgPricePlatform || t.avgPriceRegional || 0)
        .filter(p => p > 0)
        .reduce((a, b) => a + b, 0) / trends.length;
      
      // 3. Formater la réponse
      return {
        success: true,
        message: `📊 **Tendance des prix du porc poids vif (4 dernières semaines)**
💰 **Prix moyen actuel : ${avgPrice.toLocaleString('fr-FR')} FCFA/kg**`,
        data: { trends, avgPrice },
      };
    } catch (error) {
      return {
        success: false,
        message: "Désolé, je n'ai pas pu récupérer les tendances de prix.",
        error: error.message,
      };
    }
  }
}
```

### 3. Ajout d'un Pattern FastPath

```typescript
// src/services/chatAgent/core/FastPathDetector.ts
static detectFastPath(message: string): FastPathResult {
  const normalized = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  // Nouveau pattern
  if (normalized.match(/\b(?:nouveau pattern|nouvelle intention)\b/i)) {
    return {
      intent: {
        action: 'nouvelle_action' as AgentActionType,
        confidence: 0.95,
        params: {},
      },
      confidence: 0.95,
    };
  }
}
```

### 4. Ajout d'un Exemple dans IntentRAG

```typescript
// src/services/chatAgent/core/IntentRAG.ts
export const INTENT_KNOWLEDGE_BASE: TrainingExample[] = [
  // ... exemples existants
  
  // Nouvel exemple
  {
    text: 'nouvelle phrase utilisateur',
    action: 'nouvelle_action',
    params: {},
    confidence: 0.95,
  },
];
```

---

## 🔍 Points Clés de l'Architecture

### 1. **Priorité FastPath**
- FastPath est **toujours exécuté en premier**
- Si confiance ≥ 0.85, **retour immédiat** (pas de fallback)
- Le LearningService ne peut **pas écraser** FastPath

### 2. **Apprentissage Continu**
- Les échecs sont enregistrés dans `agent_learnings`
- Les succès améliorent la base de connaissances
- Seuil strict (score ≥ 4.0) pour éviter les mauvais apprentissages

### 3. **RefreshHint**
- Les actions peuvent signaler un refresh nécessaire
- `useChatAgent` dispatch automatiquement les Redux actions
- Évite les données obsolètes dans l'UI

### 4. **Clarification Intelligente**
- Si paramètres manquants, demande de clarification
- Utilise le contexte conversationnel pour enrichir
- Supporte les réponses multi-tours

### 5. **Performance**
- FastPath: < 20ms
- IntentRAG: < 100ms (avec index inversé)
- LearningService: < 200ms (avec cache)
- Total: < 500ms pour la détection

### 6. **Fallback Gemini**
- Quand aucune intention locale n'est détectée avec confiance ≥ 0.85
- Appel backend `/api/kouakou/chat` avec timeout de 30s
- Le backend utilise `GeminiService` avec `gemini-2.0-flash-exp`
- La réponse Gemini est utilisée directement ou parsée pour extraire une action

---

## 📊 Métriques de Performance

```
Détection d'intention:
├── FastPath: 18ms (95% des cas courants)
├── IntentRAG: 57ms (fallback)
└── Total: < 100ms (moyenne)

Exécution d'action:
├── Actions simples: 200-500ms
├── Actions avec API: 500-2000ms
└── Actions complexes: 2000-5000ms

Temps de réponse total:
└── 500ms - 3s (selon complexité)
```

---

## 🚀 Évolutions Futures

1. **Embeddings vectoriels** (remplacer Jaccard)
2. **Cache Redis** (pour IntentRAG)
3. **Webhooks** (notifications temps réel)
4. **Multi-langues** (anglais, dioula)
5. **Voice-first** (interface vocale principale)

---

## 📝 Notes Techniques

- **Pas de dépendance Gemini côté frontend** (tout passe par le backend)
- **Détection locale** pour 95% des cas (FastPath + IntentRAG)
- **Fallback LLM** uniquement si aucune intention détectée
- **Apprentissage persistant** dans PostgreSQL
- **Base de connaissances** avec 53 documents Markdown

---

**Document généré le:** 2026-01-17  
**Version Kouakou:** 5.0  
**Dernière mise à jour:** Après correction ConfirmationManager
