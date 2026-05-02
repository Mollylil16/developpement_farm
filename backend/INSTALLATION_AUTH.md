# 🔐 Installation du Module Auth

## 📋 Étapes d'Installation

### 1. Installer les Dépendances

```bash
cd backend
npm install @nestjs/jwt @nestjs/passport @nestjs/config passport passport-jwt passport-local bcrypt uuid
npm install --save-dev @types/passport-jwt @types/passport-local @types/bcrypt @types/uuid
```

### 2. Ajouter les Variables d'Environnement

Ajouter dans `backend/.env` :

```env
# JWT Configuration
JWT_SECRET=votre_secret_jwt_super_securise_minimum_32_caracteres
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=votre_refresh_secret_different_aussi_32_caracteres
JWT_REFRESH_EXPIRES_IN=7d
```

**Générer des secrets sécurisés** :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Exécuter la Migration

```bash
# Se connecter à PostgreSQL
psql -U farmtrack_user -d farmtrack_db

# Exécuter la migration
\i database/migrations/001_create_refresh_tokens.sql

# Ou depuis le terminal
psql -U farmtrack_user -d farmtrack_db -f database/migrations/001_create_refresh_tokens.sql
```

### 4. Vérifier que le Module est Importé

Le fichier `src/app.module.ts` doit inclure `AuthModule` dans les imports.

### 5. Compiler et Tester

```bash
# Compiler
npm run build

# Démarrer
npm run start:dev

# Tester avec Postman/Insomnia
POST http://localhost:3000/auth/register
POST http://localhost:3000/auth/login
POST http://localhost:3000/auth/refresh
GET http://localhost:3000/auth/me (avec Bearer token)
```

## ✅ Endpoints Disponibles

- `POST /auth/register` - Inscription
- `POST /auth/login` - Connexion
- `POST /auth/refresh` - Rafraîchir le token
- `POST /auth/logout` - Déconnexion
- `GET /auth/me` - Profil utilisateur (protégé)

## 🔒 Prochaines Étapes

1. Protéger les routes existantes avec `@UseGuards(JwtAuthGuard)`
2. Ajouter `@Public()` sur les routes publiques
3. Tester tous les endpoints

