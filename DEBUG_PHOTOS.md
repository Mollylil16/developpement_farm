# 🐛 Debug: Persistance des Photos

**Date**: 24 Novembre 2025  
**Problème**: Les photos ne persistent pas après redémarrage

---

## 🔍 Logs à Surveiller

Après avoir appliqué les corrections, surveillez ces logs dans la console :

### 1. Lors de la Sélection d'une Photo

```
📸 URI temporaire reçue: file:///path/to/temp/photo.jpg
✅ URI permanente créée: file:///path/to/documentDirectory/animal_photos/animal_xxx.jpg
```

**✅ OK si** : Les deux URIs sont différentes et la permanente est dans `documentDirectory/animal_photos/`

**❌ Problème si** : 
- Erreur lors de la copie
- Les deux URIs sont identiques
- L'URI permanente est toujours dans le cache temporaire

### 2. Lors de la Sauvegarde

```
=== SAUVEGARDE ANIMAL ===
📸 Photo URI à sauvegarder: file:///path/to/documentDirectory/animal_photos/animal_xxx.jpg
🔍 Type de photo URI: string
📦 Données complètes: {...}
```

**✅ OK si** : L'URI est bien celle permanente (dans `documentDirectory/animal_photos/`)

**❌ Problème si** : L'URI est encore temporaire (dans `cache/`)

### 3. Lors du Rechargement (après redémarrage)

```
📋 Chargement animal dans modal: animal_id_123
📸 Photo URI de l'animal: file:///path/to/documentDirectory/animal_photos/animal_xxx.jpg
✅ Photo URI définie dans le state: file:///path/to/documentDirectory/animal_photos/animal_xxx.jpg
```

**✅ OK si** : L'URI permanente est bien chargée depuis la DB

**❌ Problème si** : 
- L'URI est null
- L'URI est temporaire
- Erreur de chargement

---

## 🧪 Tests à Faire

### Test 1: Vérifier la Copie

1. Ouvrir la console
2. Ajouter une photo à un animal
3. Vérifier les logs :
   - ✅ URI temporaire reçue
   - ✅ URI permanente créée
4. Vérifier que les deux URIs sont différentes

### Test 2: Vérifier la Sauvegarde

1. Après avoir ajouté la photo
2. Cliquer sur "Valider"
3. Vérifier les logs :
   - ✅ Photo URI à sauvegarder (doit être permanente)
4. Vérifier que l'URI est bien dans `documentDirectory/animal_photos/`

### Test 3: Vérifier le Rechargement

1. Redémarrer l'application
2. Ouvrir le modal de modification de l'animal
3. Vérifier les logs :
   - ✅ Photo URI de l'animal chargée depuis la DB
   - ✅ Photo affichée dans le modal
4. La photo doit être visible

### Test 4: Vérifier après Redémarrage

1. Fermer complètement l'application
2. Redémarrer
3. Ouvrir Cheptel ou Suivi Pesées
4. La photo doit être visible dans la carte

---

## 📝 Points de Contrôle

### Chemin de l'URI Permanente

L'URI permanente doit ressembler à :
```
file:///data/user/0/com.yourapp/files/animal_photos/animal_xxx.jpg
```

**Vérifications** :
- ✅ Commence par `file://`
- ✅ Contient `animal_photos/`
- ✅ Nom de fichier : `animal_<uuid>.jpg`
- ❌ NE DOIT PAS contenir `/cache/`
- ❌ NE DOIT PAS contenir `/tmp/`

### Erreurs Possibles

#### Erreur : "Impossible de sauvegarder la photo"

**Causes possibles** :
1. Permissions d'écriture refusées
2. Dossier `animal_photos/` non créé
3. URI source invalide

**Solution** : Vérifier les permissions et la création du dossier

#### Erreur : Photo disparaît après redémarrage

**Causes possibles** :
1. L'URI n'a pas été copiée (toujours temporaire)
2. L'URI n'a pas été sauvegardée en DB
3. Le fichier a été supprimé

**Solution** : Vérifier les logs ci-dessus pour identifier l'étape qui échoue

---

## 🔧 Si le Problème Persiste

### Étape 1: Vérifier photoUtils.ts

```bash
# Vérifier que la fonction existe
grep -n "savePhotoToAppStorage" src/utils/photoUtils.ts
```

### Étape 2: Vérifier que FileSystem fonctionne

Ajouter un test dans `photoUtils.ts` :

```typescript
// Test de FileSystem
const testFileSystem = async () => {
  const dir = FileSystem.documentDirectory + 'test/';
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  await FileSystem.writeAsStringAsync(dir + 'test.txt', 'test');
  const content = await FileSystem.readAsStringAsync(dir + 'test.txt');
  console.log('✅ FileSystem fonctionne:', content);
};
```

### Étape 3: Vérifier la DB

Vérifier que `photo_uri` est bien sauvegardée :

```typescript
const animal = await animalRepo.findById(animalId);
console.log('📸 Photo URI en DB:', animal.photo_uri);
```

---

## 💡 Solution Alternative

Si le problème persiste, essayez de :

1. **Vider le cache de l'application**
2. **Désinstaller et réinstaller l'app**
3. **Vérifier les permissions de stockage**

---

**Status**: 🔍 En cours de debug  
**Prochaine étape**: Lancer l'app et surveiller les logs

