# Analyse des Conflits entre Migrations 52 et 63

## 🔍 Problèmes identifiés

### Problème 1 : Dépendance de la colonne `weight`

**Migration 52 :**
```sql
ADD COLUMN IF NOT EXISTS weight NUMERIC CHECK (weight >= 0);
```

**Migration 63 :**
```sql
-- Vérifie si weight existe
IF NOT EXISTS (SELECT 1 FROM ... WHERE column_name = 'weight') THEN
  ADD COLUMN weight NUMERIC CHECK (weight >= 0);
END IF;

-- Puis essaie de mettre à jour
UPDATE marketplace_listings SET weight = ... WHERE weight IS NULL AND listing_type = 'individual';
```

**Problème :** Si la migration 52 n'a pas été appliquée, la colonne `weight` n'existe pas, mais la migration 63 essaie quand même de faire un UPDATE dessus (même si elle la crée avant).

**Impact :** Si la migration 52 échoue partiellement, la migration 63 pourrait échouer aussi.

---

### Problème 2 : Dépendance de la colonne `listing_type`

**Migration 52 :**
```sql
ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'individual' CHECK (...);
```

**Migration 63 :**
```sql
UPDATE marketplace_listings SET weight = ... WHERE weight IS NULL AND listing_type = 'individual';
UPDATE marketplace_listings ml SET weight = ... WHERE weight IS NULL AND listing_type = 'batch';
```

**Problème :** Si la migration 52 n'a pas été appliquée, `listing_type` n'existe pas, et les UPDATE de la migration 63 échoueront.

**Impact :** Erreur SQL si la migration 52 n'est pas appliquée avant la 63.

---

### Problème 3 : Contrainte `check_batch_listing` modifiée

**Migration 52 :**
```sql
ADD CONSTRAINT check_batch_listing CHECK (
  (listing_type = 'individual' AND subject_id IS NOT NULL AND batch_id IS NULL) OR
  (listing_type = 'batch' AND batch_id IS NOT NULL)
);
```

**Migration 63 :**
```sql
DROP CONSTRAINT IF EXISTS check_batch_listing;
ADD CONSTRAINT check_batch_listing CHECK (
  (listing_type = 'individual' AND subject_id IS NOT NULL AND batch_id IS NULL AND pig_ids = '[]'::jsonb) OR
  (listing_type = 'batch' AND batch_id IS NOT NULL AND subject_id IS NULL AND pig_count > 0)
);
```

**Problème :** La nouvelle contrainte est plus stricte. Si des listings existent qui respectent l'ancienne contrainte mais pas la nouvelle, le DROP/ADD échouera.

**Exemple de conflit :**
- Listing individuel avec `pig_ids = NULL` (au lieu de `'[]'::jsonb`)
- Listing batch avec `pig_count = 0` (au lieu de `> 0`)

**Impact :** Échec de la migration 63 si des données existantes ne respectent pas la nouvelle contrainte.

---

### Problème 4 : Colonne `weight` rendue NOT NULL

**Migration 52 :** Crée `weight` comme nullable  
**Migration 63 :** Essaie de rendre `weight NOT NULL`

**Problème :** Si des listings existent avec `weight = NULL` et que l'UPDATE ne les couvre pas tous, le `SET NOT NULL` échouera.

**Cas non couverts :**
- Listings avec `listing_type = NULL` (si migration 52 partielle)
- Listings avec `listing_type` différent de 'individual' ou 'batch'
- Listings sans `subject_id` ni `batch_id` (données corrompues)

**Impact :** Échec de la migration 63 si tous les NULL ne sont pas remplis.

---

### Problème 5 : Contrainte `check_batch_pig_count` ajoutée

**Migration 63 :**
```sql
ADD CONSTRAINT check_batch_pig_count CHECK (
  listing_type != 'batch' OR 
  (pig_count > 0 AND (pig_ids IS NOT NULL AND jsonb_array_length(pig_ids) <= pig_count))
);
```

**Problème :** Si des listings batch existent avec :
- `pig_count = 0`
- `pig_ids = NULL`
- `jsonb_array_length(pig_ids) > pig_count`

