# 🔧 Correction: Persistance des Photos d'Animaux

**Date**: 24 Novembre 2025  
**Problème**: Les photos des animaux ne se conservent pas après un redémarrage de l'application

---

## 🔍 Cause du Problème

### URIs Temporaires

Quand l'utilisateur sélectionne une photo, `expo-image-picker` retourne une **URI temporaire** qui disparaît après un redémarrage :

```typescript
// ❌ AVANT - URI temporaire
const result = await ImagePicker.launchImageLibraryAsync({...});
setPhotoUri(result.assets[0].uri); // "file:///cache/ImagePicker/abc.jpg"
```

**Conséquence:**
- ✅ Photo visible pendant la session
- ❌ Photo disparaît après redémarrage
- ❌ Photo non synchronisée entre écrans

---

## ✅ Solution: Copier les Photos dans un Dossier Permanent

### Nouveau Fichier: `src/utils/photoUtils.ts`

Utilitaire pour gérer les photos de façon permanente :

```typescript
export const savePhotoToAppStorage = async (sourceUri: string): Promise<string>
```

**Fonctionnement:**
1. Crée le dossier `documentDirectory/animal_photos/`
2. Génère un nom unique: `animal_{UUID}.jpg`
3. Copie le fichier temporaire vers le dossier permanent
4. Retourne l'URI permanente

### Modifications: `ProductionAnimalFormModal.tsx`

#### handlePickImage() et handleTakePhoto()

```typescript
// ✅ APRÈS - URI permanente
if (!result.canceled && result.assets[0]) {
  try {
    // Sauvegarder de façon permanente
    const permanentUri = await savePhotoToAppStorage(result.assets[0].uri);
    
    // Supprimer l'ancienne photo
    if (photoUri && animal?.photo_uri !== photoUri) {
      await deletePhotoFromStorage(photoUri);
    }
    
    setPhotoUri(permanentUri); // ✅ Permanente !
  } catch (error) {
    Alert.alert('Erreur', 'Impossible de sauvegarder la photo');
  }
}
```

#### Bouton "Supprimer"

```typescript
onPress={async () => {
  // Supprimer le fichier physique
  if (photoUri && animal?.photo_uri !== photoUri) {
    await deletePhotoFromStorage(photoUri);
  }
  setPhotoUri(null);
}}
```

---

## 📊 Impact

### Avant

| Scénario | Résultat |
|----------|----------|
| Créer animal avec photo | ❌ Photo temporaire |
| Redémarrer l'app | ❌ Photo disparaît |
| Suivi Pesées | ❌ Photo non affichée |

### Après

| Scénario | Résultat |
|----------|----------|
| Créer animal avec photo | ✅ Photo permanente |
| Redémarrer l'app | ✅ Photo toujours présente |
| Suivi Pesées | ✅ Photo affichée correctement |

---

## 🧪 Test à Effectuer

### Test de Persistance ⭐

1. ☐ Créer un animal avec une photo
2. ☐ Vérifier que la photo s'affiche dans Cheptel
3. ☐ Vérifier que la photo s'affiche dans Suivi Pesées
4. ☐ **REDÉMARRER l'application**
5. ☐ **Vérifier: La photo est toujours présente** ✅

### Test de Changement

1. ☐ Modifier un animal et changer sa photo
2. ☐ Vérifier que la nouvelle photo s'affiche
3. ☐ Redémarrer l'app
4. ☐ **Vérifier: La nouvelle photo est présente** ✅

---

## 📁 Structure du Stockage

```
documentDirectory/
└── animal_photos/
    ├── animal_123e4567-e89b-12d3-a456-426614174000.jpg
    ├── animal_987fcdeb-51a2-43f1-9c3d-123456789abc.jpg
    └── ...
```

---

## 📝 Fichiers Modifiés/Créés

1. ✅ **Créé**: `src/utils/photoUtils.ts`
   - `savePhotoToAppStorage()`: Sauvegarde permanente
   - `deletePhotoFromStorage()`: Suppression
   - `photoExists()`: Vérification
   - `cleanupOrphanedPhotos()`: Nettoyage

2. ✅ **Modifié**: `src/components/ProductionAnimalFormModal.tsx`
   - Import de `photoUtils`
   - Sauvegarde permanente dans `handlePickImage()` et `handleTakePhoto()`
   - Suppression fichier dans bouton "Supprimer"

3. ✅ **Corrigé précédemment**: `src/database/repositories/AnimalRepository.ts`
   - Méthode `create()` inclut `photo_uri`

---

**Status**: ✅ Corrigé  
**Testez**: Ajoutez une photo, redémarrez l'app → la photo doit être présente ! 🎉

