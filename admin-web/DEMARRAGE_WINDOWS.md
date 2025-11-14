# 🪟 Démarrage de l'Interface Admin sur Windows

## Méthode 1: Utiliser le script batch (Recommandé)

Double-cliquez sur le fichier `start.bat` dans le dossier `admin-web`, ou exécutez dans PowerShell :

```powershell
cd admin-web
.\start.bat
```

## Méthode 2: Commandes manuelles

```powershell
# Aller dans le dossier admin-web
cd admin-web

# Installer les dépendances (première fois uniquement)
npm install

# Démarrer le serveur
npm start
```

## Méthode 3: Depuis la racine du projet

```powershell
# Depuis la racine du projet fermier-pro
npm run admin
```

## 🌐 Accès à l'interface

Une fois le serveur démarré, ouvrez votre navigateur et allez sur :

**http://localhost:3001**

## ⚠️ Si la base de données n'est pas trouvée

1. Lancez d'abord l'application Expo (`npm start` dans `fermier-pro`)
2. Créez un projet dans l'application
3. La base de données sera créée automatiquement
4. Relancez l'interface admin

## 📍 Emplacement de la base de données sur Windows

La base de données SQLite se trouve généralement ici :
```
C:\Users\VOTRE_NOM\.expo\databases\SQLite\fermier_pro.db
```

Ou :
```
C:\Users\VOTRE_NOM\AppData\Local\expo\databases\SQLite\fermier_pro.db
```

