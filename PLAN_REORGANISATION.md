# 📋 Plan de Réorganisation Complète du Projet

## 🎯 Objectifs

1. **Structure claire et logique** : Organisation par domaine métier
2. **Séparation des responsabilités** : Chaque couche a un rôle précis
3. **Maintenabilité** : Facile à trouver et modifier le code
4. **Scalabilité** : Prêt pour la croissance du projet
5. **Cohérence** : Même structure pour tous les domaines

---

## 📂 Structure Cible (Clean Architecture + DDD)

```
fermier-pro/
├── src/
│   ├── app/                          # 🚀 Point d'entrée de l'application
│   │   ├── App.tsx                   # Composant racine
│   │   └── index.ts                  # Entry point
│   │
│   ├── core/                         # 🎯 Code partagé entre tous les domaines
│   │   ├── config/                   # Configuration globale
│   │   │   ├── api.config.ts
│   │   │   ├── env.ts
│   │   │   ├── featureFlags.ts
│   │   │   └── theme.ts
│   │   ├── constants/                # Constantes globales
│   │   │   ├── races.ts
│   │   │   ├── notifications.ts
│   │   │   └── alternativesIngredients.ts
│   │   ├── types/                    # Types partagés
│   │   │   ├── index.ts
│   │   │   ├── common.ts
│   │   │   ├── errors.ts
│   │   │   └── roles.ts
│   │   ├── utils/                    # Utilitaires généraux
│   │   │   ├── formatters.ts
│   │   │   ├── logger.ts
│   │   │   ├── locationUtils.ts
│   │   │   └── validation.ts
│   │   └── contexts/                 # Contextes React globaux
│   │       ├── ThemeContext.tsx
│   │       ├── RoleContext.tsx
│   │       └── LanguageContext.tsx
│   │
│   ├── shared/                       # 🔄 Code réutilisable entre domaines
│   │   ├── components/               # Composants UI génériques
│   │   │   ├── ui/                   # Composants UI de base (Button, Input, etc.)
│   │   │   ├── layout/               # Composants de layout (Container, Card, etc.)
│   │   │   └── forms/                # Composants de formulaire génériques
│   │   ├── hooks/                    # Hooks génériques
│   │   │   ├── useAuthLoading.ts
│   │   │   ├── useFormValidation.ts
│   │   │   ├── useGeolocation.ts
│   │   │   └── useRefreshControl.ts
│   │   └── services/                  # Services partagés
│   │       ├── api/                  # API Client
│   │       │   ├── apiClient.ts
│   │       │   └── retryHandler.ts
│   │       ├── auth/                  # Authentification
│   │       │   ├── oauthService.ts
│   │       │   └── autoLogout.ts
│   │       ├── network/               # Réseau
│   │       │   └── networkService.ts
│   │       └── database.ts            # Service DB principal
│   │
│   ├── features/                     # 🏗️ Domaines métier (Features)
│   │   ├── auth/                     # Authentification
│   │   │   ├── screens/
│   │   │   │   ├── AuthScreen.tsx
│   │   │   │   └── OnboardingAuthScreen.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   │   ├── authSlice.ts
│   │   │   │   └── authSelectors.ts
│   │   │   └── types/
│   │   │       └── auth.ts
│   │   │
│   │   ├── project/                  # Gestion des projets
│   │   │   ├── screens/
│   │   │   │   └── CreateProjectScreen.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   │   ├── projetSlice.ts
│   │   │   │   └── projetSelectors.ts
│   │   │   └── types/
│   │   │       └── projet.ts
│   │   │
│   │   ├── production/               # Production (animaux, pesées)
│   │   │   ├── screens/
│   │   │   │   └── ProductionScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── ProductionAnimalsListComponent.tsx
│   │   │   │   ├── ProductionCheptelComponent.tsx
│   │   │   │   ├── ProductionPeseeFormModal.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   │   ├── useProductionCheptelLogic.ts
│   │   │   │   └── useProductionCheptelStatut.ts
│   │   │   ├── services/
│   │   │   │   └── ProductionGMQService.ts
│   │   │   ├── store/
│   │   │   │   ├── productionSlice.ts
│   │   │   │   └── productionSelectors.ts
│   │   │   ├── database/
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── AnimalRepository.ts
│   │   │   │   │   └── PeseeRepository.ts
│   │   │   │   └── schemas/
│   │   │   │       └── production.ts
│   │   │   └── types/
│   │   │       └── production.ts
│   │   │
│   │   ├── reproduction/            # Reproduction (gestations, sevrages)
│   │   │   ├── screens/
│   │   │   │   └── ReproductionScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── GestationsListComponent.tsx
│   │   │   │   ├── GestationFormModal.tsx
│   │   │   │   ├── SevragesListComponent.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   │   ├── reproductionSlice.ts
│   │   │   │   └── reproductionSelectors.ts
│   │   │   ├── database/
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── GestationRepository.ts
│   │   │   │   │   └── SevrageRepository.ts
│   │   │   │   └── schemas/
│   │   │   │       └── reproduction.ts
│   │   │   └── types/
│   │   │       └── reproduction.ts
│   │   │
│   │   ├── nutrition/               # Nutrition (rations, ingrédients, stocks)
│   │   │   ├── screens/
│   │   │   │   └── NutritionScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── IngredientsComponent.tsx
│   │   │   │   ├── RationsHistoryComponent.tsx
│   │   │   │   ├── NutritionStockComponent.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   │   ├── nutritionSlice.ts
│   │   │   │   ├── stocksSlice.ts
│   │   │   │   └── nutritionSelectors.ts
│   │   │   ├── database/
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── IngredientRepository.ts
│   │   │   │   │   ├── RationRepository.ts
│   │   │   │   │   └── StockRepository.ts
│   │   │   │   └── schemas/
│   │   │   │       └── nutrition.ts
│   │   │   └── types/
│   │   │       └── nutrition.ts
│   │   │
│   │   ├── sante/                   # Santé (vaccinations, maladies, traitements)
│   │   │   ├── screens/
│   │   │   │   ├── SanteScreen.tsx
│   │   │   │   └── VaccinationScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── VaccinationsComponentNew.tsx
│   │   │   │   ├── MaladiesComponentNew.tsx
│   │   │   │   ├── TraitementsComponentNew.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   │   ├── useVaccinationLogic.ts
│   │   │   │   ├── useSanteLogic.ts
│   │   │   │   └── ...
│   │   │   ├── services/
│   │   │   │   ├── SanteCoutsService.ts
│   │   │   │   ├── SanteRecommandationsService.ts
│   │   │   │   └── ...
│   │   │   ├── store/
│   │   │   │   ├── santeSlice.ts
│   │   │   │   └── santeSelectors.ts
│   │   │   ├── database/
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── VaccinationRepository.ts
│   │   │   │   │   ├── MaladieRepository.ts
│   │   │   │   │   └── TraitementRepository.ts
│   │   │   │   └── schemas/
│   │   │   │       └── sante.ts
│   │   │   └── types/
│   │   │       └── sante.ts
│   │   │
│   │   ├── finance/                 # Finance (revenus, dépenses, charges)
│   │   │   ├── screens/
│   │   │   │   └── FinanceScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── FinanceRevenusComponent.tsx
│   │   │   │   ├── FinanceDepensesComponent.tsx
│   │   │   │   ├── FinanceChargesFixesComponent.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   │   ├── financeSlice.ts
│   │   │   │   └── financeSelectors.ts
│   │   │   ├── database/
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── RevenuRepository.ts
│   │   │   │   │   ├── DepensePonctuelleRepository.ts
│   │   │   │   │   └── ChargeFixeRepository.ts
│   │   │   │   └── schemas/
│   │   │   │       └── finance.ts
│   │   │   └── types/
│   │   │       └── finance.ts
│   │   │
│   │   ├── planning/               # Planification
│   │   │   ├── screens/
│   │   │   │   ├── PlanificationScreen.tsx
│   │   │   │   └── PlanningProductionScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── PlanificationCalendarComponent.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   │   ├── planificationSlice.ts
│   │   │   │   └── planningProductionSlice.ts
│   │   │   └── types/
│   │   │       └── planification.ts
│   │   │
│   │   ├── reports/                 # Rapports et statistiques
│   │   │   ├── screens/
│   │   │   │   └── ReportsScreen.tsx
│   │   │   ├── components/
│   │   │   │   └── TendancesChartsComponent.tsx
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   │   ├── StatisticsService.ts
│   │   │   │   └── exportService.ts
│   │   │   ├── store/
│   │   │   │   └── reportsSlice.ts
│   │   │   └── types/
│   │   │       └── rapports.ts
│   │   │
│   │   ├── collaboration/           # Collaboration
│   │   │   ├── screens/
│   │   │   │   └── CollaborationScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── CollaborationListComponent.tsx
│   │   │   │   └── CollaborationFormModal.tsx
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   │   ├── collaborationSlice.ts
│   │   │   │   └── collaborationSelectors.ts
│   │   │   └── types/
│   │   │       └── collaboration.ts
│   │   │
│   │   ├── marketplace/             # Marketplace
│   │   │   ├── screens/
│   │   │   │   ├── MarketplaceScreen.tsx
│   │   │   │   └── ...
│   │   │   ├── components/
│   │   │   │   ├── marketplace/
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   │   ├── useMarketplace.ts
│   │   │   │   └── useMarketplaceChat.ts
│   │   │   ├── services/
│   │   │   │   ├── MarketplaceService.ts
│   │   │   │   └── PurchaseRequestService.ts
│   │   │   ├── store/
│   │   │   │   └── marketplaceSlice.ts
│   │   │   └── types/
│   │   │       └── marketplace.ts
│   │   │
│   │   ├── chat-agent/              # Agent conversationnel IA
│   │   │   ├── screens/
│   │   │   │   └── ChatAgentScreen.tsx
│   │   │   ├── components/
│   │   │   │   └── chatAgent/
│   │   │   ├── hooks/
│   │   │   │   └── useChatAgent.ts
│   │   │   ├── services/
│   │   │   │   ├── chatAgent/
│   │   │   │   └── ...
│   │   │   └── types/
│   │   │       └── chatAgent.ts
│   │   │
│   │   └── dashboard/               # Dashboard
│   │       ├── screens/
│   │       │   ├── DashboardScreen.tsx
│   │       │   ├── DashboardBuyerScreen.tsx
│   │       │   └── ...
│   │       ├── components/
│   │       │   └── widgets/
│   │       ├── hooks/
│   │       │   ├── useDashboardData.ts
│   │       │   └── widgets/
│   │       └── services/
│   │           └── PerformanceGlobaleService.ts
│   │
│   ├── infrastructure/              # 🔧 Infrastructure (DB, migrations)
│   │   ├── database/
│   │   │   ├── migrations/          # Migrations SQLite
│   │   │   ├── indexes/             # Index de base de données
│   │   │   └── seed/                # Données de seed
│   │   └── i18n/                    # Internationalisation
│   │       └── locales/
│   │           ├── fr.json
│   │           └── en.json
│   │
│   ├── navigation/                  # 🧭 Navigation
│   │   ├── AppNavigator.tsx
│   │   ├── CheptelStackNavigator.tsx
│   │   ├── lazyScreens.ts
│   │   └── types.ts
│   │
│   └── store/                        # 🗄️ Store Redux global
│       ├── store.ts                  # Configuration du store
│       ├── hooks.ts                  # Hooks Redux (useAppSelector, useAppDispatch)
│       └── normalization/            # Schémas de normalisation
│           └── schemas.ts
│
├── backend/                          # 🖥️ Backend NestJS
│   └── ...
│
└── scripts/                          # 📜 Scripts utilitaires
    └── ...
```

