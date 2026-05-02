# 🔐 Migration 066 & Identifiants Admin par Défaut

## 📋 Migration SQL 066 - Validation des Vétérinaires

### Fichier de migration
**Chemin**: `backend/database/migrations/066_add_veterinarian_validation_columns.sql`

### Comment exécuter sur Render

**Option 1 : Via l'interface Render (Recommandé)**

1. Connectez-vous à votre dashboard Render
2. Allez dans votre base de données PostgreSQL
3. Cliquez sur "Connect" → "SQL Editor" ou "Shell"
4. Copiez-collez le contenu du fichier `066_add_veterinarian_validation_columns.sql`
5. Exécutez la requête

**Option 2 : Via psql (ligne de commande)**

```bash
# Se connecter à la base de données Render
psql -h [VOTRE_HOST_RENDER] -U [VOTRE_USER] -d [VOTRE_DB_NAME]

# Puis exécuter le fichier SQL
\i backend/database/migrations/066_add_veterinarian_validation_columns.sql
```

**Option 3 : Via script Node.js (si disponible)**

```bash
cd backend
tsx scripts/run-migrations.ts 066
```

---

## 🔑 Identifiants Admin par Défaut

D'après le script `backend/scripts/create-admin-accounts.ts`, voici les identifiants :

### Admin Principal (Admin 1)

```
📧 Email: admin1@farmtrack.com
🔒 Mot de passe: Admin123!@#
👤 Nom: Admin Principal
```

### Admin Collaborateur (Admin 2)

```
📧 Email: admin2@farmtrack.com
🔒 Mot de passe: Admin123!@#
👤 Nom: Admin Collaborateur
```

---

## ⚠️ IMPORTANT

1. **Ces comptes doivent être créés** avant de pouvoir se connecter
2. Si les comptes n'existent pas encore, exécutez le script :
   ```bash
   cd backend
   tsx scripts/create-admin-accounts.ts
   ```
3. **Changez ces mots de passe après la première connexion** pour des raisons de sécurité !

---

## 📝 Vérification

Pour vérifier si les comptes admin existent :

```sql
SELECT id, email, nom, prenom, is_active, created_at 
FROM admins 
ORDER BY created_at DESC;
```

Pour vérifier si la migration 066 a été exécutée :

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name IN (
    'veterinarian_validation_status',
    'cni_document_url',
    'diploma_document_url',
    'cni_verified',
    'diploma_verified',
    'validation_reason',
    'validated_at',
    'validated_by',
    'documents_submitted_at'
  )
ORDER BY column_name;
```

Si toutes les colonnes sont présentes → ✅ Migration réussie !

---

## 🚀 Étapes Finales

1. ✅ Exécuter la migration SQL 066 sur Render
2. ✅ Créer les comptes admin (si pas déjà fait) avec `tsx scripts/create-admin-accounts.ts`
3. ✅ Se connecter sur `http://localhost:3001/login` (ou votre URL admin-web)
4. ✅ Tester la validation des vétérinaires sur `/validation`
5. ✅ Vérifier les statistiques sur le Dashboard

---

## 📞 En cas de problème

- Vérifiez que la table `admins` existe : `SELECT * FROM admins;`
- Vérifiez que la migration 066 a bien ajouté les colonnes dans `users`
- Vérifiez les logs du backend pour les erreurs SQL
- Assurez-vous que `JWT_SECRET` est configuré dans le `.env` du backend
