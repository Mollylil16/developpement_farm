# 📚 Documentation Architecture - Kouakou

## 📖 Documents Disponibles

### 1. [Architecture Complète](./kouakou-architecture-complete.md)
**Document principal** - Vue d'ensemble complète de l'architecture de Kouakou.

**Contenu:**
- Vue d'ensemble et stack technologique
- Architecture en couches (7 couches)
- Flux de données détaillés
- Composants principaux (ChatAgentService, FastPathDetector, IntentRAG, etc.)
- Structure complète des fichiers
- Détection d'intention (5 étapes)
- Exécution d'actions
- Base de connaissances
- API Backend
- Exemples de code
- Métriques de performance
- Évolutions futures

**Pour qui:** Développeurs, architectes, nouveaux contributeurs

---

### 2. [Diagrammes de Séquence](./kouakou-sequence-diagram.md)
**Diagrammes UML** - Flux d'exécution détaillés pour différents scénarios.

**Scénarios couverts:**
- "Quel est le prix du marché ?" (consultation)
- "J'ai dépensé 50000 FCFA" (création avec paramètres)
- Clarification nécessaire (multi-tours)

**Pour qui:** Développeurs qui veulent comprendre le flux exact

---

## 🚀 Démarrage Rapide

### Pour comprendre l'architecture rapidement:

1. **Lire:** [Architecture Complète - Vue d'ensemble](./kouakou-architecture-complete.md#vue-densemble)
2. **Comprendre:** [Flux de Données](./kouakou-architecture-complete.md#flux-de-données)
3. **Explorer:** [Composants Principaux](./kouakou-architecture-complete.md#composants-principaux)

### Pour ajouter une nouvelle fonctionnalité:

1. **Lire:** [Exemples de Code - Création d'une Nouvelle Action](./kouakou-architecture-complete.md#2-création-dune-nouvelle-action)
2. **Comprendre:** [Structure des Fichiers](./kouakou-architecture-complete.md#structure-des-fichiers)
3. **Suivre:** [Détection d'Intention](./kouakou-architecture-complete.md#détection-dintention)

### Pour déboguer un problème:

1. **Vérifier:** [Flux de Détection d'Intention](./kouakou-architecture-complete.md#pipeline-de-détection-5-étapes)
2. **Consulter:** [Diagrammes de Séquence](./kouakou-sequence-diagram.md)
3. **Analyser:** [Métriques de Performance](./kouakou-architecture-complete.md#métriques-de-performance)

---

## 📂 Structure de la Documentation

```
docs/
├── architecture/
│   ├── README.md (ce fichier)
│   ├── kouakou-architecture-complete.md
│   └── kouakou-sequence-diagram.md
│
├── analysis/
│   ├── marketplace-complete-analysis-v2.md
│   ├── production-module-analysis.md
│   └── weighing-health-modules-analysis.md
│
└── ...
```

---

## 🔍 Points Clés à Retenir

### Architecture en 7 Couches

1. **Présentation** - UI React Native
2. **Hooks React** - `useChatAgent`
3. **Service** - `ChatAgentService` (orchestrateur)
4. **Core** - Composants métier (FastPath, IntentRAG, NLP, etc.)
5. **Actions** - Exécution métier (Finance, Marketplace, Production, etc.)
6. **API** - Communication HTTP
7. **Backend** - NestJS + PostgreSQL

### Détection d'Intention (5 Étapes)

1. **FastPathDetector** (priorité absolue, < 20ms)
2. **NLP Hints** (indices linguistiques)
3. **LearningService** (apprentissage, seuil ≥ 4.0)
4. **IntentRAG** (base de connaissances, < 100ms)
5. **IntentDetector** (fallback final)

### Performance

- **FastPath:** 18ms (95% des cas)
- **IntentRAG:** 57ms (fallback)
- **Total:** < 500ms (moyenne)

---

## 📝 Mise à Jour de la Documentation

Lors de modifications importantes de l'architecture:

1. Mettre à jour [Architecture Complète](./kouakou-architecture-complete.md)
2. Ajouter des diagrammes si nécessaire dans [Diagrammes de Séquence](./kouakou-sequence-diagram.md)
3. Mettre à jour ce README si la structure change

---

## 🤝 Contribution

Pour améliorer cette documentation:

1. Identifier les sections manquantes ou confuses
2. Ajouter des exemples de code si nécessaire
3. Créer des diagrammes pour clarifier les concepts complexes
4. Mettre à jour les métriques de performance

---

**Dernière mise à jour:** 2026-01-17  
**Version Kouakou:** 5.0
