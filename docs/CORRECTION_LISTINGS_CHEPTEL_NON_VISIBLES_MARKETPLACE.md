# Correction : Listings créés depuis le cheptel n'apparaissent pas dans le marketplace

## Problème identifié

Les sujets mis en vente depuis le cheptel (liste des animaux) n'apparaissaient pas dans le marketplace. Le problème était dû à plusieurs causes potentielles :

1. **Colonnes manquantes** : L'INSERT tentait d'insérer dans des colonnes (`listing_type`, `weight`, `pig_count`, `pig_ids`) qui n'existent peut-être pas si la migration 052 n'a pas été exécutée
2. **Mapping fragile** : Le mapping `mapRowToListing` dans `marketplace-unified.service.ts` n'était pas robuste face aux colonnes manquantes ou NULL
3. **Gestion d'erreurs insuffisante** : Aucune vérification des colonnes existantes avant l'INSERT

## Solutions appliquées

### 1. INSERT dynamique selon les colonnes disponibles

**Fichier** : `backend/src/marketplace/marketplace-unified.service.ts` (méthode `createIndividualListing`)

**Avant :**
```typescript
// INSERT avec toutes les colonnes (échoue si certaines n'existent pas)
const result = await client.query(
  `INSERT INTO marketplace_listings (
    id, listing_type, subject_id, producer_id, farm_id, 
    price_per_kg, weight, calculated_price, pig_count,
    ...
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ...)
  RETURNING *`,
  [...]
);
```

**Après :**
```typescript
// Vérifier quelles colonnes existent
const columnsCheck = await client.query(
  `SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'marketplace_listings' 
   AND column_name IN ('weight', 'listing_type', 'batch_id', 'pig_ids', 'pig_count')`
);
const existingColumns = columnsCheck.rows.map((r) => r.column_name);
const hasWeight = existingColumns.includes('weight');
const hasListingType = existingColumns.includes('listing_type');
// ... etc

// Construire la requête INSERT dynamiquement
let insertColumns: string[] = [
  'id', 'subject_id', 'producer_id', 'farm_id', 'price_per_kg', 
  'calculated_price', 'status', 'listed_at', 'updated_at', 
  'last_weight_date', 'location_latitude', 'location_longitude', 
  'location_address', 'location_city', 'location_region',
  'sale_terms', 'views', 'inquiries', 'date_creation', 'derniere_modification'
];
let insertValues: any[] = [...];

// Ajouter les colonnes optionnelles si elles existent
if (hasListingType) {
  insertColumns.push('listing_type');
  insertValues.push('individual');
}
if (hasWeight) {
  insertColumns.push('weight');
  insertValues.push(weight);
}
// ... etc

const result = await client.query(
  `INSERT INTO marketplace_listings (${columnsStr}) VALUES (${placeholders}) RETURNING *`,
  insertValues
);
```

### 2. Amélioration du mapping `mapRowToListing`

**Fichier** : `backend/src/marketplace/marketplace-unified.service.ts` (méthode `mapRowToListing`)

**Changements :**
- Ajout de fonctions helper `safeJsonParse`, `safeParseFloat`, `safeParseDate` pour gérer les valeurs NULL ou invalides
- Gestion du cas où `listing_type` est NULL (par défaut 'individual')
- Gestion robuste des colonnes optionnelles (`weight`, `pig_count`, `pig_ids`)
- Alignement avec le mapping de `marketplace.service.ts` pour la cohérence

**Avant :**
```typescript
weight: parseFloat(row.weight), // Peut retourner NaN si weight est undefined
listingType: row.listing_type, // Peut être undefined
```

**Après :**
```typescript
weight: safeParseFloat(row.weight), // Retourne undefined si invalide
listingType: row.listing_type || 'individual', // Par défaut 'individual'
```

## Impact

- **Avant** : 
  - Les listings créés depuis le cheptel pouvaient échouer silencieusement si des colonnes manquaient
  - Les listings créés n'apparaissaient pas dans le marketplace si le mapping échouait
  - Erreurs potentielles si `weight` ou `listing_type` étaient NULL

- **Après** :
  - Les listings sont créés avec succès même si certaines colonnes optionnelles n'existent pas
  - Le mapping est robuste et gère correctement les valeurs NULL ou manquantes
  - Les listings individuels sont correctement identifiés (avec ou sans `listing_type`)
  - Compatibilité avec les anciennes installations (avant migration 052)

## Fichiers modifiés

- `backend/src/marketplace/marketplace-unified.service.ts` :
  - Méthode `createIndividualListing` : INSERT dynamique selon colonnes disponibles
  - Méthode `mapRowToListing` : Mapping robuste avec gestion des valeurs NULL

## Tests recommandés

1. **Test avec migration 052 exécutée** :
   - Créer un listing depuis le cheptel
   - Vérifier qu'il apparaît dans le marketplace
   - Vérifier que `listing_type = 'individual'` est défini

2. **Test sans migration 052** (compatibilité) :
   - Créer un listing depuis le cheptel
   - Vérifier qu'il est créé avec succès (sans colonnes optionnelles)
   - Vérifier qu'il apparaît dans le marketplace avec `listingType = 'individual'` par défaut

3. **Test de récupération** :
   - Vérifier que `GET /marketplace/listings` retourne bien les listings créés
   - Vérifier que le mapping fonctionne correctement pour tous les champs

## Notes

- La migration 052 (`052_add_batch_support_to_marketplace_listings.sql`) ajoute les colonnes `listing_type`, `weight`, `pig_count`, `pig_ids`, `batch_id`
- Si cette migration n'a pas été exécutée, les listings sont créés sans ces colonnes mais fonctionnent toujours
- Le mapping gère automatiquement les deux cas (avec ou sans colonnes optionnelles)
- Les listings individuels sont identifiés par `listing_type = 'individual'` ou par l'absence de `listing_type` (anciens listings)

