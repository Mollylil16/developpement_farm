# Instructions d'Import PostgreSQL

## 📋 Configuration
- **Base de données** : `farmtrack_db`
- **Utilisateur** : `farmtrack_user`

---

## 🚀 Méthode 1 : Via pgAdmin (Recommandé)

### Étape 1 : Ouvrir pgAdmin
1. Lancer pgAdmin
2. Se connecter au serveur PostgreSQL

### Étape 2 : Se connecter à la base
1. Dans l'arborescence de gauche, trouver `farmtrack_db`
2. Clic droit sur `farmtrack_db` → **Query Tool**

### Étape 3 : Exécuter le script
1. Ouvrir le fichier `postgresql_schema_corrected.sql`
2. Copier tout le contenu (Ctrl+A, Ctrl+C)
3. Coller dans Query Tool (Ctrl+V)
4. Cliquer sur **Execute** (F5) ou **Run** (▶️)

### Étape 4 : Vérifier
1. Dans l'arborescence, développer `farmtrack_db` → **Schemas** → **public** → **Tables**
2. Vous devriez voir toutes les tables créées

---

## 🚀 Méthode 2 : Via psql (Ligne de commande)

### Étape 1 : Se connecter
```bash
psql -U farmtrack_user -d farmtrack_db
```

### Étape 2 : Exécuter le script
```bash
\i chemin/vers/postgresql_schema_corrected.sql
```

**OU** si vous êtes déjà dans psql :
```sql
\c farmtrack_db
\i postgresql_schema_corrected.sql
```

### Étape 3 : Vérifier
```sql
-- Lister toutes les tables
\dt

-- Vérifier une table spécifique
\d production_animaux
```

---

## ⚠️ Si vous avez des erreurs

### Erreur : "relation already exists"
**Solution** : Les tables existent déjà. Vous pouvez :
- Soit les supprimer d'abord : `DROP TABLE IF EXISTS nom_table CASCADE;`
- Soit utiliser `CREATE TABLE IF NOT EXISTS` (déjà dans le script)

### Erreur : "permission denied"
**Solution** : Vérifier que `farmtrack_user` a les droits CREATE :
```sql
-- En tant qu'administrateur PostgreSQL
GRANT ALL PRIVILEGES ON DATABASE farmtrack_db TO farmtrack_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO farmtrack_user;
```

### Erreur : "syntax error"
**Solution** : 
1. Vérifier que vous utilisez le fichier `postgresql_schema_corrected.sql` (pas l'original)
2. Vérifier la version de PostgreSQL (doit être >= 9.5)

### Erreur : "column does not exist"
**Solution** : Vérifier l'ordre de création des tables. Les tables avec FOREIGN KEY doivent être créées après les tables référencées.

---

## ✅ Vérification Finale

Après l'import, vérifier que toutes les tables sont créées :

```sql
-- Compter les tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Lister toutes les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Tables attendues** (environ 20-25 tables) :
- users
- projets
- production_animaux
- revenus
- depenses_ponctuelles
- charges_fixes
- collaborations
- vaccinations
- maladies
- traitements
- visites_veterinaires
- gestations
- sevrages
- mortalites
- pesees
- ingredients
- rations
- stocks_aliments
- stocks_mouvements
- planifications
- etc.

---

## 📝 Checklist

- [ ] pgAdmin ouvert et connecté
- [ ] Base `farmtrack_db` sélectionnée
- [ ] Query Tool ouvert
- [ ] Script `postgresql_schema_corrected.sql` copié-collé
- [ ] Script exécuté sans erreur
- [ ] Tables vérifiées dans l'arborescence
- [ ] Toutes les tables présentes

---

## 🆘 Besoin d'aide ?

Si vous avez des erreurs, envoyez :
1. Le message d'erreur complet
2. La ligne où l'erreur se produit
3. La version de PostgreSQL (`SELECT version();`)