La contrainte ne pourra pas être ajoutée.

**Impact :** Échec de la migration 63 si des données invalides existent.

---

## 🔧 Solutions proposées

### Solution 1 : Rendre la migration 63 indépendante de la migration 52

**Stratégie :** Vérifier l'existence de toutes les colonnes nécessaires avant de les utiliser.

```sql
-- Vérifier que listing_type existe, sinon le créer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketplace_listings' AND column_name = 'listing_type'
  ) THEN
    ALTER TABLE marketplace_listings
      ADD COLUMN listing_type TEXT DEFAULT 'individual' CHECK (listing_type IN ('individual', 'batch'));
  END IF;
END $$;
```

---

### Solution 2 : Corriger les données avant d'ajouter les contraintes

**Stratégie :** Nettoyer toutes les données invalides avant d'ajouter les contraintes strictes.

```sql
-- Avant d'ajouter check_batch_listing
-- Corriger les pig_ids NULL pour les listings individuels
UPDATE marketplace_listings
SET pig_ids = '[]'::jsonb
WHERE listing_type = 'individual' AND (pig_ids IS NULL OR pig_ids = 'null'::jsonb);

-- Corriger les pig_count pour les listings individuels
UPDATE marketplace_listings
SET pig_count = 1
WHERE listing_type = 'individual' AND pig_count != 1;

-- Corriger les listings batch avec pig_count = 0
UPDATE marketplace_listings
SET pig_count = 1
WHERE listing_type = 'batch' AND (pig_count IS NULL OR pig_count = 0);
```

---

### Solution 3 : Gérer tous les cas de weight NULL

**Stratégie :** Couvrir TOUS les cas possibles avant de rendre NOT NULL.

```sql
-- Cas 1 : Listings individuels
UPDATE marketplace_listings
SET weight = COALESCE(
  (SELECT poids_kg FROM production_pesees 
   WHERE animal_id = marketplace_listings.subject_id 
   ORDER BY date DESC LIMIT 1),
  50.0
)
WHERE weight IS NULL AND listing_type = 'individual';

-- Cas 2 : Listings batch
UPDATE marketplace_listings ml
SET weight = COALESCE(
  (SELECT average_weight_kg FROM batches WHERE id = ml.batch_id),
  50.0
)
WHERE weight IS NULL AND listing_type = 'batch';

-- Cas 3 : Listings sans type défini (fallback)
UPDATE marketplace_listings
SET weight = 50.0
WHERE weight IS NULL AND (listing_type IS NULL OR listing_type NOT IN ('individual', 'batch'));

-- Cas 4 : Listings avec listing_type NULL (mettre à jour le type aussi)
UPDATE marketplace_listings
SET listing_type = CASE 
  WHEN subject_id IS NOT NULL THEN 'individual'
  WHEN batch_id IS NOT NULL THEN 'batch'
  ELSE 'individual' -- Fallback
END,
weight = COALESCE(weight, 50.0)
WHERE listing_type IS NULL;
```

---

### Solution 4 : Ajouter les contraintes de manière idempotente

**Stratégie :** DROP les contraintes avant de les recréer, et gérer les erreurs.

```sql
-- DROP les contraintes existantes
ALTER TABLE marketplace_listings
  DROP CONSTRAINT IF EXISTS check_batch_listing,
  DROP CONSTRAINT IF EXISTS check_batch_pig_count;

-- Corriger les données avant d'ajouter les contraintes
-- (voir Solution 2)

-- Ajouter les contraintes
ALTER TABLE marketplace_listings
  ADD CONSTRAINT check_batch_listing CHECK (...);

ALTER TABLE marketplace_listings
  ADD CONSTRAINT check_batch_pig_count CHECK (...);
```

---

## 📋 Plan de correction

1. ✅ Rendre la migration 63 indépendante (vérifier existence des colonnes)
2. ✅ Corriger toutes les données invalides avant d'ajouter les contraintes
3. ✅ Gérer tous les cas de weight NULL
4. ✅ Ajouter les contraintes de manière idempotente

---

**Date d'analyse :** 2026-01-02  
**Version :** 1.0.0