---

## 🔄 Plan de Migration

### Phase 1 : Préparation
1. ✅ Créer le plan de réorganisation
2. Créer les nouveaux dossiers
3. Documenter les changements

### Phase 2 : Core & Shared
1. Déplacer `config/` → `core/config/`
2. Déplacer `constants/` → `core/constants/`
3. Déplacer types partagés → `core/types/`
4. Déplacer utils généraux → `core/utils/`
5. Déplacer contexts → `core/contexts/`
6. Déplacer services partagés → `shared/services/`
7. Déplacer composants UI génériques → `shared/components/`

### Phase 3 : Features (Domaines)
Pour chaque domaine (auth, production, finance, etc.) :
1. Créer la structure du domaine
2. Déplacer les screens
3. Déplacer les components
4. Déplacer les hooks
5. Déplacer les services
6. Déplacer les slices Redux
7. Déplacer les selectors
8. Déplacer les types
9. Déplacer les repositories
10. Déplacer les schemas

### Phase 4 : Infrastructure
1. Déplacer migrations → `infrastructure/database/migrations/`
2. Déplacer indexes → `infrastructure/database/indexes/`
3. Déplacer seed → `infrastructure/database/seed/`
4. Déplacer locales → `infrastructure/i18n/locales/`

### Phase 5 : Mise à jour des imports
1. Mettre à jour tous les imports relatifs
2. Vérifier qu'il n'y a pas d'erreurs
3. Tester l'application

