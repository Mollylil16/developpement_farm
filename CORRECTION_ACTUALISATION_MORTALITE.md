# 🔧 Correction: Actualisation de l'Écran Mortalité

**Date**: 24 Novembre 2025  
**Problème**: Les graphes et la liste de mortalité ne s'actualisent pas quand on change le statut d'un sujet de "mort" à "actif" dans le Cheptel

---

## 🔍 Problèmes Identifiés

### Problème 1: Dépendances Manquantes dans `useCallback`

Dans `ProductionCheptelComponent.tsx`, la fonction `handleChangeStatut` utilisait `mortalites` mais cette variable n'était **PAS dans les dépendances** du `useCallback` :

```typescript
// ❌ AVANT
const handleChangeStatut = useCallback(
  (animal, nouveauStatut) => {
    // ... utilise mortalites ligne 308 ...
    const mortaliteCorrespondante = mortalites.find(...);
  },
  [dispatch, projetActif?.id, canUpdate] // ❌ mortalites manquant
);
```

**Conséquence:**
- La fonction utilisait une **ancienne version** de la liste des mortalités
- Impossible de trouver la mortalité correspondante à supprimer

### Problème 2: Dispatch Non Attendus

Les `dispatch` pour recharger les données n'étaient pas attendus avec `.unwrap()` :

```typescript
// ❌ AVANT
dispatch(loadMortalitesParProjet(projetActif.id));
dispatch(loadStatistiquesMortalite(projetActif.id));
// Exécution continue sans attendre → données pas encore chargées
```

**Conséquence:**
- Les rechargements se faisaient en arrière-plan
- L'interface ne se mettait pas à jour immédiatement

### Problème 3: Statistiques Non Rechargées (Actif → Mort)

Quand on passait de "actif" à "mort", le code rechargait `loadMortalitesParProjet` mais **PAS** `loadStatistiquesMortalite` :

```typescript
// ❌ AVANT - lors de la création de mortalité
dispatch(loadMortalitesParProjet(projetActif.id)); // ✅ Liste OK
// ❌ Statistiques/graphes NON rechargés !
```

**Conséquence:**
- La liste se mettait à jour
- Les graphes et statistiques **NE SE METTAIENT PAS À JOUR**

---

## ✅ Corrections Appliquées

### 1. Ajout des Dépendances Manquantes

```typescript
// ✅ APRÈS
const handleChangeStatut = useCallback(
  (animal, nouveauStatut) => {
    // ...
  },
  [dispatch, projetActif?.id, canUpdate, mortalites, allAnimaux] // ✅ Ajouté
);
```

**Avantage:**
- La fonction utilise toujours la **version à jour** de `mortalites`
- Peut correctement trouver et supprimer les mortalités

### 2. Attente des Dispatch avec `Promise.all` + `.unwrap()`

#### Cas: Mort → Actif

```typescript
// ✅ APRÈS
// 3. Recharger toutes les données pertinentes
await Promise.all([
  dispatch(loadProductionAnimaux({ projetId: projetActif.id })).unwrap(),
  dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 })).unwrap(),
]);

// Si on a touché au statut "mort", recharger les mortalités
if (animal.statut === 'mort' || nouveauStatut === 'actif') {
  await Promise.all([
    dispatch(loadMortalitesParProjet(projetActif.id)).unwrap(),
    dispatch(loadStatistiquesMortalite(projetActif.id)).unwrap(),
  ]);
}
```

**Avantages:**
- ✅ Tous les rechargements **terminés avant de continuer**
- ✅ Rechargement **parallèle** pour meilleure performance
- ✅ `.unwrap()` permet de détecter les erreurs

#### Cas: Actif → Mort

