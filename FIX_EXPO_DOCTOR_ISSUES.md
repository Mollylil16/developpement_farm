# 🔧 Guide de Correction des Problèmes Expo Doctor

## ✅ Problème 1 : Conflit Git résolu

- **Fichier** : `src/navigation/types.ts`
- **Statut** : ✅ **CORRIGÉ** - Les marqueurs de conflit ont été supprimés

## ⚠️ Problème 2 : Fichiers d'icônes (JPG avec extension PNG)

### Problème

Les fichiers `icon.png` et `adaptive-icon.png` sont en fait des fichiers JPG mais avec l'extension `.png`.

### Solution

#### Option A : Convertir les fichiers en PNG (Recommandé)

1. Ouvrez les fichiers dans un éditeur d'images (GIMP, Photoshop, ou en ligne)
2. Exportez-les au format PNG
3. Remplacez les fichiers dans `assets/icon.png` et `assets/adaptive-icon.png`

#### Option B : Utiliser des outils en ligne

- [CloudConvert](https://cloudconvert.com/jpg-to-png)
- [Convertio](https://convertio.co/jpg-png/)

#### Option C : Utiliser ImageMagick (ligne de commande)

```bash
# Installer ImageMagick (si pas déjà installé)
# Windows: choco install imagemagick
# macOS: brew install imagemagick
# Linux: sudo apt-get install imagemagick

# Convertir icon.png
magick assets/icon.png -format png assets/icon.png

# Convertir adaptive-icon.png
magick assets/adaptive-icon.png -format png assets/adaptive-icon.png
```

### Vérification

Après conversion, vérifiez que les fichiers sont bien en PNG :

```bash
file assets/icon.png
file assets/adaptive-icon.png
```

## ✅ Problème 3 : Configuration Metro corrigée

- **Fichier** : `metro.config.js`
- **Statut** : ✅ **CORRIGÉ** - Les extensions sont maintenant fusionnées avec les valeurs par défaut d'Expo

## 📦 Problème 4 : Packages obsolètes

### Solution : Mettre à jour les packages

Exécutez cette commande pour mettre à jour tous les packages Expo :

```bash
cd fermier-pro
npx expo install --fix
```

Ou manuellement pour chaque package :

```bash
npx expo install expo@~54.0.30
npx expo install expo-document-picker@~14.0.8
npx expo install expo-file-system@~19.0.21
npx expo install expo-font@~14.0.10
npx expo install expo-image-picker@~17.0.10
npx expo install expo-keep-awake@~15.0.8
npx expo install expo-notifications@~0.32.15
npx expo install expo-sharing@~14.0.8
npx expo install expo-sqlite@~16.0.10
npx expo install expo-status-bar@~3.0.9
npx expo install react-native-worklets@0.5.1
npx expo install babel-preset-expo@~54.0.9
npx expo install jest-expo@~54.0.16
```

### Vérification

Après mise à jour, vérifiez que tout est correct :

```bash
npx expo doctor
```

## 📋 Checklist de Correction

- [x] Conflit Git résolu dans `types.ts`
- [x] Configuration Metro corrigée
- [ ] Fichiers d'icônes convertis en PNG
- [ ] Packages Expo mis à jour

## 🚀 Après Correction

Une fois tous les problèmes corrigés, relancez :

```bash
npx expo doctor
```

Tous les checks devraient passer ! ✅
