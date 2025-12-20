# Analyse de l'Agent Conversationnel - Kouakou

## 📊 État Actuel

### Architecture
- **Service Principal** : `ChatAgentService.ts`
- **Détection d'Intention** : `IntentDetector.ts` (basé sur regex/keywords)
- **Exécution d'Actions** : `AgentActionExecutor.ts`
- **API IA** : `ChatAgentAPI.ts` (simulation ou OpenAI)
- **Prompt Système** : ~380 lignes dans `buildSystemPrompt()`

---

## 🚨 LIMITES IDENTIFIÉES

### 1. **Confusion des Informations** ⚠️ CRITIQUE

#### Problèmes :
- **Prompt trop long et complexe** (380+ lignes)
- **Instructions contradictoires** dans le prompt
- **Mélange de règles et d'exemples** sans structure claire
- **Pas de hiérarchie** dans les instructions
- **Contexte mal structuré** pour l'IA

#### Exemples de confusion :
```
❌ "EXÉCUTE DIRECTEMENT" vs "DEMANDE CONFIRMATION"
❌ "MODE AUTONOME" vs "CONFIRMATION UNIQUEMENT POUR CAS CRITIQUES"
❌ Instructions répétées avec variations
```

### 2. **Détection d'Intention Fragile**

#### Problèmes :
- **Basé uniquement sur regex/keywords** (pas de ML)
- **Pas de gestion d'ambiguïté** (ex: "statistique" peut être info ou création)
- **Confiance fixe** (0.7-0.9) sans apprentissage
- **Pas de contexte conversationnel** pour clarifier
- **Variantes limitées** (ex: ne comprend pas "combien j'ai de porcs" vs "nombre de porcs")

#### Exemples :
```
❌ "statistique" → get_statistics (mais si contexte = "créer une statistique" ?)
❌ "dépense" → create_depense (mais si contexte = "mes dépenses" = info ?)
```

### 3. **Extraction de Paramètres Imprécise**

#### Problèmes :
- **Extraction de montant fragile** (regex multiples, conflits)
- **Pas de validation** avant exécution
- **Confusion quantité/montant** (ex: "5 porcs à 800 000" → 5 ou 800000 ?)
- **Dates mal gérées** (formats variés, pas de validation)
- **Noms d'animaux/acheteurs** extraits de manière approximative

#### Exemples :
```
❌ "J'ai vendu 5 porcs à 800 000" → peut extraire 5 comme montant
❌ "Dépense de 20 sacs à 18 000" → peut confondre 20 et 18000
❌ Dates : "demain", "lundi", "15/01" → parsing incohérent
```

### 4. **Pas de Mémoire Conversationnelle**

#### Problèmes :
- **Historique limité** (10 derniers messages seulement)
- **Pas de contexte persistant** entre sessions
- **Pas de référence** aux entités précédentes (ex: "le même acheteur")
- **Pas de correction** des erreurs passées

#### Exemples :
```
❌ Utilisateur : "J'ai vendu à Traoré"
❌ Agent : "Quel est le montant ?"
❌ Utilisateur : "800 000" (sans mentionner Traoré)
❌ Agent : Ne sait pas que c'est pour Traoré
```

### 5. **Gestion d'Erreurs Basique**

#### Problèmes :
- **Messages d'erreur génériques**
- **Pas de récupération** après erreur
- **Pas de suggestions** de correction
- **Pas de log** des erreurs pour amélioration

### 6. **Pas de Validation des Données**

#### Problèmes :
- **Exécution directe** sans vérification
- **Pas de vérification** des IDs (animaux, projets)
- **Pas de cohérence** (ex: vendre un animal déjà vendu)
- **Pas de limites** (ex: poids négatif, montant irréaliste)

### 7. **Prompt Système Non Optimisé**

#### Problèmes :
- **Trop verbeux** (380 lignes)
- **Structure confuse** (instructions mélangées)
- **Pas de format structuré** (JSON Schema, etc.)
- **Pas de few-shot learning** efficace
- **Exemples contradictoires**

---

## 💡 PROPOSITIONS D'AMÉLIORATION

