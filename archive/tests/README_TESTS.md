# 🧪 Guide des Tests - Fermier Pro

## 📋 Table des Matières

1. [Configuration](#configuration)
2. [Exécuter les Tests](#exécuter-les-tests)
3. [Écrire des Tests](#écrire-des-tests)
4. [Exemples](#exemples)
5. [Bonnes Pratiques](#bonnes-pratiques)

---

## Configuration

### Outils Installés

- **Jest** - Framework de test
- **React Testing Library** - Tests de composants
- **@testing-library/jest-native** - Matchers pour React Native
- **ts-jest** - Support TypeScript

### Fichiers de Configuration

```
jest.config.js        - Configuration principale
jest.setup.js         - Setup et mocks globaux
__mocks__/            - Mocks personnalisés
```

---

## Exécuter les Tests

### Commandes Disponibles

```bash
# Lancer tous les tests
npm test

# Mode watch (relance automatique)
npm run test:watch

# Avec coverage
npm run test:coverage

# Test d'un fichier spécifique
npm test -- Button.test.tsx

# Tests avec pattern
npm test -- --testPathPattern=components
```

### Coverage

Les rapports de coverage sont générés dans le dossier `coverage/`:
- `coverage/lcov-report/index.html` - Rapport HTML interactif
- `coverage/lcov.info` - Format LCOV
- `coverage/clover.xml` - Format Clover

**Objectifs de coverage:**
- **Statements:** 70%
- **Branches:** 60%
- **Functions:** 70%
- **Lines:** 70%

---

## Écrire des Tests

### Structure d'un Test

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import MonComposant from '../MonComposant';

describe('MonComposant', () => {
  it('devrait faire quelque chose', () => {
    // Arrange (Préparer)
    const props = { /* ... */ };
    
    // Act (Agir)
    const { getByText } = render(<MonComposant {...props} />);
    
    // Assert (Vérifier)
    expect(getByText('Texte')).toBeTruthy();
  });
});
```

### Types de Tests

#### 1. Tests de Composants React Native

```typescript
import { render, fireEvent } from '@testing-library/react-native';

describe('Button', () => {
  it('devrait appeler onPress au clic', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Click" onPress={onPress} />);
    
    fireEvent.press(getByText('Click'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

#### 2. Tests Redux (Slices)

```typescript
import reducer, { action } from '../slice';

describe('Mon Slice', () => {
  it('devrait gérer l\'action', () => {
    const initialState = { /* ... */ };
    const newState = reducer(initialState, action(payload));
    expect(newState).toEqual(expectedState);
  });
});
```

#### 3. Tests de Fonctions Utilitaires

```typescript
import { maFonction } from '../utils';

describe('maFonction', () => {
  it('devrait retourner le bon résultat', () => {
    expect(maFonction(input)).toBe(expectedOutput);
  });
  
  it('devrait gérer les cas limites', () => {
    expect(maFonction(null)).toBeNull();
    expect(maFonction(undefined)).toBeUndefined();
  });
});
```

---

## Exemples

### Exemple 1: Test de Composant Simple

```typescript
// src/components/__tests__/StatCard.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import StatCard from '../StatCard';

describe('StatCard', () => {
  it('devrait afficher le titre et la valeur', () => {
    const { getByText } = render(
      <StatCard title="Total" value="150" icon="🐷" />
    );
    
    expect(getByText('Total')).toBeTruthy();
    expect(getByText('150')).toBeTruthy();
    expect(getByText('🐷')).toBeTruthy();
  });
  
  it('devrait afficher la couleur correcte', () => {
    const { getByTestId } = render(
      <StatCard 
        title="Test" 
        value="100" 
        icon="✓" 
        color="#00FF00"
        testID="stat-card"
      />
    );
    
    const card = getByTestId('stat-card');
    expect(card.props.style).toContainEqual(
      expect.objectContaining({ borderColor: '#00FF00' })
    );
  });
});
```

### Exemple 2: Test Redux Async

```typescript
// src/store/slices/__tests__/productionSlice.test.ts
import { configureStore } from '@reduxjs/toolkit';
import productionReducer, { loadAnimaux } from '../productionSlice';

describe('Production Slice - Async Actions', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: { production: productionReducer },
    });
  });

  it('devrait charger les animaux avec succès', async () => {
    const projetId = 'projet-1';
    
    await store.dispatch(loadAnimaux(projetId));
    
    const state = store.getState().production;
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.entities.animaux).toBeDefined();
  });
});
```

### Exemple 3: Test de Hook Personnalisé

```typescript
// src/hooks/__tests__/useAnimauxActifs.test.ts
import { renderHook } from '@testing-library/react-native';
import { useAnimauxActifs } from '../useAnimauxActifs';
import { Provider } from 'react-redux';
import { store } from '../../store/store';

describe('useAnimauxActifs', () => {
  it('devrait retourner uniquement les animaux actifs', () => {
    const wrapper = ({ children }) => (
      <Provider store={store}>{children}</Provider>
    );
    
    const { result } = renderHook(() => useAnimauxActifs(), { wrapper });
    
    expect(result.current.every(a => a.statut === 'actif')).toBe(true);
  });
});
```

---

## Bonnes Pratiques

### ✅ À FAIRE

1. **Nommer clairement les tests**
   ```typescript
   it('devrait calculer le poids moyen correctement', () => {})
   // ✅ Clair et descriptif
   ```

2. **Tester un comportement, pas l'implémentation**
   ```typescript
   // ✅ BON - Teste le résultat
   expect(getByText('10 animaux')).toBeTruthy();
   
   // ❌ MAUVAIS - Teste l'implémentation
   expect(component.state.count).toBe(10);
   ```

3. **Utiliser des test IDs pour les éléments complexes**
   ```typescript
   <View testID="animal-list">
     {/* ... */}
   </View>
   
   const list = getByTestId('animal-list');
   ```

4. **Mocker les dépendances externes**
   ```typescript
   jest.mock('../services/database', () => ({
     getAnimaux: jest.fn().mockResolvedValue([])
   }));
   ```

5. **Grouper les tests logiquement**
   ```typescript
   describe('Calculs de Production', () => {
     describe('Calcul de poids', () => {
       it('avec pesées valides', () => {});
       it('sans pesées', () => {});
     });
   });
   ```

### ❌ À ÉVITER

1. **Tests trop longs** - Diviser en plusieurs tests
2. **Tests dépendants** - Chaque test doit être indépendant
3. **Tests sans assertions** - Toujours vérifier quelque chose
4. **Magic numbers** - Utiliser des constantes nommées
5. **Ignorer les erreurs** - Les warnings sont importants

---

## Debugging des Tests

### Afficher le rendu

```typescript
import { debug } from '@testing-library/react-native';

const { debug: debugFn } = render(<MonComposant />);
debugFn(); // Affiche l'arbre des composants
```

### Verbose mode

```bash
npm test -- --verbose
```

### Voir les logs

```bash
npm test -- --silent=false
```

---

## Ressources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-native-testing-library/intro)
- [Testing Redux](https://redux.js.org/usage/writing-tests)
- [Jest Matchers](https://jestjs.io/docs/expect)

---

## Prochaines Étapes

1. ✅ Configuration terminée
2. ⏳ Écrire des tests pour les composants critiques
3. ⏳ Atteindre 70%+ de coverage
4. ⏳ Intégrer les tests dans le CI/CD

---

**Commande Rapide:** `npm test -- --watch --coverage`

Bonne chance avec les tests! 🚀

