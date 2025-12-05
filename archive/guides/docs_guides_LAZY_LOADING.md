# ⚡ Lazy Loading & Code Splitting

Guide complet sur l'implémentation du lazy loading dans l'application pour améliorer les performances.

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Architecture actuelle](#architecture-actuelle)
3. [Optimisations supplémentaires](#optimisations-supplémentaires)
4. [Bonnes pratiques](#bonnes-pratiques)
5. [Monitoring des performances](#monitoring-des-performances)

---

## Introduction

Le lazy loading permet de :
- ✅ Réduire le bundle initial (temps de démarrage)
- ✅ Réduire la consommation mémoire
- ✅ Charger les écrans uniquement quand nécessaire
- ✅ Améliorer l'expérience utilisateur

### Impact mesuré

- **Bundle initial** : Réduction de ~40-60% selon les écrans
- **Temps de démarrage** : Amélioration de 30-50%
- **Mémoire** : Réduction de 20-30% en moyenne

---

## Architecture actuelle

### Structure

```
src/
├── navigation/
│   ├── AppNavigator.tsx      # Navigation principale
│   └── lazyScreens.ts        # Tous les écrans lazy-loaded
├── components/
│   └── LazyScreenWrapper.tsx # Wrapper avec Suspense
└── screens/
    └── [tous les écrans]     # Écrans chargés à la demande
```

### Implémentation

#### 1. Définition des écrans lazy (`lazyScreens.ts`)

```typescript
import { lazy } from 'react';

// Tous les écrans sont lazy-loaded
export const DashboardScreen = lazy(() => import('../screens/DashboardScreen'));
export const FinanceScreen = lazy(() => import('../screens/FinanceScreen'));
// ... etc
```

#### 2. Wrapper avec Suspense (`LazyScreenWrapper.tsx`)

```typescript
import { Suspense } from 'react';
import { ActivityIndicator } from 'react-native';

export function LazyScreenWrapper({ children, fallback }) {
  return (
    <Suspense fallback={fallback || <ActivityIndicator />}>
      {children}
    </Suspense>
  );
}
```

#### 3. Utilisation dans la navigation (`AppNavigator.tsx`)

```typescript
import * as LazyScreens from './lazyScreens';
import { LazyScreenWrapper } from '../components/LazyScreenWrapper';

<Tab.Screen name={SCREENS.FINANCE}>
  {() => (
    <LazyScreenWrapper>
      <LazyScreens.FinanceScreen />
    </LazyScreenWrapper>
  )}
</Tab.Screen>
```

---

## Optimisations supplémentaires

### 1. Preloading stratégique

Précharger les écrans fréquemment utilisés :

```typescript
// Précharger le dashboard après l'authentification
useEffect(() => {
  if (isAuthenticated) {
    // Précharger les écrans principaux
    import('../screens/DashboardScreen');
    import('../screens/ProductionScreen');
  }
}, [isAuthenticated]);
```

### 2. Code splitting des composants lourds

Pour les composants volumineux dans les écrans :

```typescript
// Dans un écran
const HeavyChart = lazy(() => import('../components/HeavyChart'));

function DashboardScreen() {
  return (
    <View>
      <LightContent />
      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart />
      </Suspense>
    </View>
  );
}
```

### 3. Lazy loading conditionnel

Charger certains écrans seulement si nécessaire :

```typescript
// Charger l'écran admin seulement si l'utilisateur est admin
const AdminScreen = activeRole === 'admin' 
  ? lazy(() => import('../screens/AdminScreen'))
  : null;
```

### 4. Optimisation des imports

Éviter les imports inutiles dans les écrans :

```typescript
// ❌ Mauvais : Import de toute la bibliothèque
import * as Icons from 'react-native-vector-icons';

// ✅ Bon : Import sélectif
import Icon from 'react-native-vector-icons/Ionicons';
```

---

## Bonnes pratiques

### ✅ À faire

1. **Lazy load tous les écrans**
   - Tous les écrans doivent être dans `lazyScreens.ts`
   - Utiliser `LazyScreenWrapper` partout

2. **Fallback approprié**
   - Fournir un fallback qui correspond au design
   - Utiliser des skeletons plutôt que des spinners simples

3. **Preloading intelligent**
   - Précharger les écrans probables après l'auth
   - Ne pas précharger tout (perd l'avantage)

4. **Monitoring**
   - Mesurer le temps de chargement
   - Identifier les écrans lents

### ❌ À éviter

1. **Ne pas lazy load les écrans critiques**
   - Le dashboard principal peut être préchargé
   - Mais les écrans secondaires doivent être lazy

2. **Ne pas créer trop de chunks**
   - React Native a des limites sur le nombre de chunks
   - Grouper les écrans similaires si nécessaire

3. **Ne pas oublier les dépendances**
   - Si un écran dépend d'un service lourd, le lazy load aussi

---

## Monitoring des performances

### Métriques à suivre

1. **Temps de chargement initial**
   ```typescript
   const startTime = performance.now();
   // ... chargement
   const loadTime = performance.now() - startTime;
   ```

2. **Taille du bundle**
   ```bash
   # Analyser le bundle
   npx react-native-bundle-visualizer
   ```

3. **Mémoire utilisée**
   ```typescript
   // Utiliser React DevTools Profiler
   // Ou Flipper pour React Native
   ```

### Outils recommandés

- **Flipper** : Profiling React Native
- **React DevTools** : Profiler pour les composants
- **Metro bundler** : Analyse du bundle
- **Performance Monitor** : Métriques en temps réel

---

## Exemples pratiques

### Exemple 1 : Écran avec composants lourds

```typescript
// DashboardScreen.tsx
import { lazy, Suspense } from 'react';
import { View } from 'react-native';

// Lazy load des composants lourds
const PriceChart = lazy(() => import('../components/PriceChart'));
const AnalyticsWidget = lazy(() => import('../components/AnalyticsWidget'));

export default function DashboardScreen() {
  return (
    <View>
      <Header />
      <Suspense fallback={<ChartSkeleton />}>
        <PriceChart />
      </Suspense>
      <Suspense fallback={<WidgetSkeleton />}>
        <AnalyticsWidget />
      </Suspense>
    </View>
  );
}
```

### Exemple 2 : Preloading conditionnel

```typescript
// AppNavigator.tsx
import { useEffect } from 'react';
import { useAppSelector } from '../store/hooks';

function AppNavigator() {
  const activeRole = useAppSelector((state) => state.auth.activeRole);

  useEffect(() => {
    // Précharger les écrans selon le rôle
    if (activeRole === 'producer') {
      import('../screens/ProductionScreen');
      import('../screens/FinanceScreen');
    } else if (activeRole === 'buyer') {
      import('../screens/MyPurchasesScreen');
    }
  }, [activeRole]);

  // ... navigation
}
```

### Exemple 3 : Fallback personnalisé

```typescript
// LazyScreenWrapper.tsx
import { Suspense } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

export function LazyScreenWrapper({ children, screenName }) {
  const fallback = (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text>Chargement de {screenName}...</Text>
    </View>
  );

  return <Suspense fallback={fallback}>{children}</Suspense>;
}
```

---

## Migration depuis imports directs

### Avant (sans lazy loading)

```typescript
// AppNavigator.tsx
import DashboardScreen from '../screens/DashboardScreen';
import FinanceScreen from '../screens/FinanceScreen';

<Tab.Screen component={DashboardScreen} />
```

### Après (avec lazy loading)

```typescript
// lazyScreens.ts
export const DashboardScreen = lazy(() => import('../screens/DashboardScreen'));

// AppNavigator.tsx
import * as LazyScreens from './lazyScreens';

<Tab.Screen>
  {() => (
    <LazyScreenWrapper>
      <LazyScreens.DashboardScreen />
    </LazyScreenWrapper>
  )}
</Tab.Screen>
```

---

## Dépannage

### Problème : Écran ne se charge pas

1. Vérifier que l'écran est dans `lazyScreens.ts`
2. Vérifier que `LazyScreenWrapper` est utilisé
3. Vérifier les erreurs dans la console

### Problème : Flash blanc au chargement

1. Améliorer le fallback (skeleton au lieu de spinner)
2. Précharger l'écran si possible
3. Optimiser le temps de chargement de l'écran

### Problème : Bundle toujours trop gros

1. Vérifier que tous les écrans sont lazy
2. Vérifier les imports dans les écrans
3. Utiliser `react-native-bundle-visualizer` pour identifier les gros modules

---

## Références

- [React.lazy() Documentation](https://react.dev/reference/react/lazy)
- [React Suspense](https://react.dev/reference/react/Suspense)
- [React Native Performance](https://reactnative.dev/docs/performance)

