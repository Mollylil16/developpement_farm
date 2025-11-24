# 🎨 Phase 5 : Stratégie de Refactoring UI - Tous les Écrans

**Date:** 21 Novembre 2025  
**Contexte:** Application des mêmes critères de refactoring que DashboardScreen à tous les écrans

---

## 🎯 Objectifs

Appliquer systématiquement le pattern de refactoring DashboardScreen à tous les écrans :
- ✅ Séparation logique/UI
- ✅ Custom Hooks pour la logique métier
- ✅ Composants UI dédiés
- ✅ Amélioration de la maintenabilité
- ✅ Faciliter les tests

---

## 📋 Pattern de Refactoring (Référence DashboardScreen)

### 1. Structure Cible

```
src/
├── screens/
│   └── [Nom]Screen.tsx              # Écran principal (léger, orchestration)
├── hooks/
│   └── use[Nom]Logic.ts              # Logique métier, état, effets
└── components/
    ├── [Nom]Header.tsx               # En-tête de l'écran
    ├── [Nom]Stats.tsx                # Statistiques/KPI
    ├── [Nom]Content.tsx              # Contenu principal
    └── [Nom]Actions.tsx              # Actions/boutons
```

### 2. Critères de Refactoring

#### ✅ Custom Hook (`use[Nom]Logic.ts`)
**Responsabilités:**
- État local (useState)
- Effets de bord (useEffect, useFocusEffect)
- Appels Redux (useAppSelector, useAppDispatch)
- Logique de validation
- Gestion des erreurs
- Calculs dérivés

**Signature typique:**
```typescript
export function use[Nom]Logic() {
  return {
    // État
    loading,
    error,
    data,
    
    // Actions
    handleAction,
    handleRefresh,
    handleSubmit,
    
    // Données dérivées
    filteredData,
    stats,
  };
}
```

#### ✅ Composants UI

**1. [Nom]Header.tsx**
- Titre de l'écran
- Navigation
- Actions principales (recherche, filtres)
- Props : callbacks uniquement

**2. [Nom]Stats.tsx**
- KPI/Statistiques
- Cartes récapitulatives
- Props : données pures

**3. [Nom]Content.tsx**
- Contenu principal (listes, formulaires, graphiques)
- Gestion du scroll
- Props : données + callbacks

**4. [Nom]Actions.tsx**
- Boutons d'action
- FAB (Floating Action Button)
- Props : callbacks uniquement

#### ✅ Écran Principal ([Nom]Screen.tsx)

**Responsabilités (UNIQUEMENT):**
- Orchestration des composants
- Utilisation du hook `use[Nom]Logic`
- Gestion du layout (SafeAreaView, ScrollView)
- Transmission des props

**Structure:**
```typescript
export default function [Nom]Screen() {
  const logic = use[Nom]Logic();
  
  return (
    <SafeAreaView>
      <[Nom]Header {...logic} />
      <ScrollView>
        <[Nom]Stats {...logic} />
        <[Nom]Content {...logic} />
      </ScrollView>
      <[Nom]Actions {...logic} />
    </SafeAreaView>
  );
}
```

---

## 📊 Écrans à Refactoriser (Priorité)

### Priorité 1 : Écrans Complexes (>500 lignes)

| Écran | Lignes (approx) | Complexité | Priorité |
|-------|----------------|-----------|----------|
| **FinanceScreen** | ~800 | Élevée | 🔴 Haute |
| **ReproductionScreen** | ~700 | Élevée | 🔴 Haute |
| **SanteScreen** | ~650 | Élevée | 🔴 Haute |
| **NutritionScreen** | ~600 | Moyenne | 🟡 Moyenne |
| **VaccinationScreen** | ~550 | Moyenne | 🟡 Moyenne |

### Priorité 2 : Écrans Moyens (300-500 lignes)

| Écran | Lignes (approx) | Complexité | Priorité |
|-------|----------------|-----------|----------|
| **ProductionScreen** | ~500 | Moyenne | 🟡 Moyenne |
| **MortalitesScreen** | ~450 | Moyenne | 🟡 Moyenne |
| **PlanningProductionScreen** | ~400 | Moyenne | 🟡 Moyenne |
| **ReportsScreen** | ~400 | Moyenne | 🟡 Moyenne |

### Priorité 3 : Écrans Simples (<300 lignes)

| Écran | Lignes (approx) | Complexité | Priorité |
|-------|----------------|-----------|----------|
| **PlanificationScreen** | ~250 | Faible | 🟢 Basse |
| **CollaborationScreen** | ~200 | Faible | 🟢 Basse |
| **ProfilScreen** | ~150 | Faible | 🟢 Basse |

### ⏭️ Écrans Exclus (Trop simples ou spéciaux)

- **WelcomeScreen** - Écran statique
- **AuthScreen** - Géré par provider externe
- **CreateProjectScreen** - Formulaire simple
- **AdminScreen** - Interface d'administration
- **CalculateurNavigationScreen** - Navigation simple

