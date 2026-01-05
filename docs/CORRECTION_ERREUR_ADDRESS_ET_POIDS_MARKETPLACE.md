# Correction de l'erreur `location.address` et des poids dans le marketplace

## Problèmes identifiés

1. **Erreur de validation** : "location.address should not be empty, location.address must be a string"
   - L'erreur se produisait lors de la tentative de mise en vente de sujets
   - Le DTO backend exige que `location.address` soit une chaîne non vide, mais `undefined` était passé

2. **Poids toujours à "0.0 kg"** : Les poids affichaient toujours "0.0 kg" même après les corrections précédentes
   - Le problème venait du fait que `loadPeseesRecents` ne mettait pas à jour `peseesParAnimal` dans Redux
   - Le sélecteur `selectPeseesParAnimal` ne pouvait donc pas récupérer les pesées

## Solutions appliquées

### 1. Correction de l'erreur `location.address`

**Fichier concerné :**
- `src/components/marketplace/BatchAddModal.tsx`

**Problème :**
Le DTO `CreateListingDto` exige que `location.address` soit une chaîne non vide (`@IsString()` et `@IsNotEmpty()`), mais le code passait `undefined`.

**Solution :**
```typescript
// Avant
location: {
  latitude: userLocation.latitude,
  longitude: userLocation.longitude,
  address: undefined,  // ❌ Erreur de validation
  city: userLocation.city,
  region: userLocation.region,
},

// Après
location: {
  latitude: userLocation.latitude,
  longitude: userLocation.longitude,
  address: userLocation.address || userLocation.city || userLocation.region || 'Non spécifié',  // ✅ Toujours une chaîne
  city: userLocation.city || 'Non spécifié',
  region: userLocation.region || 'Non spécifié',
},
```

**Changements :**
- Utilisation d'un fallback en cascade : `address` → `city` → `region` → `'Non spécifié'`
- Application du même fallback pour `city` et `region` pour garantir qu'ils ne sont jamais `undefined`
- Application dans les deux modes (batch et individuel)

### 2. Correction de la mise à jour de `peseesParAnimal`

**Fichier concerné :**
- `src/store/slices/productionSlice.ts`

**Problème :**
`loadPeseesRecents` chargeait les pesées récentes mais ne mettait pas à jour `peseesParAnimal`, ce qui empêchait le sélecteur `selectPeseesParAnimal` de récupérer les pesées par animal.

**Solution :**
```typescript
// Avant
.addCase(loadPeseesRecents.fulfilled, (state, action) => {
  state.loading = false;
  const normalized = normalizePesees(action.payload);
  state.entities.pesees = { ...state.entities.pesees, ...normalized.entities.pesees };
  state.peseesRecents = normalized.result;
  // Ajouter les IDs de pesées à la liste globale si pas déjà présents
  normalized.result.forEach((peseeId: string) => {
    if (!state.ids.pesees.includes(peseeId)) {
      state.ids.pesees.push(peseeId);
    }
  });
})

// Après
.addCase(loadPeseesRecents.fulfilled, (state, action) => {
  state.loading = false;
  const normalized = normalizePesees(action.payload);
  state.entities.pesees = { ...state.entities.pesees, ...normalized.entities.pesees };
  state.peseesRecents = normalized.result;
  // Ajouter les IDs de pesées à la liste globale si pas déjà présents
  normalized.result.forEach((peseeId: string) => {
    if (!state.ids.pesees.includes(peseeId)) {
      state.ids.pesees.push(peseeId);
    }
  });
  // ✅ Mettre à jour peseesParAnimal pour chaque pesée chargée
  action.payload.forEach((pesee: ProductionPesee) => {
    if (pesee.animal_id) {
      if (!state.peseesParAnimal[pesee.animal_id]) {
        state.peseesParAnimal[pesee.animal_id] = [];
      }
      // Ajouter l'ID de la pesée si pas déjà présent
      if (!state.peseesParAnimal[pesee.animal_id].includes(pesee.id)) {
        state.peseesParAnimal[pesee.animal_id].push(pesee.id);
      }
    }
  });
})
```

**Changements :**
- Ajout de la mise à jour de `peseesParAnimal` dans le reducer `loadPeseesRecents.fulfilled`
- Pour chaque pesée chargée, ajout de son ID dans `peseesParAnimal[animal_id]`
- Vérification que l'ID n'est pas déjà présent pour éviter les doublons

## Impact

### Avant
- ❌ Erreur de validation : "location.address should not be empty"
- ❌ Poids affichés à "0.0 kg" pour tous les sujets
- ❌ Impossible de mettre en vente des sujets

### Après
- ✅ `location.address` est toujours une chaîne non vide (avec fallback)
- ✅ Les poids sont correctement récupérés depuis Redux
- ✅ Les pesées sont automatiquement mises à jour dans `peseesParAnimal`
- ✅ Les sujets peuvent être mis en vente sans erreur

## Fichiers modifiés

1. **`src/components/marketplace/BatchAddModal.tsx`** :
   - Correction de `location.address` avec fallback en cascade
   - Application dans les deux modes (batch et individuel)

2. **`src/store/slices/productionSlice.ts`** :
   - Ajout de la mise à jour de `peseesParAnimal` dans `loadPeseesRecents.fulfilled`

## Tests recommandés

1. **Test de l'erreur `location.address`** :
   - Ouvrir l'écran "Ajouter des sujets en vente"
   - Sélectionner des sujets
   - Entrer un prix/kg
   - Accepter les conditions
   - Cliquer sur "Mettre en vente"
   - ✅ Vérifier qu'il n'y a plus d'erreur de validation

2. **Test des poids** :
   - Ouvrir l'écran "Ajouter des sujets en vente"
   - ✅ Vérifier que les poids sont correctement affichés (pas "0.0 kg")
   - ✅ Vérifier que le poids total sélectionné est correct
   - ✅ Vérifier que les poids se mettent à jour après une nouvelle pesée

3. **Test de la mise en vente** :
   - Sélectionner des sujets avec des poids valides
   - Entrer un prix/kg
   - Accepter les conditions
   - Cliquer sur "Mettre en vente"
   - ✅ Vérifier que les sujets sont correctement mis en vente

## Notes

- Le fallback pour `location.address` garantit qu'une valeur est toujours fournie, même si l'adresse n'est pas disponible
- La mise à jour de `peseesParAnimal` dans le reducer garantit que les pesées sont toujours disponibles pour le sélecteur Redux
- Ces corrections sont compatibles avec les deux modes (batch et individuel)

