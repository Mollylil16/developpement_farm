# Corrections Finales - Migration 63

## 🔧 Problèmes corrigés

### ✅ Correction 1 : Contrainte FK avec DROP IF EXISTS

**Avant :**
```sql
ALTER TABLE batch_pigs
  ADD CONSTRAINT fk_batch_pigs_marketplace_listing ...
```

**Après :**
```sql
ALTER TABLE batch_pigs
  DROP CONSTRAINT IF EXISTS fk_batch_pigs_marketplace_listing;

ALTER TABLE batch_pigs
  ADD CONSTRAINT fk_batch_pigs_marketplace_listing ...
```

**Statut :** ✅ Corrigé

---

### ✅ Correction 2 : Vérification avant UPDATE sur batch_pigs

**Avant :**
```sql
UPDATE batch_pigs 
SET marketplace_status = 'not_listed' 
WHERE marketplace_status IS NULL;
```

**Après :**
```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'batch_pigs' AND column_name = 'marketplace_status'
  ) THEN
    UPDATE batch_pigs 
    SET marketplace_status = 'not_listed' 
    WHERE marketplace_status IS NULL;
  END IF;
END $$;
```

**Statut :** ✅ Corrigé

---

### ✅ Correction 3 : Vérification avant UPDATE sur batches

**Avant :**
```sql
UPDATE batches 
SET marketplace_status = 'not_listed', marketplace_listed_count = 0
WHERE marketplace_status IS NULL;
```

**Après :**
```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'batches' AND column_name = 'marketplace_status'
  ) THEN
    UPDATE batches 
    SET marketplace_status = 'not_listed', marketplace_listed_count = 0
    WHERE marketplace_status IS NULL;
  END IF;
END $$;
```

**Statut :** ✅ Corrigé

---

### ✅ Correction 4 : Amélioration de la correction de pig_count pour batch

**Avant :**
```sql
UPDATE marketplace_listings
SET pig_count = COALESCE(
  (SELECT COUNT(*) FROM batch_pigs WHERE batch_id = marketplace_listings.batch_id),
  1
)
WHERE listing_type = 'batch' AND (pig_count IS NULL OR pig_count = 0);
```

**Après :**
```sql
UPDATE marketplace_listings
SET pig_count = CASE
  WHEN batch_id IS NOT NULL AND EXISTS (SELECT 1 FROM batches WHERE id = marketplace_listings.batch_id) THEN
    COALESCE(
      (SELECT COUNT(*) FROM batch_pigs WHERE batch_id = marketplace_listings.batch_id),
      1
    )
  ELSE 1
END
WHERE listing_type = 'batch' AND (pig_count IS NULL OR pig_count = 0);
```

**Statut :** ✅ Corrigé - Vérifie que batch_id est valide avant la sous-requête

---

### ✅ Correction 5 : Correction automatique des données invalides

**Avant :** Vérification avec WARNING mais pas de correction

**Après :** Correction automatique intelligente :
- Listings individuels avec `subject_id` valide : correction de `batch_id`, `pig_ids`, `pig_count`
- Listings individuels sans `subject_id` : marqués comme `removed`
- Listings batch avec `batch_id` valide : correction de `subject_id`, `pig_count`
- Listings batch sans `batch_id` valide : marqués comme `removed`

**Statut :** ✅ Corrigé

---

### ✅ Correction 6 : Gestion de jsonb_array_length avec vérification de type

**Avant :**
```sql
CHECK (
  listing_type != 'batch' OR 
  (pig_count > 0 AND (pig_ids IS NULL OR jsonb_array_length(pig_ids) <= pig_count))
);
```

**Après :**
```sql
CHECK (
  listing_type != 'batch' OR 
  (pig_count > 0 AND (
    pig_ids IS NULL OR 
    (jsonb_typeof(pig_ids) = 'array' AND jsonb_array_length(pig_ids) <= pig_count)
  ))
);
```

