# 🔧 CORRECTION URGENTE : Geste de retour dans l'app

## 📋 Problème identifié

Le swipe gauche→droite ramène au Dashboard au lieu de l'écran précédent dans la pile de navigation.

## 🔍 Analyse

Après analyse complète du code, **AUCUN fichier ne configure explicitement un `headerLeft` qui redirige vers Dashboard**. Le problème vient probablement du comportement par défaut de React Navigation avec les Tab Navigators.

## ✅ Fichiers à vérifier/corriger

### 1. **Aucun headerLeft problématique trouvé**
- ✅ `StandardHeader.tsx` : Pas de bouton retour (juste un header visuel)
- ✅ `DashboardHeader.tsx` : Pas de bouton retour (header du Dashboard)
- ✅ `CollaborationsScreen.tsx` : Utilise déjà `navigation.goBack()` ✅

### 2. **Fichiers avec navigation vers Dashboard (à vérifier)**

Ces fichiers utilisent `navigation.navigate('Main', { screen: SCREENS.DASHBOARD })` mais **dans des contextes appropriés** (notifications, recherche, etc.) :

- `src/components/GlobalSearchModal.tsx` : Navigation depuis recherche (OK)
- `src/components/NotificationsManager.tsx` : Navigation depuis notifications (OK)
- `src/components/AddRoleModal.tsx` : Navigation après changement de rôle (OK)
- `src/components/ProtectedScreen.tsx` : Navigation si accès refusé (OK - avec bouton explicite)
- `src/components/AlertesWidget.tsx` : Navigation depuis alertes (OK)

### 3. **Configuration Stack.Navigator**

Le `Stack.Navigator` dans `AppNavigator.tsx` a `headerShown: false` par défaut, ce qui signifie que les écrans utilisent leurs propres headers (StandardHeader, etc.).

## 🎯 Solution

Le problème vient probablement du fait que **les écrans dans MainTabs (Tab Navigator) n'ont pas de configuration explicite pour le comportement de retour**. Quand on navigue depuis un écran dans un Tab vers un écran dans le Stack, React Navigation peut avoir un comportement inattendu.

### Corrections à appliquer

1. **S'assurer que tous les écrans utilisent `navigation.goBack()`** pour le retour
2. **Vérifier que les écrans dans MainTabs n'interceptent pas le geste de retour**
3. **Ajouter des options de navigation explicites** pour les écrans dans le Stack qui sont accessibles depuis les Tabs

## 📝 Fichiers à modifier

### Fichier 1: `src/navigation/AppNavigator.tsx`

Ajouter des options de navigation pour les écrans dans le Stack qui sont accessibles depuis les Tabs :

```typescript
// Pour chaque Stack.Screen accessible depuis MainTabs, s'assurer que :
// - headerShown: false (déjà fait)
// - gestureEnabled: true (par défaut)
// - Pas de headerLeft custom qui redirige vers Dashboard
```

### Fichier 2: Vérifier les écrans qui utilisent StandardHeader

Tous les écrans qui utilisent `StandardHeader` n'ont pas de bouton retour intégré. Le geste de retour devrait fonctionner normalement.

**Action requise** : Vérifier manuellement si le problème persiste après ces vérifications.
