# 🚂 Déploiement Railway - Guide Rapide

## ⚡ Démarrage Rapide

### 1. Préparer le code
```bash
# S'assurer que tout est commité
git add .
git commit -m "Préparation Railway"
git push origin main
```

### 2. Créer le projet sur Railway
1. Aller sur [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Sélectionner votre repo

### 3. Ajouter PostgreSQL
1. **+ New** → **Database** → **Add PostgreSQL**
2. `DATABASE_URL` sera automatiquement configuré

### 4. Configurer le service Backend
1. **+ New** → **GitHub Repo** → Sélectionner votre repo
2. **Settings** → **Root Directory** : `fermier-pro/backend`
3. **Variables** → Ajouter :
   ```
   JWT_SECRET=votre_secret_jwt_tres_securise
   CORS_ORIGIN=https://votre-domaine.com
   PORT=3000
   HOST=0.0.0.0
   ```

### 5. Exécuter les migrations
```bash
# Installer Railway CLI
npm i -g @railway/cli

# Se connecter
railway login

# Lier le projet
cd fermier-pro/backend
railway link

# Exécuter les migrations
railway run npm run migrate
```

### 6. Générer un domaine
1. **Settings** → **Networking** → **Generate Domain**
2. Copier l'URL (ex: `votre-backend.up.railway.app`)

### 7. Mettre à jour le frontend
Modifier `fermier-pro/src/config/env.ts` :
```typescript
production: {
  apiUrl: 'https://votre-backend.up.railway.app',
  // ...
}
```

## 📋 Variables d'Environnement Requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | ✅ Auto-configuré par Railway | `postgresql://...` |
| `JWT_SECRET` | Secret pour signer les tokens JWT | `votre_secret_securise` |
| `CORS_ORIGIN` | URLs autorisées (séparées par virgule) | `https://app.com,https://admin.com` |
| `PORT` | Port du serveur (optionnel) | `3000` |
| `HOST` | Host du serveur (optionnel) | `0.0.0.0` |

## 🔧 Commandes Utiles

```bash
# Voir les logs
railway logs

# Exécuter une commande
railway run <commande>

# Ouvrir le shell
railway shell

# Voir les variables
railway variables
```

## 🐛 Dépannage

### Backend ne démarre pas
- Vérifier les variables d'environnement
- Vérifier les logs : `railway logs`

### Erreur de connexion DB
- Vérifier que PostgreSQL est démarré
- Vérifier `DATABASE_URL`

### CORS errors
- Ajouter l'URL frontend dans `CORS_ORIGIN`

## 📚 Documentation Complète

Voir [GUIDE_DEPLOIEMENT_RAILWAY.md](../../GUIDE_DEPLOIEMENT_RAILWAY.md) pour le guide complet.


