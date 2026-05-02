# ✅ Checklist de Déploiement en Production

## 🔐 Sécurité

- [ ] **JWT_SECRET** : Générer un secret fort et unique (minimum 32 caractères)
  ```bash
  # Générer un secret aléatoire
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] **CORS_ORIGIN** : Configurer uniquement les domaines autorisés
  - Format : `https://app.fermier-pro.com,https://admin.fermier-pro.com`
  - Ne pas utiliser `*` en production

- [ ] **DATABASE_URL** : Vérifier que Railway l'a configuré automatiquement
  - Ne pas exposer publiquement
  - Utiliser SSL en production

- [ ] **Variables sensibles** : Toutes les variables sont dans Railway, pas dans le code

## 🗄️ Base de Données

- [ ] **PostgreSQL créé** sur Railway
- [ ] **Migrations exécutées** : `railway run npm run migrate`
- [ ] **Vérifier les tables** : Se connecter à la DB et vérifier que toutes les tables existent
- [ ] **Backup configuré** : Railway fait des backups automatiques, mais vérifier la fréquence

## 🚀 Backend

- [ ] **Service créé** sur Railway avec Root Directory : `fermier-pro/backend`
- [ ] **Variables d'environnement configurées** :
  - [ ] `JWT_SECRET`
  - [ ] `CORS_ORIGIN`
  - [ ] `NODE_ENV=production`
  - [ ] `DATABASE_URL` (auto-configuré)
  - [ ] `PORT` (optionnel, Railway le gère)
  - [ ] `HOST=0.0.0.0` (optionnel)

- [ ] **Build réussi** : Vérifier les logs de build
- [ ] **Démarrage réussi** : Vérifier les logs de démarrage
- [ ] **Health check** : Tester `https://votre-backend.railway.app/health` (si endpoint existe)
- [ ] **Swagger accessible** : `https://votre-backend.railway.app/api/docs`

## 📱 Frontend Mobile

- [ ] **URL API mise à jour** dans `fermier-pro/src/config/env.ts`
  ```typescript
  production: {
    apiUrl: 'https://votre-backend.railway.app',
    // ...
  }
  ```

- [ ] **Rebuild de l'app** : 
  ```bash
  cd fermier-pro
  npx expo prebuild
  npx expo build:android  # ou build:ios
  ```

- [ ] **Tester l'app** : Vérifier que l'app se connecte au backend en production

## 🔧 Configuration

- [ ] **Email SMTP** (optionnel) : Si vous voulez envoyer des emails
  - [ ] `SMTP_HOST`
  - [ ] `SMTP_PORT`
  - [ ] `SMTP_SECURE`
  - [ ] `SMTP_USER`
  - [ ] `SMTP_PASSWORD`

- [ ] **Service AI** (optionnel) : Si déployé séparément
  - [ ] `AI_API_URL` configuré dans le backend

## 👤 Comptes Admin

- [ ] **Créer un compte admin** :
  ```bash
  railway run tsx scripts/create-admin-accounts.ts
  ```

- [ ] **Tester la connexion admin** : Se connecter avec les credentials créés

## 🧪 Tests

- [ ] **Test d'inscription** : Créer un nouveau compte utilisateur
- [ ] **Test de connexion** : Se connecter avec un compte existant
- [ ] **Test de création de projet** : Créer un projet en tant que producteur
- [ ] **Test des endpoints principaux** : Vérifier que les principales fonctionnalités fonctionnent

## 📊 Monitoring

- [ ] **Logs accessibles** : Vérifier que vous pouvez voir les logs dans Railway
- [ ] **Métriques activées** : CPU, Memory, Network visibles dans Railway
- [ ] **Alertes configurées** (optionnel) : Configurer des alertes pour les erreurs

## 🌐 Domaines

- [ ] **Domaine Railway généré** : `votre-backend.up.railway.app`
- [ ] **Domaine personnalisé** (optionnel) : Si vous avez un domaine
  - [ ] DNS configuré
  - [ ] SSL activé automatiquement par Railway

## 📝 Documentation

- [ ] **URLs documentées** :
  - Backend API : `https://...`
  - Swagger : `https://.../api/docs`
  - Admin Dashboard : `https://...` (si déployé)

## 🔄 Post-Déploiement

- [ ] **Vérifier les logs** régulièrement pendant les premières heures
- [ ] **Tester les fonctionnalités critiques** :
  - [ ] Inscription/Connexion
  - [ ] Création de projet
  - [ ] Gestion des animaux
  - [ ] Marketplace (si activé)
  
- [ ] **Performance** : Vérifier les temps de réponse
- [ ] **Erreurs** : Surveiller les erreurs dans les logs

## 🚨 En cas de problème

1. **Vérifier les logs** : Railway Dashboard → Deployments → View Logs
2. **Vérifier les variables** : Railway Dashboard → Variables
3. **Vérifier la base de données** : Railway Dashboard → PostgreSQL → Connect
4. **Rollback si nécessaire** : Railway Dashboard → Deployments → Rollback

## 📞 Support

- Documentation Railway : https://docs.railway.app
- Logs en temps réel : Railway Dashboard
- CLI Railway : `railway logs` pour voir les logs en local

---

**Date de déploiement** : _______________
**URL Backend** : _______________
**URL Swagger** : _______________
**Statut** : ⬜ En cours | ⬜ Réussi | ⬜ Échec