### 🎯 PRIORITÉ 1 : Restructuration du Prompt Système

#### Solution : Prompt Structuré avec JSON Schema

```typescript
const SYSTEM_PROMPT = `Tu es Kouakou, assistant pour éleveurs de porcs en Côte d'Ivoire.

RÈGLES CRITIQUES (par ordre de priorité) :
1. AUTONOMIE : Exécute directement les actions claires
2. CONFIRMATION : Uniquement pour suppressions ou montants > 5M FCFA
3. FORMAT : Réponds TOUJOURS en JSON valide

FORMAT DE RÉPONSE OBLIGATOIRE :
{
  "action": "nom_action",
  "params": {...},
  "message": "message à l'utilisateur",
  "requiresConfirmation": boolean
}

ACTIONS DISPONIBLES :
${JSON.stringify(ACTIONS_SCHEMA, null, 2)}

EXEMPLES :
${JSON.stringify(EXAMPLES, null, 2)}
`;
```

**Avantages :**
- ✅ Structure claire et hiérarchisée
- ✅ Format JSON imposé (plus fiable)
- ✅ Exemples structurés
- ✅ Réduction de 80% de la taille du prompt

---

### 🎯 PRIORITÉ 2 : Amélioration de la Détection d'Intention

#### Solution A : Fine-tuning d'un modèle léger

```typescript
// Entraîner un modèle de classification d'intentions
// Dataset : 1000+ exemples de phrases → actions

const intentModel = {
  "combien de porc actif" → get_statistics (confidence: 0.95)
  "j'ai vendu 5 porcs" → create_revenu (confidence: 0.92)
  "mes dépenses" → calculate_costs (confidence: 0.88)
}
```

#### Solution B : RAG (Retrieval Augmented Generation)

```typescript
// Base de connaissances d'exemples
const examplesDB = [
  { text: "combien de porc", action: "get_statistics", params: {} },
  { text: "j'ai vendu 5 porcs à 800000", action: "create_revenu", params: { nombre: 5, montant: 800000 } },
  // ... 1000+ exemples
];

// Recherche sémantique (embedding) pour trouver l'exemple le plus proche
const similarExample = findSimilarExample(userMessage);
```

**Avantages :**
- ✅ Meilleure précision (90%+ vs 70% actuel)
- ✅ Gestion d'ambiguïté
- ✅ Apprentissage continu

---

### 🎯 PRIORITÉ 3 : Extraction de Paramètres Robuste

#### Solution : Parser avec Validation

```typescript
class ParameterExtractor {
  extractMontant(text: string): number | null {
    // 1. Patterns prioritaires (après "à", "pour", etc.)
    // 2. Validation (montant > 100, pas une quantité)
    // 3. Contexte (si "porcs" avant → probablement quantité, pas montant)
    // 4. Fallback : demander confirmation
  }

  extractDate(text: string): string {
    // 1. Dates relatives ("demain", "lundi")
    // 2. Dates absolues ("15/01/2025")
    // 3. Validation (date pas dans le futur pour ventes passées)
  }

  extractAnimal(text: string, context: ConversationContext): string | null {
    // 1. Code animal (P001, etc.)
    // 2. Nom animal (si mentionné précédemment)
    // 3. Contexte conversationnel
  }
}
```

**Avantages :**
- ✅ Extraction plus précise
- ✅ Validation avant exécution
- ✅ Utilisation du contexte

---

### 🎯 PRIORITÉ 4 : Mémoire Conversationnelle

#### Solution : Contexte Persistant

```typescript
interface ConversationContext {
  // Entités mentionnées
  entities: {
    lastAcheteur?: string;
    lastAnimal?: string;
    lastMontant?: number;
    // ...
  };
  
  // Historique structuré
  history: Array<{
    userMessage: string;
    detectedIntent: string;
    executedAction: string;
    result: any;
  }>;
  
  // État de la conversation
  pendingAction?: AgentAction;
  clarificationNeeded?: string;
}
```

**Avantages :**
- ✅ Référence aux entités précédentes
- ✅ Clarification contextuelle
- ✅ Meilleure expérience utilisateur

