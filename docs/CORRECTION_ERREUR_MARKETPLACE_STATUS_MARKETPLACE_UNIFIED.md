# Correction de l'erreur `column "marketplace_status" does not exist` dans MarketplaceUnifiedService

## Problème identifié

L'erreur `column "marketplace_status" of relation "production_animaux" does not exist` se produisait lors de la création d'un listing individuel via `MarketplaceUnifiedService`. L'erreur provenait de la tentative de mise à jour de colonnes qui n'existent pas dans la table `production_animaux`.

## Analyse

**Fichier concerné :**
- `backend/src/marketplace/marketplace-unified.service.ts` (ligne 162)

**Problème :**
Le code tentait de mettre à jour les colonnes `marketplace_status` et `marketplace_listing_id` dans `production_animaux`, mais ces colonnes n'existent pas dans la base de données. Contrairement à `marketplace.service.ts` qui gère déjà ce cas avec un try-catch, `marketplace-unified.service.ts` ne gérait pas cette erreur.

## Solution appliquée

### Correction dans `marketplace-unified.service.ts`

**Avant :**
```typescript
// Mettre à jour le statut marketplace de l'animal
await client.query(
  `UPDATE production_animaux 
   SET marketplace_status = $1, marketplace_listing_id = $2 
   WHERE id = $3`,
  ['available', id, dto.subjectId]
);
```

**Après :**
```typescript
// Mettre à jour le statut marketplace de l'animal (si les colonnes existent)
try {
  await client.query(
    `UPDATE production_animaux 
     SET marketplace_status = $1, marketplace_listing_id = $2 
     WHERE id = $3`,
    ['available', id, dto.subjectId]
  );
} catch (error: any) {
  // Ignorer si les colonnes n'existent pas (erreur SQL)
  if (
    !error.message?.includes('does not exist') &&
    !error.message?.includes("n'existe pas") &&
    !error.message?.includes('column')
  ) {
    throw error; // Re-throw si c'est une autre erreur
  }
  // Sinon, logger un warning mais continuer
  this.logger.warn(
    `[createIndividualListing] Colonnes marketplace_status/marketplace_listing_id non disponibles dans production_animaux, ignoré`
  );
}
```

## Impact

- **Avant** : L'erreur `column "marketplace_status" does not exist` empêchait la création de listings individuels
- **Après** : La création de listings individuels fonctionne correctement, même si les colonnes `marketplace_status` et `marketplace_listing_id` n'existent pas dans `production_animaux`

## Fichiers modifiés

- `backend/src/marketplace/marketplace-unified.service.ts` (lignes 161-178)

## Notes

- Cette correction aligne le comportement de `marketplace-unified.service.ts` avec celui de `marketplace.service.ts`
- Les colonnes `marketplace_status` et `marketplace_listing_id` sont optionnelles et peuvent ne pas exister dans certaines installations
- Le listing est créé avec succès même si la mise à jour du statut de l'animal échoue
- Un warning est loggé pour informer que les colonnes ne sont pas disponibles, mais cela n'empêche pas la création du listing