```typescript
// ✅ APRÈS
// 2. Créer automatiquement une mortalité
try {
  await dispatch(createMortalite({...})).unwrap();

  // Recharger les mortalités ET les statistiques ✅
  await Promise.all([
    dispatch(loadMortalitesParProjet(projetActif.id)).unwrap(),
    dispatch(loadStatistiquesMortalite(projetActif.id)).unwrap(), // ✅ Ajouté !
  ]);
} catch (mortaliteError) {
  // Gestion d'erreur
}

// 3. Recharger les animaux
await Promise.all([
  dispatch(loadProductionAnimaux({ projetId: projetActif.id })).unwrap(),
  dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 })).unwrap(),
]);
```

**Avantages:**
- ✅ Les **statistiques et graphes** se rechargent correctement
- ✅ Attente de la fin des rechargements avant de continuer
- ✅ Rechargement parallèle optimisé

---

## 📊 Impact

### Avant

| Scénario | Résultat |
|----------|----------|
| Changer "actif" → "mort" | ✅ Liste mise à jour<br>❌ Graphes NON mis à jour |
| Changer "mort" → "actif" | ❌ Liste NON mise à jour<br>❌ Graphes NON mis à jour<br>❌ Mortalité NON supprimée |
| Naviguer vers Mortalité | ❌ Anciennes données affichées |

### Après

| Scénario | Résultat |
|----------|----------|
| Changer "actif" → "mort" | ✅ Liste mise à jour<br>✅ Graphes mis à jour |
| Changer "mort" → "actif" | ✅ Liste mise à jour<br>✅ Graphes mis à jour<br>✅ Mortalité supprimée |
| Naviguer vers Mortalité | ✅ Données à jour affichées |

---

## 🎯 Flux Complet: Mort → Actif

```
Utilisateur → "Cheptel" → Sujet avec statut "Mort"
          ↓
Utilisateur → Clic sur "Actif"
          ↓
handleChangeStatut() → Confirmation alert
          ↓
Utilisateur → "Confirmer"
          ↓
1. Trouver mortalité correspondante dans mortalites[] ✅
          ↓
2. dispatch(deleteMortalite(id)).unwrap() ✅
          ↓
3. dispatch(updateProductionAnimal({statut: 'actif'})).unwrap() ✅
          ↓
4. await Promise.all([
     loadProductionAnimaux(),
     loadPeseesRecents()
   ]) ✅
          ↓
5. await Promise.all([
     loadMortalitesParProjet(),     ← Liste
     loadStatistiquesMortalite()     ← Graphes
   ]) ✅
          ↓
✅ Mortalité supprimée de la liste
✅ Graphes mis à jour (nombre, causes, évolution)
✅ Statut animal changé en "Actif"
```

---

## 🎯 Flux Complet: Actif → Mort

```
Utilisateur → "Cheptel" → Sujet avec statut "Actif"
          ↓
Utilisateur → Clic sur "Mort"
          ↓
handleChangeStatut() → Confirmation alert
          ↓
Utilisateur → "Confirmer"
          ↓
1. dispatch(updateProductionAnimal({statut: 'mort'})).unwrap() ✅
          ↓
2. dispatch(createMortalite({...})).unwrap() ✅
          ↓
3. await Promise.all([
     loadMortalitesParProjet(),     ← Liste ✅
     loadStatistiquesMortalite()    ← Graphes ✅ AJOUTÉ
   ]) ✅
          ↓
4. await Promise.all([
     loadProductionAnimaux(),
     loadPeseesRecents()
   ]) ✅
          ↓
✅ Mortalité ajoutée à la liste
✅ Graphes mis à jour (nombre, causes, évolution)
✅ Statut animal changé en "Mort"
```

---

## 🧪 Tests à Effectuer

### Test 1: Mort → Actif ⭐

1. ☐ Aller dans **Cheptel**
2. ☐ Trouver un animal avec statut **"Mort"**
3. ☐ Cliquer sur **"Actif"**
4. ☐ Confirmer
5. ☐ **Vérifier**: Le statut passe à "Actif"
6. ☐ Aller dans **Mortalités**
7. ☐ **Vérifier**: L'entrée de mortalité a **disparu** ✅
8. ☐ **Vérifier**: Les graphes sont **mis à jour** (moins de mortalités) ✅
9. ☐ **Vérifier**: Les statistiques sont correctes ✅