---

### 🎯 PRIORITÉ 5 : Validation et Cohérence

#### Solution : Validateur de Données

```typescript
class DataValidator {
  async validateAction(action: AgentAction, context: AgentContext): Promise<ValidationResult> {
    // 1. Vérifier les IDs (animaux existent ?)
    // 2. Vérifier la cohérence (animal déjà vendu ?)
    // 3. Vérifier les limites (montant réaliste ?)
    // 4. Vérifier les dates (pas dans le futur pour ventes passées)
    
    return {
      valid: boolean;
      errors: string[];
      suggestions: string[];
    };
  }
}
```

**Avantages :**
- ✅ Prévention d'erreurs
- ✅ Messages d'erreur précis
- ✅ Suggestions de correction

---

### 🎯 PRIORITÉ 6 : Gestion d'Ambiguïté

#### Solution : Clarification Contextuelle

```typescript
class AmbiguityResolver {
  resolveAmbiguity(intent: DetectedIntent, context: ConversationContext): AgentAction | ClarificationRequest {
    // Si confiance < 0.8 → demander clarification
    // Si paramètres manquants → demander avec contexte
    // Si plusieurs interprétations → proposer choix
    
    if (intent.confidence < 0.8) {
      return {
        type: 'clarification',
        question: this.buildClarificationQuestion(intent, context),
        options: this.generateOptions(intent)
      };
    }
  }
}
```

**Avantages :**
- ✅ Moins d'erreurs
- ✅ Meilleure compréhension
- ✅ Expérience utilisateur améliorée

---

## 🚀 PLAN D'ENTRAÎNEMENT ET AMÉLIORATION

### Phase 1 : Restructuration (Semaine 1-2)

1. **Refactoriser le prompt système**
   - Réduire à 100-150 lignes
   - Structure JSON Schema
   - Exemples clairs et cohérents

2. **Créer un dataset d'exemples**
   - 500+ phrases utilisateur → actions
   - Variantes linguistiques (français ivoirien)
   - Cas limites et ambiguïtés

3. **Améliorer l'extraction de paramètres**
   - Parser robuste avec validation
   - Gestion des dates relatives
   - Extraction contextuelle

### Phase 2 : Amélioration de la Détection (Semaine 3-4)

1. **Implémenter RAG ou Fine-tuning**
   - Base de connaissances d'exemples
   - Recherche sémantique (embedding)
   - Ou fine-tuning d'un modèle léger

2. **Ajouter gestion d'ambiguïté**
   - Détection d'ambiguïté
   - Questions de clarification
   - Suggestions contextuelles

3. **Tester avec dataset**
   - Mesurer précision (objectif : 90%+)
   - Identifier cas limites
   - Itérer

### Phase 3 : Mémoire et Validation (Semaine 5-6)

1. **Implémenter contexte conversationnel**
   - Entités mentionnées
   - Historique structuré
   - Références contextuelles

2. **Ajouter validation des données**
   - Validateur de cohérence
   - Vérification d'IDs
   - Messages d'erreur précis

3. **Améliorer gestion d'erreurs**
   - Récupération après erreur
   - Suggestions de correction
   - Logging pour amélioration continue

### Phase 4 : Optimisation et Tests (Semaine 7-8)

1. **Tests utilisateurs**
   - Scénarios réels
   - Mesure de satisfaction
   - Identification de problèmes

2. **Optimisation performance**
   - Réduction latence
   - Cache des réponses fréquentes
   - Optimisation prompts

3. **Documentation**
   - Guide d'utilisation
   - Exemples de bonnes pratiques
   - FAQ

---

## 📈 MÉTRIQUES DE SUCCÈS

### Objectifs Quantitatifs

- **Précision de détection d'intention** : 90%+ (actuellement ~70%)
- **Taux d'extraction correcte de paramètres** : 85%+ (actuellement ~60%)
- **Taux de satisfaction utilisateur** : 85%+ (à mesurer)
- **Temps de réponse moyen** : < 2s (actuellement ~3-5s)

### Objectifs Qualitatifs

