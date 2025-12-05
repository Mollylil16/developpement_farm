# 🔍 Diagnostic Performance - Application Lente

**Date:** 5 Décembre 2025  
**Problème:** Les écrans mettent du temps à charger, l'application est devenue lente

---

## 📊 Résumé Exécutif

### Problèmes Identifiés

1. **🔴 CRITIQUE** - ScrollView + map dans FinanceChargesFixesComponent
2. **🟡 HAUTE** - Requêtes SELECT * sans pagination dans certains repositories
3. **🟡 HAUTE** - Index manquants sur colonnes fréquemment utilisées
4. **🟢 MOYENNE** - FlatList sans getItemLayout (déjà optimisées mais peut être amélioré)

---

## 1. Problèmes Critiques

### 1.1 ScrollView + map() dans FinanceChargesFixesComponent

**Fichier:** `src/components/FinanceChargesFixesComponent.tsx`  
**Ligne:** ~100-315

**Problème:**
```tsx
<ScrollView>
  {chargesFixes.map((charge) => (
    <ChargeFixeCard key={charge.id} charge={charge} />
  ))}
</ScrollView>
```

**Impact:**
- ❌ Tous les items sont rendus immédiatement
- ❌ Pas de virtualisation
- ❌ Performance dégradée avec >20 items
- ❌ Consommation mémoire élevée

**Solution:**
Remplacer par FlatList avec optimisations

---

## 2. Requêtes Base de Données

### 2.1 Requêtes SELECT * sans pagination

**Fichiers concernés:**
- `src/database/repositories/PeseeRepository.ts` - `findByAnimal()` (ligne 111)
- `src/database/repositories/AnimalRepository.ts` - `findByProjet()` (ligne 185)
- `src/database/repositories/TraitementRepository.ts` - Plusieurs méthodes

**Problème:**
```typescript
// ❌ LENT - Charge tout en mémoire
async findByAnimal(animalId: string): Promise<ProductionPesee[]> {
  return this.query<ProductionPesee>(
    `SELECT * FROM production_pesees 
     WHERE animal_id = ?
     ORDER BY date ASC`,
    [animalId]
  );
}
```

**Solution:**
Ajouter pagination optionnelle ou limiter les résultats

---

## 3. Index Manquants

### 3.1 Index sur colonnes fréquemment utilisées

**Index à ajouter:**
- `production_pesees(animal_id, date)` - Pour findByAnimal
- `traitements(animal_id, date_debut)` - Pour requêtes par animal
- `traitements(maladie_id)` - Pour requêtes par maladie
- `charges_fixes(projet_id, statut)` - Pour filtres par statut
- `depenses_ponctuelles(projet_id, date)` - Pour tri par date

---

## 4. Optimisations Déjà Appliquées ✅

### 4.1 FlatList optimisées
- ✅ `FinanceDepensesComponent` - FlatList avec optimisations
- ✅ `FinanceRevenusComponent` - FlatList avec optimisations
- ✅ `ProductionAnimalsListComponent` - FlatList avec optimisations
- ✅ `CollaborationListComponent` - FlatList avec optimisations

**Optimisations présentes:**
- `removeClippedSubviews={true}`
- `maxToRenderPerBatch={10}`
- `windowSize={5}`
- `initialNumToRender={10}`
- `updateCellsBatchingPeriod={50}`

### 4.2 ThemeContext mémoïsé ✅
- ✅ `value` mémoïsé avec `useMemo`
- ✅ `colors` mémoïsé avec `useMemo`
- ✅ `setMode` mémoïsé avec `useCallback`

---

## 5. Plan d'Action

### Priorité 1: FinanceChargesFixesComponent
1. Remplacer ScrollView + map par FlatList
2. Ajouter optimisations FlatList
3. Tester avec 50+ items

### Priorité 2: Index Base de Données
1. Créer migration pour nouveaux index
2. Ajouter index sur colonnes fréquentes
3. Vérifier impact sur performances

### Priorité 3: Pagination Requêtes
1. Ajouter pagination optionnelle aux repositories
2. Utiliser pagination dans les composants
3. Limiter résultats par défaut

---

## 6. Métriques de Performance

### Avant Optimisations
- ⏱️ FinanceChargesFixesComponent: ~500ms (50 items)
- ⏱️ Chargement initial: ~2-3s
- 📊 Mémoire: ~150MB

### Après Optimisations (Objectif)
- ⏱️ FinanceChargesFixesComponent: ~100ms (50 items)
- ⏱️ Chargement initial: ~1s
- 📊 Mémoire: ~80MB

---

## 7. Fichiers à Modifier

1. `src/components/FinanceChargesFixesComponent.tsx` - **CRITIQUE**
2. `src/database/indexes/createIndexes.ts` - Ajouter index
3. `src/database/repositories/PeseeRepository.ts` - Pagination
4. `src/database/repositories/AnimalRepository.ts` - Déjà optimisé ✅
5. `src/database/repositories/TraitementRepository.ts` - Pagination

---

## 8. Tests à Effectuer

1. ✅ Tester FinanceChargesFixesComponent avec 100 items
2. ✅ Vérifier scroll fluide
3. ✅ Mesurer temps de chargement
4. ✅ Vérifier consommation mémoire
5. ✅ Tester sur appareil réel (pas seulement simulateur)

