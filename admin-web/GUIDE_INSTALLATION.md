# 📦 Guide d'Installation et Migration - Admin-Web

## ✅ Checklist d'Installation

### 1. 📥 Installation des Dépendances

#### Frontend (admin-web)
```bash
cd fermier-pro/admin-web
npm install
```

**Dépendances principales :**
- ✅ React 18.2.0
- ✅ React Router DOM 6.20.0
- ✅ React Query 5.12.0 (pour les appels API)
- ✅ Axios 1.6.0 (client HTTP)
- ✅ Recharts 2.10.0 (graphiques)
- ✅ Tailwind CSS 3.3.6
- ✅ Lucide React 0.294.0 (icônes)

#### Backend
```bash
cd fermier-pro/backend
npm install
```

**Dépendances principales :**
- ✅ NestJS 11.0.0
- ✅ PostgreSQL (pg 8.11.0)
- ✅ JWT (passport-jwt)
- ✅ TypeScript 5.3.0
- ✅ tsx 4.7.0 (pour les scripts de migration)

---

### 2. 🗄️ Migrations de Base de Données

#### Migrations Critiques pour Admin-Web

**Migration 066 : Colonnes de validation vétérinaires**
```bash
cd fermier-pro/backend
npm run migrate:single 066_add_veterinarian_validation_columns.sql
```

Cette migration ajoute :
- `veterinarian_validation_status` (pending, approved, rejected)
- `cni_document_url` (URL du document CNI)
- `diploma_document_url` (URL du diplôme)
- `cni_verified`, `diploma_verified` (flags de vérification)
- `validation_reason` (raison de validation/rejet)
- `validated_at`, `validated_by` (historique de validation)
- `documents_submitted_at` (date de soumission)

**Migration 084 : Comptes administrateurs par défaut**
```bash
cd fermier-pro/backend
npm run migrate:single 084_create_default_admin_accounts.sql
```

Cette migration crée :
- `admin1@farmtrack.com` / `Admin123!@#`
- `admin2@farmtrack.com` / `Admin123!@#`

**OU utiliser le script TypeScript :**
```bash
cd fermier-pro/backend
npm run setup:admin
```

#### Appliquer TOUTES les migrations
```bash
cd fermier-pro/backend
npm run migrate
```

⚠️ **Important** : Assurez-vous que `DATABASE_URL` est commenté dans `.env` pour utiliser les variables individuelles en local.

---

### 3. ⚙️ Configuration des Variables d'Environnement

#### Frontend (admin-web/.env)
```env
# URL du backend (optionnel, par défaut: http://localhost:3000)
VITE_API_URL=http://localhost:3000
```

**Note** : Si `VITE_API_URL` n'est pas défini, le frontend utilise `http://localhost:3000` par défaut.

#### Backend (backend/.env)
```env
# Database (local - pour développement local uniquement)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmtrack_db
DB_USER=farmtrack_user
DB_PASSWORD=postgres
DB_SSL=false

# Database URL (PRODUCTION - utilisé sur Render)
# DATABASE_URL=postgresql://... (COMMENTÉ en local)

# JWT Secrets
JWT_SECRET=f67b963bb6059f0ac97923a7e132bde193c46eee0d0834a6c528651c1e6d95b4
JWT_EXPIRES_IN=3600
JWT_REFRESH_SECRET=c8c71bff3357d91a0908d4f013279869879a124c6d39ca3adc20b6df8e6b0ae6
JWT_REFRESH_EXPIRES_IN=604800

# Server
PORT=3000
NODE_ENV=development

# CORS (doit inclure l'URL du frontend)
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,https://fermier-pro-admin.onrender.com
```

---

### 4. 🚀 Démarrage

#### Backend
```bash
cd fermier-pro/backend
npm run start:dev
```

Le backend démarre sur `http://localhost:3000`

#### Frontend
```bash
cd fermier-pro/admin-web
npm run dev
```

Le frontend démarre sur `http://localhost:5173`

---

### 5. 🔐 Première Connexion

**Comptes administrateurs par défaut :**

| Email | Mot de passe |
|-------|--------------|
| `admin1@farmtrack.com` | `Admin123!@#` |
| `admin2@farmtrack.com` | `Admin123!@#` |

**URL de connexion :** `http://localhost:5173/login`

---

