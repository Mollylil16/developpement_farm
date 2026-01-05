# 🔧 Résolution de l'Erreur ENOTFOUND - Base de Données

## ❌ Problème

L'erreur `ENOTFOUND` indique que le système ne peut pas résoudre le nom d'hôte de la base de données :

```
Error: getaddrinfo ENOTFOUND dpg-d53c0pogjchc73f3oed0-a.frankfurt-postgres.render.com
```

Cela signifie que :
- La base de données Render n'existe plus ou a été supprimée
- Le hostname dans `DATABASE_URL` est incorrect
- Il y a un problème de connexion réseau/DNS
- La base de données est suspendue (plan gratuit Render)

---

## ✅ Solutions

### Solution 1 : Utiliser une Base de Données Locale (Recommandé pour le Développement)

Si vous développez localement, configurez une connexion à PostgreSQL local :

1. **Installez PostgreSQL** (si ce n'est pas déjà fait)
   - Windows : Téléchargez depuis [postgresql.org](https://www.postgresql.org/download/windows/)
   - Ou utilisez Docker : `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`

2. **Créez un fichier `.env` dans le dossier `backend/`** :

```env
# Supprimez ou commentez DATABASE_URL si elle pointe vers Render
# DATABASE_URL=postgresql://...

# Configuration locale
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmtrack_db
DB_USER=farmtrack_user
DB_PASSWORD=postgres
DB_SSL=false
```

3. **Créez la base de données et l'utilisateur** :

```sql
-- Connectez-vous à PostgreSQL en tant qu'administrateur
psql -U postgres

-- Créez l'utilisateur
CREATE USER farmtrack_user WITH PASSWORD 'postgres';

-- Créez la base de données
CREATE DATABASE farmtrack_db OWNER farmtrack_user;

-- Donnez les permissions
GRANT ALL PRIVILEGES ON DATABASE farmtrack_db TO farmtrack_user;

-- Quittez
\q
```

4. **Redémarrez l'application**

---

### Solution 2 : Corriger DATABASE_URL (Si vous utilisez Render)

Si vous voulez continuer à utiliser Render :

1. **Vérifiez votre base de données Render** :
   - Connectez-vous à [render.com](https://render.com)
   - Vérifiez que votre base de données PostgreSQL est active
   - Si elle est suspendue, réactivez-la

2. **Récupérez la nouvelle DATABASE_URL** :
   - Dans le dashboard Render, allez dans votre base de données
   - Copiez la "Internal Database URL" ou "External Database URL"
   - Le hostname peut avoir changé si la base a été recréée

3. **Mettez à jour votre `.env`** :

```env
DATABASE_URL=postgresql://user:password@nouveau-hostname.render.com:5432/database_name
```

4. **Redémarrez l'application**

---

### Solution 3 : Utiliser une Autre Plateforme Cloud

Si Render ne fonctionne plus, vous pouvez utiliser :

- **Railway** : [railway.app](https://railway.app) - Offre un plan gratuit
- **Supabase** : [supabase.com](https://supabase.com) - PostgreSQL gratuit
- **Neon** : [neon.tech](https://neon.tech) - PostgreSQL serverless gratuit
- **ElephantSQL** : [elephantsql.com](https://www.elephantsql.com) - PostgreSQL gratuit

---

## 🔍 Diagnostic

### Vérifier la Configuration Actuelle

Pour voir quelle configuration est utilisée, ajoutez temporairement dans votre code :

```typescript
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Définie' : 'Non définie');
console.log('DB_HOST:', process.env.DB_HOST || 'localhost (défaut)');
```

### Tester la Connexion Manuellement

```bash
# Si vous utilisez DATABASE_URL
psql $DATABASE_URL

# Si vous utilisez des variables individuelles
psql -h localhost -p 5432 -U farmtrack_user -d farmtrack_db
```

---

## 📝 Fichier .env Recommandé pour le Développement Local

Créez un fichier `backend/.env` :

```env
# ============================================
# DATABASE CONFIGURATION (LOCAL)
# ============================================
# Commentez DATABASE_URL pour utiliser la config locale
# DATABASE_URL=postgresql://...

DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmtrack_db
DB_USER=farmtrack_user
DB_PASSWORD=postgres
DB_SSL=false

# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET=votre_secret_jwt_super_securise_minimum_32_caracteres
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=votre_refresh_secret_different_aussi_32_caracteres
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# CORS CONFIGURATION
# ============================================
CORS_ORIGIN=http://localhost:19006,http://localhost:3001
```

---

## ⚠️ Important

1. **Ne commitez jamais le fichier `.env`** - Il doit être dans `.gitignore`
2. **Créez un `.env.example`** avec les variables sans les valeurs sensibles
3. **Redémarrez toujours l'application** après avoir modifié `.env`

---

## 🚀 Après la Correction

Une fois la configuration corrigée, vous devriez voir :

```
✅ Connexion à la base de données établie avec succès
```

Au lieu de l'erreur `ENOTFOUND`.

---

**Date de création** : 2026-01-05  
**Dernière mise à jour** : 2026-01-05

