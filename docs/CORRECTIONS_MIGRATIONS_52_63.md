# Corrections des Migrations 52 et 63

## 🔧 Problèmes corrigés

### Migration 052 - `add_batch_support_to_marketplace_listings.sql`

#### Problème 1 : Contrainte `check_batch_listing` créée sans vérification
**Avant :**
```sql
ALTER TABLE marketplace_listings
  ADD CONSTRAINT check_batch_listing CHECK (...);
```

**Après :**
```sql
-- DROP la contrainte si elle existe déjà (pour éviter les conflits avec migration 63)
ALTER TABLE marketplace_listings
  DROP CONSTRAINT IF EXISTS check_batch_listing;

ALTER TABLE marketplace_listings
  ADD CONSTRAINT check_batch_listing CHECK (...);
```

#### Problème 2 : `subject_id` rendu nullable sans vérification
**Avant :**
```sql
ALTER TABLE marketplace_listings
  ALTER COLUMN subject_id DROP NOT NULL;
```

**Après :**
```sql
-- Vérifier si la colonne est déjà nullable avant de modifier
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketplace_listings' 
      AND column_name = 'subject_id' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE marketplace_listings
      ALTER COLUMN subject_id DROP NOT NULL;
  END IF;
END $$;
```

**Statut :** ✅ Corrigé

---

### Migration 063 - `uniformize_marketplace_batch_support.sql`

#### Problème 1 : Dépendance de la migration 52
**Avant :** La migration 63 supposait que toutes les colonnes de la migration 52 existaient déjà.

**Après :** Vérification et création de toutes les colonnes nécessaires si elles n'existent pas :
```sql
-- Vérifier et créer listing_type si nécessaire
IF NOT EXISTS (SELECT 1 FROM ... WHERE column_name = 'listing_type') THEN
  ALTER TABLE marketplace_listings ADD COLUMN listing_type ...;
END IF;

-- Même chose pour batch_id, pig_ids, pig_count, weight
```

**Statut :** ✅ Corrigé - Migration 63 maintenant indépendante

---

#### Problème 2 : Gestion incomplète des cas de `weight NULL`
**Avant :** Seulement 2 cas gérés (individual et batch)

**Après :** 7 cas gérés :
1. ✅ Listings avec `listing_type NULL` → Détermination automatique du type
2. ✅ Listings individuels avec `weight NULL` → Récupération depuis `production_pesees`
3. ✅ Listings batch avec `weight NULL` → Récupération depuis `batches.average_weight_kg`
4. ✅ Listings sans type valide → Fallback 50.0 kg
5. ✅ Listings individuels sans `subject_id` → Fallback 50.0 kg
6. ✅ Listings batch sans `batch_id` → Fallback 50.0 kg
7. ✅ Tous les autres cas → Fallback 50.0 kg

**Statut :** ✅ Corrigé

---

#### Problème 3 : Données invalides avant ajout de contraintes
**Avant :** Les contraintes étaient ajoutées sans vérifier que les données existantes les respectaient.

**Après :** Correction systématique de toutes les données invalides :
```sql
-- 1. Corriger listing_type NULL
-- 2. Corriger pig_ids NULL/invalides pour listings individuels
-- 3. Corriger pig_count pour listings individuels
-- 4. Corriger pig_count pour listings batch
-- 5-7. Corriger weight pour tous les cas
-- Puis ajouter les contraintes
```

**Statut :** ✅ Corrigé

---

#### Problème 4 : Contrainte `check_batch_listing` trop stricte
**Avant :**
```sql
CHECK (
  (listing_type = 'individual' AND ... AND pig_ids = '[]'::jsonb) OR
  (listing_type = 'batch' AND ... AND pig_count > 0)
);
```
Problème : `pig_ids = '[]'::jsonb` ne permet pas `pig_ids IS NULL`

**Après :**
```sql
CHECK (
  (listing_type = 'individual' AND ... AND (pig_ids = '[]'::jsonb OR pig_ids IS NULL)) OR
  (listing_type = 'batch' AND ... AND pig_count > 0)
);
```

**Statut :** ✅ Corrigé

---

#### Problème 5 : Doublon de correction des données
**Avant :** Les données étaient corrigées deux fois (au début et à la fin)

**Après :** Suppression de la section dupliquée à la fin

**Statut :** ✅ Corrigé

---

## 📊 Résumé des corrections

| Problème | Migration | Correction | Statut |
|----------|-----------|------------|--------|
| Contrainte sans DROP | 052 | Ajouté `DROP CONSTRAINT IF EXISTS` | ✅ |
| subject_id sans vérification | 052 | Vérification avant modification | ✅ |
| Dépendance migration 52 | 063 | Création conditionnelle des colonnes | ✅ |
| Cas weight NULL incomplets | 063 | 7 cas gérés au lieu de 2 | ✅ |
| Données invalides | 063 | Correction systématique avant contraintes | ✅ |
| Contrainte trop stricte | 063 | Accepte `pig_ids IS NULL` | ✅ |
| Doublon corrections | 063 | Section dupliquée supprimée | ✅ |

**Total :** 7 problèmes corrigés

---

## 🧪 Tests de validation

### Test 1 : Migration 52 seule
```bash
# Appliquer seulement la migration 52
psql -d farm_db -f 052_add_batch_support_to_marketplace_listings.sql
```
**Résultat attendu :** ✅ Succès

### Test 2 : Migration 63 seule (sans 52)
```bash
# Appliquer seulement la migration 63 (sans 52)
psql -d farm_db -f 063_uniformize_marketplace_batch_support.sql
```
**Résultat attendu :** ✅ Succès (crée les colonnes manquantes)

### Test 3 : Migration 52 puis 63
```bash
# Appliquer dans l'ordre
psql -d farm_db -f 052_add_batch_support_to_marketplace_listings.sql
psql -d farm_db -f 063_uniformize_marketplace_batch_support.sql
```
**Résultat attendu :** ✅ Succès (pas de conflit)

### Test 4 : Migration 63 puis 52 (ordre inverse)
```bash
# Appliquer dans l'ordre inverse
psql -d farm_db -f 063_uniformize_marketplace_batch_support.sql
psql -d farm_db -f 052_add_batch_support_to_marketplace_listings.sql
```
**Résultat attendu :** ✅ Succès (colonnes déjà créées, contrainte mise à jour)

### Test 5 : Réexécution multiple
```bash
# Appliquer plusieurs fois
npm run migrate
npm run migrate
npm run migrate
```
**Résultat attendu :** ✅ Succès à chaque fois (idempotence)

---

## ✅ Validation finale

Les migrations 52 et 63 sont maintenant :
- ✅ **Indépendantes** : La 63 peut s'exécuter sans la 52
- ✅ **Idempotentes** : Peuvent être réexécutées sans erreur
- ✅ **Robustes** : Gèrent tous les cas de données invalides
- ✅ **Compatibles** : Fonctionnent ensemble sans conflit
- ✅ **Sans doublons** : Pas de code dupliqué

---

**Date de correction :** 2026-01-02  
**Version :** 1.0.0