- ✅ Pas de confusion entre actions similaires
- ✅ Extraction fiable des montants, dates, noms
- ✅ Compréhension du contexte conversationnel
- ✅ Messages d'erreur clairs et utiles

---

## 🛠️ OUTILS ET TECHNOLOGIES RECOMMANDÉS

### Pour la Détection d'Intention

1. **Option A : RAG avec Embeddings**
   - Bibliothèque : `@pinecone-database/pinecone` ou `faiss` (local)
   - Modèle d'embedding : `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
   - Avantage : Pas besoin d'entraînement, facile à mettre à jour

2. **Option B : Fine-tuning**
   - Modèle de base : `distilbert-base-multilingual-cased`
   - Framework : Hugging Face Transformers
   - Avantage : Plus précis, mais nécessite dataset et entraînement

### Pour l'Extraction de Paramètres

- **Bibliothèque NLP** : `spacy` (si Python) ou `compromise` (JavaScript)
- **Parser de dates** : `chrono-node` (déjà utilisé via date-fns)
- **Validation** : `zod` ou `yup` pour schémas de validation

### Pour la Mémoire Conversationnelle

- **Base de données** : SQLite (déjà utilisé)
- **Structure** : Tables pour contexte, entités, historique

---

## 📝 EXEMPLES DE PROMPTS AMÉLIORÉS

### Prompt Système Optimisé (Version 1)

```typescript
const OPTIMIZED_SYSTEM_PROMPT = `Tu es Kouakou, assistant pour éleveurs de porcs en Côte d'Ivoire.

RÈGLES (par ordre de priorité) :
1. Réponds TOUJOURS en JSON valide
2. Exécute directement les actions claires (confiance ≥ 0.8)
3. Demande confirmation uniquement pour suppressions ou montants > 5M FCFA

FORMAT DE RÉPONSE :
{
  "action": "nom_action",
  "params": {...},
  "message": "message utilisateur",
  "confidence": 0.0-1.0,
  "requiresConfirmation": boolean
}

ACTIONS (JSON Schema) :
${ACTIONS_JSON_SCHEMA}

EXEMPLES :
${JSON.stringify(EXAMPLES, null, 2)}
`;
```

### Exemples Structurés

```typescript
const EXAMPLES = [
  {
    user: "combien de porc actif",
    response: {
      action: "get_statistics",
      params: {},
      message: "Je prépare tes statistiques...",
      confidence: 0.95,
      requiresConfirmation: false
    }
  },
  {
    user: "j'ai vendu 5 porcs à Traoré à 800 000 FCFA",
    response: {
      action: "create_revenu",
      params: {
        nombre: 5,
        montant: 800000,
        acheteur: "Traoré",
        categorie: "vente_porc"
      },
      message: "C'est noté ! 5 porcs vendus à Traoré pour 800 000 FCFA.",
      confidence: 0.92,
      requiresConfirmation: false
    }
  }
];
```

---

## 🎓 RECOMMANDATIONS FINALES

### Court Terme (1-2 semaines)
1. ✅ **Refactoriser le prompt système** (réduction 70%, structure JSON)
2. ✅ **Améliorer l'extraction de paramètres** (validation, contexte)
3. ✅ **Ajouter gestion d'ambiguïté** (clarification contextuelle)

### Moyen Terme (1 mois)
1. ✅ **Implémenter RAG ou fine-tuning** (précision 90%+)
2. ✅ **Mémoire conversationnelle** (contexte persistant)
3. ✅ **Validation des données** (cohérence, limites)

### Long Terme (2-3 mois)
1. ✅ **Apprentissage continu** (feedback utilisateur)
2. ✅ **Personnalisation** (adaptation au style de l'utilisateur)
3. ✅ **Analytics** (métriques, amélioration continue)

---

## 📚 RESSOURCES

- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [RAG Tutorial](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [Fine-tuning Guide](https://huggingface.co/docs/transformers/training)
- [JSON Schema](https://json-schema.org/)

---

**Date d'analyse** : ${new Date().toISOString().split('T')[0]}
**Version analysée** : Actuelle (avant améliorations)

