# 📋 Instructions pour copier le logo

Pour que le logo s'affiche correctement sur la landing page, vous devez copier le logo depuis le dossier admin-web :

## Étape 1 : Créer le dossier public

Si le dossier `public` n'existe pas dans `fermier-pro/landing-page/`, créez-le.

## Étape 2 : Copier le logo

Copiez le fichier :
- **Source** : `fermier-pro/admin-web/public/logo.jpeg`
- **Destination** : `fermier-pro/landing-page/public/logo.jpeg`

## Méthode manuelle

1. Ouvrez l'explorateur de fichiers
2. Allez dans `fermier-pro/admin-web/public/`
3. Copiez `logo.jpeg`
4. Allez dans `fermier-pro/landing-page/public/`
5. Collez le fichier

## Méthode PowerShell (si vous êtes dans le bon dossier)

```powershell
cd fermier-pro/landing-page
New-Item -ItemType Directory -Path "public" -Force
Copy-Item "..\admin-web\public\logo.jpeg" -Destination "public\logo.jpeg" -Force
```

Une fois le logo copié, redémarrez le serveur Next.js (`npm run dev`) pour voir les changements.
