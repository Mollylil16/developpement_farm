# Corrections Appliquées aux Migrations

## ✅ Corrections effectuées

### 1. Migration 036 - `create_subscription_plans_table.sql`

**Problème :** Trigger créé sans DROP IF EXISTS  
**Correction :** Ajout de `DROP TRIGGER IF EXISTS` avant la création

```sql
-- Avant
CREATE TRIGGER trigger_update_subscription_plans_updated_at ...

-- Après
DROP TRIGGER IF EXISTS trigger_update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER trigger_update_subscription_plans_updated_at ...
```

**Statut :** ✅ Corrigé

---

### 2. Migration 037 - `create_user_subscriptions_table.sql`

**Problème :** Trigger créé sans DROP IF EXISTS  
**Correction :** Ajout de `DROP TRIGGER IF EXISTS` avant la création

```sql
-- Avant
CREATE TRIGGER trigger_update_user_subscriptions_updated_at ...

-- Après
DROP TRIGGER IF EXISTS trigger_update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER trigger_update_user_subscriptions_updated_at ...
```

**Statut :** ✅ Corrigé

---

### 3. Migration 038 - `create_transactions_table.sql`

**Problème 1 :** Contradiction `user_id NOT NULL` + `ON DELETE SET NULL`  
**Correction :** Changé en `ON DELETE CASCADE`

```sql
-- Avant
user_id TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,

-- Après
user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
```

**Problème 2 :** Trigger créé sans DROP IF EXISTS  
**Correction :** Ajout de `DROP TRIGGER IF EXISTS` avant la création

```sql
-- Avant
CREATE TRIGGER trigger_update_transactions_updated_at ...

-- Après
DROP TRIGGER IF EXISTS trigger_update_transactions_updated_at ON transactions;
CREATE TRIGGER trigger_update_transactions_updated_at ...
```

**Statut :** ✅ Corrigé (2 problèmes)

---

### 4. Migration 045 - `create_batch_pigs_tables.sql`

**Problème :** Triggers créés sans DROP IF EXISTS  
**Correction :** Ajout de `DROP TRIGGER IF EXISTS` avant chaque création

```sql
-- Avant
CREATE TRIGGER trigger_update_batch_counts ...
CREATE TRIGGER trigger_update_batch_weight ...

-- Après
DROP TRIGGER IF EXISTS trigger_update_batch_counts ON batch_pigs;
CREATE TRIGGER trigger_update_batch_counts ...

DROP TRIGGER IF EXISTS trigger_update_batch_weight ON batch_pigs;
CREATE TRIGGER trigger_update_batch_weight ...
```

**Statut :** ✅ Corrigé (2 triggers)

---

### 5. Migration 052 - `add_batch_support_to_marketplace_listings.sql`

**Problème :** Aucun problème identifié  
**Statut :** ✅ Aucune correction nécessaire

---

### 6. Migration 063 - `uniformize_marketplace_batch_support.sql`

**Problème :** Ordre incorrect - `SET NOT NULL` avant UPDATE des valeurs NULL  
**Correction :** Réorganisation de l'ordre + ajout d'une vérification

```sql
-- Avant (INCORRECT)
ALTER TABLE marketplace_listings ALTER COLUMN weight SET NOT NULL;
UPDATE marketplace_listings SET weight = ... WHERE weight IS NULL;

-- Après (CORRECT)
-- 1. Mettre à jour tous les NULL
UPDATE marketplace_listings SET weight = ... WHERE weight IS NULL AND listing_type = 'individual';
UPDATE marketplace_listings ml SET weight = ... WHERE weight IS NULL AND listing_type = 'batch';

-- 2. Vérifier qu'il ne reste plus de NULL
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM marketplace_listings WHERE weight IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Il reste % listing(s) avec weight NULL.', null_count;
  END IF;
END $$;

-- 3. Rendre NOT NULL seulement après avoir rempli tous les NULL
ALTER TABLE marketplace_listings ALTER COLUMN weight SET NOT NULL;
```

**Statut :** ✅ Corrigé

---

## 📊 Résumé des corrections

| Migration | Problèmes | Corrections | Statut |
|-----------|-----------|-------------|--------|
| 036 | 1 (trigger) | 1 | ✅ |
| 037 | 1 (trigger) | 1 | ✅ |
| 038 | 2 (contradiction + trigger) | 2 | ✅ |
| 045 | 2 (triggers) | 2 | ✅ |
| 052 | 0 | 0 | ✅ |
| 063 | 1 (ordre) | 1 | ✅ |
| **TOTAL** | **7** | **7** | **✅** |

---

## 🧪 Tests recommandés

### Test 1 : Réexécution des migrations
```bash
npm run migrate
```
**Résultat attendu :** Toutes les migrations passent sans erreur, même si déjà appliquées.

### Test 2 : Vérification des triggers
```sql
-- Vérifier que les triggers existent
SELECT tgname FROM pg_trigger 
WHERE tgname IN (
  'trigger_update_subscription_plans_updated_at',
  'trigger_update_user_subscriptions_updated_at',
  'trigger_update_transactions_updated_at',
  'trigger_update_batch_counts',
  'trigger_update_batch_weight'
);
```
**Résultat attendu :** 5 triggers trouvés (pas de doublons).

### Test 3 : Vérification de la contrainte transactions.user_id
```sql
-- Vérifier la contrainte FK
SELECT 
  conname, 
  confdeltype 
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass 
  AND conname LIKE '%user_id%';
```
**Résultat attendu :** `confdeltype = 'c'` (CASCADE, pas 'n' pour SET NULL).

### Test 4 : Vérification de weight NOT NULL
```sql
-- Vérifier qu'il n'y a pas de NULL
SELECT COUNT(*) FROM marketplace_listings WHERE weight IS NULL;
```
**Résultat attendu :** 0

---

## 🚨 Points d'attention

### Migration 038 - Impact du changement CASCADE

**Avant :** `ON DELETE SET NULL` (impossible avec NOT NULL)  
**Après :** `ON DELETE CASCADE`

**Impact :** Si un utilisateur est supprimé, **toutes ses transactions seront supprimées** (au lieu d'être conservées avec user_id = NULL).

**Action requise :**
- Si vous voulez conserver l'historique des transactions même après suppression d'utilisateur, il faudrait rendre `user_id` nullable :
  ```sql
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ```
- Sinon, le comportement CASCADE est correct pour un système de facturation.

---

## ✅ Validation finale

Toutes les migrations sont maintenant :
- ✅ **Idempotentes** : Peuvent être réexécutées sans erreur
- ✅ **Sans contradictions** : Pas de conflits logiques (NOT NULL + SET NULL)
- ✅ **Robustes** : Gèrent les cas où les objets existent déjà
- ✅ **Ordre correct** : Les opérations sont dans le bon ordre

---

**Date de correction :** 2026-01-02  
**Version :** 1.0.0

