# Guide de l'Agent Conversationnel Professionnel

## 🎯 Vue d'ensemble

L'agent conversationnel a été complètement refactorisé pour être **robuste, précis et fiable**, pas approximatif. Il utilise maintenant une architecture professionnelle avec :

1. **Détection d'intention RAG** : Base de connaissances avec recherche sémantique
2. **Extraction de paramètres robuste** : Parser multi-couches avec validation contextuelle
3. **Mémoire conversationnelle** : Contexte persistant et résolution de références
4. **Validation de données** : Vérification avant exécution

---

## 🏗️ Architecture

### Composants Core

#### 1. **IntentRAG** (`core/IntentRAG.ts`)

- Base de connaissances avec exemples d'entraînement
- Recherche sémantique pour détecter l'intention
- Calcul de similarité et scoring de confiance
- **Avantage** : Plus précis que les regex simples

#### 2. **ParameterExtractor** (`core/ParameterExtractor.ts`)

- Extraction multi-couches :
  - Montants (avec validation contextuelle)
  - Dates (relatives et absolues)
  - Nombres, poids, acheteurs, animaux
  - Catégories, libellés, fréquences
- **Avantage** : Gère les références ("le même", "celui-là")

#### 3. **ConversationContextManager** (`core/ConversationContext.ts`)

- Maintient la mémoire des entités mentionnées
- Résout les références ("le même acheteur", "celui-là")
- Historique structuré des actions
- **Avantage** : Comprend le contexte de la conversation

#### 4. **DataValidator** (`core/DataValidator.ts`)

- Validation avant exécution :
  - Cohérence des données
  - Limites réalistes (montants, poids, dates)
  - Vérification d'existence (animaux, projets)
- **Avantage** : Évite les erreurs avant qu'elles n'arrivent

---

## 🔄 Flux de Traitement

```
Message Utilisateur
    ↓
1. IntentRAG → Détection d'intention (avec confiance)
    ↓
2. ParameterExtractor → Extraction des paramètres (avec contexte)
    ↓
3. ConversationContext → Résolution des références
    ↓
4. DataValidator → Validation des données
    ↓
5. Si valide → Exécution
   Si invalide → Demande de clarification
```

---

## 📝 Exemples d'Utilisation

### Exemple 1 : Vente avec contexte

```
Utilisateur : "J'ai vendu 5 porcs à 800 000 FCFA à Jean"
Agent : ✅ Détecte "create_revenu"
        ✅ Extrait : nombre=5, montant=800000, acheteur="Jean"
        ✅ Valide : montant réaliste, nombre valide
        ✅ Exécute directement
```

### Exemple 2 : Référence à une entité précédente

```
Utilisateur : "J'ai vendu 3 porcs à 500 000 à Paul"
Agent : ✅ Enregistre la vente
        ✅ Mémorise : acheteur="Paul"

Utilisateur : "Enregistre la même chose pour le même acheteur"
Agent : ✅ Résout "le même acheteur" → "Paul"
        ✅ Réutilise les paramètres précédents
        ✅ Exécute
```

### Exemple 3 : Validation et clarification

```
Utilisateur : "J'ai vendu 1000 porcs à 100 FCFA"
Agent : ⚠️  Détecte des incohérences :
        - Nombre très élevé (1000)
        - Prix par porc très faible (100 FCFA)
        ❌ Demande clarification : "Le nombre et le montant semblent incohérents. Peux-tu vérifier ?"
```

---

## 🚀 Améliorations Futures

### Court terme

1. **Enrichir la base de connaissances RAG**
   - Ajouter plus d'exemples réels
   - Variantes linguistiques (français ivoirien)
   - Expressions locales

2. **Améliorer l'extraction de dates**
   - Gestion des expressions relatives ("dans 2 semaines", "le mois prochain")
   - Détection de périodes ("du 1er au 15 janvier")

### Moyen terme

1. **Fine-tuning du modèle**
   - Entraîner un modèle spécialisé pour le domaine agricole
   - Améliorer la précision de détection

2. **Embeddings réels**
   - Remplacer la similarité Jaccard par des embeddings (sentence-transformers)
   - Recherche sémantique plus précise

### Long terme

1. **Apprentissage continu**
   - Apprendre des corrections utilisateur
   - Améliorer la base de connaissances automatiquement

2. **Multi-langues**
   - Support du français ivoirien complet
   - Détection automatique de la langue

---

## 🔧 Configuration

### Utilisation dans le code

```typescript
import { ChatAgentService } from './services/chatAgent';

const agent = new ChatAgentService({
  model: 'gpt-4o-mini',
  temperature: 0.7,
  language: 'fr-CI',
});

await agent.initializeContext({
  projetId: 'proj_123',
  userId: 'user_456',
  currentDate: '2025-01-15',
});
```

### Ajouter des exemples à la base RAG

```typescript
import { IntentRAG } from './services/chatAgent/core';

const rag = new IntentRAG();
rag.addExample({
  text: 'j ai vendu mes porcs',
  action: 'create_revenu',
  params: {},
  confidence: 0.9,
});
```

---

## 📊 Métriques de Performance

### Objectifs

- **Précision de détection** : > 90%
- **Taux de validation** : > 95% (données valides avant exécution)
- **Temps de réponse** : < 2 secondes

### Mesure

- Logs des détections d'intention
- Taux d'erreurs de validation
- Temps d'exécution moyen

---

## 🐛 Dépannage

### L'agent ne détecte pas l'intention

1. Vérifier la base de connaissances RAG
2. Ajouter un exemple similaire
3. Vérifier les logs de confiance

### L'extraction de paramètres échoue

1. Vérifier le contexte conversationnel
2. Vérifier les patterns dans `ParameterExtractor`
3. Ajouter des variantes linguistiques

### La validation échoue

1. Vérifier les règles dans `DataValidator`
2. Ajuster les seuils si nécessaire
3. Vérifier les données d'entrée

---

## 📚 Références

- `ARCHITECTURE_AGENT_CONVERSATIONNEL.md` : Architecture détaillée
- `ANALYSE_AGENT_CONVERSATIONNEL.md` : Analyse des limitations précédentes
- Code source : `src/services/chatAgent/core/`
