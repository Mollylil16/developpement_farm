# Refactoring DashboardScreen - Plan d'optimisation

## Analyse actuelle
- **Taille** : 289 lignes (déjà réduit de 923 lignes)
- **Hooks personnalisés** : 5 hooks bien structurés
- **Composants** : Bien séparés en composants réutilisables

## Problèmes de performance identifiés

### 1. Recalculs inutiles à chaque render
- ❌ `secondaryWidgets()` appelé comme fonction à chaque render (ligne 224)
- ❌ `currentDate` recalculé à chaque render (ligne 129-135)
- ❌ `greeting` calculé dans `useState` mais pourrait être `useMemo`

### 2. Callbacks non mémorisés
- ❌ `handleNavigateToScreen` n'est pas mémorisé (ligne 164)
- ❌ Callbacks dans `NotificationPanel` créés à chaque render (lignes 265-288)

### 3. Composants non mémorisés
- ❌ `DashboardMainWidgets` pourrait bénéficier de `React.memo`
- ❌ `DashboardSecondaryWidgets` pourrait bénéficier de `React.memo`
- ❌ `AlertesWidget` pourrait bénéficier de `React.memo`

### 4. Optimisations possibles
- ✅ Utiliser `useMemo` pour `secondaryWidgets`
- ✅ Utiliser `useMemo` pour `currentDate`
- ✅ Mémoriser les callbacks avec `useCallback`
- ✅ Ajouter `React.memo` aux composants enfants

## Plan d'action

### Phase 1 : Mémorisation des calculs
1. Convertir `secondaryWidgets()` en `useMemo`
2. Mémoriser `currentDate` avec `useMemo`
3. Optimiser `greeting` avec `useMemo`

### Phase 2 : Mémorisation des callbacks
1. Mémoriser `handleNavigateToScreen` avec `useCallback`
2. Mémoriser les callbacks de `NotificationPanel`
3. Mémoriser les handlers de modals

### Phase 3 : Optimisation des composants
1. Ajouter `React.memo` à `DashboardMainWidgets`
2. Ajouter `React.memo` à `DashboardSecondaryWidgets`
3. Ajouter `React.memo` à `AlertesWidget` si nécessaire

### Phase 4 : Tests de performance
1. Mesurer les re-renders avec React DevTools Profiler
2. Vérifier que les optimisations fonctionnent
3. Documenter les améliorations

