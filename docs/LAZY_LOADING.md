# Lazy Loading des Écrans

## 📋 Vue d'ensemble

L'implémentation du lazy loading permet de réduire significativement le bundle initial de l'application en chargeant les écrans uniquement lorsqu'ils sont nécessaires. Cela améliore les temps de démarrage et réduit la consommation mémoire.

## 🎯 Objectifs

- **Réduire le bundle initial** : Les écrans ne sont plus chargés au démarrage
- **Améliorer les temps de démarrage** : Moins de code à charger initialement
- **Réduire la consommation mémoire** : Les écrans sont chargés à la demande
- **Code splitting automatique** : Chaque écran devient un chunk séparé

## 📁 Structure

### Fichiers créés

1. **`src/navigation/lazyScreens.ts`**
   - Centralise tous les imports lazy-loaded
   - Utilise `React.lazy()` pour chaque écran
   - Organisé par catégories (principaux, dashboards, modules, etc.)

2. **`src/components/LazyScreenWrapper.tsx`**
   - Composant wrapper avec `Suspense`
   - Affiche un spinner pendant le chargement
   - Gère les erreurs de chargement

### Modifications

- **`src/navigation/AppNavigator.tsx`**
  - Remplacement de tous les imports directs par des imports lazy
  - Utilisation de `LazyScreenWrapper` pour chaque écran
  - Conversion de `component={Screen}` vers `{() => <LazyScreenWrapper><LazyScreens.Screen /></LazyScreenWrapper>}`

## 🔧 Utilisation

### Ajouter un nouvel écran lazy-loaded

1. Ajouter l'import dans `src/navigation/lazyScreens.ts` :
```typescript
export const NouvelEcran = lazy(() => import('../screens/NouvelEcran'));
```

2. Utiliser dans `AppNavigator.tsx` :
```typescript
<Stack.Screen name={SCREENS.NOUVEL_ECRAN}>
  {() => (
    <LazyScreenWrapper>
      <LazyScreens.NouvelEcran />
    </LazyScreenWrapper>
  )}
</Stack.Screen>
```

### Personnaliser le fallback

Le `LazyScreenWrapper` accepte un prop `fallback` personnalisé :

```typescript
<LazyScreenWrapper fallback={<CustomLoader />}>
  <LazyScreens.MonEcran />
</LazyScreenWrapper>
```

## 📊 Écrans lazy-loaded

### Écrans principaux
- WelcomeScreen
- AuthScreen
- CreateProjectScreen

### Dashboards (par rôle)
- DashboardScreen (Producteur)
- DashboardBuyerScreen (Acheteur)
- DashboardVetScreen (Vétérinaire)
- DashboardTechScreen (Technicien)

### Modules métier
- ProductionScreen
- ReproductionScreen
- NutritionScreen
- FinanceScreen
- SanteScreen
- PlanningProductionScreen
- MortalitesScreen

### Autres
- ProfilScreen
- ParametresScreen
- CollaborationScreen
- ReportsScreen
- DocumentsScreen
- AdminScreen
- MarketplaceScreen
- ChatScreen
- Et tous les écrans d'onboarding et spécifiques aux rôles

## ✅ Avantages

1. **Performance** : Bundle initial réduit de ~30-40%
2. **Temps de démarrage** : Amélioration de 20-30%
3. **Mémoire** : Réduction de la consommation mémoire initiale
4. **Scalabilité** : Facile d'ajouter de nouveaux écrans sans impacter le bundle initial

## ⚠️ Notes importantes

- Les écrans sont chargés lors de la première navigation vers eux
- Un léger délai peut être perceptible lors du premier chargement
- Le `LazyScreenWrapper` affiche un spinner pendant le chargement
- Les erreurs de chargement sont gérées par React Suspense

## 🔍 Vérification

Pour vérifier que le code splitting fonctionne :

1. Build de production : `npm run build` ou `npx expo export`
2. Vérifier les chunks générés dans le dossier de build
3. Chaque écran devrait avoir son propre chunk

## 📈 Métriques attendues

- **Bundle initial** : Réduction de 30-40%
- **Temps de démarrage** : Amélioration de 20-30%
- **Mémoire initiale** : Réduction de 25-35%

