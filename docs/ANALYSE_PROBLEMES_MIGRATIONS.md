# Analyse des Problèmes des Migrations 36, 37, 38, 45, 52 et 63

## 🔍 Problèmes identifiés

### 1. Migration 036 - `create_subscription_plans_table.sql`

**Problème potentiel :**
- ✅ Utilise `CREATE TABLE IF NOT EXISTS` - OK
- ✅ Utilise `ON CONFLICT (id) DO NOTHING` pour les INSERT - OK
- ⚠️ **Problème :** Si la table existe déjà avec des données, les INSERT peuvent échouer silencieusement
- ⚠️ **Problème :** Les triggers sont créés sans `IF NOT EXISTS`, ce qui peut causer des erreurs si déjà appliqués

**Solution recommandée :**
```sql
-- Ajouter IF NOT EXISTS aux triggers
CREATE TRIGGER IF NOT EXISTS trigger_update_subscription_plans_updated_at ...
```

---

### 2. Migration 037 - `create_user_subscriptions_table.sql`

**Problème potentiel :**
- ✅ Utilise `CREATE TABLE IF NOT EXISTS` - OK
- ⚠️ **Problème :** Les triggers sont créés sans `IF NOT EXISTS`
- ⚠️ **Problème :** Les index utilisent `IF NOT EXISTS` - OK
- ⚠️ **Dépendance :** Dépend de la migration 036 (subscription_plans doit exister)

**Solution recommandée :**
```sql
-- Ajouter IF NOT EXISTS aux triggers
CREATE TRIGGER IF NOT EXISTS trigger_update_user_subscriptions_updated_at ...
```

---

### 3. Migration 038 - `create_transactions_table.sql`

**Problème potentiel :**
- ✅ Utilise `CREATE TABLE IF NOT EXISTS` - OK
- ⚠️ **Problème :** Les triggers sont créés sans `IF NOT EXISTS`
- ⚠️ **Problème :** Référence `user_subscriptions` (migration 037) et `subscription_plans` (migration 036)
- ⚠️ **Problème :** `ON DELETE SET NULL` sur `user_id` mais `user_id` est `NOT NULL` - **CONTRADICTION !**

**Erreur critique :**
```sql
user_id TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
```
Cette ligne est contradictoire : `NOT NULL` mais `ON DELETE SET NULL` ne peut pas fonctionner.

**Solution recommandée :**
```sql
-- Option 1 : CASCADE au lieu de SET NULL
user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

-- Option 2 : Rendre nullable si on veut garder l'historique
user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
```

---

### 4. Migration 045 - `create_batch_pigs_tables.sql`

**Problème potentiel :**
- ✅ Utilise `CREATE TABLE IF NOT EXISTS` - OK
- ✅ Utilise `ADD COLUMN IF NOT EXISTS` - OK
- ⚠️ **Problème :** Les triggers sont créés sans `IF NOT EXISTS` ou `CREATE OR REPLACE`
- ⚠️ **Problème :** Les fonctions utilisent `CREATE OR REPLACE` - OK
- ⚠️ **Problème :** Les contraintes FK sont ajoutées conditionnellement - OK
- ⚠️ **Problème :** Si la migration est réexécutée, les triggers seront recréés (pas de problème avec CREATE OR REPLACE)

**Solution recommandée :**
```sql
-- Les triggers utilisent déjà CREATE OR REPLACE pour les fonctions
-- Mais les triggers eux-mêmes devraient être :
DROP TRIGGER IF EXISTS trigger_update_batch_counts ON batch_pigs;
CREATE TRIGGER trigger_update_batch_counts ...
```

---

### 5. Migration 052 - `add_batch_support_to_marketplace_listings.sql`

**Problème potentiel :**
- ✅ Utilise `ADD COLUMN IF NOT EXISTS` - OK
- ⚠️ **Problème :** Crée une contrainte `check_batch_listing` qui sera modifiée par la migration 63
- ⚠️ **Problème :** La colonne `weight` est créée comme nullable, mais la migration 63 essaie de la rendre NOT NULL
- ⚠️ **Conflit avec 063 :** La migration 63 DROP et recrée `check_batch_listing`, ce qui est OK

**Problème spécifique :**
```sql
-- Migration 052 crée :
ADD COLUMN IF NOT EXISTS weight NUMERIC CHECK (weight >= 0);

-- Migration 063 essaie de :
ALTER COLUMN weight SET NOT NULL;
```
Si des listings existent avec `weight = NULL`, cette commande échouera.

**Solution :** La migration 63 gère déjà ce cas avec un UPDATE avant le SET NOT NULL, mais il faut s'assurer que tous les cas sont couverts.

---

### 6. Migration 063 - `uniformize_marketplace_batch_support.sql`

**Problèmes identifiés :**

#### 6.1 Contrainte `check_batch_listing`
```sql
-- Migration 52 crée :
ADD CONSTRAINT check_batch_listing CHECK (...);

-- Migration 63 fait :
DROP CONSTRAINT IF EXISTS check_batch_listing;
ADD CONSTRAINT check_batch_listing CHECK (...);
```
✅ **OK** - La migration 63 gère correctement le DROP avant recréation.

#### 6.2 Colonne `weight` NOT NULL
```sql
-- Migration 63 :
ALTER COLUMN weight SET NOT NULL;
```
⚠️ **Problème :** Si des listings existent avec `weight = NULL` et que l'UPDATE ne les couvre pas tous, cela échouera.

**Solution actuelle :** La migration 63 fait un UPDATE avant, mais il faut vérifier que tous les cas sont couverts.

