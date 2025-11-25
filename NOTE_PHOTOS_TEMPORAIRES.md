# ⚠️ Note: Photos Temporaires

**Date**: 24 Novembre 2025  
**Statut**: Solution temporaire appliquée

---

## 🔍 Problème Résolu

**Erreur**: `Method getInfoAsync imported from "expo-file-system" is deprecated`

Les fonctions de `photoUtils.ts` utilisaient l'ancienne API `expo-file-system` qui est maintenant dépréciée.

---

## ✅ Solution Temporaire Appliquée

Les imports et appels à `savePhotoToAppStorage()` et `deletePhotoFromStorage()` ont été **retirés** de `ProductionAnimalFormModal.tsx`.

Les photos sont maintenant utilisées **directement** avec leurs URIs temporaires :

```typescript
// ✅ Solution simple actuelle
if (!result.canceled && result.assets[0]) {
  setPhotoUri(result.assets[0].uri);
}
```

---

## ⚠️ Limitation Actuelle

**Les photos ne persistent PAS après un redémarrage de l'application.**

- ✅ Pendant la session : Les photos s'affichent correctement
- ❌ Après redémarrage : Les photos disparaissent (URIs temporaires invalides)

---

## 🔧 Solution Future (À Implémenter)

Pour que les photos persistent, vous devrez migrer vers la **nouvelle API expo-file-system** :

### Option 1: Nouvelle API (Recommandée)

```typescript
import { File, Directory } from 'expo-file-system';

const savePhoto = async (sourceUri: string): Promise<string> => {
  const directory = new Directory(Directory.documentDirectory + 'animal_photos/');
  await directory.create();
  
  const fileName = `animal_${Date.now()}.jpg`;
  const file = new File(directory.path + fileName);
  
  // Copier le fichier
  await File.copy(sourceUri, file.path);
  
  return file.path;
};
```

### Option 2: Legacy API

```typescript
import * as FileSystem from 'expo-file-system/legacy';

const savePhoto = async (sourceUri: string): Promise<string> => {
  const directory = FileSystem.documentDirectory + 'animal_photos/';
  const dirInfo = await FileSystem.getInfoAsync(directory);
  
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(directory);
  }
  
  const fileName = `animal_${Date.now()}.jpg`;
  const destPath = directory + fileName;
  
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destPath,
  });
  
  return destPath;
};
```

---

## 📊 Comparaison

| Aspect | Solution Actuelle | Solution Future |
|--------|-------------------|-----------------|
| Photos pendant session | ✅ Fonctionne | ✅ Fonctionne |
| Photos après redémarrage | ❌ Disparaissent | ✅ Persistent |
| Complexité | ⭐ Simple | ⭐⭐⭐ Plus complexe |
| Gestion de stockage | ✅ Automatique | ❌ Manuel (nettoyage) |

---

## 🎯 Recommandation

**Pour l'instant**: La solution actuelle fonctionne pour les tests et le développement.

**Pour la production**: Implémentez la persistance des photos avec la nouvelle API `expo-file-system`.

---

## 📝 Fichiers Modifiés

✅ **`src/components/ProductionAnimalFormModal.tsx`**
- Retiré l'import de `photoUtils`
- Simplifié `handlePickImage()` et `handleTakePhoto()`
- Simplifié le bouton "Supprimer"

---

**Status**: ✅ Erreur corrigée  
**Photos**: ⚠️ Temporaires (disparaissent au redémarrage)  
**Prochaine étape**: Implémenter la persistance avec la nouvelle API

