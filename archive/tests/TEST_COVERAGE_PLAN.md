# Plan de Couverture de Tests - 100%

## 📊 État Actuel
- **Couverture actuelle**: ~1.64%
- **Objectif**: 100%
- **Framework**: Jest + React Native Testing Library

## ✅ Tests Créés (Session Actuelle)

### Hooks
- ✅ `src/hooks/widgets/__tests__/useBuyerWidgets.test.ts`
- ✅ `src/hooks/__tests__/usePorkPriceTrend.test.ts`

### Composants
- ✅ `src/components/widgets/__tests__/CompactModuleCard.test.tsx`
- ✅ `src/components/widgets/__tests__/useWidgetData.test.tsx`

## 📋 Fichiers Prioritaires à Tester

### 🔴 Priorité Haute (Fonctionnalités Critiques)

#### Services
- [ ] `src/services/PorkPriceTrendService.ts`
- [ ] `src/services/MarketplaceService.ts`
- [ ] `src/services/StatisticsService.ts`
- [ ] `src/services/FarmService.ts`
- [ ] `src/services/database.ts`

#### Repositories
- [ ] `src/database/repositories/WeeklyPorkPriceTrendRepository.ts`
- [ ] `src/database/repositories/MarketplaceRepositories.ts`
- [ ] `src/database/repositories/MarketplaceListingRepository.ts`
- [ ] `src/database/repositories/AnimalRepository.ts`

#### Hooks
- [ ] `src/hooks/useBuyerData.ts`
- [ ] `src/hooks/useDashboardData.ts`
- [ ] `src/hooks/useMarketplace.ts`
- [ ] `src/hooks/useVetData.ts`
- [ ] `src/hooks/useTechData.ts`
- [ ] `src/hooks/widgets/useProductionWidget.ts`
- [ ] `src/hooks/widgets/useCollaborationWidget.ts`
- [ ] `src/hooks/widgets/usePlanningWidget.ts`
- [ ] `src/hooks/widgets/useMortalitesWidget.ts`

#### Composants Dashboard
- [ ] `src/components/dashboard/PorkPriceTrendCard.tsx`
- [ ] `src/components/dashboard/DashboardSecondaryWidgets.tsx`
- [ ] `src/components/dashboard/DashboardMainWidgets.tsx`
- [ ] `src/components/dashboard/DashboardHeader.tsx`

#### Screens
- [ ] `src/screens/DashboardBuyerScreen.tsx`
- [ ] `src/screens/DashboardScreen.tsx`
- [ ] `src/screens/DashboardVetScreen.tsx`
- [ ] `src/screens/DashboardTechScreen.tsx`

### 🟡 Priorité Moyenne

#### Composants Widgets
- [ ] `src/components/widgets/OverviewWidget.tsx`
- [ ] `src/components/widgets/ReproductionWidget.tsx`
- [ ] `src/components/widgets/FinanceWidget.tsx`
- [ ] `src/components/widgets/PerformanceWidget.tsx`
- [ ] `src/components/widgets/SanteWidget.tsx`

#### Composants Marketplace
- [ ] `src/components/marketplace/OfferCard.tsx`
- [ ] `src/components/marketplace/ListingCard.tsx`
- [ ] `src/components/marketplace/OfferResponseModal.tsx`
- [ ] `src/components/marketplace/NotificationPanel.tsx`

#### Utilitaires
- [ ] `src/utils/formatters.ts`
- [ ] `src/utils/animalUtils.ts`
- [ ] `src/utils/financeCalculations.ts`
- [ ] `src/utils/dateUtils.ts`
- [ ] `src/utils/marketplaceFilters.ts`

#### Validation
- [ ] `src/validation/reproductionSchemas.ts`
- [ ] `src/validation/financeSchemas.ts`
- [ ] `src/validation/productionSchemas.ts`
- [ ] `src/validation/stocksSchemas.ts`
- [ ] `src/validation/collaborationSchemas.ts`

### 🟢 Priorité Basse

