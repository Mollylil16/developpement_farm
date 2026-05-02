# 🔧 Guide de Correction des Icônes

## Problème
Les fichiers `icon.png` et `adaptive-icon.png` sont en fait des fichiers JPG avec l'extension `.png`.

## Solutions

### Option 1 : Utiliser le logo existant (Recommandé)

Si vous avez un fichier `logo.jpeg` dans `assets/`, vous pouvez :

1. **Ouvrir `assets/logo.jpeg`** dans un éditeur d'images
2. **Exporter en PNG** :
   - GIMP/Photoshop : Fichier → Exporter → Format PNG
   - En ligne : [CloudConvert](https://cloudconvert.com/jpg-to-png)
3. **Remplacer les fichiers** :
   - `assets/icon.png` → Nouveau fichier PNG
   - `assets/adaptive-icon.png` → Nouveau fichier PNG (peut être le même)

### Option 2 : Utiliser ImageMagick (Ligne de commande)

```bash
# Windows (avec Chocolatey)
choco install imagemagick

# macOS
brew install imagemagick

# Linux
sudo apt-get install imagemagick

# Convertir icon.png
magick assets/icon.png -format png assets/icon.png

# Convertir adaptive-icon.png
magick assets/adaptive-icon.png -format png assets/adaptive-icon.png
```

### Option 3 : Outils en ligne

1. [CloudConvert](https://cloudconvert.com/jpg-to-png)
2. [Convertio](https://convertio.co/jpg-png/)
3. [Online-Convert](https://image.online-convert.com/convert-to-png)

**Étapes :**
1. Téléchargez `assets/icon.png` et `assets/adaptive-icon.png`
2. Convertissez-les en PNG sur l'un des sites ci-dessus
3. Téléchargez les fichiers convertis
4. Remplacez les fichiers originaux

## Vérification

Après conversion, vérifiez que les fichiers sont bien en PNG :

```bash
# Windows PowerShell
Get-Item assets/icon.png | Select-Object Name, Length

# Linux/Mac
file assets/icon.png
file assets/adaptive-icon.png
```

Les fichiers devraient afficher "PNG image" ou un type MIME "image/png".

## Spécifications Recommandées

### icon.png
- **Taille** : 1024x1024 pixels
- **Format** : PNG avec transparence
- **Taille fichier** : < 500 KB

### adaptive-icon.png
- **Taille** : 1024x1024 pixels
- **Format** : PNG avec transparence
- **Zone sûre** : Gardez le contenu important dans un cercle de 432x432 pixels au centre
- **Taille fichier** : < 500 KB

## Alternative : Utiliser le logo existant

Si `assets/logo.jpeg` existe et est de bonne qualité :

1. Ouvrez `assets/logo.jpeg`
2. Redimensionnez à 1024x1024 pixels (carré)
3. Exportez en PNG
4. Utilisez ce fichier pour `icon.png` et `adaptive-icon.png`

