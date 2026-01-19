# ⚡ Installation Rapide - Admin-Web

## 🚀 Installation en 5 Étapes

### 1️⃣ Installer les dépendances

**Backend :**
```bash
cd fermier-pro/backend
npm install
```

**Frontend :**
```bash
cd fermier-pro/admin-web
npm install
```

---

### 2️⃣ Configurer la base de données

**Vérifier `.env` dans `backend/` :**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmtrack_db
DB_USER=farmtrack_user
DB_PASSWORD=postgres
DB_SSL=false

# ⚠️ IMPORTANT : Commenter DATABASE_URL en local
# DATABASE_URL=postgresql://...
```

---

### 3️⃣ Appliquer les migrations

```bash
cd fermier-pro/backend
npm run migrate
```

**Migrations critiques :**
- ✅ `035_create_admins_table.sql` - Table des admins
- ✅ `066_add_veterinarian_validation_columns.sql` - Colonnes validation vétérinaires
- ✅ `084_create_default_admin_accounts.sql` - Comptes admin par défaut

---

### 4️⃣ Créer les comptes administrateurs

```bash
cd fermier-pro/backend
npm run setup:admin
```

**OU via migration :**
```bash
npm run migrate:single 084_create_default_admin_accounts.sql
```

**Comptes créés :**
- 📧 `admin1@farmtrack.com` / `Admin123!@#`
- 📧 `admin2@farmtrack.com` / `Admin123!@#`

---

### 5️⃣ Démarrer les serveurs

**Terminal 1 - Backend :**
```bash
cd fermier-pro/backend
npm run start:dev
```
✅ Backend sur `http://localhost:3000`

**Terminal 2 - Frontend :**
```bash
cd fermier-pro/admin-web
npm run dev
```
✅ Frontend sur `http://localhost:5173`

---

## 🔐 Connexion

1. Ouvrir `http://localhost:5173/login`
2. Email : `admin1@farmtrack.com`
3. Mot de passe : `Admin123!@#`

---

## ✅ Vérification

- [ ] Backend accessible : `http://localhost:3000`
- [ ] Frontend accessible : `http://localhost:5173`
- [ ] Connexion admin fonctionne
- [ ] Dashboard affiche des données
- [ ] Pages Data chargent

---

## 🐛 Problèmes Courants

### "Cannot connect to backend"
→ Vérifier que le backend est démarré (`npm run start:dev`)

### "401 Unauthorized"
→ Exécuter `npm run setup:admin` pour créer les comptes

### "Column does not exist"
→ Exécuter `npm run migrate:single 066_add_veterinarian_validation_columns.sql`

---

## 📋 Checklist Complète

- [ ] PostgreSQL installé et démarré
- [ ] Base de données `farmtrack_db` créée
- [ ] Variables `.env` configurées (backend)
- [ ] `npm install` exécuté (backend + frontend)
- [ ] `npm run migrate` exécuté
- [ ] `npm run setup:admin` exécuté
- [ ] Backend démarré (`npm run start:dev`)
- [ ] Frontend démarré (`npm run dev`)

**C'est tout ! 🎉**
