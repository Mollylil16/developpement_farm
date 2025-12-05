# Correction des Modals - Scroll et Boutons

**Date**: 24 novembre 2025  
**Problème**: Impossible de scroller dans les modals, certains boutons inactifs

## Problème identifié

Tous les modals de l'application avaient deux problèmes:

1. **`CustomModal.tsx`**: Le container `content` utilisait `flexShrink: 1` au lieu de `flex: 1`, empêchant les ScrollView internes de fonctionner correctement
2. **Tous les FormModals**: Les ScrollView avaient une `maxHeight: 500` fixe qui ne s'adaptait pas à l'espace disponible

## Solutions appliquées

### 1. CustomModal.tsx
```typescript
// AVANT
content: {
  padding: SPACING.lg,
  flexShrink: 1,
},

// APRÈS
content: {
  padding: SPACING.lg,
  flex: 1,
  minHeight: 0,
},
```

### 2. Tous les modals avec ScrollView (13 fichiers)
```typescript
// AVANT
scrollView: {
  maxHeight: 500,
},

// APRÈS
scrollView: {
  flex: 1,
},
```

## Fichiers modifiés

### Modal de base
- `src/components/CustomModal.tsx`

### Modals de formulaires (12)
1. `src/components/VenteDetailModal.tsx`
2. `src/components/RevenuFormModal.tsx`
3. `src/components/ProductionAnimalFormModal.tsx`
4. `src/components/ChargeFixeFormModal.tsx`
5. `src/components/StockAlimentFormModal.tsx`
6. `src/components/DepenseFormModal.tsx`
7. `src/components/ProductionPeseeFormModal.tsx`
8. `src/components/PlanificationFormModal.tsx`
9. `src/components/MortalitesFormModal.tsx`
10. `src/components/InvitationsModal.tsx`
11. `src/components/IngredientFormModal.tsx`
12. `src/components/CollaborationFormModal.tsx`

### Composant avec modal (1)
- `src/components/BudgetisationAlimentComponent.tsx`

## Correction additionnelle : Text Rendering

### Problème
Erreur "Text strings must be rendered within a <Text> component" sur Dashboard, Cheptel et Historique.

### Cause
Utilisation de `{item.nom && \` (${item.nom})\`}` au lieu de ternaire. Si `item.nom` est une string vide, `&&` retourne `""` qui doit être rendu dans un <Text>.

### Solution
```typescript
// AVANT
{item.nom && ` (${item.nom})`}

// APRÈS
{item.nom ? ` (${item.nom})` : ''}
```

### Fichier corrigé
- `src/components/ProductionHistoriqueComponent.tsx` (ligne 213)

## Tests recommandés

1. ✅ Ouvrir le modal "Détails de la vente" depuis Finance
2. ✅ Vérifier que le scroll fonctionne correctement
3. ✅ Vérifier que les boutons sont cliquables
4. ✅ Tester tous les autres modals (création/modification animaux, ventes, dépenses, etc.)
5. ⏳ Vérifier l'absence de l'erreur "Text strings" sur Dashboard/Cheptel/Historique

## Impact

✅ **Tous les modals** peuvent maintenant scroller correctement  
✅ **Tous les boutons** sont actifs et fonctionnels  
✅ **L'interface** s'adapte à différentes tailles d'écran  
✅ **Erreur de rendu** "Text strings" corrigée dans ProductionHistoriqueComponent

## Note technique

L'utilisation de `flex: 1` avec `minHeight: 0` dans le container parent permet aux ScrollView enfants de:
- Calculer correctement leur hauteur disponible
- Activer le scroll quand le contenu dépasse la hauteur
- S'adapter dynamiquement à différentes tailles d'écran (mobile, tablette)

L'utilisation de ternaires `? :` au lieu de `&&` pour les strings évite le rendu de valeurs falsy qui ne sont pas des composants React.

