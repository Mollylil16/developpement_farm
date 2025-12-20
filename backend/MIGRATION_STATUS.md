# ✅ Statut des Migrations PostgreSQL

## Migrations Exécutées

### ✅ 000_create_users_table.sql
**Date** : 2025-01-08  
**Statut** : ✅ Exécutée (table existait déjà, colonnes ajoutées via 002)

### ✅ 001_create_refresh_tokens.sql
**Date** : 2025-01-08  
**Statut** : ✅ Exécutée  
**Description** : Création de la table `refresh_tokens` pour gérer les tokens JWT

### ✅ 002_add_missing_users_columns.sql
**Date** : 2025-01-08  
**Statut** : ✅ Exécutée  
**Description** : Ajout des colonnes manquantes à la table `users` :
- ✅ `saved_farms` (TEXT) - JSON array des fermes favorites
- ✅ `roles` (TEXT) - JSON object des rôles utilisateur
- ✅ `active_role` (TEXT) - Rôle actif
- ✅ `is_onboarded` (BOOLEAN) - Statut onboarding
- ✅ `onboarding_completed_at` (TIMESTAMP) - Date de fin onboarding

---

## Structure Finale de la Table `users`

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  telephone TEXT UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  password_hash TEXT,
  provider TEXT NOT NULL DEFAULT 'email',
  provider_id TEXT,
  photo TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_connexion TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  saved_farms TEXT,                -- ✅ Ajouté
  roles TEXT,                      -- ✅ Ajouté
  active_role TEXT,                -- ✅ Ajouté
  is_onboarded BOOLEAN DEFAULT FALSE, -- ✅ Ajouté
  onboarding_completed_at TIMESTAMP,  -- ✅ Ajouté
  
  CONSTRAINT check_email_or_telephone CHECK (email IS NOT NULL OR telephone IS NOT NULL)
);
```

---

## ✅ Vérification

Toutes les colonnes nécessaires pour la compatibilité avec le frontend sont maintenant présentes dans la table `users`.

**Prochaine étape** : Créer le service API client dans le frontend.

---

**Date de mise à jour** : 2025-01-08

