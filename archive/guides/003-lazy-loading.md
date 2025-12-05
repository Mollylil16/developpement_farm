# ADR-003: Lazy Loading des Écrans

## Status
Accepted

## Date
21 Novembre 2025

## Context

L'application contient de nombreux écrans (50+), ce qui augmente :
- Le bundle initial
- Le temps de démarrage
- La consommation mémoire

Tous les écrans étaient chargés au démarrage, même ceux rarement utilisés.

## Decision

Implémenter le **lazy loading** pour tous les écrans avec React.lazy() et Suspense.

Structure :
- `lazyScreens.ts` : Tous les écrans lazy-loaded
- `LazyScreenWrapper` : Wrapper avec Suspense et fallback
- `usePreloadScreens` : Preloading intelligent selon le rôle

## Consequences

### Avantages

- ✅ Réduction du bundle initial (~40-60%)
- ✅ Amélioration du temps de démarrage (30-50%)
- ✅ Réduction de la consommation mémoire (20-30%)
- ✅ Meilleure expérience utilisateur

### Inconvénients

- ⚠️ Légère latence au premier chargement d'un écran
- ⚠️ Nécessite un fallback (spinner/skeleton)

### Implémentation

```typescript
// lazyScreens.ts
export const DashboardScreen = lazy(() => import('../screens/DashboardScreen'));

// AppNavigator.tsx
<LazyScreenWrapper>
  <LazyScreens.DashboardScreen />
</LazyScreenWrapper>
```

## Références

- [Lazy Loading Guide](../../guides/LAZY_LOADING.md)
- [lazyScreens.ts](../../../src/navigation/lazyScreens.ts)

