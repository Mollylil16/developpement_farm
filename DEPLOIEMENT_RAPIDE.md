# 🚀 Déploiement Rapide sur Railway

## ⚡ Étapes Rapides (5 minutes)

### 1. Créer le projet sur Railway
1. Aller sur [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → Sélectionner votre repo
3. **+ New** → **Database** → **Add PostgreSQL** (DATABASE_URL auto-configuré)

### 2. Configurer le Backend
1. **+ New** → **GitHub Repo** → Sélectionner votre repo
2. **Settings** → **Root Directory** : `fermier-pro/backend`
3. **Variables** → Ajouter :
   ```
   JWT_SECRET=<générer un secret fort>
   CORS_ORIGIN=https://votre-domaine.com
   NODE_ENV=production
   ```

### 3. Exécuter les migrations
```bash
npm i -g @railway/cli
railway login
cd fermier-pro/backend
railway link
railway run npm run migrate
```

### 4. Générer le domaine
**Settings** → **Networking** → **Generate Domain**

### 5. Mettre à jour le frontend
Modifier `fermier-pro/src/config/env.ts` :
```typescript
production: {
  apiUrl: 'https://votre-backend.up.railway.app',
}
```

## 📋 Variables Requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | ✅ Auto-configuré par Railway | - |
| `JWT_SECRET` | Secret JWT (32+ caractères) | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CORS_ORIGIN` | Domaines autorisés | `https://app.com,https://admin.com` |
| `NODE_ENV` | Environnement | `production` |

## ✅ Checklist Complète

Voir [CHECKLIST_PRODUCTION.md](./CHECKLIST_PRODUCTION.md) pour la checklist détaillée.

## 📚 Documentation

- Guide complet : [GUIDE_DEPLOIEMENT_RAILWAY.md](./GUIDE_DEPLOIEMENT_RAILWAY.md)
- Guide backend : [backend/README_RAILWAY.md](./backend/README_RAILWAY.md)