**Statut :** ✅ Corrigé - Vérifie que `pig_ids` est un array avant d'appeler `jsonb_array_length`

---

### ✅ Correction 7 : Vérification complète des colonnes pour les index

**Avant :**
```sql
IF EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'marketplace_listings' 
    AND column_name IN ('listing_type', 'status', 'listed_at')
) THEN
```

**Problème :** Vérifie seulement qu'au moins une colonne existe, pas toutes.

**Après :**
```sql
SELECT COUNT(*) = 3 INTO cols_exist
FROM information_schema.columns 
WHERE table_name = 'marketplace_listings' 
  AND column_name IN ('listing_type', 'status', 'listed_at');

IF cols_exist THEN
```

**Statut :** ✅ Corrigé - Vérifie que TOUTES les colonnes existent

---

### ✅ Correction 8 : Création de vue avec vérification complète des colonnes

**Avant :** Vérification partielle des colonnes

**Après :** Vérification que TOUTES les colonnes requises existent avant de créer la vue :
```sql
DECLARE
  required_columns TEXT[] := ARRAY['listing_type', 'subject_id', 'batch_id', 'pig_count', 'weight', 'producer_id', 'status'];
  missing_columns TEXT[];
BEGIN
  -- Vérifier que toutes les colonnes requises existent
  SELECT ARRAY_AGG(col) INTO missing_columns
  FROM unnest(required_columns) AS col
  WHERE NOT EXISTS (...);

  IF missing_columns IS NULL OR array_length(missing_columns, 1) IS NULL THEN
    -- Créer la vue
  ELSE
    RAISE WARNING 'Colonnes manquantes: %', array_to_string(missing_columns, ', ');
  END IF;
END;
```

**Statut :** ✅ Corrigé

---

### ✅ Correction 9 : Gestion des NULL dans la vue

**Avant :**
```sql
'age_jours', EXTRACT(DAY FROM (CURRENT_DATE - pa.date_naissance))
'total_weight_kg', ml.pig_count * ml.weight,
```

**Après :**
```sql
'age_jours', COALESCE(EXTRACT(DAY FROM (CURRENT_DATE - pa.date_naissance))::INTEGER, 0)
'total_weight_kg', COALESCE(ml.pig_count, 0) * COALESCE(ml.weight, 0),
```

**Statut :** ✅ Corrigé - Gère les NULL avec COALESCE

---

## 📊 Résumé des corrections

| # | Problème | Correction | Statut |
|---|----------|------------|--------|
| 1 | Contrainte FK sans DROP | Ajouté `DROP CONSTRAINT IF EXISTS` | ✅ |
| 2 | UPDATE sans vérification colonne | Vérification avant UPDATE | ✅ |
| 3 | UPDATE batches sans vérification | Vérification avant UPDATE | ✅ |
| 4 | Sous-requête sans validation | Validation de batch_id avant sous-requête | ✅ |
| 5 | Données invalides non corrigées | Correction automatique intelligente | ✅ |
| 6 | jsonb_array_length sans vérification | Vérification de type avec jsonb_typeof | ✅ |
| 7 | Vérification partielle colonnes index | Vérification complète (COUNT = N) | ✅ |
| 8 | Vérification partielle colonnes vue | Vérification complète avec array | ✅ |
| 9 | NULL non gérés dans vue | COALESCE pour tous les calculs | ✅ |

**Total :** 9 problèmes corrigés

---

## ✅ Validation finale

La migration 63 est maintenant :
- ✅ **Robuste** : Vérifie l'existence de toutes les colonnes avant utilisation
- ✅ **Idempotente** : Peut être réexécutée sans erreur
- ✅ **Intelligente** : Corrige automatiquement les données invalides
- ✅ **Sécurisée** : Gère tous les cas NULL et erreurs potentielles
- ✅ **Complète** : Vérifie que TOUTES les colonnes nécessaires existent

---

**Date de correction :** 2026-01-02  
**Version :** 2.0.0

