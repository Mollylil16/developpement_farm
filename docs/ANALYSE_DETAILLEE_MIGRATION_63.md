# Analyse Détaillée - Problèmes Potentiels Migration 63

## 🔍 Problèmes identifiés

### Problème 1 : Contrainte FK ajoutée sans vérification

**Ligne 21-25 :**
```sql
ALTER TABLE batch_pigs
  ADD CONSTRAINT fk_batch_pigs_marketplace_listing 
    FOREIGN KEY (marketplace_listing_id) 
    REFERENCES marketplace_listings(id) 
    ON DELETE SET NULL;
```

**Problème :** Si la contrainte existe déjà, cela échouera avec une erreur.

**Solution :** Ajouter `DROP CONSTRAINT IF EXISTS` avant.

---

### Problème 2 : UPDATE sur colonnes qui pourraient ne pas exister

**Lignes 131-184 :** Plusieurs UPDATE utilisent `listing_type`, `pig_ids`, `pig_count`, `weight`

**Problème :** Même si on crée les colonnes dans le DO $$ block, si une erreur survient, les UPDATE suivants échoueront.

**Solution :** Vérifier l'existence des colonnes avant chaque UPDATE, ou s'assurer que le DO $$ block s'exécute complètement.

---

### Problème 3 : Sous-requête dans UPDATE peut retourner NULL

**Ligne 152-157 :**
```sql
UPDATE marketplace_listings
SET pig_count = COALESCE(
  (SELECT COUNT(*) FROM batch_pigs WHERE batch_id = marketplace_listings.batch_id),
  1
)
WHERE listing_type = 'batch' AND (pig_count IS NULL OR pig_count = 0);
```

**Problème :** Si `batch_id` est NULL ou invalide, la sous-requête retourne 0 (pas NULL), donc COALESCE ne fonctionne pas comme prévu.

**Solution :** Vérifier que `batch_id` est valide avant.

---

### Problème 4 : Vérification des données invalides sans correction automatique

**Lignes 211-244 :** Le code vérifie les données invalides mais ne les corrige pas, seulement un WARNING.

**Problème :** Si des données invalides existent, les contraintes échoueront quand même.

**Solution :** Corriger automatiquement les données invalides détectées.

---

### Problème 5 : jsonb_array_length peut échouer

**Ligne 259 :**
```sql
jsonb_array_length(pig_ids) <= pig_count
```

**Problème :** Si `pig_ids` n'est pas un array JSONB valide (ex: string, number, object), `jsonb_array_length` échouera.

**Solution :** Vérifier que `pig_ids` est un array avant d'appeler `jsonb_array_length`.

---

### Problème 6 : Index avec WHERE clause sur colonne qui pourrait ne pas exister

**Ligne 331-333 :**
```sql
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_type_status 
  ON marketplace_listings(listing_type, status, listed_at DESC)
  WHERE status = 'available';
```

**Problème :** Si la colonne `status` ou `listed_at` n'existe pas, l'index échouera.

**Solution :** Vérifier l'existence des colonnes avant de créer l'index.

---

### Problème 7 : Vue enrichie utilise des colonnes qui pourraient ne pas exister

**Lignes 350-389 :** La vue utilise `listing_type`, `subject_id`, `batch_id`, `pig_count`, `weight`

**Problème :** Si ces colonnes n'existent pas, la création de la vue échouera.

**Solution :** Vérifier l'existence des colonnes ou utiliser des expressions conditionnelles.

---

### Problème 8 : UPDATE sur batch_pigs avant que les colonnes existent

**Ligne 16-18 :**
```sql
UPDATE batch_pigs 
SET marketplace_status = 'not_listed' 
WHERE marketplace_status IS NULL;
```

**Problème :** Si la colonne `marketplace_status` vient d'être créée et qu'il y a beaucoup de lignes, cela peut être lent. Mais plus important : si la colonne n'a pas été créée (erreur dans ADD COLUMN), cela échouera.

**Solution :** Vérifier que la colonne existe avant l'UPDATE.

---

### Problème 9 : UPDATE sur batches avant que les colonnes existent

**Ligne 50-52 :** Même problème que ci-dessus.

---

### Problème 10 : Contrainte CHECK ajoutée sans vérifier les données existantes

**Ligne 247-252 :** La contrainte est ajoutée après vérification, mais si des données invalides persistent (non corrigées), l'ajout échouera.

**Solution :** Corriger automatiquement toutes les données invalides avant d'ajouter la contrainte.

---

### Problème 11 : EXTRACT(DAY FROM ...) dans la vue peut échouer

**Ligne 360 :**
```sql
'age_jours', EXTRACT(DAY FROM (CURRENT_DATE - pa.date_naissance))
```

**Problème :** Si `date_naissance` est NULL, le calcul échouera ou retournera NULL.

**Solution :** Gérer le cas NULL avec COALESCE.

---

### Problème 12 : Multiplication dans la vue peut échouer

**Ligne 371 :**
```sql
'total_weight_kg', ml.pig_count * ml.weight,
```

**Problème :** Si `pig_count` ou `weight` est NULL, le résultat sera NULL.

**Solution :** Utiliser COALESCE pour gérer les NULL.

---

## 🔧 Corrections nécessaires

### Correction 1 : Contrainte FK avec DROP IF EXISTS

### Correction 2 : Vérifications avant UPDATE

### Correction 3 : Correction automatique des données invalides

### Correction 4 : Gestion des erreurs jsonb_array_length

### Correction 5 : Vérifications avant création d'index

### Correction 6 : Vérifications avant création de vue

### Correction 7 : Gestion des NULL dans la vue

---

**Date d'analyse :** 2026-01-02

