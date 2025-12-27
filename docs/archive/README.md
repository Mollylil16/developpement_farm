# 🏗️ Documentation Architecture - Fermier Pro

**Date:** 21 Novembre 2025  
**Version:** 1.0

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture globale](#architecture-globale)
3. [Décisions architecturales (ADRs)](#décisions-architecturales-adrs)
4. [Patterns et conventions](#patterns-et-conventions)
5. [Références](#références)

---

## Vue d'ensemble

Cette section centralise toute la documentation architecturale du projet Fermier Pro. Elle remplace la documentation dispersée dans `docs/archive/` et fournit une vue structurée et à jour de l'architecture.

### Structure

```
docs/architecture/
├── README.md                    # Ce fichier - Index
├── overview.md                  # Vue d'ensemble de l'architecture
├── decisions/                   # Architecture Decision Records (ADRs)
│   ├── 001-repository-pattern.md
│   ├── 002-redux-toolkit.md
│   └── ...
├── patterns/                    # Patterns utilisés
│   ├── repository-pattern.md
│   ├── service-layer.md
│   └── ...
└── references/                  # Références vers docs/archive
    └── index.md
```

---

## Architecture globale

### Documents principaux

1. **[overview.md](overview.md)** - Vue d'ensemble complète
   - Structure du projet
   - Flux de données
   - Technologies utilisées

2. **[CONTEXT.md](../CONTEXT.md)** - Contexte technique
   - Configuration
   - Dépendances
   - Environnement

### Domaines métier

L'application est organisée en domaines :

- **Production** : Gestion des animaux, pesées, reproduction
- **Finance** : Dépenses, revenus, OPEX/CAPEX
- **Santé** : Vaccinations, traitements, visites vétérinaires
- **Marketplace** : Transactions, offres, chat

Voir [domains/README.md](../../src/domains/README.md) pour plus de détails.

---

## Décisions architecturales (ADRs)

Les Architecture Decision Records documentent les décisions importantes prises lors du développement.

### ADRs disponibles

- **[001-repository-pattern.md](decisions/001-repository-pattern.md)** - Pourquoi le Repository Pattern
- **[002-redux-toolkit.md](decisions/002-redux-toolkit.md)** - Choix de Redux Toolkit
- **[003-lazy-loading.md](decisions/003-lazy-loading.md)** - Implémentation du lazy loading
- **[004-feature-flags.md](decisions/004-feature-flags.md)** - Système de Feature Flags

### Format ADR

Chaque ADR suit le format standard :

```markdown
# ADR-XXX: Titre

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
Pourquoi cette décision est nécessaire

## Decision
Quelle décision a été prise

## Consequences
Avantages et inconvénients
```

---

## Patterns et conventions

### Patterns utilisés

1. **Repository Pattern** - Abstraction de l'accès aux données
   - Voir [patterns/repository-pattern.md](patterns/repository-pattern.md)

2. **Service Layer** - Logique métier centralisée
   - Voir [patterns/service-layer.md](patterns/service-layer.md)

3. **Redux Toolkit** - Gestion d'état
   - Voir [patterns/redux-patterns.md](patterns/redux-patterns.md)

### Conventions de code

- **TypeScript strict** : Types stricts activés
- **ESLint + Prettier** : Formatage automatique
- **Tests** : Jest + React Testing Library
- **Structure** : Domain-Driven Design partiel

---

## Références

### Documentation historique

La documentation historique reste disponible dans `docs/archive/` pour référence :

- **Phases de développement** : `docs/archive/PHASE*.md`
- **Refactoring** : `docs/archive/REFACTORING*.md`
- **Guides techniques** : `docs/archive/GUIDE*.md`

Voir [references/index.md](references/index.md) pour un index complet.

### Guides techniques

Les guides pratiques sont dans `docs/guides/` :

- **Feature Flags** : [guides/FEATURE_FLAGS.md](../guides/FEATURE_FLAGS.md)
- **Lazy Loading** : [guides/LAZY_LOADING.md](../guides/LAZY_LOADING.md)
- **Dependency Management** : [guides/DEPENDENCY_MANAGEMENT.md](../guides/DEPENDENCY_MANAGEMENT.md)

---

## Navigation rapide

### Pour comprendre l'architecture

1. Commencer par [overview.md](overview.md)
2. Lire [CONTEXT.md](../CONTEXT.md) pour le contexte technique
3. Consulter les ADRs dans [decisions/](decisions/)

### Pour contribuer

1. Lire les [patterns](patterns/) pour comprendre les conventions
2. Consulter les ADRs avant de prendre des décisions
3. Mettre à jour la documentation si nécessaire

---

## Maintenance

Cette documentation doit être maintenue à jour :

- ✅ Mettre à jour lors de changements architecturaux majeurs
- ✅ Créer un ADR pour chaque décision importante
- ✅ Documenter les nouveaux patterns utilisés
- ✅ Référencer la documentation historique dans `docs/archive/`

---

**Dernière mise à jour:** 21 Novembre 2025