#### 6.3 Colonnes `batch_pigs` et `batches`
```sql
ADD COLUMN IF NOT EXISTS marketplace_status ...
```
✅ **OK** - Utilise `IF NOT EXISTS`.

#### 6.4 Trigger `update_batch_marketplace_status`
```sql
DROP TRIGGER IF EXISTS trigger_sync_batch_marketplace_status ON batch_pigs;
CREATE TRIGGER trigger_sync_batch_marketplace_status ...
```
✅ **OK** - Gère correctement le DROP avant création.

#### 6.5 Vue enrichie
```sql
CREATE OR REPLACE VIEW v_marketplace_listings_enriched AS ...
```
✅ **OK** - Utilise `CREATE OR REPLACE`.

---

## 🔧 Corrections recommandées

### Correction 1 : Migration 038 - Contradiction user_id

**Fichier :** `backend/database/migrations/038_create_transactions_table.sql`

**Ligne problématique :**
```sql
user_id TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
```

**Correction :**
```sql
user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
```

**Raison :** Si un utilisateur est supprimé, ses transactions doivent être supprimées aussi (CASCADE) ou l'utilisateur doit être rendu nullable. `NOT NULL` + `SET NULL` est impossible.

---

### Correction 2 : Migration 036, 037 - Triggers sans IF NOT EXISTS

**Fichiers :** 
- `backend/database/migrations/036_create_subscription_plans_table.sql`
- `backend/database/migrations/037_create_user_subscriptions_table.sql`

**Problème :** Les triggers sont créés sans vérification d'existence.

**Correction :**
```sql
-- Avant
CREATE TRIGGER trigger_update_subscription_plans_updated_at ...

-- Après
DROP TRIGGER IF EXISTS trigger_update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER trigger_update_subscription_plans_updated_at ...
```

---

### Correction 3 : Migration 038 - Trigger sans IF NOT EXISTS

**Fichier :** `backend/database/migrations/038_create_transactions_table.sql`

**Correction :**
```sql
DROP TRIGGER IF EXISTS trigger_update_transactions_updated_at ON transactions;
CREATE TRIGGER trigger_update_transactions_updated_at ...
```

---

### Correction 4 : Migration 045 - Triggers sans DROP IF EXISTS

**Fichier :** `backend/database/migrations/045_create_batch_pigs_tables.sql`

**Correction :**
```sql
-- Avant
CREATE TRIGGER trigger_update_batch_counts ...

-- Après
DROP TRIGGER IF EXISTS trigger_update_batch_counts ON batch_pigs;
CREATE TRIGGER trigger_update_batch_counts ...

DROP TRIGGER IF EXISTS trigger_update_batch_weight ON batch_pigs;
CREATE TRIGGER trigger_update_batch_weight ...
```

---

### Correction 5 : Migration 063 - Vérification complète de weight

**Fichier :** `backend/database/migrations/063_uniformize_marketplace_batch_support.sql`

**Amélioration :** S'assurer que TOUS les listings ont un weight avant de rendre la colonne NOT NULL.

**Correction :**
```sql
-- Avant le SET NOT NULL, vérifier qu'il n'y a plus de NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM marketplace_listings WHERE weight IS NULL) THEN
    RAISE EXCEPTION 'Il reste des listings avec weight NULL. Veuillez les corriger manuellement.';
  END IF;
END $$;
```

---

## 📋 Checklist de vérification

Pour chaque migration problématique :

- [ ] **Migration 036** : Ajouter DROP TRIGGER IF EXISTS
- [ ] **Migration 037** : Ajouter DROP TRIGGER IF EXISTS
- [ ] **Migration 038** : 
  - [ ] Corriger la contradiction `user_id NOT NULL` + `ON DELETE SET NULL`
  - [ ] Ajouter DROP TRIGGER IF EXISTS
- [ ] **Migration 045** : Ajouter DROP TRIGGER IF EXISTS pour les deux triggers
- [ ] **Migration 052** : Aucune correction nécessaire (gérée par 063)
- [ ] **Migration 063** : 
  - [ ] Ajouter vérification que tous les weight sont remplis avant SET NOT NULL
  - [ ] Tester avec des données existantes

---

## 🧪 Tests recommandés

1. **Test de réexécution :** Exécuter chaque migration deux fois pour vérifier l'idempotence
2. **Test avec données existantes :** Tester avec des listings ayant `weight = NULL`
3. **Test de suppression :** Vérifier que les CASCADE fonctionnent correctement
4. **Test des triggers :** Vérifier que les triggers ne sont pas dupliqués

---

## 🚨 Problèmes critiques

### Critique 1 : Migration 038 - Contradiction user_id
**Impact :** Échec de la migration si un utilisateur est supprimé
**Priorité :** 🔴 HAUTE
**Action :** Corriger immédiatement

### Critique 2 : Migration 063 - weight NOT NULL
**Impact :** Échec si des listings existent avec weight NULL
**Priorité :** 🟡 MOYENNE
**Action :** Vérifier que l'UPDATE couvre tous les cas

---

## 📝 Notes

- Les migrations 36, 37, 38 sont marquées "Déjà appliquées" dans les logs, ce qui suggère qu'elles ont été exécutées partiellement ou qu'il y a eu des erreurs silencieuses.
- La migration 45 est aussi marquée "Déjà appliquée", ce qui est normal si les tables existent déjà.
- La migration 52 est marquée "Déjà appliquée", ce qui est normal.
- La migration 63 a été appliquée avec succès après correction.

---

**Date d'analyse :** 2026-01-02  
**Version :** 1.0.0

