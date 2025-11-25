# Correction: Photos de factures fantômes

**Date**: 24 novembre 2025  
**Problème**: Affichage de "2 photos de facture" alors qu'aucune photo n'a été ajoutée

## Problème identifié

L'utilisateur voyait le message "2 photos de facture" pour une vente alors qu'aucune photo n'avait été ajoutée. Le problème venait du fait que le champ `photos` dans la base de données pouvait contenir des valeurs vides ou nulles (par exemple `["", ""]` ou `[null, null]`).

### Cause technique

Les photos sont stockées au format JSON dans la base de données:
- Lors de l'enregistrement: `JSON.stringify(photos)` → `"["", ""]"`
- Lors de la récupération: `JSON.parse(photos)` → `["", ""]`
- L'affichage comptait simplement `photos.length` sans vérifier si les éléments étaient valides

## Solution appliquée

Ajout d'un filtre pour ne compter et afficher que les **photos valides** (non vides, non nulles):

```typescript
// Filtrer les photos valides
const photosValides = photos?.filter(p => p && p.trim() !== '') || [];
```

## Fichiers modifiés

### 1. FinanceRevenusComponent.tsx

**Ligne ~377** - Compteur de photos:
```typescript
// AVANT
{revenu.photos && revenu.photos.length > 0 && (
  <Text>{revenu.photos.length} photo{revenu.photos.length > 1 ? 's' : ''} de facture</Text>
)}

// APRÈS
{(() => {
  const photosValides = revenu.photos?.filter(p => p && p.trim() !== '') || [];
  return photosValides.length > 0 ? (
    <Text>{photosValides.length} photo{photosValides.length > 1 ? 's' : ''} de facture</Text>
  ) : null;
})()}
```

**Ligne ~299** - Bouton pour voir les photos:
```typescript
// AVANT
{revenu.photos && revenu.photos.length > 0 && (
  <TouchableOpacity onPress={() => handleViewPhotos(revenu.photos!)}>
    <Text>📷</Text>
  </TouchableOpacity>
)}

// APRÈS
{(() => {
  const photosValides = revenu.photos?.filter(p => p && p.trim() !== '') || [];
  return photosValides.length > 0 ? (
    <TouchableOpacity onPress={() => handleViewPhotos(photosValides)}>
      <Text>📷</Text>
    </TouchableOpacity>
  ) : null;
})()}
```

**Ligne ~443** - Modal d'affichage des photos:
```typescript
// AVANT
{viewingPhotos.map((photo, index) => (
  <Image key={index} source={{ uri: photo }} />
))}

// APRÈS
{viewingPhotos.filter(p => p && p.trim() !== '').map((photo, index) => (
  <Image key={index} source={{ uri: photo }} />
))}
```

### 2. FinanceDepensesComponent.tsx

Les mêmes corrections ont été appliquées pour les dépenses ponctuelles:
- Compteur de photos (ligne ~350)
- Bouton caméra (ligne ~297)
- Modal d'affichage (ligne ~406)

## Impact

✅ **Les photos vides** ne sont plus comptées ni affichées  
✅ **Le message "2 photos de facture"** disparaît si les photos sont invalides  
✅ **Le bouton caméra** 📷 ne s'affiche plus s'il n'y a pas de photos valides  
✅ **Le modal de visualisation** n'affiche que les photos valides  
✅ **Rétrocompatibilité**: Les anciennes données avec photos vides sont gérées correctement

## Tests recommandés

1. ✅ Vérifier qu'une vente sans photo n'affiche pas "2 photos de facture"
2. ⏳ Créer une nouvelle vente avec 1 vraie photo et vérifier l'affichage
3. ⏳ Créer une nouvelle vente avec 2-3 vraies photos et vérifier l'affichage
4. ⏳ Vérifier que le bouton 📷 fonctionne et affiche bien les photos
5. ⏳ Faire la même chose pour les dépenses ponctuelles

## Note pour le développement futur

Pour éviter ce problème à l'avenir, considérer:
1. **Validation côté formulaire**: Ne pas permettre l'ajout de photos vides
2. **Nettoyage à la sauvegarde**: Filtrer les photos vides avant `JSON.stringify()`
3. **Migration de données**: Nettoyer les anciennes données avec photos invalides

```typescript
// Exemple de nettoyage à la sauvegarde
photos: (data.photos || []).filter(p => p && p.trim() !== '')
```

