# 🎨 Correction des Icônes - Dernier Problème

## 📋 Problème Restant

**16/17 checks passed. 1 checks failed.**

Les fichiers `icon.png` et `adaptive-icon.png` sont en fait des fichiers JPG avec l'extension `.png`.

## ✅ Solutions

### Option 1 : Script PowerShell (Si ImageMagick est installé)

```powershell
cd fermier-pro
.\scripts\convert-icons.ps1
```

### Option 2 : Installer ImageMagick puis utiliser le script

```powershell
# Installer ImageMagick avec Chocolatey
choco install imagemagick

# Puis exécuter le script
cd fermier-pro
.\scripts\convert-icons.ps1
```

### Option 3 : Conversion Manuelle (Recommandé si pas d'ImageMagick)

1. **Ouvrir les fichiers** :
   - `assets/icon.png`
   - `assets/adaptive-icon.png`

2. **Dans un éditeur d'images** (Paint, GIMP, Photoshop, etc.) :
   - Ouvrir le fichier
   - Fichier → Enregistrer sous / Exporter
   - Choisir le format **PNG**
   - Remplacer le fichier original

3. **Ou utiliser un outil en ligne** :
   - [CloudConvert](https://cloudconvert.com/jpg-to-png)
   - [Convertio](https://convertio.co/jpg-png/)
   - [Online-Convert](https://image.online-convert.com/convert-to-png)

### Option 4 : Utiliser le logo existant

Si vous avez `assets/logo.jpeg` :

1. Ouvrir `assets/logo.jpeg`
2. Redimensionner à 1024x1024 pixels (carré)
3. Exporter en PNG
4. Utiliser ce fichier pour `icon.png` et `adaptive-icon.png`

## ✅ Vérification

Après conversion, vérifiez :

```powershell
npx expo-doctor
```

Vous devriez voir : **17/17 checks passed** ✅

## 📝 Spécifications

### icon.png
- **Taille** : 1024x1024 pixels
- **Format** : PNG avec transparence
- **Taille fichier** : < 500 KB

### adaptive-icon.png
- **Taille** : 1024x1024 pixels
- **Format** : PNG avec transparence
- **Zone sûre** : Gardez le contenu important dans un cercle de 432x432 pixels au centre
- **Taille fichier** : < 500 KB

---

**Une fois corrigé, tous les problèmes seront résolus !** ✅