### Test 2: Actif → Mort

1. ☐ Aller dans **Cheptel**
2. ☐ Trouver un animal avec statut **"Actif"**
3. ☐ Cliquer sur **"Mort"**
4. ☐ Confirmer
5. ☐ **Vérifier**: Le statut passe à "Mort"
6. ☐ Aller dans **Mortalités**
7. ☐ **Vérifier**: Une **nouvelle** entrée de mortalité apparaît ✅
8. ☐ **Vérifier**: Les graphes sont **mis à jour** (plus de mortalités) ✅
9. ☐ **Vérifier**: Les statistiques incluent la nouvelle mortalité ✅

### Test 3: Cycle Complet

1. ☐ Animal "Actif" → "Mort"
2. ☐ Aller dans Mortalités → **Vérifier**: Mortalité ajoutée
3. ☐ Retour dans Cheptel (Historique) → "Mort" → "Actif"
4. ☐ Aller dans Mortalités → **Vérifier**: Mortalité supprimée
5. ☐ **Vérifier**: Graphes corrects à chaque étape ✅

### Test 4: Plusieurs Changements Rapides

1. ☐ Changer plusieurs animaux: Actif → Mort
2. ☐ Vérifier Mortalités → Liste et graphes corrects
3. ☐ Changer plusieurs animaux: Mort → Actif
4. ☐ Vérifier Mortalités → Liste et graphes corrects
5. ☐ **Vérifier**: Pas de mortalités "fantômes" ✅

---

## 📝 Fichiers Modifiés

1. ✅ **`src/components/ProductionCheptelComponent.tsx`**
   - Ligne 348: Ajout de `mortalites` et `allAnimaux` aux dépendances de `handleChangeStatut`
   - Lignes 266-276: Rechargement de `loadStatistiquesMortalite` après création mortalité
   - Lignes 330-338: Utilisation de `Promise.all` + `.unwrap()` pour tous les rechargements

2. ✅ **`src/components/ProductionHistoriqueComponent.tsx`**
   - Lignes 170-178: Utilisation de `Promise.all` + `.unwrap()` pour tous les rechargements

---

## 💡 Leçon Apprise

### Pattern de Rechargement Optimal

```typescript
// ✅ BON
await Promise.all([
  dispatch(action1()).unwrap(),
  dispatch(action2()).unwrap(),
]);
// → Rechargement parallèle + attente de la fin

// ❌ MAUVAIS
dispatch(action1());
dispatch(action2());
// → Pas d'attente, UI peut se mettre à jour avant la fin
```

### Gestion des Dépendances dans `useCallback`

```typescript
// ✅ BON
const myFunc = useCallback(
  () => {
    // utilise dataA, dataB
  },
  [dataA, dataB] // ✅ Toutes les dépendances listées
);

// ❌ MAUVAIS
const myFunc = useCallback(
  () => {
    // utilise dataA, dataB
  },
  [dataA] // ❌ dataB manquant → utilise ancienne valeur
);
```

### Recharger TOUTES les Données Liées

```typescript
// ✅ BON - Quand on modifie des mortalités
await Promise.all([
  dispatch(loadMortalitesParProjet(projetId)).unwrap(),     // Liste
  dispatch(loadStatistiquesMortalite(projetId)).unwrap(),   // Graphes
]);

// ❌ MAUVAIS - Oublier les statistiques
dispatch(loadMortalitesParProjet(projetId)); // Seulement la liste
// → Graphes ne se mettent pas à jour !
```

---

**Status**: ✅ Corrigé  
**Testez maintenant**: Changez le statut d'un animal de "mort" à "actif", puis allez dans Mortalités → tout doit être à jour ! 🎉