## 📋 Checklist Complète

### ✅ Avant de démarrer

- [ ] PostgreSQL installé et démarré
- [ ] Base de données `farmtrack_db` créée
- [ ] Utilisateur `farmtrack_user` créé avec les permissions
- [ ] Toutes les migrations appliquées (`npm run migrate`)
- [ ] Comptes admin créés (`npm run setup:admin` ou migration 084)
- [ ] Variables d'environnement configurées (`.env` backend)
- [ ] Dépendances npm installées (frontend + backend)

### ✅ Vérifications

- [ ] Backend accessible sur `http://localhost:3000`
- [ ] Swagger accessible sur `http://localhost:3000/api/docs`
- [ ] Frontend accessible sur `http://localhost:5173`
- [ ] Connexion admin fonctionnelle
- [ ] Dashboard affiche des données
- [ ] Pages Data chargent les données

---

## 🔧 Commandes Utiles

### Backend
```bash
# Démarrer en mode développement
npm run start:dev

# Appliquer toutes les migrations
npm run migrate

# Appliquer une migration spécifique
npm run migrate:single 066_add_veterinarian_validation_columns.sql

# Créer les comptes admin
npm run setup:admin

# Vérifier l'état des migrations
npm run migrate:check

# Lister toutes les migrations
npm run migrate:list
```

### Frontend
```bash
# Démarrer le serveur de développement
npm run dev

# Build pour production
npm run build

# Prévisualiser le build
npm run preview

# Linter
npm run lint
```

---

## 🐛 Dépannage

### Erreur : "Cannot connect to backend"
1. Vérifier que le backend est démarré (`npm run start:dev`)
2. Vérifier `VITE_API_URL` dans `.env` (ou utiliser la valeur par défaut)
3. Vérifier CORS dans `backend/.env` (doit inclure `http://localhost:5173`)

### Erreur : "401 Unauthorized"
1. Vérifier que les comptes admin existent : `npm run setup:admin`
2. Vérifier les identifiants : `admin1@farmtrack.com` / `Admin123!@#`
3. Vérifier que le token est stocké dans `localStorage` (DevTools)

### Erreur : "Migration already applied"
- C'est normal, les migrations utilisent `IF NOT EXISTS`
- Vous pouvez réexécuter sans problème

### Erreur : "Column does not exist"
1. Vérifier que la migration 066 a été appliquée
2. Exécuter : `npm run migrate:single 066_add_veterinarian_validation_columns.sql`

---

## 📊 État des Migrations

### Migrations Critiques pour Admin-Web

| Migration | Description | Status |
|-----------|------------|--------|
| `035_create_admins_table.sql` | Table des administrateurs | ✅ Requis |
| `066_add_veterinarian_validation_columns.sql` | Colonnes validation vétérinaires | ✅ Requis |
| `084_create_default_admin_accounts.sql` | Comptes admin par défaut | ✅ Requis |

### Autres Migrations
- Toutes les autres migrations (000-083) sont nécessaires pour le fonctionnement complet
- Utiliser `npm run migrate` pour appliquer toutes les migrations

---

## 🎯 Résumé Rapide

```bash
# 1. Installer les dépendances
cd fermier-pro/backend && npm install
cd ../admin-web && npm install

# 2. Configurer .env (backend)
# Vérifier DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# Commenter DATABASE_URL si en local

# 3. Appliquer les migrations
cd fermier-pro/backend
npm run migrate

# 4. Créer les comptes admin
npm run setup:admin

# 5. Démarrer le backend
npm run start:dev

# 6. Démarrer le frontend (dans un autre terminal)
cd fermier-pro/admin-web
npm run dev

# 7. Se connecter
# URL: http://localhost:5173/login
# Email: admin1@farmtrack.com
# Password: Admin123!@#
```

---

## ✅ Vérification Finale

Une fois tout installé, vérifiez que :

1. ✅ Backend répond sur `http://localhost:3000`
2. ✅ Frontend répond sur `http://localhost:5173`
3. ✅ Connexion admin fonctionne
4. ✅ Dashboard affiche des statistiques
5. ✅ Pages Data chargent des données
6. ✅ Graphiques s'affichent
7. ✅ Recherche, tri, pagination fonctionnent

Si tout fonctionne, **admin-web est 100% opérationnel !** 🎉
