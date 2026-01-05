# Debug : Logs ajoutés pour diagnostiquer "Mes annonces" vides

## Problème

Les logs montrent que le backend retourne 0 listings alors que des listings devraient être créés.

## Logs ajoutés

### Frontend

**Fichier :** `src/screens/marketplace/MarketplaceScreen.tsx`

1. **Logs dans `loadMyListings`** :
   - Paramètres de requête (`projetId`, `userId`, `projetActif`)
   - Résultats reçus (count, détails des listings avec `producerId`, `farmId`, `status`, `subjectId`)

**Fichier :** `src/components/marketplace/BatchAddModal.tsx`

1. **Logs lors de la création** :
   - Pour batch_pig : `pigId`, `producerId`, `farmId`, `projetActifId`, `weight`
   - Pour animal : `animalId`, `producerId`, `farmId`, `projetActifId`, `weight`
   - Vérification que `projetId` prop correspond à `projetActif.id`

### Backend

**Fichier :** `backend/src/marketplace/marketplace.service.ts`

1. **Logs dans `findAllListings`** :
   - Paramètres de requête (`projetId`, `userId`, `limit`, `offset`)
   - Requête SQL complète
   - Paramètres SQL
   - Nombre de lignes trouvées
   - Exemples de listings (si trouvés) : `id`, `producer_id`, `farm_id`, `status`, `listed_at`
   - **Statistiques si aucun résultat** : `total`, `by_producer`, `by_farm`, `by_both`

**Fichier :** `backend/src/marketplace/marketplace-unified.service.ts`

1. **Logs dans `createIndividualListing`** :
   - Détails du listing créé : `id`, `subjectId`, `producerId`, `farmId`, `status`, `weight`, `producer_id`, `farm_id`, `listed_at`

## Points à vérifier dans les logs

1. **Lors de la création d'un listing** :
   - Vérifier que le log `[createIndividualListing] Listing créé avec succès` apparaît
   - Vérifier les valeurs de `producerId`, `farmId`, `status`
   - Vérifier que `producerId` correspond au `userId` du JWT

2. **Lors de la récupération des listings** :
   - Vérifier les paramètres de `findAllListings` : `projetId` et `userId`
   - Vérifier la requête SQL générée
   - Vérifier le nombre de lignes trouvées
   - Si 0 lignes, vérifier les statistiques pour voir :
     - Combien de listings existent au total
     - Combien correspondent au `producer_id`
     - Combien correspondent au `farm_id`
     - Combien correspondent aux deux

3. **Comparaison des IDs** :
   - Vérifier que le `projetId` utilisé dans `loadMyListings` correspond au `farmId` utilisé lors de la création
   - Vérifier que le `userId` utilisé dans `loadMyListings` correspond au `producerId` utilisé lors de la création

## Prochaines étapes

1. **Créer une annonce** et vérifier les logs du backend pour voir si elle est bien créée
2. **Ouvrir "Mes annonces"** et vérifier les logs pour voir :
   - Les paramètres de la requête
   - La requête SQL générée
   - Le nombre de lignes trouvées
   - Les statistiques si aucun résultat
3. **Comparer les IDs** entre création et récupération pour identifier les incohérences

## Fichiers modifiés

- `src/screens/marketplace/MarketplaceScreen.tsx` : Logs détaillés dans `loadMyListings`
- `src/components/marketplace/BatchAddModal.tsx` : Logs lors de la création et vérification de cohérence des IDs
- `backend/src/marketplace/marketplace.service.ts` : Logs détaillés dans `findAllListings` avec statistiques
- `backend/src/marketplace/marketplace-unified.service.ts` : Logs détaillés lors de la création