#### Contexts
- [ ] `src/contexts/LanguageContext.tsx`
- [ ] `src/contexts/ThemeContext.tsx`

#### Store/Slices
- [ ] `src/store/slices/authSlice.ts`
- [ ] `src/store/slices/projetSlice.ts`
- [ ] `src/store/slices/collaborationSlice.ts`
- [ ] `src/store/slices/marketplaceSlice.ts`
- [ ] `src/store/slices/productionSlice.ts`
- [ ] `src/store/slices/financeSlice.ts`
- [ ] `src/store/slices/santeSlice.ts`
- [ ] `src/store/slices/nutritionSlice.ts`
- [ ] `src/store/slices/planificationSlice.ts`
- [ ] `src/store/slices/mortalitesSlice.ts`
- [ ] `src/store/slices/reproductionSlice.ts`
- [ ] `src/store/slices/stocksSlice.ts`

#### Services Additionnels
- [ ] `src/services/OnboardingService.ts`
- [ ] `src/services/PerformanceGlobaleService.ts`
- [ ] `src/services/CoutProductionService.ts`
- [ ] `src/services/PricingService.ts`
- [ ] `src/services/exportService.ts`
- [ ] `src/services/pdfService.ts`
- [ ] `src/services/notificationsService.ts`
- [ ] `src/services/chat/*.ts`

## 🛠️ Structure de Test Recommandée

### Pattern de Test pour Hooks
```typescript
describe('useHookName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les données initiales', () => {
    // Test initial state
  });

  it('devrait charger les données correctement', async () => {
    // Test data loading
  });

  it('devrait gérer les erreurs', async () => {
    // Test error handling
  });

  it('devrait gérer les cas limites', () => {
    // Test edge cases
  });
});
```

### Pattern de Test pour Services
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockDb: any;

  beforeEach(() => {
    mockDb = createMockDatabase();
    service = new ServiceName(mockDb);
  });

  it('devrait créer une instance', () => {
    expect(service).toBeDefined();
  });

  it('devrait exécuter la méthode principale', async () => {
    // Test main method
  });

  it('devrait gérer les erreurs', async () => {
    // Test error handling
  });
});
```

### Pattern de Test pour Composants
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait rendre correctement', () => {
    // Test rendering
  });

  it('devrait gérer les interactions utilisateur', () => {
    // Test user interactions
  });

  it('devrait afficher les états de chargement', () => {
    // Test loading states
  });

  it('devrait afficher les états d\'erreur', () => {
    // Test error states
  });
});
```

## 📝 Commandes Utiles

```bash
# Exécuter tous les tests
npm test

# Exécuter avec couverture
npm run test:coverage

# Exécuter en mode watch
npm run test:watch

# Exécuter un fichier spécifique
npm test -- useBuyerWidgets.test.ts

# Vérifier la couverture d'un fichier spécifique
npm run test:coverage -- --collectCoverageFrom="src/hooks/widgets/useBuyerWidgets.ts"
```

## 🎯 Objectifs par Phase

### Phase 1: Services et Repositories (Objectif: 80%+)
- Tous les services critiques
- Tous les repositories
- Tests unitaires complets avec mocks

### Phase 2: Hooks (Objectif: 80%+)
- Tous les hooks personnalisés
- Tests avec renderHook
- Couverture des cas d'erreur

### Phase 3: Composants (Objectif: 70%+)
- Composants principaux
- Tests de rendu et interactions
- Tests d'états (loading, error, empty)

### Phase 4: Screens (Objectif: 60%+)
- Écrans principaux
- Tests de navigation
- Tests d'intégration basiques

### Phase 5: Store et Utilitaires (Objectif: 90%+)
- Tous les slices Redux
- Tous les utilitaires
- Tests unitaires complets

## 🔄 Itération Continue

1. Exécuter `npm run test:coverage`
2. Identifier les fichiers avec < 100% de couverture
3. Créer/améliorer les tests pour ces fichiers
4. Répéter jusqu'à atteindre 100%

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