---

## 🔄 Processus de Refactoring (Par Écran)

### Étape 1 : Analyse
```bash
# Lire l'écran pour comprendre :
- Quelles sont les responsabilités ?
- Quelle est la logique métier ?
- Quels sont les composants naturels ?
- Quelles sont les dépendances Redux ?
```

### Étape 2 : Extraction du Hook
```typescript
// Créer src/hooks/use[Nom]Logic.ts
// Extraire :
- useState, useEffect, useFocusEffect
- useAppSelector, useAppDispatch
- Fonctions de manipulation de données
- Gestion d'erreurs
```

### Étape 3 : Création des Composants
```typescript
// Créer les composants dans src/components/
[Nom]Header.tsx
[Nom]Stats.tsx (si applicable)
[Nom]Content.tsx
[Nom]Actions.tsx (si applicable)
```

### Étape 4 : Refactoring de l'Écran
```typescript
// Mettre à jour src/screens/[Nom]Screen.tsx
- Supprimer toute la logique
- Utiliser le hook
- Composer les composants
```

### Étape 5 : Tests & Validation
```bash
# Vérifier :
- L'écran s'affiche correctement
- Toutes les fonctionnalités marchent
- Pas de régression
- Pas d'erreurs console
```

---

## 📏 Règles de Refactoring

### ✅ À FAIRE

1. **Séparation stricte logique/UI**
   - Hook = logique pure
   - Composants = UI pure

2. **Props explicites**
   - Pas de props implicites
   - Types TypeScript stricts

3. **Composition sur héritage**
   - Petits composants réutilisables
   - Composition claire

4. **Nommage cohérent**
   - `use[Nom]Logic` pour les hooks
   - `[Nom]Component` pour les composants

5. **Documentation**
   - JSDoc sur les hooks
   - Commentaires sur la logique complexe

### ❌ À ÉVITER

1. **Composants trop gros**
   - Limite : 200 lignes par composant

2. **Hooks trop chargés**
   - Diviser si >300 lignes

3. **Props drilling excessif**
   - Utiliser Context si nécessaire

4. **Logique dans les composants UI**
   - Toute logique dans le hook

5. **État dupliqué**
   - Source unique de vérité

---

## 🧪 Tests à Ajouter (Par Écran)

### Tests du Hook
```typescript
// src/hooks/__tests__/use[Nom]Logic.test.ts
describe('use[Nom]Logic', () => {
  it('devrait initialiser avec les bonnes valeurs');
  it('devrait gérer le chargement des données');
  it('devrait gérer les erreurs');
  it('devrait gérer les actions utilisateur');
});
```

### Tests des Composants
```typescript
// src/components/__tests__/[Nom]Header.test.tsx
describe('[Nom]Header', () => {
  it('devrait afficher le titre');
  it('devrait appeler les callbacks');
});
```

---

## 📊 Métriques de Succès

### Objectifs Quantitatifs

| Métrique | Avant | Objectif | Status |
|----------|-------|----------|--------|
| **Lignes par écran** | ~850 | <200 | 🎯 |
| **Complexité cyclomatique** | ~25 | <10 | 🎯 |
| **Composants réutilisables** | ~5 | ~50 | 🎯 |
| **Hooks métier** | 1 | ~10 | 🎯 |
| **Couverture tests** | 0% | 80% | 🎯 |

### Objectifs Qualitatifs

- ✅ Code plus lisible
- ✅ Maintenance facilitée
- ✅ Tests plus simples
- ✅ Onboarding rapide
- ✅ Réutilisabilité accrue

---

## 📅 Planning de Refactoring

### Sprint 1 : Écrans Priorité 1 (3 jours)
- Jour 1 : FinanceScreen
- Jour 2 : ReproductionScreen
- Jour 3 : SanteScreen

### Sprint 2 : Écrans Priorité 2 (3 jours)
- Jour 1 : NutritionScreen + VaccinationScreen
- Jour 2 : ProductionScreen + MortalitesScreen
- Jour 3 : PlanningProductionScreen + ReportsScreen

### Sprint 3 : Écrans Priorité 3 (1 jour)
- Jour 1 : Écrans simples + documentation finale

**Total estimé : 7 jours de travail**

---

## 🎓 Exemple de Référence

Voir **DashboardScreen** pour l'exemple complet :
- `src/screens/DashboardScreen.tsx` (orchestration)
- `src/hooks/useDashboardLogic.ts` (logique)
- `src/components/DashboardHeader.tsx` (UI)
- `src/components/DashboardStats.tsx` (UI)
- `src/components/DashboardQuickActions.tsx` (UI)
- `src/components/DashboardRecentActivities.tsx` (UI)

---

## 🚀 Commencer le Refactoring

**Prêt à démarrer avec FinanceScreen !**

---

**Date:** 21 Novembre 2025  
**Version:** 1.0.0  
**Status:** 📋 Planification terminée

