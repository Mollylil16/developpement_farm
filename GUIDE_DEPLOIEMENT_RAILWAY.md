# 🚂 Guide de Déploiement sur Railway

Ce guide vous accompagne pour déployer l'application FarmTrack Pro sur Railway.

## 📋 Prérequis

1. **Compte Railway** : Créez un compte sur [railway.app](https://railway.app)
2. **GitHub Repository** : Votre projet doit être sur GitHub (ou GitLab/Bitbucket)
3. **Node.js** : Version 18+ (géré automatiquement par Railway)

## 🏗️ Architecture du Déploiement

Le projet se compose de plusieurs services :
- **Backend NestJS** : API REST (port 3000)
- **Admin Web** : Dashboard administrateur (optionnel, peut être déployé séparément)
- **Base de données PostgreSQL** : Gérée par Railway
- **Service AI** : Estimation de poids (peut être déployé séparément sur Railway ou ailleurs)

## 🚀 Étape 1 : Préparer le Repository

### 1.1 Vérifier les fichiers de configuration

Les fichiers suivants doivent être présents :
- ✅ `fermier-pro/backend/railway.json` - Configuration Railway
- ✅ `fermier-pro/backend/Procfile` - Commande de démarrage
- ✅ `fermier-pro/backend/package.json` - Scripts npm

### 1.2 S'assurer que le code est sur GitHub

```bash
cd fermier-pro
git add .
git commit -m "Préparation pour déploiement Railway"
git push origin main
```

## 🗄️ Étape 2 : Créer le Projet sur Railway

### 2.1 Créer un nouveau projet

1. Connectez-vous à [railway.app](https://railway.app)
2. Cliquez sur **"New Project"**
3. Sélectionnez **"Deploy from GitHub repo"**
4. Choisissez votre repository `farmtrackPro`
5. Railway détectera automatiquement le projet

### 2.2 Ajouter une base de données PostgreSQL

1. Dans votre projet Railway, cliquez sur **"+ New"**
2. Sélectionnez **"Database"** → **"Add PostgreSQL"**
3. Railway créera automatiquement une base de données PostgreSQL
4. La variable `DATABASE_URL` sera automatiquement configurée

## 🔧 Étape 3 : Configurer le Service Backend

### 3.1 Ajouter le service Backend

1. Dans votre projet Railway, cliquez sur **"+ New"**
2. Sélectionnez **"GitHub Repo"**
3. Choisissez votre repository
4. Railway détectera automatiquement le dossier `backend`

### 3.2 Configurer le Root Directory

1. Cliquez sur votre service backend
2. Allez dans **"Settings"** → **"Root Directory"**
3. Définissez : `fermier-pro/backend`
4. Railway utilisera ce dossier comme racine

### 3.3 Configurer les Variables d'Environnement

Allez dans **"Variables"** et ajoutez :

#### Variables Requises

```env
# JWT Secret (générez un secret fort)
JWT_SECRET=votre_secret_jwt_tres_securise_ici

# CORS Origins (URLs autorisées)
CORS_ORIGIN=https://votre-domaine.com,https://admin.votre-domaine.com

# Port (géré automatiquement par Railway, mais peut être défini)
PORT=3000

# Host (0.0.0.0 pour écouter sur toutes les interfaces)
HOST=0.0.0.0
```

#### Variables Optionnelles

```env
# Email SMTP (si vous voulez envoyer des emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-app

# AI Service URL (si déployé séparément)
AI_API_URL=https://votre-service-ai.railway.app

# NODE_ENV
NODE_ENV=production
```

**Note** : `DATABASE_URL` est automatiquement fourni par Railway quand vous ajoutez PostgreSQL.

### 3.4 Configurer le Build et le Démarrage

Railway détectera automatiquement :
- **Build Command** : `npm install && npm run build`
- **Start Command** : `npm run start:prod` (défini dans Procfile)

## 📊 Étape 4 : Exécuter les Migrations

### 4.1 Méthode 1 : Via Railway CLI (Recommandé)

1. Installez Railway CLI :
   ```bash
   npm i -g @railway/cli
   ```

2. Connectez-vous :
   ```bash
   railway login
   ```

3. Liez votre projet :
   ```bash
   cd fermier-pro/backend
   railway link
   ```

4. Exécutez les migrations :
   ```bash
   railway run npm run migrate
   ```

### 4.2 Méthode 2 : Via Railway Dashboard

1. Allez dans votre service backend
2. Cliquez sur **"Deployments"**
3. Créez un nouveau déploiement avec la commande :
   ```bash
   npm run migrate
   ```

### 4.3 Méthode 3 : Via Script de Migration Automatique

Créez un script de post-deploy dans `package.json` :

```json
{
  "scripts": {
    "postdeploy": "npm run migrate || true"
  }
}
```

**Note** : Le `|| true` permet au déploiement de continuer même si les migrations échouent (utile si déjà appliquées).

## 🌐 Étape 5 : Configurer le Domaine

### 5.1 Générer un domaine Railway

1. Dans votre service backend, allez dans **"Settings"** → **"Networking"**
2. Cliquez sur **"Generate Domain"**
3. Railway générera un domaine comme : `votre-service.up.railway.app`

### 5.2 Configurer un domaine personnalisé (Optionnel)

1. Dans **"Settings"** → **"Networking"**
2. Cliquez sur **"Custom Domain"**
3. Ajoutez votre domaine (ex: `api.fermier-pro.com`)
4. Suivez les instructions DNS

## 📱 Étape 6 : Mettre à Jour le Frontend Mobile

### 6.1 Mettre à jour l'URL de l'API

Modifiez `fermier-pro/src/config/env.ts` :

```typescript
production: {
  apiUrl: 'https://votre-backend.railway.app', // URL de votre backend Railway
  timeout: 10000,
  enableLogging: false,
},
```

### 6.2 Rebuild l'application

```bash
cd fermier-pro
npx expo prebuild
npx expo build:android  # ou build:ios
```

## 🧪 Étape 7 : Tester le Déploiement

### 7.1 Vérifier la santé de l'API

```bash
curl https://votre-backend.railway.app/api/docs
```

Vous devriez voir la documentation Swagger.

### 7.2 Tester un endpoint

```bash
curl https://votre-backend.railway.app/health
```

### 7.3 Vérifier les logs

Dans Railway Dashboard → **"Deployments"** → Cliquez sur un déploiement → **"View Logs"**

## 🔐 Étape 8 : Sécurité

### 8.1 Créer un compte Admin

Une fois déployé, créez un compte admin :

```bash
cd fermier-pro/backend
railway run tsx scripts/create-admin-accounts.ts
```

### 8.2 Vérifier les variables sensibles

Assurez-vous que :
- ✅ `JWT_SECRET` est fort et unique
- ✅ `DATABASE_URL` n'est pas exposé publiquement
- ✅ CORS est configuré correctement
- ✅ Les credentials SMTP sont sécurisés

## 🚀 Étape 9 : Déployer l'Admin Web (Optionnel)

### 9.1 Créer un nouveau service

1. Dans Railway, cliquez sur **"+ New"** → **"GitHub Repo"**
2. Sélectionnez votre repository
3. Configurez le **Root Directory** : `fermier-pro/admin-web`

### 9.2 Configurer les variables

```env
VITE_API_URL=https://votre-backend.railway.app
```

### 9.3 Build et déployer

Railway détectera automatiquement Vite et construira l'application.

## 📊 Étape 10 : Monitoring et Logs

### 10.1 Voir les logs en temps réel

Dans Railway Dashboard → **"Deployments"** → **"View Logs"**

### 10.2 Monitoring des métriques

Railway fournit automatiquement :
- CPU usage
- Memory usage
- Network traffic
- Request count

## 🔄 Étape 11 : Déploiement Continu (CI/CD)

Railway déploie automatiquement à chaque push sur la branche principale.

Pour configurer des branches spécifiques :
1. Allez dans **"Settings"** → **"Source"**
2. Configurez la branche de déploiement

## 🐛 Dépannage

### Problème : Le backend ne démarre pas

**Vérifications** :
1. ✅ Les variables d'environnement sont définies
2. ✅ `DATABASE_URL` est correct
3. ✅ Les logs montrent l'erreur exacte

### Problème : Erreur de connexion à la base de données

**Solutions** :
1. Vérifiez que PostgreSQL est bien démarré
2. Vérifiez `DATABASE_URL` dans les variables
3. Vérifiez que les migrations ont été exécutées

### Problème : CORS errors

**Solution** :
1. Ajoutez l'URL de votre frontend dans `CORS_ORIGIN`
2. Format : `https://votre-domaine.com,https://autre-domaine.com`

### Problème : Migrations échouent

**Solutions** :
1. Vérifiez les logs pour l'erreur exacte
2. Les migrations peuvent échouer si déjà appliquées (normal)
3. Exécutez manuellement : `railway run npm run migrate`

## 📝 Checklist de Déploiement

- [ ] Repository GitHub créé et code poussé
- [ ] Projet Railway créé
- [ ] Base de données PostgreSQL ajoutée
- [ ] Service backend créé et configuré
- [ ] Variables d'environnement configurées
- [ ] Root directory configuré (`fermier-pro/backend`)
- [ ] Migrations exécutées
- [ ] Domaine Railway généré
- [ ] API testée et fonctionnelle
- [ ] Frontend mobile mis à jour avec la nouvelle URL
- [ ] Compte admin créé
- [ ] CORS configuré correctement
- [ ] Logs vérifiés

## 🎉 Félicitations !

Votre application est maintenant déployée sur Railway. 

### URLs importantes :
- **API Backend** : `https://votre-backend.railway.app`
- **Swagger Docs** : `https://votre-backend.railway.app/api/docs`
- **Admin Dashboard** : `https://votre-admin.railway.app` (si déployé)

## 📚 Ressources

- [Documentation Railway](https://docs.railway.app)
- [Railway CLI](https://docs.railway.app/develop/cli)
- [Variables d'environnement Railway](https://docs.railway.app/deploy/environment-variables)

## 🔄 Mises à jour Futures

Pour mettre à jour l'application :
1. Faites vos modifications localement
2. Testez en local
3. Committez et poussez sur GitHub
4. Railway déploiera automatiquement

```bash
git add .
git commit -m "Mise à jour de l'application"
git push origin main
```


