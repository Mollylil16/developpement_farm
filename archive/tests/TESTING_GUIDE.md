# Guide Complet pour Atteindre 100% de Couverture de Tests

## 📊 État Actuel
- **Couverture**: ~1.64%
- **Objectif**: 100%
- **Tests existants**: 40 fichiers de tests

## 🎯 Stratégie

### Phase 1: Identifier les Fichiers Non Testés

Exécutez:
```bash
npm run test:coverage
```

Puis examinez le rapport dans `coverage/lcov-report/index.html` pour identifier les fichiers avec 0% de couverture.

### Phase 2: Créer des Tests Systématiquement

Pour chaque fichier non testé, créez un fichier de test correspondant dans le même répertoire avec le suffixe `.test.ts` ou `.test.tsx`.

## 📝 Tests Créés dans cette Session

### ✅ Hooks
1. `src/hooks/widgets/__tests__/useBuyerWidgets.test.ts` - Tests complets pour les widgets acheteur
2. `src/hooks/__tests__/usePorkPriceTrend.test.ts` - Tests pour le hook de tendance de prix

### ✅ Composants
1. `src/components/widgets/__tests__/CompactModuleCard.test.tsx` - Tests pour la carte de module compacte
2. `src/components/widgets/__tests__/useWidgetData.test.tsx` - Tests pour le hook de données de widgets

## 🔧 Prochaines Étapes Recommandées

### 1. Services Critiques (Priorité 1)

Créez des tests pour:
- `src/services/PorkPriceTrendService.ts`
- `src/services/MarketplaceService.ts` (déjà partiellement testé)
- `src/services/StatisticsService.ts`
- `src/services/FarmService.ts`

### 2. Repositories (Priorité 2)

Créez des tests pour:
- `src/database/repositories/WeeklyPorkPriceTrendRepository.ts`
- Tous les autres repositories non testés

### 3. Composants Dashboard (Priorité 3)

Créez des tests pour:
- `src/components/dashboard/PorkPriceTrendCard.tsx`
- `src/components/dashboard/DashboardSecondaryWidgets.tsx`
- `src/components/dashboard/DashboardMainWidgets.tsx`

### 4. Screens (Priorité 4)

Créez des tests pour:
- `src/screens/DashboardBuyerScreen.tsx`
- `src/screens/DashboardScreen.tsx`
- Autres screens critiques

## 📋 Template de Test pour Services

```typescript
/**
 * Tests pour ServiceName
 */

import { ServiceName } from '../ServiceName';
import { getDatabase } from '../../services/database';

// Mock dependencies
jest.mock('../../services/database');

describe('ServiceName', () => {
  let service: ServiceName;
  let mockDb: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDb = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };
    (getDatabase as jest.Mock).mockResolvedValue(mockDb);
    service = new ServiceName(mockDb);
  });

  describe('constructor', () => {
    it('devrait créer une instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('methodName', () => {
    it('devrait exécuter correctement', async () => {
      // Arrange
      const input = { /* test data */ };
      mockDb.getFirstAsync.mockResolvedValue({ /* mock result */ });

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toBeDefined();
      expect(mockDb.getFirstAsync).toHaveBeenCalled();
    });

    it('devrait gérer les erreurs', async () => {
      // Arrange
      mockDb.getFirstAsync.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.methodName({})).rejects.toThrow('Database error');
    });

    it('devrait gérer les cas limites', async () => {
      // Test edge cases
    });
  });
});
```

## 📋 Template de Test pour Repositories

```typescript
/**
 * Tests pour RepositoryName
 */

import { RepositoryName } from '../RepositoryName';
import { BaseRepository } from '../BaseRepository';

jest.mock('../BaseRepository');

describe('RepositoryName', () => {
  let repository: RepositoryName;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };
    repository = new RepositoryName(mockDb);
  });

  describe('create', () => {
    it('devrait créer une entrée', async () => {
      // Test create method
    });
  });

  describe('findById', () => {
    it('devrait trouver par ID', async () => {
      // Test findById
    });

    it('devrait retourner null si non trouvé', async () => {
      // Test not found
    });
  });

  // Autres méthodes...
});
```

## 📋 Template de Test pour Composants

```typescript
/**
 * Tests pour ComponentName
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ComponentName from '../ComponentName';

// Mock dependencies
jest.mock('../../hooks/useHookName');
jest.mock('../../contexts/ContextName');

describe('ComponentName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait rendre correctement', () => {
    const { getByText } = render(<ComponentName />);
    expect(getByText('Expected Text')).toBeTruthy();
  });

  it('devrait gérer les interactions', () => {
    const onPress = jest.fn();
    const { getByText } = render(<ComponentName onPress={onPress} />);
    
    fireEvent.press(getByText('Button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('devrait afficher l\'état de chargement', () => {
    // Test loading state
  });

  it('devrait afficher l\'état d\'erreur', () => {
    // Test error state
  });
});
```

## 🚀 Commandes pour Exécuter les Tests

```bash
# Exécuter tous les tests
npm test

# Exécuter avec couverture
npm run test:coverage

# Exécuter en mode watch
npm run test:watch

# Exécuter un fichier spécifique
npm test -- useBuyerWidgets.test.ts

# Exécuter avec verbose pour voir les détails
npm test -- --verbose

# Exécuter uniquement les tests qui ont changé
npm test -- --onlyChanged
```

## 📊 Vérifier la Couverture

1. Exécutez `npm run test:coverage`
2. Ouvrez `coverage/lcov-report/index.html` dans un navigateur
3. Identifiez les fichiers avec < 100% de couverture
4. Créez/améliorez les tests pour ces fichiers
5. Répétez jusqu'à atteindre 100%

## ✅ Checklist pour Chaque Test

- [ ] Teste le cas nominal (happy path)
- [ ] Teste les cas d'erreur
- [ ] Teste les cas limites (null, undefined, empty)
- [ ] Teste toutes les branches conditionnelles
- [ ] Teste toutes les fonctions publiques
- [ ] Utilise des mocks appropriés
- [ ] Nettoie les mocks dans `afterEach` ou `beforeEach`
- [ ] Les tests sont indépendants
- [ ] Les tests sont rapides (< 1s chacun)
- [ ] Les noms de tests sont descriptifs

## 🔍 Bonnes Pratiques

1. **Isolation**: Chaque test doit être indépendant
2. **AAA Pattern**: Arrange, Act, Assert
3. **Descriptive Names**: Les noms de tests doivent décrire ce qu'ils testent
4. **One Assertion per Test**: Un test = une vérification principale
5. **Mock External Dependencies**: Ne pas dépendre de services externes
6. **Test Edge Cases**: Tester les limites et cas extrêmes
7. **Fast Tests**: Les tests doivent être rapides
8. **Clear Setup/Teardown**: Nettoyer correctement après chaque test

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🎯 Objectif Final

Atteindre 100% de couverture sur:
- ✅ Statements: 100%
- ✅ Branches: 100%
- ✅ Functions: 100%
- ✅ Lines: 100%

**Note**: 100% de couverture ne garantit pas l'absence de bugs, mais assure que tout le code est testé et peut être exécuté dans un environnement contrôlé.

