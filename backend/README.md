# 🚀 Backend API - FarmTrack Pro

Backend NestJS pour FarmTrack Pro avec PostgreSQL.

## 📋 Prérequis

- Node.js 18+ 
- PostgreSQL 14+
- Base de données `farmtrack_db` créée
- Utilisateur `farmtrack_user` avec mot de passe `postgres`

## 🔧 Installation

```bash
# Installer les dépendances
npm install

# Créer le fichier .env (copier les valeurs ci-dessous)
cp .env.example .env
```

## ⚙️ Configuration

Créer un fichier `.env` à la racine du dossier `backend/` :

```env
# Configuration PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmtrack_db
DB_USER=farmtrack_user
DB_PASSWORD=postgres
DB_SSL=false

# Configuration serveur
PORT=3000
NODE_ENV=development
```

## 🚀 Démarrage

```bash
# Mode développement (avec watch)
npm run start:dev

# Mode production
npm run build
npm run start:prod
```

Le serveur démarre sur `http://localhost:3000`

## 🧪 Test de connexion

Une fois le serveur démarré, tester la connexion :

```bash
# Vérifier la santé de l'API
curl http://localhost:3000/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 📁 Structure

```
backend/
├── src/
│   ├── main.ts              # Point d'entrée
│   ├── app.module.ts        # Module principal
│   ├── database/             # Module base de données
│   │   ├── database.module.ts
│   │   └── database.service.ts
│   └── health/              # Module health check
│       ├── health.module.ts
│       └── health.controller.ts
├── package.json
└── tsconfig.json
```

## 🔌 API Endpoints

### Health Check
- `GET /health` - Vérifie la santé de l'API et la connexion PostgreSQL

## 📝 Prochaines étapes

1. ✅ Connexion PostgreSQL établie
2. ⏳ Créer les modules pour chaque entité (users, projets, etc.)
3. ⏳ Créer les controllers et services REST
4. ⏳ Ajouter l'authentification JWT
5. ⏳ Ajouter la validation des données

