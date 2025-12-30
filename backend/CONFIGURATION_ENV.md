# 🔧 Configuration Environnement Backend - Fermier Pro

## ✅ Variables d'Environnement Déjà Configurées

D'après l'analyse du code backend, voici les variables déjà utilisées :

### Base de Données PostgreSQL

```env
DB_HOST=localhost              # Défaut: localhost
DB_PORT=5432                   # Défaut: 5432
DB_NAME=farmtrack_db          # Défaut: farmtrack_db
DB_USER=farmtrack_user        # Défaut: farmtrack_user
DB_PASSWORD=postgres          # Défaut: postgres
DB_SSL=false                  # Défaut: false (true pour production)
```

**Source** : `backend/dist/database/database.service.js`

---

## ❌ Variables d'Environnement Manquantes

### 1. Authentification JWT (CRITIQUE)

```env
# JWT Configuration
JWT_SECRET=votre_secret_jwt_super_securise_minimum_32_caracteres
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=votre_refresh_secret_different
JWT_REFRESH_EXPIRES_IN=7d
```

**Nécessaire pour** : Module Auth (à créer)

---

### 2. Serveur

```env
# Server Configuration
PORT=3000
NODE_ENV=development          # development | production | test
DISABLE_RATE_LIMIT=false      # true pour désactiver le rate limit (tests uniquement)
```

**Nécessaire pour** : Configuration du serveur

---

### 3. CORS

```env
# CORS Configuration
CORS_ORIGIN=http://localhost:19006,http://localhost:3001
```

**Nécessaire pour** : Autoriser les requêtes depuis le frontend

---

### 4. File Upload (Optionnel - pour plus tard)

```env
# AWS S3 (optionnel)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=fermier-pro-uploads

# Ou Cloudinary (alternative)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

**Nécessaire pour** : Upload de photos (profil, animaux, etc.)

---

### 5. OpenAI (Optionnel - pour l'agent conversationnel)

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...
```

**Nécessaire pour** : Agent conversationnel (si utilisé côté backend)

---

### 6. Notifications Push (Optionnel - pour plus tard)

```env
# Firebase Cloud Messaging
FCM_SERVER_KEY=
FCM_PROJECT_ID=

# Ou Apple Push Notification
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_BUNDLE_ID=
APNS_KEY_PATH=./path/to/key.p8
```

**Nécessaire pour** : Notifications push

---

### 7. Redis (Optionnel - pour cache)

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

**Nécessaire pour** : Cache et sessions (optionnel)

---

## 📝 Fichier .env Complet Recommandé

Voici un template complet pour votre fichier `.env` :

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmtrack_db
DB_USER=farmtrack_user
DB_PASSWORD=votre_mot_de_passe_securise
DB_SSL=false

# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=3000
NODE_ENV=development
DISABLE_RATE_LIMIT=false

# ============================================
# CORS CONFIGURATION
# ============================================
CORS_ORIGIN=http://localhost:19006,http://localhost:3001

# ============================================
# JWT AUTHENTICATION (À AJOUTER)
# ============================================
JWT_SECRET=votre_secret_jwt_super_securise_minimum_32_caracteres_changez_moi
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=votre_refresh_secret_different_aussi_32_caracteres
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# FILE UPLOAD (Optionnel - pour plus tard)
# ============================================
# AWS S3
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=fermier-pro-uploads

# Cloudinary (alternative)
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=

# ============================================
# OPENAI (Optionnel - pour agent conversationnel)
# ============================================
# OPENAI_API_KEY=sk-...

# ============================================
# NOTIFICATIONS PUSH (Optionnel - pour plus tard)
# ============================================
# FCM_SERVER_KEY=
# FCM_PROJECT_ID=

# ============================================
# REDIS (Optionnel - pour cache)
# ============================================
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=
```

---

## 🔒 Sécurité - Génération de Secrets

### Générer un JWT_SECRET sécurisé

```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: OpenSSL
openssl rand -hex 32

# Option 3: En ligne (moins sécurisé)
# https://www.random.org/strings/
```

### Générer un JWT_REFRESH_SECRET différent

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ✅ Checklist Configuration

### Configuration Actuelle
- [x] Variables DB configurées (déjà dans le code)
- [ ] Variables JWT à ajouter
- [ ] Variables Server à ajouter
- [ ] Variables CORS à ajouter

### À Faire
- [ ] Vérifier que PostgreSQL est accessible avec les credentials
- [ ] Générer les secrets JWT
- [ ] Ajouter les variables manquantes au `.env`
- [ ] Créer un `.env.example` (sans secrets) pour le repo
- [ ] Tester la connexion à la base de données

---

## 🚀 Test de Configuration

### Tester la Connexion PostgreSQL

```bash
# Depuis le terminal
psql -h localhost -p 5432 -U farmtrack_user -d farmtrack_db

# Ou depuis Node.js
cd backend
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'farmtrack_db',
  user: process.env.DB_USER || 'farmtrack_user',
  password: process.env.DB_PASSWORD || 'postgres',
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('❌ Erreur:', err);
  else console.log('✅ Connecté:', res.rows[0]);
  pool.end();
});
"
```

---

## 📝 Notes Importantes

1. **Ne jamais commiter le `.env`** : Il doit être dans `.gitignore`
2. **Créer un `.env.example`** : Avec les variables sans les valeurs sensibles
3. **Changer les secrets en production** : Ne jamais utiliser les mêmes secrets en dev et prod
4. **Variables optionnelles** : Les marquer avec `#` pour les désactiver temporairement

---

**Date de création** : 2025-01-08  
**Dernière mise à jour** : 2025-01-08

