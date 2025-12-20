# Guide : Exporter le Schéma vers PostgreSQL

## 🎯 Objectif
Exporter le schéma SQLite de l'application vers PostgreSQL pour que votre collaborateur puisse l'utiliser.

---

## 📋 Méthode 1 : Script Automatique (Recommandé)

### Étape 1 : Générer le fichier SQL
```bash
cd fermier-pro
node scripts/export-postgresql-schema.js
```

Cela va créer le fichier `database/postgresql_schema.sql`

### Étape 2 : Vérifier le fichier
Le fichier sera créé dans `fermier-pro/database/postgresql_schema.sql`

### Étape 3 : Envoyer à votre collaborateur
Envoyez le fichier `postgresql_schema.sql` à votre collaborateur.

---

## 📋 Méthode 2 : Via pgAdmin (Manuel)

### Étape 1 : Exporter depuis SQLite (si vous avez des données)
Si vous avez une base SQLite avec des données et voulez les exporter aussi :

1. **Installer sqlite3** (si pas déjà fait)
2. **Exporter le schéma uniquement** :
```bash
sqlite3 fermier_pro.db .schema > schema.sql
```

### Étape 2 : Convertir manuellement
Ouvrez `schema.sql` et remplacez :
- `TEXT` → `VARCHAR(255)`
- `REAL` → `NUMERIC(10, 2)`
- `CURRENT_TIMESTAMP` → `NOW()`
- `INTEGER` reste `INTEGER`

### Étape 3 : Créer dans PostgreSQL via pgAdmin

1. **Ouvrir pgAdmin**
2. **Créer une nouvelle base de données** :
   - Clic droit sur "Databases" → "Create" → "Database"
   - Nom : `fermier_pro`
   - Owner : votre utilisateur PostgreSQL

3. **Ouvrir Query Tool** :
   - Clic droit sur `fermier_pro` → "Query Tool"

4. **Coller le SQL** :
   - Ouvrir le fichier `postgresql_schema.sql`
   - Copier tout le contenu
   - Coller dans Query Tool

5. **Exécuter** :
   - Cliquer sur "Execute" (F5)

---

## 📋 Méthode 3 : Via psql (Ligne de commande)

### Sur votre machine (pour tester) :

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE fermier_pro;

# Se connecter à la base
\c fermier_pro

# Exécuter le script
\i database/postgresql_schema.sql

# Vérifier les tables
\dt
```

---

## 📤 Envoyer à votre Collaborateur

### Option 1 : Fichier SQL uniquement
Envoyez simplement le fichier `database/postgresql_schema.sql`

### Option 2 : Avec instructions
Créez un fichier `INSTRUCTIONS_POSTGRESQL.md` avec :

```markdown
# Instructions d'Installation PostgreSQL

1. Créer la base de données :
   CREATE DATABASE fermier_pro;

2. Se connecter :
   \c fermier_pro;

3. Exécuter le script :
   \i postgresql_schema.sql

4. Vérifier :
   \dt
```

---

## ⚠️ Différences SQLite vs PostgreSQL

| SQLite | PostgreSQL |
|--------|------------|
| `TEXT` | `VARCHAR(255)` ou `TEXT` |
| `REAL` | `NUMERIC(10, 2)` ou `DOUBLE PRECISION` |
| `INTEGER` | `INTEGER` (identique) |
| `CURRENT_TIMESTAMP` | `NOW()` ou `CURRENT_TIMESTAMP` |
| `PRIMARY KEY` | Identique |
| `FOREIGN KEY` | Identique (mais syntaxe légèrement différente) |

---

## 🔍 Vérification

Après import, vérifier que toutes les tables sont créées :

```sql
-- Lister toutes les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Vérifier une table spécifique
\d production_animaux
```

---

## 🐛 Problèmes Courants

### Erreur : "relation already exists"
- Solution : Supprimer la table ou utiliser `DROP TABLE IF EXISTS`

### Erreur : "syntax error"
- Vérifier les conversions SQLite → PostgreSQL
- Certaines fonctions SQLite n'existent pas en PostgreSQL

### Erreur : "permission denied"
- Vérifier les permissions de l'utilisateur PostgreSQL
- Utiliser un utilisateur avec droits CREATE

---

## 📝 Notes

- Le script génère uniquement le **schéma** (structure), pas les données
- Si vous voulez exporter les données aussi, utilisez un outil de migration
- Les types peuvent nécessiter des ajustements selon vos besoins

---

## ✅ Checklist

- [ ] Script exécuté avec succès
- [ ] Fichier `postgresql_schema.sql` créé
- [ ] Fichier vérifié (ouvrir et lire)
- [ ] Fichier envoyé au collaborateur
- [ ] Instructions fournies au collaborateur