### Phase 6 : Nettoyage
1. Supprimer les anciens dossiers vides
2. Mettre à jour la documentation
3. Créer un guide de migration

---

## 📝 Règles d'Organisation

### 1. Structure par Feature (Domaine)
Chaque feature est autonome et contient :
- `screens/` : Écrans de la feature
- `components/` : Composants spécifiques à la feature
- `hooks/` : Hooks spécifiques à la feature
- `services/` : Services métier de la feature
- `store/` : Slices Redux de la feature
- `database/` : Repositories et schemas de la feature
- `types/` : Types TypeScript de la feature

### 2. Code Partagé
- `core/` : Code utilisé par TOUS les domaines
- `shared/` : Code réutilisable entre PLUSIEURS domaines

### 3. Imports
- Depuis une feature vers core : `@core/...`
- Depuis une feature vers shared : `@shared/...`
- Entre features : Éviter (utiliser shared si nécessaire)

### 4. Nommage
- Fichiers : PascalCase pour composants, camelCase pour le reste
- Dossiers : camelCase
- Exports : Named exports de préférence

---

## ✅ Avantages de cette Structure

1. **Clarté** : Chaque domaine est isolé et facile à trouver
2. **Maintenabilité** : Modifications localisées par domaine
3. **Testabilité** : Tests organisés par domaine
4. **Scalabilité** : Facile d'ajouter de nouveaux domaines
5. **Collaboration** : Plusieurs devs peuvent travailler sur différents domaines
6. **Réutilisabilité** : Code partagé bien identifié

---

**Date de création** : 2025-01-09  
**Statut** : En cours

