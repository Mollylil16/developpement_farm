# 🏗️ Vue d'ensemble de l'Architecture

**Date:** 21 Novembre 2025  
**Version:** 1.0

---

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Structure du projet](#structure-du-projet)
3. [Flux de données](#flux-de-données)
4. [Technologies](#technologies)
5. [Domaines métier](#domaines-métier)
6. [Séparation des responsabilités](#séparation-des-responsabilités)

---

## Introduction

Fermier Pro est une application React Native pour la gestion d'élevage porcin. L'architecture suit les principes de **Clean Architecture** et **Domain-Driven Design** partiel, avec une séparation claire des responsabilités.

### Principes architecturaux

1. **Séparation des responsabilités** : Chaque couche a un rôle précis
2. **Testabilité** : Code testable avec mocks et dépendances injectées
3. **Maintenabilité** : Code organisé et documenté
4. **Scalabilité** : Architecture prête pour la croissance

---

## Structure du projet

```
src/
├── components/          # Composants UI réutilisables
│   ├── dashboard/      # Composants dashboard
│   ├── widgets/        # Widgets de données
│   └── ...
│
├── screens/            # Écrans de l'application
│   ├── marketplace/    # Écrans marketplace
│   └── ...
│
├── navigation/         # Configuration navigation
│   ├── AppNavigator.tsx
│   └── lazyScreens.ts  # Lazy loading des écrans
│
├── store/              # Redux store
│   ├── slices/         # Redux slices
│   ├── selectors/      # Selectors memoized
│   └── store.ts
│
├── services/           # Services métier
│   ├── database.ts     # Service DB principal
│   ├── production/     # Services production
│   ├── sante/          # Services santé
│   └── ...
│
├── database/           # Accès aux données
│   ├── repositories/   # Repository Pattern
│   ├── migrations/    # Migrations DB
│   └── schemas/        # Schémas de données
│
├── domains/            # Domaines métier (DDD)
│   ├── production/     # Domaine production
│   ├── finance/       # Domaine finance
│   └── sante/         # Domaine santé
│
├── hooks/              # React hooks personnalisés
│   ├── widgets/       # Hooks pour widgets
│   └── ...
│
├── types/              # Types TypeScript
│   ├── production.ts
│   ├── finance.ts
│   └── ...
│
└── utils/              # Utilitaires
    ├── formatters.ts
    └── ...
```

---

## Flux de données

### Flux unidirectionnel (Redux)

```
User Action
    ↓
Component
    ↓
Action Creator / Thunk
    ↓
Redux Store (State)
    ↓
Selector
    ↓
Component (Re-render)
```

### Accès aux données

```
Component
    ↓
Hook / Service
    ↓
Repository
    ↓
Database (SQLite)
```

### Exemple concret

```typescript
// 1. User clique sur "Ajouter animal"
// 2. Component dispatch une action
dispatch(addAnimal({ name: 'Porc-1', ... }));

// 3. Redux slice met à jour le state
state.production.animaux.push(newAnimal);

// 4. Component se re-render avec les nouvelles données
const animaux = useAppSelector(state => state.production.animaux);
```

---

## Technologies

### Frontend

- **React Native 0.81.5** : Framework mobile
- **Expo 54** : Outils et services
- **TypeScript 5.9** : Typage statique
- **Redux Toolkit 2.10** : Gestion d'état
- **React Navigation 7** : Navigation

### Base de données

- **SQLite (expo-sqlite)** : Base de données locale
- **Repository Pattern** : Abstraction de l'accès aux données

### Outils de développement

- **Jest** : Tests unitaires
- **ESLint** : Linting
- **Prettier** : Formatage
- **TypeScript** : Vérification de types

---

## Domaines métier

### Production

Gestion des animaux, pesées, reproduction.

**Fichiers clés:**
- `src/domains/production/`
- `src/services/production/`
- `src/store/slices/productionSlice.ts`

### Finance

Dépenses, revenus, OPEX/CAPEX, marges.

**Fichiers clés:**
- `src/domains/finance/`
- `src/services/CoutProductionService.ts`
- `src/store/slices/financeSlice.ts`

### Santé

Vaccinations, traitements, visites vétérinaires.

**Fichiers clés:**
- `src/domains/sante/`
- `src/services/sante/`
- `src/store/slices/santeSlice.ts`

### Marketplace

Transactions, offres, chat.

**Fichiers clés:**
- `src/screens/marketplace/`
- `src/services/MarketplaceService.ts`
- `src/store/slices/marketplaceSlice.ts`

---

## Séparation des responsabilités

### Couches de l'application

```
┌─────────────────────────────────────┐
│      Presentation Layer             │
│  (Components, Screens, Navigation)  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Application Layer              │
│  (Hooks, Services, Redux)           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Domain Layer                   │
│  (Business Logic, Entities)         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Infrastructure Layer           │
│  (Repositories, Database)           │
└─────────────────────────────────────┘
```

### Responsabilités par couche

#### Presentation Layer
- Affichage UI
- Gestion des interactions utilisateur
- Navigation

#### Application Layer
- Orchestration des opérations
- Gestion d'état (Redux)
- Hooks personnalisés

#### Domain Layer
- Logique métier pure
- Entités du domaine
- Règles de validation

#### Infrastructure Layer
- Accès aux données
- Persistance
- Services externes

---

## Patterns utilisés

### Repository Pattern

Abstraction de l'accès aux données.

```typescript
// Interface
class AnimalRepository {
  async findAll(): Promise<Animal[]>
  async findById(id: string): Promise<Animal | null>
  async create(animal: Animal): Promise<Animal>
}

// Utilisation
const animals = await animalRepo.findAll();
```

### Service Layer

Logique métier centralisée.

```typescript
class ProductionService {
  async calculateGMQ(animalId: string): Promise<number>
  async getStatistics(projetId: string): Promise<Stats>
}
```

### Redux Toolkit

Gestion d'état avec slices.

```typescript
const productionSlice = createSlice({
  name: 'production',
  initialState,
  reducers: { ... }
});
```

---

## Références

- [CONTEXT.md](../CONTEXT.md) - Contexte technique détaillé
- [decisions/](decisions/) - Décisions architecturales
- [patterns/](patterns/) - Patterns utilisés
- [../guides/](../guides/) - Guides pratiques

---

**Dernière mise à jour:** 21 Novembre 2025

