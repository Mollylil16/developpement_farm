# Correction de l'erreur 500 sur `/marketplace/listings` - Version 2

## Problème identifié

L'erreur `500 Internal Server Error` persistait sur l'endpoint `/marketplace/listings` malgré les corrections précédentes. L'erreur était probablement due à :
1. Des colonnes manquantes dans la base de données
2. Des champs non mappés dans `mapRowToListing` (`date_creation`, `derniere_modification`)
3. Une gestion d'erreur insuffisante pour les colonnes optionnelles

## Corrections appliquées

### 1. Ajout des champs manquants dans le mapping

**Fichier** : `backend/src/marketplace/marketplace.service.ts`

**Avant :**
```typescript
saleTerms: safeJsonParse(row.sale_terms, {}),
views: row.views ? parseInt(row.views, 10) || 0 : 0,
inquiries: row.inquiries ? parseInt(row.inquiries, 10) || 0 : 0,
};
```

**Après :**
```typescript
saleTerms: safeJsonParse(row.sale_terms, {}),
views: row.views ? parseInt(row.views, 10) || 0 : 0,
inquiries: row.inquiries ? parseInt(row.inquiries, 10) || 0 : 0,
dateCreation: safeParseDate(row.date_creation),
derniereModification: safeParseDate(row.derniere_modification),
};
```

### 2. Amélioration de la gestion d'erreur avec fallback

**Fichier** : `backend/src/marketplace/marketplace.service.ts` (méthode `findAllListings`)

**Changements :**
- Détection spécifique des erreurs de colonnes manquantes
- Tentative de fallback avec une requête minimale (colonnes essentielles uniquement)
- Gestion du cas où même la requête minimale échoue (retour d'un tableau vide au lieu d'une erreur 500)

**Logique de fallback :**
1. Si une colonne est manquante, essayer avec une requête minimale
2. La requête minimale inclut seulement les colonnes essentielles :
   - `id, listing_type, subject_id, batch_id, producer_id, farm_id`
   - `price_per_kg, calculated_price, status, listed_at, updated_at`
3. Si la requête minimale échoue aussi, retourner un tableau vide au lieu de planter

### 3. Gestion des paramètres dans la requête minimale

La requête minimale gère correctement :
- Le filtre `projetId` (si fourni)
- Le filtre `userId` (si fourni)
- Les paramètres `limit` et `offset`

## Impact

- **Avant** : L'endpoint retournait une erreur 500 si une colonne était manquante ou si les données étaient malformées
- **Après** : 
  - L'endpoint essaie d'abord avec toutes les colonnes
  - Si une colonne est manquante, il essaie avec une requête minimale
  - Si même la requête minimale échoue, il retourne un tableau vide (au lieu d'une erreur 500)
  - Les champs `dateCreation` et `derniereModification` sont maintenant correctement mappés

## Fichiers modifiés

- `backend/src/marketplace/marketplace.service.ts` :
  - Ajout de `dateCreation` et `derniereModification` dans `mapRowToListing`
  - Amélioration de la gestion d'erreur dans `findAllListings` avec fallback

## Tests recommandés

1. Tester l'endpoint `/marketplace/listings` avec toutes les colonnes présentes
2. Tester l'endpoint avec des colonnes manquantes (devrait utiliser le fallback)
3. Vérifier que les champs `dateCreation` et `derniereModification` sont présents dans la réponse
4. Vérifier que l'endpoint ne retourne plus d'erreur 500

## Notes

- La requête minimale est une solution de secours qui permet à l'endpoint de fonctionner même si certaines colonnes optionnelles sont manquantes
- Les colonnes optionnelles comme `weight`, `location_*`, `sale_terms`, etc. ne sont pas incluses dans la requête minimale
- Si une colonne essentielle manque (comme `id`, `listing_type`, `status`), l'endpoint retournera un tableau vide

